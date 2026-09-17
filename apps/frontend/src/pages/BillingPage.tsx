import { useEffect, useState } from 'react';
import { Download } from 'lucide-react';
import { api } from '../lib/api';
import { StatusBadge } from '../components/StatusBadge';

export function BillingPage() {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [status, setStatus] = useState('');
  const [payingId, setPayingId] = useState<string | null>(null);
  const [payAmount, setPayAmount] = useState('');

  async function load() {
    const { data } = await api.get('/billing/invoices', { params: { status: status || undefined } });
    setInvoices(data.items);
  }

  useEffect(() => { load(); }, [status]);

  async function registerPayment(id: string) {
    await api.post(`/billing/invoices/${id}/payments`, { amount: Number(payAmount) });
    setPayingId(null);
    setPayAmount('');
    await load();
  }

  return (
    <div className="p-8 max-w-6xl">
      <h1 className="text-2xl font-display font-bold mb-1">Facturación</h1>
      <p className="text-muted text-sm mb-6">
        La suspensión automática por facturas vencidas corre todos los días — ver Configuración para ajustar los días de gracia.
      </p>

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

      <div className="border border-border rounded-md overflow-hidden">
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
            {invoices.map((inv) => (
              <tr key={inv.id} className="border-t border-border">
                <td className="px-4 py-3">{inv.number}</td>
                <td className="px-4 py-3">{inv.customer.firstName} {inv.customer.lastName}</td>
                <td className="px-4 py-3 text-muted">{new Date(inv.dueDate).toLocaleDateString('es-DO')}</td>
                <td className="px-4 py-3">${Number(inv.amount).toFixed(2)}</td>
                <td className="px-4 py-3"><StatusBadge status={inv.status} /></td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <a href={`${api.defaults.baseURL}/billing/invoices/${inv.id}/pdf`} target="_blank" rel="noreferrer" className="text-muted hover:text-ink">
                      <Download size={16} />
                    </a>
                    {inv.status !== 'PAID' && inv.status !== 'CANCELLED' && (
                      payingId === inv.id ? (
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            value={payAmount}
                            onChange={(e) => setPayAmount(e.target.value)}
                            className="w-20 bg-surface-raised border border-border rounded px-2 py-1 text-xs"
                            placeholder="Monto"
                          />
                          <button onClick={() => registerPayment(inv.id)} className="text-xs bg-signal text-base rounded px-2 py-1">OK</button>
                        </div>
                      ) : (
                        <button onClick={() => setPayingId(inv.id)} className="text-xs text-signal hover:underline">Registrar pago</button>
                      )
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
