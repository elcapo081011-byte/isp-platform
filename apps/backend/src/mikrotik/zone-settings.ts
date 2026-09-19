/**
 * Pestaña "Facturación - Zona" de cada router (equivalente a la zona de
 * WispHub). Un router con `zone` configurada se factura y se corta con estas
 * reglas; un router sin `zone` (null) sigue usando las reglas globales de la
 * cuenta (`suspension_rules`), como antes.
 *
 * Solo hay campos que el motor realmente ejecuta (ZoneBillingEngine).
 * Lo que WispHub ofrece y aquí aún no existe (prepago, SMS/WhatsApp, push,
 * avisos en pantalla) NO está en este modelo y la UI lo muestra como "pronto".
 */
export interface ZoneBillingSettings {
  /** Solo postpago está implementado. */
  billingType: 'POSTPAID';

  autoInvoices: boolean;
  invoiceDay: number; // 1-31 (si el mes es más corto se usa su último día)
  invoiceHour: number; // 0-23, hora del servidor
  payDay: number; // día de vencimiento de la factura generada

  autoReminders: boolean;
  reminderDay: number;
  reminderHour: number;

  autoCut: boolean;
  cutDay: number;
  cutHour: number;
  /** Cuántas facturas vencidas debe tener un cliente para ser cortado. */
  suspendAfterInvoices: number;

  /** % que se suma a cada factura generada automáticamente. */
  taxPercent: number;

  emailOnInvoice: boolean;
  emailOnCut: boolean;
}

// Mismos valores de ejemplo que muestra WispHub (crear día 25, pagar día 30,
// recordar día 28, cortar día 5, 1 factura vencida).
export const DEFAULT_ZONE_SETTINGS: ZoneBillingSettings = {
  billingType: 'POSTPAID',
  autoInvoices: true,
  invoiceDay: 25,
  invoiceHour: 17,
  payDay: 30,
  autoReminders: true,
  reminderDay: 28,
  reminderHour: 17,
  autoCut: true,
  cutDay: 5,
  cutHour: 17,
  suspendAfterInvoices: 1,
  taxPercent: 0,
  emailOnInvoice: true,
  emailOnCut: true,
};

const clamp = (n: unknown, min: number, max: number, fallback: number) => {
  const v = Number(n);
  return Number.isFinite(v) ? Math.min(max, Math.max(min, Math.round(v))) : fallback;
};
const bool = (v: unknown, fallback: boolean) => (typeof v === 'boolean' ? v : fallback);

/** Completa y sanea lo guardado en BD (o recibido del cliente) con valores válidos. */
export function normalizeZone(raw: Partial<ZoneBillingSettings> | null | undefined): ZoneBillingSettings {
  const d = DEFAULT_ZONE_SETTINGS;
  const r: any = raw ?? {};
  return {
    billingType: 'POSTPAID',
    autoInvoices: bool(r.autoInvoices, d.autoInvoices),
    invoiceDay: clamp(r.invoiceDay, 1, 31, d.invoiceDay),
    invoiceHour: clamp(r.invoiceHour, 0, 23, d.invoiceHour),
    payDay: clamp(r.payDay, 1, 31, d.payDay),
    autoReminders: bool(r.autoReminders, d.autoReminders),
    reminderDay: clamp(r.reminderDay, 1, 31, d.reminderDay),
    reminderHour: clamp(r.reminderHour, 0, 23, d.reminderHour),
    autoCut: bool(r.autoCut, d.autoCut),
    cutDay: clamp(r.cutDay, 1, 31, d.cutDay),
    cutHour: clamp(r.cutHour, 0, 23, d.cutHour),
    suspendAfterInvoices: clamp(r.suspendAfterInvoices, 1, 12, d.suspendAfterInvoices),
    taxPercent: clamp(r.taxPercent, 0, 100, d.taxPercent),
    emailOnInvoice: bool(r.emailOnInvoice, d.emailOnInvoice),
    emailOnCut: bool(r.emailOnCut, d.emailOnCut),
  };
}

// ---- Fechas -------------------------------------------------------------

export function daysInMonth(year: number, monthIndex: number): number {
  return new Date(year, monthIndex + 1, 0).getDate();
}

/** El día configurado, o el último del mes si el mes es más corto (día 31 en febrero → 28/29). */
export function effectiveDay(year: number, monthIndex: number, day: number): number {
  return Math.min(day, daysInMonth(year, monthIndex));
}

/** ¿Hoy es exactamente ese día del mes y ya pasó (o es) esa hora? */
export function isDayAndHour(now: Date, day: number, hour: number): boolean {
  return now.getDate() === effectiveDay(now.getFullYear(), now.getMonth(), day) && now.getHours() >= hour;
}

/** Igual que isDayAndHour pero SOLO durante esa hora (para acciones que no deben repetirse, como recordatorios). */
export function isExactDayAndHour(now: Date, day: number, hour: number): boolean {
  return now.getDate() === effectiveDay(now.getFullYear(), now.getMonth(), day) && now.getHours() === hour;
}

/**
 * Momento en que corresponde cortar por una factura: la PRIMERA vez que llega
 * el día/hora de corte DESPUÉS de su vencimiento. Ej.: vence el 30, corte día 5
 * → se corta el día 5 del mes siguiente (no antes); vence el 3, corte día 5
 * → se corta el 5 del mismo mes.
 */
export function cutDateFor(dueDate: Date, cutDay: number, cutHour: number): Date {
  let y = dueDate.getFullYear();
  let m = dueDate.getMonth();
  let candidate = new Date(y, m, effectiveDay(y, m, cutDay), cutHour, 0, 0);
  if (candidate.getTime() <= dueDate.getTime()) {
    m += 1;
    if (m > 11) {
      m = 0;
      y += 1;
    }
    candidate = new Date(y, m, effectiveDay(y, m, cutDay), cutHour, 0, 0);
  }
  return candidate;
}

/**
 * Vencimiento de la factura que se emite hoy: el próximo `payDay` a partir de
 * hoy. Si el día de pago es anterior al día de emisión, cae en el mes siguiente.
 */
export function nextDueDate(issuedAt: Date, payDay: number): Date {
  let y = issuedAt.getFullYear();
  let m = issuedAt.getMonth();
  if (payDay < issuedAt.getDate()) {
    m += 1;
    if (m > 11) {
      m = 0;
      y += 1;
    }
  }
  return new Date(y, m, effectiveDay(y, m, payDay), 23, 59, 59);
}
