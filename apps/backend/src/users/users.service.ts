import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../common/prisma/prisma.service';
import { AuditService } from '../common/audit/audit.service';

// Catálogo mínimo de roles asignables, replicado del seed (mismo criterio que
// DEFAULT_PERMISSIONS en auth.service.ts): así funciona aunque `npm run seed`
// nunca se haya corrido, porque Role es una tabla global del motor.
const ASSIGNABLE_ROLES: { name: string; description: string }[] = [
  { name: 'SUPER_ADMIN', description: 'Acceso total a la cuenta' },
  { name: 'ADMIN', description: 'Administración operativa del ISP' },
  { name: 'SOPORTE', description: 'Atención al cliente y tickets' },
  { name: 'TECNICO', description: 'Técnicos de campo' },
  { name: 'FACTURACION', description: 'Gestión de cobros' },
  { name: 'MONITORING', description: 'Solo lectura de estado de red' },
];

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService, private audit: AuditService) {}

  private async ensureRolesExist() {
    for (const r of ASSIGNABLE_ROLES) {
      await this.prisma.role.upsert({
        where: { name: r.name },
        update: {},
        create: { name: r.name, description: r.description, isSystem: true },
      });
    }
  }

  async listRoles() {
    await this.ensureRolesExist();
    return this.prisma.role.findMany({ where: { name: { in: ASSIGNABLE_ROLES.map((r) => r.name) } }, orderBy: { name: 'asc' } });
  }

  async list(organizationId: string) {
    const users = await this.prisma.user.findMany({
      where: { organizationId },
      include: { roles: { include: { role: true } } },
      orderBy: { createdAt: 'asc' },
    });
    return users.map((u) => ({
      id: u.id,
      firstName: u.firstName,
      lastName: u.lastName,
      email: u.email,
      isActive: u.isActive,
      lastLoginAt: u.lastLoginAt,
      createdAt: u.createdAt,
      roles: u.roles.map((ur) => ur.role.name),
    }));
  }

  async create(organizationId: string, dto: { firstName: string; lastName: string; email: string; password: string; roleIds: string[] }, actingUserId: string) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) throw new ConflictException('Ya existe un usuario con ese correo.');
    if (!dto.roleIds?.length) throw new BadRequestException('Selecciona al menos un rol para el nuevo usuario.');

    await this.ensureRolesExist();
    const passwordHash = await bcrypt.hash(dto.password, 12);

    const user = await this.prisma.user.create({
      data: {
        organizationId,
        firstName: dto.firstName,
        lastName: dto.lastName,
        email: dto.email,
        passwordHash,
        roles: { create: dto.roleIds.map((roleId) => ({ roleId })) },
      },
      include: { roles: { include: { role: true } } },
    });

    await this.audit.log({
      organizationId,
      userId: actingUserId,
      action: 'user.create',
      entityType: 'User',
      entityId: user.id,
      after: { email: user.email, roles: user.roles.map((r) => r.role.name) },
    });

    return { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName, roles: user.roles.map((r) => r.role.name) };
  }

  async setActive(organizationId: string, userId: string, isActive: boolean, actingUserId: string) {
    if (userId === actingUserId && !isActive) {
      throw new BadRequestException('No puedes desactivar tu propio usuario.');
    }
    const user = await this.prisma.user.findFirst({ where: { id: userId, organizationId } });
    if (!user) throw new NotFoundException('Usuario no encontrado en tu organización.');

    const updated = await this.prisma.user.update({ where: { id: userId }, data: { isActive } });
    await this.audit.log({
      organizationId,
      userId: actingUserId,
      action: isActive ? 'user.activate' : 'user.deactivate',
      entityType: 'User',
      entityId: userId,
    });
    return updated;
  }

  async updateRoles(organizationId: string, userId: string, roleIds: string[], actingUserId: string) {
    const user = await this.prisma.user.findFirst({ where: { id: userId, organizationId } });
    if (!user) throw new NotFoundException('Usuario no encontrado en tu organización.');
    if (!roleIds.length) throw new BadRequestException('El usuario necesita al menos un rol.');

    await this.prisma.$transaction([
      this.prisma.userRole.deleteMany({ where: { userId } }),
      this.prisma.userRole.createMany({ data: roleIds.map((roleId) => ({ userId, roleId })) }),
    ]);

    await this.audit.log({
      organizationId,
      userId: actingUserId,
      action: 'user.update_roles',
      entityType: 'User',
      entityId: userId,
      after: { roleIds },
    });

    return this.prisma.user.findUnique({ where: { id: userId }, include: { roles: { include: { role: true } } } });
  }
}
