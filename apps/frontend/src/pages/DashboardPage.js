import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Users, UserCheck, UserX, Router, Radio, AlertTriangle, ArrowRight } from 'lucide-react';
import { api } from '../lib/api';
import { SkeletonCard } from '../components/Skeleton';
function fmtMoney(v) {
    if (v == null)
        return '—';
    return `$${v.toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
export function DashboardPage() {
    const [data, setData] = useState(null);
    const [alerts, setAlerts] = useState(null);
    useEffect(() => {
        api.get('/dashboard/summary').then((res) => setData(res.data));
        api
            .get('/monitoring/alerts')
            .then((res) => setAlerts(res.data.slice(0, 5)))
            .catch(() => setAlerts([]));
    }, []);
    const v = (key) => data?.[key]?.value ?? null;
    const isLive = (key) => data?.[key]?.source === 'live';
    return (_jsxs("div", { className: "p-8 max-w-7xl space-y-8 page-enter", children: [_jsxs("div", { children: [_jsx("h1", { className: "text-2xl font-display font-bold mb-1", children: "Vista general de la red" }), _jsx("p", { className: "text-muted text-sm", children: "Lo m\u00E1s importante de tu operaci\u00F3n, de un vistazo." })] }), !data ? (_jsxs("section", { children: [_jsx(SectionLabel, { children: "Clientes" }), _jsx("div", { className: "grid grid-cols-2 md:grid-cols-4 gap-4", children: Array.from({ length: 4 }).map((_, i) => (_jsx(SkeletonCard, {}, i))) })] })) : (_jsxs(_Fragment, { children: [_jsxs("section", { children: [_jsx(SectionLabel, { children: "Clientes" }), _jsxs("div", { className: "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-1 sm:grid-cols-2 sm:grid-cols-4 gap-4", children: [_jsx(StatCard, { icon: Users, label: "Clientes totales", value: v('customersTotal'), accent: "neutral", href: "/clientes" }), _jsx(StatCard, { icon: UserCheck, label: "Activos", value: v('customersActive'), accent: "ok", href: "/clientes?status=ACTIVE" }), _jsx(StatCard, { icon: UserX, label: "Suspendidos", value: v('customersSuspended'), accent: "critical", href: "/clientes?status=SUSPENDED" }), _jsx(StatCard, { icon: AlertTriangle, label: "Facturas vencidas", value: v('invoicesOverdue'), accent: v('invoicesOverdue') ? 'warn' : 'neutral', href: "/facturacion" })] })] }), _jsxs("section", { children: [_jsx(SectionLabel, { children: "Estado de red" }), _jsxs("div", { className: "grid grid-cols-1 sm:grid-cols-2 gap-4", children: [_jsx(NetworkStatusCard, { icon: Router, label: "MikroTik", online: v('mikrotikOnline'), live: isLive('mikrotikOnline'), href: "/mikrotik" }), _jsx(NetworkStatusCard, { icon: Radio, label: "OLT", online: v('oltOnline'), live: isLive('oltOnline'), href: "/olt" })] })] }), _jsxs("section", { children: [_jsx(SectionLabel, { children: "Ingresos del mes" }), _jsxs("div", { className: "status-panel status-panel--ok max-w-sm", children: [_jsx("p", { className: "text-3xl font-display font-bold", children: fmtMoney(v('revenueMonth')) }), _jsx("p", { className: "text-xs text-muted mt-1", children: "Cobrado en lo que va del mes actual." })] })] }), _jsxs("section", { children: [_jsxs("div", { className: "flex items-center justify-between mb-3", children: [_jsx(SectionLabel, { noMargin: true, children: "Alertas recientes" }), _jsxs(Link, { to: "/monitoreo", className: "text-xs text-signal hover:underline flex items-center gap-1", children: ["Ver NOC ", _jsx(ArrowRight, { size: 12 })] })] }), alerts === null ? (_jsx("p", { className: "text-muted text-sm", children: "Cargando\u2026" })) : alerts.length === 0 ? (_jsx("div", { className: "status-panel status-panel--ok text-sm text-muted", children: "Sin alertas activas \u2014 la red est\u00E1 estable." })) : (_jsx("div", { className: "space-y-2", children: alerts.map((a) => (_jsx("div", { className: `status-panel ${a.severity === 'CRITICAL' ? 'status-panel--critical' : 'status-panel--warn'} py-3`, children: _jsxs("div", { className: "flex items-center justify-between", children: [_jsx("p", { className: "text-sm font-medium", children: a.title }), _jsx("span", { className: "text-xs text-muted shrink-0 ml-3", children: new Date(a.createdAt).toLocaleString('es-DO') })] }) }, a.id))) }))] })] }))] }));
}
function SectionLabel({ children, noMargin }) {
    return _jsx("p", { className: `text-xs font-medium text-muted uppercase tracking-wider ${noMargin ? '' : 'mb-3'}`, children: children });
}
function StatCard({ icon: Icon, label, value, accent, href, }) {
    return (_jsxs(Link, { to: href, className: `status-panel status-panel--${accent} block hover:brightness-110 transition-[filter]`, children: [_jsx("div", { className: "flex items-center justify-between mb-2", children: _jsx(Icon, { size: 16, className: "text-muted" }) }), _jsx("p", { className: "text-2xl font-display font-bold", children: value ?? '—' }), _jsx("p", { className: "text-xs text-muted mt-0.5", children: label })] }));
}
function NetworkStatusCard({ icon: Icon, label, online, live, href, }) {
    return (_jsx(Link, { to: href, className: "status-panel status-panel--neutral block hover:brightness-110 transition-[filter]", children: _jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { className: "flex items-center gap-2.5", children: [_jsx(Icon, { size: 18, className: "text-signal" }), _jsxs("div", { children: [_jsx("p", { className: "font-medium", children: label }), _jsx("p", { className: "text-xs text-muted", children: live ? 'Estado en vivo' : 'Sin datos aún' })] })] }), _jsxs("div", { className: "text-right", children: [_jsx("p", { className: "text-xl font-display font-bold text-ok", children: online ?? '—' }), _jsx("p", { className: "text-[10px] text-muted", children: "online" })] })] }) }));
}
