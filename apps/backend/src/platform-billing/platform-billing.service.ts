import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../common/prisma/prisma.service';
import { AuditService } from '../common/audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';

/**
 * Fase 13 — Facturación SaaS de la PLATAFORMA (lo que tú le cobras a cada
 * ISP que usa el sistema, no lo que cada ISP le cobra a sus propios
 * clientes — eso ya existe en `billing/`).
 *
 * Modelo replicado de WispHub: cada organización tiene un número de
 * clientes gratis (`freeClientLimit`, 30 por defecto). Si un mes cierra
 * con más clientes que ese límite, se genera una PlatformInvoice cobrando
 * solo por los clientes que exceden el límite. Si no se paga dentro del
 * período de gracia, la organización se suspende automáticamente (igual
 * que ya se suspende a un cliente moroso dentro de cada ISP).
 *
 * Honestidad ante todo (mismo criterio que los drivers OLT): hoy NO hay
 * ninguna pasarela de pago conectada (Stripe/MercadoPago/etc. no están
 * integrados porque no se ha definido país/moneda/proveedor). El único
 * método de pago real que existe es que el dueño de la plataforma marque
 * la factura como pagada manualmente (transferencia, efectivo, lo que
 * sea) desde el panel de plataforma. Conectar un gateway automático es
 * agregar un provider más aquí, sin tocar el resto del motor.
 */
