import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { Download } from 'lucide-react';
import { api } from '../lib/api';
import { StatusBadge } from '../components/StatusBadge';
export function BillingPage() {
    const [invoices, setInvoices] = useState([]);
    const [status, setStatus] = useState('');
    const [payingId, setPayingId] = useState(null);
    const [payAmount, setPayAmount] = useState('');
    async function load() {
        const { data } = await api.get('/billing/invoices', { params: { status: status || undefined } });
        setInvoices(data.items);
    }
    useEffect(() => { load(); }, [status]);
    async function registerPayment(id) {
        await api.post(`/billing/invoices/${id}/payments`, { amount: Number(payAmount) });
        setPayingId(null);
        setPayAmount('');
        await load();
    }
    return (_jsxs("div", { className: "p-8 max-w-6xl", children: [_jsx("h1", { className: "text-2xl font-display font-bold mb-1", children: "Facturaci\u00F3n" }), _jsx("p", { className: "text-muted text-sm mb-6", children: "La suspensi\u00F3n autom\u00E1tica por facturas vencidas corre todos los d\u00EDas \u2014 ver Configuraci\u00F3n para ajustar los d\u00EDas de gracia." }), _jsx("div", { className: "flex gap-2 mb-4", children: ['', 'PENDING', 'OVERDUE', 'PAID', 'PARTIAL'].map((s) => (_jsx("button", { onClick: () => setStatus(s), className: `text-xs px-3 py-1.5 rounded-md border ${status === s ? 'bg-signal text-base border-signal' : 'border-border text-muted hover:text-ink'}`, children: s || 'Todas' }, s))) }), _jsx("div", { className: "border border-border rounded-md overflow-hidden", children: _jsxs("table", { className: "w-full text-sm", children: [_jsx("thead", { className: "bg-surface text-muted text-xs", children: _jsxs("tr", { children: [_jsx("th", { className: "text-left px-4 py-3", children: "Factura" }), _jsx("th", { className: "text-left px-4 py-3", children: "Cliente" }), _jsx("th", { className: "text-left px-4 py-3", children: "Vence" }), _jsx("th", { className: "text-left px-4 py-3", children: "Monto" }), _jsx("th", { className: "text-left px-4 py-3", children: "Estado" }), _jsx("th", { className: "text-left px-4 py-3", children: "Acciones" })] }) }), _jsx("tbody", { children: invoices.map((inv) => (_jsxs("tr", { className: "border-t border-border", children: [_jsx("td", { className: "px-4 py-3", children: inv.number }), _jsxs("td", { className: "px-4 py-3", children: [inv.customer.firstName, " ", inv.customer.lastName] }), _jsx("td", { className: "px-4 py-3 text-muted", children: new Date(inv.dueDate).toLocaleDateString('es-DO') }), _jsxs("td", { className: "px-4 py-3", children: ["$", Number(inv.amount).toFixed(2)] }), _jsx("td", { className: "px-4 py-3", children: _jsx(StatusBadge, { status: inv.status }) }), _jsx("td", { className: "px-4 py-3", children: _jsxs("div", { className: "flex items-center gap-2", children: [_jsx("a", { href: `${api.defaults.baseURL}/billing/invoices/${inv.id}/pdf`, target: "_blank", rel: "noreferrer", className: "text-muted hover:text-ink", children: _jsx(Download, { size: 16 }) }), inv.status !== 'PAID' && inv.status !== 'CANCELLED' && (payingId === inv.id ? (_jsxs("div", { className: "flex items-center gap-1", children: [_jsx("input", { type: "number", value: payAmount, onChange: (e) => setPayAmount(e.target.value), className: "w-20 bg-surface-raised border border-border rounded px-2 py-1 text-xs", placeholder: "Monto" }), _jsx("button", { onClick: () => registerPayment(inv.id), className: "text-xs bg-signal text-base rounded px-2 py-1", children: "OK" })] })) : (_jsx("button", { onClick: () => setPayingId(inv.id), className: "text-xs text-signal hover:underline", children: "Registrar pago" })))] }) })] }, inv.id))) })] }) })] }));
}
