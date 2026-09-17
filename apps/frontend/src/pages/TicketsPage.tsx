import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { StatusBadge } from '../components/StatusBadge';

const CATEGORY_LABELS: Record<string, string> = {
  SIN_INTERNET: 'Sin Internet', LENTITUD: 'Lentitud', WIFI: 'WiFi',
  ONU_OFFLINE: 'ONU offline', 'SEÑAL': 'Baja señal', PAGO: 'Pago', OTRO: 'Otro',
};

export function TicketsPage() {
  const [tickets, setTickets] = useState<any[]>([]);
  const [status, setStatus] = useState('');

  useEffect(() => {
    api.get('/tickets', { params: { status: status || undefined } }).then((res) => setTickets(res.data));
  }, [status]);

  return (
    <div className="p-8 max-w-5xl">
      <h1 className="text-2xl font-display font-bold mb-1">Tickets de soporte</h1>
      <p className="text-muted text-sm mb-6">Reportes de clientes: sin Internet, lentitud, WiFi, ONU offline, señal, pagos.</p>

      <div className="flex gap-2 mb-4">
        {['', 'OPEN', 'IN_PROGRESS', 'WAITING_CUSTOMER', 'RESOLVED', 'CLOSED'].map((s) => (
          <button
            key={s}
            onClick={() => setStatus(s)}
            className={`text-xs px-3 py-1.5 rounded-md border ${status === s ? 'bg-signal text-base border-signal' : 'border-border text-muted hover:text-ink'}`}
          >
            {s || 'Todos'}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {tickets.map((t) => (
          <div key={t.id} className="status-panel status-panel--neutral flex items-center justify-between">
            <div>
              <p className="font-medium">{t.subject}</p>
              <p className="text-xs text-muted">
                {t.customer.firstName} {t.customer.lastName} · {CATEGORY_LABELS[t.category] ?? t.category}
                {t.assignedTo && ` · Asignado a ${t.assignedTo.firstName} ${t.assignedTo.lastName}`}
              </p>
            </div>
            <StatusBadge status={t.status} />
          </div>
        ))}
        {tickets.length === 0 && <p className="text-muted text-sm">No hay tickets en este estado.</p>}
      </div>
    </div>
  );
}
