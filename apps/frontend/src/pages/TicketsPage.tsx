import { FormEvent, useEffect, useState } from 'react';
import { Plus, X, Send } from 'lucide-react';
import { api } from '../lib/api';
import { StatusBadge } from '../components/StatusBadge';
import { Drawer } from '../components/Drawer';
import { useToast } from '../components/Toast';

const CATEGORY_LABELS: Record<string, string> = {
  SIN_INTERNET: 'Sin Internet',
  LENTITUD: 'Lentitud',
  WIFI: 'WiFi',
  ONU_OFFLINE: 'ONU offline',
  SEÑAL: 'Baja señal',
  PAGO: 'Pago',
  OTRO: 'Otro',
};
const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];
const STATUSES = ['OPEN', 'IN_PROGRESS', 'WAITING_CUSTOMER', 'RESOLVED', 'CLOSED'];

function fieldClass() {
  return 'w-full bg-surface-raised border border-border rounded-md px-3 py-2 text-sm outline-none focus:border-signal transition-colors';
}
function labelClass() {
  return 'block text-xs text-muted mb-1.5';
}

export function TicketsPage() {
  const [tickets, setTickets] = useState<any[]>([]);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [customers, setCustomers] = useState<any[]>([]);
  const [form, setForm] = useState({ customerId: '', subject: '', category: 'SIN_INTERNET', priority: 'MEDIUM' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const toast = useToast();

  async function load() {
    setLoading(true);
    try {
      const { data } = await api.get('/tickets', { params: { status: status || undefined } });
      setTickets(data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [status]);

  function openCreate() {
    setForm({ customerId: '', subject: '', category: 'SIN_INTERNET', priority: 'MEDIUM' });
    setError(null);
    setModalOpen(true);
    if (customers.length === 0) {
      api.get('/customers', { params: { pageSize: 100 } }).then((res) => setCustomers(res.data.items));
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await api.post('/tickets', form);
      setModalOpen(false);
      toast.success('Ticket creado.');
      await load();
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'No se pudo crear el ticket.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-8 max-w-5xl page-enter">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-display font-bold mb-1">Tickets de soporte</h1>
          <p className="text-muted text-sm">Reportes de clientes: sin Internet, lentitud, WiFi, ONU offline, señal, pagos.</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 bg-signal text-base text-sm font-medium rounded-md px-4 py-2 hover:opacity-90 transition-opacity shrink-0"
        >
          <Plus size={16} /> Nuevo ticket
        </button>
      </div>

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
        {loading ? (
          <p className="text-muted text-sm">Cargando…</p>
        ) : tickets.length === 0 ? (
          <p className="text-muted text-sm">No hay tickets en este estado.</p>
        ) : (
          tickets.map((t) => (
            <button
              key={t.id}
              onClick={() => setSelectedId(t.id)}
              className="w-full text-left status-panel status-panel--neutral flex items-center justify-between lift-on-hover"
            >
              <div>
                <p className="font-medium">{t.subject}</p>
                <p className="text-xs text-muted">
                  {t.customer.firstName} {t.customer.lastName} · {CATEGORY_LABELS[t.category] ?? t.category}
                  {t.assignedTo && ` · Asignado a ${t.assignedTo.firstName} ${t.assignedTo.lastName}`}
                </p>
              </div>
              <StatusBadge status={t.status} />
            </button>
          ))
        )}
      </div>

      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 backdrop-blur-sm p-6 pt-[8vh]"
          onClick={() => setModalOpen(false)}
        >
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-lg bg-surface border border-border rounded-lg shadow-2xl">
            <div className="flex items-start justify-between border-b border-border px-6 py-4">
              <h2 className="font-display font-bold text-lg">Nuevo ticket</h2>
              <button onClick={() => setModalOpen(false)} className="text-muted hover:text-ink p-1 -mr-1 -mt-1" aria-label="Cerrar">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
              {error && <div className="status-panel status-panel--critical text-sm text-critical py-2.5">{error}</div>}

              <div>
                <label className={labelClass()}>Cliente</label>
                <select
                  required
                  value={form.customerId}
                  onChange={(e) => setForm({ ...form, customerId: e.target.value })}
                  className={fieldClass()}
                >
                  <option value="">Selecciona un cliente…</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.firstName} {c.lastName}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className={labelClass()}>Asunto</label>
                <input
                  required
                  minLength={3}
                  value={form.subject}
                  onChange={(e) => setForm({ ...form, subject: e.target.value })}
                  className={fieldClass()}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={labelClass()}>Categoría</label>
                  <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className={fieldClass()}>
                    {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelClass()}>Prioridad</label>
                  <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} className={fieldClass()}>
                    {PRIORITIES.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setModalOpen(false)} className="text-sm text-muted hover:text-ink px-4 py-2">
                  Cancelar
                </button>
                <button type="submit" disabled={saving} className="bg-signal text-base text-sm font-medium rounded-md px-5 py-2 disabled:opacity-50">
                  {saving ? 'Creando…' : 'Crear ticket'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selectedId && (
        <TicketDrawer
          id={selectedId}
          onClose={() => setSelectedId(null)}
          onChanged={load}
        />
      )}
    </div>
  );
}

function TicketDrawer({ id, onClose, onChanged }: { id: string; onClose: () => void; onChanged: () => void }) {
  const [ticket, setTicket] = useState<any>(null);
  const [comment, setComment] = useState('');
  const [posting, setPosting] = useState(false);
  const [changingStatus, setChangingStatus] = useState(false);
  const toast = useToast();

  async function load() {
    const { data } = await api.get(`/tickets/${id}`);
    setTicket(data);
  }

  useEffect(() => {
    load();
  }, [id]);

  async function addComment() {
    if (!comment.trim()) return;
    setPosting(true);
    try {
      await api.post(`/tickets/${id}/comments`, { body: comment });
      setComment('');
      await load();
    } finally {
      setPosting(false);
    }
  }

  async function changeStatus(newStatus: string) {
    setChangingStatus(true);
    try {
      await api.put(`/tickets/${id}/status`, { status: newStatus });
      toast.success('Estado actualizado.');
      await load();
      onChanged();
    } finally {
      setChangingStatus(false);
    }
  }

  if (!ticket) {
    return (
      <Drawer title="Cargando…" onClose={onClose}>
        <p className="text-sm text-muted">Cargando ticket…</p>
      </Drawer>
    );
  }

  return (
    <Drawer title={ticket.subject} subtitle={`${ticket.customer.firstName} ${ticket.customer.lastName}`} onClose={onClose} width="md">
      <div className="space-y-5">
        <div className="flex items-center gap-2 flex-wrap">
          <StatusBadge status={ticket.status} />
          <span className="text-xs text-muted">{CATEGORY_LABELS[ticket.category] ?? ticket.category}</span>
          <span className="text-xs text-muted">· {ticket.priority}</span>
        </div>

        <div>
          <label className={labelClass()}>Cambiar estado</label>
          <select
            value={ticket.status}
            disabled={changingStatus}
            onChange={(e) => changeStatus(e.target.value)}
            className={fieldClass()}
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        <div>
          <p className="text-xs font-medium text-muted mb-2 uppercase tracking-wide">Comentarios</p>
          {ticket.comments.length === 0 ? (
            <p className="text-sm text-muted">Sin comentarios todavía.</p>
          ) : (
            <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
              {ticket.comments.map((c: any) => (
                <div key={c.id} className="text-sm">
                  <p className="text-xs text-muted mb-0.5">
                    {c.author ? `${c.author.firstName} ${c.author.lastName}` : 'Sistema'} · {new Date(c.createdAt).toLocaleString('es-DO')}
                  </p>
                  <p>{c.body}</p>
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-2 mt-3">
            <input
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addComment()}
              placeholder="Escribe un comentario…"
              className={fieldClass()}
            />
            <button
              onClick={addComment}
              disabled={posting || !comment.trim()}
              className="bg-signal text-base rounded-md px-3 disabled:opacity-50 shrink-0"
              aria-label="Enviar comentario"
            >
              <Send size={14} />
            </button>
          </div>
        </div>
      </div>
    </Drawer>
  );
}
