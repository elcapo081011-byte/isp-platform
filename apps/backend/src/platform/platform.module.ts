import {
  BadRequestException, Body, Controller, Get, Injectable, Logger, Module, NotFoundException, OnApplicationBootstrap, Param, Post, Req, UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import * as bcrypt from 'bcrypt';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AuthModule } from '../auth/auth.module';
import { AuthService } from '../auth/auth.service';
import { RegisterOrganizationDto } from '../auth/dto/register-organization.dto';
import { PlatformAdminGuard } from './platform-admin.guard';
import { PrismaService } from '../common/prisma/prisma.service';
import { AuditService } from '../common/audit/audit.service';
import { UsersModule } from '../users/users.module';
import { UsersService } from '../users/users.service';
import { CreateUserDto } from '../users/dto/user.dto';
import { ensureDefaultRoles } from '../rbac/default-roles';

const PLATFORM_ORG_SLUG = 'platform';

/**
 * Crea (o promueve) el usuario DUEÑO de la plataforma al arrancar el backend,
 * a partir de variables de entorno. Así el dueño se crea con su propio correo
 * y contraseña — sin depender de las credenciales de demo del seed y sin
 * ningún endpoint público que pueda otorgar `isPlatformAdmin`.
 *
 *   PLATFORM_OWNER_EMAIL=tu@correo.com
 *   PLATFORM_OWNER_PASSWORD=una-contraseña-larga   (mínimo 12 caracteres)
 *   PLATFORM_OWNER_FIRST_NAME / PLATFORM_OWNER_LAST_NAME   (opcionales)
 *   PLATFORM_OWNER_RESET_PASSWORD=true   (solo para recuperar acceso: reescribe la contraseña)
 */
@Injectable()
export class PlatformBootstrapService implements OnApplicationBootstrap {
  private readonly logger = new Logger('PlatformBootstrap');

  constructor(private prisma: PrismaService) {}

  async onApplicationBootstrap() {
    const email = process.env.PLATFORM_OWNER_EMAIL?.trim().toLowerCase();
    const password = process.env.PLATFORM_OWNER_PASSWORD;
    if (!email && !password) return; // no configurado: nada que hacer
    if (!email || !password) {
      this.logger.error('Para crear el dueño define PLATFORM_OWNER_EMAIL y PLATFORM_OWNER_PASSWORD (las dos).');
      return;
    }
    if (password.length < 12) {
      this.logger.error('PLATFORM_OWNER_PASSWORD debe tener al menos 12 caracteres. No se creó el dueño.');
      return;
    }

    try {
      await ensureDefaultRoles(this.prisma);
      const platformOrg = await this.prisma.organization.upsert({
        where: { slug: PLATFORM_ORG_SLUG },
        update: {},
        create: { name: 'Plataforma (interno)', slug: PLATFORM_ORG_SLUG, plan: 'INTERNAL' },
      });

      const existing = await this.prisma.user.findUnique({ where: { email } });
      if (!existing) {
        await this.prisma.user.create({
          data: {
            organizationId: platformOrg.id,
            email,
            firstName: process.env.PLATFORM_OWNER_FIRST_NAME || 'Dueño',
            lastName: process.env.PLATFORM_OWNER_LAST_NAME || 'de la Plataforma',
            passwordHash: await bcrypt.hash(password, 12),
            isPlatformAdmin: true,
            isDemo: false,
          },
        });
        this.logger.log(`Dueño de la plataforma creado: ${email}`);
        return;
      }

      const data: Record<string, unknown> = {};
      if (!existing.isPlatformAdmin) data.isPlatformAdmin = true;
      if (!existing.isActive) data.isActive = true;
      if (process.env.PLATFORM_OWNER_RESET_PASSWORD === 'true') {
        data.passwordHash = await bcrypt.hash(password, 12);
        data.refreshTokenHash = null;
      }
      if (Object.keys(data).length) {
        await this.prisma.user.update({ where: { id: existing.id }, data });
        this.logger.warn(`El usuario ${email} ya existía; se actualizó: ${Object.keys(data).join(', ')}.`);
      } else {
        this.logger.log(`Dueño de la plataforma ya existe (${email}); sin cambios.`);
      }
    } catch (err: any) {
      // Nunca debe impedir que la API arranque (p. ej. si las tablas aún no existen).
      this.logger.error(`No se pudo crear el dueño de la plataforma: ${err?.message}`);
    }
  }
}

