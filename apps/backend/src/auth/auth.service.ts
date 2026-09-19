import { BadRequestException, ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../common/prisma/prisma.service';
import { AuditService } from '../common/audit/audit.service';
import { RegisterOrganizationDto } from './dto/register-organization.dto';
import { ensureDefaultRoles } from '../rbac/default-roles';

// Identificadores que un ISP no puede reclamar en el registro público.
export const RESERVED_SLUGS = ['platform', 'admin', 'api', 'www', 'app', 'root', 'system'];

const ACCESS_TOKEN_TTL = '15m';
const REFRESH_TOKEN_TTL = '7d';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private audit: AuditService,
  ) {}

  /**
   * Crea la Organización (ISP) y su primer usuario dueño (rol SUPER_ADMIN).
   * Lo usan el registro público y el panel de la plataforma. No inicia sesión.
   */
  async createOrganizationWithOwner(dto: RegisterOrganizationDto) {
    const slug = dto.slug.toLowerCase().replace(/[^a-z0-9-]/g, '-');
    if (RESERVED_SLUGS.includes(slug)) {
      throw new ConflictException('Ese identificador de empresa está reservado, elige otro');
    }

    const email = dto.email.trim().toLowerCase();
    const [existingOrg, existingUser] = await Promise.all([
      this.prisma.organization.findUnique({ where: { slug } }),
      this.prisma.user.findUnique({ where: { email } }),
    ]);
    if (existingOrg) throw new ConflictException('Ese identificador de empresa ya está en uso');
    if (existingUser) throw new ConflictException('Ya existe una cuenta con ese correo');

    const passwordHash = await bcrypt.hash(dto.password, 12);

    // Permisos y roles son globales al motor. Se aseguran FUERA de la
    // transacción (son muchos upserts idempotentes) para no agotar su timeout.
    await ensureDefaultRoles(this.prisma);
    const superAdminRole = await this.prisma.role.findUniqueOrThrow({ where: { name: 'SUPER_ADMIN' } });

    return this.prisma.$transaction(async (tx) => {
      const trialEndsAt = new Date();
      trialEndsAt.setDate(trialEndsAt.getDate() + 30);

      const organization = await tx.organization.create({
        data: { name: dto.organizationName, slug, trialEndsAt },
      });
      const user = await tx.user.create({
        data: {
          organizationId: organization.id,
          email,
          firstName: dto.firstName,
          lastName: dto.lastName,
          passwordHash,
          roles: { create: { roleId: superAdminRole.id } },
        },
      });
      return { organization, userId: user.id };
    });
  }

  /**
   * Alta pública de una nueva cuenta de ISP — el equivalente al "Crear
   * cuenta" de WispHub. Cada organización queda completamente aislada.
   */
  async registerOrganization(dto: RegisterOrganizationDto) {
    const result = await this.createOrganizationWithOwner(dto);

    const fullUser = await this.prisma.user.findUniqueOrThrow({
      where: { id: result.userId },
      include: { roles: { include: { role: { include: { permissions: { include: { permission: true } } } } } } },
    });

    return this.login(fullUser);
  }

  async validateUser(email: string, password: string) {
    const user = await this.prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
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
}
