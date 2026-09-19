import { FormEvent, useEffect, useState } from 'react';
import { AlertTriangle, Check, CreditCard } from 'lucide-react';
import { api } from '../lib/api';
import { useAuthStore } from '../store/auth.store';
import { useToast } from '../components/Toast';
import { Modal } from '../components/Modal';

interface Usage {
  plan: string;
  isActive: boolean;
  clientCount: number;
  tier: string;
  tierMaxClients: number | null;
  monthlyPrice: number;
  currency: string;
  nextTier: { name: string; maxClients: number | null; monthlyPrice: number } | null;
  isTrial: boolean;
  trialEndsAt: string | null;
  trialDaysLeft: number | null;
}

interface PlanOption {
  name: string;
  label: string;
  minClients: number;
  maxClients: number | null;
  monthlyPrice: number;
  isCurrent: boolean;
}

interface PlatformInvoice {
  id: string;
  period: string;
  clientCount: number;
  tier: string;
  amount: string;
  currency: string;
  status: 'PENDING' | 'PAID' | 'OVERDUE' | 'CANCELLED';
  issuedAt: string;
  dueDate: string;
  paidAt: string | null;
  paymentReportedAt: string | null;
  paymentReference: string | null;
}

const STATUS_LABEL: Record<PlatformInvoice['status'], string> = {
  PENDING: 'Pendiente',
  PAID: 'Pagada',
  OVERDUE: 'Vencida',
  CANCELLED: 'Cancelada',
};

const STATUS_CLASS: Record<PlatformInvoice['status'], string> = {
  PENDING: 'text-muted',
  PAID: 'text-ok',
  OVERDUE: 'text-critical',
  CANCELLED: 'text-muted',
};

function rangeLabel(p: PlanOption) {
  if (p.name === 'FREE') return `Hasta ${p.maxClients} clientes`;
  return p.maxClients ? `${p.minClients} a ${p.maxClients} clientes` : `Desde ${p.minClients} clientes, sin límite`;
}

const inputClass =
  'w-full bg-surface-raised border border-border rounded-md px-3 py-2 text-sm outline-none focus:border-signal transition-colors';

