import { FormEvent, useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { api } from '../lib/api';
import { Plan } from '../lib/types';

export function PlansPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', downloadMbps: '', uploadMbps: '', price: '', technology: 'FTTH' });
  const [saving, setSaving] = useState(false);

  async function load() {
    const { data } = await api.get('/plans');
    setPlans(data);
  }

  useEffect(() => { load(); }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/plans', {
        ...form,
        downloadMbps: Number(form.downloadMbps),
        uploadMbps: Number(form.uploadMbps),
        price: Number(form.price),
      });
      setForm({ name: '', downloadMbps: '', uploadMbps: '', price: '', technology: 'FTTH' });
      setShowForm(false);
      await load();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-8 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-display font-bold mb-1">Planes de Internet</h1>
          <p className="text-muted text-sm">Al asignar un plan a un cliente, su perfil MikroTik se aplicará en la Fase 4.</p>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="flex items-center gap-2 bg-signal text-base text-sm font-medium rounded-md px-4 py-2 hover:opacity-90 transition-opacity"
        >
          <Plus size={16} /> Nuevo plan
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="status-panel status-panel--neutral mb-6 grid grid-cols-5 gap-3 items-end">
          <div className="col-span-2">
            <label className="block text-xs text-muted mb-1">Nombre</label>
            <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full bg-surface-raised border border-border rounded-md px-3 py-2 text-sm outline-none focus:border-signal" />
          </div>
          <div>
            <label className="block text-xs text-muted mb-1">Bajada (Mbps)</label>
            <input required type="number" value={form.downloadMbps} onChange={(e) => setForm({ ...form, downloadMbps: e.target.value })}
              className="w-full bg-surface-raised border border-border rounded-md px-3 py-2 text-sm outline-none focus:border-signal" />
          </div>
          <div>
            <label className="block text-xs text-muted mb-1">Subida (Mbps)</label>
            <input required type="number" value={form.uploadMbps} onChange={(e) => setForm({ ...form, uploadMbps: e.target.value })}
              className="w-full bg-surface-raised border border-border rounded-md px-3 py-2 text-sm outline-none focus:border-signal" />
          </div>
          <div>
            <label className="block text-xs text-muted mb-1">Precio ($)</label>
            <input required type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })}
              className="w-full bg-surface-raised border border-border rounded-md px-3 py-2 text-sm outline-none focus:border-signal" />
          </div>
          <button type="submit" disabled={saving} className="col-span-5 justify-self-start bg-signal text-base text-sm font-medium rounded-md px-4 py-2 mt-1">
            {saving ? 'Guardando...' : 'Guardar plan'}
          </button>
        </form>
      )}

      <div className="grid grid-cols-3 gap-4">
        {plans.map((p) => (
          <div key={p.id} className={`status-panel ${p.status === 'ACTIVE' ? 'status-panel--ok' : 'status-panel--neutral'}`}>
            <p className="font-display font-bold">{p.name}</p>
            <p className="text-2xl font-display font-bold my-1">{p.downloadMbps}<span className="text-sm text-muted">/{p.uploadMbps} Mbps</span></p>
            <p className="text-sm text-muted">${p.price} {p.currency}/mes</p>
            {p.isDemo && <p className="text-[10px] text-muted/70 mt-2">Dato demo</p>}
          </div>
        ))}
      </div>
    </div>
  );
}
