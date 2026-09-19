import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { AuditService } from '../common/audit/audit.service';
import { CredentialsEncryptionService } from '../common/crypto/credentials-encryption.service';
import { MikrotikService } from '../mikrotik/mikrotik.service';
import { CreateCustomerDto, UpdateCustomerDto, UpdateServiceDto } from './dto/customer.dto';

const CUSTOMER_LIST_INCLUDE = {
  technician: { select: { id: true, firstName: true, lastName: true } },
  services: { include: { plan: true, router: { select: { id: true, name: true } } } },
};

/** Nunca se devuelve al navegador ni siquiera la clave PPPoE cifrada. */
function stripServiceSecrets<T extends { services?: any[] }>(customer: T): T {
  if (!customer?.services) return customer;
  return {
    ...customer,
    services: customer.services.map(({ pppoeEncryptedPassword, ...service }: any) => service),
  };
}

/**
 * Todo método recibe `organizationId` (el de la organización del usuario
 * autenticado, tomado del JWT) y lo aplica en cada consulta. Un ISP jamás
 * puede leer, editar ni suspender clientes de otro ISP en la plataforma.
 */
@Injectable()
export class CustomersService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
    private crypto: CredentialsEncryptionService,
    private mikrotik: MikrotikService,
  ) {}

  async list(organizationId: string, params: { search?: string; status?: string; page: number; pageSize: number }) {
    const { search, status, page, pageSize } = params;

    const where: any = { organizationId };
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { documentId: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search } },
        { email: { contains: search, mode: 'insensitive' } },
        { services: { some: { pppoeUsername: { contains: search, mode: 'insensitive' } } } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.customer.findMany({
        where,
        include: CUSTOMER_LIST_INCLUDE,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.customer.count({ where }),
    ]);

    return { items: items.map(stripServiceSecrets), total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  private async findOwned(organizationId: string, id: string) {
    const customer = await this.prisma.customer.findFirst({ where: { id, organizationId } });
    if (!customer) throw new NotFoundException('Cliente no encontrado');
    return customer;
  }

  /**
   * Perfil completo del cliente (punto 3): información, servicio, facturas,
   * pagos, conexión, OLT/ONU, tickets, historial, notas, auditoría.
   */
  async getProfile(organizationId: string, id: string) {
    const customer = await this.prisma.customer.findFirst({
      where: { id, organizationId },
      include: {
        technician: { select: { id: true, firstName: true, lastName: true } },
        services: { include: { plan: true, router: { select: { id: true, name: true } } } },
      },
    });
    if (!customer) throw new NotFoundException('Cliente no encontrado');

    const [auditLogs, invoices, tickets] = await Promise.all([
      this.prisma.auditLog.findMany({
        where: { entityType: 'Customer', entityId: id },
        orderBy: { createdAt: 'desc' },
        take: 50,
        include: { user: { select: { firstName: true, lastName: true, email: true } } },
      }),
      this.prisma.invoice.findMany({ where: { customerId: id }, include: { payments: true }, orderBy: { dueDate: 'desc' } }),
      this.prisma.ticket.findMany({ where: { customerId: id }, orderBy: { createdAt: 'desc' } }),
    ]);

    const safeCustomer = stripServiceSecrets(customer);
    return {
      information: safeCustomer,
      service: safeCustomer.services,
      invoices,
      payments: invoices.flatMap((i) => i.payments),
      connection: {
        // Sesión en vivo real vía RouterOsProvider — ver MikrotikService.
        pppoeUsername: customer.services[0]?.pppoeUsername ?? null,
        ipAddress: customer.services[0]?.ipAddress ?? null,
      },
      oltOnu: {
        oltId: customer.services[0]?.oltId ?? null,
        onuSerial: customer.services[0]?.onuSerial ?? null,
      },
      tickets,
      history: auditLogs,
      notes: customer.notes,
      audit: auditLogs,
    };
  }

  async create(organizationId: string, dto: CreateCustomerDto, userId: string, ip?: string) {
    if (dto.documentId) {
      const existing = await this.prisma.customer.findFirst({ where: { organizationId, documentId: dto.documentId } });
      if (existing) throw new ConflictException('Ya existe un cliente con ese documento en tu cuenta');
    }

    const { planId, pppoeUsername, pppoePassword, routerId, ...customerData } = dto;

    // Plan y router deben ser de ESTA cuenta: un id de otra organización no sirve.
    if (planId) {
      const plan = await this.prisma.plan.findFirst({ where: { id: planId, organizationId } });
      if (!plan) throw new BadRequestException('El plan no existe en tu cuenta');
    }
    if (routerId) {
      const router = await this.prisma.router.findFirst({ where: { id: routerId, organizationId } });
      if (!router) throw new BadRequestException('El router no existe en tu cuenta');
    }
    if (routerId && !planId) {
      throw new BadRequestException('Para asignar un router debes elegir también un plan (el servicio se crea con el plan).');
    }

    let customer;
    try {
      customer = await this.prisma.customer.create({
        data: {
          ...customerData,
          organizationId,
          status: planId ? 'ACTIVE' : 'PENDING_INSTALLATION',
          services: planId
            ? {
                create: {
                  planId,
                  pppoeUsername,
                  pppoeEncryptedPassword: pppoePassword ? this.crypto.encrypt(pppoePassword) : undefined,
                  routerId,
                  status: 'ACTIVE',
                },
              }
            : undefined,
        },
        include: { services: { include: { plan: true } } },
      });
    } catch (err: any) {
      // pppoeUsername es único en toda la plataforma (restricción de la base).
      if (err?.code === 'P2002') throw new ConflictException('Ese usuario PPPoE ya está en uso');
      throw err;
    }

    await this.audit.log({
      organizationId,
      userId,
      action: 'customer.create',
      entityType: 'Customer',
      entityId: customer.id,
      ipAddress: ip,
      after: stripServiceSecrets(customer),
    });

    return stripServiceSecrets(customer);
  }

  async update(organizationId: string, id: string, dto: UpdateCustomerDto, userId: string, ip?: string) {
    const before = await this.findOwned(organizationId, id);
    const { planId, pppoeUsername, ...customerData } = dto;

    const customer = await this.prisma.customer.update({
      where: { id },
      data: customerData,
      include: { services: { include: { plan: true } } },
    });

    await this.audit.log({
      organizationId,
      userId,
      action: 'customer.update',
      entityType: 'Customer',
      entityId: id,
      ipAddress: ip,
      before,
      after: customer,
    });

    return customer;
  }

  /**
   * Cambia el plan, el router o el usuario PPPoE del servicio de un cliente
   * (o crea el servicio si aún no tenía). Sirve también para llevar clientes
   * que ya existían a un router: al guardar se (re)crea su usuario PPPoE en el
   * MikroTik nuevo y se quita del anterior. Si el cliente está suspendido, el
   * usuario queda DESHABILITADO en el router nuevo (mudarse no evita el corte).
   */
  async updateService(organizationId: string, customerId: string, dto: UpdateServiceDto, userId: string, ip?: string) {
    const customer = await this.findOwned(organizationId, customerId);
    const current: any = await this.prisma.service.findFirst({ where: { customerId }, include: { plan: true } });
    if (!current && !dto.planId) {
      throw new BadRequestException('Este cliente aún no tiene servicio: elige un plan para crearlo.');
    }

    // Plan y router deben ser de ESTA cuenta.
    if (dto.planId) {
      const plan = await this.prisma.plan.findFirst({ where: { id: dto.planId, organizationId } });
      if (!plan) throw new BadRequestException('El plan no existe en tu cuenta');
    }
    if (dto.routerId) {
      const router = await this.prisma.router.findFirst({ where: { id: dto.routerId, organizationId } });
      if (!router) throw new BadRequestException('El router no existe en tu cuenta');
    }

    const data: Record<string, unknown> = {};
    if (dto.planId) data.planId = dto.planId;
    if (dto.routerId !== undefined) data.routerId = dto.routerId || null;
    if (dto.pppoeUsername !== undefined) data.pppoeUsername = dto.pppoeUsername || null;
    if (dto.pppoePassword) data.pppoeEncryptedPassword = this.crypto.encrypt(dto.pppoePassword);

    const include = { plan: true, router: { select: { id: true, name: true } } };
    let service: any;
    try {
      service = current
        ? await this.prisma.service.update({ where: { id: current.id }, data, include })
        : await this.prisma.service.create({
            data: { ...data, customerId, planId: dto.planId!, status: customer.status === 'SUSPENDED' ? 'SUSPENDED' : 'ACTIVE' },
            include,
          });
    } catch (err: any) {
      if (err?.code === 'P2002') throw new ConflictException('Ese usuario PPPoE ya está en uso');
      throw err;
    }

    const networkAction = await this.syncNetwork(current, service, customer.status === 'SUSPENDED', dto.pppoePassword);

    await this.audit.log({
      organizationId,
      userId,
      action: 'customer.service_update',
      entityType: 'Customer',
      entityId: customerId,
      ipAddress: ip,
      // Nunca la clave: solo qué cambió.
      before: current ? { planId: current.planId, routerId: current.routerId, pppoeUsername: current.pppoeUsername } : null,
      after: { planId: service.planId, routerId: service.routerId, pppoeUsername: service.pppoeUsername },
    });

    const { pppoeEncryptedPassword, ...safe } = service;
    return { ...safe, networkAction };
  }

  /** Deja el MikroTik acorde al servicio: quita el usuario del router anterior y lo crea en el nuevo. */
  private async syncNetwork(
    previous: { routerId?: string | null; pppoeUsername?: string | null } | null,
    service: any,
    suspended: boolean,
    plainPassword?: string,
  ): Promise<{ applied: boolean; action?: string; reason?: string; warning?: string } | undefined> {
    const moved =
      !!previous?.routerId && !!previous.pppoeUsername &&
      (previous.routerId !== service.routerId || previous.pppoeUsername !== service.pppoeUsername);

    let warning: string | undefined;
    if (moved) {
      const removed = await this.mikrotik.removeCustomerSecret(previous!.routerId!, previous!.pppoeUsername!);
      if (!removed.applied) warning = `No se pudo quitar al cliente del router anterior: ${removed.reason ?? 'error desconocido'}`;
    }

    if (!service.routerId) {
      return moved ? { applied: !warning, action: 'removed', warning } : undefined;
    }
    if (!service.pppoeUsername) {
      return { applied: false, reason: 'Falta el usuario PPPoE: el servicio se guardó pero no se agregó al router.', warning };
    }

    let password = plainPassword;
    if (!password && service.pppoeEncryptedPassword) {
      try {
        password = this.crypto.decrypt(service.pppoeEncryptedPassword);
      } catch {
        password = undefined;
      }
    }
    if (!password) {
      return { applied: false, reason: 'No hay contraseña PPPoE guardada: escríbela para crear el usuario en el router.', warning };
    }

    const result = await this.mikrotik.pushCustomerSecret(service.routerId, {
      username: service.pppoeUsername,
      password,
      profile: service.plan?.mikrotikProfile ?? null,
      disabled: suspended,
    });
    return { ...result, warning };
  }

  /**
   * Suspensión MANUAL: cambia el estado en BD y registra auditoría. La
   * suspensión real de PPPoE en el router del cliente (RouterProvider) se
   * dispara desde CustomersController usando el MikrotikService de la MISMA
   * organización — nunca cruza hacia el router de otro ISP.
   */
  async suspend(organizationId: string, id: string, reason: string | undefined, userId: string, ip?: string) {
    const before = await this.findOwned(organizationId, id);
    const customer = await this.prisma.customer.update({
      where: { id },
      data: { status: 'SUSPENDED' },
    });
    await this.prisma.service.updateMany({ where: { customerId: id }, data: { status: 'SUSPENDED' } });

    await this.audit.log({
      organizationId,
      userId,
      action: 'customer.suspend',
      entityType: 'Customer',
      entityId: id,
      ipAddress: ip,
      before,
      after: { ...customer, reason: reason ?? null },
    });

    return customer;
  }

  async reactivate(organizationId: string, id: string, userId: string, ip?: string) {
    const before = await this.findOwned(organizationId, id);
    const customer = await this.prisma.customer.update({ where: { id }, data: { status: 'ACTIVE' } });
    await this.prisma.service.updateMany({ where: { customerId: id }, data: { status: 'ACTIVE' } });

    await this.audit.log({
      organizationId,
      userId,
      action: 'customer.reactivate',
      entityType: 'Customer',
      entityId: id,
      ipAddress: ip,
      before,
      after: customer,
    });

    return customer;
  }

  async remove(organizationId: string, id: string, userId: string, ip?: string) {
    await this.findOwned(organizationId, id);
    await this.prisma.customer.delete({ where: { id } });
    await this.audit.log({ organizationId, userId, action: 'customer.delete', entityType: 'Customer', entityId: id, ipAddress: ip });
    return { deleted: true };
  }

  /** Usado por CustomersController para obtener el router asociado antes de suspender/reactivar en red real. */
  async getServiceWithRouter(organizationId: string, customerId: string) {
    await this.findOwned(organizationId, customerId);
    return this.prisma.service.findFirst({ where: { customerId }, include: { router: true } });
  }
}
