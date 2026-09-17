import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { Plus, Wifi, WifiOff, RefreshCw, X, Users, Activity } from 'lucide-react';
import { api } from '../lib/api';
const EMPTY_FORM = {
    name: '',
    host: '',
    port: '8728',
    username: '',
    password: '',
    useTls: false,
    location: '',
};
function fieldClass() {
    return 'w-full bg-surface-raised border border-border rounded-md px-3 py-2 text-sm outline-none focus:border-signal transition-colors';
}
function labelClass() {
    return 'block text-xs text-muted mb-1.5';
}
export function MikrotikPage() {
    const [routers, setRouters] = useState([]);
    const [loading, setLoading] = useState(true);
    const [checking, setChecking] = useState(null);
    const [modalOpen, setModalOpen] = useState(false);
    const [form, setForm] = useState(EMPTY_FORM);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);
    const [detail, setDetail] = useState(null);
    const [sessions, setSessions] = useState(null);
    const [systemInfo, setSystemInfo] = useState(null);
    const [detailLoading, setDetailLoading] = useState(false);
    async function load() {
        setLoading(true);
        try {
            const { data } = await api.get('/mikrotik/routers');
            setRouters(data);
        }
        finally {
            setLoading(false);
        }
    }
    useEffect(() => {
        load();
    }, []);
    async function check(id) {
        setChecking(id);
        try {
            await api.post(`/mikrotik/routers/${id}/check-connection`);
            await load();
        }
        finally {
            setChecking(null);
        }
    }
    function openCreate() {
        setForm(EMPTY_FORM);
        setError(null);
        setModalOpen(true);
    }
    async function handleSubmit(e) {
        e.preventDefault();
        setSaving(true);
        setError(null);
        try {
            await api.post('/mikrotik/routers', {
                name: form.name,
                host: form.host,
                port: form.port ? Number(form.port) : undefined,
                username: form.username,
                password: form.password,
                useTls: form.useTls,
                location: form.location || undefined,
            });
            setModalOpen(false);
            await load();
        }
        catch (err) {
            setError(err?.response?.data?.message ?? 'No se pudo guardar el router. Verifica los datos de conexión.');
        }
        finally {
            setSaving(false);
        }
    }
    async function openDetail(r) {
        setDetail(r);
        setSessions(null);
        setSystemInfo(null);
        setDetailLoading(true);
        try {
            const [sessionsRes, infoRes] = await Promise.allSettled([
                api.get(`/mikrotik/routers/${r.id}/pppoe-sessions`),
                api.get(`/mikrotik/routers/${r.id}/system-info`),
            ]);
            if (sessionsRes.status === 'fulfilled')
                setSessions(sessionsRes.value.data);
            if (infoRes.status === 'fulfilled')
                setSystemInfo(infoRes.value.data);
        }
        finally {
            setDetailLoading(false);
        }
    }
    return (_jsxs("div", { className: "p-8 max-w-6xl", children: [_jsxs("div", { className: "flex items-start justify-between mb-6", children: [_jsxs("div", { children: [_jsx("h1", { className: "text-2xl font-display font-bold mb-1", children: "MikroTik" }), _jsx("p", { className: "text-muted text-sm max-w-lg", children: "Cada router se consulta en vivo por la API de RouterOS \u2014 el estado que ves nunca es simulado." })] }), _jsxs("button", { onClick: openCreate, className: "flex items-center gap-2 bg-signal text-base text-sm font-medium rounded-md px-4 py-2 hover:opacity-90 transition-opacity shrink-0", children: [_jsx(Plus, { size: 16 }), " Agregar router"] })] }), loading ? (_jsx("p", { className: "text-muted text-sm", children: "Cargando routers\u2026" })) : routers.length === 0 ? (_jsx("div", { className: "status-panel status-panel--neutral text-sm text-muted", children: "No hay routers registrados todav\u00EDa. Agrega el primero con \"Agregar router\" \u2014 necesitar\u00E1s su IP, usuario y contrase\u00F1a de la API de RouterOS (Winbox \u2192 IP \u2192 Services \u2192 api, puerto 8728 por defecto)." })) : (_jsx("div", { className: "grid grid-cols-2 gap-4", children: routers.map((r) => (_jsxs("div", { className: `status-panel ${r.status === 'ONLINE' ? 'status-panel--ok' : r.status === 'OFFLINE' ? 'status-panel--critical' : 'status-panel--neutral'}`, children: [_jsxs("div", { className: "flex items-start justify-between", children: [_jsxs("div", { children: [_jsx("p", { className: "font-medium", children: r.name }), _jsxs("p", { className: "text-xs text-muted", children: [r.host, ":", r.port, " \u00B7 ", r.location ?? 'sin ubicación'] })] }), r.status === 'ONLINE' ? _jsx(Wifi, { className: "text-ok", size: 18 }) : _jsx(WifiOff, { className: "text-muted", size: 18 })] }), r.status === 'OFFLINE' && r.lastError && (_jsx("p", { className: "text-[11px] text-critical mt-2", children: r.lastError })), _jsxs("div", { className: "flex items-center gap-4 mt-3", children: [_jsxs("button", { onClick: () => check(r.id), disabled: checking === r.id, className: "flex items-center gap-1.5 text-xs text-signal hover:underline disabled:opacity-50", children: [_jsx(RefreshCw, { size: 12, className: checking === r.id ? 'animate-spin' : '' }), "Verificar conexi\u00F3n"] }), _jsxs("button", { onClick: () => openDetail(r), className: "flex items-center gap-1.5 text-xs text-muted hover:text-ink", children: [_jsx(Activity, { size: 12 }), "Ver detalle"] })] }), r.isDemo && _jsx("p", { className: "text-[10px] text-muted/70 mt-2", children: "Dato demo" })] }, r.id))) })), modalOpen && (_jsx("div", { className: "fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 backdrop-blur-sm p-6 pt-[8vh]", onClick: () => setModalOpen(false), children: _jsxs("div", { onClick: (e) => e.stopPropagation(), className: "w-full max-w-lg bg-surface border border-border rounded-lg shadow-2xl", children: [_jsxs("div", { className: "flex items-start justify-between border-b border-border px-6 py-4", children: [_jsxs("div", { children: [_jsx("h2", { className: "font-display font-bold text-lg", children: "Agregar router MikroTik" }), _jsx("p", { className: "text-xs text-muted mt-0.5", children: "La contrase\u00F1a se guarda cifrada, nunca en texto plano." })] }), _jsx("button", { onClick: () => setModalOpen(false), className: "text-muted hover:text-ink p-1 -mr-1 -mt-1", "aria-label": "Cerrar", children: _jsx(X, { size: 18 }) })] }), _jsxs("form", { onSubmit: handleSubmit, className: "px-6 py-5 space-y-4", children: [error && _jsx("div", { className: "status-panel status-panel--critical text-sm text-critical py-2.5", children: error }), _jsxs("div", { children: [_jsx("label", { className: labelClass(), children: "Nombre" }), _jsx("input", { required: true, placeholder: "Ej. Router Principal - Zona Norte", value: form.name, onChange: (e) => setForm({ ...form, name: e.target.value }), className: fieldClass() })] }), _jsxs("div", { className: "grid grid-cols-3 gap-3", children: [_jsxs("div", { className: "col-span-2", children: [_jsx("label", { className: labelClass(), children: "Direcci\u00F3n IP" }), _jsx("input", { required: true, placeholder: "192.168.1.1", value: form.host, onChange: (e) => setForm({ ...form, host: e.target.value }), className: fieldClass() })] }), _jsxs("div", { children: [_jsx("label", { className: labelClass(), children: "Puerto API" }), _jsx("input", { type: "number", value: form.port, onChange: (e) => setForm({ ...form, port: e.target.value }), className: fieldClass() })] })] }), _jsxs("div", { className: "grid grid-cols-2 gap-3", children: [_jsxs("div", { children: [_jsx("label", { className: labelClass(), children: "Usuario" }), _jsx("input", { required: true, autoComplete: "off", value: form.username, onChange: (e) => setForm({ ...form, username: e.target.value }), className: fieldClass() })] }), _jsxs("div", { children: [_jsx("label", { className: labelClass(), children: "Contrase\u00F1a" }), _jsx("input", { required: true, type: "password", autoComplete: "new-password", value: form.password, onChange: (e) => setForm({ ...form, password: e.target.value }), className: fieldClass() })] })] }), _jsxs("div", { children: [_jsx("label", { className: labelClass(), children: "Ubicaci\u00F3n (opcional)" }), _jsx("input", { placeholder: "Ej. Torre Central", value: form.location, onChange: (e) => setForm({ ...form, location: e.target.value }), className: fieldClass() })] }), _jsxs("label", { className: "flex items-center gap-2 text-sm cursor-pointer select-none", children: [_jsx("input", { type: "checkbox", checked: form.useTls, onChange: (e) => setForm({ ...form, useTls: e.target.checked }), className: "rounded border-border accent-signal" }), "Usar API-SSL (puerto 8729)"] }), _jsxs("div", { className: "flex justify-end gap-2 pt-2", children: [_jsx("button", { type: "button", onClick: () => setModalOpen(false), className: "text-sm text-muted hover:text-ink px-4 py-2", children: "Cancelar" }), _jsx("button", { type: "submit", disabled: saving, className: "bg-signal text-base text-sm font-medium rounded-md px-5 py-2 disabled:opacity-50", children: saving ? 'Guardando…' : 'Guardar router' })] })] })] }) })), detail && (_jsx("div", { className: "fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 backdrop-blur-sm p-6 pt-[6vh]", onClick: () => setDetail(null), children: _jsxs("div", { onClick: (e) => e.stopPropagation(), className: "w-full max-w-2xl bg-surface border border-border rounded-lg shadow-2xl", children: [_jsxs("div", { className: "flex items-start justify-between border-b border-border px-6 py-4", children: [_jsxs("div", { children: [_jsx("h2", { className: "font-display font-bold text-lg", children: detail.name }), _jsxs("p", { className: "text-xs text-muted mt-0.5", children: [detail.host, ":", detail.port] })] }), _jsx("button", { onClick: () => setDetail(null), className: "text-muted hover:text-ink p-1 -mr-1 -mt-1", "aria-label": "Cerrar", children: _jsx(X, { size: 18 }) })] }), _jsx("div", { className: "px-6 py-5 space-y-5 max-h-[60vh] overflow-y-auto", children: detailLoading ? (_jsx("p", { className: "text-muted text-sm", children: "Consultando router\u2026" })) : (_jsxs(_Fragment, { children: [_jsxs("div", { children: [_jsx("p", { className: "text-xs font-medium text-muted mb-2 uppercase tracking-wide", children: "Informaci\u00F3n del sistema" }), systemInfo ? (_jsx("pre", { className: "bg-surface-raised border border-border rounded-md p-3 text-xs overflow-x-auto", children: JSON.stringify(systemInfo, null, 2) })) : (_jsx("p", { className: "text-xs text-muted", children: "No se pudo obtener \u2014 verifica la conexi\u00F3n." }))] }), _jsxs("div", { children: [_jsxs("p", { className: "text-xs font-medium text-muted mb-2 uppercase tracking-wide flex items-center gap-1.5", children: [_jsx(Users, { size: 12 }), " Sesiones PPPoE activas"] }), sessions && sessions.length > 0 ? (_jsx("div", { className: "border border-border rounded-md divide-y divide-border", children: sessions.map((s, i) => (_jsxs("div", { className: "px-3 py-2 text-xs flex justify-between", children: [_jsx("span", { children: s.name ?? s.user ?? '—' }), _jsx("span", { className: "text-muted", children: s.address ?? '' })] }, i))) })) : (_jsx("p", { className: "text-xs text-muted", children: "Sin sesiones activas o no disponible." }))] })] })) })] }) }))] }));
}
