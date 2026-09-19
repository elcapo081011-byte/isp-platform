import { BadRequestException, ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../common/prisma/prisma.service';
import { AuditService } from '../common/audit/audit.service';
import { RegisterOrganizationDto } from './dto/register-organization.dto';

const ACCESS_TOKEN_TTL = '15m';
const REFRESH_TOKEN_TTL = '7d';

// Catálogo mínimo replicado del seed para poder crear roles al vuelo cuando
// se registra una organización nueva (no depende de que el seed haya corrido).
const DEFAULT_PERMISSIONS: { key: string; module: string; description: string }[] = [
  { key: 'clients.view', module: 'clients', description: 'Ver clientes' },
  { key: 'clients.create', module: 'clients', description: 'Crear clientes' },
  { key: 'clients.edit', module: 'clients', description: 'Editar clientes' },
  { key: 'clients.delete', module: 'clients', description: 'Eliminar clientes' },
  { key: 'plans.view', module: 'plans', description: 'Ver planes' },
  { key: 'plans.manage', module: 'plans', description: 'Administrar planes' },
  { key: 'billing.view', module: 'billing', description: 'Ver facturación' },
  { key: 'billing.create', module: 'billing', description: 'Crear facturas' },
  { key: 'billing.edit', module: 'billing', description: 'Editar facturación' },
  { key: 'mikrotik.view', module: 'mikrotik', description: 'Ver MikroTik' },
  { key: 'mikrotik.manage', module: 'mikrotik', description: 'Administrar MikroTik' },
  { key: 'olt.view', module: 'olt', description: 'Ver OLT' },
  { key: 'olt.manage', module: 'olt', description: 'Administrar OLT' },
  { key: 'onu.view', module: 'onu', description: 'Ver ONU/ONT' },
  { key: 'onu.manage', module: 'onu', description: 'Administrar ONU/ONT' },
  { key: 'inventory.view', module: 'inventory', description: 'Ver inventario' },
  { key: 'inventory.manage', module: 'inventory', description: 'Administrar inventario' },
  { key: 'tickets.view', module: 'tickets', description: 'Ver tickets' },
  { key: 'tickets.manage', module: 'tickets', description: 'Administrar tickets' },
  { key: 'users.manage', module: 'users', description: 'Administrar usuarios y roles' },
  { key: 'settings.manage', module: 'settings', description: 'Administrar configuración' },
  { key: 'audit.view', module: 'audit', description: 'Ver auditoría' },
];

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private audit: AuditService,
  ) {}

  /**
   * Alta de una nueva organización (ISP) en la plataforma — el equivalente
   * al "Crear cuenta" público de WispHub. Crea la Organization, sus permisos
   * y el rol SUPER_ADMIN, y el primer usuario que administrará esa cuenta.
   * Cada organización queda completamente aislada de las demás.
   */
  async registerOrganization(dto: RegisterOrganizationDto) {
    const slug = dto.slug.toLowerCase().replace(/[^a-z0-9-]/g, '-');

    const [existingOrg, existingUser] = await Promise.all([
      this.prisma.organization.findUnique({ where: { slug } }),
      this.prisma.user.findUnique({ where: { email: dto.email } }),
    ]);
    if (existingOrg) throw new ConflictException('Ese identificador de empresa ya está en uso');
    if (existingUser) throw new ConflictException('Ya existe una cuenta con ese correo');

    const passwordHash = await bcrypt.hash(dto.password, 12);

    const result = await this.prisma.$transaction(async (tx) => {
      const trialEndsAt = new Date();
      trialEndsAt.setDate(trialEndsAt.getDate() + 30);

      const organization = await tx.organization.create({
        data: { name: dto.organizationName, slug, trialEndsAt },
      });

      // Permisos y rol SUPER_ADMIN son globales al motor (no por organización),
      // se aseguran de existir sin duplicar si ya los creó el seed.
      for (const perm of DEFAULT_PERMISSIONS) {
        await tx.permission.upsert({ where: { key: perm.key }, update: {}, create: perm });
      }
      const superAdminRole = await tx.role.upsert({
        where: { name: 'SUPER_ADMIN' },
        update: {},
        create: { name: 'SUPER_ADMIN', description: 'Acceso total a la cuenta', isSystem: true },
      });
      const allPermissions = await tx.permission.findMany();
      for (const permission of allPermissions) {
        await tx.rolePermission.upsert({
          where: { roleId_permissionId: { roleId: superAdminRole.id, permissionId: permission.id } },
          update: {},
          create: { roleId: superAdminRole.id, permissionId: permission.id },
        });
      }

      const user = await tx.user.create({
        data: {
          organizationId: organization.id,
          email: dto.email,
          firstName: dto.firstName,
          lastName: dto.lastName,
          passwordHash,
          roles: { create: { roleId: superAdminRole.id } },
        },
      });

      return { organization, userId: user.id };
    });

    const fullUser = await this.prisma.user.findUniqueOrThrow({
      where: { id: result.userId },
      include: { roles: { include: { role: { include: { permissions: { include: { permission: true } } } } } } },
    });

    return this.login(fullUser);
  }

  async validateUser(email: string, password: string) {
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: {
        organization: true,
        roles: { include: { role: { include: { permissions: { include: { permission: true } } } } } },
      },
    });

    // Mensaje idéntico para email inexistente o password incorrecta: evita
    // enumeración de usuarios.
    if (!user || !user.isActive) {
      throw new UnauthorizedException('Credenciales inválidas');
    }
    if (!user.organization.isActive) {
      throw new UnauthorizedException('Esta cuenta ha sido desactivada. Contacta a soporte.');
    }

    const passwordMatches = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatches) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    return user;
  }

  async login(user: any, ipAddress?: string) {
    const permissions = Array.from(
      new Set(
        user.roles.flatMap((ur: any) => ur.role.permissions.map((rp: any) => rp.permission.key as string)),
      ),
    );
    const roleNames = user.roles.map((ur: any) => ur.role.name as string);

    const payload = {
      sub: user.id,
      email: user.email,
      organizationId: user.organizationId,
      isPlatformAdmin: user.isPlatformAdmin ?? false,
      roles: roleNames,
      permissions,
    };

    const accessToken = this.jwt.sign(payload, { expiresIn: ACCESS_TOKEN_TTL });
    const refreshToken = this.jwt.sign({ sub: user.id, type: 'refresh' }, { expiresIn: REFRESH_TOKEN_TTL });

    const refreshTokenHash = await bcrypt.hash(refreshToken, 10);
    await this.prisma.user.update({
      where: { id: user.id },
      data: { refreshTokenHash, lastLoginAt: new Date() },
    });

    await this.audit.log({
      organizationId: user.organizationId,
      userId: user.id,
      action: 'auth.login',
      entityType: 'User',
      entityId: user.id,
      ipAddress,
    });

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        organizationId: user.organizationId,
        isPlatformAdmin: user.isPlatformAdmin ?? false,
        roles: roleNames,
        permissions,
      },
    };
  }

  async refresh(refreshToken: string) {
    let decoded: any;
    try {
      decoded = this.jwt.verify(refreshToken);
    } catch {
      throw new UnauthorizedException('Refresh token inválido o expirado');
    }
    if (decoded.type !== 'refresh') throw new UnauthorizedException('Token inválido');

    const user = await this.prisma.user.findUnique({
      where: { id: decoded.sub },
      include: { roles: { include: { role: { include: { permissions: { include: { permission: true } } } } } } },
    });
    if (!user || !user.refreshTokenHash) throw new UnauthorizedException('Sesión inválida');

    const matches = await bcrypt.compare(refreshToken, user.refreshTokenHash);
    if (!matches) throw new UnauthorizedException('Sesión inválida');

    // Rotación: se emite un nuevo par y se invalida el anterior.
    return this.login(user);
  }

  async logout(userId: string) {
    await this.prisma.user.update({ where: { id: userId }, data: { refreshTokenHash: null } });
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const matches = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!matches) throw new UnauthorizedException('La contraseña actual no es correcta.');

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await this.prisma.user.update({ where: { id: userId }, data: { passwordHash, refreshTokenHash: null } });
    await this.audit.log({ organizationId: user.organizationId, userId, action: 'auth.change_password', entityType: 'User', entityId: userId });

    return { message: 'Contraseña actualizada. Vuelve a iniciar sesión.' };
  }
}
