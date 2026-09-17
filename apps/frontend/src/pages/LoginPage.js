import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Radio } from 'lucide-react';
import { api } from '../lib/api';
import { useAuthStore } from '../store/auth.store';
export function LoginPage() {
    const navigate = useNavigate();
    const setSession = useAuthStore((s) => s.setSession);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);
    async function handleSubmit(e) {
        e.preventDefault();
        setError(null);
        setLoading(true);
        try {
            const { data } = await api.post('/auth/login', { email, password });
            setSession(data);
            navigate('/dashboard');
        }
        catch {
            setError('No pudimos verificar esas credenciales. Revisa el correo y la contraseña.');
        }
        finally {
            setLoading(false);
        }
    }
    return (_jsx("div", { className: "min-h-screen flex items-center justify-center px-4", children: _jsxs("div", { className: "w-full max-w-sm", children: [_jsxs("div", { className: "flex items-center gap-2 mb-8", children: [_jsx(Radio, { className: "text-signal", size: 22, strokeWidth: 2.5 }), _jsx("span", { className: "font-display font-extrabold text-lg tracking-tight", children: "ISP Control" })] }), _jsx("h1", { className: "text-2xl font-display font-bold mb-1", children: "Entrar al panel" }), _jsx("p", { className: "text-muted text-sm mb-8", children: "Administra tu red desde un solo lugar." }), _jsxs("form", { onSubmit: handleSubmit, className: "space-y-4", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-sm text-muted mb-1.5", children: "Correo" }), _jsx("input", { type: "email", required: true, value: email, onChange: (e) => setEmail(e.target.value), className: "w-full bg-surface border border-border rounded-md px-3 py-2.5 text-sm outline-none focus:border-signal transition-colors", placeholder: "admin@tuisp.com" })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm text-muted mb-1.5", children: "Contrase\u00F1a" }), _jsx("input", { type: "password", required: true, value: password, onChange: (e) => setPassword(e.target.value), className: "w-full bg-surface border border-border rounded-md px-3 py-2.5 text-sm outline-none focus:border-signal transition-colors", placeholder: "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022" })] }), error && (_jsx("div", { className: "status-panel status-panel--critical text-sm py-3", children: error })), _jsx("button", { type: "submit", disabled: loading, className: "w-full bg-signal text-base font-medium rounded-md py-2.5 hover:opacity-90 transition-opacity disabled:opacity-50", children: loading ? 'Verificando...' : 'Entrar' })] }), _jsxs("p", { className: "text-sm text-muted mt-6 text-center", children: ["\u00BFTienes un ISP y a\u00FAn no tienes cuenta? ", _jsx(Link, { to: "/register", className: "text-signal hover:underline", children: "Crea la tuya" })] })] }) }));
}
