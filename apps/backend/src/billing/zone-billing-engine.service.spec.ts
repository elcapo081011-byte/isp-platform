import { ZoneBillingEngineService } from './zone-billing-engine.service';
import { DEFAULT_ZONE_SETTINGS } from '../mikrotik/zone-settings';

const ORG = 'org-1';
const zone = (over: any = {}) => ({ ...DEFAULT_ZONE_SETTINGS, ...over });

function setup() {
  const prisma: any = {
    router: { findMany: jest.fn().mockResolvedValue([]) },
    service: { findMany: jest.fn().mockResolvedValue([]) },
    invoice: { findMany: jest.fn().mockResolvedValue([]), updateMany: jest.fn().mockResolvedValue({ count: 0 }) },
  };
  const billing: any = { createSystemInvoice: jest.fn().mockImplementation(async (_o: string, d: any) => ({ id: 'i1', number: 'INV-2026-00001', ...d })) };
  const notifications: any = { notify: jest.fn() };
  const suspension: any = { suspendForNonPayment: jest.fn() };
  const engine = new ZoneBillingEngineService(prisma, billing, notifications, suspension);
  return { prisma, billing, notifications, suspension, engine };
}

const svc = (id: string, price: number) => ({
  id, customerId: `c-${id}`, plan: { price, currency: 'USD', name: 'Plan 50' },
  customer: { id: `c-${id}`, firstName: 'A', lastName: 'B', email: 'a@b.com' },
});

