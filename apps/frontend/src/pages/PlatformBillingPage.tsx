import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { useToast } from '../components/Toast';

interface PlatformInvoice {
  id: string;
  organizationId: string;
  organization: { name: string; slug: string };
  period: string;
  clientCount: number;
  billableClients: number;
  amount: string;
  currency: string;
  status: 'PENDING' | 'PAID' | 'OVERDUE' | 'CANCELLED';
  dueDate: string;
  paidAt: string | null;
  paidMethod: string | null;
}

const FILTERS = [
  { value: '', label: 'Todas' },
  { value: 'OVERDUE', label: 'Vencidas' },
  { value: 'PENDING', label: 'Pendientes' },
  { value: 'PAID', label: 'Pagadas' },
];

const STATUS_CLASS: Record<PlatformInvoice['status'], string> = {
  PENDING: 'text-muted',
  PAID: 'text-ok',
  OVERDUE: 'text-critical',
  CANCELLED: 'text-muted',
};

export function PlatformBillingPage() {
  const [invoices, setInvoices] = useState<PlatformInvoice[]>([]);
  const [filter, setFilter] = useState('OVERDUE');
  const [loading, setLoading] = useState(true);
  const [payingId, setPayingId] = useState<string | null>(null);
  const toast = useToast();

  async function load() {
    setLoading(true);
    const res = await api.get('/platform/billing/invoices', { params: filter ? { status: filter } : {} });
    setInvoices(res.data);
    setLoading(false);
  }

  useEffect(() => { load(); }, [filter]);

  async function markPaid(invoice: PlatformInvoice) {
    const method = window.prompt('¿Cómo se recibió el pago? (ej. transferencia, efectivo)', 'transferencia');
    if (method === null) return;
    setPayingId(invoice.id);
    try {
      await api.post(`/platform/billing/invoices/${invoice.id}/mark-paid`, { method });
      toast.success(`Factura de ${invoice.organization.name} marcada como pagada.`);
      await load();
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'No se pudo marcar la factura como pagada.');
    } finally {
      setPayingId(null);
    }
  }

  return (
    <div className="p-8 max-w-5xl">
      <h1 className="text-2xl font-display font-bold mb-1">Cobros de la plataforma</h1>
      <p className="text-muted text-sm mb-6">
        Lo que cada ISP te debe a ti por usar el sistema. No hay pasarela de pago automática conectada todavía —
        marca aquí una factura como pagada apenas confirmes el pago por fuera (transferencia, efectivo, etc.).
      </p>

      <div className="flex gap-2 mb-4">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`text-xs px-3 py-1.5 rounded-md border ${
              filter === f.value ? 'bg-surface-raised border-signal text-ink' : 'border-border text-muted hover:text-ink'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="border border-border rounded-md overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-surface text-muted text-xs">
            <tr>
              <th className="text-left px-4 py-3">Organización</th>
              <th className="text-left px-4 py-3">Período</th>
              <th className="text-left px-4 py-3">Clientes facturables</th>
              <th className="text-left px-4 py-3">Monto</th>
              <th className="text-left px-4 py-3">Vence</th>
              <th className="text-left px-4 py-3">Estado</th>
              <th className="text-left px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {!loading && invoices.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-muted">Sin facturas para este filtro.</td>
              </tr>
            )}
            {invoices.map((inv) => (
              <tr key={inv.id} className="border-t border-border">
                <td className="px-4 py-3">
                  <p className="font-medium">{inv.organization.name}</p>
                  <p className="text-xs text-muted">{inv.organization.slug}</p>
                </td>
                <td className="px-4 py-3 text-muted">{inv.period}</td>
                <td className="px-4 py-3">{inv.billableClients}</td>
                <td className="px-4 py-3">{inv.currency} {Number(inv.amount).toFixed(2)}</td>
                <td className="px-4 py-3 text-muted">{new Date(inv.dueDate).toLocaleDateString('es')}</td>
                <td className={`px-4 py-3 font-medium ${STATUS_CLASS[inv.status]}`}>
                  {inv.status === 'PAID' ? `Pagada (${inv.paidMethod ?? ''})` : inv.status}
                </td>
                <td className="px-4 py-3">
                  {inv.status !== 'PAID' && inv.status !== 'CANCELLED' && (
                    <button
                      onClick={() => markPaid(inv)}
                      disabled={payingId === inv.id}
                      className="text-xs text-signal hover:underline disabled:opacity-50"
                    >
                      {payingId === inv.id ? 'Guardando…' : 'Marcar pagada'}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
