import { CustomersService } from './customers.service';

describe('CustomersService', () => {
  const organizationId = 'org-1';
  let prisma: any;
  let audit: any;
  let service: CustomersService;

  beforeEach(() => {
    prisma = {
      customer: {
        findFirst: jest.fn().mockResolvedValue({ id: 'c1', organizationId, status: 'ACTIVE' }),
        update: jest.fn().mockResolvedValue({ id: 'c1', status: 'SUSPENDED' }),
      },
      service: { updateMany: jest.fn() },
    };
    audit = { log: jest.fn() };
    service = new CustomersService(prisma, audit);
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
});
