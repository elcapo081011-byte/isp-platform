import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../common/prisma/prisma.service';
import { AuditService } from '../common/audit/audit.service';
import { ensureDefaultRoles, PRIVILEGED_ROLES } from '../rbac/default-roles';
import { CreateUserDto, UpdateUserDto } from './dto/user.dto';

export interface Actor {
  userId: string;
  roles: string[];
}

const userSelect = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  isActive: true,
  isDemo: true,
  lastLoginAt: true,
  createdAt: true,
  roles: { select: { role: { select: { name: true } } } },
} as const;

function present(u: any) {
  const { roles, ...rest } = u;
  return { ...rest, roles: roles.map((r: any) => r.role.name as string) };
}

/**
 * Usuarios (staff) de UNA organización. Cada consulta lleva `organizationId`
 * del JWT de quien llama, así que un ISP nunca ve ni toca usuarios de otro.
 */
@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService, private audit: AuditService) {}

  async list(organizationId: string) {
    const users = await this.prisma.user.findMany({
      where: { organizationId, isPlatformAdmin: false },
      select: userSelect,
      orderBy: { createdAt: 'asc' },
    });
    return users.map(present);
  }

  /** Roles que quien llama puede asignar (SUPER_ADMIN solo lo asigna otro SUPER_ADMIN). */
  async assignableRoles(actor: Actor) {
    await ensureDefaultRoles(this.prisma);
    const roles = await this.prisma.role.findMany({
      orderBy: { name: 'asc' },
      select: { name: true, description: true, permissions: { select: { permission: { select: { key: true } } } } },
    });
    const isSuper = actor.roles.includes('SUPER_ADMIN');
    return roles
      .filter((r: any) => isSuper || !PRIVILEGED_ROLES.includes(r.name))
      .map((r: any) => ({
        name: r.name,
        description: r.description,
        permissions: r.permissions.map((p: any) => p.permission.key as string),
      }));
  }

  async create(organizationId: string, actor: Actor, dto: CreateUserDto) {
    const role = await this.resolveAssignableRole(actor, dto.role);

    const email = dto.email.trim().toLowerCase();
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) throw new ConflictException('Ya existe un usuario con ese correo');

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const user = await this.prisma.user.create({
      data: {
        organizationId,
        email,
        firstName: dto.firstName,
        lastName: dto.lastName,
        passwordHash,
        roles: { create: { roleId: role.id } },
      },
      select: userSelect,
    });

    await this.audit.log({
      organizationId,
      userId: actor.userId,
      action: 'user.create',
      entityType: 'User',
      entityId: user.id,
      after: { email, role: role.name },
    });
    return present(user);
  }

  async update(organizationId: string, actor: Actor, id: string, dto: UpdateUserDto) {
    const target = await this.prisma.user.findFirst({
      where: { id, organizationId, isPlatformAdmin: false },
      select: userSelect,
    });
    if (!target) throw new NotFoundException('Usuario no encontrado');

    const targetRoles = target.roles.map((r: any) => r.role.name as string);
    const actorIsSuper = actor.roles.includes('SUPER_ADMIN');
    if (targetRoles.some((r) => PRIVILEGED_ROLES.includes(r)) && !actorIsSuper) {
      throw new ForbiddenException('Solo un SUPER_ADMIN puede modificar a otro SUPER_ADMIN');
    }

    const data: Record<string, unknown> = {};
    if (dto.firstName !== undefined) data.firstName = dto.firstName;
    if (dto.lastName !== undefined) data.lastName = dto.lastName;

    if (dto.isActive !== undefined && dto.isActive !== target.isActive) {
      if (!dto.isActive && id === actor.userId) {
        throw new BadRequestException('No puedes desactivar tu propio usuario');
      }
      if (!dto.isActive && targetRoles.includes('SUPER_ADMIN')) await this.assertNotLastSuperAdmin(organizationId, id);
      data.isActive = dto.isActive;
      if (!dto.isActive) data.refreshTokenHash = null; // cierra su sesión renovable
    }

    let newRoleId: string | null = null;
    if (dto.role !== undefined && !(targetRoles.length === 1 && targetRoles[0] === dto.role)) {
      const role = await this.resolveAssignableRole(actor, dto.role);
      if (targetRoles.includes('SUPER_ADMIN') && role.name !== 'SUPER_ADMIN') {
        await this.assertNotLastSuperAdmin(organizationId, id);
      }
      newRoleId = role.id;
    }

    if (dto.password) {
      data.passwordHash = await bcrypt.hash(dto.password, 12);
      data.refreshTokenHash = null;
    }

    await this.prisma.$transaction(async (tx) => {
      if (Object.keys(data).length) await tx.user.update({ where: { id }, data });
      if (newRoleId) {
        await tx.userRole.deleteMany({ where: { userId: id } });
        await tx.userRole.create({ data: { userId: id, roleId: newRoleId } });
      }
    });

    await this.audit.log({
      organizationId,
      userId: actor.userId,
      action: 'user.update',
      entityType: 'User',
      entityId: id,
      // Nunca se registra la contraseña, solo el hecho de que cambió.
      after: { ...dto, password: dto.password ? '[cambiada]' : undefined },
    });

    const fresh = await this.prisma.user.findUniqueOrThrow({ where: { id }, select: userSelect });
    return present(fresh);
  }

  private async resolveAssignableRole(actor: Actor, roleName: string) {
    await ensureDefaultRoles(this.prisma);
    const role = await this.prisma.role.findUnique({ where: { name: roleName } });
    if (!role) throw new BadRequestException(`El rol "${roleName}" no existe`);
    if (PRIVILEGED_ROLES.includes(role.name) && !actor.roles.includes('SUPER_ADMIN')) {
      throw new ForbiddenException('Solo un SUPER_ADMIN puede asignar el rol SUPER_ADMIN');
    }
    return role;
  }

  private async assertNotLastSuperAdmin(organizationId: string, excludingUserId: string) {
    const others = await this.prisma.user.count({
      where: {
        organizationId,
        isActive: true,
        id: { not: excludingUserId },
        roles: { some: { role: { name: 'SUPER_ADMIN' } } },
      },
    });
    if (others === 0) {
      throw new BadRequestException('La cuenta debe conservar al menos un SUPER_ADMIN activo');
    }
  }
}