/**
 * Panel para EL DUEÑO DE LA PLATAFORMA (tú), no para los ISP que se
 * registran. Permite ver todas las organizaciones y sus usuarios, crear
 * cuentas nuevas, y suspenderlas por falta de pago de tu propio servicio
 * SaaS — sin que eso implique operar los datos de sus clientes.
 */
@Injectable()
class PlatformService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
    private auth: AuthService,
    private users: UsersService,
  ) {}

  async listOrganizations() {
    const orgs = await this.prisma.organization.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { customers: true, users: true, routers: true, olts: true } },
        users: {
          where: { roles: { some: { role: { name: 'SUPER_ADMIN' } } } },
          orderBy: { createdAt: 'asc' },
          take: 1,
          select: { email: true, firstName: true, lastName: true },
        },
      },
    });
    return orgs.map((o: any) => ({
      id: o.id,
      name: o.name,
      slug: o.slug,
      plan: o.plan,
      isActive: o.isActive,
      isInternal: o.slug === PLATFORM_ORG_SLUG,
      trialEndsAt: o.trialEndsAt,
      createdAt: o.createdAt,
      customersCount: o._count.customers,
      usersCount: o._count.users,
      routersCount: o._count.routers,
      oltsCount: o._count.olts,
      owner: o.users[0] ?? null,
    }));
  }

  async listUsers() {
    const users = await this.prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        isActive: true,
        isPlatformAdmin: true,
        isDemo: true,
        lastLoginAt: true,
        createdAt: true,
        organization: { select: { id: true, name: true, slug: true } },
        roles: { select: { role: { select: { name: true } } } },
      },
    });
    return users.map((u: any) => ({ ...u, roles: u.roles.map((r: any) => r.role.name as string) }));
  }

  async platformSummary() {
    const [totalOrganizations, activeOrganizations, totalCustomersAcrossAllOrgs, totalUsersAcrossAllOrgs] = await Promise.all([
      this.prisma.organization.count({ where: { slug: { not: PLATFORM_ORG_SLUG } } }),
      this.prisma.organization.count({ where: { isActive: true, slug: { not: PLATFORM_ORG_SLUG } } }),
      this.prisma.customer.count(),
      this.prisma.user.count(),
    ]);
    return { totalOrganizations, activeOrganizations, totalCustomersAcrossAllOrgs, totalUsersAcrossAllOrgs };
  }

  async createOrganization(dto: RegisterOrganizationDto, platformAdminUserId: string) {
    const { organization, userId } = await this.auth.createOrganizationWithOwner(dto);
    await this.audit.log({
      organizationId: organization.id,
      userId: platformAdminUserId,
      action: 'platform.organization_create',
      entityType: 'Organization',
      entityId: organization.id,
      after: { ownerUserId: userId },
    });
    return { id: organization.id, name: organization.name, slug: organization.slug, ownerUserId: userId };
  }

  async createUserInOrganization(organizationId: string, dto: CreateUserDto, platformAdminUserId: string) {
    const org = await this.prisma.organization.findUnique({ where: { id: organizationId } });
    if (!org) throw new NotFoundException('Organización no encontrada');
    // El dueño de la plataforma está por encima de cualquier SUPER_ADMIN de un ISP,
    // por eso puede asignar cualquier rol (incluido SUPER_ADMIN) al dar de alta.
    return this.users.create(organizationId, { userId: platformAdminUserId, roles: ['SUPER_ADMIN'] }, dto);
  }

  async setOrganizationActive(id: string, isActive: boolean, platformAdminUserId: string) {
    const org = await this.prisma.organization.findUnique({ where: { id } });
    if (!org) throw new NotFoundException('Organización no encontrada');
    if (org.slug === PLATFORM_ORG_SLUG && !isActive) {
      throw new BadRequestException('La organización interna de la plataforma no se puede suspender');
    }

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

  @Post('organizations')
  createOrganization(@Body() dto: RegisterOrganizationDto, @Req() req: any) {
    return this.platform.createOrganization(dto, req.user.sub);
  }

  @Post('organizations/:id/users')
  createUser(@Param('id') id: string, @Body() dto: CreateUserDto, @Req() req: any) {
    return this.platform.createUserInOrganization(id, dto, req.user.sub);
  }

  @Get('users')
  listUsers() {
    return this.platform.listUsers();
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
}

@Module({
  imports: [AuthModule, UsersModule],
  controllers: [PlatformController],
  providers: [PlatformService, PlatformBootstrapService, PlatformAdminGuard, PrismaService, AuditService],
})
export class PlatformModule {}
