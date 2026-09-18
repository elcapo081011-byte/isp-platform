import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
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
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);
    async function handleSubmit(e) {
        e.preventDefault();
        setError(null);
        setLoading(true);
        try {
            const { data } = await api.post('/auth/login', { email, password });
            setSession(data, remember);
            navigate('/dashboard');
        }
        catch {
            setError('No pudimos verificar esas credenciales. Revisa el correo y la contraseña.');
        }
        finally {
            setLoading(false);
        }
    }
    return (_jsxs("div", { className: "min-h-screen flex", children: [_jsxs("div", { className: "hidden lg:flex lg:w-1/2 relative overflow-hidden bg-base items-center justify-center", children: [_jsx("div", { className: "absolute inset-0 opacity-60", style: {
                            background: 'radial-gradient(circle at 20% 20%, color-mix(in srgb, var(--signal) 22%, transparent), transparent 55%), radial-gradient(circle at 80% 75%, color-mix(in srgb, var(--signal) 14%, transparent), transparent 50%)',
                        } }), _jsx(NetworkGraphic, {}), _jsx("div", { className: "absolute bottom-12 left-12 right-12", children: _jsx("p", { className: "text-2xl font-display font-bold leading-snug max-w-sm", children: "Todo tu ISP \u2014 clientes, red y facturaci\u00F3n \u2014 en un solo panel." }) })] }), _jsx("div", { className: "w-full lg:w-1/2 flex items-center justify-center px-4", children: _jsxs("div", { className: "w-full max-w-sm", children: [_jsxs("div", { className: "flex items-center gap-2 mb-10", children: [_jsx(Logomark, { size: 22 }), _jsx("span", { className: "font-display font-extrabold text-lg tracking-tight", children: "ISP Control" })] }), _jsx("h1", { className: "text-2xl font-display font-bold mb-1", children: "Entrar al panel" }), _jsx("p", { className: "text-muted text-sm mb-8", children: "Administra tu red desde un solo lugar." }), _jsxs("form", { onSubmit: handleSubmit, className: "space-y-4", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-sm text-muted mb-1.5", children: "Correo" }), _jsx("input", { type: "email", required: true, autoFocus: true, value: email, onChange: (e) => setEmail(e.target.value), className: "w-full bg-surface border border-border rounded-md px-3 py-2.5 text-sm outline-none focus:border-signal transition-colors", placeholder: "admin@tuisp.com" })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm text-muted mb-1.5", children: "Contrase\u00F1a" }), _jsxs("div", { className: "relative", children: [_jsx("input", { type: showPassword ? 'text' : 'password', required: true, value: password, onChange: (e) => setPassword(e.target.value), className: "w-full bg-surface border border-border rounded-md px-3 py-2.5 pr-10 text-sm outline-none focus:border-signal transition-colors", placeholder: "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022" }), _jsx("button", { type: "button", onClick: () => setShowPassword((v) => !v), className: "absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-ink", "aria-label": showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña', children: showPassword ? _jsx(EyeOff, { size: 15 }) : _jsx(Eye, { size: 15 }) })] })] }), _jsxs("label", { className: "flex items-center gap-2 text-sm text-muted cursor-pointer select-none", children: [_jsx("input", { type: "checkbox", checked: remember, onChange: (e) => setRemember(e.target.checked), className: "rounded border-border accent-signal" }), "Mantener la sesi\u00F3n en este dispositivo"] }), error && _jsx("div", { className: "status-panel status-panel--critical text-sm py-3", children: error }), _jsx("button", { type: "submit", disabled: loading, className: "w-full bg-signal text-base font-medium rounded-md py-2.5 hover:opacity-90 transition-opacity disabled:opacity-50", children: loading ? 'Verificando…' : 'Entrar' })] }), _jsxs("p", { className: "text-sm text-muted mt-6 text-center", children: ["\u00BFTienes un ISP y a\u00FAn no tienes cuenta? ", _jsx(Link, { to: "/register", className: "text-signal hover:underline", children: "Crea la tuya" })] })] }) })] }));
}
function NetworkGraphic() {
    const nodes = [
        { x: 60, y: 80 }, { x: 180, y: 40 }, { x: 300, y: 110 }, { x: 220, y: 200 },
        { x: 100, y: 220 }, { x: 340, y: 220 }, { x: 40, y: 160 },
    ];
    const edges = [[0, 1], [1, 2], [1, 3], [3, 4], [2, 5], [0, 6], [3, 6]];
    return (_jsxs("svg", { viewBox: "0 0 380 260", className: "relative w-[70%] max-w-md opacity-80", fill: "none", children: [edges.map(([a, b], i) => (_jsx("line", { x1: nodes[a].x, y1: nodes[a].y, x2: nodes[b].x, y2: nodes[b].y, stroke: "var(--signal)", strokeOpacity: "0.35", strokeWidth: "1.5" }, i))), nodes.map((n, i) => (_jsx("circle", { cx: n.x, cy: n.y, r: i === 1 ? 7 : 5, fill: "var(--signal)", fillOpacity: i === 1 ? 1 : 0.7, children: _jsx("animate", { attributeName: "r", values: `${i === 1 ? 7 : 5};${i === 1 ? 9 : 7};${i === 1 ? 7 : 5}`, dur: `${2.5 + i * 0.3}s`, repeatCount: "indefinite" }) }, i)))] }));
}
