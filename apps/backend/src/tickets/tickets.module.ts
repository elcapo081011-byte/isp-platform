import { Module, Injectable, Controller, Get, Post, Put, Body, Param, Query, Req, UseGuards, NotFoundException } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard, RequirePermissions } from '../rbac/permissions.guard';
import { PrismaService } from '../common/prisma/prisma.service';
import { AuditService } from '../common/audit/audit.service';
import { CreateTicketDto, AddCommentDto, UpdateTicketStatusDto } from './dto/ticket.dto';

@Injectable()
class TicketsService {
  constructor(private prisma: PrismaService, private audit: AuditService) {}

  list(organizationId: string, status?: string, assignedToId?: string) {
    return this.prisma.ticket.findMany({
      where: { organizationId, status: status as any, assignedToId },
      include: {
        customer: { select: { firstName: true, lastName: true } },
        assignedTo: { select: { firstName: true, lastName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  private async findOwned(organizationId: string, id: string) {
    const ticket = await this.prisma.ticket.findFirst({ where: { id, organizationId } });
    if (!ticket) throw new NotFoundException('Ticket no encontrado');
    return ticket;
  }

  async detail(organizationId: string, id: string) {
    await this.findOwned(organizationId, id);
    return this.prisma.ticket.findUniqueOrThrow({
      where: { id },
      include: {
        customer: true,
        assignedTo: { select: { firstName: true, lastName: true } },
        comments: { include: { author: { select: { firstName: true, lastName: true } } }, orderBy: { createdAt: 'asc' } },
      },
    });
  }

  async create(organizationId: string, dto: CreateTicketDto, userId: string, ip?: string) {
    const customer = await this.prisma.customer.findFirst({ where: { id: dto.customerId, organizationId } });
    if (!customer) throw new NotFoundException('Cliente no encontrado en tu cuenta');
    const ticket = await this.prisma.ticket.create({ data: { ...dto, organizationId } });
    await this.audit.log({ organizationId, userId, action: 'ticket.create', entityType: 'Ticket', entityId: ticket.id, ipAddress: ip });
    return ticket;
  }

  async addComment(organizationId: string, ticketId: string, dto: AddCommentDto, userId: string) {
    await this.findOwned(organizationId, ticketId);
    return this.prisma.ticketComment.create({ data: { ticketId, body: dto.body, authorId: userId } });
  }

  async updateStatus(organizationId: string, ticketId: string, dto: UpdateTicketStatusDto, userId: string, ip?: string) {
    await this.findOwned(organizationId, ticketId);
    const ticket = await this.prisma.ticket.update({ where: { id: ticketId }, data: { status: dto.status } });
    await this.audit.log({ organizationId, userId, action: 'ticket.status_change', entityType: 'Ticket', entityId: ticketId, ipAddress: ip, after: { status: dto.status } });
    return ticket;
  }
}

@ApiTags('tickets')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('tickets')
class TicketsController {
  constructor(private tickets: TicketsService) {}

  @Get()
  @RequirePermissions('tickets.view')
  list(@Req() req: any, @Query('status') status?: string, @Query('assignedToId') assignedToId?: string) {
    return this.tickets.list(req.user.organizationId, status, assignedToId);
  }

  @Get(':id')
  @RequirePermissions('tickets.view')
  detail(@Param('id') id: string, @Req() req: any) {
    return this.tickets.detail(req.user.organizationId, id);
  }

  @Post()
  @RequirePermissions('tickets.manage')
  create(@Body() dto: CreateTicketDto, @Req() req: any) {
    return this.tickets.create(req.user.organizationId, dto, req.user.sub, req.ip);
  }

  @Post(':id/comments')
  @RequirePermissions('tickets.manage')
  addComment(@Param('id') id: string, @Body() dto: AddCommentDto, @Req() req: any) {
    return this.tickets.addComment(req.user.organizationId, id, dto, req.user.sub);
  }

  @Put(':id/status')
  @RequirePermissions('tickets.manage')
  updateStatus(@Param('id') id: string, @Body() dto: UpdateTicketStatusDto, @Req() req: any) {
    return this.tickets.updateStatus(req.user.organizationId, id, dto, req.user.sub, req.ip);
  }
}

@Module({
  controllers: [TicketsController],
  providers: [TicketsService, PrismaService, AuditService],
})
export class TicketsModule {}
