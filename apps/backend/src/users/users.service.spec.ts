import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { UsersService } from './users.service';

const ROLE_IDS: Record<string, string> = { SUPER_ADMIN: 'r-super', ADMIN: 'r-admin', TECNICO: 'r-tec' };

function makeUser(over: any = {}) {
  return {
    id: 'u-2',
    email: 'x@isp.com',
    firstName: 'X',
    lastName: 'Y',
    isActive: true,
    isDemo: false,
    lastLoginAt: null,
    createdAt: new Date(),
    roles: [{ role: { name: 'TECNICO' } }],
    ...over,
  };
}

describe('UsersService', () => {
  let prisma: any;
  let audit: any;
  let service: UsersService;
  const orgAdmin = { userId: 'u-admin', roles: ['ADMIN'] };
  const orgSuper = { userId: 'u-super', roles: ['SUPER_ADMIN'] };

  beforeEach(() => {
    const tx: any = {
      user: { update: jest.fn() },
      userRole: { deleteMany: jest.fn(), create: jest.fn() },
    };
    prisma = {
      user: {
        findMany: jest.fn().mockResolvedValue([]),
        findFirst: jest.fn(),
        findUnique: jest.fn().mockResolvedValue(null),
        findUniqueOrThrow: jest.fn().mockResolvedValue(makeUser()),
        create: jest.fn().mockImplementation(async ({ data }: any) => makeUser({ email: data.email })),
        count: jest.fn().mockResolvedValue(1),
      },
      role: {
        findUnique: jest.fn().mockImplementation(async ({ where }: any) =>
          ROLE_IDS[where.name] ? { id: ROLE_IDS[where.name], name: where.name } : null),
        findMany: jest.fn().mockResolvedValue([]),
        upsert: jest.fn().mockResolvedValue({ id: 'r' }),
      },
      permission: { upsert: jest.fn(), findMany: jest.fn().mockResolvedValue([]) },
      rolePermission: { upsert: jest.fn() },
      $transaction: jest.fn().mockImplementation(async (fn: any) => fn(tx)),
      _tx: tx,
    };
    audit = { log: jest.fn() };
    service = new UsersService(prisma, audit);
  });

  it('lista solo usuarios de la organización de quien llama (nunca platform admins)', async () => {
    await service.list('org-1');
    expect(prisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { organizationId: 'org-1', isPlatformAdmin: false } }),
    );
  });

  it('crea el usuario dentro de la organización del JWT, con correo en minúsculas', async () => {
    await service.create('org-1', orgAdmin, {
      email: 'Nuevo@ISP.com', firstName: 'Nu', lastName: 'Evo', password: 'password123', role: 'TECNICO',
    });
    const data = prisma.user.create.mock.calls[0][0].data;
    expect(data.organizationId).toBe('org-1');
    expect(data.email).toBe('nuevo@isp.com');
    expect(data.passwordHash).not.toBe('password123');
    expect(audit.log).toHaveBeenCalled();
  });

  it('rechaza un correo ya registrado', async () => {
    prisma.user.findUnique.mockResolvedValue(makeUser());
    await expect(
      service.create('org-1', orgAdmin, { email: 'x@isp.com', firstName: 'a', lastName: 'b', password: 'password123', role: 'TECNICO' }),
    ).rejects.toThrow(ConflictException);
  });

  it('un ADMIN no puede crear un SUPER_ADMIN (escalada de privilegios)', async () => {
    await expect(
      service.create('org-1', orgAdmin, { email: 'a@b.com', firstName: 'a', lastName: 'b', password: 'password123', role: 'SUPER_ADMIN' }),
    ).rejects.toThrow(ForbiddenException);
    expect(prisma.user.create).not.toHaveBeenCalled();
  });

  it('un SUPER_ADMIN sí puede crear otro SUPER_ADMIN', async () => {
    await service.create('org-1', orgSuper, { email: 'a@b.com', firstName: 'a', lastName: 'b', password: 'password123', role: 'SUPER_ADMIN' });
    expect(prisma.user.create).toHaveBeenCalled();
  });

  it('rechaza un rol inexistente', async () => {
    await expect(
      service.create('org-1', orgSuper, { email: 'a@b.com', firstName: 'a', lastName: 'b', password: 'password123', role: 'INVENTADO' }),
    ).rejects.toThrow(BadRequestException);
  });

  it('no encuentra (404) a un usuario de otra organización', async () => {
    prisma.user.findFirst.mockResolvedValue(null);
    await expect(service.update('org-1', orgSuper, 'u-de-otra-org', { firstName: 'Hack' })).rejects.toThrow(NotFoundException);
    expect(prisma.user.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'u-de-otra-org', organizationId: 'org-1', isPlatformAdmin: false } }),
    );
  });

  it('no permite desactivarse a uno mismo', async () => {
    prisma.user.findFirst.mockResolvedValue(makeUser({ id: 'u-super', roles: [{ role: { name: 'ADMIN' } }] }));
    await expect(service.update('org-1', orgSuper, 'u-super', { isActive: false })).rejects.toThrow(BadRequestException);
  });

  it('un ADMIN no puede modificar a un SUPER_ADMIN', async () => {
    prisma.user.findFirst.mockResolvedValue(makeUser({ roles: [{ role: { name: 'SUPER_ADMIN' } }] }));
    await expect(service.update('org-1', orgAdmin, 'u-2', { firstName: 'X' })).rejects.toThrow(ForbiddenException);
  });

  it('no permite dejar la cuenta sin ningún SUPER_ADMIN activo', async () => {
    prisma.user.findFirst.mockResolvedValue(makeUser({ roles: [{ role: { name: 'SUPER_ADMIN' } }] }));
    prisma.user.count.mockResolvedValue(0); // no hay otros super admins activos
    await expect(service.update('org-1', orgSuper, 'u-2', { role: 'ADMIN' })).rejects.toThrow(BadRequestException);
    await expect(service.update('org-1', orgSuper, 'u-2', { isActive: false })).rejects.toThrow(BadRequestException);
  });

  it('cambiar contraseña o desactivar cierra las sesiones renovables', async () => {
    prisma.user.findFirst.mockResolvedValue(makeUser());
    await service.update('org-1', orgAdmin, 'u-2', { password: 'nuevaclave123', isActive: false });
    const data = prisma._tx.user.update.mock.calls[0][0].data;
    expect(data.refreshTokenHash).toBeNull();
    expect(data.passwordHash).toBeDefined();
    // La contraseña nunca llega al log de auditoría.
    expect(JSON.stringify(audit.log.mock.calls[0][0])).not.toContain('nuevaclave123');
  });
});
