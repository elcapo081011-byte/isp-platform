import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check } from 'lucide-react';
import { api } from '../lib/api';
import { useToast } from '../components/Toast';
const STEPS = ['Datos personales', 'Servicio', 'Confirmar'];
export function NewCustomerPage() {
    const navigate = useNavigate();
    const toast = useToast();
    const [step, setStep] = useState(0);
    const [plans, setPlans] = useState([]);
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
    const [error, setError] = useState(null);
    const [saving, setSaving] = useState(false);
    useEffect(() => {
        api.get('/plans', { params: { status: 'ACTIVE' } }).then((res) => setPlans(res.data));
    }, []);
    function field(key) {
        return {
            value: form[key],
            onChange: (e) => setForm((f) => ({ ...f, [key]: e.target.value })),
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
            toast.success('Cliente creado.');
            navigate(`/clientes/${data.id}`);
        }
        catch (err) {
            setError(err?.response?.data?.message ?? 'No se pudo crear el cliente. Verifica los datos.');
        }
        finally {
            setSaving(false);
        }
    }
    const selectedPlan = plans.find((p) => p.id === form.planId);
    return (_jsxs("div", { className: "p-8 max-w-2xl page-enter", children: [_jsx("h1", { className: "text-2xl font-display font-bold mb-6", children: "Nuevo cliente" }), _jsx("div", { className: "flex items-center gap-2 mb-8", children: STEPS.map((s, i) => (_jsxs("div", { className: "flex items-center gap-2 flex-1", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("div", { className: `h-7 w-7 rounded-full flex items-center justify-center text-xs font-medium shrink-0 transition-colors ${i < step ? 'bg-signal text-base' : i === step ? 'bg-signal/20 text-signal border border-signal' : 'bg-surface-raised text-muted border border-border'}`, children: i < step ? _jsx(Check, { size: 13 }) : i + 1 }), _jsx("span", { className: `text-xs whitespace-nowrap ${i === step ? 'text-ink' : 'text-muted'}`, children: s })] }), i < STEPS.length - 1 && _jsx("div", { className: `h-px flex-1 ${i < step ? 'bg-signal' : 'bg-border'}` })] }, s))) }), _jsxs("form", { onSubmit: handleSubmit, children: [step === 0 && (_jsx("div", { className: "space-y-4", children: _jsxs("div", { className: "grid grid-cols-1 sm:grid-cols-2 gap-4", children: [_jsx(Input, { label: "Nombre", required: true, autoFocus: true, ...field('firstName') }), _jsx(Input, { label: "Apellido", required: true, ...field('lastName') }), _jsx(Input, { label: "Documento", ...field('documentId') }), _jsx(Input, { label: "Tel\u00E9fono", ...field('phone') }), _jsx(Input, { label: "Email", type: "email", ...field('email') }), _jsx("div", { className: "sm:col-span-2", children: _jsx(Input, { label: "Direcci\u00F3n", ...field('address') }) })] }) })), step === 1 && (_jsxs("div", { className: "space-y-4", children: [_jsx("p", { className: "text-sm text-muted", children: "El servicio es opcional \u2014 puedes agregarlo despu\u00E9s desde el perfil del cliente." }), _jsxs("div", { className: "grid grid-cols-1 sm:grid-cols-2 gap-4", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-sm text-muted mb-1.5", children: "Plan" }), _jsxs("select", { ...field('planId'), className: "w-full bg-surface border border-border rounded-md px-3 py-2.5 text-sm outline-none focus:border-signal", children: [_jsx("option", { value: "", children: "Sin plan por ahora" }), plans.map((p) => (_jsxs("option", { value: p.id, children: [p.name, " \u2014 ", p.downloadMbps, "/", p.uploadMbps, " Mbps \u2014 $", p.price] }, p.id)))] })] }), _jsx(Input, { label: "Usuario PPPoE", ...field('pppoeUsername') })] })] })), step === 2 && (_jsxs("div", { className: "space-y-4", children: [_jsx("p", { className: "text-sm text-muted", children: "Revisa antes de crear." }), _jsxs("div", { className: "status-panel status-panel--neutral space-y-2 text-sm", children: [_jsx(Row, { label: "Nombre", value: `${form.firstName} ${form.lastName}` }), _jsx(Row, { label: "Documento", value: form.documentId || '—' }), _jsx(Row, { label: "Tel\u00E9fono", value: form.phone || '—' }), _jsx(Row, { label: "Email", value: form.email || '—' }), _jsx(Row, { label: "Direcci\u00F3n", value: form.address || '—' }), _jsx(Row, { label: "Plan", value: selectedPlan ? `${selectedPlan.name} ($${selectedPlan.price})` : 'Sin plan' }), _jsx(Row, { label: "Usuario PPPoE", value: form.pppoeUsername || '—' })] })] })), error && _jsx("div", { className: "status-panel status-panel--critical text-sm py-3 mt-4", children: error }), _jsxs("div", { className: "flex justify-between mt-6", children: [_jsx("button", { type: "button", onClick: back, disabled: step === 0, className: "text-sm text-muted hover:text-ink px-4 py-2 disabled:opacity-0", children: "Atr\u00E1s" }), step < STEPS.length - 1 ? (_jsx("button", { type: "button", onClick: next, className: "bg-signal text-base font-medium rounded-md px-5 py-2.5 hover:opacity-90 transition-opacity", children: "Continuar" })) : (_jsx("button", { type: "submit", disabled: saving, className: "bg-signal text-base font-medium rounded-md px-5 py-2.5 hover:opacity-90 transition-opacity disabled:opacity-50", children: saving ? 'Guardando…' : 'Crear cliente' }))] })] })] }));
}
function Input({ label, ...props }) {
    return (_jsxs("div", { children: [_jsx("label", { className: "block text-sm text-muted mb-1.5", children: label }), _jsx("input", { ...props, className: "w-full bg-surface border border-border rounded-md px-3 py-2.5 text-sm outline-none focus:border-signal" })] }));
}
function Row({ label, value }) {
    return (_jsxs("div", { className: "flex justify-between", children: [_jsx("span", { className: "text-muted", children: label }), _jsx("span", { children: value })] }));
}
