import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../common/prisma/prisma.service';
import { MikrotikService } from '../mikrotik/mikrotik.service';
import { OltService } from '../olt/olt.service';
import { NocGateway } from './noc.gateway';

/**
 * NOC — punto 20. Corre para todas las organizaciones activas, pero cada
 * router/OLT solo se compara y notifica dentro de SU organización.
 */
@Injectable()
export class MonitoringService {
  private readonly logger = new Logger('MonitoringService');

  constructor(
    private prisma: PrismaService,
    private mikrotik: MikrotikService,
    private olt: OltService,
    private gateway: NocGateway,
  ) {}

  @Cron(CronExpression.EVERY_5_MINUTES)
  async runMonitoringCycle() {
    await this.checkRouters();
    await this.checkOlts();
  }

  private async checkRouters() {
    const routers = await this.prisma.router.findMany();
    for (const router of routers) {
      const previousStatus = router.status;
      try {
        const { status } = await this.mikrotik.checkConnection(router.id, router.organizationId);
        if (status !== previousStatus) {
          await this.handleStatusChange(router.organizationId, 'ROUTER', router.id, previousStatus, status, router.name);
        }
      } catch (err) {
        this.logger.error(`Error monitoreando router ${router.name}: ${(err as Error).message}`);
      }
    }
  }

  private async checkOlts() {
    const olts = await this.prisma.olt.findMany();
    for (const olt of olts) {
      const previousStatus = olt.status;
      try {
        const result = await this.olt.checkConnection(olt.organizationId, olt.id);
        if (result.status !== previousStatus) {
          await this.handleStatusChange(olt.organizationId, 'OLT', olt.id, previousStatus, result.status, olt.name);
        }
      } catch (err) {
        this.logger.error(`Error monitoreando OLT ${olt.name}: ${(err as Error).message}`);
      }
    }
  }

  private async handleStatusChange(organizationId: string, source: 'ROUTER' | 'OLT', id: string, from: string, to: string, name: string) {
    await this.prisma.networkEvent.create({
      data: { organizationId, source, sourceId: id, eventType: 'STATUS_CHANGE', fromState: from, toState: to },
    });

    this.gateway.emitDeviceStatusChange(organizationId, { type: source, id, status: to });

    if (to === 'OFFLINE') {
      const alert = await this.prisma.alert.create({
        data: {
          organizationId,
          source,
          sourceId: id,
          severity: 'CRITICAL',
          title: `${source === 'ROUTER' ? 'Router' : 'OLT'} offline: ${name}`,
          description: `Cambió de ${from} a ${to}`,
        },
      });
      this.gateway.emitAlert(organizationId, alert);
    }
  }
}
