import { BadRequestException, ConflictException } from '@nestjs/common';
import { CustomersService } from './customers.service';

describe('CustomersService', () => {
  const organizationId = 'org-1';
  let prisma: any;
  let audit: any;
  let service: CustomersService;
  let mikrotik: any;
  let crypto: any;

  beforeEach(() => {
    prisma = {
      customer: {
        findFirst: jest.fn().mockResolvedValue({ id: 'c1', organizationId, status: 'ACTIVE' }),
        update: jest.fn().mockResolvedValue({ id: 'c1', status: 'SUSPENDED' }),
      },
      service: { updateMany: jest.fn() },
      plan: { findFirst: jest.fn().mockResolvedValue({ id: 'plan-1' }) },
      router: { findFirst: jest.fn().mockResolvedValue({ id: 'router-1' }) },
    };
    audit = { log: jest.fn() };
    mikrotik = { pushCustomerSecret: jest.fn(), removeCustomerSecret: jest.fn() };
    crypto = { encrypt: (v: string) => `enc:${v}`, decrypt: (v: string) => v.replace(/^enc:/, '') };
    service = new CustomersService(prisma, audit, crypto, mikrotik);
  });

  it('suspende un cliente de la organización correcta y registra auditoría', async () => {
    const result = await service.suspend(organizationId, 'c1', 'Falta de pago', 'user-1', '127.0.0.1');
    expect(prisma.customer.findFirst).toHaveBeenCalledWith({ where: { id: 'c1', organizationId } });
    expect(prisma.customer.update).toHaveBeenCalledWith({ where: { id: 'c1' }, data: { status: 'SUSPENDED' } });
    expect(prisma.service.updateMany).toHaveBeenCalledWith({ where: { customerId: 'c1' }, data: { status: 'SUSPENDED' } });
    expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({ organizationId, action: 'customer.suspend' }));
    expect(result.status).toBe('SUSPENDED');
  });

  it('no permite suspender un cliente de otra organización', async () => {
    prisma.customer.findFirst.mockResolvedValue(null);
    await expect(service.suspend('org-2', 'c1', undefined, 'user-1')).rejects.toThrow('Cliente no encontrado');
  });

  it('reactiva un cliente y registra auditoría', async () => {
    prisma.customer.update.mockResolvedValue({ id: 'c1', status: 'ACTIVE' });
    await service.reactivate(organizationId, 'c1', 'user-1');
    expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({ organizationId, action: 'customer.reactivate' }));
  });

  describe('create() con router (alta tipo WispHub)', () => {
    const dto = {
      firstName: 'Ana', lastName: 'Ruiz', planId: 'plan-1', routerId: 'router-1',
      pppoeUsername: 'ana01', pppoePassword: 'clave-secreta',
    };
    beforeEach(() => {
      prisma.customer.findFirst.mockResolvedValue(null);
      prisma.customer.create = jest.fn().mockImplementation(async ({ data }: any) => ({
        id: 'c9', ...data,
        services: [{ id: 's1', ...data.services.create, plan: { mikrotikProfile: 'plan-50m' } }],
      }));
    });

    it('guarda el servicio con el router y la clave PPPoE CIFRADA', async () => {
      await service.create(organizationId, dto as any, 'u1');
      const svc = prisma.customer.create.mock.calls[0][0].data.services.create;
      expect(svc.routerId).toBe('router-1');
      expect(svc.pppoeEncryptedPassword).toBe('enc:clave-secreta');
    });

    it('nunca devuelve la clave PPPoE (ni cifrada) en la respuesta ni en la auditoría', async () => {
      const res: any = await service.create(organizationId, dto as any, 'u1');
      expect(res.services[0]).not.toHaveProperty('pppoeEncryptedPassword');
      expect(JSON.stringify(audit.log.mock.calls[0][0])).not.toContain('enc:clave-secreta');
      expect(JSON.stringify(res)).not.toContain('clave-secreta');
    });

    it('rechaza un router o un plan de OTRA cuenta', async () => {
      prisma.router.findFirst.mockResolvedValue(null);
      await expect(service.create(organizationId, dto as any, 'u1')).rejects.toThrow(BadRequestException);
      expect(prisma.router.findFirst).toHaveBeenCalledWith({ where: { id: 'router-1', organizationId } });

      prisma.router.findFirst.mockResolvedValue({ id: 'router-1' });
      prisma.plan.findFirst.mockResolvedValue(null);
      await expect(service.create(organizationId, dto as any, 'u1')).rejects.toThrow(BadRequestException);
      expect(prisma.plan.findFirst).toHaveBeenCalledWith({ where: { id: 'plan-1', organizationId } });
      expect(prisma.customer.create).not.toHaveBeenCalled();
    });

    it('un usuario PPPoE repetido da un conflicto claro, no un error 500', async () => {
      prisma.customer.create.mockRejectedValue({ code: 'P2002' });
      await expect(service.create(organizationId, dto as any, 'u1')).rejects.toThrow(ConflictException);
    });

    it('no permite un router sin plan (no habría servicio donde asignarlo)', async () => {
      await expect(service.create(organizationId, { ...dto, planId: undefined } as any, 'u1')).rejects.toThrow(BadRequestException);
    });
  });

  describe('updateService() — cambiar plan/router de un cliente', () => {
    const current = { id: 's1', customerId: 'c1', planId: 'plan-1', routerId: 'router-old', pppoeUsername: 'ana01', pppoeEncryptedPassword: 'enc:guardada', plan: { mikrotikProfile: 'plan-50m' } };
    beforeEach(() => {
      prisma.service.findFirst = jest.fn().mockResolvedValue(current);
      prisma.service.update = jest.fn().mockImplementation(async ({ data }: any) => ({
        ...current, ...data, plan: { mikrotikProfile: 'plan-50m' }, router: { id: data.routerId, name: 'Nuevo' },
      }));
      prisma.service.create = jest.fn();
      mikrotik.removeCustomerSecret.mockResolvedValue({ applied: true });
      mikrotik.pushCustomerSecret.mockResolvedValue({ applied: true, action: 'created' });
    });

    it('mueve al cliente: lo quita del router anterior y lo crea en el nuevo con la clave guardada', async () => {
      const res: any = await service.updateService(organizationId, 'c1', { routerId: 'router-new' }, 'u1');
      expect(mikrotik.removeCustomerSecret).toHaveBeenCalledWith('router-old', 'ana01');
      expect(mikrotik.pushCustomerSecret).toHaveBeenCalledWith('router-new', {
        username: 'ana01', password: 'guardada', profile: 'plan-50m', disabled: false,
      });
      expect(res.networkAction.applied).toBe(true);
    });

    it('si el cliente está SUSPENDIDO, el usuario queda deshabilitado en el router nuevo', async () => {
      prisma.customer.findFirst.mockResolvedValue({ id: 'c1', organizationId, status: 'SUSPENDED' });
      await service.updateService(organizationId, 'c1', { routerId: 'router-new' }, 'u1');
      expect(mikrotik.pushCustomerSecret.mock.calls[0][1].disabled).toBe(true);
    });

    it('rechaza un router o un plan de OTRA cuenta y no toca nada', async () => {
      prisma.router.findFirst.mockResolvedValue(null);
      await expect(service.updateService(organizationId, 'c1', { routerId: 'ajeno' }, 'u1')).rejects.toThrow(BadRequestException);
      expect(prisma.router.findFirst).toHaveBeenCalledWith({ where: { id: 'ajeno', organizationId } });
      prisma.router.findFirst.mockResolvedValue({ id: 'router-new' });
      prisma.plan.findFirst.mockResolvedValue(null);
      await expect(service.updateService(organizationId, 'c1', { planId: 'ajeno' }, 'u1')).rejects.toThrow(BadRequestException);
      expect(prisma.service.update).not.toHaveBeenCalled();
      expect(mikrotik.pushCustomerSecret).not.toHaveBeenCalled();
    });

    it('no permite editar el servicio de un cliente de otra cuenta', async () => {
      prisma.customer.findFirst.mockResolvedValue(null);
      await expect(service.updateService('org-2', 'c1', { routerId: 'router-new' }, 'u1')).rejects.toThrow('Cliente no encontrado');
    });

    it('sin contraseña guardada ni nueva avisa qué falta, sin romper el cambio', async () => {
      prisma.service.findFirst.mockResolvedValue({ ...current, pppoeEncryptedPassword: null });
      prisma.service.update.mockImplementation(async ({ data }: any) => ({ ...current, pppoeEncryptedPassword: null, ...data, plan: {} }));
      const res: any = await service.updateService(organizationId, 'c1', { routerId: 'router-new' }, 'u1');
      expect(res.networkAction).toMatchObject({ applied: false });
      expect(res.networkAction.reason).toMatch(/contraseña/);
      expect(mikrotik.pushCustomerSecret).not.toHaveBeenCalled();
    });

    it('quitar el router (routerId vacío) borra al cliente del router y no crea nada nuevo', async () => {
      const res: any = await service.updateService(organizationId, 'c1', { routerId: '' }, 'u1');
      expect(prisma.service.update.mock.calls[0][0].data.routerId).toBeNull();
      expect(mikrotik.removeCustomerSecret).toHaveBeenCalledWith('router-old', 'ana01');
      expect(mikrotik.pushCustomerSecret).not.toHaveBeenCalled();
      expect(res.networkAction.action).toBe('removed');
    });

    it('si falla quitarlo del router viejo, lo cambia igual y lo advierte', async () => {
      mikrotik.removeCustomerSecret.mockResolvedValue({ applied: false, reason: 'timeout' });
      const res: any = await service.updateService(organizationId, 'c1', { routerId: 'router-new' }, 'u1');
      expect(res.networkAction.warning).toMatch(/timeout/);
      expect(res.networkAction.applied).toBe(true);
    });

    it('un cliente sin servicio necesita un plan para crearlo', async () => {
      prisma.service.findFirst.mockResolvedValue(null);
      await expect(service.updateService(organizationId, 'c1', { routerId: 'router-new' }, 'u1')).rejects.toThrow(/elige un plan/);
      prisma.service.create.mockImplementation(async ({ data }: any) => ({ id: 's9', ...data, plan: { mikrotikProfile: 'p' } }));
      await service.updateService(organizationId, 'c1', { planId: 'plan-1', routerId: 'router-new', pppoeUsername: 'n1', pppoePassword: 'clave1234' }, 'u1');
      expect(prisma.service.create).toHaveBeenCalled();
    });

    it('nunca devuelve ni audita la clave PPPoE', async () => {
      const res: any = await service.updateService(organizationId, 'c1', { routerId: 'router-new', pppoePassword: 'nueva-clave-99' }, 'u1');
      expect(res).not.toHaveProperty('pppoeEncryptedPassword');
      expect(JSON.stringify(res)).not.toContain('nueva-clave-99');
      expect(JSON.stringify(audit.log.mock.calls)).not.toContain('nueva-clave-99');
      expect(JSON.stringify(audit.log.mock.calls)).not.toContain('enc:');
    });

    it('usuario PPPoE repetido = conflicto claro', async () => {
      prisma.service.update.mockRejectedValue({ code: 'P2002' });
      await expect(service.updateService(organizationId, 'c1', { pppoeUsername: 'ya-usado' }, 'u1')).rejects.toThrow(ConflictException);
    });
  });
});
