import { NotFoundException } from '@nestjs/common';
import { MikrotikService } from './mikrotik.service';

describe('MikrotikService — aislamiento multi-tenant', () => {
  let prisma: any;
  let service: MikrotikService;

  beforeEach(() => {
    prisma = {
      router: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
    };
    const audit = { log: jest.fn() };
    const crypto = { encrypt: jest.fn((v: string) => `enc:${v}`), decrypt: jest.fn() };
    const provider = { checkConnection: jest.fn() };
    service = new MikrotikService(prisma, audit as any, crypto as any, provider as any);
  });

  it('list() solo consulta routers de la organización del usuario', async () => {
    prisma.router.findMany.mockResolvedValue([]);
    await service.list('org-A');
    expect(prisma.router.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { organizationId: 'org-A' } }),
    );
  });

  it('un usuario de la organización B NO puede leer un router de la organización A', async () => {
    // El router existe en la base, pero pertenece a otra organización —
    // findFirst con el filtro organizationId debe devolver null.
    prisma.router.findFirst.mockResolvedValue(null);
    await expect(service.checkConnection('router-de-org-A', 'org-B')).rejects.toThrow(NotFoundException);
    expect(prisma.router.findFirst).toHaveBeenCalledWith({ where: { id: 'router-de-org-A', organizationId: 'org-B' } });
  });

  it('create() guarda el router encriptado con la credencial y lo asocia a la organización correcta', async () => {
    prisma.router.create.mockResolvedValue({
      id: 'r1', organizationId: 'org-A', name: 'Router 1', host: '10.0.0.1',
      encryptedPassword: 'enc:secreto',
    });
    const result = await service.create('org-A', { name: 'Router 1', host: '10.0.0.1', username: 'admin', password: 'secreto' }, 'user-1');
    expect(prisma.router.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ organizationId: 'org-A', encryptedPassword: 'enc:secreto' }) }),
    );
    expect(result).not.toHaveProperty('encryptedPassword');
  });
});
