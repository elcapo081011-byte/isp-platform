import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { AuditService } from '../common/audit/audit.service';
import { CreateCustomerDto, UpdateCustomerDto } from './dto/customer.dto';

const CUSTOMER_LIST_INCLUDE = {
  technician: { select: { id: true, firstName: true, lastName: true } },
  services: { include: { plan: true } },
};

/**
 * Todo método recibe `organizationId` (el de la organización del usuario
 * autenticado, tomado del JWT) y lo aplica en cada consulta. Un ISP jamás
 * puede leer, editar ni suspender clientes de otro ISP en la plataforma.
 */
@Injectable()
export class CustomersService {
  constructor(private prisma: PrismaService, private audit: AuditService) {}

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

    return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
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
        services: { include: { plan: true } },
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

    return {
      information: customer,
      service: customer.services,
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

    const { planId, pppoeUsername, ...customerData } = dto;

    const customer = await this.prisma.customer.create({
      data: {
        ...customerData,
        organizationId,
        status: planId ? 'ACTIVE' : 'PENDING_INSTALLATION',
        services: planId
          ? {
              create: {
                planId,
                pppoeUsername,
                status: 'ACTIVE',
              },
            }
          : undefined,
      },
      include: { services: { include: { plan: true } } },
    });

    await this.audit.log({
      organizationId,
      userId,
      action: 'customer.create',
      entityType: 'Customer',
      entityId: customer.id,
      ipAddress: ip,
      after: customer,
    });

    return customer;
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
