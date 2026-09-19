import { ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';

describe('AuthService.createOrganizationWithOwner', () => {
  let prisma: any;
  let service: AuthService;
  const dto = { organizationName: 'Fibra X', slug: 'fibrax', firstName: 'Ana', lastName: 'Ruiz', email: 'Ana@Fibrax.com', password: 'password123' };

  beforeEach(() => {
    const tx = {
      organization: { create: jest.fn().mockResolvedValue({ id: 'org-new', slug: 'fibrax' }) },
      user: { create: jest.fn().mockResolvedValue({ id: 'user-new' }) },
    };
    prisma = {
      organization: { findUnique: jest.fn().mockResolvedValue(null) },
      user: { findUnique: jest.fn().mockResolvedValue(null) },
      permission: { upsert: jest.fn(), findMany: jest.fn().mockResolvedValue([]) },
      role: { upsert: jest.fn().mockResolvedValue({ id: 'r' }), findUniqueOrThrow: jest.fn().mockResolvedValue({ id: 'role-super' }) },
      rolePermission: { upsert: jest.fn() },
      $transaction: jest.fn().mockImplementation(async (fn: any) => fn(tx)),
      _tx: tx,
    };
    service = new AuthService(prisma, new JwtService({ secret: 't' }), { log: jest.fn() } as any);
  });

  it('no deja registrar el identificador reservado "platform"', async () => {
    await expect(service.createOrganizationWithOwner({ ...dto, slug: 'Platform' })).rejects.toThrow(ConflictException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('crea la organización y su dueño SUPER_ADMIN, sin nunca marcarlo como platform admin', async () => {
    await service.createOrganizationWithOwner(dto);
    const userData = prisma._tx.user.create.mock.calls[0][0].data;
    expect(userData.email).toBe('ana@fibrax.com');
    expect(userData.roles).toEqual({ create: { roleId: 'role-super' } });
    expect(userData.isPlatformAdmin).toBeUndefined();
  });

  it('rechaza un correo que ya existe', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 'x' });
    await expect(service.createOrganizationWithOwner(dto)).rejects.toThrow(ConflictException);
  });
});
