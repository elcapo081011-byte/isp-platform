import { FormEvent, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Radio } from 'lucide-react';
import { api } from '../lib/api';
import { useAuthStore } from '../store/auth.store';

export function RegisterPage() {
  const navigate = useNavigate();
  const setSession = useAuthStore((s) => s.setSession);
  const [form, setForm] = useState({
    organizationName: '', slug: '', firstName: '', lastName: '', email: '', password: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function field(key: keyof typeof form) {
    return {
      value: form[key],
      onChange: (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [key]: e.target.value })),
    };
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { data } = await api.post('/auth/register', form);
      setSession(data);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'No se pudo crear la cuenta. Verifica los datos.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2 mb-8">
          <Radio className="text-signal" size={22} strokeWidth={2.5} />
          <span className="font-display font-extrabold text-lg tracking-tight">ISP Control</span>
        </div>

        <h1 className="text-2xl font-display font-bold mb-1">Crea la cuenta de tu ISP</h1>
        <p className="text-muted text-sm mb-8">
          Tu propia cuenta aislada: tus clientes, tu MikroTik, tu OLT — nadie más los ve.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="Nombre de tu empresa" required {...field('organizationName')} />
          <Field
            label="Identificador único"
            required
            placeholder="ej. fibraveloz"
            {...field('slug')}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Tu nombre" required {...field('firstName')} />
            <Field label="Tu apellido" required {...field('lastName')} />
          </div>
          <Field label="Correo" type="email" required {...field('email')} />
          <Field label="Contraseña" type="password" required {...field('password')} />

          {error && <div className="status-panel status-panel--critical text-sm py-3">{error}</div>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-signal text-base font-medium rounded-md py-2.5 hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {loading ? 'Creando cuenta...' : 'Crear cuenta'}
          </button>
        </form>

        <p className="text-sm text-muted mt-6 text-center">
          ¿Ya tienes cuenta? <Link to="/login" className="text-signal hover:underline">Inicia sesión</Link>
        </p>
      </div>
    </div>
  );
}

function Field({ label, ...props }: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <label className="block text-sm text-muted mb-1.5">{label}</label>
      <input
        {...props}
        className="w-full bg-surface border border-border rounded-md px-3 py-2.5 text-sm outline-none focus:border-signal transition-colors"
      />
    </div>
  );
}
