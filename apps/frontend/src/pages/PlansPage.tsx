import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Plus, Pencil, Trash2, Gauge, Network, Layers, X } from 'lucide-react';
import { api } from '../lib/api';
import { Plan } from '../lib/types';

const TECHNOLOGIES = [
  { value: 'FTTH', label: 'Fibra (FTTH)' },
  { value: 'WIRELESS', label: 'Inalámbrico' },
  { value: 'CABLE', label: 'Cable' },
  { value: 'HOTSPOT', label: 'Hotspot' },
];

const EMPTY_FORM = {
  name: '',
  technology: 'FTTH',
  downloadMbps: '',
  uploadMbps: '',
  price: '',
  currency: 'USD',
  mikrotikProfile: '',
  burstLimit: '',
  priority: '8',
  vlan: '',
  description: '',
};

type FormState = typeof EMPTY_FORM;

function fieldClass() {
  return 'w-full bg-surface-raised border border-border rounded-md px-3 py-2 text-sm outline-none focus:border-signal transition-colors';
}

function labelClass() {
  return 'block text-xs text-muted mb-1.5';
}

export function PlansPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'ACTIVE' | 'INACTIVE' | 'ALL'>('ACTIVE');

  async function load() {
    setLoading(true);
    try {
      const { data } = await api.get('/plans');
      setPlans(data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const visiblePlans = useMemo(() => {
    if (filter === 'ALL') return plans;
    return plans.filter((p) => p.status === filter);
  }, [plans, filter]);

  function openCreate() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setError(null);
    setModalOpen(true);
  }

  function openEdit(p: Plan) {
    setEditingId(p.id);
    setForm({
      name: p.name,
      technology: p.technology,
      downloadMbps: String(p.downloadMbps),
      uploadMbps: String(p.uploadMbps),
      price: p.price,
      currency: p.currency,
      mikrotikProfile: p.mikrotikProfile ?? '',
      burstLimit: p.burstLimit ?? '',
      priority: String(p.priority ?? 8),
      vlan: p.vlan != null ? String(p.vlan) : '',
      description: p.description ?? '',
    });
    setError(null);
    setModalOpen(true);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payload = {
        name: form.name,
        technology: form.technology,
        downloadMbps: Number(form.downloadMbps),
        uploadMbps: Number(form.uploadMbps),
        price: Number(form.price),
        currency: form.currency,
        mikrotikProfile: form.mikrotikProfile || undefined,
        burstLimit: form.burstLimit || undefined,
        priority: form.priority ? Number(form.priority) : undefined,
        vlan: form.vlan ? Number(form.vlan) : undefined,
        description: form.description || undefined,
      };
      if (editingId) {
        await api.put(`/plans/${editingId}`, payload);
      } else {
        await api.post('/plans', payload);
      }
      setModalOpen(false);
      await load();
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'No se pudo guardar el plan.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(p: Plan) {
    if (!confirm(`¿Eliminar el plan "${p.name}"? Si tiene clientes activos, se marcará como inactivo en vez de borrarse.`)) return;
    await api.delete(`/plans/${p.id}`);
    await load();
  }

  return (
    <div className="p-8 max-w-6xl">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-display font-bold mb-1">Planes de Internet</h1>
          <p className="text-muted text-sm max-w-lg">
            Define velocidad, precio y el perfil que se aplicará en MikroTik u OLT al asignar el plan a un cliente.
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 bg-signal text-base text-sm font-medium rounded-md px-4 py-2 hover:opacity-90 transition-opacity shrink-0"
        >
          <Plus size={16} /> Nuevo plan
        </button>
      </div>

      <div className="flex items-center gap-1 mb-5 border-b border-border">
        {(['ACTIVE', 'INACTIVE', 'ALL'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-2 text-sm border-b-2 -mb-px transition-colors ${
              filter === f ? 'border-signal text-ink' : 'border-transparent text-muted hover:text-ink'
            }`}
          >
            {f === 'ACTIVE' ? 'Activos' : f === 'INACTIVE' ? 'Inactivos' : 'Todos'}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-muted text-sm">Cargando planes…</p>
      ) : visiblePlans.length === 0 ? (
        <div className="status-panel status-panel--neutral text-sm text-muted">
          No hay planes {filter === 'ACTIVE' ? 'activos' : filter === 'INACTIVE' ? 'inactivos' : ''} todavía.
          Crea el primero con "Nuevo plan".
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-4">
          {visiblePlans.map((p) => (
            <div
              key={p.id}
              className={`status-panel group relative ${p.status === 'ACTIVE' ? 'status-panel--ok' : 'status-panel--neutral'}`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-display font-bold leading-tight">{p.name}</p>
                  <p className="text-[11px] text-muted mt-0.5">{TECHNOLOGIES.find((t) => t.value === p.technology)?.label ?? p.technology}</p>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => openEdit(p)} className="text-muted hover:text-signal p-1" aria-label="Editar">
                    <Pencil size={14} />
                  </button>
                  <button onClick={() => handleDelete(p)} className="text-muted hover:text-critical p-1" aria-label="Eliminar">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              <p className="text-2xl font-display font-bold my-2">
                {p.downloadMbps}
                <span className="text-sm text-muted font-normal">/{p.uploadMbps} Mbps</span>
              </p>
              <p className="text-sm text-muted mb-3">
                ${p.price} {p.currency}/mes
              </p>

              <div className="flex flex-wrap gap-1.5 text-[11px]">
                {p.mikrotikProfile && (
                  <span className="inline-flex items-center gap-1 bg-signal/10 text-signal border border-signal/30 rounded px-1.5 py-0.5">
                    <Network size={10} /> {p.mikrotikProfile}
                  </span>
                )}
                {p.vlan != null && (
                  <span className="inline-flex items-center gap-1 bg-white/5 text-muted border border-border rounded px-1.5 py-0.5">
                    <Layers size={10} /> VLAN {p.vlan}
                  </span>
                )}
                {p.burstLimit && (
                  <span className="inline-flex items-center gap-1 bg-white/5 text-muted border border-border rounded px-1.5 py-0.5">
                    <Gauge size={10} /> Burst {p.burstLimit}
                  </span>
                )}
              </div>

              {p.status === 'INACTIVE' && <p className="text-[10px] text-warn mt-2">Inactivo</p>}
              {p.isDemo && <p className="text-[10px] text-muted/70 mt-2">Dato demo</p>}
            </div>
          ))}
        </div>
      )}

      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 backdrop-blur-sm p-6 pt-[6vh]"
          onClick={() => setModalOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-xl bg-surface border border-border rounded-lg shadow-2xl"
          >
            <div className="flex items-start justify-between border-b border-border px-6 py-4">
              <div>
                <h2 className="font-display font-bold text-lg">{editingId ? 'Editar plan' : 'Nuevo plan'}</h2>
                <p className="text-xs text-muted mt-0.5">
                  El perfil de MikroTik se aplica automáticamente a cada cliente que use este plan.
                </p>
              </div>
              <button onClick={() => setModalOpen(false)} className="text-muted hover:text-ink p-1 -mr-1 -mt-1" aria-label="Cerrar">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
              {error && (
                <div className="status-panel status-panel--critical text-sm text-critical py-2.5">{error}</div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className={labelClass()}>Nombre del plan</label>
                  <input
                    required
                    placeholder="Ej. Fibra 100 Megas"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className={fieldClass()}
                  />
                </div>
                <div>
                  <label className={labelClass()}>Tecnología</label>
                  <select
                    value={form.technology}
                    onChange={(e) => setForm({ ...form, technology: e.target.value })}
                    className={fieldClass()}
                  >
                    {TECHNOLOGIES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelClass()}>Precio</label>
                  <div className="flex gap-1.5">
                    <input
                      required
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.price}
                      onChange={(e) => setForm({ ...form, price: e.target.value })}
                      className={fieldClass()}
                    />
                    <select
                      value={form.currency}
                      onChange={(e) => setForm({ ...form, currency: e.target.value })}
                      className="bg-surface-raised border border-border rounded-md px-2 text-sm outline-none focus:border-signal w-20"
                    >
                      <option value="USD">USD</option>
                      <option value="DOP">DOP</option>
                      <option value="MXN">MXN</option>
                      <option value="COP">COP</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className={labelClass()}>Bajada (Mbps)</label>
                  <input
                    required
                    type="number"
                    min="1"
                    value={form.downloadMbps}
                    onChange={(e) => setForm({ ...form, downloadMbps: e.target.value })}
                    className={fieldClass()}
                  />
                </div>
                <div>
                  <label className={labelClass()}>Subida (Mbps)</label>
                  <input
                    required
                    type="number"
                    min="1"
                    value={form.uploadMbps}
                    onChange={(e) => setForm({ ...form, uploadMbps: e.target.value })}
                    className={fieldClass()}
                  />
                </div>
              </div>

              <div className="border-t border-border pt-4">
                <p className="text-xs font-medium text-muted mb-3 uppercase tracking-wide">Perfil de red (opcional)</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <label className={labelClass()}>Perfil MikroTik (PPPoE / Simple Queue)</label>
                    <input
                      placeholder="Ej. plan-100mb"
                      value={form.mikrotikProfile}
                      onChange={(e) => setForm({ ...form, mikrotikProfile: e.target.value })}
                      className={fieldClass()}
                    />
                  </div>
                  <div>
                    <label className={labelClass()}>Ráfaga (burst)</label>
                    <input
                      placeholder="Ej. 120M/130M 10/10 8"
                      value={form.burstLimit}
                      onChange={(e) => setForm({ ...form, burstLimit: e.target.value })}
                      className={fieldClass()}
                    />
                  </div>
                  <div>
                    <label className={labelClass()}>Prioridad de cola</label>
                    <input
                      type="number"
                      min="1"
                      max="8"
                      value={form.priority}
                      onChange={(e) => setForm({ ...form, priority: e.target.value })}
                      className={fieldClass()}
                    />
                  </div>
                  <div className="col-span-2">
                    <label className={labelClass()}>VLAN</label>
                    <input
                      type="number"
                      placeholder="Opcional"
                      value={form.vlan}
                      onChange={(e) => setForm({ ...form, vlan: e.target.value })}
                      className={fieldClass()}
                    />
                  </div>
                  <div className="col-span-2">
                    <label className={labelClass()}>Descripción interna</label>
                    <textarea
                      rows={2}
                      value={form.description}
                      onChange={(e) => setForm({ ...form, description: e.target.value })}
                      className={fieldClass()}
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="text-sm text-muted hover:text-ink px-4 py-2"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="bg-signal text-base text-sm font-medium rounded-md px-5 py-2 disabled:opacity-50"
                >
                  {saving ? 'Guardando…' : editingId ? 'Guardar cambios' : 'Crear plan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
