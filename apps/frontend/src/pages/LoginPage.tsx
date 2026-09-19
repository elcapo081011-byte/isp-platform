import { FormEvent, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { api } from '../lib/api';
import { useAuthStore } from '../store/auth.store';
import { Logomark } from '../components/Logomark';

export function LoginPage() {
  const navigate = useNavigate();
  const setSession = useAuthStore((s) => s.setSession);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { data } = await api.post('/auth/login', { email, password });
      setSession(data, remember);
      navigate('/dashboard');
    } catch {
      setError('No pudimos verificar esas credenciales. Revisa el correo y la contraseña.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Panel visual — puramente decorativo, oculto en pantallas pequeñas */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-base items-center justify-center">
        <div
          className="absolute inset-0 opacity-60"
          style={{
            background:
              'radial-gradient(circle at 20% 20%, color-mix(in srgb, var(--signal) 22%, transparent), transparent 55%), radial-gradient(circle at 80% 75%, color-mix(in srgb, var(--signal) 14%, transparent), transparent 50%)',
          }}
        />
        <NetworkGraphic />
        <div className="absolute bottom-12 left-12 right-12">
          <p className="text-2xl font-display font-bold leading-snug max-w-sm">
            Todo tu ISP — clientes, red y facturación — en un solo panel.
          </p>
        </div>
      </div>

      {/* Panel de acceso */}
      <div className="w-full lg:w-1/2 flex items-center justify-center px-4">
        <div className="w-full max-w-sm">
          <div className="flex items-center gap-2 mb-10">
            <Logomark size={22} />
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
                autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-surface border border-border rounded-md px-3 py-2.5 text-sm outline-none focus:border-signal transition-colors"
                placeholder="admin@tuisp.com"
              />
            </div>
            <div>
              <label className="block text-sm text-muted mb-1.5">Contraseña</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-surface border border-border rounded-md px-3 py-2.5 pr-10 text-sm outline-none focus:border-signal transition-colors"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-ink"
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <label className="flex items-center gap-2 text-sm text-muted cursor-pointer select-none">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                className="rounded border-border accent-signal"
              />
              Mantener la sesión en este dispositivo
            </label>

            {error && <div className="status-panel status-panel--critical text-sm py-3">{error}</div>}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-signal text-base font-medium rounded-md py-2.5 hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {loading ? 'Verificando…' : 'Entrar'}
            </button>
          </form>

          <p className="text-sm text-muted mt-6 text-center">
            ¿Tienes un ISP y aún no tienes cuenta? <Link to="/register" className="text-signal hover:underline">Crea la tuya</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

function NetworkGraphic() {
  const nodes = [
    { x: 60, y: 80 }, { x: 180, y: 40 }, { x: 300, y: 110 }, { x: 220, y: 200 },
    { x: 100, y: 220 }, { x: 340, y: 220 }, { x: 40, y: 160 },
  ];
  const edges = [[0, 1], [1, 2], [1, 3], [3, 4], [2, 5], [0, 6], [3, 6]];
  return (
    <svg viewBox="0 0 380 260" className="relative w-[70%] max-w-md opacity-80" fill="none">
      {edges.map(([a, b], i) => (
        <line
          key={i}
          x1={nodes[a].x} y1={nodes[a].y} x2={nodes[b].x} y2={nodes[b].y}
          stroke="var(--signal)" strokeOpacity="0.35" strokeWidth="1.5"
        />
      ))}
      {nodes.map((n, i) => (
        <circle key={i} cx={n.x} cy={n.y} r={i === 1 ? 7 : 5} fill="var(--signal)" fillOpacity={i === 1 ? 1 : 0.7}>
          <animate attributeName="r" values={`${i === 1 ? 7 : 5};${i === 1 ? 9 : 7};${i === 1 ? 7 : 5}`} dur={`${2.5 + i * 0.3}s`} repeatCount="indefinite" />
        </circle>
      ))}
    </svg>
  );
}
