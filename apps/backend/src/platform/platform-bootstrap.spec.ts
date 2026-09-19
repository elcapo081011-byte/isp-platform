import { PlatformBootstrapService } from './platform.module';

describe('PlatformBootstrapService (dueño de la plataforma)', () => {
  const ENV = { ...process.env };
  let prisma: any;

  beforeEach(() => {
    process.env = { ...ENV };
    delete process.env.PLATFORM_OWNER_EMAIL;
    delete process.env.PLATFORM_OWNER_PASSWORD;
    delete process.env.PLATFORM_OWNER_RESET_PASSWORD;
    prisma = {
      organization: { upsert: jest.fn().mockResolvedValue({ id: 'org-platform' }) },
      user: { findUnique: jest.fn().mockResolvedValue(null), create: jest.fn(), update: jest.fn() },
      permission: { upsert: jest.fn(), findMany: jest.fn().mockResolvedValue([]) },
      role: { upsert: jest.fn().mockResolvedValue({ id: 'r' }) },
      rolePermission: { upsert: jest.fn() },
    };
  });
  afterAll(() => { process.env = ENV; });

  it('no hace nada si no hay variables configuradas', async () => {
    await new PlatformBootstrapService(prisma).onApplicationBootstrap();
    expect(prisma.user.create).not.toHaveBeenCalled();
  });

  it('rechaza una contraseña corta', async () => {
    process.env.PLATFORM_OWNER_EMAIL = 'yo@mi.com';
    process.env.PLATFORM_OWNER_PASSWORD = 'corta';
    await new PlatformBootstrapService(prisma).onApplicationBootstrap();
    expect(prisma.user.create).not.toHaveBeenCalled();
  });

  it('crea el dueño con isPlatformAdmin y sin marcarlo demo', async () => {
    process.env.PLATFORM_OWNER_EMAIL = 'Yo@Mi.com';
    process.env.PLATFORM_OWNER_PASSWORD = 'una-clave-bien-larga';
    await new PlatformBootstrapService(prisma).onApplicationBootstrap();
    const data = prisma.user.create.mock.calls[0][0].data;
    expect(data).toMatchObject({ email: 'yo@mi.com', isPlatformAdmin: true, isDemo: false, organizationId: 'org-platform' });
    expect(data.passwordHash).not.toContain('una-clave-bien-larga');
  });

  it('si el usuario ya existe NO le pisa la contraseña (salvo RESET explícito)', async () => {
    process.env.PLATFORM_OWNER_EMAIL = 'yo@mi.com';
    process.env.PLATFORM_OWNER_PASSWORD = 'una-clave-bien-larga';
    prisma.user.findUnique.mockResolvedValue({ id: 'u1', isPlatformAdmin: true, isActive: true });
    await new PlatformBootstrapService(prisma).onApplicationBootstrap();
    expect(prisma.user.update).not.toHaveBeenCalled();

    process.env.PLATFORM_OWNER_RESET_PASSWORD = 'true';
    await new PlatformBootstrapService(prisma).onApplicationBootstrap();
    expect(prisma.user.update.mock.calls[0][0].data.passwordHash).toBeDefined();
  });

  it('promueve a dueño a un usuario existente que no lo era', async () => {
    process.env.PLATFORM_OWNER_EMAIL = 'yo@mi.com';
    process.env.PLATFORM_OWNER_PASSWORD = 'una-clave-bien-larga';
    prisma.user.findUnique.mockResolvedValue({ id: 'u1', isPlatformAdmin: false, isActive: true });
    await new PlatformBootstrapService(prisma).onApplicationBootstrap();
    expect(prisma.user.update.mock.calls[0][0].data.isPlatformAdmin).toBe(true);
  });

  it('un error de base de datos no tumba el arranque', async () => {
    process.env.PLATFORM_OWNER_EMAIL = 'yo@mi.com';
    process.env.PLATFORM_OWNER_PASSWORD = 'una-clave-bien-larga';
    prisma.organization.upsert.mockRejectedValue(new Error('tabla no existe'));
    await expect(new PlatformBootstrapService(prisma).onApplicationBootstrap()).resolves.toBeUndefined();
  });
});