export function SubscriptionPage() {
  const toast = useToast();
  const canReport = useAuthStore((s) => s.user?.permissions?.includes('settings.manage')) ?? false;

  const [usage, setUsage] = useState<Usage | null>(null);
  const [plans, setPlans] = useState<PlanOption[]>([]);
  const [instructions, setInstructions] = useState<string | null>(null);
  const [invoices, setInvoices] = useState<PlatformInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [reporting, setReporting] = useState<PlatformInvoice | null>(null);
  const [reference, setReference] = useState('');
  const [saving, setSaving] = useState(false);

  async function load() {
    try {
      const [usageRes, plansRes, payRes, invoicesRes] = await Promise.all([
        api.get('/billing/subscription'),
        api.get('/billing/subscription/plans'),
        api.get('/billing/subscription/payment-info'),
        api.get('/billing/subscription/invoices'),
      ]);
      setUsage(usageRes.data);
      setPlans(plansRes.data.plans);
      setInstructions(payRes.data.instructions);
      setInvoices(invoicesRes.data);
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'No se pudo cargar tu suscripción.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function submitReport(e: FormEvent) {
    e.preventDefault();
    if (!reporting) return;
    setSaving(true);
    try {
      await api.post(`/billing/subscription/invoices/${reporting.id}/report-payment`, { reference });
      toast.success('Listo: avisamos al equipo de la plataforma. Cuando verifiquen el pago, la factura pasa a Pagada.');
      setReporting(null);
      setReference('');
      await load();
    } catch (err: any) {
      const msg = err?.response?.data?.message;
      toast.error(Array.isArray(msg) ? msg.join(' · ') : msg ?? 'No se pudo reportar el pago.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="p-8 max-w-4xl">
        <div className="h-6 w-48 bg-surface-raised rounded animate-pulse mb-3" />
        <div className="h-24 w-full bg-surface-raised rounded animate-pulse" />
      </div>
    );
  }

  if (!usage) {
    return (
      <div className="p-8 max-w-4xl">
        <h1 className="text-2xl font-display font-bold mb-2">Mi suscripción</h1>
        <p className="text-sm text-muted">No pudimos cargar los datos de tu suscripción. Recarga la página para intentarlo de nuevo.</p>
      </div>
    );
  }

  const cap = usage.tierMaxClients ?? (usage.clientCount || 1);
  const usagePct = Math.min(100, Math.round((usage.clientCount / cap) * 100));
  const hasOverdue = invoices.some((i) => i.status === 'OVERDUE');
  const openInvoices = invoices.filter((i) => i.status === 'PENDING' || i.status === 'OVERDUE');

  return (
    <div className="p-8 max-w-4xl">
      <h1 className="text-2xl font-display font-bold mb-1">Mi suscripción</h1>
      <p className="text-muted text-sm mb-6">
        Esto es lo que le pagas a la plataforma por usarla — no tiene relación con lo que tú les cobras a tus clientes.
      </p>

      {!usage.isActive && (
        <div className="status-panel status-panel--critical mb-4 flex items-start gap-2">
          <AlertTriangle size={16} className="text-critical mt-0.5 shrink-0" />
          <p className="text-sm">
            Tu cuenta está <strong>suspendida por falta de pago</strong>. Regulariza la factura vencida para volver a operar.
          </p>
        </div>
      )}

      {usage.isTrial && (
        <div className="status-panel status-panel--neutral mb-4">
          <p className="text-sm">
            Estás en período de prueba: <strong>{usage.trialDaysLeft} día(s)</strong> restantes.
          </p>
        </div>
      )}

      {hasOverdue && usage.isActive && (
        <div className="status-panel status-panel--warn mb-4 flex items-start gap-2">
          <AlertTriangle size={16} className="text-warn mt-0.5 shrink-0" />
          <p className="text-sm">Tienes una factura vencida. La cuenta se suspende automáticamente si no se regulariza a tiempo.</p>
        </div>
      )}

      <div className="border border-border rounded-md p-5 mb-6">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-medium">Uso este mes</p>
          <span className="text-xs text-muted">Plan {plans.find((p) => p.isCurrent)?.label ?? usage.tier}</span>
        </div>
        <div className="flex items-end justify-between mb-2">
          <p className="text-3xl font-display font-bold">{usage.clientCount}</p>
          <p className="text-xs text-muted">
            {usage.tierMaxClients ? `de ${usage.tierMaxClients} clientes en tu plan` : 'clientes (plan sin límite)'}
          </p>
        </div>
        <div className="h-2 w-full bg-surface-raised rounded-full overflow-hidden mb-3">
          <div className={`h-full rounded-full ${usage.monthlyPrice > 0 ? 'bg-signal' : 'bg-ok'}`} style={{ width: `${usagePct}%` }} />
        </div>
        {usage.monthlyPrice > 0 ? (
          <p className="text-sm text-muted">
            Tu plan cuesta <strong>{usage.currency} {usage.monthlyPrice.toFixed(2)}/mes</strong>.
          </p>
        ) : (
          <p className="text-sm text-muted">Estás en el plan gratis — no se genera cobro este mes.</p>
        )}
        {usage.nextTier && (
          <p className="text-xs text-muted mt-1">
            Si superas los {usage.tierMaxClients} clientes, pasas al siguiente plan ({usage.currency} {usage.nextTier.monthlyPrice.toFixed(2)}/mes).
          </p>
        )}
      </div>

      <h2 className="text-lg font-display font-bold mb-1">Planes</h2>
      <p className="text-muted text-sm mb-3">
        No tienes que elegir ni comprar por adelantado: la plataforma te ubica en el plan que corresponde a tu número de
        clientes y te factura una mensualidad fija (sin cobro por cliente extra). Sin contratos forzosos.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {plans.map((p) => (
          <div
            key={p.name}
            className={`rounded-md border p-4 ${p.isCurrent ? 'border-signal bg-signal/5' : 'border-border bg-surface'}`}
          >
            <div className="flex items-center justify-between mb-2">
              <p className="font-display font-bold">{p.label}</p>
              {p.isCurrent && (
                <span className="inline-flex items-center gap-1 text-[10px] text-signal border border-signal/40 rounded px-1.5 py-0.5">
                  <Check size={10} /> Tu plan
                </span>
              )}
            </div>
            <p className="text-2xl font-display font-bold">
              {p.monthlyPrice === 0 ? 'Gratis' : `${usage.currency} ${p.monthlyPrice}`}
              {p.monthlyPrice > 0 && <span className="text-xs text-muted font-normal"> /mes</span>}
            </p>
            <p className="text-xs text-muted mt-1">{rangeLabel(p)}</p>
          </div>
        ))}
      </div>

      <div className="border border-border rounded-md p-5 mb-6">
        <div className="flex items-start gap-3">
          <CreditCard size={18} className="text-muted mt-0.5 shrink-0" />
          <div className="text-sm">
            <p className="font-medium mb-1">Cómo pagar</p>
            {instructions ? (
              <p className="text-muted whitespace-pre-wrap">{instructions}</p>
            ) : (
              <p className="text-muted">
                El equipo de la plataforma todavía no publicó instrucciones de pago. Contáctalos para coordinar la transferencia
                o el método que prefieran.
              </p>
            )}
            <p className="text-xs text-muted mt-3">
              Aún no hay cobro automático con tarjeta. Después de pagar, usa <strong>“Ya pagué”</strong> en la factura para avisar;
              cuando el equipo lo verifique la factura pasa a Pagada y tu cuenta se reactiva enseguida si estaba suspendida.
            </p>
          </div>
        </div>
      </div>

      <div className="border border-border rounded-md overflow-hidden mb-6">
        <div className="px-4 py-3 border-b border-border">
          <p className="text-sm font-medium">Facturas de la plataforma</p>
        </div>
        {invoices.length === 0 ? (
          <p className="px-4 py-6 text-sm text-muted text-center">Todavía no hay facturas — llegarán cuando superes el límite gratis.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-surface text-muted text-xs">
                <tr>
                  <th className="text-left px-4 py-2">Período</th>
                  <th className="text-left px-4 py-2">Plan</th>
                  <th className="text-left px-4 py-2">Monto</th>
                  <th className="text-left px-4 py-2">Vence</th>
                  <th className="text-left px-4 py-2">Estado</th>
                  <th className="px-4 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv) => (
                  <tr key={inv.id} className="border-t border-border">
                    <td className="px-4 py-2">{inv.period}</td>
                    <td className="px-4 py-2 text-muted">{inv.tier} ({inv.clientCount} clientes)</td>
                    <td className="px-4 py-2">{inv.currency} {Number(inv.amount).toFixed(2)}</td>
                    <td className="px-4 py-2 text-muted">{new Date(inv.dueDate).toLocaleDateString('es')}</td>
                    <td className={`px-4 py-2 font-medium ${STATUS_CLASS[inv.status]}`}>{STATUS_LABEL[inv.status]}</td>
                    <td className="px-4 py-2 text-right whitespace-nowrap">
                      {(inv.status === 'PENDING' || inv.status === 'OVERDUE') &&
                        (inv.paymentReportedAt ? (
                          <span className="text-xs text-muted">Pago reportado, en verificación</span>
                        ) : (
                          canReport && (
                            <button onClick={() => { setReporting(inv); setReference(''); }} className="text-xs text-signal hover:underline">
                              Ya pagué
                            </button>
                          )
                        ))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {openInvoices.length > 0 && !canReport && (
        <p className="text-xs text-muted">Solo el dueño de la cuenta puede avisar un pago.</p>
      )}

      {reporting && (
        <Modal
          title="Avisar que ya pagaste"
          subtitle={`Factura ${reporting.period} · ${reporting.currency} ${Number(reporting.amount).toFixed(2)}`}
          onClose={() => setReporting(null)}
        >
          <form onSubmit={submitReport} className="space-y-4">
            <div>
              <label className="block text-sm text-muted mb-1.5">Referencia del pago</label>
              <input
                required
                minLength={3}
                maxLength={200}
                autoFocus
                placeholder="ej. Transferencia #48213 del 03/10"
                className={inputClass}
                value={reference}
                onChange={(e) => setReference(e.target.value)}
              />
              <p className="text-xs text-muted mt-1.5">
                El equipo de la plataforma la usará para encontrar tu pago y marcar la factura como pagada.
              </p>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setReporting(null)} className="text-sm text-muted hover:text-ink px-4 py-2">Cancelar</button>
              <button type="submit" disabled={saving} className="bg-signal text-base text-sm font-medium rounded-md px-5 py-2 disabled:opacity-50">
                {saving ? 'Enviando…' : 'Avisar pago'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
