import { Body, Controller, Get, Param, Post, Query, Req, Res, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard, RequirePermissions } from '../rbac/permissions.guard';
import { BillingService } from './billing.service';
import { CreateInvoiceDto, RegisterPaymentDto } from './dto/invoice.dto';
import { PrismaService } from '../common/prisma/prisma.service';
import { MikrotikService } from '../mikrotik/mikrotik.service';
import { RouterApiHooksService } from '../mikrotik/hooks/router-api-hooks.service';
import { generateInvoicePdf } from './invoice-pdf.util';

@ApiTags('billing')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('billing/invoices')
export class BillingController {
  constructor(
    private billing: BillingService,
    private prisma: PrismaService,
    private mikrotik: MikrotikService,
    private hooks: RouterApiHooksService,
  ) {}

  @Get()
  @RequirePermissions('billing.view')
  async list(
    @Req() req: any,
    @Query('status') status?: string,
    @Query('customerId') customerId?: string,
    @Query('page') page = '1',
    @Query('pageSize') pageSize = '20',
  ) {
    return this.billing.list(req.user.organizationId, { status, customerId, page: +page || 1, pageSize: Math.min(+pageSize || 20, 100) });
  }

  @Post()
  @RequirePermissions('billing.create')
  async create(@Body() dto: CreateInvoiceDto, @Req() req: any) {
    return this.billing.create(req.user.organizationId, dto, req.user.sub, req.ip);
  }

  @Post('generate-recurring/:serviceId')
  @RequirePermissions('billing.create')
  async generateRecurring(@Param('serviceId') serviceId: string, @Req() req: any) {
    return this.billing.generateRecurringForService(req.user.organizationId, serviceId, req.user.sub, req.ip);
  }

  @Post(':id/payments')
  @RequirePermissions('billing.edit')
  async registerPayment(@Param('id') id: string, @Body() dto: RegisterPaymentDto, @Req() req: any) {
    // ¿Estaba suspendido antes de pagar? Solo entonces el pago lo reactiva (y solo entonces se avisa).
    const invoiceBefore = await this.prisma.invoice.findFirst({
      where: { id, organizationId: req.user.organizationId },
      include: { customer: { select: { id: true, status: true } } },
    });
    const wasSuspended = invoiceBefore?.customer?.status === 'SUSPENDED';

    const result = await this.billing.registerPayment(req.user.organizationId, id, dto, req.user.sub, req.ip);

    // Si el pago reactivó al cliente, reconectar en su router real.
    if (result.invoice.status === 'PAID') {
      const service = await this.billing.getServiceRouterForCustomer(req.user.organizationId, result.invoice.customerId);
      if (service?.routerId && service.pppoeUsername) {
        await this.mikrotik.enableCustomerSession(service.routerId, service.pppoeUsername);
      }
      if (wasSuspended) {
        const after = await this.prisma.customer.findUnique({ where: { id: result.invoice.customerId }, select: { status: true } });
        if (after?.status === 'ACTIVE') {
          void this.hooks.emitCustomerEvent(req.user.organizationId, 'customer.activated', result.invoice.customerId);
        }
      }
    }

    return result;
  }

  @Post(':id/cancel')
  @RequirePermissions('billing.edit')
  async cancel(@Param('id') id: string, @Req() req: any) {
    return this.billing.cancel(req.user.organizationId, id, req.user.sub, req.ip);
  }

  @Get(':id/pdf')
  @RequirePermissions('billing.view')
  async downloadPdf(@Param('id') id: string, @Req() req: any, @Res() res: Response) {
    const invoice = await this.prisma.invoice.findFirstOrThrow({
      where: { id, organizationId: req.user.organizationId },
      include: { customer: true, payments: true },
    });
    const pdfBuffer = await generateInvoicePdf(invoice);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${invoice.number}.pdf"`);
    res.send(pdfBuffer);
  }
}