describe('ZoneBillingEngine', () => {
  describe('runHourly', () => {
    it('ignora routers sin zona configurada (siguen con las reglas globales)', async () => {
      const { prisma, engine } = setup();
      prisma.router.findMany.mockResolvedValue([{ id: 'r1', name: 'R', organizationId: ORG, zone: null }]);
      await engine.runHourly(new Date(2026, 8, 25, 17));
      expect(prisma.invoice.updateMany).not.toHaveBeenCalled();
      expect(prisma.service.findMany).not.toHaveBeenCalled();
    });

    it('factura solo el día y la hora configurados', async () => {
      const { prisma, billing, engine } = setup();
      prisma.router.findMany.mockResolvedValue([{ id: 'r1', name: 'R', organizationId: ORG, zone: zone({ autoCut: false }) }]);
      prisma.service.findMany.mockResolvedValue([svc('s1', 30)]);

      await engine.runHourly(new Date(2026, 8, 10, 17)); // día 10: no toca
      expect(billing.createSystemInvoice).not.toHaveBeenCalled();
      await engine.runHourly(new Date(2026, 8, 25, 16)); // día 25 pero antes de las 17
      expect(billing.createSystemInvoice).not.toHaveBeenCalled();
      await engine.runHourly(new Date(2026, 8, 25, 17)); // día 25, 17:00
      expect(billing.createSystemInvoice).toHaveBeenCalledTimes(1);
    });

    it('un error en la zona de un router no detiene a los demás', async () => {
      const { prisma, billing, engine } = setup();
      prisma.router.findMany.mockResolvedValue([
        { id: 'r1', name: 'Roto', organizationId: ORG, zone: zone() },
        { id: 'r2', name: 'Sano', organizationId: ORG, zone: zone({ autoCut: false }) },
      ]);
      prisma.invoice.updateMany.mockRejectedValueOnce(new Error('db caída'));
      prisma.service.findMany.mockResolvedValue([svc('s2', 30)]);
      await expect(engine.runHourly(new Date(2026, 8, 25, 17))).resolves.toBeUndefined();
      expect(billing.createSystemInvoice).toHaveBeenCalledTimes(1);
    });

    it('el recordatorio se envía solo en su hora exacta (no se repite toda la tarde)', async () => {
      const { prisma, notifications, engine } = setup();
      prisma.router.findMany.mockResolvedValue([{ id: 'r1', name: 'R', organizationId: ORG, zone: zone({ autoInvoices: false, autoCut: false }) }]);
      prisma.invoice.findMany.mockResolvedValue([
        { number: 'INV-1', dueDate: new Date(2026, 8, 30), customer: { firstName: 'A', lastName: 'B', email: 'a@b.com' } },
      ]);
      await engine.runHourly(new Date(2026, 8, 28, 18)); // una hora después
      expect(notifications.notify).not.toHaveBeenCalled();
      await engine.runHourly(new Date(2026, 8, 28, 17));
      expect(notifications.notify).toHaveBeenCalledWith(expect.objectContaining({ event: 'invoice.reminder' }));
    });
  });

  describe('generateInvoices', () => {
    const router = { id: 'r1', organizationId: ORG, name: 'Zona Norte' };

    it('no duplica: salta los servicios que ya tienen factura este mes y los de plan sin precio', async () => {
      const { prisma, billing, engine } = setup();
      prisma.service.findMany.mockResolvedValue([svc('s1', 30), svc('s2', 30), svc('s3', 0)]);
      prisma.invoice.findMany.mockResolvedValue([{ serviceId: 's1' }]);
      const n = await engine.generateInvoices(router, zone(), new Date(2026, 8, 25, 17));
      expect(n).toBe(1);
      expect(billing.createSystemInvoice).toHaveBeenCalledTimes(1);
      expect(billing.createSystemInvoice.mock.calls[0][1].serviceId).toBe('s2');
    });

    it('aplica impuestos, vencimiento en el día de pago y avisa por correo si está activo', async () => {
      const { prisma, billing, notifications, engine } = setup();
      prisma.service.findMany.mockResolvedValue([svc('s1', 50)]);
      await engine.generateInvoices(router, zone({ taxPercent: 18, payDay: 30 }), new Date(2026, 8, 25, 17));
      const data = billing.createSystemInvoice.mock.calls[0][1];
      expect(data.amount).toBe(50);
      expect(data.surcharge).toBe(9);
      expect([data.dueDate.getMonth(), data.dueDate.getDate()]).toEqual([8, 30]);
      expect(notifications.notify).toHaveBeenCalledWith(expect.objectContaining({ event: 'invoice.created' }));
    });

    it('no envía correo si "emailOnInvoice" está apagado', async () => {
      const { prisma, notifications, engine } = setup();
      prisma.service.findMany.mockResolvedValue([svc('s1', 50)]);
      await engine.generateInvoices(router, zone({ emailOnInvoice: false }), new Date(2026, 8, 25, 17));
      expect(notifications.notify).not.toHaveBeenCalled();
    });

    it('solo mira servicios y clientes ACTIVOS del router y de la organización', async () => {
      const { prisma, engine } = setup();
      await engine.generateInvoices(router, zone(), new Date(2026, 8, 25, 17));
      expect(prisma.service.findMany.mock.calls[0][0].where).toEqual({
        routerId: 'r1', status: 'ACTIVE', customer: { status: 'ACTIVE', organizationId: ORG },
      });
    });
  });

  describe('runCuts', () => {
    const router = { id: 'r1', organizationId: ORG };
    const overdueInvoice = (n: string, due: Date, customerId = 'c1') => ({
      number: n, dueDate: due, customerId, customer: { id: customerId, firstName: 'A', lastName: 'B' },
    });

    it('NO corta antes del día de corte (vence el 30, corte el día 5)', async () => {
      const { prisma, suspension, engine } = setup();
      prisma.invoice.findMany.mockResolvedValue([overdueInvoice('INV-1', new Date(2026, 8, 30, 23, 59, 59))]);
      expect(await engine.runCuts(router, zone(), new Date(2026, 9, 1, 12))).toBe(0);
      expect(await engine.runCuts(router, zone(), new Date(2026, 9, 5, 16, 59))).toBe(0);
      expect(suspension.suspendForNonPayment).not.toHaveBeenCalled();
    });

    it('corta el día y la hora de corte, y avisa según "emailOnCut"', async () => {
      const { prisma, suspension, engine } = setup();
      prisma.invoice.findMany.mockResolvedValue([overdueInvoice('INV-1', new Date(2026, 8, 30, 23, 59, 59))]);
      expect(await engine.runCuts(router, zone({ emailOnCut: false }), new Date(2026, 9, 5, 17))).toBe(1);
      const args = suspension.suspendForNonPayment.mock.calls[0];
      expect(args[0]).toBe(ORG);
      expect(args[2]).toBe('INV-1');
      expect(args[4]).toBe(false);
    });

    it('respeta "suspender después de N facturas vencidas"', async () => {
      const { prisma, suspension, engine } = setup();
      prisma.invoice.findMany.mockResolvedValue([overdueInvoice('INV-2', new Date(2026, 8, 30, 23, 59, 59))]);
      expect(await engine.runCuts(router, zone({ suspendAfterInvoices: 2 }), new Date(2026, 9, 6, 9))).toBe(0);

      prisma.invoice.findMany.mockResolvedValue([
        overdueInvoice('INV-1', new Date(2026, 7, 30, 23, 59, 59)),
        overdueInvoice('INV-2', new Date(2026, 8, 30, 23, 59, 59)),
      ]);
      expect(await engine.runCuts(router, zone({ suspendAfterInvoices: 2 }), new Date(2026, 9, 6, 9))).toBe(1);
      expect(suspension.suspendForNonPayment).toHaveBeenCalledTimes(1);
    });

    it('solo consulta clientes ACTIVOS y facturas de ese router y organización', async () => {
      const { prisma, engine } = setup();
      await engine.runCuts(router, zone(), new Date(2026, 9, 5, 17));
      expect(prisma.invoice.findMany.mock.calls[0][0].where).toEqual({
        organizationId: ORG, status: 'OVERDUE', service: { routerId: 'r1' }, customer: { status: 'ACTIVE' },
      });
    });

    it('con el corte automático apagado no corta a nadie', async () => {
      const { prisma, suspension, engine } = setup();
      prisma.router.findMany.mockResolvedValue([{ id: 'r1', name: 'R', organizationId: ORG, zone: zone({ autoCut: false, autoInvoices: false, autoReminders: false }) }]);
      prisma.invoice.findMany.mockResolvedValue([overdueInvoice('INV-1', new Date(2026, 8, 1))]);
      await engine.runHourly(new Date(2026, 9, 20, 17));
      expect(suspension.suspendForNonPayment).not.toHaveBeenCalled();
    });
  });
});
