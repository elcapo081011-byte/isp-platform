import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { api } from '../lib/api';
import { useAuthStore } from '../store/auth.store';
export function MonitoringPage() {
    const [alerts, setAlerts] = useState([]);
    const accessToken = useAuthStore((s) => s.accessToken);
    useEffect(() => {
        api.get('/monitoring/alerts').then((res) => setAlerts(res.data));
        const baseUrl = (import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api/v1').replace('/api/v1', '');
        const socket = io(`${baseUrl}/noc`, { auth: { token: accessToken } });
        socket.on('alert.created', (alert) => setAlerts((prev) => [alert, ...prev]));
        return () => { socket.disconnect(); };
    }, [accessToken]);
    return (_jsxs("div", { className: "p-8 max-w-4xl", children: [_jsx("h1", { className: "text-2xl font-display font-bold mb-1", children: "Monitoreo / NOC" }), _jsx("p", { className: "text-muted text-sm mb-6", children: "Alertas generadas cuando un router u OLT cambia a offline. Se actualizan en vivo por WebSocket." }), _jsxs("div", { className: "space-y-2", children: [alerts.map((a) => (_jsxs("div", { className: `status-panel ${a.severity === 'CRITICAL' ? 'status-panel--critical' : 'status-panel--warn'}`, children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsx("p", { className: "font-medium", children: a.title }), _jsx("span", { className: "text-xs text-muted", children: new Date(a.createdAt).toLocaleString('es-DO') })] }), a.description && _jsx("p", { className: "text-xs text-muted mt-1", children: a.description })] }, a.id))), alerts.length === 0 && _jsx("p", { className: "text-muted text-sm", children: "Sin alertas activas." })] })] }));
}
