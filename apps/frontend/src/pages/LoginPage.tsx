import { FormEvent, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Radio } from 'lucide-react';
import { api } from '../lib/api';
import { useAuthStore } from '../store/auth.store';

export function LoginPage() {
  const navigate = useNavigate();
  const setSession = useAuthStore((s) => s.setSession);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { data } = await api.post('/auth/login', { email, password });
      setSession(data);
      navigate('/dashboard');
    } catch {
      setError('No pudimos verificar esas credenciales. Revisa el correo y la contraseña.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2 mb-8">
          <Radio className="text-signal" size={22} strokeWidth={2.5} />
          <span className="font-display font-extrabold text-lg tracking-tight">ISP Control</span>
        </div>

        <h1 className="text-2xl font-display font-bold mb-1">Entrar al panel</h1>
        <p className="text-muted text-sm mb-8">Administra tu red desde un solo lugar.</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-muted mb-1.5">Correo</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-surface border border-border rounded-md px-3 py-2.5 text-sm outline-none focus:border-signal transition-colors"
              placeholder="admin@tuisp.com"
            />
          </div>
          <div>
            <label className="block text-sm text-muted mb-1.5">Contraseña</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-surface border border-border rounded-md px-3 py-2.5 text-sm outline-none focus:border-signal transition-colors"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <div className="status-panel status-panel--critical text-sm py-3">{error}</div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-signal text-base font-medium rounded-md py-2.5 hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {loading ? 'Verificando...' : 'Entrar'}
          </button>
        </form>

        <p className="text-sm text-muted mt-6 text-center">
          ¿Tienes un ISP y aún no tienes cuenta? <Link to="/register" className="text-signal hover:underline">Crea la tuya</Link>
        </p>
      </div>
    </div>
  );
}
