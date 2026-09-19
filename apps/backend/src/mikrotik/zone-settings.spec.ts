import { cutDateFor, DEFAULT_ZONE_SETTINGS, effectiveDay, isDayAndHour, nextDueDate, normalizeZone } from './zone-settings';

describe('zone-settings', () => {
  it('sin configuración usa los valores de ejemplo de WispHub (25 / 30 / 28 / 5)', () => {
    const z = normalizeZone(null);
    expect([z.invoiceDay, z.payDay, z.reminderDay, z.cutDay, z.suspendAfterInvoices]).toEqual([25, 30, 28, 5, 1]);
    expect(z).toEqual(DEFAULT_ZONE_SETTINGS);
  });

  it('corrige valores fuera de rango o de tipo incorrecto', () => {
    const z = normalizeZone({ invoiceDay: 0, cutDay: 45, invoiceHour: 30, taxPercent: -5, autoCut: 'si' as any, suspendAfterInvoices: 3.6 });
    expect(z.invoiceDay).toBe(1);
    expect(z.cutDay).toBe(31);
    expect(z.invoiceHour).toBe(23);
    expect(z.taxPercent).toBe(0);
    expect(z.autoCut).toBe(true); // valor no booleano → cae al default
    expect(z.suspendAfterInvoices).toBe(4);
  });

  it('el día 31 se ajusta al último día de meses cortos', () => {
    expect(effectiveDay(2026, 1, 31)).toBe(28); // febrero 2026
    expect(effectiveDay(2028, 1, 31)).toBe(29); // bisiesto
    expect(effectiveDay(2026, 3, 31)).toBe(30); // abril
  });

  it('isDayAndHour se cumple ese día a partir de la hora, no antes ni otro día', () => {
    expect(isDayAndHour(new Date(2026, 8, 25, 16, 59), 25, 17)).toBe(false);
    expect(isDayAndHour(new Date(2026, 8, 25, 17, 0), 25, 17)).toBe(true);
    expect(isDayAndHour(new Date(2026, 8, 25, 23, 30), 25, 17)).toBe(true);
    expect(isDayAndHour(new Date(2026, 8, 26, 17, 0), 25, 17)).toBe(false);
  });

  it('nextDueDate: el día de pago cae en el mismo mes si aún no pasó, o en el siguiente', () => {
    const d1 = nextDueDate(new Date(2026, 8, 25, 17), 30);
    expect([d1.getMonth(), d1.getDate()]).toEqual([8, 30]);
    const d2 = nextDueDate(new Date(2026, 8, 25, 17), 10);
    expect([d2.getMonth(), d2.getDate()]).toEqual([9, 10]);
    const d3 = nextDueDate(new Date(2026, 11, 25, 17), 10); // diciembre → enero del año siguiente
    expect([d3.getFullYear(), d3.getMonth(), d3.getDate()]).toEqual([2027, 0, 10]);
  });

  describe('cutDateFor (el corte nunca llega antes de su día)', () => {
    it('vence el 30 y el corte es el 5 → se corta el 5 del mes SIGUIENTE, no el 31', () => {
      const due = new Date(2026, 8, 30, 23, 59, 59);
      const cut = cutDateFor(due, 5, 17);
      expect([cut.getMonth(), cut.getDate(), cut.getHours()]).toEqual([9, 5, 17]);
    });
    it('vence el 3 y el corte es el 5 → se corta el 5 del mismo mes', () => {
      const cut = cutDateFor(new Date(2026, 8, 3, 23, 59, 59), 5, 17);
      expect([cut.getMonth(), cut.getDate()]).toEqual([8, 5]);
    });
    it('cruza de diciembre a enero', () => {
      const cut = cutDateFor(new Date(2026, 11, 30, 23, 59, 59), 5, 17);
      expect([cut.getFullYear(), cut.getMonth(), cut.getDate()]).toEqual([2027, 0, 5]);
    });
  });
});
