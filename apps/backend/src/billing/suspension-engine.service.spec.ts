import { SuspensionEngineService } from './suspension-engine.service';

describe('SuspensionEngine — convivencia con las zonas', () => {
  it('el ciclo global NO corta a clientes cuyo router tiene zona configurada', async () => {
    const overdue = (id: string, zone: any) => ({
      number: `INV-${id}`, customerId: id, dueDate: new Date(2020, 0, 1),
      customer: { id, status: 'ACTIVE', firstName: 'A', lastName: id, services: [{ router: { zone } }] },
    });
    const prisma: any = {
      organization: { findMany: jest.fn().mockResolvedValue([{ id: 'org-1', name: 'ISP' }]) },
      setting: { findUnique: jest.fn().mockResolvedValue(null) },
      invoice: {
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
        findMany: jest.fn()
          .mockResolvedValueOnce([]) // notifyUpcomingDueDates
          .mockResolvedValueOnce([overdue('con-zona', { cutDay: 5 }), overdue('sin-zona', null)]), // suspendOverdueCustomers
      },
      customer: { update: jest.fn() },
      service: { updateMany: jest.fn(), findFirst: jest.fn().mockResolvedValue(null) },
    };
    const engine = new SuspensionEngineService(prisma, { log: jest.fn() } as any, { notify: jest.fn() } as any, { disableCustomerSession: jest.fn() } as any, { emitCustomerEvent: jest.fn() } as any);
    await engine.runDailyCycle();
    const suspended = prisma.customer.update.mock.calls.map((c: any) => c[0].where.id);
    expect(suspended).toEqual(['sin-zona']);
  });
});
