import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../common/prisma/prisma.service';
import { AuditService } from '../common/audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import { MikrotikService } from '../mikrotik/mikrotik.service';
import { RouterApiHooksService } from '../mikrotik/hooks/router-api-hooks.service';

interface SuspensionSettings {
  graceDays: number; // días después del vencimiento antes de suspender
  notifyDaysBeforeDue: number; // aviso previo al vencimiento
}

const DEFAULT_SETTINGS: SuspensionSettings = { graceDays: 3, notifyDaysBeforeDue: 3 };

/**
 * Motor de automatización (punto 14), corre para TODAS las organizaciones
 * activas de la plataforma, pero cada ciclo queda estrictamente aislado:
 * las reglas, facturas y el corte de red de una organización nunca afectan
 * a otra. Factura vence → grace period → notificación → suspensión (incluye
 * corte real en el router de ESA organización) → cliente paga → reactivación.
 */
@Injectable()
export class SuspensionEngineService {
  private readonly logger = new Logger('SuspensionEngine');

  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
    private notifications: NotificationsService,
    private mikrotik: MikrotikService,
    private hooks: RouterApiHooksService,
  ) {}

  private async getSettings(organizationId: string): Promise<SuspensionSettings> {
    const row = await this.prisma.setting.findUnique({ where: { organizationId_key: { organizationId, key: 'suspension_rules' } } });
    return row ? { ...DEFAULT_SETTINGS, ...(row.value as any) } : DEFAULT_SETTINGS;
  }

  // Se ejecuta una vez al día. En producción, ajustar horario según punto 44 (Settings).
  @Cron(CronExpression.EVERY_DAY_AT_6AM)
  async runDailyCycle() {
    const organizations = await this.prisma.organization.findMany({ where: { isActive: true } });
    for (const org of organizations) {
      this.logger.log(`Ciclo de facturación/suspensión — organización ${org.name}`);
      await this.markOverdueInvoices(org.id);
      await this.notifyUpcomingDueDates(org.id);
      await this.suspendOverdueCustomers(org.id);
    }
  }

  private async markOverdueInvoices(organizationId: string) {
    const now = new Date();
    const overdue = await this.prisma.invoice.updateMany({
      where: { organizationId, status: 'PENDING', dueDate: { lt: now } },
      data: { status: 'OVERDUE' },
    });
    if (overdue.count > 0) this.logger.log(`${overdue.count} facturas marcadas como vencidas.`);
  }

  private async notifyUpcomingDueDates(organizationId: string) {
    const settings = await this.getSettings(organizationId);
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + settings.notifyDaysBeforeDue);

    const startOfDay = new Date(new Date(targetDate).setHours(0, 0, 0, 0));
    const endOfDay = new Date(new Date(targetDate).setHours(23, 59, 59, 999));

    const invoices = await this.prisma.invoice.findMany({
      where: { organizationId, status: 'PENDING', dueDate: { gte: startOfDay, lte: endOfDay } },
      include: { customer: true },
    });

    for (const invoice of invoices) {
      await this.notifications.notify({
        organizationId,
        event: 'invoice.due_soon',
        customer: invoice.customer,
        payload: { invoiceNumber: invoice.number, dueDate: invoice.dueDate, amount: invoice.amount },
      });
    }
  }

  private async suspendOverdueCustomers(organizationId: string) {
    const settings = await this.getSettings(organizationId);
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - settings.graceDays);

    const overdueInvoices = await this.prisma.invoice.findMany({
      where: { organizationId, status: 'OVERDUE', dueDate: { lt: cutoff } },
      include: { customer: { include: { services: { include: { router: true } } } } },
      distinct: ['customerId'],
    });

    for (const invoice of overdueInvoices) {
      if (invoice.customer.status === 'SUSPENDED') continue;
      // Si el router del cliente tiene "Facturación - Zona" configurada, ese
      // cliente lo corta ZoneBillingEngine con las reglas de su zona, no este ciclo global.
      if (invoice.customer.services.some((s: any) => s.router?.zone)) continue;

      await this.suspendForNonPayment(
        organizationId,
        invoice.customer,
        invoice.number,
        `Factura ${invoice.number} vencida hace más de ${settings.graceDays} días`,
        true,
      );
    }
  }

  /**
   * Corte por falta de pago: estado en BD, auditoría, aviso al cliente y corte
   * real en el router de SU propia organización. Lo usan el ciclo global y el
   * motor de zonas, para que ambos cortes se comporten exactamente igual.
   */
  async suspendForNonPayment(
    organizationId: string,
    customer: { id: string; firstName: string; lastName: string; email?: string | null; phone?: string | null },
    invoiceNumber: string,
    reason: string,
    notifyCustomer: boolean,
  ) {
    await this.prisma.customer.update({ where: { id: customer.id }, data: { status: 'SUSPENDED' } });
    await this.prisma.service.updateMany({ where: { customerId: customer.id }, data: { status: 'SUSPENDED' } });

    await this.audit.log({
      organizationId,
      action: 'customer.auto_suspend',
      entityType: 'Customer',
      entityId: customer.id,
      after: { reason },
    });

    if (notifyCustomer) {
      await this.notifications.notify({
        organizationId,
        event: 'customer.suspended',
        customer,
        payload: { invoiceNumber },
      });
    }

    // Corte real en el router del cliente — SIEMPRE el de su propia organización.
    const service = await this.prisma.service.findFirst({ where: { customerId: customer.id } });
    if (service?.routerId && service.pppoeUsername) {
      await this.mikrotik.disableCustomerSession(service.routerId, service.pppoeUsername, service.ipAddress);
    }

    void this.hooks.emitCustomerEvent(organizationId, 'customer.suspended', customer.id);

    this.logger.log(`Cliente ${customer.firstName} ${customer.lastName} (org ${organizationId}) suspendido automáticamente.`);
  }
}
