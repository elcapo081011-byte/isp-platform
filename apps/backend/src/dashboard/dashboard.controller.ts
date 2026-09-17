import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PrismaService } from '../common/prisma/prisma.service';

/**
 * Todos los contadores se filtran por `organizationId` del usuario
 * autenticado. Un ISP nunca ve las cifras de otro ISP en la plataforma.
 */
@ApiTags('dashboard')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('dashboard')
export class DashboardController {
  constructor(private prisma: PrismaService) {}

  @Get('summary')
  async summary(@Req() req: any) {
    const organizationId = req.user.organizationId;

    const [
      totalUsers, recentAuditEvents, customersTotal, customersActive, customersSuspended,
      invoicesPending, invoicesOverdue, revenueMonthAgg, mikrotikOnline, oltOnline, openTickets,
    ] = await Promise.all([
      this.prisma.user.count({ where: { organizationId, isActive: true } }),
      this.prisma.auditLog.count({ where: { organizationId } }),
      this.prisma.customer.count({ where: { organizationId } }),
      this.prisma.customer.count({ where: { organizationId, status: 'ACTIVE' } }),
      this.prisma.customer.count({ where: { organizationId, status: 'SUSPENDED' } }),
      this.prisma.invoice.count({ where: { organizationId, status: 'PENDING' } }),
      this.prisma.invoice.count({ where: { organizationId, status: 'OVERDUE' } }),
      this.prisma.payment.aggregate({
        _sum: { amount: true },
        where: {
          invoice: { organizationId },
          paidAt: { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) },
        },
      }),
      this.prisma.router.count({ where: { organizationId, status: 'ONLINE' } }),
      this.prisma.olt.count({ where: { organizationId, status: 'ONLINE' } }),
      this.prisma.ticket.count({ where: { organizationId, status: { in: ['OPEN', 'IN_PROGRESS', 'WAITING_CUSTOMER'] } } }),
    ]);

    return {
      systemUsers: { value: totalUsers, source: 'live' },
      auditEventsTotal: { value: recentAuditEvents, source: 'live' },
      customersTotal: { value: customersTotal, source: 'live' },
      customersActive: { value: customersActive, source: 'live' },
      customersSuspended: { value: customersSuspended, source: 'live' },
      revenueToday: { value: null, source: 'not_tracked_daily' },
      revenueMonth: { value: Number(revenueMonthAgg._sum.amount ?? 0), source: 'live' },
      invoicesPending: { value: invoicesPending, source: 'live' },
      invoicesOverdue: { value: invoicesOverdue, source: 'live' },
      mikrotikOnline: { value: mikrotikOnline, source: 'live' },
      oltOnline: { value: oltOnline, source: 'live' },
      onuOnline: { value: null, source: 'requires_vendor_driver' },
      openTickets: { value: openTickets, source: 'live' },
    };
  }
}
