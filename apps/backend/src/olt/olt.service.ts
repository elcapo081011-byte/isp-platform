import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { AuditService } from '../common/audit/audit.service';
import { GenericSnmpOltProvider } from './generic-snmp-olt.provider';
import { MockOltProvider } from '../network-drivers/mock/mock-providers';
import { NotSupportedByDriverError } from '../network-drivers/olt-provider.interface';
import { CreateOltDto, RegisterOnuDto } from './dto/olt.dto';

const mockProvider = new MockOltProvider();

/** Cada ISP registra y administra sus PROPIAS OLT — nunca desde config compartida. */
@Injectable()
export class OltService {
  private readonly logger = new Logger('OltService');

  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
    private snmpProvider: GenericSnmpOltProvider,
  ) {}

  private providerFor(vendor: string) {
    if (vendor === 'GENERIC_SNMP') return this.snmpProvider;
    if (vendor === 'MOCK') return mockProvider;
    return null; // HUAWEI/ZTE/FIBERHOME: pendientes de verificar documentación oficial
  }

  async list(organizationId: string) {
    return this.prisma.olt.findMany({
      where: { organizationId },
      select: { id: true, name: true, vendor: true, model: true, host: true, location: true, status: true, lastCheckedAt: true, isDemo: true },
      orderBy: { name: 'asc' },
    });
  }

  async create(organizationId: string, dto: CreateOltDto, userId: string, ip?: string) {
    const olt = await this.prisma.olt.create({ data: { ...dto, organizationId } });
    await this.audit.log({ organizationId, userId, action: 'olt.create', entityType: 'Olt', entityId: olt.id, ipAddress: ip });
    return olt;
  }

  private async findOwned(organizationId: string, oltId: string) {
    const olt = await this.prisma.olt.findFirst({ where: { id: oltId, organizationId } });
    if (!olt) throw new NotFoundException('OLT no encontrada');
    return olt;
  }

  async checkConnection(organizationId: string, oltId: string) {
    const olt = await this.findOwned(organizationId, oltId);
    const provider = this.providerFor(olt.vendor);

    if (!provider) {
      return { status: 'UNKNOWN' as const, note: `Driver de ${olt.vendor} pendiente de verificación oficial (punto 31)` };
    }

    const status = await provider.checkConnection({ host: olt.host, snmpCommunity: olt.snmpCommunity ?? undefined });
    await this.prisma.olt.update({ where: { id: oltId }, data: { status: status as any, lastCheckedAt: new Date() } });
    return { status };
  }

  async listPonPorts(organizationId: string, oltId: string) {
    const olt = await this.findOwned(organizationId, oltId);
    const provider = this.providerFor(olt.vendor);
    if (!provider) return { supported: false, reason: `Driver de ${olt.vendor} no implementado aún`, ponPorts: [] };

    try {
      const ponPorts = await provider.listPonPorts(
        { host: olt.host, snmpCommunity: olt.snmpCommunity ?? undefined },
        olt.vendorOidMap as any,
      );
      return { supported: true, ponPorts };
    } catch (err) {
      if (err instanceof NotSupportedByDriverError) {
        return { supported: false, reason: err.message, ponPorts: [] };
      }
      throw err;
    }
  }

  async registerOnu(organizationId: string, dto: RegisterOnuDto, userId: string, ip?: string) {
    await this.findOwned(organizationId, dto.oltId);
    const onu = await this.prisma.onu.create({
      data: { oltId: dto.oltId, ponPort: dto.ponPort, serial: dto.serial, mac: dto.mac, model: dto.model },
    });
    await this.audit.log({ organizationId, userId, action: 'onu.register', entityType: 'Onu', entityId: onu.id, ipAddress: ip });
    return onu;
  }

  async listOnusByOlt(organizationId: string, oltId: string) {
    await this.findOwned(organizationId, oltId);
    return this.prisma.onu.findMany({ where: { oltId }, orderBy: { ponPort: 'asc' } });
  }

  private async findOwnedOnu(organizationId: string, onuId: string) {
    const onu = await this.prisma.onu.findFirst({ where: { id: onuId, olt: { organizationId } } });
    if (!onu) throw new NotFoundException('ONU no encontrada');
    return onu;
  }

  async authorizeOnu(organizationId: string, onuId: string, userId: string, ip?: string) {
    await this.findOwnedOnu(organizationId, onuId);
    const onu = await this.prisma.onu.update({ where: { id: onuId }, data: { status: 'ONLINE' } });
    await this.audit.log({ organizationId, userId, action: 'onu.authorize', entityType: 'Onu', entityId: onuId, ipAddress: ip });
    return onu;
  }

  async deauthorizeOnu(organizationId: string, onuId: string, userId: string, ip?: string) {
    await this.findOwnedOnu(organizationId, onuId);
    const onu = await this.prisma.onu.update({ where: { id: onuId }, data: { status: 'OFFLINE' } });
    await this.audit.log({ organizationId, userId, action: 'onu.deauthorize', entityType: 'Onu', entityId: onuId, ipAddress: ip });
    return onu;
  }
}
