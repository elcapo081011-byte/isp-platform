import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { Router, Radio, CheckCircle2, Check } from 'lucide-react';
import { api } from '../lib/api';
import { useAuthStore } from '../store/auth.store';
import { useToast } from '../components/Toast';
export function MonitoringPage() {
    const [alerts, setAlerts] = useState([]);
    const [events, setEvents] = useState(null);
    const [filter, setFilter] = useState('OPEN');
    const [summary, setSummary] = useState(null);
    const accessToken = useAuthStore((s) => s.accessToken);
    const toast = useToast();
    async function loadAlerts() {
        const { data } = await api.get('/monitoring/alerts', { params: { status: filter === 'OPEN' ? 'OPEN' : undefined } });
        setAlerts(data);
    }
    useEffect(() => {
        loadAlerts();
    }, [filter]);
    useEffect(() => {
        api.get('/monitoring/events').then((res) => setEvents(res.data));
        api.get('/dashboard/summary').then((res) => setSummary(res.data));
        const baseUrl = (import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api/v1').replace('/api/v1', '');
        const socket = io(`${baseUrl}/noc`, { auth: { token: accessToken } });
        socket.on('alert.created', (alert) => setAlerts((prev) => [alert, ...prev]));
        return () => {
            socket.disconnect();
        };
    }, [accessToken]);
    async function acknowledge(id) {
        await api.post(`/monitoring/alerts/${id}/acknowledge`);
        toast.info('Alerta reconocida.');
        await loadAlerts();
    }
    async function resolve(id) {
        await api.post(`/monitoring/alerts/${id}/resolve`);
        toast.success('Alerta resuelta.');
        await loadAlerts();
    }
    const mikrotikOnline = summary?.mikrotikOnline?.value ?? null;
    const oltOnline = summary?.oltOnline?.value ?? null;
    const criticalCount = alerts.filter((a) => a.severity === 'CRITICAL' && a.status === 'OPEN').length;
    return (_jsxs("div", { className: "p-8 max-w-5xl page-enter", children: [_jsx("h1", { className: "text-2xl font-display font-bold mb-1", children: "NOC \u2014 Monitoreo de red" }), _jsx("p", { className: "text-muted text-sm mb-6", children: "Alertas generadas cuando un router u OLT cambia a offline. Se actualizan en vivo por WebSocket." }), _jsxs("div", { className: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8 max-w-xl", children: [_jsx(HealthCard, { icon: Router, label: "MikroTik online", value: mikrotikOnline }), _jsx(HealthCard, { icon: Radio, label: "OLT online", value: oltOnline }), _jsxs("div", { className: `status-panel ${criticalCount > 0 ? 'status-panel--critical' : 'status-panel--ok'}`, children: [_jsx(CheckCircle2, { size: 15, className: "text-muted mb-2" }), _jsx("p", { className: "text-lg font-display font-bold", children: criticalCount }), _jsx("p", { className: "text-[11px] text-muted mt-0.5", children: "Alertas cr\u00EDticas activas" })] })] }), _jsx("div", { className: "flex gap-2 mb-4", children: ['OPEN', 'ALL'].map((f) => (_jsx("button", { onClick: () => setFilter(f), className: `text-xs px-3 py-1.5 rounded-md border ${filter === f ? 'bg-signal text-base border-signal' : 'border-border text-muted hover:text-ink'}`, children: f === 'OPEN' ? 'Activas' : 'Todas' }, f))) }), _jsx("div", { className: "space-y-2 mb-8", children: alerts.length === 0 ? (_jsx("div", { className: "status-panel status-panel--ok text-sm text-muted", children: "Sin alertas \u2014 la red est\u00E1 estable." })) : (alerts.map((a) => (_jsx("div", { className: `status-panel ${a.severity === 'CRITICAL' ? 'status-panel--critical' : 'status-panel--warn'}`, children: _jsxs("div", { className: "flex items-center justify-between gap-3", children: [_jsxs("div", { className: "min-w-0", children: [_jsx("p", { className: "font-medium truncate", children: a.title }), a.description && _jsx("p", { className: "text-xs text-muted mt-0.5", children: a.description }), _jsx("p", { className: "text-[10px] text-muted mt-1", children: new Date(a.createdAt).toLocaleString('es-DO') })] }), a.status === 'OPEN' && (_jsxs("div", { className: "flex items-center gap-2 shrink-0", children: [_jsx("button", { onClick: () => acknowledge(a.id), className: "text-xs text-muted hover:text-ink border border-border rounded px-2 py-1", children: "Reconocer" }), _jsxs("button", { onClick: () => resolve(a.id), className: "flex items-center gap-1 text-xs text-ok hover:underline", children: [_jsx(Check, { size: 12 }), " Resolver"] })] })), a.status !== 'OPEN' && _jsx("span", { className: "text-[10px] text-muted shrink-0", children: a.status })] }) }, a.id)))) }), _jsxs("div", { children: [_jsx("p", { className: "text-xs font-medium text-muted mb-2 uppercase tracking-wide", children: "Eventos de red" }), events === null ? (_jsx("p", { className: "text-sm text-muted", children: "Cargando\u2026" })) : events.length === 0 ? (_jsx("p", { className: "text-sm text-muted", children: "Sin eventos registrados a\u00FAn." })) : (_jsx("div", { className: "border border-border rounded-md divide-y divide-border max-h-80 overflow-y-auto", children: events.map((e) => (_jsxs("div", { className: "px-3 py-2 text-xs flex justify-between gap-3", children: [_jsxs("span", { className: "text-ink", children: [e.source, e.sourceId ? ` (${e.sourceId.slice(0, 8)})` : '', " \u2014 ", e.eventType, e.fromState && e.toState ? `: ${e.fromState} → ${e.toState}` : ''] }), _jsx("span", { className: "text-muted shrink-0", children: new Date(e.createdAt).toLocaleString('es-DO') })] }, e.id))) }))] })] }));
}
function HealthCard({ icon: Icon, label, value }) {
    return (_jsxs("div", { className: "status-panel status-panel--neutral", children: [_jsx(Icon, { size: 15, className: "text-signal mb-2" }), _jsx("p", { className: "text-lg font-display font-bold", children: value ?? '—' }), _jsx("p", { className: "text-[11px] text-muted mt-0.5", children: label })] }));
}
