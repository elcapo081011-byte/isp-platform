import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { AuditService } from '../common/audit/audit.service';
import { CredentialsEncryptionService } from '../common/crypto/credentials-encryption.service';
import { RouterOsProvider } from './routeros.provider';
import { CreateRouterDto } from './dto/router.dto';
import { RouterCredentials } from '../network-drivers/router-provider.interface';

/**
 * Cada ISP (organización) registra y administra sus PROPIOS routers desde
 * la interfaz — nunca desde una variable de entorno compartida. Todo método
 * exige `organizationId` y jamás toca un router de otra cuenta.
 */
@Injectable()
export class MikrotikService {
  private readonly logger = new Logger('MikrotikService');

  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
    private crypto: CredentialsEncryptionService,
    private provider: RouterOsProvider,
  ) {}

  async list(organizationId: string) {
    return this.prisma.router.findMany({
      where: { organizationId },
      select: {
        id: true, name: true, host: true, port: true, location: true,
        status: true, lastCheckedAt: true, lastError: true, isDemo: true,
      },
      orderBy: { name: 'asc' },
    });
  }

  async create(organizationId: string, dto: CreateRouterDto, userId: string, ip?: string) {
    const router = await this.prisma.router.create({
      data: {
        organizationId,
        name: dto.name,
        host: dto.host,
        port: dto.port ?? 8728,
        username: dto.username,
        encryptedPassword: this.crypto.encrypt(dto.password),
        useTls: dto.useTls ?? false,
        location: dto.location,
      },
    });
    await this.audit.log({ organizationId, userId, action: 'router.create', entityType: 'Router', entityId: router.id, ipAddress: ip });
    const { encryptedPassword, ...safe } = router;
    return safe;
  }

  /**
   * Sin `organizationId` (usado por CustomersController/SuspensionEngine,
   * que ya validaron la pertenencia del router al resolverlo desde un
   * Service perteneciente a esa misma organización). Con `organizationId`,
   * valida explícitamente — usado por los endpoints del panel de MikroTik.
   */
  private async getCredentials(routerId: string, organizationId?: string): Promise<{ router: any; credentials: RouterCredentials }> {
    const router = organizationId
      ? await this.prisma.router.findFirst({ where: { id: routerId, organizationId } })
      : await this.prisma.router.findUnique({ where: { id: routerId } });
    if (!router) throw new NotFoundException('Router no encontrado');
    return {
      router,
      credentials: {
        host: router.host,
        port: router.port,
        username: router.username,
        encryptedPassword: router.encryptedPassword,
        useTls: router.useTls,
      },
    };
  }

  async checkConnection(routerId: string, organizationId: string) {
    const { credentials } = await this.getCredentials(routerId, organizationId);
    const status = await this.provider.checkConnection(credentials);
    await this.prisma.router.update({
      where: { id: routerId },
      data: {
        status,
        lastCheckedAt: new Date(),
        lastError: status === 'OFFLINE' ? 'No se pudo establecer conexión' : null,
      },
    });
    return { status };
  }

  async getSystemInfo(routerId: string, organizationId: string) {
    const { credentials } = await this.getCredentials(routerId, organizationId);
    return this.provider.getSystemInfo(credentials);
  }

  async listActiveSessions(routerId: string, organizationId: string) {
    const { credentials } = await this.getCredentials(routerId, organizationId);
    return this.provider.listPppoeActiveSessions(credentials);
  }

  /** Punto de integración usado por CustomersController/BillingService/SuspensionEngine. */
  async disableCustomerSession(routerId: string, pppoeUsername: string) {
    const { credentials } = await this.getCredentials(routerId);
    try {
      await this.provider.disablePppoeSecret(credentials, pppoeUsername);
      return { applied: true };
    } catch (err) {
      this.logger.error(`No se pudo suspender ${pppoeUsername} en router ${routerId}: ${(err as Error).message}`);
      return { applied: false, error: (err as Error).message };
    }
  }

  async enableCustomerSession(routerId: string, pppoeUsername: string) {
    const { credentials } = await this.getCredentials(routerId);
    try {
      await this.provider.enablePppoeSecret(credentials, pppoeUsername);
      return { applied: true };
    } catch (err) {
      this.logger.error(`No se pudo reactivar ${pppoeUsername} en router ${routerId}: ${(err as Error).message}`);
      return { applied: false, error: (err as Error).message };
    }
  }
}
