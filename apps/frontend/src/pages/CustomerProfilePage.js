import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { PauseCircle, PlayCircle } from 'lucide-react';
import { api } from '../lib/api';
import { StatusBadge } from '../components/StatusBadge';
const TABS = [
    'Información', 'Servicio', 'Facturas', 'Pagos', 'Conexión',
    'OLT/ONU', 'Tickets', 'Historial', 'Notas', 'Auditoría',
];
export function CustomerProfilePage() {
    const { id } = useParams();
    const [profile, setProfile] = useState(null);
    const [tab, setTab] = useState('Información');
    const [busy, setBusy] = useState(false);
    async function load() {
        const { data } = await api.get(`/customers/${id}`);
        setProfile(data);
    }
    useEffect(() => { load(); }, [id]);
    async function toggleSuspension() {
        setBusy(true);
        try {
            if (profile.information.status === 'SUSPENDED') {
                await api.post(`/customers/${id}/reactivate`);
            }
            else {
                await api.post(`/customers/${id}/suspend`, { reason: 'Suspensión manual desde el panel' });
            }
            await load();
        }
        finally {
            setBusy(false);
        }
    }
    if (!profile)
        return _jsx("div", { className: "p-8 text-muted text-sm", children: "Cargando..." });
    const info = profile.information;
    const isSuspended = info.status === 'SUSPENDED';
    return (_jsxs("div", { className: "p-8 max-w-5xl", children: [_jsxs("div", { className: "flex items-start justify-between mb-6", children: [_jsxs("div", { children: [_jsxs("h1", { className: "text-2xl font-display font-bold mb-1", children: [info.firstName, " ", info.lastName] }), _jsxs("div", { className: "flex items-center gap-2 text-sm text-muted", children: [_jsx(StatusBadge, { status: info.status }), _jsx("span", { children: info.documentId ?? 'sin documento' })] })] }), _jsxs("button", { onClick: toggleSuspension, disabled: busy, className: `flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-opacity disabled:opacity-50 ${isSuspended ? 'bg-ok text-base' : 'bg-critical text-base'}`, children: [isSuspended ? _jsx(PlayCircle, { size: 16 }) : _jsx(PauseCircle, { size: 16 }), isSuspended ? 'Reactivar' : 'Suspender'] })] }), _jsx("div", { className: "flex gap-1 border-b border-border mb-6 overflow-x-auto", children: TABS.map((t) => (_jsx("button", { onClick: () => setTab(t), className: `px-3 py-2 text-sm whitespace-nowrap border-b-2 transition-colors ${tab === t ? 'border-signal text-ink' : 'border-transparent text-muted hover:text-ink'}`, children: t }, t))) }), tab === 'Información' && (_jsxs("div", { className: "grid grid-cols-2 gap-4 text-sm", children: [_jsx(Field, { label: "Tel\u00E9fono", value: info.phone }), _jsx(Field, { label: "WhatsApp", value: info.whatsapp }), _jsx(Field, { label: "Email", value: info.email }), _jsx(Field, { label: "Direcci\u00F3n", value: info.address }), _jsx(Field, { label: "Referencia", value: info.reference }), _jsx(Field, { label: "T\u00E9cnico asignado", value: info.technician ? `${info.technician.firstName} ${info.technician.lastName}` : null }), _jsx(Field, { label: "D\u00EDa de corte", value: info.billingDay }), _jsx(Field, { label: "M\u00E9todo de pago", value: info.paymentMethod })] })), tab === 'Servicio' && (_jsx("div", { className: "space-y-3", children: profile.service.length === 0 ? (_jsx("p", { className: "text-muted text-sm", children: "Este cliente no tiene un servicio activo todav\u00EDa." })) : profile.service.map((s) => (_jsx("div", { className: "status-panel status-panel--ok", children: _jsxs("div", { className: "flex justify-between items-start", children: [_jsxs("div", { children: [_jsx("p", { className: "font-medium", children: s.plan.name }), _jsxs("p", { className: "text-xs text-muted", children: [s.plan.downloadMbps, "/", s.plan.uploadMbps, " Mbps \u00B7 $", s.plan.price, "/", s.plan.currency] })] }), _jsx(StatusBadge, { status: s.status })] }) }, s.id))) })), tab === 'Facturas' && _jsx(PendingPhase, { note: "El m\u00F3dulo de facturaci\u00F3n se activa en la Fase 3." }), tab === 'Pagos' && _jsx(PendingPhase, { note: "El registro de pagos se activa en la Fase 3." }), tab === 'Conexión' && (_jsxs("div", { className: "grid grid-cols-2 gap-4 text-sm", children: [_jsx(Field, { label: "Usuario PPPoE", value: profile.connection.pppoeUsername }), _jsx(Field, { label: "IP asignada", value: profile.connection.ipAddress }), _jsx("div", { className: "col-span-2", children: _jsx("p", { className: "text-xs text-muted mt-2", children: "La sesi\u00F3n en vivo (uptime, tr\u00E1fico, router) se conecta a MikroTik real en la Fase 4." }) })] })), tab === 'OLT/ONU' && (_jsxs("div", { className: "grid grid-cols-2 gap-4 text-sm", children: [_jsx(Field, { label: "OLT", value: profile.oltOnu.oltId }), _jsx(Field, { label: "Serial ONU", value: profile.oltOnu.onuSerial }), _jsx("div", { className: "col-span-2", children: _jsx("p", { className: "text-xs text-muted mt-2", children: "Se\u00F1al \u00F3ptica en vivo disponible en la Fase 5." }) })] })), tab === 'Tickets' && _jsx(PendingPhase, { note: "El m\u00F3dulo de tickets se activa en la Fase 8." }), tab === 'Historial' && _jsx(AuditList, { items: profile.history }), tab === 'Auditoría' && _jsx(AuditList, { items: profile.audit }), tab === 'Notas' && (_jsx("p", { className: "text-sm text-muted", children: info.notes || 'Sin notas registradas.' }))] }));
}
function Field({ label, value }) {
    return (_jsxs("div", { children: [_jsx("p", { className: "text-xs text-muted mb-0.5", children: label }), _jsx("p", { children: value ?? '—' })] }));
}
function PendingPhase({ note }) {
    return _jsx("div", { className: "status-panel status-panel--neutral text-sm text-muted", children: note });
}
function AuditList({ items }) {
    if (!items?.length)
        return _jsx("p", { className: "text-sm text-muted", children: "Sin eventos registrados a\u00FAn." });
    return (_jsx("div", { className: "space-y-2", children: items.map((log) => (_jsxs("div", { className: "text-sm border-b border-border pb-2", children: [_jsx("span", { className: "text-muted", children: new Date(log.createdAt).toLocaleString('es-DO') }), ' — ', _jsx("span", { children: log.user ? `${log.user.firstName} ${log.user.lastName}` : 'Sistema' }), ' realizó ', _jsx("span", { className: "text-ink", children: log.action })] }, log.id))) }));
}
