import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuditService } from '../../common/audit/audit.service';
import { CredentialsEncryptionService } from '../../common/crypto/credentials-encryption.service';
import { CreateApiHookDto, HookEvent, UpdateApiHookDto } from './api-hook.dto';
import { assertSafeHookUrl, postJson, UnsafeUrlError } from './safe-http';

const MAX_HOOKS_PER_ROUTER = 10;

function present(hook: any) {
  const { encryptedSecret, ...rest } = hook;
  return { ...rest, hasSecret: !!encryptedSecret };
}

function checkUrl(url: string) {
  try {
    assertSafeHookUrl(url);
  } catch (err) {
    if (err instanceof UnsafeUrlError) throw new BadRequestException(err.message);
    throw err;
  }
}

/**
 * "Eventos API personalizados" de un router: cuando cambia un cliente de ESE
 * router, se avisa por HTTPS a las URLs que el ISP registró. Todo va acotado
 * por organización y router, y toda salida pasa por safe-http (anti-SSRF).
 */
@Injectable()
export class RouterApiHooksService {
  private readonly logger = new Logger('ApiHooks');

  /** Reemplazable en pruebas. */
  sender: typeof postJson = postJson;

  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
    private crypto: CredentialsEncryptionService,
  ) {}

  private async ownRouter(routerId: string, organizationId: string) {
    const router = await this.prisma.router.findFirst({ where: { id: routerId, organizationId } });
    if (!router) throw new NotFoundException('Router no encontrado');
    return router;
  }

  private async ownHook(routerId: string, hookId: string, organizationId: string) {
    const hook = await this.prisma.routerApiHook.findFirst({ where: { id: hookId, routerId, organizationId } });
    if (!hook) throw new NotFoundException('Evento API no encontrado');
    return hook;
  }

  async list(routerId: string, organizationId: string) {
    await this.ownRouter(routerId, organizationId);
    const hooks = await this.prisma.routerApiHook.findMany({
      where: { routerId, organizationId },
      orderBy: { createdAt: 'asc' },
    });
    return hooks.map(present);
  }

  async create(routerId: string, organizationId: string, dto: CreateApiHookDto, userId: string, ip?: string) {
    await this.ownRouter(routerId, organizationId);
    checkUrl(dto.url);
    const count = await this.prisma.routerApiHook.count({ where: { routerId, organizationId } });
    if (count >= MAX_HOOKS_PER_ROUTER) {
      throw new BadRequestException(`Máximo ${MAX_HOOKS_PER_ROUTER} eventos API por router.`);
    }
    const hook = await this.prisma.routerApiHook.create({
      data: {
        organizationId,
        routerId,
        platform: dto.platform,
        url: dto.url,
        encryptedSecret: dto.secret ? this.crypto.encrypt(dto.secret) : null,
        events: dto.events,
        enabled: dto.enabled ?? true,
      },
    });
    await this.audit.log({
      organizationId, userId, action: 'router.api_hook_create', entityType: 'RouterApiHook', entityId: hook.id, ipAddress: ip,
      after: { platform: dto.platform, url: dto.url, events: dto.events },
    });
    return present(hook);
  }

  async update(routerId: string, hookId: string, organizationId: string, dto: UpdateApiHookDto, userId: string, ip?: string) {
    await this.ownHook(routerId, hookId, organizationId);
    if (dto.url !== undefined) checkUrl(dto.url);

    const data: Record<string, unknown> = {};
    for (const key of ['platform', 'url', 'events', 'enabled'] as const) {
      if (dto[key] !== undefined) data[key] = dto[key];
    }
    if (dto.secret) data.encryptedSecret = this.crypto.encrypt(dto.secret);
    else if (dto.clearSecret) data.encryptedSecret = null;

    const hook = await this.prisma.routerApiHook.update({ where: { id: hookId }, data });
    await this.audit.log({
      organizationId, userId, action: 'router.api_hook_update', entityType: 'RouterApiHook', entityId: hookId, ipAddress: ip,
      // El secreto nunca se audita, solo que cambió.
      after: { changed: Object.keys(data).map((k) => (k === 'encryptedSecret' ? 'secret' : k)) },
    });
    return present(hook);
  }

  async remove(routerId: string, hookId: string, organizationId: string, userId: string, ip?: string) {
    await this.ownHook(routerId, hookId, organizationId);
    await this.prisma.routerApiHook.delete({ where: { id: hookId } });
    await this.audit.log({ organizationId, userId, action: 'router.api_hook_delete', entityType: 'RouterApiHook', entityId: hookId, ipAddress: ip });
    return { deleted: true };
  }

  /** Envía un evento de prueba para que el ISP compruebe que su URL responde. */
  async test(routerId: string, hookId: string, organizationId: string) {
    const router = await this.ownRouter(routerId, organizationId);
    const hook = await this.ownHook(routerId, hookId, organizationId);
    const result = await this.deliver(hook, 'test.ping', {
      router: { id: router.id, name: router.name },
      message: 'Evento de prueba de ISP Control. Si lo recibes, la conexión funciona.',
    });
    return result;
  }

  // -- Emisión ---------------------------------------------------------------

  /** Datos del cliente para el evento, o null si su servicio no está en ningún router. */
  async snapshotCustomer(organizationId: string, customerId: string) {
    const customer: any = await this.prisma.customer.findFirst({
      where: { id: customerId, organizationId },
      include: { services: { include: { plan: true, router: true } } },
    });
    if (!customer) return null;
    const service = customer.services.find((s: any) => s.routerId);
    if (!service) return null;
    return {
      routerId: service.routerId as string,
      data: {
        router: { id: service.routerId, name: service.router?.name },
        customer: {
          id: customer.id,
          firstName: customer.firstName,
          lastName: customer.lastName,
          email: customer.email,
          phone: customer.phone,
          status: customer.status,
          pppoeUsername: service.pppoeUsername,
          ipAddress: service.ipAddress,
          plan: service.plan?.name,
        },
      },
    };
  }

  /** Avisa a los hooks del router del cliente. Nunca lanza ni bloquea a quien lo llama. */
  async emitCustomerEvent(organizationId: string, event: HookEvent, customerId: string, snapshot?: Awaited<ReturnType<RouterApiHooksService['snapshotCustomer']>>) {
    try {
      const snap = snapshot ?? (await this.snapshotCustomer(organizationId, customerId));
      if (!snap) return;
      await this.emit(organizationId, snap.routerId, event, snap.data);
    } catch (err) {
      this.logger.error(`emitCustomerEvent(${event}): ${(err as Error).message}`);
    }
  }

  async emit(organizationId: string, routerId: string, event: HookEvent, data: Record<string, unknown>) {
    try {
      const hooks = await this.prisma.routerApiHook.findMany({
        where: { organizationId, routerId, enabled: true, events: { has: event } },
      });
      await Promise.allSettled(hooks.map((h: any) => this.deliver(h, event, data)));
    } catch (err) {
      this.logger.error(`emit(${event}): ${(err as Error).message}`);
    }
  }

  private async deliver(hook: any, event: string, data: Record<string, unknown>) {
    const deliveryId = randomUUID();
    const payload = { event, occurredAt: new Date().toISOString(), deliveryId, ...data };
    let status: number | null = null;
    let error: string | null = null;
    try {
      const secret = hook.encryptedSecret ? this.crypto.decrypt(hook.encryptedSecret) : null;
      ({ status } = await this.sender(hook.url, payload, { secret, event, deliveryId }));
      if (status < 200 || status >= 300) error = `La URL respondió HTTP ${status}.`;
    } catch (err) {
      error = (err as Error).message;
    }
    try {
      await this.prisma.routerApiHook.update({
        where: { id: hook.id },
        data: { lastAt: new Date(), lastStatus: status, lastError: error },
      });
    } catch (err) {
      this.logger.warn(`No se pudo guardar el resultado del hook ${hook.id}: ${(err as Error).message}`);
    }
    if (error) this.logger.warn(`Hook ${hook.id} (${event}): ${error}`);
    return { ok: !error, status, error };
  }
}
