import { BadRequestException, NotFoundException } from '@nestjs/common';
import { RouterApiHooksService } from './router-api-hooks.service';

const ORG = 'org-A';

function setup() {
  const prisma: any = {
    router: { findFirst: jest.fn().mockResolvedValue({ id: 'r1', name: 'Torre', organizationId: ORG }) },
    routerApiHook: {
      findFirst: jest.fn().mockResolvedValue({ id: 'h1', routerId: 'r1', organizationId: ORG, url: 'https://crm.mi.com/h', events: ['customer.created'], encryptedSecret: 'enc:s' }),
      findMany: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
      create: jest.fn().mockImplementation(async ({ data }: any) => ({ id: 'h-new', ...data })),
      update: jest.fn().mockImplementation(async ({ data }: any) => ({ id: 'h1', ...data })),
      delete: jest.fn(),
    },
    customer: { findFirst: jest.fn() },
  };
  const audit = { log: jest.fn() };
  const crypto = { encrypt: jest.fn((v: string) => `enc:${v}`), decrypt: jest.fn((v: string) => v.replace(/^enc:/, '')) };
  const service = new RouterApiHooksService(prisma, audit as any, crypto as any);
  service.sender = jest.fn().mockResolvedValue({ status: 200 }) as any;
  return { prisma, audit, crypto, service };
}

const dto = { platform: 'Mi CRM', url: 'https://crm.mi.com/hook', events: ['customer.created', 'customer.suspended'] as any };

