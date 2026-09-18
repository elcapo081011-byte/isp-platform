import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { Plus, X, Send } from 'lucide-react';
import { api } from '../lib/api';
import { StatusBadge } from '../components/StatusBadge';
import { Drawer } from '../components/Drawer';
import { useToast } from '../components/Toast';
const CATEGORY_LABELS = {
    SIN_INTERNET: 'Sin Internet',
    LENTITUD: 'Lentitud',
    WIFI: 'WiFi',
    ONU_OFFLINE: 'ONU offline',
    SEÑAL: 'Baja señal',
    PAGO: 'Pago',
    OTRO: 'Otro',
};
const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];
const STATUSES = ['OPEN', 'IN_PROGRESS', 'WAITING_CUSTOMER', 'RESOLVED', 'CLOSED'];
function fieldClass() {
    return 'w-full bg-surface-raised border border-border rounded-md px-3 py-2 text-sm outline-none focus:border-signal transition-colors';
}
function labelClass() {
    return 'block text-xs text-muted mb-1.5';
}
export function TicketsPage() {
    const [tickets, setTickets] = useState([]);
    const [status, setStatus] = useState('');
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [customers, setCustomers] = useState([]);
    const [form, setForm] = useState({ customerId: '', subject: '', category: 'SIN_INTERNET', priority: 'MEDIUM' });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);
    const [selectedId, setSelectedId] = useState(null);
    const toast = useToast();
    async function load() {
        setLoading(true);
        try {
            const { data } = await api.get('/tickets', { params: { status: status || undefined } });
            setTickets(data);
        }
        finally {
            setLoading(false);
        }
    }
    useEffect(() => {
        load();
    }, [status]);
    function openCreate() {
        setForm({ customerId: '', subject: '', category: 'SIN_INTERNET', priority: 'MEDIUM' });
        setError(null);
        setModalOpen(true);
        if (customers.length === 0) {
            api.get('/customers', { params: { pageSize: 100 } }).then((res) => setCustomers(res.data.items));
        }
    }
    async function handleSubmit(e) {
        e.preventDefault();
        setSaving(true);
        setError(null);
        try {
            await api.post('/tickets', form);
            setModalOpen(false);
            toast.success('Ticket creado.');
            await load();
        }
        catch (err) {
            setError(err?.response?.data?.message ?? 'No se pudo crear el ticket.');
        }
        finally {
            setSaving(false);
        }
    }
    return (_jsxs("div", { className: "p-8 max-w-5xl page-enter", children: [_jsxs("div", { className: "flex items-start justify-between mb-6", children: [_jsxs("div", { children: [_jsx("h1", { className: "text-2xl font-display font-bold mb-1", children: "Tickets de soporte" }), _jsx("p", { className: "text-muted text-sm", children: "Reportes de clientes: sin Internet, lentitud, WiFi, ONU offline, se\u00F1al, pagos." })] }), _jsxs("button", { onClick: openCreate, className: "flex items-center gap-2 bg-signal text-base text-sm font-medium rounded-md px-4 py-2 hover:opacity-90 transition-opacity shrink-0", children: [_jsx(Plus, { size: 16 }), " Nuevo ticket"] })] }), _jsx("div", { className: "flex gap-2 mb-4", children: ['', 'OPEN', 'IN_PROGRESS', 'WAITING_CUSTOMER', 'RESOLVED', 'CLOSED'].map((s) => (_jsx("button", { onClick: () => setStatus(s), className: `text-xs px-3 py-1.5 rounded-md border ${status === s ? 'bg-signal text-base border-signal' : 'border-border text-muted hover:text-ink'}`, children: s || 'Todos' }, s))) }), _jsx("div", { className: "space-y-2", children: loading ? (_jsx("p", { className: "text-muted text-sm", children: "Cargando\u2026" })) : tickets.length === 0 ? (_jsx("p", { className: "text-muted text-sm", children: "No hay tickets en este estado." })) : (tickets.map((t) => (_jsxs("button", { onClick: () => setSelectedId(t.id), className: "w-full text-left status-panel status-panel--neutral flex items-center justify-between lift-on-hover", children: [_jsxs("div", { children: [_jsx("p", { className: "font-medium", children: t.subject }), _jsxs("p", { className: "text-xs text-muted", children: [t.customer.firstName, " ", t.customer.lastName, " \u00B7 ", CATEGORY_LABELS[t.category] ?? t.category, t.assignedTo && ` · Asignado a ${t.assignedTo.firstName} ${t.assignedTo.lastName}`] })] }), _jsx(StatusBadge, { status: t.status })] }, t.id)))) }), modalOpen && (_jsx("div", { className: "fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 backdrop-blur-sm p-6 pt-[8vh]", onClick: () => setModalOpen(false), children: _jsxs("div", { onClick: (e) => e.stopPropagation(), className: "w-full max-w-lg bg-surface border border-border rounded-lg shadow-2xl", children: [_jsxs("div", { className: "flex items-start justify-between border-b border-border px-6 py-4", children: [_jsx("h2", { className: "font-display font-bold text-lg", children: "Nuevo ticket" }), _jsx("button", { onClick: () => setModalOpen(false), className: "text-muted hover:text-ink p-1 -mr-1 -mt-1", "aria-label": "Cerrar", children: _jsx(X, { size: 18 }) })] }), _jsxs("form", { onSubmit: handleSubmit, className: "px-6 py-5 space-y-4", children: [error && _jsx("div", { className: "status-panel status-panel--critical text-sm text-critical py-2.5", children: error }), _jsxs("div", { children: [_jsx("label", { className: labelClass(), children: "Cliente" }), _jsxs("select", { required: true, value: form.customerId, onChange: (e) => setForm({ ...form, customerId: e.target.value }), className: fieldClass(), children: [_jsx("option", { value: "", children: "Selecciona un cliente\u2026" }), customers.map((c) => (_jsxs("option", { value: c.id, children: [c.firstName, " ", c.lastName] }, c.id)))] })] }), _jsxs("div", { children: [_jsx("label", { className: labelClass(), children: "Asunto" }), _jsx("input", { required: true, minLength: 3, value: form.subject, onChange: (e) => setForm({ ...form, subject: e.target.value }), className: fieldClass() })] }), _jsxs("div", { className: "grid grid-cols-1 sm:grid-cols-2 gap-3", children: [_jsxs("div", { children: [_jsx("label", { className: labelClass(), children: "Categor\u00EDa" }), _jsx("select", { value: form.category, onChange: (e) => setForm({ ...form, category: e.target.value }), className: fieldClass(), children: Object.entries(CATEGORY_LABELS).map(([k, v]) => (_jsx("option", { value: k, children: v }, k))) })] }), _jsxs("div", { children: [_jsx("label", { className: labelClass(), children: "Prioridad" }), _jsx("select", { value: form.priority, onChange: (e) => setForm({ ...form, priority: e.target.value }), className: fieldClass(), children: PRIORITIES.map((p) => (_jsx("option", { value: p, children: p }, p))) })] })] }), _jsxs("div", { className: "flex justify-end gap-2 pt-2", children: [_jsx("button", { type: "button", onClick: () => setModalOpen(false), className: "text-sm text-muted hover:text-ink px-4 py-2", children: "Cancelar" }), _jsx("button", { type: "submit", disabled: saving, className: "bg-signal text-base text-sm font-medium rounded-md px-5 py-2 disabled:opacity-50", children: saving ? 'Creando…' : 'Crear ticket' })] })] })] }) })), selectedId && (_jsx(TicketDrawer, { id: selectedId, onClose: () => setSelectedId(null), onChanged: load }))] }));
}
function TicketDrawer({ id, onClose, onChanged }) {
    const [ticket, setTicket] = useState(null);
    const [comment, setComment] = useState('');
    const [posting, setPosting] = useState(false);
    const [changingStatus, setChangingStatus] = useState(false);
    const toast = useToast();
    async function load() {
        const { data } = await api.get(`/tickets/${id}`);
        setTicket(data);
    }
    useEffect(() => {
        load();
    }, [id]);
    async function addComment() {
        if (!comment.trim())
            return;
        setPosting(true);
        try {
            await api.post(`/tickets/${id}/comments`, { body: comment });
            setComment('');
            await load();
        }
        finally {
            setPosting(false);
        }
    }
    async function changeStatus(newStatus) {
        setChangingStatus(true);
        try {
            await api.put(`/tickets/${id}/status`, { status: newStatus });
            toast.success('Estado actualizado.');
            await load();
            onChanged();
        }
        finally {
            setChangingStatus(false);
        }
    }
    if (!ticket) {
        return (_jsx(Drawer, { title: "Cargando\u2026", onClose: onClose, children: _jsx("p", { className: "text-sm text-muted", children: "Cargando ticket\u2026" }) }));
    }
    return (_jsx(Drawer, { title: ticket.subject, subtitle: `${ticket.customer.firstName} ${ticket.customer.lastName}`, onClose: onClose, width: "md", children: _jsxs("div", { className: "space-y-5", children: [_jsxs("div", { className: "flex items-center gap-2 flex-wrap", children: [_jsx(StatusBadge, { status: ticket.status }), _jsx("span", { className: "text-xs text-muted", children: CATEGORY_LABELS[ticket.category] ?? ticket.category }), _jsxs("span", { className: "text-xs text-muted", children: ["\u00B7 ", ticket.priority] })] }), _jsxs("div", { children: [_jsx("label", { className: labelClass(), children: "Cambiar estado" }), _jsx("select", { value: ticket.status, disabled: changingStatus, onChange: (e) => changeStatus(e.target.value), className: fieldClass(), children: STATUSES.map((s) => (_jsx("option", { value: s, children: s }, s))) })] }), _jsxs("div", { children: [_jsx("p", { className: "text-xs font-medium text-muted mb-2 uppercase tracking-wide", children: "Comentarios" }), ticket.comments.length === 0 ? (_jsx("p", { className: "text-sm text-muted", children: "Sin comentarios todav\u00EDa." })) : (_jsx("div", { className: "space-y-3 max-h-64 overflow-y-auto pr-1", children: ticket.comments.map((c) => (_jsxs("div", { className: "text-sm", children: [_jsxs("p", { className: "text-xs text-muted mb-0.5", children: [c.author ? `${c.author.firstName} ${c.author.lastName}` : 'Sistema', " \u00B7 ", new Date(c.createdAt).toLocaleString('es-DO')] }), _jsx("p", { children: c.body })] }, c.id))) })), _jsxs("div", { className: "flex gap-2 mt-3", children: [_jsx("input", { value: comment, onChange: (e) => setComment(e.target.value), onKeyDown: (e) => e.key === 'Enter' && addComment(), placeholder: "Escribe un comentario\u2026", className: fieldClass() }), _jsx("button", { onClick: addComment, disabled: posting || !comment.trim(), className: "bg-signal text-base rounded-md px-3 disabled:opacity-50 shrink-0", "aria-label": "Enviar comentario", children: _jsx(Send, { size: 14 }) })] })] })] }) }));
}
