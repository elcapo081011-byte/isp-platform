import { FormEvent, useEffect, useState } from 'react';
import { Plus, X, ArrowRightLeft } from 'lucide-react';
import { api } from '../lib/api';
import { StatusBadge } from '../components/StatusBadge';
import { Drawer } from '../components/Drawer';
import { useToast } from '../components/Toast';

const CATEGORIES = ['ONU', 'ROUTER', 'OLT', 'SFP', 'FIBER', 'SPLITTER', 'NAP', 'CABLE', 'POWER_SUPPLY', 'OTHER'];
const STATUSES = ['IN_STOCK', 'INSTALLED', 'DAMAGED', 'IN_REPAIR', 'LOST'];

function fieldClass() {
  return 'w-full bg-surface-raised border border-border rounded-md px-3 py-2 text-sm outline-none focus:border-signal transition-colors';
}
function labelClass() {
  return 'block text-xs text-muted mb-1.5';
}

export function InventoryPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ category: 'ONU', name: '', serial: '', notes: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<any | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const toast = useToast();

  async function load() {
    setLoading(true);
    try {
      const { data } = await api.get('/inventory');
      setItems(data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function openCreate() {
    setForm({ category: 'ONU', name: '', serial: '', notes: '' });
    setError(null);
    setModalOpen(true);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await api.post('/inventory', {
        category: form.category,
        name: form.name,
        serial: form.serial || undefined,
        notes: form.notes || undefined,
      });
      setModalOpen(false);
      toast.success('Artículo agregado.');
      await load();
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'No se pudo agregar el artículo.');
    } finally {
      setSaving(false);
    }
  }

  async function moveStatus(id: string, toStatus: string) {
    await api.post(`/inventory/${id}/move`, { toStatus });
    toast.success('Estado actualizado.');
    setSelected(null);
    await load();
  }

  async function bulkMove(toStatus: string) {
    await Promise.all(Array.from(selectedIds).map((id) => api.post(`/inventory/${id}/move`, { toStatus })));
    toast.success(`${selectedIds.size} artículo(s) actualizados.`);
    setSelectedIds(new Set());
    await load();
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    setSelectedIds((prev) => (prev.size === items.length ? new Set() : new Set(items.map((i) => i.id))));
  }

  return (
    <div className="p-8 max-w-5xl page-enter">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-display font-bold mb-1">Inventario</h1>
          <p className="text-muted text-sm">ONU, routers, OLT, SFP, fibra, splitters, NAP y más.</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 bg-signal text-base text-sm font-medium rounded-md px-4 py-2 hover:opacity-90 transition-opacity shrink-0"
        >
          <Plus size={16} /> Agregar artículo
        </button>
      </div>

      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 mb-3 bg-surface-raised border border-border rounded-md px-4 py-2.5 text-sm">
          <span>{selectedIds.size} seleccionado(s)</span>
          <div className="flex gap-1.5 ml-auto">
            {STATUSES.map((s) => (
              <button key={s} onClick={() => bulkMove(s)} className="text-xs border border-border rounded px-2 py-1 hover:text-ink text-muted">
                → {s}
              </button>
            ))}
          </div>
          <button onClick={() => setSelectedIds(new Set())} className="text-muted hover:text-ink" aria-label="Deseleccionar todo">
            <X size={14} />
          </button>
        </div>
      )}

      <div className="border border-border rounded-md overflow-hidden overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-surface text-muted text-xs">
            <tr>
              <th className="px-4 py-3 w-10">
                <input
                  type="checkbox"
                  checked={items.length > 0 && selectedIds.size === items.length}
                  onChange={toggleSelectAll}
                  className="rounded border-border accent-signal"
                  aria-label="Seleccionar todos"
                />
              </th>
              <th className="text-left px-4 py-3">Item</th>
              <th className="text-left px-4 py-3">Categoría</th>
              <th className="text-left px-4 py-3">Serial</th>
              <th className="text-left px-4 py-3">Estado</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-muted">
                  Cargando…
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-muted">
                  Sin artículos registrados.
                </td>
              </tr>
            ) : (
              items.map((i) => (
                <tr key={i.id} className="border-t border-border hover:bg-surface-raised/40">
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selectedIds.has(i.id)}
                      onChange={() => toggleSelect(i.id)}
                      className="rounded border-border accent-signal"
                      aria-label={`Seleccionar ${i.name}`}
                    />
                  </td>
                  <td className="px-4 py-3 cursor-pointer" onClick={() => setSelected(i)}>
                    {i.name}
                  </td>
                  <td className="px-4 py-3 text-muted cursor-pointer" onClick={() => setSelected(i)}>
                    {i.category}
                  </td>
                  <td className="px-4 py-3 text-muted cursor-pointer" onClick={() => setSelected(i)}>
                    {i.serial ?? '—'}
                  </td>
                  <td className="px-4 py-3 cursor-pointer" onClick={() => setSelected(i)}>
                    <StatusBadge status={i.status} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 backdrop-blur-sm p-6 pt-[8vh]"
          onClick={() => setModalOpen(false)}
        >
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-lg bg-surface border border-border rounded-lg shadow-2xl">
            <div className="flex items-start justify-between border-b border-border px-6 py-4">
              <h2 className="font-display font-bold text-lg">Agregar artículo</h2>
              <button onClick={() => setModalOpen(false)} className="text-muted hover:text-ink p-1 -mr-1 -mt-1" aria-label="Cerrar">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
              {error && <div className="status-panel status-panel--critical text-sm text-critical py-2.5">{error}</div>}

              <div>
                <label className={labelClass()}>Categoría</label>
                <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className={fieldClass()}>
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass()}>Nombre</label>
                <input
                  required
                  placeholder="Ej. ONU HG8310M #482"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className={fieldClass()}
                />
              </div>
              <div>
                <label className={labelClass()}>Serial (opcional)</label>
                <input value={form.serial} onChange={(e) => setForm({ ...form, serial: e.target.value })} className={fieldClass()} />
              </div>
              <div>
                <label className={labelClass()}>Notas (opcional)</label>
                <textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className={fieldClass()} />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setModalOpen(false)} className="text-sm text-muted hover:text-ink px-4 py-2">
                  Cancelar
                </button>
                <button type="submit" disabled={saving} className="bg-signal text-base text-sm font-medium rounded-md px-5 py-2 disabled:opacity-50">
                  {saving ? 'Guardando…' : 'Agregar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selected && (
        <Drawer title={selected.name} subtitle={selected.category} onClose={() => setSelected(null)}>
          <div className="space-y-4">
            <StatusBadge status={selected.status} />
            <div className="text-sm space-y-2">
              <Row label="Serial" value={selected.serial ?? '—'} />
              <Row label="Notas" value={selected.notes ?? '—'} />
              <Row label="Agregado" value={new Date(selected.createdAt).toLocaleDateString('es-DO')} />
            </div>

            <div className="pt-3 border-t border-border">
              <p className={labelClass()}>Mover a</p>
              <div className="flex flex-wrap gap-1.5">
                {STATUSES.filter((s) => s !== selected.status).map((s) => (
                  <button
                    key={s}
                    onClick={() => moveStatus(selected.id, s)}
                    className="flex items-center gap-1 text-xs border border-border rounded px-2 py-1.5 hover:text-ink text-muted"
                  >
                    <ArrowRightLeft size={11} /> {s}
                  </button>
                ))}
              </div>
            </div>

            <p className="text-xs text-muted pt-3 border-t border-border">
              El historial detallado de movimientos aún no tiene una vista dedicada — próximamente.
            </p>
          </div>
        </Drawer>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted">{label}</span>
      <span className="text-right">{value}</span>
    </div>
  );
}
