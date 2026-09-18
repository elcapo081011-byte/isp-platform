import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { PauseCircle, PlayCircle, Download } from 'lucide-react';
import { api } from '../lib/api';
import { StatusBadge } from '../components/StatusBadge';
import { useToast } from '../components/Toast';
import { useConfirm } from '../components/ConfirmDialog';
const TABS = ['Resumen', 'Servicio', 'Facturación', 'Conexión', 'OLT / ONU', 'Tickets', 'Historial'];
export function CustomerProfilePage() {
    const { id } = useParams();
    const [profile, setProfile] = useState(null);
    const [tab, setTab] = useState('Resumen');
    const [busy, setBusy] = useState(false);
    const toast = useToast();
    const confirm = useConfirm();
    async function load() {
        const { data } = await api.get(`/customers/${id}`);
        setProfile(data);
    }
    useEffect(() => {
        load();
    }, [id]);
    async function toggleSuspension() {
        const isSuspended = profile.information.status === 'SUSPENDED';
        const ok = await confirm({
            title: isSuspended ? '¿Reactivar este cliente?' : '¿Suspender este cliente?',
            description: isSuspended
                ? 'Se intentará restaurar su sesión en el router asignado.'
                : 'Se intentará cortar su sesión en el router asignado de inmediato.',
            confirmLabel: isSuspended ? 'Reactivar' : 'Suspender',
            danger: !isSuspended,
        });
        if (!ok)
            return;
        setBusy(true);
        try {
            const { data } = isSuspended
                ? await api.post(`/customers/${id}/reactivate`)
                : await api.post(`/customers/${id}/suspend`, { reason: 'Suspensión manual desde el panel' });
            if (data?.networkAction && data.networkAction.applied === false) {
                toast.warning(`Estado actualizado, pero la acción de red no se aplicó: ${data.networkAction.reason ?? data.networkAction.error ?? 'sin detalle'}`);
            }
            else {
                toast.success(isSuspended ? 'Cliente reactivado.' : 'Cliente suspendido.');
            }
            await load();
        }
        finally {
            setBusy(false);
        }
    }
    if (!profile)
        return _jsx("div", { className: "p-8 text-muted text-sm", children: "Cargando\u2026" });
    const info = profile.information;
    const service = profile.service?.[0];
    const isSuspended = info.status === 'SUSPENDED';
    const openTicketsCount = profile.tickets.filter((t) => !['RESOLVED', 'CLOSED'].includes(t.status)).length;
    const overdueCount = profile.invoices.filter((i) => i.status === 'OVERDUE').length;
    return (_jsxs("div", { className: "p-8 max-w-5xl page-enter", children: [_jsxs("div", { className: "flex items-start justify-between mb-6", children: [_jsxs("div", { children: [_jsxs("h1", { className: "text-2xl font-display font-bold mb-1", children: [info.firstName, " ", info.lastName] }), _jsxs("div", { className: "flex items-center gap-3 text-sm text-muted flex-wrap", children: [_jsx(StatusBadge, { status: info.status }), _jsx("span", { children: info.documentId ?? 'sin documento' }), service && _jsxs("span", { children: ["\u00B7 ", service.plan.name] }), service?.ipAddress && _jsxs("span", { children: ["\u00B7 ", service.ipAddress] })] })] }), _jsxs("button", { onClick: toggleSuspension, disabled: busy, className: `flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-opacity disabled:opacity-50 ${isSuspended ? 'bg-ok text-base' : 'bg-critical text-white'}`, children: [isSuspended ? _jsx(PlayCircle, { size: 16 }) : _jsx(PauseCircle, { size: 16 }), isSuspended ? 'Reactivar' : 'Suspender'] })] }), _jsx("div", { className: "flex gap-1 border-b border-border mb-6 overflow-x-auto", children: TABS.map((t) => (_jsxs("button", { onClick: () => setTab(t), className: `px-3 py-2 text-sm whitespace-nowrap border-b-2 transition-colors flex items-center gap-1.5 ${tab === t ? 'border-signal text-ink' : 'border-transparent text-muted hover:text-ink'}`, children: [t, t === 'Tickets' && openTicketsCount > 0 && (_jsx("span", { className: "text-[10px] bg-critical/15 text-critical rounded-full px-1.5", children: openTicketsCount })), t === 'Facturación' && overdueCount > 0 && (_jsx("span", { className: "text-[10px] bg-critical/15 text-critical rounded-full px-1.5", children: overdueCount }))] }, t))) }), tab === 'Resumen' && (_jsxs("div", { className: "grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm", children: [_jsx(Field, { label: "Tel\u00E9fono", value: info.phone }), _jsx(Field, { label: "WhatsApp", value: info.whatsapp }), _jsx(Field, { label: "Email", value: info.email }), _jsx(Field, { label: "Direcci\u00F3n", value: info.address }), _jsx(Field, { label: "Referencia", value: info.reference }), _jsx(Field, { label: "T\u00E9cnico asignado", value: info.technician ? `${info.technician.firstName} ${info.technician.lastName}` : null }), _jsx(Field, { label: "D\u00EDa de corte", value: info.billingDay }), _jsx(Field, { label: "M\u00E9todo de pago", value: info.paymentMethod }), _jsxs("div", { className: "col-span-2 pt-3 border-t border-border", children: [_jsx("p", { className: "text-xs text-muted mb-0.5", children: "Notas" }), _jsx("p", { children: info.notes || 'Sin notas registradas.' })] })] })), tab === 'Servicio' && (_jsx("div", { className: "space-y-3", children: profile.service.length === 0 ? (_jsx("p", { className: "text-muted text-sm", children: "Este cliente no tiene un servicio activo todav\u00EDa." })) : (profile.service.map((s) => (_jsxs("div", { className: "status-panel status-panel--ok", children: [_jsxs("div", { className: "flex justify-between items-start mb-3", children: [_jsxs("div", { children: [_jsx("p", { className: "font-medium", children: s.plan.name }), _jsxs("p", { className: "text-xs text-muted", children: [s.plan.downloadMbps, "/", s.plan.uploadMbps, " Mbps \u00B7 $", s.plan.price, " ", s.plan.currency, "/mes"] })] }), _jsx(StatusBadge, { status: s.status })] }), _jsxs("div", { className: "grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-3 border-t border-border", children: [_jsx(Field, { label: "Usuario PPPoE", value: s.pppoeUsername }), _jsx(Field, { label: "IP", value: s.ipAddress }), _jsx(Field, { label: "VLAN", value: s.plan.vlan }), _jsx(Field, { label: "Perfil MikroTik", value: s.plan.mikrotikProfile })] })] }, s.id)))) })), tab === 'Facturación' && (_jsxs("div", { className: "space-y-6", children: [_jsxs("div", { children: [_jsx("p", { className: "text-xs font-medium text-muted mb-2 uppercase tracking-wide", children: "Facturas" }), profile.invoices.length === 0 ? (_jsx("p", { className: "text-sm text-muted", children: "Sin facturas todav\u00EDa." })) : (_jsx("div", { className: "border border-border rounded-md divide-y divide-border", children: profile.invoices.map((inv) => (_jsxs("div", { className: "px-3 py-2.5 flex items-center justify-between text-sm", children: [_jsxs("div", { children: [_jsx("p", { children: inv.number }), _jsxs("p", { className: "text-xs text-muted", children: ["Vence ", new Date(inv.dueDate).toLocaleDateString('es-DO')] })] }), _jsxs("div", { className: "flex items-center gap-3", children: [_jsxs("span", { children: ["$", Number(inv.amount).toFixed(2)] }), _jsx(StatusBadge, { status: inv.status }), _jsx("a", { href: `${api.defaults.baseURL}/billing/invoices/${inv.id}/pdf`, target: "_blank", rel: "noreferrer", className: "text-muted hover:text-ink", children: _jsx(Download, { size: 14 }) })] })] }, inv.id))) }))] }), _jsxs("div", { children: [_jsx("p", { className: "text-xs font-medium text-muted mb-2 uppercase tracking-wide", children: "Pagos" }), profile.payments.length === 0 ? (_jsx("p", { className: "text-sm text-muted", children: "Sin pagos registrados." })) : (_jsx("div", { className: "border border-border rounded-md divide-y divide-border", children: profile.payments.map((p) => (_jsxs("div", { className: "px-3 py-2.5 flex items-center justify-between text-sm", children: [_jsx("span", { children: new Date(p.paidAt ?? p.createdAt).toLocaleDateString('es-DO') }), _jsxs("span", { children: ["$", Number(p.amount).toFixed(2)] })] }, p.id))) }))] })] })), tab === 'Conexión' && (_jsxs("div", { className: "grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm", children: [_jsx(Field, { label: "Usuario PPPoE", value: profile.connection.pppoeUsername }), _jsx(Field, { label: "IP asignada", value: profile.connection.ipAddress }), _jsx("div", { className: "col-span-2", children: _jsx("p", { className: "text-xs text-muted mt-2", children: "La sesi\u00F3n en vivo por cliente (uptime, tr\u00E1fico exacto) requiere cruzar el usuario PPPoE con las sesiones activas del router \u2014 puedes verlo agregado en MikroTik \u2192 Ver detalle \u2192 Sesiones PPPoE." }) })] })), tab === 'OLT / ONU' && (_jsxs("div", { className: "grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm", children: [_jsx(Field, { label: "OLT", value: profile.oltOnu.oltId }), _jsx(Field, { label: "Serial ONU", value: profile.oltOnu.onuSerial }), _jsx("div", { className: "col-span-2", children: _jsx("p", { className: "text-xs text-muted mt-2", children: "RX/TX y temperatura en vivo dependen del driver del fabricante de la ONU \u2014 vis\u00EDtalo en OLT \u2192 selecciona la OLT." }) })] })), tab === 'Tickets' && (_jsx("div", { className: "space-y-2", children: profile.tickets.length === 0 ? (_jsx("p", { className: "text-sm text-muted", children: "Sin tickets para este cliente." })) : (profile.tickets.map((t) => (_jsxs("div", { className: "status-panel status-panel--neutral flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("p", { className: "font-medium", children: t.subject }), _jsx("p", { className: "text-xs text-muted", children: new Date(t.createdAt).toLocaleDateString('es-DO') })] }), _jsx(StatusBadge, { status: t.status })] }, t.id)))) })), tab === 'Historial' && _jsx(AuditList, { items: profile.history })] }));
}
function Field({ label, value }) {
    return (_jsxs("div", { children: [_jsx("p", { className: "text-xs text-muted mb-0.5", children: label }), _jsx("p", { children: value ?? '—' })] }));
}
function AuditList({ items }) {
    if (!items?.length)
        return _jsx("p", { className: "text-sm text-muted", children: "Sin eventos registrados a\u00FAn." });
    return (_jsx("div", { className: "space-y-2", children: items.map((log) => (_jsxs("div", { className: "text-sm border-b border-border pb-2", children: [_jsx("span", { className: "text-muted", children: new Date(log.createdAt).toLocaleString('es-DO') }), ' — ', _jsx("span", { children: log.user ? `${log.user.firstName} ${log.user.lastName}` : 'Sistema' }), ' realizó ', _jsx("span", { className: "text-ink", children: log.action })] }, log.id))) }));
}
