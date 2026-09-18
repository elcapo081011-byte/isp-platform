import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from 'react';
import { Plus, Pencil, Trash2, Gauge, Network, Layers, X } from 'lucide-react';
import { api } from '../lib/api';
import { useConfirm } from '../components/ConfirmDialog';
import { useToast } from '../components/Toast';
const TECHNOLOGIES = [
    { value: 'FTTH', label: 'Fibra (FTTH)' },
    { value: 'WIRELESS', label: 'Inalámbrico' },
    { value: 'CABLE', label: 'Cable' },
    { value: 'HOTSPOT', label: 'Hotspot' },
];
const EMPTY_FORM = {
    name: '',
    technology: 'FTTH',
    downloadMbps: '',
    uploadMbps: '',
    price: '',
    currency: 'USD',
    mikrotikProfile: '',
    burstLimit: '',
    priority: '8',
    vlan: '',
    description: '',
};
function fieldClass() {
    return 'w-full bg-surface-raised border border-border rounded-md px-3 py-2 text-sm outline-none focus:border-signal transition-colors';
}
function labelClass() {
    return 'block text-xs text-muted mb-1.5';
}
export function PlansPage() {
    const [plans, setPlans] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [form, setForm] = useState(EMPTY_FORM);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);
    const [filter, setFilter] = useState('ACTIVE');
    const confirm = useConfirm();
    const toast = useToast();
    async function load() {
        setLoading(true);
        try {
            const { data } = await api.get('/plans');
            setPlans(data);
        }
        finally {
            setLoading(false);
        }
    }
    useEffect(() => {
        load();
    }, []);
    const visiblePlans = useMemo(() => {
        if (filter === 'ALL')
            return plans;
        return plans.filter((p) => p.status === filter);
    }, [plans, filter]);
    function openCreate() {
        setEditingId(null);
        setForm(EMPTY_FORM);
        setError(null);
        setModalOpen(true);
    }
    function openEdit(p) {
        setEditingId(p.id);
        setForm({
            name: p.name,
            technology: p.technology,
            downloadMbps: String(p.downloadMbps),
            uploadMbps: String(p.uploadMbps),
            price: p.price,
            currency: p.currency,
            mikrotikProfile: p.mikrotikProfile ?? '',
            burstLimit: p.burstLimit ?? '',
            priority: String(p.priority ?? 8),
            vlan: p.vlan != null ? String(p.vlan) : '',
            description: p.description ?? '',
        });
        setError(null);
        setModalOpen(true);
    }
    async function handleSubmit(e) {
        e.preventDefault();
        setSaving(true);
        setError(null);
        try {
            const payload = {
                name: form.name,
                technology: form.technology,
                downloadMbps: Number(form.downloadMbps),
                uploadMbps: Number(form.uploadMbps),
                price: Number(form.price),
                currency: form.currency,
                mikrotikProfile: form.mikrotikProfile || undefined,
                burstLimit: form.burstLimit || undefined,
                priority: form.priority ? Number(form.priority) : undefined,
                vlan: form.vlan ? Number(form.vlan) : undefined,
                description: form.description || undefined,
            };
            if (editingId) {
                await api.put(`/plans/${editingId}`, payload);
            }
            else {
                await api.post('/plans', payload);
            }
            setModalOpen(false);
            toast.success(editingId ? 'Plan actualizado.' : 'Plan creado.');
            await load();
        }
        catch (err) {
            setError(err?.response?.data?.message ?? 'No se pudo guardar el plan.');
        }
        finally {
            setSaving(false);
        }
    }
    async function handleDelete(p) {
        const ok = await confirm({
            title: `¿Eliminar el plan "${p.name}"?`,
            description: 'Si tiene clientes activos, se marcará como inactivo en vez de borrarse.',
            confirmLabel: 'Eliminar',
            danger: true,
        });
        if (!ok)
            return;
        await api.delete(`/plans/${p.id}`);
        toast.success('Plan eliminado.');
        await load();
    }
    return (_jsxs("div", { className: "p-8 max-w-6xl page-enter", children: [_jsxs("div", { className: "flex items-start justify-between mb-6", children: [_jsxs("div", { children: [_jsx("h1", { className: "text-2xl font-display font-bold mb-1", children: "Planes de Internet" }), _jsx("p", { className: "text-muted text-sm max-w-lg", children: "Define velocidad, precio y el perfil que se aplicar\u00E1 en MikroTik u OLT al asignar el plan a un cliente." })] }), _jsxs("button", { onClick: openCreate, className: "flex items-center gap-2 bg-signal text-base text-sm font-medium rounded-md px-4 py-2 hover:opacity-90 transition-opacity shrink-0", children: [_jsx(Plus, { size: 16 }), " Nuevo plan"] })] }), _jsx("div", { className: "flex items-center gap-1 mb-5 border-b border-border", children: ['ACTIVE', 'INACTIVE', 'ALL'].map((f) => (_jsx("button", { onClick: () => setFilter(f), className: `px-3 py-2 text-sm border-b-2 -mb-px transition-colors ${filter === f ? 'border-signal text-ink' : 'border-transparent text-muted hover:text-ink'}`, children: f === 'ACTIVE' ? 'Activos' : f === 'INACTIVE' ? 'Inactivos' : 'Todos' }, f))) }), loading ? (_jsx("p", { className: "text-muted text-sm", children: "Cargando planes\u2026" })) : visiblePlans.length === 0 ? (_jsxs("div", { className: "status-panel status-panel--neutral text-sm text-muted", children: ["No hay planes ", filter === 'ACTIVE' ? 'activos' : filter === 'INACTIVE' ? 'inactivos' : '', " todav\u00EDa. Crea el primero con \"Nuevo plan\"."] })) : (_jsx("div", { className: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4", children: visiblePlans.map((p) => (_jsxs("div", { className: `status-panel group relative ${p.status === 'ACTIVE' ? 'status-panel--ok' : 'status-panel--neutral'}`, children: [_jsxs("div", { className: "flex items-start justify-between", children: [_jsxs("div", { children: [_jsx("p", { className: "font-display font-bold leading-tight", children: p.name }), _jsx("p", { className: "text-[11px] text-muted mt-0.5", children: TECHNOLOGIES.find((t) => t.value === p.technology)?.label ?? p.technology })] }), _jsxs("div", { className: "flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity", children: [_jsx("button", { onClick: () => openEdit(p), className: "text-muted hover:text-signal p-1", "aria-label": "Editar", children: _jsx(Pencil, { size: 14 }) }), _jsx("button", { onClick: () => handleDelete(p), className: "text-muted hover:text-critical p-1", "aria-label": "Eliminar", children: _jsx(Trash2, { size: 14 }) })] })] }), _jsxs("p", { className: "text-2xl font-display font-bold my-2", children: [p.downloadMbps, _jsxs("span", { className: "text-sm text-muted font-normal", children: ["/", p.uploadMbps, " Mbps"] })] }), _jsxs("p", { className: "text-sm text-muted mb-3", children: ["$", p.price, " ", p.currency, "/mes"] }), _jsxs("div", { className: "flex flex-wrap gap-1.5 text-[11px]", children: [p.mikrotikProfile && (_jsxs("span", { className: "inline-flex items-center gap-1 bg-signal/10 text-signal border border-signal/30 rounded px-1.5 py-0.5", children: [_jsx(Network, { size: 10 }), " ", p.mikrotikProfile] })), p.vlan != null && (_jsxs("span", { className: "inline-flex items-center gap-1 bg-white/5 text-muted border border-border rounded px-1.5 py-0.5", children: [_jsx(Layers, { size: 10 }), " VLAN ", p.vlan] })), p.burstLimit && (_jsxs("span", { className: "inline-flex items-center gap-1 bg-white/5 text-muted border border-border rounded px-1.5 py-0.5", children: [_jsx(Gauge, { size: 10 }), " Burst ", p.burstLimit] }))] }), p.status === 'INACTIVE' && _jsx("p", { className: "text-[10px] text-warn mt-2", children: "Inactivo" }), p.isDemo && _jsx("p", { className: "text-[10px] text-muted/70 mt-2", children: "Dato demo" })] }, p.id))) })), modalOpen && (_jsx("div", { className: "fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 backdrop-blur-sm p-6 pt-[6vh]", onClick: () => setModalOpen(false), children: _jsxs("div", { onClick: (e) => e.stopPropagation(), className: "w-full max-w-xl bg-surface border border-border rounded-lg shadow-2xl", children: [_jsxs("div", { className: "flex items-start justify-between border-b border-border px-6 py-4", children: [_jsxs("div", { children: [_jsx("h2", { className: "font-display font-bold text-lg", children: editingId ? 'Editar plan' : 'Nuevo plan' }), _jsx("p", { className: "text-xs text-muted mt-0.5", children: "El perfil de MikroTik se aplica autom\u00E1ticamente a cada cliente que use este plan." })] }), _jsx("button", { onClick: () => setModalOpen(false), className: "text-muted hover:text-ink p-1 -mr-1 -mt-1", "aria-label": "Cerrar", children: _jsx(X, { size: 18 }) })] }), _jsxs("form", { onSubmit: handleSubmit, className: "px-6 py-5 space-y-4", children: [error && (_jsx("div", { className: "status-panel status-panel--critical text-sm text-critical py-2.5", children: error })), _jsxs("div", { className: "grid grid-cols-1 sm:grid-cols-2 gap-3", children: [_jsxs("div", { className: "col-span-2", children: [_jsx("label", { className: labelClass(), children: "Nombre del plan" }), _jsx("input", { required: true, placeholder: "Ej. Fibra 100 Megas", value: form.name, onChange: (e) => setForm({ ...form, name: e.target.value }), className: fieldClass() })] }), _jsxs("div", { children: [_jsx("label", { className: labelClass(), children: "Tecnolog\u00EDa" }), _jsx("select", { value: form.technology, onChange: (e) => setForm({ ...form, technology: e.target.value }), className: fieldClass(), children: TECHNOLOGIES.map((t) => (_jsx("option", { value: t.value, children: t.label }, t.value))) })] }), _jsxs("div", { children: [_jsx("label", { className: labelClass(), children: "Precio" }), _jsxs("div", { className: "flex gap-1.5", children: [_jsx("input", { required: true, type: "number", min: "0", step: "0.01", value: form.price, onChange: (e) => setForm({ ...form, price: e.target.value }), className: fieldClass() }), _jsxs("select", { value: form.currency, onChange: (e) => setForm({ ...form, currency: e.target.value }), className: "bg-surface-raised border border-border rounded-md px-2 text-sm outline-none focus:border-signal w-20", children: [_jsx("option", { value: "USD", children: "USD" }), _jsx("option", { value: "DOP", children: "DOP" }), _jsx("option", { value: "MXN", children: "MXN" }), _jsx("option", { value: "COP", children: "COP" })] })] })] }), _jsxs("div", { children: [_jsx("label", { className: labelClass(), children: "Bajada (Mbps)" }), _jsx("input", { required: true, type: "number", min: "1", value: form.downloadMbps, onChange: (e) => setForm({ ...form, downloadMbps: e.target.value }), className: fieldClass() })] }), _jsxs("div", { children: [_jsx("label", { className: labelClass(), children: "Subida (Mbps)" }), _jsx("input", { required: true, type: "number", min: "1", value: form.uploadMbps, onChange: (e) => setForm({ ...form, uploadMbps: e.target.value }), className: fieldClass() })] })] }), _jsxs("div", { className: "border-t border-border pt-4", children: [_jsx("p", { className: "text-xs font-medium text-muted mb-3 uppercase tracking-wide", children: "Perfil de red (opcional)" }), _jsxs("div", { className: "grid grid-cols-1 sm:grid-cols-2 gap-3", children: [_jsxs("div", { className: "col-span-2", children: [_jsx("label", { className: labelClass(), children: "Perfil MikroTik (PPPoE / Simple Queue)" }), _jsx("input", { placeholder: "Ej. plan-100mb", value: form.mikrotikProfile, onChange: (e) => setForm({ ...form, mikrotikProfile: e.target.value }), className: fieldClass() })] }), _jsxs("div", { children: [_jsx("label", { className: labelClass(), children: "R\u00E1faga (burst)" }), _jsx("input", { placeholder: "Ej. 120M/130M 10/10 8", value: form.burstLimit, onChange: (e) => setForm({ ...form, burstLimit: e.target.value }), className: fieldClass() })] }), _jsxs("div", { children: [_jsx("label", { className: labelClass(), children: "Prioridad de cola" }), _jsx("input", { type: "number", min: "1", max: "8", value: form.priority, onChange: (e) => setForm({ ...form, priority: e.target.value }), className: fieldClass() })] }), _jsxs("div", { className: "col-span-2", children: [_jsx("label", { className: labelClass(), children: "VLAN" }), _jsx("input", { type: "number", placeholder: "Opcional", value: form.vlan, onChange: (e) => setForm({ ...form, vlan: e.target.value }), className: fieldClass() })] }), _jsxs("div", { className: "col-span-2", children: [_jsx("label", { className: labelClass(), children: "Descripci\u00F3n interna" }), _jsx("textarea", { rows: 2, value: form.description, onChange: (e) => setForm({ ...form, description: e.target.value }), className: fieldClass() })] })] })] }), _jsxs("div", { className: "flex justify-end gap-2 pt-2", children: [_jsx("button", { type: "button", onClick: () => setModalOpen(false), className: "text-sm text-muted hover:text-ink px-4 py-2", children: "Cancelar" }), _jsx("button", { type: "submit", disabled: saving, className: "bg-signal text-base text-sm font-medium rounded-md px-5 py-2 disabled:opacity-50", children: saving ? 'Guardando…' : editingId ? 'Guardar cambios' : 'Crear plan' })] })] })] }) }))] }));
}
