import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../common/prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { BillingService } from './billing.service';
import { SuspensionEngineService } from './suspension-engine.service';
import {
  ZoneBillingSettings, cutDateFor, isDayAndHour, isExactDayAndHour, nextDueDate, normalizeZone,
} from '../mikrotik/zone-settings';

const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Facturación y corte por ZONA (pestaña "Facturación - Zona" de cada router),
 * como en WispHub. Corre cada hora en punto y solo actúa sobre routers que
 * tengan `zone` configurada; los routers sin zona siguen con el ciclo global
 * (SuspensionEngineService). Todo se filtra por el router y su organización.
 *
 * Las horas son las del SERVIDOR (variable TZ del contenedor).
 */
@Injectable()
export class ZoneBillingEngineService {
  private readonly logger = new Logger('ZoneBilling');

  constructor(
    private prisma: PrismaService,
    private billing: BillingService,
    private notifications: NotificationsService,
    private suspension: SuspensionEngineService,
  ) {}

  @Cron('0 * * * *')
  async runHourly(now: Date = new Date()) {
    const routers = await this.prisma.router.findMany({
      where: { organization: { isActive: true } },
      select: { id: true, name: true, organizationId: true, zone: true },
    });

    for (const router of routers) {
      if (!router.zone) continue; // sin zona: reglas globales
      const zone = normalizeZone(router.zone as any);
      try {
        // Solo se marcan vencidas las facturas de ESTA zona, antes de decidir cortes.
        await this.markOverdue(router.organizationId, router.id, now);

        // Catch-up (>=): si el servidor estuvo caído a esa hora, factura al volver ese mismo día.
        // Es seguro repetirlo porque no duplica facturas del mes.
        if (zone.autoInvoices && isDayAndHour(now, zone.invoiceDay, zone.invoiceHour)) {
          await this.generateInvoices(router, zone, now);
        }
        // Recordatorio: solo en su hora exacta, para no enviarlo varias veces.
        if (zone.autoReminders && isExactDayAndHour(now, zone.reminderDay, zone.reminderHour)) {
          await this.sendReminders(router);
        }
        if (zone.autoCut) {
          await this.runCuts(router, zone, now);
        }
      } catch (err) {
        // Un router con problemas no detiene el ciclo de los demás.
        this.logger.error(`Zona del router ${router.name} (${router.id}): ${(err as Error).message}`);
      }
    }
  }

  private async markOverdue(organizationId: string, routerId: string, now: Date) {
    await this.prisma.invoice.updateMany({
      where: { organizationId, status: 'PENDING', dueDate: { lt: now }, service: { routerId } },
      data: { status: 'OVERDUE' },
    });
  }

  async generateInvoices(router: { id: string; organizationId: string; name: string }, zone: ZoneBillingSettings, now: Date) {
    const services = await this.prisma.service.findMany({
      where: { routerId: router.id, status: 'ACTIVE', customer: { status: 'ACTIVE', organizationId: router.organizationId } },
      include: { plan: true, customer: true },
    });
    if (services.length === 0) return 0;

    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const already = await this.prisma.invoice.findMany({
      where: { serviceId: { in: services.map((s: any) => s.id) }, issuedAt: { gte: monthStart }, status: { not: 'CANCELLED' } },
      select: { serviceId: true },
    });
    const invoiced = new Set(already.map((i: any) => i.serviceId));

    let created = 0;
    for (const service of services as any[]) {
      if (invoiced.has(service.id)) continue;
      const amount = Number(service.plan.price);
      if (!(amount > 0)) continue; // un plan sin precio no genera factura
      try {
        const surcharge = round2((amount * zone.taxPercent) / 100);
        const dueDate = nextDueDate(now, zone.payDay);
        const invoice = await this.billing.createSystemInvoice(router.organizationId, {
          customerId: service.customerId,
          serviceId: service.id,
          amount,
          surcharge,
          currency: service.plan.currency,
          dueDate,
          notes: `Generada automáticamente — zona ${router.name} — ${service.plan.name}`,
        });
        created++;
        if (zone.emailOnInvoice) {
          await this.notifications.notify({
            organizationId: router.organizationId,
            event: 'invoice.created',
            customer: service.customer,
            payload: {
              invoiceNumber: invoice.number,
              dueDate: dueDate.toLocaleDateString('es'),
              total: `${service.plan.currency} ${round2(amount + surcharge).toFixed(2)}`,
            },
          });
        }
      } catch (err) {
        this.logger.error(`No se pudo facturar el servicio ${service.id}: ${(err as Error).message}`);
      }
    }
    if (created) this.logger.log(`Zona ${router.name}: ${created} factura(s) generada(s).`);
    return created;
  }

  async sendReminders(router: { id: string; organizationId: string }) {
    const invoices = await this.prisma.invoice.findMany({
      where: { organizationId: router.organizationId, status: 'PENDING', service: { routerId: router.id } },
      include: { customer: true },
    });
    for (const invoice of invoices as any[]) {
      await this.notifications.notify({
        organizationId: router.organizationId,
        event: 'invoice.reminder',
        customer: invoice.customer,
        payload: { invoiceNumber: invoice.number, dueDate: invoice.dueDate.toLocaleDateString('es') },
      });
    }
    return invoices.length;
  }

  /**
   * Corta a los clientes activos de la zona que tengan al menos
   * `suspendAfterInvoices` facturas vencidas cuyo día de corte ya llegó.
   * El día de corte se calcula POR FACTURA (ver cutDateFor).
   */
  async runCuts(router: { id: string; organizationId: string }, zone: ZoneBillingSettings, now: Date) {
    const overdue = await this.prisma.invoice.findMany({
      where: {
        organizationId: router.organizationId,
        status: 'OVERDUE',
        service: { routerId: router.id },
        customer: { status: 'ACTIVE' },
      },
      include: { customer: true },
      orderBy: { dueDate: 'asc' },
    });

    const byCustomer = new Map<string, any[]>();
    for (const invoice of overdue as any[]) {
      if (now.getTime() < cutDateFor(invoice.dueDate, zone.cutDay, zone.cutHour).getTime()) continue; // aún no es su día de corte
      byCustomer.set(invoice.customerId, [...(byCustomer.get(invoice.customerId) ?? []), invoice]);
    }

    let cut = 0;
    for (const invoices of byCustomer.values()) {
      if (invoices.length < zone.suspendAfterInvoices) continue;
      const first = invoices[0];
      await this.suspension.suspendForNonPayment(
        router.organizationId,
        first.customer,
        first.number,
        `${invoices.length} factura(s) vencida(s) — corte de la zona (día ${zone.cutDay})`,
        zone.emailOnCut,
      );
      cut++;
    }
    return cut;
  }
}
