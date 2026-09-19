import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { AuditService } from '../common/audit/audit.service';
import { CredentialsEncryptionService } from '../common/crypto/credentials-encryption.service';
import { RouterOsProvider } from './routeros.provider';
import { CreateRouterDto, UpdateRouterDto } from './dto/router.dto';
import { RouterCredentials } from '../network-drivers/router-provider.interface';
import { buildConnectionScript, generateApiCredentials, MOROSO_LIST, sanitizeAddress } from './connection-script';
import { normalizeZone } from './zone-settings';

/** Comentario con el que se marca cada entrada de la lista de morosos (para poder quitarla aunque cambie la IP). */
const MOROSO_COMMENT = 'ISP Control';

const LIST_SELECT = {
  id: true, name: true, host: true, failoverHost: true, port: true, location: true, comments: true,
  routerOsVersion: true, status: true, lastCheckedAt: true, lastError: true, isDemo: true,
  useConnectionScript: true, addClientsToRouter: true, zone: true,
  _count: { select: { services: true } },
} as const;

/** El servidor no debe poder usarse para sondear su propia red interna o los metadatos de la nube. */
export function assertRouterHostAllowed(host: string) {
  const h = host.trim().toLowerCase();
  const blocked =
    h === 'localhost' || h === '0.0.0.0' || h === '::' || h === '::1' ||
    /^127\./.test(h) || /^169\.254\./.test(h) || /^0\./.test(h);
  if (blocked) {
    throw new BadRequestException('Esa dirección no está permitida para un router (loopback / enlace local).');
  }
}

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

  private present(router: any) {
    const { encryptedPassword, _count, zone, ...rest } = router;
    return {
      ...rest,
      zone: zone ? normalizeZone(zone) : null,
      servicesCount: _count?.services ?? undefined,
    };
  }

  async list(organizationId: string) {
    const routers = await this.prisma.router.findMany({
      where: { organizationId },
      select: LIST_SELECT,
      orderBy: { name: 'asc' },
    });
    return routers.map((r: any) => this.present(r));
  }

  /** Configuración completa de un router (sin la contraseña) para la pantalla de edición. */
  async get(id: string, organizationId: string) {
    const router = await this.prisma.router.findFirst({
      where: { id, organizationId },
      include: { _count: { select: { services: true } } },
    });
    if (!router) throw new NotFoundException('Router no encontrado');
    return this.present(router);
  }

  async create(organizationId: string, dto: CreateRouterDto, userId: string, ip?: string) {
    assertRouterHostAllowed(dto.host);
    if (dto.failoverHost) assertRouterHostAllowed(dto.failoverHost);

    const generated = dto.useConnectionScript !== false;
    const creds = generated ? generateApiCredentials() : { username: dto.username!, password: dto.password! };

    const router = await this.prisma.router.create({
      data: {
        organizationId,
        name: dto.name,
        host: dto.host,
        failoverHost: dto.failoverHost || null,
        port: dto.port ?? (dto.useTls ? 8729 : 8728),
        wwwPort: dto.wwwPort ?? null,
        username: creds.username,
        encryptedPassword: this.crypto.encrypt(creds.password),
        useTls: dto.useTls ?? false,
        useConnectionScript: generated,
        location: dto.location,
        lanInterface: dto.lanInterface || null,
        ipRanges: dto.ipRanges || null,
        comments: dto.comments || null,
        latitude: dto.latitude ?? null,
        longitude: dto.longitude ?? null,
        routerOsVersion: dto.routerOsVersion ?? '6',
        externalId: dto.externalId || null,
        addClientsToRouter: dto.addClientsToRouter ?? true,
        cutMode: dto.cutMode ?? 'PPPOE_SECRET',
        zone: dto.zone ? (normalizeZone(dto.zone as any) as any) : undefined,
      },
    });
    await this.audit.log({
      organizationId, userId, action: 'router.create', entityType: 'Router', entityId: router.id, ipAddress: ip,
      after: { name: router.name, host: router.host, generatedCredentials: generated },
    });
    return this.present(router);
  }

  async update(id: string, organizationId: string, dto: UpdateRouterDto, userId: string, ip?: string) {
    const current = await this.prisma.router.findFirst({ where: { id, organizationId } });
    if (!current) throw new NotFoundException('Router no encontrado');

    if (dto.host) assertRouterHostAllowed(dto.host);
    if (dto.failoverHost) assertRouterHostAllowed(dto.failoverHost);

    if (current.useConnectionScript && (dto.username || dto.password)) {
      throw new BadRequestException(
        'Este router usa credenciales generadas por el sistema. Para cambiarlas usa "Regenerar credenciales" en la pestaña Script de conexión.',
      );
    }

    const data: Record<string, unknown> = {};
    const plain = [
      'name', 'host', 'port', 'wwwPort', 'useTls', 'location', 'lanInterface', 'ipRanges', 'comments',
      'latitude', 'longitude', 'routerOsVersion', 'externalId', 'addClientsToRouter', 'cutMode',
    ] as const;
    for (const key of plain) {
      if ((dto as any)[key] !== undefined) data[key] = (dto as any)[key] === '' ? null : (dto as any)[key];
    }
    // Vacío = quitar el failover.
    if (dto.failoverHost !== undefined) data.failoverHost = dto.failoverHost || null;
    if (dto.username) data.username = dto.username;
    // Contraseña vacía o ausente = se conserva la actual.
    if (dto.password) data.encryptedPassword = this.crypto.encrypt(dto.password);
    if (dto.zone) data.zone = normalizeZone({ ...(current.zone as any), ...(dto.zone as any) }) as any;

    const router = await this.prisma.router.update({ where: { id }, data });
    await this.audit.log({
      organizationId, userId, action: 'router.update', entityType: 'Router', entityId: id, ipAddress: ip,
      // Nunca se audita la contraseña: solo qué campos cambiaron.
      after: { changed: Object.keys(data).map((k) => (k === 'encryptedPassword' ? 'password' : k)) },
    });
    return this.present(router);
  }

  async remove(id: string, organizationId: string, userId: string, ip?: string) {
    const router = await this.prisma.router.findFirst({ where: { id, organizationId } });
    if (!router) throw new NotFoundException('Router no encontrado');

    const servicesCount = await this.prisma.service.count({ where: { routerId: id } });
    if (servicesCount > 0) {
      throw new BadRequestException(
        `No se puede eliminar: ${servicesCount} servicio(s) de clientes usan este router. Cámbialos a otro router primero.`,
      );
    }
    await this.prisma.router.delete({ where: { id } });
    await this.audit.log({ organizationId, userId, action: 'router.delete', entityType: 'Router', entityId: id, ipAddress: ip, before: { name: router.name } });
    return { deleted: true };
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
        failoverHost: router.failoverHost,
        port: router.port,
        username: router.username,
        encryptedPassword: router.encryptedPassword,
        useTls: router.useTls,
      },
    };
  }

  // -- Script de conexión ---------------------------------------------------

  private scriptFor(router: any) {
    const platformIp = sanitizeAddress(process.env.PLATFORM_PUBLIC_IP);
    return {
      script: buildConnectionScript({
        routerName: router.name,
        apiUser: router.username,
        apiPassword: this.crypto.decrypt(router.encryptedPassword),
        apiPort: router.port,
        platformIp,
        cutMode: router.cutMode,
      }),
      apiUser: router.username,
      apiPort: router.port,
      restrictedToIp: platformIp,
    };
  }

  async getConnectionScript(id: string, organizationId: string, userId: string, ip?: string) {
    const router = await this.prisma.router.findFirst({ where: { id, organizationId } });
    if (!router) throw new NotFoundException('Router no encontrado');
    if (!router.useConnectionScript) {
      throw new BadRequestException('Este router usa credenciales que escribiste tú; no hay script generado por el sistema.');
    }
    // El script lleva la clave del router: cada consulta queda auditada.
    await this.audit.log({ organizationId, userId, action: 'router.script_view', entityType: 'Router', entityId: id, ipAddress: ip });
    return this.scriptFor(router);
  }

  async regenerateCredentials(id: string, organizationId: string, userId: string, ip?: string) {
    const router = await this.prisma.router.findFirst({ where: { id, organizationId } });
    if (!router) throw new NotFoundException('Router no encontrado');
    if (!router.useConnectionScript) {
      throw new BadRequestException('Solo se pueden regenerar las credenciales de routers que usan el script de conexión.');
    }
    const creds = generateApiCredentials();
    const updated = await this.prisma.router.update({
      where: { id },
      data: { username: creds.username, encryptedPassword: this.crypto.encrypt(creds.password), status: 'UNKNOWN', lastError: null },
    });
    await this.audit.log({ organizationId, userId, action: 'router.credentials_regenerate', entityType: 'Router', entityId: id, ipAddress: ip });
    return this.scriptFor(updated);
  }

  // -- Estado en vivo -------------------------------------------------------

  async checkConnection(routerId: string, organizationId: string) {
    const { credentials } = await this.getCredentials(routerId, organizationId);
    const result = await this.provider.testConnection(credentials);
    await this.prisma.router.update({
      where: { id: routerId },
      data: {
        status: result.status,
        lastCheckedAt: new Date(),
        lastError: result.status === 'OFFLINE' ? result.error ?? 'No se pudo establecer conexión' : null,
      },
    });
    return { status: result.status, error: result.error ?? null };
  }

  async getSystemInfo(routerId: string, organizationId: string) {
    const { credentials } = await this.getCredentials(routerId, organizationId);
    return this.provider.getSystemInfo(credentials);
  }

  async listActiveSessions(routerId: string, organizationId: string) {
    const { credentials } = await this.getCredentials(routerId, organizationId);
    return this.provider.listPppoeActiveSessions(credentials);
  }

  // -- Clientes en el router ------------------------------------------------

  /**
   * Crea (o actualiza) el usuario PPPoE de un cliente en su router, si el
   * router tiene activado "Agregar cliente en MikroTik". Nunca lanza: el alta
   * del cliente ya ocurrió y un router caído no debe deshacerla; el resultado
   * se devuelve para que la UI lo muestre.
   */
  async pushCustomerSecret(
    routerId: string,
    params: { username: string; password: string; profile: string | null; disabled?: boolean },
  ): Promise<{ applied: boolean; action?: 'created' | 'updated'; reason?: string }> {
    const { router, credentials } = await this.getCredentials(routerId);
    if (!router.addClientsToRouter) {
      return { applied: false, reason: 'Este router tiene desactivado "Agregar cliente en MikroTik".' };
    }
    if (!params.profile) {
      return { applied: false, reason: 'El plan no tiene un perfil de MikroTik definido; no se creó el usuario PPPoE.' };
    }
    try {
      const action = await this.provider.upsertPppoeSecret(credentials, {
        username: params.username,
        password: params.password,
        profile: params.profile,
        disabled: params.disabled,
      });
      return { applied: true, action };
    } catch (err) {
      this.logger.error(`No se pudo crear ${params.username} en router ${routerId}: ${(err as Error).message}`);
      return { applied: false, reason: `No se pudo crear el usuario en el router: ${(err as Error).message}` };
    }
  }

  /** Quita al cliente del router (cambio de router o de usuario). No lanza: devuelve el resultado. */
  async removeCustomerSecret(routerId: string, pppoeUsername: string): Promise<{ applied: boolean; reason?: string }> {
    try {
      const { credentials } = await this.getCredentials(routerId);
      await this.provider.removePppoeSecret(credentials, pppoeUsername);
      await this.provider.removeFromAddressList(credentials, MOROSO_LIST, `${MOROSO_COMMENT}:${pppoeUsername}`);
      return { applied: true };
    } catch (err) {
      this.logger.error(`No se pudo quitar ${pppoeUsername} del router ${routerId}: ${(err as Error).message}`);
      return { applied: false, reason: (err as Error).message };
    }
  }

  /**
   * Corte por falta de pago, según el "Tipo de corte" del router:
   *  - PPPOE_SECRET: deshabilita el usuario PPPoE.
   *  - ADDRESS_LIST: agrega la IP del cliente a la lista "moroso" (el script de
   *    conexión deja una regla de firewall que la bloquea). Usa la IP fija del
   *    servicio o, si no tiene, la de su sesión PPPoE activa en ese momento.
   * Punto de integración usado por CustomersController/BillingController/SuspensionEngine.
   */
  async disableCustomerSession(routerId: string, pppoeUsername: string, ipAddress?: string | null) {
    const { router, credentials } = await this.getCredentials(routerId);
    try {
      if (router.cutMode === 'ADDRESS_LIST') {
        const ip = ipAddress || (await this.provider.findActiveAddress(credentials, pppoeUsername));
        if (!ip) {
          return {
            applied: false,
            error: 'No se encontró la IP del cliente (no tiene IP fija ni sesión activa) para agregarlo a la lista de morosos.',
          };
        }
        await this.provider.addToAddressList(credentials, MOROSO_LIST, ip, `${MOROSO_COMMENT}:${pppoeUsername}`);
        return { applied: true };
      }
      await this.provider.disablePppoeSecret(credentials, pppoeUsername);
      return { applied: true };
    } catch (err) {
      this.logger.error(`No se pudo suspender ${pppoeUsername} en router ${routerId}: ${(err as Error).message}`);
      return { applied: false, error: (err as Error).message };
    }
  }

  /**
   * Reactivación: deshace AMBOS tipos de corte (habilita el usuario y lo saca
   * de la lista de morosos). Así funciona aunque el ISP haya cambiado el tipo
   * de corte del router mientras el cliente estaba suspendido.
   */
  async enableCustomerSession(routerId: string, pppoeUsername: string) {
    const { router, credentials } = await this.getCredentials(routerId);
    try {
      try {
        await this.provider.removeFromAddressList(credentials, MOROSO_LIST, `${MOROSO_COMMENT}:${pppoeUsername}`);
      } catch (err) {
        // En modo address list ESTE es el corte: si no se pudo quitar, el cliente sigue bloqueado y hay que decirlo.
        if (router.cutMode === 'ADDRESS_LIST') throw err;
        this.logger.warn(`No se pudo limpiar la lista de morosos de ${pppoeUsername}: ${(err as Error).message}`);
      }
      await this.provider.enablePppoeSecret(credentials, pppoeUsername);
      return { applied: true };
    } catch (err) {
      this.logger.error(`No se pudo reactivar ${pppoeUsername} en router ${routerId}: ${(err as Error).message}`);
      return { applied: false, error: (err as Error).message };
    }
  }
}
