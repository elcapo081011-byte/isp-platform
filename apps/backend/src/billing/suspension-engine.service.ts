import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../common/prisma/prisma.service';
import { AuditService } from '../common/audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import { MikrotikService } from '../mikrotik/mikrotik.service';

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
      include: { customer: true },
      distinct: ['customerId'],
    });

    for (const invoice of overdueInvoices) {
      if (invoice.customer.status === 'SUSPENDED') continue;

      await this.prisma.customer.update({ where: { id: invoice.customerId }, data: { status: 'SUSPENDED' } });
      await this.prisma.service.updateMany({ where: { customerId: invoice.customerId }, data: { status: 'SUSPENDED' } });

      await this.audit.log({
        organizationId,
        action: 'customer.auto_suspend',
        entityType: 'Customer',
        entityId: invoice.customerId,
        after: { reason: `Factura ${invoice.number} vencida hace más de ${settings.graceDays} días` },
      });

      await this.notifications.notify({
        organizationId,
        event: 'customer.suspended',
        customer: invoice.customer,
        payload: { invoiceNumber: invoice.number },
      });

      // Corte real en el router del cliente — SIEMPRE el de su propia organización.
      const service = await this.prisma.service.findFirst({ where: { customerId: invoice.customerId } });
      if (service?.routerId && service.pppoeUsername) {
        await this.mikrotik.disableCustomerSession(service.routerId, service.pppoeUsername);
      }

      this.logger.log(`Cliente ${invoice.customer.firstName} ${invoice.customer.lastName} (org ${organizationId}) suspendido automáticamente.`);
    }
  }
}
