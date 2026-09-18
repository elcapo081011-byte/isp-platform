import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { Plus, X, ArrowRightLeft } from 'lucide-react';
import { api } from '../lib/api';
import { StatusBadge } from '../components/StatusBadge';
import { Drawer } from '../components/Drawer';
import { useToast } from '../components/Toast';
const CATEGORIES = ['ONU', 'ROUTER', 'OLT', 'SFP', 'FIBER', 'SPLITTER', 'NAP', 'CABLE', 'POWER_SUPPLY', 'OTHER'];
const STATUSES = ['IN_STOCK', 'INSTALLED', 'DAMAGED', 'IN_REPAIR', 'LOST'];
function fieldClass() {
    return 'w-full bg-surface-raised border border-border rounded-md px-3 py-2 text-sm outline-none focus:border-signal transition-colors';
}
function labelClass() {
    return 'block text-xs text-muted mb-1.5';
}
export function InventoryPage() {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [form, setForm] = useState({ category: 'ONU', name: '', serial: '', notes: '' });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);
    const [selected, setSelected] = useState(null);
    const [selectedIds, setSelectedIds] = useState(new Set());
    const toast = useToast();
    async function load() {
        setLoading(true);
        try {
            const { data } = await api.get('/inventory');
            setItems(data);
        }
        finally {
            setLoading(false);
        }
    }
    useEffect(() => {
        load();
    }, []);
    function openCreate() {
        setForm({ category: 'ONU', name: '', serial: '', notes: '' });
        setError(null);
        setModalOpen(true);
    }
    async function handleSubmit(e) {
        e.preventDefault();
        setSaving(true);
        setError(null);
        try {
            await api.post('/inventory', {
                category: form.category,
                name: form.name,
                serial: form.serial || undefined,
                notes: form.notes || undefined,
            });
            setModalOpen(false);
            toast.success('Artículo agregado.');
            await load();
        }
        catch (err) {
            setError(err?.response?.data?.message ?? 'No se pudo agregar el artículo.');
        }
        finally {
            setSaving(false);
        }
    }
    async function moveStatus(id, toStatus) {
        await api.post(`/inventory/${id}/move`, { toStatus });
        toast.success('Estado actualizado.');
        setSelected(null);
        await load();
    }
    async function bulkMove(toStatus) {
        await Promise.all(Array.from(selectedIds).map((id) => api.post(`/inventory/${id}/move`, { toStatus })));
        toast.success(`${selectedIds.size} artículo(s) actualizados.`);
        setSelectedIds(new Set());
        await load();
    }
    function toggleSelect(id) {
        setSelectedIds((prev) => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    }
    function toggleSelectAll() {
        setSelectedIds((prev) => (prev.size === items.length ? new Set() : new Set(items.map((i) => i.id))));
    }
    return (_jsxs("div", { className: "p-8 max-w-5xl page-enter", children: [_jsxs("div", { className: "flex items-start justify-between mb-6", children: [_jsxs("div", { children: [_jsx("h1", { className: "text-2xl font-display font-bold mb-1", children: "Inventario" }), _jsx("p", { className: "text-muted text-sm", children: "ONU, routers, OLT, SFP, fibra, splitters, NAP y m\u00E1s." })] }), _jsxs("button", { onClick: openCreate, className: "flex items-center gap-2 bg-signal text-base text-sm font-medium rounded-md px-4 py-2 hover:opacity-90 transition-opacity shrink-0", children: [_jsx(Plus, { size: 16 }), " Agregar art\u00EDculo"] })] }), selectedIds.size > 0 && (_jsxs("div", { className: "flex items-center gap-3 mb-3 bg-surface-raised border border-border rounded-md px-4 py-2.5 text-sm", children: [_jsxs("span", { children: [selectedIds.size, " seleccionado(s)"] }), _jsx("div", { className: "flex gap-1.5 ml-auto", children: STATUSES.map((s) => (_jsxs("button", { onClick: () => bulkMove(s), className: "text-xs border border-border rounded px-2 py-1 hover:text-ink text-muted", children: ["\u2192 ", s] }, s))) }), _jsx("button", { onClick: () => setSelectedIds(new Set()), className: "text-muted hover:text-ink", "aria-label": "Deseleccionar todo", children: _jsx(X, { size: 14 }) })] })), _jsx("div", { className: "border border-border rounded-md overflow-hidden overflow-x-auto", children: _jsxs("table", { className: "w-full text-sm", children: [_jsx("thead", { className: "bg-surface text-muted text-xs", children: _jsxs("tr", { children: [_jsx("th", { className: "px-4 py-3 w-10", children: _jsx("input", { type: "checkbox", checked: items.length > 0 && selectedIds.size === items.length, onChange: toggleSelectAll, className: "rounded border-border accent-signal", "aria-label": "Seleccionar todos" }) }), _jsx("th", { className: "text-left px-4 py-3", children: "Item" }), _jsx("th", { className: "text-left px-4 py-3", children: "Categor\u00EDa" }), _jsx("th", { className: "text-left px-4 py-3", children: "Serial" }), _jsx("th", { className: "text-left px-4 py-3", children: "Estado" })] }) }), _jsx("tbody", { children: loading ? (_jsx("tr", { children: _jsx("td", { colSpan: 5, className: "px-4 py-6 text-center text-muted", children: "Cargando\u2026" }) })) : items.length === 0 ? (_jsx("tr", { children: _jsx("td", { colSpan: 5, className: "px-4 py-6 text-center text-muted", children: "Sin art\u00EDculos registrados." }) })) : (items.map((i) => (_jsxs("tr", { className: "border-t border-border hover:bg-surface-raised/40", children: [_jsx("td", { className: "px-4 py-3", onClick: (e) => e.stopPropagation(), children: _jsx("input", { type: "checkbox", checked: selectedIds.has(i.id), onChange: () => toggleSelect(i.id), className: "rounded border-border accent-signal", "aria-label": `Seleccionar ${i.name}` }) }), _jsx("td", { className: "px-4 py-3 cursor-pointer", onClick: () => setSelected(i), children: i.name }), _jsx("td", { className: "px-4 py-3 text-muted cursor-pointer", onClick: () => setSelected(i), children: i.category }), _jsx("td", { className: "px-4 py-3 text-muted cursor-pointer", onClick: () => setSelected(i), children: i.serial ?? '—' }), _jsx("td", { className: "px-4 py-3 cursor-pointer", onClick: () => setSelected(i), children: _jsx(StatusBadge, { status: i.status }) })] }, i.id)))) })] }) }), modalOpen && (_jsx("div", { className: "fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 backdrop-blur-sm p-6 pt-[8vh]", onClick: () => setModalOpen(false), children: _jsxs("div", { onClick: (e) => e.stopPropagation(), className: "w-full max-w-lg bg-surface border border-border rounded-lg shadow-2xl", children: [_jsxs("div", { className: "flex items-start justify-between border-b border-border px-6 py-4", children: [_jsx("h2", { className: "font-display font-bold text-lg", children: "Agregar art\u00EDculo" }), _jsx("button", { onClick: () => setModalOpen(false), className: "text-muted hover:text-ink p-1 -mr-1 -mt-1", "aria-label": "Cerrar", children: _jsx(X, { size: 18 }) })] }), _jsxs("form", { onSubmit: handleSubmit, className: "px-6 py-5 space-y-4", children: [error && _jsx("div", { className: "status-panel status-panel--critical text-sm text-critical py-2.5", children: error }), _jsxs("div", { children: [_jsx("label", { className: labelClass(), children: "Categor\u00EDa" }), _jsx("select", { value: form.category, onChange: (e) => setForm({ ...form, category: e.target.value }), className: fieldClass(), children: CATEGORIES.map((c) => (_jsx("option", { value: c, children: c }, c))) })] }), _jsxs("div", { children: [_jsx("label", { className: labelClass(), children: "Nombre" }), _jsx("input", { required: true, placeholder: "Ej. ONU HG8310M #482", value: form.name, onChange: (e) => setForm({ ...form, name: e.target.value }), className: fieldClass() })] }), _jsxs("div", { children: [_jsx("label", { className: labelClass(), children: "Serial (opcional)" }), _jsx("input", { value: form.serial, onChange: (e) => setForm({ ...form, serial: e.target.value }), className: fieldClass() })] }), _jsxs("div", { children: [_jsx("label", { className: labelClass(), children: "Notas (opcional)" }), _jsx("textarea", { rows: 2, value: form.notes, onChange: (e) => setForm({ ...form, notes: e.target.value }), className: fieldClass() })] }), _jsxs("div", { className: "flex justify-end gap-2 pt-2", children: [_jsx("button", { type: "button", onClick: () => setModalOpen(false), className: "text-sm text-muted hover:text-ink px-4 py-2", children: "Cancelar" }), _jsx("button", { type: "submit", disabled: saving, className: "bg-signal text-base text-sm font-medium rounded-md px-5 py-2 disabled:opacity-50", children: saving ? 'Guardando…' : 'Agregar' })] })] })] }) })), selected && (_jsx(Drawer, { title: selected.name, subtitle: selected.category, onClose: () => setSelected(null), children: _jsxs("div", { className: "space-y-4", children: [_jsx(StatusBadge, { status: selected.status }), _jsxs("div", { className: "text-sm space-y-2", children: [_jsx(Row, { label: "Serial", value: selected.serial ?? '—' }), _jsx(Row, { label: "Notas", value: selected.notes ?? '—' }), _jsx(Row, { label: "Agregado", value: new Date(selected.createdAt).toLocaleDateString('es-DO') })] }), _jsxs("div", { className: "pt-3 border-t border-border", children: [_jsx("p", { className: labelClass(), children: "Mover a" }), _jsx("div", { className: "flex flex-wrap gap-1.5", children: STATUSES.filter((s) => s !== selected.status).map((s) => (_jsxs("button", { onClick: () => moveStatus(selected.id, s), className: "flex items-center gap-1 text-xs border border-border rounded px-2 py-1.5 hover:text-ink text-muted", children: [_jsx(ArrowRightLeft, { size: 11 }), " ", s] }, s))) })] }), _jsx("p", { className: "text-xs text-muted pt-3 border-t border-border", children: "El historial detallado de movimientos a\u00FAn no tiene una vista dedicada \u2014 pr\u00F3ximamente." })] }) }))] }));
}
function Row({ label, value }) {
    return (_jsxs("div", { className: "flex justify-between", children: [_jsx("span", { className: "text-muted", children: label }), _jsx("span", { className: "text-right", children: value })] }));
}
