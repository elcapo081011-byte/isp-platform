import { FormEvent, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check } from 'lucide-react';
import { api } from '../lib/api';
import { Plan } from '../lib/types';
import { useToast } from '../components/Toast';

const STEPS = ['Datos personales', 'Servicio', 'Confirmar'] as const;

export function NewCustomerPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const [step, setStep] = useState(0);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    documentId: '',
    phone: '',
    email: '',
    address: '',
    planId: '',
    pppoeUsername: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get('/plans', { params: { status: 'ACTIVE' } }).then((res) => setPlans(res.data));
  }, []);

  function field(key: keyof typeof form) {
    return {
      value: form[key],
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm((f) => ({ ...f, [key]: e.target.value })),
    };
  }

  const step0Valid = form.firstName.trim().length > 0 && form.lastName.trim().length > 0;

  function next() {
    if (step === 0 && !step0Valid) {
      setError('Nombre y apellido son obligatorios.');
      return;
    }
    setError(null);
    setStep((s) => Math.min(STEPS.length - 1, s + 1));
  }

  function back() {
    setError(null);
    setStep((s) => Math.max(0, s - 1));
  }

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
      toast.success('Cliente creado.');
      navigate(`/clientes/${data.id}`);
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'No se pudo crear el cliente. Verifica los datos.');
    } finally {
      setSaving(false);
    }
  }

  const selectedPlan = plans.find((p) => p.id === form.planId);

  return (
    <div className="p-8 max-w-2xl page-enter">
      <h1 className="text-2xl font-display font-bold mb-6">Nuevo cliente</h1>

      <div className="flex items-center gap-2 mb-8">
        {STEPS.map((s, i) => (
          <div key={s} className="flex items-center gap-2 flex-1">
            <div className="flex items-center gap-2">
              <div
                className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-medium shrink-0 transition-colors ${
                  i < step ? 'bg-signal text-base' : i === step ? 'bg-signal/20 text-signal border border-signal' : 'bg-surface-raised text-muted border border-border'
                }`}
              >
                {i < step ? <Check size={13} /> : i + 1}
              </div>
              <span className={`text-xs whitespace-nowrap ${i === step ? 'text-ink' : 'text-muted'}`}>{s}</span>
            </div>
            {i < STEPS.length - 1 && <div className={`h-px flex-1 ${i < step ? 'bg-signal' : 'bg-border'}`} />}
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit}>
        {step === 0 && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input label="Nombre" required autoFocus {...field('firstName')} />
              <Input label="Apellido" required {...field('lastName')} />
              <Input label="Documento" {...field('documentId')} />
              <Input label="Teléfono" {...field('phone')} />
              <Input label="Email" type="email" {...field('email')} />
              <div className="sm:col-span-2">
                <Input label="Dirección" {...field('address')} />
              </div>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4">
            <p className="text-sm text-muted">El servicio es opcional — puedes agregarlo después desde el perfil del cliente.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-muted mb-1.5">Plan</label>
                <select
                  {...field('planId')}
                  className="w-full bg-surface border border-border rounded-md px-3 py-2.5 text-sm outline-none focus:border-signal"
                >
                  <option value="">Sin plan por ahora</option>
                  {plans.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} — {p.downloadMbps}/{p.uploadMbps} Mbps — ${p.price}
                    </option>
                  ))}
                </select>
              </div>
              <Input label="Usuario PPPoE" {...field('pppoeUsername')} />
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <p className="text-sm text-muted">Revisa antes de crear.</p>
            <div className="status-panel status-panel--neutral space-y-2 text-sm">
              <Row label="Nombre" value={`${form.firstName} ${form.lastName}`} />
              <Row label="Documento" value={form.documentId || '—'} />
              <Row label="Teléfono" value={form.phone || '—'} />
              <Row label="Email" value={form.email || '—'} />
              <Row label="Dirección" value={form.address || '—'} />
              <Row label="Plan" value={selectedPlan ? `${selectedPlan.name} ($${selectedPlan.price})` : 'Sin plan'} />
              <Row label="Usuario PPPoE" value={form.pppoeUsername || '—'} />
            </div>
          </div>
        )}

        {error && <div className="status-panel status-panel--critical text-sm py-3 mt-4">{error}</div>}

        <div className="flex justify-between mt-6">
          <button
            type="button"
            onClick={back}
            disabled={step === 0}
            className="text-sm text-muted hover:text-ink px-4 py-2 disabled:opacity-0"
          >
            Atrás
          </button>
          {step < STEPS.length - 1 ? (
            <button
              type="button"
              onClick={next}
              className="bg-signal text-base font-medium rounded-md px-5 py-2.5 hover:opacity-90 transition-opacity"
            >
              Continuar
            </button>
          ) : (
            <button
              type="submit"
              disabled={saving}
              className="bg-signal text-base font-medium rounded-md px-5 py-2.5 hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {saving ? 'Guardando…' : 'Crear cliente'}
            </button>
          )}
        </div>
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

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted">{label}</span>
      <span>{value}</span>
    </div>
  );
}
