import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Search, Plus, Download, ChevronUp, ChevronDown, ExternalLink, PauseCircle, PlayCircle, Columns3, X } from 'lucide-react';
import { api } from '../lib/api';
import { Customer } from '../lib/types';
import { StatusBadge } from '../components/StatusBadge';
import { Drawer } from '../components/Drawer';
import { SkeletonRow } from '../components/Skeleton';
import { useToast } from '../components/Toast';
import { useConfirm } from '../components/ConfirmDialog';

const PAGE_SIZE = 20;
type SortKey = 'name' | 'status';
type ColumnKey = 'plan' | 'pppoe' | 'technician';
const COLUMN_LABELS: Record<ColumnKey, string> = { plan: 'Plan', pppoe: 'Usuario PPPoE', technician: 'Técnico' };

export function CustomersListPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [items, setItems] = useState<Customer[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState(searchParams.get('status') ?? '');
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState<{ key: SortKey; dir: 'asc' | 'desc' }>({ key: 'name', dir: 'asc' });
  const [selected, setSelected] = useState<Customer | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [columns, setColumns] = useState<Set<ColumnKey>>(new Set(['plan', 'pppoe', 'technician']));
  const [columnsOpen, setColumnsOpen] = useState(false);
  const toast = useToast();
  const confirm = useConfirm();

  useEffect(() => {
    setPage(1);
  }, [search, status]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setLoading(true);
      api
        .get('/customers', { params: { search: search || undefined, status: status || undefined, page, pageSize: PAGE_SIZE } })
        .then((res) => {
          setItems(res.data.items);
          setTotal(res.data.total ?? res.data.items.length);
        })
        .finally(() => setLoading(false));
    }, 300);
    return () => clearTimeout(timeout);
  }, [search, status, page]);

  const sorted = useMemo(() => {
    const copy = [...items];
    copy.sort((a, b) => {
      let cmp = 0;
      if (sort.key === 'name') cmp = `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`);
      if (sort.key === 'status') cmp = a.status.localeCompare(b.status);
      return sort.dir === 'asc' ? cmp : -cmp;
    });
    return copy;
  }, [items, sort]);

  function toggleSort(key: SortKey) {
    setSort((s) => (s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' }));
  }

  function exportCsv() {
    const header = ['Nombre', 'Documento', 'Teléfono', 'Plan', 'Usuario PPPoE', 'Técnico', 'Estado'];
    const rows = sorted.map((c) => [
      `${c.firstName} ${c.lastName}`,
      c.documentId ?? '',
      c.phone ?? '',
      c.services[0]?.plan?.name ?? '',
      c.services[0]?.pppoeUsername ?? '',
      c.technician ? `${c.technician.firstName} ${c.technician.lastName}` : '',
      c.status,
    ]);
    const csv = [header, ...rows].map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `clientes_pagina_${page}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function reload() {
    setLoading(true);
    return api
      .get('/customers', { params: { search: search || undefined, status: status || undefined, page, pageSize: PAGE_SIZE } })
      .then((res) => {
        setItems(res.data.items);
        setTotal(res.data.total ?? res.data.items.length);
      })
      .finally(() => setLoading(false));
  }

  function toggleColumn(key: ColumnKey) {
    setColumns((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }

  function toggleSelectRow(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    setSelectedIds((prev) => (prev.size === sorted.length ? new Set() : new Set(sorted.map((c) => c.id))));
  }

  async function bulkAction(action: 'suspend' | 'reactivate') {
    const ok = await confirm({
      title: action === 'suspend' ? `¿Suspender ${selectedIds.size} cliente(s)?` : `¿Reactivar ${selectedIds.size} cliente(s)?`,
      danger: action === 'suspend',
      confirmLabel: action === 'suspend' ? 'Suspender' : 'Reactivar',
    });
    if (!ok) return;
    await Promise.all(
      Array.from(selectedIds).map((id) =>
        api.post(`/customers/${id}/${action}`, action === 'suspend' ? { reason: 'Suspensión masiva desde el panel' } : {}).catch(() => null),
      ),
    );
    toast.success('Cambios aplicados.');
    setSelectedIds(new Set());
    await reload();
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="p-8 max-w-7xl page-enter">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-display font-bold mb-1">Clientes</h1>
          <p className="text-muted text-sm">Busca por nombre, documento, teléfono o usuario PPPoE.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <button
              onClick={() => setColumnsOpen((v) => !v)}
              className="flex items-center gap-2 border border-border text-sm rounded-md px-3 py-2 text-muted hover:text-ink"
            >
              <Columns3 size={15} /> Columnas
            </button>
            {columnsOpen && (
              <div className="absolute right-0 top-full mt-1.5 w-48 bg-surface border border-border rounded-md shadow-2xl overflow-hidden z-20 p-2">
                {(Object.keys(COLUMN_LABELS) as ColumnKey[]).map((key) => (
                  <label key={key} className="flex items-center gap-2 px-2 py-1.5 text-sm hover:bg-surface-raised rounded cursor-pointer">
                    <input type="checkbox" checked={columns.has(key)} onChange={() => toggleColumn(key)} className="rounded border-border accent-signal" />
                    {COLUMN_LABELS[key]}
                  </label>
                ))}
              </div>
            )}
          </div>
          <button
            onClick={exportCsv}
            disabled={items.length === 0}
            className="flex items-center gap-2 border border-border text-sm rounded-md px-3 py-2 text-muted hover:text-ink disabled:opacity-40"
          >
            <Download size={15} /> Exportar página
          </button>
          <button
            onClick={() => navigate('/clientes/nuevo')}
            className="flex items-center gap-2 bg-signal text-base text-sm font-medium rounded-md px-4 py-2 hover:opacity-90 transition-opacity"
          >
            <Plus size={16} /> Nuevo cliente
          </button>
        </div>
      </div>

      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 mb-3 bg-surface-raised border border-border rounded-md px-4 py-2.5 text-sm">
          <span>{selectedIds.size} seleccionado(s)</span>
          <div className="flex gap-2 ml-auto">
            <button onClick={() => bulkAction('reactivate')} className="text-xs border border-border rounded px-2.5 py-1 text-ok hover:bg-ok/10">
              Reactivar
            </button>
            <button onClick={() => bulkAction('suspend')} className="text-xs border border-border rounded px-2.5 py-1 text-critical hover:bg-critical/10">
              Suspender
            </button>
          </div>
          <button onClick={() => setSelectedIds(new Set())} className="text-muted hover:text-ink" aria-label="Deseleccionar todo">
            <X size={14} />
          </button>
        </div>
      )}

      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar cliente…"
            className="w-full bg-surface border border-border rounded-md pl-9 pr-3 py-2 text-sm outline-none focus:border-signal"
          />
        </div>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="bg-surface border border-border rounded-md px-3 py-2 text-sm outline-none focus:border-signal"
        >
          <option value="">Todos los estados</option>
          <option value="ACTIVE">Activo</option>
          <option value="SUSPENDED">Suspendido</option>
          <option value="DISCONNECTED">Desconectado</option>
          <option value="PENDING_INSTALLATION">Por instalar</option>
        </select>
      </div>

      <div className="border border-border rounded-md overflow-hidden overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-surface text-muted text-xs">
            <tr>
              <th className="px-4 py-3 w-10">
                <input
                  type="checkbox"
                  checked={sorted.length > 0 && selectedIds.size === sorted.length}
                  onChange={toggleSelectAll}
                  className="rounded border-border accent-signal"
                  aria-label="Seleccionar todos"
                />
              </th>
              <SortableHeader label="Cliente" active={sort.key === 'name'} dir={sort.dir} onClick={() => toggleSort('name')} />
              {columns.has('plan') && <th className="text-left px-4 py-3 font-medium">Plan</th>}
              {columns.has('pppoe') && <th className="text-left px-4 py-3 font-medium">Usuario PPPoE</th>}
              {columns.has('technician') && <th className="text-left px-4 py-3 font-medium">Técnico</th>}
              <SortableHeader label="Estado" active={sort.key === 'status'} dir={sort.dir} onClick={() => toggleSort('status')} />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} cols={5} />)
            ) : sorted.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-muted">
                  Sin resultados
                </td>
              </tr>
            ) : (
              sorted.map((c) => (
                <tr key={c.id} className="border-t border-border hover:bg-surface-raised/50 transition-colors">
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selectedIds.has(c.id)}
                      onChange={() => toggleSelectRow(c.id)}
                      className="rounded border-border accent-signal"
                      aria-label={`Seleccionar ${c.firstName} ${c.lastName}`}
                    />
                  </td>
                  <td className="px-4 py-3 cursor-pointer" onClick={() => setSelected(c)}>
                    <p className="font-medium">
                      {c.firstName} {c.lastName}
                    </p>
                    <p className="text-xs text-muted">{c.documentId ?? '—'} · {c.phone ?? 'sin teléfono'}</p>
                  </td>
                  {columns.has('plan') && (
                    <td className="px-4 py-3 cursor-pointer" onClick={() => setSelected(c)}>
                      {c.services[0]?.plan?.name ?? '—'}
                    </td>
                  )}
                  {columns.has('pppoe') && (
                    <td className="px-4 py-3 text-muted cursor-pointer" onClick={() => setSelected(c)}>
                      {c.services[0]?.pppoeUsername ?? '—'}
                    </td>
                  )}
                  {columns.has('technician') && (
                    <td className="px-4 py-3 text-muted cursor-pointer" onClick={() => setSelected(c)}>
                      {c.technician ? `${c.technician.firstName} ${c.technician.lastName}` : '—'}
                    </td>
                  )}
                  <td className="px-4 py-3 cursor-pointer" onClick={() => setSelected(c)}>
                    <StatusBadge status={c.status} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {!loading && total > 0 && (
        <div className="flex items-center justify-between mt-4 text-xs text-muted">
          <span>
            {total} cliente{total !== 1 ? 's' : ''} · página {page} de {totalPages}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="border border-border rounded px-2.5 py-1 disabled:opacity-40 hover:text-ink"
            >
              Anterior
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="border border-border rounded px-2.5 py-1 disabled:opacity-40 hover:text-ink"
            >
              Siguiente
            </button>
          </div>
        </div>
      )}

      {selected && (
        <CustomerQuickDrawer
          customer={selected}
          onClose={() => setSelected(null)}
          onGoFull={() => navigate(`/clientes/${selected.id}`)}
          onChanged={reload}
          toast={toast}
          confirm={confirm}
        />
      )}
    </div>
  );
}

function SortableHeader({ label, active, dir, onClick }: { label: string; active: boolean; dir: 'asc' | 'desc'; onClick: () => void }) {
  return (
    <th className="text-left px-4 py-3 font-medium">
      <button onClick={onClick} className="flex items-center gap-1 hover:text-ink">
        {label}
        {active && (dir === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />)}
      </button>
    </th>
  );
}

function CustomerQuickDrawer({
  customer,
  onClose,
  onGoFull,
  onChanged,
  toast,
  confirm,
}: {
  customer: Customer;
  onClose: () => void;
  onGoFull: () => void;
  onChanged: () => void;
  toast: ReturnType<typeof useToast>;
  confirm: ReturnType<typeof useConfirm>;
}) {
  const [busy, setBusy] = useState(false);
  const [ticketOpen, setTicketOpen] = useState(false);
  const [ticketSubject, setTicketSubject] = useState('');
  const [creatingTicket, setCreatingTicket] = useState(false);
  const isSuspended = customer.status === 'SUSPENDED';
  const service = customer.services[0];

  async function toggleSuspension() {
    const ok = await confirm({
      title: isSuspended ? '¿Reactivar este cliente?' : '¿Suspender este cliente?',
      confirmLabel: isSuspended ? 'Reactivar' : 'Suspender',
      danger: !isSuspended,
    });
    if (!ok) return;
    setBusy(true);
    try {
      await api.post(`/customers/${customer.id}/${isSuspended ? 'reactivate' : 'suspend'}`, isSuspended ? {} : { reason: 'Suspensión manual desde el panel' });
      toast.success(isSuspended ? 'Cliente reactivado.' : 'Cliente suspendido.');
      onChanged();
      onClose();
    } finally {
      setBusy(false);
    }
  }

  async function createTicket() {
    if (!ticketSubject.trim()) return;
    setCreatingTicket(true);
    try {
      await api.post('/tickets', { customerId: customer.id, subject: ticketSubject, category: 'OTRO' });
      toast.success('Ticket creado.');
      setTicketSubject('');
      setTicketOpen(false);
    } catch {
      toast.error('No se pudo crear el ticket.');
    } finally {
      setCreatingTicket(false);
    }
  }

  return (
    <Drawer title={`${customer.firstName} ${customer.lastName}`} subtitle={customer.documentId ?? undefined} onClose={onClose}>
      <div className="space-y-5">
        <StatusBadge status={customer.status} />

        <div className="grid grid-cols-2 gap-3 text-sm">
          <Info label="Teléfono" value={customer.phone} />
          <Info label="Email" value={customer.email} />
          <Info label="Dirección" value={customer.address} />
          <Info label="Técnico" value={customer.technician ? `${customer.technician.firstName} ${customer.technician.lastName}` : null} />
        </div>

        {service && (
          <div className="status-panel status-panel--ok py-3">
            <p className="text-sm font-medium">{service.plan?.name}</p>
            <p className="text-xs text-muted">Usuario PPPoE: {service.pppoeUsername ?? '—'}</p>
          </div>
        )}

        <div className="flex flex-col gap-2 pt-2 border-t border-border">
          <button
            onClick={onGoFull}
            className="flex items-center justify-center gap-2 text-sm border border-border rounded-md py-2 hover:text-ink text-muted"
          >
            <ExternalLink size={14} /> Ver perfil completo
          </button>
          <button
            onClick={toggleSuspension}
            disabled={busy}
            className={`flex items-center justify-center gap-2 text-sm rounded-md py-2 font-medium disabled:opacity-50 ${
              isSuspended ? 'bg-ok text-base' : 'bg-critical text-white'
            }`}
          >
            {isSuspended ? <PlayCircle size={15} /> : <PauseCircle size={15} />}
            {isSuspended ? 'Reactivar' : 'Suspender'}
          </button>

          {!ticketOpen ? (
            <button onClick={() => setTicketOpen(true)} className="text-sm text-signal hover:underline py-1">
              + Crear ticket rápido
            </button>
          ) : (
            <div className="space-y-2 pt-1">
              <input
                autoFocus
                value={ticketSubject}
                onChange={(e) => setTicketSubject(e.target.value)}
                placeholder="Asunto del ticket…"
                className="w-full bg-surface-raised border border-border rounded-md px-3 py-2 text-sm outline-none focus:border-signal"
              />
              <div className="flex gap-2">
                <button onClick={() => setTicketOpen(false)} className="flex-1 text-xs text-muted hover:text-ink py-1.5">
                  Cancelar
                </button>
                <button
                  onClick={createTicket}
                  disabled={creatingTicket || !ticketSubject.trim()}
                  className="flex-1 text-xs bg-signal text-base rounded py-1.5 disabled:opacity-50"
                >
                  {creatingTicket ? 'Creando…' : 'Crear'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </Drawer>
  );
}

function Info({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <p className="text-xs text-muted mb-0.5">{label}</p>
      <p>{value ?? '—'}</p>
    </div>
  );
}
