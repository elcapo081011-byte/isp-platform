import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  const mockUser = {
    id: 'user-1',
    email: 'admin@demo.isp',
    organizationId: 'org-1',
    isActive: true,
    isPlatformAdmin: false,
    passwordHash: '',
    organization: { id: 'org-1', isActive: true },
    roles: [{ role: { name: 'ADMIN', permissions: [{ permission: { key: 'clients.view' } }] } }],
  };

  let prisma: any;
  let jwt: JwtService;
  let audit: any;
  let service: AuthService;

  beforeAll(async () => {
    mockUser.passwordHash = await bcrypt.hash('ChangeMe123!', 4);
  });

  beforeEach(() => {
    prisma = {
      user: { findUnique: jest.fn(), update: jest.fn() },
      organization: { findUnique: jest.fn() },
    };
    audit = { log: jest.fn() };
    jwt = new JwtService({ secret: 'test-secret' });
    service = new AuthService(prisma, jwt, audit);
  });

  it('rechaza credenciales cuando el usuario no existe', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    await expect(service.validateUser('nadie@demo.isp', 'x')).rejects.toThrow(UnauthorizedException);
  });

  it('rechaza credenciales cuando la contraseña no coincide', async () => {
    prisma.user.findUnique.mockResolvedValue(mockUser);
    await expect(service.validateUser(mockUser.email, 'incorrecta')).rejects.toThrow(UnauthorizedException);
  });

  it('rechaza el login si la organización fue desactivada', async () => {
    prisma.user.findUnique.mockResolvedValue({ ...mockUser, organization: { id: 'org-1', isActive: false } });
    await expect(service.validateUser(mockUser.email, 'ChangeMe123!')).rejects.toThrow(UnauthorizedException);
  });

  it('valida correctamente con contraseña correcta', async () => {
    prisma.user.findUnique.mockResolvedValue(mockUser);
    const result = await service.validateUser(mockUser.email, 'ChangeMe123!');
    expect(result.email).toBe(mockUser.email);
  });

  it('emite accessToken y refreshToken con organizationId y permisos del usuario', async () => {
    prisma.user.update.mockResolvedValue({});
    const result = await service.login(mockUser);
    expect(result.accessToken).toBeDefined();
    expect(result.refreshToken).toBeDefined();
    expect(result.user.organizationId).toBe('org-1');
    expect(result.user.permissions).toContain('clients.view');
    expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({ organizationId: 'org-1' }));
  });
});
