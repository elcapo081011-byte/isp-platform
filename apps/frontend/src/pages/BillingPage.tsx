import { useEffect, useMemo, useState } from 'react';
import { Download, DollarSign, Clock, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { api } from '../lib/api';
import { StatusBadge } from '../components/StatusBadge';
import { useToast } from '../components/Toast';

export function BillingPage() {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [status, setStatus] = useState('');
  const [payingId, setPayingId] = useState<string | null>(null);
  const [payAmount, setPayAmount] = useState('');
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  async function load() {
    setLoading(true);
    try {
      const { data } = await api.get('/billing/invoices', { params: { status: status || undefined } });
      setInvoices(data.items);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [status]);

  const totals = useMemo(() => {
    const sum = (pred: (i: any) => boolean) => invoices.filter(pred).reduce((acc, i) => acc + Number(i.amount), 0);
    return {
      paid: sum((i) => i.status === 'PAID'),
      pending: sum((i) => i.status === 'PENDING'),
      overdue: sum((i) => i.status === 'OVERDUE'),
    };
  }, [invoices]);

  async function registerPayment(id: string) {
    try {
      await api.post(`/billing/invoices/${id}/payments`, { amount: Number(payAmount) });
      setPayingId(null);
      setPayAmount('');
      toast.success('Pago registrado.');
      await load();
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'No se pudo registrar el pago.');
    }
  }

  return (
    <div className="p-8 max-w-6xl page-enter">
      <h1 className="text-2xl font-display font-bold mb-1">Facturación</h1>
      <p className="text-muted text-sm mb-6">
        La suspensión automática por facturas vencidas corre todos los días — ver Configuración para ajustar los días de gracia.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6 max-w-2xl">
        <SummaryCard icon={CheckCircle2} label="Pagado (filtro actual)" value={totals.paid} accent="ok" />
        <SummaryCard icon={Clock} label="Pendiente (filtro actual)" value={totals.pending} accent="warn" />
        <SummaryCard icon={AlertTriangle} label="Vencido (filtro actual)" value={totals.overdue} accent="critical" />
      </div>

      <div className="flex gap-2 mb-4">
        {['', 'PENDING', 'OVERDUE', 'PAID', 'PARTIAL'].map((s) => (
          <button
            key={s}
            onClick={() => setStatus(s)}
            className={`text-xs px-3 py-1.5 rounded-md border ${status === s ? 'bg-signal text-base border-signal' : 'border-border text-muted hover:text-ink'}`}
          >
            {s || 'Todas'}
          </button>
        ))}
      </div>

      <div className="border border-border rounded-md overflow-hidden overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-surface text-muted text-xs">
            <tr>
              <th className="text-left px-4 py-3">Factura</th>
              <th className="text-left px-4 py-3">Cliente</th>
              <th className="text-left px-4 py-3">Vence</th>
              <th className="text-left px-4 py-3">Monto</th>
              <th className="text-left px-4 py-3">Estado</th>
              <th className="text-left px-4 py-3">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-muted">
                  Cargando…
                </td>
              </tr>
            ) : invoices.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-muted">
                  Sin facturas en este estado.
                </td>
              </tr>
            ) : (
              invoices.map((inv) => (
                <tr key={inv.id} className="border-t border-border">
                  <td className="px-4 py-3">{inv.number}</td>
                  <td className="px-4 py-3">
                    {inv.customer.firstName} {inv.customer.lastName}
                  </td>
                  <td className="px-4 py-3 text-muted">{new Date(inv.dueDate).toLocaleDateString('es-DO')}</td>
                  <td className="px-4 py-3">${Number(inv.amount).toFixed(2)}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={inv.status} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <a
                        href={`${api.defaults.baseURL}/billing/invoices/${inv.id}/pdf`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-muted hover:text-ink"
                        aria-label="Descargar PDF"
                      >
                        <Download size={16} />
                      </a>
                      {inv.status !== 'PAID' &&
                        inv.status !== 'CANCELLED' &&
                        (payingId === inv.id ? (
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              value={payAmount}
                              onChange={(e) => setPayAmount(e.target.value)}
                              className="w-20 bg-surface-raised border border-border rounded px-2 py-1 text-xs"
                              placeholder="Monto"
                              autoFocus
                            />
                            <button onClick={() => registerPayment(inv.id)} className="text-xs bg-signal text-base rounded px-2 py-1">
                              OK
                            </button>
                          </div>
                        ) : (
                          <button onClick={() => setPayingId(inv.id)} className="text-xs text-signal hover:underline">
                            Registrar pago
                          </button>
                        ))}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SummaryCard({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: typeof DollarSign;
  label: string;
  value: number;
  accent: 'ok' | 'warn' | 'critical';
}) {
  return (
    <div className={`status-panel status-panel--${accent}`}>
      <Icon size={15} className="text-muted mb-2" />
      <p className="text-lg font-display font-bold">${value.toFixed(2)}</p>
      <p className="text-[11px] text-muted mt-0.5">{label}</p>
    </div>
  );
}
