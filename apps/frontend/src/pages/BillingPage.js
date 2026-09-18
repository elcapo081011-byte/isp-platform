import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from 'react';
import { Download, Clock, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { api } from '../lib/api';
import { StatusBadge } from '../components/StatusBadge';
import { useToast } from '../components/Toast';
export function BillingPage() {
    const [invoices, setInvoices] = useState([]);
    const [status, setStatus] = useState('');
    const [payingId, setPayingId] = useState(null);
    const [payAmount, setPayAmount] = useState('');
    const [loading, setLoading] = useState(true);
    const toast = useToast();
    async function load() {
        setLoading(true);
        try {
            const { data } = await api.get('/billing/invoices', { params: { status: status || undefined } });
            setInvoices(data.items);
        }
        finally {
            setLoading(false);
        }
    }
    useEffect(() => {
        load();
    }, [status]);
    const totals = useMemo(() => {
        const sum = (pred) => invoices.filter(pred).reduce((acc, i) => acc + Number(i.amount), 0);
        return {
            paid: sum((i) => i.status === 'PAID'),
            pending: sum((i) => i.status === 'PENDING'),
            overdue: sum((i) => i.status === 'OVERDUE'),
        };
    }, [invoices]);
    async function registerPayment(id) {
        try {
            await api.post(`/billing/invoices/${id}/payments`, { amount: Number(payAmount) });
            setPayingId(null);
            setPayAmount('');
            toast.success('Pago registrado.');
            await load();
        }
        catch (err) {
            toast.error(err?.response?.data?.message ?? 'No se pudo registrar el pago.');
        }
    }
    return (_jsxs("div", { className: "p-8 max-w-6xl page-enter", children: [_jsx("h1", { className: "text-2xl font-display font-bold mb-1", children: "Facturaci\u00F3n" }), _jsx("p", { className: "text-muted text-sm mb-6", children: "La suspensi\u00F3n autom\u00E1tica por facturas vencidas corre todos los d\u00EDas \u2014 ver Configuraci\u00F3n para ajustar los d\u00EDas de gracia." }), _jsxs("div", { className: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6 max-w-2xl", children: [_jsx(SummaryCard, { icon: CheckCircle2, label: "Pagado (filtro actual)", value: totals.paid, accent: "ok" }), _jsx(SummaryCard, { icon: Clock, label: "Pendiente (filtro actual)", value: totals.pending, accent: "warn" }), _jsx(SummaryCard, { icon: AlertTriangle, label: "Vencido (filtro actual)", value: totals.overdue, accent: "critical" })] }), _jsx("div", { className: "flex gap-2 mb-4", children: ['', 'PENDING', 'OVERDUE', 'PAID', 'PARTIAL'].map((s) => (_jsx("button", { onClick: () => setStatus(s), className: `text-xs px-3 py-1.5 rounded-md border ${status === s ? 'bg-signal text-base border-signal' : 'border-border text-muted hover:text-ink'}`, children: s || 'Todas' }, s))) }), _jsx("div", { className: "border border-border rounded-md overflow-hidden overflow-x-auto", children: _jsxs("table", { className: "w-full text-sm", children: [_jsx("thead", { className: "bg-surface text-muted text-xs", children: _jsxs("tr", { children: [_jsx("th", { className: "text-left px-4 py-3", children: "Factura" }), _jsx("th", { className: "text-left px-4 py-3", children: "Cliente" }), _jsx("th", { className: "text-left px-4 py-3", children: "Vence" }), _jsx("th", { className: "text-left px-4 py-3", children: "Monto" }), _jsx("th", { className: "text-left px-4 py-3", children: "Estado" }), _jsx("th", { className: "text-left px-4 py-3", children: "Acciones" })] }) }), _jsx("tbody", { children: loading ? (_jsx("tr", { children: _jsx("td", { colSpan: 6, className: "px-4 py-6 text-center text-muted", children: "Cargando\u2026" }) })) : invoices.length === 0 ? (_jsx("tr", { children: _jsx("td", { colSpan: 6, className: "px-4 py-6 text-center text-muted", children: "Sin facturas en este estado." }) })) : (invoices.map((inv) => (_jsxs("tr", { className: "border-t border-border", children: [_jsx("td", { className: "px-4 py-3", children: inv.number }), _jsxs("td", { className: "px-4 py-3", children: [inv.customer.firstName, " ", inv.customer.lastName] }), _jsx("td", { className: "px-4 py-3 text-muted", children: new Date(inv.dueDate).toLocaleDateString('es-DO') }), _jsxs("td", { className: "px-4 py-3", children: ["$", Number(inv.amount).toFixed(2)] }), _jsx("td", { className: "px-4 py-3", children: _jsx(StatusBadge, { status: inv.status }) }), _jsx("td", { className: "px-4 py-3", children: _jsxs("div", { className: "flex items-center gap-2", children: [_jsx("a", { href: `${api.defaults.baseURL}/billing/invoices/${inv.id}/pdf`, target: "_blank", rel: "noreferrer", className: "text-muted hover:text-ink", "aria-label": "Descargar PDF", children: _jsx(Download, { size: 16 }) }), inv.status !== 'PAID' &&
                                                    inv.status !== 'CANCELLED' &&
                                                    (payingId === inv.id ? (_jsxs("div", { className: "flex items-center gap-1", children: [_jsx("input", { type: "number", value: payAmount, onChange: (e) => setPayAmount(e.target.value), className: "w-20 bg-surface-raised border border-border rounded px-2 py-1 text-xs", placeholder: "Monto", autoFocus: true }), _jsx("button", { onClick: () => registerPayment(inv.id), className: "text-xs bg-signal text-base rounded px-2 py-1", children: "OK" })] })) : (_jsx("button", { onClick: () => setPayingId(inv.id), className: "text-xs text-signal hover:underline", children: "Registrar pago" })))] }) })] }, inv.id)))) })] }) })] }));
}
function SummaryCard({ icon: Icon, label, value, accent, }) {
    return (_jsxs("div", { className: `status-panel status-panel--${accent}`, children: [_jsx(Icon, { size: 15, className: "text-muted mb-2" }), _jsxs("p", { className: "text-lg font-display font-bold", children: ["$", value.toFixed(2)] }), _jsx("p", { className: "text-[11px] text-muted mt-0.5", children: label })] }));
}
