import { Body, Controller, Delete, Get, NotFoundException, Param, Post, Put, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard, RequirePermissions } from '../rbac/permissions.guard';
import { PrismaService } from '../common/prisma/prisma.service';
import { AuditService } from '../common/audit/audit.service';
import { CreatePlanDto, UpdatePlanDto } from './dto/plan.dto';

@ApiTags('plans')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('plans')
export class PlansController {
  constructor(private prisma: PrismaService, private audit: AuditService) {}

  @Get()
  @RequirePermissions('plans.view')
  async list(@Req() req: any, @Query('status') status?: string) {
    return this.prisma.plan.findMany({
      where: { organizationId: req.user.organizationId, status: status as any },
      orderBy: { downloadMbps: 'asc' },
    });
  }

  @Get(':id')
  @RequirePermissions('plans.view')
  async detail(@Param('id') id: string, @Req() req: any) {
    const plan = await this.prisma.plan.findFirst({ where: { id, organizationId: req.user.organizationId } });
    if (!plan) throw new NotFoundException('Plan no encontrado');
    return plan;
  }

  @Post()
  @RequirePermissions('plans.manage')
  async create(@Body() dto: CreatePlanDto, @Req() req: any) {
    const plan = await this.prisma.plan.create({ data: { ...dto, organizationId: req.user.organizationId } });
    await this.audit.log({
      organizationId: req.user.organizationId,
      userId: req.user.sub,
      action: 'plan.create',
      entityType: 'Plan',
      entityId: plan.id,
      ipAddress: req.ip,
      after: plan,
    });
    return plan;
  }

  @Put(':id')
  @RequirePermissions('plans.manage')
  async update(@Param('id') id: string, @Body() dto: UpdatePlanDto, @Req() req: any) {
    const before = await this.prisma.plan.findFirst({ where: { id, organizationId: req.user.organizationId } });
    if (!before) throw new NotFoundException('Plan no encontrado');
    const plan = await this.prisma.plan.update({ where: { id }, data: dto });
    await this.audit.log({
      organizationId: req.user.organizationId,
      userId: req.user.sub,
      action: 'plan.update',
      entityType: 'Plan',
      entityId: id,
      ipAddress: req.ip,
      before,
      after: plan,
    });
    return plan;
  }

  @Delete(':id')
  @RequirePermissions('plans.manage')
  async remove(@Param('id') id: string, @Req() req: any) {
    const existing = await this.prisma.plan.findFirst({ where: { id, organizationId: req.user.organizationId } });
    if (!existing) throw new NotFoundException('Plan no encontrado');

    // Los planes con servicios activos no se eliminan; se inactivan (integridad referencial).
    const inUse = await this.prisma.service.count({ where: { planId: id } });
    if (inUse > 0) {
      const plan = await this.prisma.plan.update({ where: { id }, data: { status: 'INACTIVE' } });
      await this.audit.log({ organizationId: req.user.organizationId, userId: req.user.sub, action: 'plan.deactivate', entityType: 'Plan', entityId: id, ipAddress: req.ip });
      return plan;
    }
    await this.prisma.plan.delete({ where: { id } });
    await this.audit.log({ organizationId: req.user.organizationId, userId: req.user.sub, action: 'plan.delete', entityType: 'Plan', entityId: id, ipAddress: req.ip });
    return { deleted: true };
  }
}