@Injectable()
export class PlatformBillingService {
  private readonly logger = new Logger('PlatformBilling');

  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
    private notifications: NotificationsService,
  ) {}

  // -- Uso / resumen para el dueño del ISP (pantalla "Mi suscripción") ----

  async getUsage(organizationId: string) {
    const org = await this.prisma.organization.findUnique({ where: { id: organizationId } });
    if (!org) throw new NotFoundException('Organización no encontrada');

    const clientCount = await this.prisma.customer.count({ where: { organizationId, isDemo: false } });
    const billableClients = Math.max(0, clientCount - org.freeClientLimit);
    const estimatedAmount = Number(org.pricePerExtraClient) * billableClients;
    const isTrial = org.plan === 'TRIAL' && !!org.trialEndsAt && org.trialEndsAt.getTime() > Date.now();
    const trialDaysLeft = org.trialEndsAt
      ? Math.max(0, Math.ceil((org.trialEndsAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
      : null;

    return {
      plan: org.plan,
      isActive: org.isActive,
      clientCount,
      freeClientLimit: org.freeClientLimit,
      billableClients,
      pricePerExtraClient: Number(org.pricePerExtraClient),
      currency: org.platformCurrency,
      estimatedAmount,
      isTrial,
      trialEndsAt: org.trialEndsAt,
      trialDaysLeft,
    };
  }

  async listInvoicesForOrg(organizationId: string) {
    return this.prisma.platformInvoice.findMany({
      where: { organizationId },
      orderBy: { period: 'desc' },
    });
  }

  // -- Panel del dueño de la plataforma -------------------------------------

  async listAllInvoices(status?: string) {
    return this.prisma.platformInvoice.findMany({
      where: status ? { status: status as any } : undefined,
      include: { organization: { select: { name: true, slug: true } } },
      orderBy: [{ status: 'asc' }, { dueDate: 'asc' }],
    });
  }

  async markInvoicePaid(invoiceId: string, platformAdminUserId: string, method: string, notes?: string) {
    const invoice = await this.prisma.platformInvoice.findUnique({ where: { id: invoiceId } });
    if (!invoice) throw new NotFoundException('Factura no encontrada');
    if (invoice.status === 'PAID') throw new BadRequestException('Esa factura ya está pagada.');

    const updated = await this.prisma.platformInvoice.update({
      where: { id: invoiceId },
      data: { status: 'PAID', paidAt: new Date(), paidMethod: method || 'manual_transfer', paidByUserId: platformAdminUserId, notes },
    });

    await this.audit.log({
      organizationId: invoice.organizationId,
      userId: platformAdminUserId,
      action: 'platform.invoice_marked_paid',
      entityType: 'PlatformInvoice',
      entityId: invoice.id,
      after: { method, notes },
    });

    // Si no quedan facturas de plataforma vencidas, reactivar la cuenta.
    const stillOverdue = await this.prisma.platformInvoice.count({
      where: { organizationId: invoice.organizationId, status: 'OVERDUE' },
    });
    if (stillOverdue === 0) {
      const org = await this.prisma.organization.findUnique({ where: { id: invoice.organizationId } });
      if (org && !org.isActive) {
        await this.prisma.organization.update({ where: { id: org.id }, data: { isActive: true } });
        await this.audit.log({
          organizationId: org.id,
          userId: platformAdminUserId,
          action: 'platform.reactivate_after_payment',
          entityType: 'Organization',
          entityId: org.id,
        });
        await this.notifyOwner(org.id, 'platform.reactivated', {
          message: 'Tu cuenta fue reactivada. ¡Gracias por regularizar el pago!',
        });
      }
    }

    return updated;
  }

  // -- Ciclo automático (igual patrón que SuspensionEngineService) --------

  // El día 1 de cada mes se factura el uso del mes anterior.
  @Cron(CronExpression.EVERY_1ST_DAY_OF_MONTH_AT_7AM)
  async generateMonthlyInvoices() {
    const organizations = await this.prisma.organization.findMany();
    const period = this.previousPeriod();

    for (const org of organizations) {
      try {
        const clientCount = await this.prisma.customer.count({ where: { organizationId: org.id, isDemo: false } });
        const billableClients = Math.max(0, clientCount - org.freeClientLimit);
        if (billableClients <= 0) continue; // dentro del límite gratis, no se cobra — igual que WispHub

        const amount = Number(org.pricePerExtraClient) * billableClients;
        const issuedAt = new Date();
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + 7);

        const invoice = await this.prisma.platformInvoice.create({
          data: {
            organizationId: org.id,
            period,
            clientCount,
            freeLimit: org.freeClientLimit,
            billableClients,
            amount,
            currency: org.platformCurrency,
            issuedAt,
            dueDate,
          },
        });

        await this.notifyOwner(org.id, 'platform_invoice.issued', {
          message: `Tienes ${clientCount} clientes (${org.freeClientLimit} gratis). Se generó una factura de ${org.platformCurrency} ${amount.toFixed(2)} por ${billableClients} cliente(s) adicional(es), vence el ${dueDate.toLocaleDateString('es')}.`,
        });

        this.logger.log(`Factura de plataforma generada: org ${org.name}, período ${period}, ${org.platformCurrency} ${amount}.`);
      } catch (err: any) {
        // Ya existe una factura para ese período (constraint única) u otro error puntual;
        // no debe frenar el ciclo del resto de las organizaciones.
        if (err?.code !== 'P2002') this.logger.error(`Fallo facturando org ${org.id}: ${err?.message}`);
      }
    }
  }

  // Corre a diario: vence facturas y suspende cuentas morosas.
  @Cron(CronExpression.EVERY_DAY_AT_7AM)
  async runDailyCycle() {
    await this.markOverdueInvoices();
    await this.suspendNonPayingOrganizations();
  }

  private async markOverdueInvoices() {
    const now = new Date();
    const overdueInvoices = await this.prisma.platformInvoice.findMany({
      where: { status: 'PENDING', dueDate: { lt: now } },
    });
    for (const invoice of overdueInvoices) {
      await this.prisma.platformInvoice.update({ where: { id: invoice.id }, data: { status: 'OVERDUE' } });
      await this.notifyOwner(invoice.organizationId, 'platform_invoice.overdue', {
        message: `La factura del período ${invoice.period} está vencida. Regulariza el pago para evitar la suspensión de tu cuenta.`,
      });
    }
  }

  private async suspendNonPayingOrganizations() {
    const overdueInvoices = await this.prisma.platformInvoice.findMany({
      where: { status: 'OVERDUE' },
      include: { organization: true },
      distinct: ['organizationId'],
    });

    for (const invoice of overdueInvoices) {
      const org = invoice.organization;
      if (!org.isActive) continue;

      const graceCutoff = new Date(invoice.dueDate);
      graceCutoff.setDate(graceCutoff.getDate() + org.billingGraceDays);
      if (new Date() < graceCutoff) continue;

      await this.prisma.organization.update({ where: { id: org.id }, data: { isActive: false } });
      await this.audit.log({
        organizationId: org.id,
        action: 'platform.auto_suspend_nonpayment',
        entityType: 'Organization',
        entityId: org.id,
        after: { invoicePeriod: invoice.period, invoiceId: invoice.id },
      });
      await this.notifyOwner(org.id, 'platform.suspended_nonpayment', {
        message: `Tu cuenta fue suspendida por falta de pago (factura del período ${invoice.period}). Contáctanos para reactivarla.`,
      });

      this.logger.log(`Organización ${org.name} suspendida por falta de pago de la plataforma.`);
    }
  }

  private previousPeriod(): string {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }

  // El "cliente" de la notificación aquí es el dueño del ISP (rol SUPER_ADMIN
  // de esa organización), reutilizando el mismo NotificationsService que ya
  // usa email real (Fase 9) para no duplicar canales.
  private async notifyOwner(organizationId: string, event: string, payload: Record<string, unknown>) {
    const owner = await this.prisma.user.findFirst({
      where: { organizationId, roles: { some: { role: { name: 'SUPER_ADMIN' } } } },
      orderBy: { createdAt: 'asc' },
    });
    if (!owner) return;

    await this.notifications.notify({
      organizationId,
      event,
      customer: { email: owner.email, firstName: owner.firstName, lastName: owner.lastName },
      payload,
    });
  }
}
