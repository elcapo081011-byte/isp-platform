import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { StatusBadge } from '../components/StatusBadge';
const CATEGORY_LABELS = {
    SIN_INTERNET: 'Sin Internet', LENTITUD: 'Lentitud', WIFI: 'WiFi',
    ONU_OFFLINE: 'ONU offline', 'SEÑAL': 'Baja señal', PAGO: 'Pago', OTRO: 'Otro',
};
export function TicketsPage() {
    const [tickets, setTickets] = useState([]);
    const [status, setStatus] = useState('');
    useEffect(() => {
        api.get('/tickets', { params: { status: status || undefined } }).then((res) => setTickets(res.data));
    }, [status]);
    return (_jsxs("div", { className: "p-8 max-w-5xl", children: [_jsx("h1", { className: "text-2xl font-display font-bold mb-1", children: "Tickets de soporte" }), _jsx("p", { className: "text-muted text-sm mb-6", children: "Reportes de clientes: sin Internet, lentitud, WiFi, ONU offline, se\u00F1al, pagos." }), _jsx("div", { className: "flex gap-2 mb-4", children: ['', 'OPEN', 'IN_PROGRESS', 'WAITING_CUSTOMER', 'RESOLVED', 'CLOSED'].map((s) => (_jsx("button", { onClick: () => setStatus(s), className: `text-xs px-3 py-1.5 rounded-md border ${status === s ? 'bg-signal text-base border-signal' : 'border-border text-muted hover:text-ink'}`, children: s || 'Todos' }, s))) }), _jsxs("div", { className: "space-y-2", children: [tickets.map((t) => (_jsxs("div", { className: "status-panel status-panel--neutral flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("p", { className: "font-medium", children: t.subject }), _jsxs("p", { className: "text-xs text-muted", children: [t.customer.firstName, " ", t.customer.lastName, " \u00B7 ", CATEGORY_LABELS[t.category] ?? t.category, t.assignedTo && ` · Asignado a ${t.assignedTo.firstName} ${t.assignedTo.lastName}`] })] }), _jsx(StatusBadge, { status: t.status })] }, t.id))), tickets.length === 0 && _jsx("p", { className: "text-muted text-sm", children: "No hay tickets en este estado." })] })] }));
}
