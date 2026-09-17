import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
export function NewCustomerPage() {
    const navigate = useNavigate();
    const [plans, setPlans] = useState([]);
    const [form, setForm] = useState({
        firstName: '', lastName: '', documentId: '', phone: '', email: '', address: '', planId: '', pppoeUsername: '',
    });
    const [error, setError] = useState(null);
    const [saving, setSaving] = useState(false);
    useEffect(() => {
        api.get('/plans', { params: { status: 'ACTIVE' } }).then((res) => setPlans(res.data));
    }, []);
    async function handleSubmit(e) {
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
        }
        catch {
            setError('No se pudo crear el cliente. Verifica los datos.');
        }
        finally {
            setSaving(false);
        }
    }
    function field(key) {
        return {
            value: form[key],
            onChange: (e) => setForm((f) => ({ ...f, [key]: e.target.value })),
        };
    }
    return (_jsxs("div", { className: "p-8 max-w-2xl", children: [_jsx("h1", { className: "text-2xl font-display font-bold mb-6", children: "Nuevo cliente" }), _jsxs("form", { onSubmit: handleSubmit, className: "space-y-4", children: [_jsxs("div", { className: "grid grid-cols-2 gap-4", children: [_jsx(Input, { label: "Nombre", required: true, ...field('firstName') }), _jsx(Input, { label: "Apellido", required: true, ...field('lastName') }), _jsx(Input, { label: "Documento", ...field('documentId') }), _jsx(Input, { label: "Tel\u00E9fono", ...field('phone') }), _jsx(Input, { label: "Email", type: "email", ...field('email') }), _jsx("div", { className: "col-span-2", children: _jsx(Input, { label: "Direcci\u00F3n", ...field('address') }) })] }), _jsxs("div", { className: "border-t border-border pt-4", children: [_jsx("p", { className: "text-sm font-medium mb-3", children: "Servicio (opcional al crear)" }), _jsxs("div", { className: "grid grid-cols-2 gap-4", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-sm text-muted mb-1.5", children: "Plan" }), _jsxs("select", { ...field('planId'), className: "w-full bg-surface border border-border rounded-md px-3 py-2.5 text-sm outline-none focus:border-signal", children: [_jsx("option", { value: "", children: "Sin plan por ahora" }), plans.map((p) => (_jsxs("option", { value: p.id, children: [p.name, " \u2014 ", p.downloadMbps, "/", p.uploadMbps, " Mbps \u2014 $", p.price] }, p.id)))] })] }), _jsx(Input, { label: "Usuario PPPoE", ...field('pppoeUsername') })] })] }), error && _jsx("div", { className: "status-panel status-panel--critical text-sm py-3", children: error }), _jsx("button", { type: "submit", disabled: saving, className: "bg-signal text-base font-medium rounded-md px-5 py-2.5 hover:opacity-90 transition-opacity disabled:opacity-50", children: saving ? 'Guardando...' : 'Crear cliente' })] })] }));
}
function Input({ label, ...props }) {
    return (_jsxs("div", { children: [_jsx("label", { className: "block text-sm text-muted mb-1.5", children: label }), _jsx("input", { ...props, className: "w-full bg-surface border border-border rounded-md px-3 py-2.5 text-sm outline-none focus:border-signal" })] }));
}