describe('RouterApiHooksService', () => {
  describe('aislamiento y validación', () => {
    it('no toca routers de otra cuenta', async () => {
      const { prisma, service } = setup();
      prisma.router.findFirst.mockResolvedValue(null);
      await expect(service.list('r-ajeno', 'org-B')).rejects.toThrow(NotFoundException);
      await expect(service.create('r-ajeno', 'org-B', dto, 'u1')).rejects.toThrow(NotFoundException);
      expect(prisma.router.findFirst).toHaveBeenCalledWith({ where: { id: 'r-ajeno', organizationId: 'org-B' } });
      expect(prisma.routerApiHook.create).not.toHaveBeenCalled();
    });

    it('un hook se busca siempre por router Y organización', async () => {
      const { prisma, service } = setup();
      prisma.routerApiHook.findFirst.mockResolvedValue(null);
      await expect(service.remove('r1', 'h-de-otro', ORG, 'u1')).rejects.toThrow(NotFoundException);
      expect(prisma.routerApiHook.findFirst).toHaveBeenCalledWith({ where: { id: 'h-de-otro', routerId: 'r1', organizationId: ORG } });
      expect(prisma.routerApiHook.delete).not.toHaveBeenCalled();
    });

    it.each([
      'http://crm.mi.com/x', 'https://127.0.0.1/x', 'https://169.254.169.254/latest', 'https://localhost/x',
      'https://10.0.0.5/x', 'https://crm.mi.com:5432/x',
    ])('rechaza la URL insegura %s al guardar', async (url) => {
      const { prisma, service } = setup();
      await expect(service.create('r1', ORG, { ...dto, url }, 'u1')).rejects.toThrow(BadRequestException);
      expect(prisma.routerApiHook.create).not.toHaveBeenCalled();
    });

    it('al editar también valida la URL nueva', async () => {
      const { service } = setup();
      await expect(service.update('r1', 'h1', ORG, { url: 'https://192.168.1.10/x' }, 'u1')).rejects.toThrow(BadRequestException);
    });

    it('limita a 10 hooks por router', async () => {
      const { prisma, service } = setup();
      prisma.routerApiHook.count.mockResolvedValue(10);
      await expect(service.create('r1', ORG, dto, 'u1')).rejects.toThrow(/Máximo 10/);
    });
  });

  describe('secreto', () => {
    it('se guarda cifrado y NUNCA se devuelve ni se audita', async () => {
      const { prisma, audit, service } = setup();
      const res: any = await service.create('r1', ORG, { ...dto, secret: 'mi-secreto-largo' }, 'u1');
      expect(prisma.routerApiHook.create.mock.calls[0][0].data.encryptedSecret).toBe('enc:mi-secreto-largo');
      expect(res).not.toHaveProperty('encryptedSecret');
      expect(res.hasSecret).toBe(true);
      expect(JSON.stringify(audit.log.mock.calls)).not.toContain('mi-secreto-largo');
    });

    it('list() no expone el secreto', async () => {
      const { prisma, service } = setup();
      prisma.routerApiHook.findMany.mockResolvedValue([{ id: 'h1', encryptedSecret: 'enc:x', platform: 'CRM' }]);
      const [h]: any = await service.list('r1', ORG);
      expect(h).not.toHaveProperty('encryptedSecret');
      expect(h.hasSecret).toBe(true);
    });

    it('clearSecret borra el secreto y un secreto nuevo lo reemplaza', async () => {
      const { prisma, service } = setup();
      await service.update('r1', 'h1', ORG, { clearSecret: true }, 'u1');
      expect(prisma.routerApiHook.update.mock.calls[0][0].data.encryptedSecret).toBeNull();
      await service.update('r1', 'h1', ORG, { secret: 'otro-secreto-123' }, 'u1');
      expect(prisma.routerApiHook.update.mock.calls[1][0].data.encryptedSecret).toBe('enc:otro-secreto-123');
    });
  });

  describe('emisión', () => {
    it('solo busca hooks HABILITADOS de ese router y organización suscritos a ese evento', async () => {
      const { prisma, service } = setup();
      await service.emit(ORG, 'r1', 'customer.suspended', { a: 1 });
      expect(prisma.routerApiHook.findMany).toHaveBeenCalledWith({
        where: { organizationId: ORG, routerId: 'r1', enabled: true, events: { has: 'customer.suspended' } },
      });
    });

    it('entrega el evento firmado y registra el resultado', async () => {
      const { prisma, service } = setup();
      prisma.routerApiHook.findMany.mockResolvedValue([{ id: 'h1', url: 'https://crm.mi.com/h', encryptedSecret: 'enc:secreto' }]);
      await service.emit(ORG, 'r1', 'customer.created', { customer: { id: 'c1' } });
      const [url, payload, opts]: any = (service.sender as jest.Mock).mock.calls[0];
      expect(url).toBe('https://crm.mi.com/h');
      expect(payload).toMatchObject({ event: 'customer.created', customer: { id: 'c1' } });
      expect(payload.deliveryId).toBeDefined();
      expect(opts.secret).toBe('secreto');
      expect(prisma.routerApiHook.update.mock.calls[0][0].data).toMatchObject({ lastStatus: 200, lastError: null });
    });

    it('un HTTP de error o una URL caída se registran pero NO lanzan', async () => {
      const { prisma, service } = setup();
      prisma.routerApiHook.findMany.mockResolvedValue([{ id: 'h1', url: 'https://a.com/h' }, { id: 'h2', url: 'https://b.com/h' }]);
      (service.sender as jest.Mock).mockResolvedValueOnce({ status: 500 }).mockRejectedValueOnce(new Error('ECONNRESET'));
      await expect(service.emit(ORG, 'r1', 'customer.created', {})).resolves.toBeUndefined();
      const updates = prisma.routerApiHook.update.mock.calls.map((c: any) => c[0].data);
      expect(updates[0].lastError).toMatch(/HTTP 500/);
      expect(updates[1].lastError).toBe('ECONNRESET');
    });

    it('un fallo de base de datos al emitir no rompe a quien lo llama', async () => {
      const { prisma, service } = setup();
      prisma.routerApiHook.findMany.mockRejectedValue(new Error('db caída'));
      await expect(service.emit(ORG, 'r1', 'customer.created', {})).resolves.toBeUndefined();
    });

    it('un cliente sin router no dispara nada', async () => {
      const { prisma, service } = setup();
      prisma.customer.findFirst.mockResolvedValue({ id: 'c1', services: [{ routerId: null }] });
      await service.emitCustomerEvent(ORG, 'customer.updated', 'c1');
      expect(prisma.routerApiHook.findMany).not.toHaveBeenCalled();
    });

    it('el evento del cliente lleva sus datos pero NUNCA su contraseña PPPoE', async () => {
      const { prisma, service } = setup();
      prisma.customer.findFirst.mockResolvedValue({
        id: 'c1', firstName: 'Ana', lastName: 'Ruiz', email: 'a@b.com', phone: '1', status: 'SUSPENDED',
        services: [{ routerId: 'r1', pppoeUsername: 'ana01', pppoeEncryptedPassword: 'enc:secreta', ipAddress: '10.0.0.9', plan: { name: 'Plan 50' }, router: { name: 'Torre' } }],
      });
      prisma.routerApiHook.findMany.mockResolvedValue([{ id: 'h1', url: 'https://a.com/h' }]);
      await service.emitCustomerEvent(ORG, 'customer.suspended', 'c1');
      const payload = (service.sender as jest.Mock).mock.calls[0][1];
      expect(payload.customer).toMatchObject({ id: 'c1', status: 'SUSPENDED', pppoeUsername: 'ana01', plan: 'Plan 50' });
      expect(JSON.stringify(payload)).not.toContain('secreta');
    });
  });

  it('test() manda un evento de prueba y devuelve el resultado', async () => {
    const { service } = setup();
    const res = await service.test('r1', 'h1', ORG);
    expect(res).toEqual({ ok: true, status: 200, error: null });
    expect((service.sender as jest.Mock).mock.calls[0][1].event).toBe('test.ping');
  });
});
