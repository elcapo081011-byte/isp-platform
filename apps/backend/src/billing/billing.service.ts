import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { AuditService } from '../common/audit/audit.service';
import { CreateInvoiceDto, RegisterPaymentDto } from './dto/invoice.dto';

/** Toda factura, pago y numeración vive aislada por organización. */
@Injectable()
export class BillingService {
  constructor(private prisma: PrismaService, private audit: AuditService) {}

  private async nextInvoiceNumber(organizationId: string): Promise<string> {
    const year = new Date().getFullYear();
    const countThisYear = await this.prisma.invoice.count({
      where: { organizationId, number: { startsWith: `INV-${year}-` } },
    });
    return `INV-${year}-${String(countThisYear + 1).padStart(5, '0')}`;
  }

  async list(organizationId: string, params: { status?: string; customerId?: string; page: number; pageSize: number }) {
    const { status, customerId, page, pageSize } = params;
    const where: any = { organizationId };
    if (status) where.status = status;
    if (customerId) where.customerId = customerId;

    const [items, total] = await Promise.all([
      this.prisma.invoice.findMany({
        where,
        include: { customer: { select: { firstName: true, lastName: true } }, payments: true },
        orderBy: { dueDate: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.invoice.count({ where }),
    ]);
    return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  private async findOwned(organizationId: string, invoiceId: string) {
    const invoice = await this.prisma.invoice.findFirst({ where: { id: invoiceId, organizationId }, include: { payments: true } });
    if (!invoice) throw new NotFoundException('Factura no encontrada');
    return invoice;
  }

  async create(organizationId: string, dto: CreateInvoiceDto, userId: string, ip?: string) {
    const customer = await this.prisma.customer.findFirst({ where: { id: dto.customerId, organizationId } });
    if (!customer) throw new NotFoundException('Cliente no encontrado en tu cuenta');

    const number = await this.nextInvoiceNumber(organizationId);
    const invoice = await this.prisma.invoice.create({
      data: {
        organizationId,
        number,
        customerId: dto.customerId,
        serviceId: dto.serviceId,
        amount: dto.amount,
        discount: dto.discount ?? 0,
        surcharge: dto.surcharge ?? 0,
        dueDate: new Date(dto.dueDate),
        notes: dto.notes,
      },
    });
    await this.audit.log({ organizationId, userId, action: 'invoice.create', entityType: 'Invoice', entityId: invoice.id, ipAddress: ip, after: invoice });
    return invoice;
  }

  /**
   * Genera la factura recurrente del período actual para un servicio activo,
   * usando el precio del plan vigente. Evita duplicar si ya existe una
   * factura PENDING/OVERDUE para el mismo servicio y mes.
   */
  async generateRecurringForService(organizationId: string, serviceId: string, userId: string, ip?: string) {
    const service = await this.prisma.service.findFirst({
      where: { id: serviceId, customer: { organizationId } },
      include: { plan: true },
    });
    if (!service) throw new NotFoundException('Servicio no encontrado en tu cuenta');

    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const existing = await this.prisma.invoice.findFirst({
      where: { serviceId, issuedAt: { gte: periodStart }, status: { in: ['PENDING', 'OVERDUE', 'PARTIAL'] } },
    });
    if (existing) return existing;

    const customer = await this.prisma.customer.findUniqueOrThrow({ where: { id: service.customerId } });
    const dueDate = new Date(now.getFullYear(), now.getMonth(), customer.billingDay);
    if (dueDate < now) dueDate.setMonth(dueDate.getMonth() + 1);

    return this.create(
      organizationId,
      {
        customerId: service.customerId,
        serviceId: service.id,
        amount: Number(service.plan.price),
        dueDate: dueDate.toISOString(),
        notes: `Generada automáticamente — ${service.plan.name}`,
      },
      userId,
      ip,
    );
  }

  /**
   * Factura emitida por el motor automático (sin usuario detrás). Deja
   * auditoría sin `userId`, porque no hay una persona que la creó.
   */
  async createSystemInvoice(
    organizationId: string,
    data: { customerId: string; serviceId: string; amount: number; surcharge: number; currency?: string; dueDate: Date; notes?: string },
  ) {
    const number = await this.nextInvoiceNumber(organizationId);
    const invoice = await this.prisma.invoice.create({
      data: {
        organizationId,
        number,
        customerId: data.customerId,
        serviceId: data.serviceId,
        amount: data.amount,
        surcharge: data.surcharge,
        currency: data.currency,
        dueDate: data.dueDate,
        notes: data.notes,
      },
    });
    await this.audit.log({
      organizationId,
      action: 'invoice.auto_create',
      entityType: 'Invoice',
      entityId: invoice.id,
      after: { number, amount: data.amount, surcharge: data.surcharge, dueDate: data.dueDate },
    });
    return invoice;
  }

  async registerPayment(organizationId: string, invoiceId: string, dto: RegisterPaymentDto, userId: string, ip?: string) {
    const invoice = await this.findOwned(organizationId, invoiceId);
    if (invoice.status === 'CANCELLED') throw new BadRequestException('No se puede pagar una factura cancelada');

    const payment = await this.prisma.payment.create({
      data: {
        invoiceId,
        amount: dto.amount,
        method: (dto.method as any) ?? 'CASH',
        reference: dto.reference,
        registeredById: userId,
      },
    });

    const totalPaid = invoice.payments.reduce((sum, p) => sum + Number(p.amount), 0) + dto.amount;
    const invoiceTotal = Number(invoice.amount) - Number(invoice.discount) + Number(invoice.surcharge);
    const newStatus = totalPaid >= invoiceTotal ? 'PAID' : 'PARTIAL';

    const updated = await this.prisma.invoice.update({
      where: { id: invoiceId },
      data: { status: newStatus, paidAt: newStatus === 'PAID' ? new Date() : null },
    });

    await this.audit.log({ organizationId, userId, action: 'payment.register', entityType: 'Invoice', entityId: invoiceId, ipAddress: ip, after: payment });

    // Si el cliente estaba suspendido y ya no tiene facturas vencidas, se reactiva.
    if (newStatus === 'PAID') {
      const stillOverdue = await this.prisma.invoice.count({
        where: { customerId: invoice.customerId, status: 'OVERDUE' },
      });
      if (stillOverdue === 0) {
        const customer = await this.prisma.customer.findUnique({ where: { id: invoice.customerId } });
        if (customer?.status === 'SUSPENDED') {
          await this.prisma.customer.update({ where: { id: invoice.customerId }, data: { status: 'ACTIVE' } });
          await this.prisma.service.updateMany({ where: { customerId: invoice.customerId }, data: { status: 'ACTIVE' } });
          await this.audit.log({
            organizationId,
            userId,
            action: 'customer.reactivate_by_payment',
            entityType: 'Customer',
            entityId: invoice.customerId,
            ipAddress: ip,
          });
          // La reconexión real en el router (RouterProvider.enablePppoeSecret) la
          // dispara BillingController usando el router de ESTA MISMA organización.
        }
      }
    }

    return { payment, invoice: updated };
  }

  async cancel(organizationId: string, invoiceId: string, userId: string, ip?: string) {
    await this.findOwned(organizationId, invoiceId);
    const invoice = await this.prisma.invoice.update({ where: { id: invoiceId }, data: { status: 'CANCELLED' } });
    await this.audit.log({ organizationId, userId, action: 'invoice.cancel', entityType: 'Invoice', entityId: invoiceId, ipAddress: ip });
    return invoice;
  }

  /** Usado por BillingController para saber si hay que reconectar en el router tras un pago. */
  async getServiceRouterForCustomer(organizationId: string, customerId: string) {
    return this.prisma.service.findFirst({ where: { customerId, customer: { organizationId } }, include: { router: true } });
  }
}
