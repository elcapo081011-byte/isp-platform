import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
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
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);
    function field(key) {
        return {
            value: form[key],
            onChange: (e) => setForm((f) => ({ ...f, [key]: e.target.value })),
        };
    }
    async function handleSubmit(e) {
        e.preventDefault();
        setError(null);
        setLoading(true);
        try {
            const { data } = await api.post('/auth/register', form);
            setSession(data);
            navigate('/dashboard');
        }
        catch (err) {
            setError(err?.response?.data?.message ?? 'No se pudo crear la cuenta. Verifica los datos.');
        }
        finally {
            setLoading(false);
        }
    }
    return (_jsx("div", { className: "min-h-screen flex items-center justify-center px-4 py-12", children: _jsxs("div", { className: "w-full max-w-sm", children: [_jsxs("div", { className: "flex items-center gap-2 mb-8", children: [_jsx(Radio, { className: "text-signal", size: 22, strokeWidth: 2.5 }), _jsx("span", { className: "font-display font-extrabold text-lg tracking-tight", children: "ISP Control" })] }), _jsx("h1", { className: "text-2xl font-display font-bold mb-1", children: "Crea la cuenta de tu ISP" }), _jsx("p", { className: "text-muted text-sm mb-8", children: "Tu propia cuenta aislada: tus clientes, tu MikroTik, tu OLT \u2014 nadie m\u00E1s los ve." }), _jsxs("form", { onSubmit: handleSubmit, className: "space-y-4", children: [_jsx(Field, { label: "Nombre de tu empresa", required: true, ...field('organizationName') }), _jsx(Field, { label: "Identificador \u00FAnico", required: true, placeholder: "ej. fibraveloz", ...field('slug') }), _jsxs("div", { className: "grid grid-cols-2 gap-3", children: [_jsx(Field, { label: "Tu nombre", required: true, ...field('firstName') }), _jsx(Field, { label: "Tu apellido", required: true, ...field('lastName') })] }), _jsx(Field, { label: "Correo", type: "email", required: true, ...field('email') }), _jsx(Field, { label: "Contrase\u00F1a", type: "password", required: true, ...field('password') }), error && _jsx("div", { className: "status-panel status-panel--critical text-sm py-3", children: error }), _jsx("button", { type: "submit", disabled: loading, className: "w-full bg-signal text-base font-medium rounded-md py-2.5 hover:opacity-90 transition-opacity disabled:opacity-50", children: loading ? 'Creando cuenta...' : 'Crear cuenta' })] }), _jsxs("p", { className: "text-sm text-muted mt-6 text-center", children: ["\u00BFYa tienes cuenta? ", _jsx(Link, { to: "/login", className: "text-signal hover:underline", children: "Inicia sesi\u00F3n" })] })] }) }));
}
function Field({ label, ...props }) {
    return (_jsxs("div", { children: [_jsx("label", { className: "block text-sm text-muted mb-1.5", children: label }), _jsx("input", { ...props, className: "w-full bg-surface border border-border rounded-md px-3 py-2.5 text-sm outline-none focus:border-signal transition-colors" })] }));
}
