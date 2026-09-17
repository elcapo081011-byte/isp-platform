import { FormEvent, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { Plan } from '../lib/types';

export function NewCustomerPage() {
  const navigate = useNavigate();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [form, setForm] = useState({
    firstName: '', lastName: '', documentId: '', phone: '', email: '', address: '', planId: '', pppoeUsername: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get('/plans', { params: { status: 'ACTIVE' } }).then((res) => setPlans(res.data));
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const { data } = await api.post('/customers', {
        ...form,
        documentId: form.documentId || undefined,
        planId: form.planId || undefined,
        pppoeUsername: form.pppoeUsername || undefined,
      });
      navigate(`/clientes/${data.id}`);
    } catch {
      setError('No se pudo crear el cliente. Verifica los datos.');
    } finally {
      setSaving(false);
    }
  }

  function field(key: keyof typeof form) {
    return {
      value: form[key],
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
        setForm((f) => ({ ...f, [key]: e.target.value })),
    };
  }

  return (
    <div className="p-8 max-w-2xl">
      <h1 className="text-2xl font-display font-bold mb-6">Nuevo cliente</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Input label="Nombre" required {...field('firstName')} />
          <Input label="Apellido" required {...field('lastName')} />
          <Input label="Documento" {...field('documentId')} />
          <Input label="Teléfono" {...field('phone')} />
          <Input label="Email" type="email" {...field('email')} />
          <div className="col-span-2">
            <Input label="Dirección" {...field('address')} />
          </div>
        </div>

        <div className="border-t border-border pt-4">
          <p className="text-sm font-medium mb-3">Servicio (opcional al crear)</p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-muted mb-1.5">Plan</label>
              <select
                {...field('planId')}
                className="w-full bg-surface border border-border rounded-md px-3 py-2.5 text-sm outline-none focus:border-signal"
              >
                <option value="">Sin plan por ahora</option>
                {plans.map((p) => (
                  <option key={p.id} value={p.id}>{p.name} — {p.downloadMbps}/{p.uploadMbps} Mbps — ${p.price}</option>
                ))}
              </select>
            </div>
            <Input label="Usuario PPPoE" {...field('pppoeUsername')} />
          </div>
        </div>

        {error && <div className="status-panel status-panel--critical text-sm py-3">{error}</div>}

        <button
          type="submit"
          disabled={saving}
          className="bg-signal text-base font-medium rounded-md px-5 py-2.5 hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {saving ? 'Guardando...' : 'Crear cliente'}
        </button>
      </form>
    </div>
  );
}

function Input({ label, ...props }: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <label className="block text-sm text-muted mb-1.5">{label}</label>
      <input
        {...props}
        className="w-full bg-surface border border-border rounded-md px-3 py-2.5 text-sm outline-none focus:border-signal"
      />
    </div>
  );
}
