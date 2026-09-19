import { Module, Injectable, Controller, Get, Post, Patch, Delete, Body, Param, Query, Req, UseGuards, NotFoundException, ForbiddenException } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PlatformAdminGuard } from './platform-admin.guard';
import { PrismaService } from '../common/prisma/prisma.service';
import { AuditService } from '../common/audit/audit.service';

/**
 * Panel para EL DUEÑO DE LA PLATAFORMA (tú), no para los ISP que se
 * registran. Permite ver todas las organizaciones (cuentas de tus clientes
 * ISP), su plan/estado, y suspenderlas por falta de pago de tu propio
 * servicio SaaS — sin que eso implique acceder a los datos de sus clientes.
 */
@Injectable()
class PlatformService {
  constructor(private prisma: PrismaService, private audit: AuditService) {}

  async listOrganizations() {
    const orgs = await this.prisma.organization.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { customers: true, users: true, routers: true, olts: true } },
      },
    });
    return orgs.map((o) => ({
      id: o.id,
      name: o.name,
      slug: o.slug,
      plan: o.plan,
      isActive: o.isActive,
      createdAt: o.createdAt,
      customersCount: o._count.customers,
      usersCount: o._count.users,
      routersCount: o._count.routers,
      oltsCount: o._count.olts,
    }));
  }

  async platformSummary() {
    const [totalOrganizations, activeOrganizations, totalCustomersAcrossAllOrgs, totalUsersAcrossAllOrgs] = await Promise.all([
      this.prisma.organization.count(),
      this.prisma.organization.count({ where: { isActive: true } }),
      this.prisma.customer.count(),
      this.prisma.user.count(),
    ]);
    return { totalOrganizations, activeOrganizations, totalCustomersAcrossAllOrgs, totalUsersAcrossAllOrgs };
  }

  async setOrganizationActive(id: string, isActive: boolean, platformAdminUserId: string) {
    const org = await this.prisma.organization.findUnique({ where: { id } });
    if (!org) throw new NotFoundException('Organización no encontrada');

    const updated = await this.prisma.organization.update({ where: { id }, data: { isActive } });
    await this.audit.log({
      organizationId: id,
      userId: platformAdminUserId,
      action: isActive ? 'platform.organization_activate' : 'platform.organization_suspend',
      entityType: 'Organization',
      entityId: id,
    });
    return updated;
  }

  async updateOrganization(
    id: string,
    dto: { name?: string; plan?: string; platformCurrency?: string; billingGraceDays?: number },
    platformAdminUserId: string,
  ) {
    const org = await this.prisma.organization.findUnique({ where: { id } });
    if (!org) throw new NotFoundException('Organización no encontrada');
    if (org.slug === 'platform') {
      throw new ForbiddenException('No se puede editar la organización interna de la plataforma.');
    }

    const updated = await this.prisma.organization.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.plan !== undefined && { plan: dto.plan }),
        ...(dto.platformCurrency !== undefined && { platformCurrency: dto.platformCurrency }),
        ...(dto.billingGraceDays !== undefined && { billingGraceDays: dto.billingGraceDays }),
      },
    });
    await this.audit.log({
      organizationId: id,
      userId: platformAdminUserId,
      action: 'platform.organization_update',
      entityType: 'Organization',
      entityId: id,
      before: org,
      after: updated,
    });
    return updated;
  }

  async deleteOrganization(id: string, platformAdminUserId: string) {
    const org = await this.prisma.organization.findUnique({ where: { id } });
    if (!org) throw new NotFoundException('Organización no encontrada');
    if (org.slug === 'platform') {
      throw new ForbiddenException('No se puede eliminar la organización interna de la plataforma (tu propio acceso vive ahí).');
    }

    // El schema tiene onDelete: Cascade en las relaciones de Organization,
    // así que esto borra en cascada clientes, usuarios, facturas, routers, etc.
    await this.prisma.organization.delete({ where: { id } });

    // El log de auditoría queda sin organizationId real porque la org ya no
    // existe (se registra bajo la organización interna de la plataforma).
    await this.audit.log({
      userId: platformAdminUserId,
      action: 'platform.organization_delete',
      entityType: 'Organization',
      entityId: id,
      before: org,
    });
    return { deleted: true, id, name: org.name };
  }
}

@ApiTags('platform-admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PlatformAdminGuard)
@Controller('platform')
class PlatformController {
  constructor(private platform: PlatformService) {}

  @Get('organizations')
  listOrganizations() {
    return this.platform.listOrganizations();
  }

  @Get('summary')
  summary() {
    return this.platform.platformSummary();
  }

  @Post('organizations/:id/suspend')
  suspend(@Param('id') id: string, @Req() req: any) {
    return this.platform.setOrganizationActive(id, false, req.user.sub);
  }

  @Post('organizations/:id/activate')
  activate(@Param('id') id: string, @Req() req: any) {
    return this.platform.setOrganizationActive(id, true, req.user.sub);
  }

  @Patch('organizations/:id')
  update(
    @Param('id') id: string,
    @Body() dto: { name?: string; plan?: string; platformCurrency?: string; billingGraceDays?: number },
    @Req() req: any,
  ) {
    return this.platform.updateOrganization(id, dto, req.user.sub);
  }

  @Delete('organizations/:id')
  remove(@Param('id') id: string, @Req() req: any) {
    return this.platform.deleteOrganization(id, req.user.sub);
  }
}

@Module({
  controllers: [PlatformController],
  providers: [PlatformService, PlatformAdminGuard, PrismaService, AuditService],
})
export class PlatformModule {}
