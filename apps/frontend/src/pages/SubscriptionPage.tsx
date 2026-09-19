import { useEffect, useState } from 'react';
import { CreditCard, AlertTriangle, Check } from 'lucide-react';
import { api } from '../lib/api';
import { useToast } from '../components/Toast';

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

interface Tier {
  name: string;
  maxClients: number | null;
  monthlyPrice: number;
}

const TIER_LABEL: Record<string, string> = { FREE: 'Gratis', BASIC: 'Básico', PRO: 'Pro', ENTERPRISE: 'Ilimitado' };

export function SubscriptionPage() {
  const [usage, setUsage] = useState<Usage | null>(null);
  const [invoices, setInvoices] = useState<PlatformInvoice[]>([]);
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [requesting, setRequesting] = useState<string | null>(null);
  const [requestedTier, setRequestedTier] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  useEffect(() => {
    (async () => {
      const [usageRes, invoicesRes, tiersRes] = await Promise.all([
        api.get('/billing/subscription'),
        api.get('/billing/subscription/invoices'),
        api.get('/billing/subscription/tiers'),
      ]);
      setUsage(usageRes.data);
      setInvoices(invoicesRes.data);
      setTiers(tiersRes.data);
      setLoading(false);
    })();
  }, []);

  async function requestUpgrade(tierName: string) {
    setRequesting(tierName);
    try {
      await api.post('/billing/subscription/upgrade-request', { tier: tierName });
      setRequestedTier(tierName);
      toast.success('Listo, le avisamos al equipo de la plataforma. Te van a contactar para coordinar el pago.');
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'No se pudo enviar la solicitud.');
    } finally {
      setRequesting(null);
    }
  }

  if (loading || !usage) {
    return (
      <div className="p-8 max-w-3xl">
        <div className="h-6 w-48 bg-surface-raised rounded animate-pulse mb-3" />
        <div className="h-24 w-full bg-surface-raised rounded animate-pulse" />
      </div>
    );
  }

  const cap = usage.tierMaxClients ?? (usage.clientCount || 1);
  const usagePct = Math.min(100, Math.round((usage.clientCount / cap) * 100));
  const hasOverdue = invoices.some((i) => i.status === 'OVERDUE');

  return (
    <div className="p-8 max-w-3xl">
      <h1 className="text-2xl font-display font-bold mb-1">Mi suscripción</h1>
      <p className="text-muted text-sm mb-6">Esto es lo que le pagas a la plataforma por usarla — no tiene relación con lo que tú les cobras a tus clientes.</p>

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
          <span className="text-xs text-muted">Plan {usage.tier}</span>
        </div>
        <div className="flex items-end justify-between mb-2">
          <p className="text-3xl font-display font-bold">{usage.clientCount}</p>
          <p className="text-xs text-muted">
            {usage.tierMaxClients ? `de ${usage.tierMaxClients} clientes en el plan ${usage.tier}` : 'clientes (plan sin límite)'}
          </p>
        </div>
        <div className="h-2 w-full bg-surface-raised rounded-full overflow-hidden mb-3">
          <div className={`h-full rounded-full ${usage.monthlyPrice > 0 ? 'bg-signal' : 'bg-ok'}`} style={{ width: `${usagePct}%` }} />
        </div>
        {usage.monthlyPrice > 0 ? (
          <p className="text-sm text-muted">
            Tu plan {usage.tier} cuesta <strong>{usage.currency} {usage.monthlyPrice.toFixed(2)}/mes</strong>.
          </p>
        ) : (
          <p className="text-sm text-muted">Estás en el plan gratis — no se genera cobro este mes.</p>
        )}
        {usage.nextTier && (
          <p className="text-xs text-muted mt-1">
            Si superas los {usage.tierMaxClients} clientes, pasas al plan {usage.nextTier.name} ({usage.currency} {usage.nextTier.monthlyPrice.toFixed(2)}/mes).
          </p>
        )}
      </div>

      <div className="border border-border rounded-md overflow-hidden mb-6">
        <div className="px-4 py-3 border-b border-border">
          <p className="text-sm font-medium">Facturas de la plataforma</p>
        </div>
        {invoices.length === 0 ? (
          <p className="px-4 py-6 text-sm text-muted text-center">Todavía no hay facturas — llegarán cuando superes el límite gratis.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-surface text-muted text-xs">
              <tr>
                <th className="text-left px-4 py-2">Período</th>
                <th className="text-left px-4 py-2">Plan</th>
                <th className="text-left px-4 py-2">Monto</th>
                <th className="text-left px-4 py-2">Vence</th>
                <th className="text-left px-4 py-2">Estado</th>
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
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="border border-border rounded-md overflow-hidden mb-6">
        <div className="px-4 py-3 border-b border-border">
          <p className="text-sm font-medium">Planes disponibles</p>
          <p className="text-xs text-muted mt-0.5">Sin pasarela automática todavía: pide el plan y coordinamos el pago contigo.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-border">
          {tiers.map((t) => {
            const isCurrent = t.name === usage.tier;
            const alreadyRequested = requestedTier === t.name;
            return (
              <div key={t.name} className={`p-4 flex flex-col ${isCurrent ? 'bg-surface-raised' : ''}`}>
                <p className="text-xs uppercase tracking-wide text-muted mb-1">{TIER_LABEL[t.name] ?? t.name}</p>
                <p className="text-2xl font-display font-bold mb-1">
                  {t.monthlyPrice > 0 ? `${usage.currency} ${t.monthlyPrice}` : 'Gratis'}
                  {t.monthlyPrice > 0 && <span className="text-xs text-muted font-normal">/mes</span>}
                </p>
                <p className="text-xs text-muted mb-4">{t.maxClients ? `Hasta ${t.maxClients} clientes` : 'Clientes ilimitados'}</p>
                {isCurrent ? (
                  <span className="mt-auto flex items-center gap-1 text-xs text-ok font-medium"><Check size={14} /> Tu plan actual</span>
                ) : (
                  <button
                    onClick={() => requestUpgrade(t.name)}
                    disabled={requesting === t.name || alreadyRequested}
                    className="mt-auto text-xs bg-signal text-base font-medium rounded-md px-3 py-1.5 hover:opacity-90 transition-opacity disabled:opacity-50"
                  >
                    {alreadyRequested ? 'Solicitado ✓' : requesting === t.name ? 'Enviando…' : 'Quiero este plan'}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="border border-border rounded-md p-5 flex items-start gap-3">
        <CreditCard size={18} className="text-muted mt-0.5 shrink-0" />
        <div className="text-sm text-muted">
          <p className="mb-1">
            Todavía no hay pago automático con tarjeta conectado. Para pagar una factura, contacta al equipo de la plataforma y coordina el pago; una vez confirmado, lo marcamos como pagado desde nuestro lado y tu cuenta se reactiva enseguida si estaba suspendida.
          </p>
        </div>
      </div>
    </div>
  );
}
