import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Search, Plus, Download, ChevronUp, ChevronDown, ExternalLink, PauseCircle, PlayCircle, Columns3, X } from 'lucide-react';
import { api } from '../lib/api';
import { StatusBadge } from '../components/StatusBadge';
import { Drawer } from '../components/Drawer';
import { SkeletonRow } from '../components/Skeleton';
import { useToast } from '../components/Toast';
import { useConfirm } from '../components/ConfirmDialog';
const PAGE_SIZE = 20;
const COLUMN_LABELS = { plan: 'Plan', pppoe: 'Usuario PPPoE', technician: 'Técnico' };
export function CustomersListPage() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [items, setItems] = useState([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState('');
    const [status, setStatus] = useState(searchParams.get('status') ?? '');
    const [loading, setLoading] = useState(true);
    const [sort, setSort] = useState({ key: 'name', dir: 'asc' });
    const [selected, setSelected] = useState(null);
    const [selectedIds, setSelectedIds] = useState(new Set());
    const [columns, setColumns] = useState(new Set(['plan', 'pppoe', 'technician']));
    const [columnsOpen, setColumnsOpen] = useState(false);
    const toast = useToast();
    const confirm = useConfirm();
    useEffect(() => {
        setPage(1);
    }, [search, status]);
    useEffect(() => {
        const timeout = setTimeout(() => {
            setLoading(true);
            api
                .get('/customers', { params: { search: search || undefined, status: status || undefined, page, pageSize: PAGE_SIZE } })
                .then((res) => {
                setItems(res.data.items);
                setTotal(res.data.total ?? res.data.items.length);
            })
                .finally(() => setLoading(false));
        }, 300);
        return () => clearTimeout(timeout);
    }, [search, status, page]);
    const sorted = useMemo(() => {
        const copy = [...items];
        copy.sort((a, b) => {
            let cmp = 0;
            if (sort.key === 'name')
                cmp = `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`);
            if (sort.key === 'status')
                cmp = a.status.localeCompare(b.status);
            return sort.dir === 'asc' ? cmp : -cmp;
        });
        return copy;
    }, [items, sort]);
    function toggleSort(key) {
        setSort((s) => (s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' }));
    }
    function exportCsv() {
        const header = ['Nombre', 'Documento', 'Teléfono', 'Plan', 'Usuario PPPoE', 'Técnico', 'Estado'];
        const rows = sorted.map((c) => [
            `${c.firstName} ${c.lastName}`,
            c.documentId ?? '',
            c.phone ?? '',
            c.services[0]?.plan?.name ?? '',
            c.services[0]?.pppoeUsername ?? '',
            c.technician ? `${c.technician.firstName} ${c.technician.lastName}` : '',
            c.status,
        ]);
        const csv = [header, ...rows].map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `clientes_pagina_${page}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    }
    function reload() {
        setLoading(true);
        return api
            .get('/customers', { params: { search: search || undefined, status: status || undefined, page, pageSize: PAGE_SIZE } })
            .then((res) => {
            setItems(res.data.items);
            setTotal(res.data.total ?? res.data.items.length);
        })
            .finally(() => setLoading(false));
    }
    function toggleColumn(key) {
        setColumns((prev) => {
            const next = new Set(prev);
            next.has(key) ? next.delete(key) : next.add(key);
            return next;
        });
    }
    function toggleSelectRow(id) {
        setSelectedIds((prev) => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    }
    function toggleSelectAll() {
        setSelectedIds((prev) => (prev.size === sorted.length ? new Set() : new Set(sorted.map((c) => c.id))));
    }
    async function bulkAction(action) {
        const ok = await confirm({
            title: action === 'suspend' ? `¿Suspender ${selectedIds.size} cliente(s)?` : `¿Reactivar ${selectedIds.size} cliente(s)?`,
            danger: action === 'suspend',
            confirmLabel: action === 'suspend' ? 'Suspender' : 'Reactivar',
        });
        if (!ok)
            return;
        await Promise.all(Array.from(selectedIds).map((id) => api.post(`/customers/${id}/${action}`, action === 'suspend' ? { reason: 'Suspensión masiva desde el panel' } : {}).catch(() => null)));
        toast.success('Cambios aplicados.');
        setSelectedIds(new Set());
        await reload();
    }
    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    return (_jsxs("div", { className: "p-8 max-w-7xl page-enter", children: [_jsxs("div", { className: "flex items-center justify-between mb-6", children: [_jsxs("div", { children: [_jsx("h1", { className: "text-2xl font-display font-bold mb-1", children: "Clientes" }), _jsx("p", { className: "text-muted text-sm", children: "Busca por nombre, documento, tel\u00E9fono o usuario PPPoE." })] }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsxs("div", { className: "relative", children: [_jsxs("button", { onClick: () => setColumnsOpen((v) => !v), className: "flex items-center gap-2 border border-border text-sm rounded-md px-3 py-2 text-muted hover:text-ink", children: [_jsx(Columns3, { size: 15 }), " Columnas"] }), columnsOpen && (_jsx("div", { className: "absolute right-0 top-full mt-1.5 w-48 bg-surface border border-border rounded-md shadow-2xl overflow-hidden z-20 p-2", children: Object.keys(COLUMN_LABELS).map((key) => (_jsxs("label", { className: "flex items-center gap-2 px-2 py-1.5 text-sm hover:bg-surface-raised rounded cursor-pointer", children: [_jsx("input", { type: "checkbox", checked: columns.has(key), onChange: () => toggleColumn(key), className: "rounded border-border accent-signal" }), COLUMN_LABELS[key]] }, key))) }))] }), _jsxs("button", { onClick: exportCsv, disabled: items.length === 0, className: "flex items-center gap-2 border border-border text-sm rounded-md px-3 py-2 text-muted hover:text-ink disabled:opacity-40", children: [_jsx(Download, { size: 15 }), " Exportar p\u00E1gina"] }), _jsxs("button", { onClick: () => navigate('/clientes/nuevo'), className: "flex items-center gap-2 bg-signal text-base text-sm font-medium rounded-md px-4 py-2 hover:opacity-90 transition-opacity", children: [_jsx(Plus, { size: 16 }), " Nuevo cliente"] })] })] }), selectedIds.size > 0 && (_jsxs("div", { className: "flex items-center gap-3 mb-3 bg-surface-raised border border-border rounded-md px-4 py-2.5 text-sm", children: [_jsxs("span", { children: [selectedIds.size, " seleccionado(s)"] }), _jsxs("div", { className: "flex gap-2 ml-auto", children: [_jsx("button", { onClick: () => bulkAction('reactivate'), className: "text-xs border border-border rounded px-2.5 py-1 text-ok hover:bg-ok/10", children: "Reactivar" }), _jsx("button", { onClick: () => bulkAction('suspend'), className: "text-xs border border-border rounded px-2.5 py-1 text-critical hover:bg-critical/10", children: "Suspender" })] }), _jsx("button", { onClick: () => setSelectedIds(new Set()), className: "text-muted hover:text-ink", "aria-label": "Deseleccionar todo", children: _jsx(X, { size: 14 }) })] })), _jsxs("div", { className: "flex items-center gap-3 mb-4", children: [_jsxs("div", { className: "relative flex-1 max-w-sm", children: [_jsx(Search, { size: 16, className: "absolute left-3 top-1/2 -translate-y-1/2 text-muted" }), _jsx("input", { value: search, onChange: (e) => setSearch(e.target.value), placeholder: "Buscar cliente\u2026", className: "w-full bg-surface border border-border rounded-md pl-9 pr-3 py-2 text-sm outline-none focus:border-signal" })] }), _jsxs("select", { value: status, onChange: (e) => setStatus(e.target.value), className: "bg-surface border border-border rounded-md px-3 py-2 text-sm outline-none focus:border-signal", children: [_jsx("option", { value: "", children: "Todos los estados" }), _jsx("option", { value: "ACTIVE", children: "Activo" }), _jsx("option", { value: "SUSPENDED", children: "Suspendido" }), _jsx("option", { value: "DISCONNECTED", children: "Desconectado" }), _jsx("option", { value: "PENDING_INSTALLATION", children: "Por instalar" })] })] }), _jsx("div", { className: "border border-border rounded-md overflow-hidden overflow-x-auto", children: _jsxs("table", { className: "w-full text-sm", children: [_jsx("thead", { className: "bg-surface text-muted text-xs", children: _jsxs("tr", { children: [_jsx("th", { className: "px-4 py-3 w-10", children: _jsx("input", { type: "checkbox", checked: sorted.length > 0 && selectedIds.size === sorted.length, onChange: toggleSelectAll, className: "rounded border-border accent-signal", "aria-label": "Seleccionar todos" }) }), _jsx(SortableHeader, { label: "Cliente", active: sort.key === 'name', dir: sort.dir, onClick: () => toggleSort('name') }), columns.has('plan') && _jsx("th", { className: "text-left px-4 py-3 font-medium", children: "Plan" }), columns.has('pppoe') && _jsx("th", { className: "text-left px-4 py-3 font-medium", children: "Usuario PPPoE" }), columns.has('technician') && _jsx("th", { className: "text-left px-4 py-3 font-medium", children: "T\u00E9cnico" }), _jsx(SortableHeader, { label: "Estado", active: sort.key === 'status', dir: sort.dir, onClick: () => toggleSort('status') })] }) }), _jsx("tbody", { children: loading ? (Array.from({ length: 6 }).map((_, i) => _jsx(SkeletonRow, { cols: 5 }, i))) : sorted.length === 0 ? (_jsx("tr", { children: _jsx("td", { colSpan: 6, className: "px-4 py-6 text-center text-muted", children: "Sin resultados" }) })) : (sorted.map((c) => (_jsxs("tr", { className: "border-t border-border hover:bg-surface-raised/50 transition-colors", children: [_jsx("td", { className: "px-4 py-3", onClick: (e) => e.stopPropagation(), children: _jsx("input", { type: "checkbox", checked: selectedIds.has(c.id), onChange: () => toggleSelectRow(c.id), className: "rounded border-border accent-signal", "aria-label": `Seleccionar ${c.firstName} ${c.lastName}` }) }), _jsxs("td", { className: "px-4 py-3 cursor-pointer", onClick: () => setSelected(c), children: [_jsxs("p", { className: "font-medium", children: [c.firstName, " ", c.lastName] }), _jsxs("p", { className: "text-xs text-muted", children: [c.documentId ?? '—', " \u00B7 ", c.phone ?? 'sin teléfono'] })] }), columns.has('plan') && (_jsx("td", { className: "px-4 py-3 cursor-pointer", onClick: () => setSelected(c), children: c.services[0]?.plan?.name ?? '—' })), columns.has('pppoe') && (_jsx("td", { className: "px-4 py-3 text-muted cursor-pointer", onClick: () => setSelected(c), children: c.services[0]?.pppoeUsername ?? '—' })), columns.has('technician') && (_jsx("td", { className: "px-4 py-3 text-muted cursor-pointer", onClick: () => setSelected(c), children: c.technician ? `${c.technician.firstName} ${c.technician.lastName}` : '—' })), _jsx("td", { className: "px-4 py-3 cursor-pointer", onClick: () => setSelected(c), children: _jsx(StatusBadge, { status: c.status }) })] }, c.id)))) })] }) }), !loading && total > 0 && (_jsxs("div", { className: "flex items-center justify-between mt-4 text-xs text-muted", children: [_jsxs("span", { children: [total, " cliente", total !== 1 ? 's' : '', " \u00B7 p\u00E1gina ", page, " de ", totalPages] }), _jsxs("div", { className: "flex gap-2", children: [_jsx("button", { onClick: () => setPage((p) => Math.max(1, p - 1)), disabled: page <= 1, className: "border border-border rounded px-2.5 py-1 disabled:opacity-40 hover:text-ink", children: "Anterior" }), _jsx("button", { onClick: () => setPage((p) => Math.min(totalPages, p + 1)), disabled: page >= totalPages, className: "border border-border rounded px-2.5 py-1 disabled:opacity-40 hover:text-ink", children: "Siguiente" })] })] })), selected && (_jsx(CustomerQuickDrawer, { customer: selected, onClose: () => setSelected(null), onGoFull: () => navigate(`/clientes/${selected.id}`), onChanged: reload, toast: toast, confirm: confirm }))] }));
}
function SortableHeader({ label, active, dir, onClick }) {
    return (_jsx("th", { className: "text-left px-4 py-3 font-medium", children: _jsxs("button", { onClick: onClick, className: "flex items-center gap-1 hover:text-ink", children: [label, active && (dir === 'asc' ? _jsx(ChevronUp, { size: 12 }) : _jsx(ChevronDown, { size: 12 }))] }) }));
}
function CustomerQuickDrawer({ customer, onClose, onGoFull, onChanged, toast, confirm, }) {
    const [busy, setBusy] = useState(false);
    const [ticketOpen, setTicketOpen] = useState(false);
    const [ticketSubject, setTicketSubject] = useState('');
    const [creatingTicket, setCreatingTicket] = useState(false);
    const isSuspended = customer.status === 'SUSPENDED';
    const service = customer.services[0];
    async function toggleSuspension() {
        const ok = await confirm({
            title: isSuspended ? '¿Reactivar este cliente?' : '¿Suspender este cliente?',
            confirmLabel: isSuspended ? 'Reactivar' : 'Suspender',
            danger: !isSuspended,
        });
        if (!ok)
            return;
        setBusy(true);
        try {
            await api.post(`/customers/${customer.id}/${isSuspended ? 'reactivate' : 'suspend'}`, isSuspended ? {} : { reason: 'Suspensión manual desde el panel' });
            toast.success(isSuspended ? 'Cliente reactivado.' : 'Cliente suspendido.');
            onChanged();
            onClose();
        }
        finally {
            setBusy(false);
        }
    }
    async function createTicket() {
        if (!ticketSubject.trim())
            return;
        setCreatingTicket(true);
        try {
            await api.post('/tickets', { customerId: customer.id, subject: ticketSubject, category: 'OTRO' });
            toast.success('Ticket creado.');
            setTicketSubject('');
            setTicketOpen(false);
        }
        catch {
            toast.error('No se pudo crear el ticket.');
        }
        finally {
            setCreatingTicket(false);
        }
    }
    return (_jsx(Drawer, { title: `${customer.firstName} ${customer.lastName}`, subtitle: customer.documentId ?? undefined, onClose: onClose, children: _jsxs("div", { className: "space-y-5", children: [_jsx(StatusBadge, { status: customer.status }), _jsxs("div", { className: "grid grid-cols-2 gap-3 text-sm", children: [_jsx(Info, { label: "Tel\u00E9fono", value: customer.phone }), _jsx(Info, { label: "Email", value: customer.email }), _jsx(Info, { label: "Direcci\u00F3n", value: customer.address }), _jsx(Info, { label: "T\u00E9cnico", value: customer.technician ? `${customer.technician.firstName} ${customer.technician.lastName}` : null })] }), service && (_jsxs("div", { className: "status-panel status-panel--ok py-3", children: [_jsx("p", { className: "text-sm font-medium", children: service.plan?.name }), _jsxs("p", { className: "text-xs text-muted", children: ["Usuario PPPoE: ", service.pppoeUsername ?? '—'] })] })), _jsxs("div", { className: "flex flex-col gap-2 pt-2 border-t border-border", children: [_jsxs("button", { onClick: onGoFull, className: "flex items-center justify-center gap-2 text-sm border border-border rounded-md py-2 hover:text-ink text-muted", children: [_jsx(ExternalLink, { size: 14 }), " Ver perfil completo"] }), _jsxs("button", { onClick: toggleSuspension, disabled: busy, className: `flex items-center justify-center gap-2 text-sm rounded-md py-2 font-medium disabled:opacity-50 ${isSuspended ? 'bg-ok text-base' : 'bg-critical text-white'}`, children: [isSuspended ? _jsx(PlayCircle, { size: 15 }) : _jsx(PauseCircle, { size: 15 }), isSuspended ? 'Reactivar' : 'Suspender'] }), !ticketOpen ? (_jsx("button", { onClick: () => setTicketOpen(true), className: "text-sm text-signal hover:underline py-1", children: "+ Crear ticket r\u00E1pido" })) : (_jsxs("div", { className: "space-y-2 pt-1", children: [_jsx("input", { autoFocus: true, value: ticketSubject, onChange: (e) => setTicketSubject(e.target.value), placeholder: "Asunto del ticket\u2026", className: "w-full bg-surface-raised border border-border rounded-md px-3 py-2 text-sm outline-none focus:border-signal" }), _jsxs("div", { className: "flex gap-2", children: [_jsx("button", { onClick: () => setTicketOpen(false), className: "flex-1 text-xs text-muted hover:text-ink py-1.5", children: "Cancelar" }), _jsx("button", { onClick: createTicket, disabled: creatingTicket || !ticketSubject.trim(), className: "flex-1 text-xs bg-signal text-base rounded py-1.5 disabled:opacity-50", children: creatingTicket ? 'Creando…' : 'Crear' })] })] }))] })] }) }));
}
function Info({ label, value }) {
    return (_jsxs("div", { children: [_jsx("p", { className: "text-xs text-muted mb-0.5", children: label }), _jsx("p", { children: value ?? '—' })] }));
}
