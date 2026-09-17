import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { MetricPanel } from '../components/MetricPanel';
const LABELS = {
    systemUsers: 'Usuarios del sistema',
    auditEventsTotal: 'Eventos de auditoría',
    customersTotal: 'Clientes totales',
    customersActive: 'Clientes activos',
    customersSuspended: 'Clientes suspendidos',
    revenueToday: 'Ingresos de hoy',
    revenueMonth: 'Ingresos del mes',
    invoicesPending: 'Facturas pendientes',
    invoicesOverdue: 'Facturas vencidas',
    mikrotikOnline: 'MikroTik online',
    oltOnline: 'OLT online',
    onuOnline: 'ONU/ONT online',
    openTickets: 'Tickets abiertos',
};
export function DashboardPage() {
    const [data, setData] = useState(null);
    useEffect(() => {
        api.get('/dashboard/summary').then((res) => setData(res.data));
    }, []);
    return (_jsxs("div", { className: "p-8 max-w-7xl", children: [_jsx("h1", { className: "text-2xl font-display font-bold mb-1", children: "Vista general de la red" }), _jsx("p", { className: "text-muted text-sm mb-8", children: "Fase 1: autenticaci\u00F3n, roles y auditor\u00EDa en vivo. Los m\u00F3dulos de clientes, facturaci\u00F3n y red se activan en las fases siguientes \u2014 cada panel indica cu\u00E1ndo estar\u00E1 disponible." }), !data ? (_jsx("p", { className: "text-muted text-sm", children: "Cargando..." })) : (_jsx("div", { className: "grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4", children: Object.entries(data).map(([key, metric]) => (_jsx(MetricPanel, { label: LABELS[key] ?? key, value: metric.value, severity: metric.source === 'live' ? 'ok' : 'neutral', pendingPhase: metric.source !== 'live' ? metric.source : undefined }, key))) }))] }));
}
