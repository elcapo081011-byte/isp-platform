import { BadRequestException, NotFoundException } from '@nestjs/common';
import { MikrotikService } from './mikrotik.service';

describe('MikrotikService — aislamiento multi-tenant', () => {
  let prisma: any;
  let service: MikrotikService;
  let crypto: any;
  let provider: any;
  let auditMock: any;

  beforeEach(() => {
    prisma = {
      router: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      service: { count: jest.fn().mockResolvedValue(0) },
    };
    const audit = { log: jest.fn() };
    crypto = { encrypt: jest.fn((v: string) => `enc:${v}`), decrypt: jest.fn((v: string) => v.replace(/^enc:/, '')) };
    provider = {
      testConnection: jest.fn(), upsertPppoeSecret: jest.fn(), disablePppoeSecret: jest.fn(), enablePppoeSecret: jest.fn(),
      removePppoeSecret: jest.fn(), findActiveAddress: jest.fn(), addToAddressList: jest.fn(), removeFromAddressList: jest.fn(),
    };
    auditMock = audit;
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
    const result = await service.create('org-A', { name: 'Router 1', host: '10.0.0.1', useConnectionScript: false, username: 'admin', password: 'secreto' }, 'user-1');
    expect(prisma.router.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ organizationId: 'org-A', encryptedPassword: 'enc:secreto' }) }),
    );
    expect(result).not.toHaveProperty('encryptedPassword');
  });

  // ---- Router v2 (configuración tipo WispHub) ----------------------------

  it('por defecto genera usuario y clave de API en el sistema (script de conexión)', async () => {
    prisma.router.create.mockImplementation(async ({ data }: any) => ({ id: 'r2', ...data }));
    const result: any = await service.create('org-A', { name: 'Torre', host: '10.0.0.5' }, 'u1');
    const data = prisma.router.create.mock.calls[0][0].data;
    expect(data.useConnectionScript).toBe(true);
    expect(data.username).toMatch(/^ispc_[0-9a-f]{8}$/);
    expect(data.encryptedPassword).toMatch(/^enc:[0-9a-f]{36}$/);
    expect(result).not.toHaveProperty('encryptedPassword');
  });

  it('no deja registrar direcciones internas del servidor como router', async () => {
    for (const host of ['localhost', '127.0.0.1', '169.254.169.254', '0.0.0.0', '::1']) {
      await expect(service.create('org-A', { name: 'X1', host }, 'u1')).rejects.toThrow(BadRequestException);
    }
    await expect(service.create('org-A', { name: 'X1', host: '10.0.0.1', failoverHost: '127.0.0.1' }, 'u1')).rejects.toThrow(BadRequestException);
    expect(prisma.router.create).not.toHaveBeenCalled();
  });

  it('update() no toca un router de otra cuenta', async () => {
    prisma.router.findFirst.mockResolvedValue(null);
    await expect(service.update('r-otra-org', 'org-B', { name: 'Hack' }, 'u1')).rejects.toThrow(NotFoundException);
    expect(prisma.router.update).not.toHaveBeenCalled();
  });

  it('update() conserva la clave si viene vacía y no permite editar credenciales generadas a mano', async () => {
    prisma.router.findFirst.mockResolvedValue({ id: 'r1', useConnectionScript: false, zone: null });
    prisma.router.update.mockResolvedValue({ id: 'r1' });
    await service.update('r1', 'org-A', { name: 'Nuevo', password: '' }, 'u1');
    expect(prisma.router.update.mock.calls[0][0].data).not.toHaveProperty('encryptedPassword');

    prisma.router.findFirst.mockResolvedValue({ id: 'r1', useConnectionScript: true, zone: null });
    await expect(service.update('r1', 'org-A', { password: 'otra' }, 'u1')).rejects.toThrow(BadRequestException);
  });

  it('update() sanea la zona de facturación (valores fuera de rango se corrigen)', async () => {
    prisma.router.findFirst.mockResolvedValue({ id: 'r1', useConnectionScript: false, zone: null });
    prisma.router.update.mockResolvedValue({ id: 'r1' });
    await service.update('r1', 'org-A', { zone: { cutDay: 99, suspendAfterInvoices: 0, taxPercent: 18 } as any }, 'u1');
    const zone = prisma.router.update.mock.calls[0][0].data.zone;
    expect(zone.cutDay).toBe(31);
    expect(zone.suspendAfterInvoices).toBe(1);
    expect(zone.taxPercent).toBe(18);
    expect(zone.autoCut).toBe(true);
  });

  it('remove() se niega si hay servicios de clientes en ese router', async () => {
    prisma.router.findFirst.mockResolvedValue({ id: 'r1', name: 'Torre' });
    prisma.service.count.mockResolvedValue(3);
    await expect(service.remove('r1', 'org-A', 'u1')).rejects.toThrow(/3 servicio/);
    expect(prisma.router.delete).not.toHaveBeenCalled();

    prisma.service.count.mockResolvedValue(0);
    await expect(service.remove('r1', 'org-A', 'u1')).resolves.toEqual({ deleted: true });
  });

  it('el script de conexión solo existe para credenciales generadas y su consulta se audita', async () => {
    prisma.router.findFirst.mockResolvedValue({ id: 'r1', name: 'Torre', useConnectionScript: false });
    await expect(service.getConnectionScript('r1', 'org-A', 'u1')).rejects.toThrow(BadRequestException);

    prisma.router.findFirst.mockResolvedValue({
      id: 'r1', name: 'Torre', useConnectionScript: true, username: 'ispc_ab12cd34', port: 8728, encryptedPassword: 'enc:0123456789abcdef',
    });
    const res = await service.getConnectionScript('r1', 'org-A', 'u1');
    expect(res.script).toContain('password="0123456789abcdef"');
    expect(auditMock.log).toHaveBeenCalledWith(expect.objectContaining({ action: 'router.script_view' }));
  });

  it('regenerar credenciales cambia usuario y clave y deja el estado en desconocido', async () => {
    prisma.router.findFirst.mockResolvedValue({ id: 'r1', name: 'Torre', useConnectionScript: true });
    prisma.router.update.mockImplementation(async ({ data }: any) => ({ id: 'r1', name: 'Torre', port: 8728, ...data }));
    const res = await service.regenerateCredentials('r1', 'org-A', 'u1');
    const data = prisma.router.update.mock.calls[0][0].data;
    expect(data.status).toBe('UNKNOWN');
    expect(res.apiUser).toBe(data.username);
  });

  it('checkConnection guarda el motivo legible cuando el router no responde', async () => {
    prisma.router.findFirst.mockResolvedValue({ id: 'r1', host: '10.0.0.1', port: 8728, username: 'u', encryptedPassword: 'enc:x', useTls: false });
    provider.testConnection.mockResolvedValue({ status: 'OFFLINE', error: 'Usuario o contraseña incorrectos.' });
    const res = await service.checkConnection('r1', 'org-A');
    expect(res).toEqual({ status: 'OFFLINE', error: 'Usuario o contraseña incorrectos.' });
    expect(prisma.router.update.mock.calls[0][0].data.lastError).toBe('Usuario o contraseña incorrectos.');
  });

  describe('pushCustomerSecret', () => {
    const router = { id: 'r1', host: '10.0.0.1', port: 8728, username: 'u', encryptedPassword: 'enc:x', useTls: false, addClientsToRouter: true };
    beforeEach(() => prisma.router.findUnique.mockResolvedValue(router));

    it('respeta el interruptor "Agregar cliente en MikroTik"', async () => {
      prisma.router.findUnique.mockResolvedValue({ ...router, addClientsToRouter: false });
      const res = await service.pushCustomerSecret('r1', { username: 'c1', password: 'p', profile: 'plan-50m' });
      expect(res.applied).toBe(false);
      expect(provider.upsertPppoeSecret).not.toHaveBeenCalled();
    });

    it('no crea el usuario si el plan no tiene perfil de MikroTik', async () => {
      const res = await service.pushCustomerSecret('r1', { username: 'c1', password: 'p', profile: null });
      expect(res.applied).toBe(false);
      expect(res.reason).toMatch(/perfil/);
    });

    it('crea el usuario con el perfil del plan', async () => {
      provider.upsertPppoeSecret.mockResolvedValue('created');
      const res = await service.pushCustomerSecret('r1', { username: 'c1', password: 'p', profile: 'plan-50m' });
      expect(res).toEqual({ applied: true, action: 'created' });
    });

    it('si el router falla NO lanza excepción (el alta del cliente no se deshace)', async () => {
      provider.upsertPppoeSecret.mockRejectedValue(new Error('timeout'));
      const res = await service.pushCustomerSecret('r1', { username: 'c1', password: 'p', profile: 'plan-50m' });
      expect(res.applied).toBe(false);
      expect(res.reason).toContain('timeout');
    });
  });

  describe('tipo de corte', () => {
    const base = { id: 'r1', host: '10.0.0.1', port: 8728, username: 'u', encryptedPassword: 'enc:x', useTls: false };

    describe('PPPOE_SECRET (por defecto)', () => {
      beforeEach(() => prisma.router.findUnique.mockResolvedValue({ ...base, cutMode: 'PPPOE_SECRET' }));

      it('corta deshabilitando el usuario PPPoE, sin tocar listas de firewall', async () => {
        expect(await service.disableCustomerSession('r1', 'ana01', '10.9.9.9')).toEqual({ applied: true });
        expect(provider.disablePppoeSecret).toHaveBeenCalledWith(expect.anything(), 'ana01');
        expect(provider.addToAddressList).not.toHaveBeenCalled();
      });

      it('un fallo del router no lanza: devuelve applied:false con el motivo', async () => {
        provider.disablePppoeSecret.mockRejectedValue(new Error('timeout'));
        expect(await service.disableCustomerSession('r1', 'ana01')).toEqual({ applied: false, error: 'timeout' });
      });
    });

    describe('ADDRESS_LIST', () => {
      beforeEach(() => prisma.router.findUnique.mockResolvedValue({ ...base, cutMode: 'ADDRESS_LIST' }));

      it('agrega la IP fija del servicio a la lista "moroso" con un comentario que identifica al cliente', async () => {
        expect(await service.disableCustomerSession('r1', 'ana01', '10.9.9.9')).toEqual({ applied: true });
        expect(provider.addToAddressList).toHaveBeenCalledWith(expect.anything(), 'moroso', '10.9.9.9', 'ISP Control:ana01');
        expect(provider.disablePppoeSecret).not.toHaveBeenCalled();
        expect(provider.findActiveAddress).not.toHaveBeenCalled();
      });

      it('sin IP fija usa la de la sesión PPPoE activa', async () => {
        provider.findActiveAddress.mockResolvedValue('172.20.0.55');
        await service.disableCustomerSession('r1', 'ana01', null);
        expect(provider.addToAddressList).toHaveBeenCalledWith(expect.anything(), 'moroso', '172.20.0.55', 'ISP Control:ana01');
      });

      it('sin IP fija ni sesión activa NO finge haberlo cortado', async () => {
        provider.findActiveAddress.mockResolvedValue(null);
        const res: any = await service.disableCustomerSession('r1', 'ana01');
        expect(res.applied).toBe(false);
        expect(res.error).toMatch(/IP del cliente/);
        expect(provider.addToAddressList).not.toHaveBeenCalled();
      });

      it('reactivar lo saca de la lista Y habilita el usuario', async () => {
        expect(await service.enableCustomerSession('r1', 'ana01')).toEqual({ applied: true });
        expect(provider.removeFromAddressList).toHaveBeenCalledWith(expect.anything(), 'moroso', 'ISP Control:ana01');
        expect(provider.enablePppoeSecret).toHaveBeenCalled();
      });

      it('si no se pudo sacar de la lista, NO dice que reactivó (el cliente seguiría bloqueado)', async () => {
        provider.removeFromAddressList.mockRejectedValue(new Error('sin permiso'));
        const res: any = await service.enableCustomerSession('r1', 'ana01');
        expect(res).toEqual({ applied: false, error: 'sin permiso' });
      });
    });

    it('en modo PPPoE, un fallo al limpiar la lista no impide reactivar', async () => {
      prisma.router.findUnique.mockResolvedValue({ ...base, cutMode: 'PPPOE_SECRET' });
      provider.removeFromAddressList.mockRejectedValue(new Error('sin permiso'));
      expect(await service.enableCustomerSession('r1', 'ana01')).toEqual({ applied: true });
      expect(provider.enablePppoeSecret).toHaveBeenCalled();
    });

    it('removeCustomerSecret quita el usuario y su entrada de la lista, y nunca lanza', async () => {
      prisma.router.findUnique.mockResolvedValue(base);
      expect(await service.removeCustomerSecret('r1', 'ana01')).toEqual({ applied: true });
      expect(provider.removePppoeSecret).toHaveBeenCalledWith(expect.anything(), 'ana01');
      provider.removePppoeSecret.mockRejectedValue(new Error('caído'));
      expect(await service.removeCustomerSecret('r1', 'ana01')).toEqual({ applied: false, reason: 'caído' });
    });

    it('el script de conexión trae la regla de bloqueo solo en modo ADDRESS_LIST', async () => {
      const router = { id: 'r1', name: 'Torre', useConnectionScript: true, username: 'ispc_ab12cd34', port: 8728, encryptedPassword: 'enc:0123456789abcdef' };
      prisma.router.findFirst.mockResolvedValue({ ...router, cutMode: 'PPPOE_SECRET' });
      expect((await service.getConnectionScript('r1', 'org-A', 'u1')).script).not.toContain('src-address-list=moroso');
      prisma.router.findFirst.mockResolvedValue({ ...router, cutMode: 'ADDRESS_LIST' });
      expect((await service.getConnectionScript('r1', 'org-A', 'u1')).script).toContain('chain=forward src-address-list=moroso action=drop');
    });
  });
});
