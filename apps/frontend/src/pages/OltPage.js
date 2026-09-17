import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { Plus, X, RefreshCw, Wifi, WifiOff, PlusCircle, Power, PowerOff } from 'lucide-react';
import { api } from '../lib/api';
import { StatusBadge } from '../components/StatusBadge';
import { useToast } from '../components/Toast';
const VENDORS = [
    { value: 'HUAWEI', label: 'Huawei' },
    { value: 'ZTE', label: 'ZTE' },
    { value: 'FIBERHOME', label: 'FiberHome' },
    { value: 'GENERIC_SNMP', label: 'Genérica (SNMP)' },
    { value: 'MOCK', label: 'Simulada (pruebas)' },
];
const EMPTY_OLT_FORM = { name: '', vendor: 'GENERIC_SNMP', model: '', host: '', snmpCommunity: 'public', location: '' };
const EMPTY_ONU_FORM = { ponPort: '', serial: '', mac: '', model: '' };
function fieldClass() {
    return 'w-full bg-surface-raised border border-border rounded-md px-3 py-2 text-sm outline-none focus:border-signal transition-colors';
}
function labelClass() {
    return 'block text-xs text-muted mb-1.5';
}
export function OltPage() {
    const [olts, setOlts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selected, setSelected] = useState(null);
    const [ponData, setPonData] = useState(null);
    const [onus, setOnus] = useState([]);
    const [checking, setChecking] = useState(false);
    const [oltModalOpen, setOltModalOpen] = useState(false);
    const [oltForm, setOltForm] = useState(EMPTY_OLT_FORM);
    const [savingOlt, setSavingOlt] = useState(false);
    const [oltError, setOltError] = useState(null);
    const [onuModalOpen, setOnuModalOpen] = useState(false);
    const [onuForm, setOnuForm] = useState(EMPTY_ONU_FORM);
    const [savingOnu, setSavingOnu] = useState(false);
    const [onuError, setOnuError] = useState(null);
    const toast = useToast();
    async function loadOlts() {
        setLoading(true);
        try {
            const { data } = await api.get('/olt');
            setOlts(data);
        }
        finally {
            setLoading(false);
        }
    }
    useEffect(() => {
        loadOlts();
    }, []);
    async function selectOlt(olt) {
        setSelected(olt);
        setPonData(null);
        setOnus([]);
        const [ponRes, onuRes] = await Promise.all([
            api.get(`/olt/${olt.id}/pon-ports`),
            api.get(`/olt/${olt.id}/onus`),
        ]);
        setPonData(ponRes.data);
        setOnus(onuRes.data);
    }
    async function checkConnection() {
        if (!selected)
            return;
        setChecking(true);
        try {
            await api.post(`/olt/${selected.id}/check-connection`);
            await loadOlts();
            await selectOlt(selected);
        }
        finally {
            setChecking(false);
        }
    }
    function openCreateOlt() {
        setOltForm(EMPTY_OLT_FORM);
        setOltError(null);
        setOltModalOpen(true);
    }
    async function handleOltSubmit(e) {
        e.preventDefault();
        setSavingOlt(true);
        setOltError(null);
        try {
            await api.post('/olt', {
                name: oltForm.name,
                vendor: oltForm.vendor,
                model: oltForm.model || undefined,
                host: oltForm.host,
                snmpCommunity: oltForm.snmpCommunity || undefined,
                location: oltForm.location || undefined,
            });
            setOltModalOpen(false);
            toast.success('OLT agregada.');
            await loadOlts();
        }
        catch (err) {
            setOltError(err?.response?.data?.message ?? 'No se pudo guardar la OLT.');
        }
        finally {
            setSavingOlt(false);
        }
    }
    function openRegisterOnu() {
        setOnuForm(EMPTY_ONU_FORM);
        setOnuError(null);
        setOnuModalOpen(true);
    }
    async function handleOnuSubmit(e) {
        e.preventDefault();
        if (!selected)
            return;
        setSavingOnu(true);
        setOnuError(null);
        try {
            await api.post('/olt/onus', {
                oltId: selected.id,
                ponPort: onuForm.ponPort,
                serial: onuForm.serial,
                mac: onuForm.mac || undefined,
                model: onuForm.model || undefined,
            });
            setOnuModalOpen(false);
            toast.success('ONU registrada.');
            await selectOlt(selected);
        }
        catch (err) {
            setOnuError(err?.response?.data?.message ?? 'No se pudo registrar la ONU.');
        }
        finally {
            setSavingOnu(false);
        }
    }
    async function toggleOnu(onu) {
        const action = onu.status === 'ONLINE' ? 'deauthorize' : 'authorize';
        await api.post(`/olt/onus/${onu.id}/${action}`);
        if (selected)
            await selectOlt(selected);
    }
    return (_jsxs("div", { className: "p-8 max-w-6xl", children: [_jsxs("div", { className: "flex items-start justify-between mb-6", children: [_jsxs("div", { children: [_jsx("h1", { className: "text-2xl font-display font-bold mb-1", children: "OLT" }), _jsx("p", { className: "text-muted text-sm max-w-lg", children: "Los fabricantes sin driver verificado muestran claramente que la lectura de PON/ONU no est\u00E1 soportada todav\u00EDa \u2014 no se inventan datos." })] }), _jsxs("button", { onClick: openCreateOlt, className: "flex items-center gap-2 bg-signal text-base text-sm font-medium rounded-md px-4 py-2 hover:opacity-90 transition-opacity shrink-0", children: [_jsx(Plus, { size: 16 }), " Agregar OLT"] })] }), _jsxs("div", { className: "grid grid-cols-3 gap-6", children: [_jsx("div", { className: "space-y-2", children: loading ? (_jsx("p", { className: "text-muted text-sm", children: "Cargando\u2026" })) : olts.length === 0 ? (_jsx("div", { className: "status-panel status-panel--neutral text-sm text-muted", children: "No hay OLT registradas. Agrega la primera con \"Agregar OLT\"." })) : (olts.map((olt) => (_jsxs("button", { onClick: () => selectOlt(olt), className: `w-full text-left status-panel ${olt.status === 'ONLINE' ? 'status-panel--ok' : 'status-panel--neutral'} ${selected?.id === olt.id ? 'ring-1 ring-signal' : ''}`, children: [_jsxs("div", { className: "flex items-start justify-between", children: [_jsxs("div", { children: [_jsx("p", { className: "font-medium", children: olt.name }), _jsxs("p", { className: "text-xs text-muted", children: [VENDORS.find((v) => v.value === olt.vendor)?.label ?? olt.vendor, " \u00B7 ", olt.model ?? 'modelo no especificado'] })] }), olt.status === 'ONLINE' ? _jsx(Wifi, { className: "text-ok shrink-0", size: 16 }) : _jsx(WifiOff, { className: "text-muted shrink-0", size: 16 })] }), _jsx(StatusBadge, { status: olt.status }), olt.isDemo && _jsx("p", { className: "text-[10px] text-muted/70 mt-2", children: "Dato demo" })] }, olt.id)))) }), _jsx("div", { className: "col-span-2", children: !selected ? (_jsx("p", { className: "text-muted text-sm", children: "Selecciona una OLT para ver sus puertos PON y ONUs." })) : (_jsxs("div", { className: "space-y-5", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("p", { className: "font-display font-bold", children: selected.name }), _jsxs("p", { className: "text-xs text-muted", children: [selected.host, " \u00B7 ", selected.location ?? 'sin ubicación'] })] }), _jsxs("div", { className: "flex gap-3", children: [_jsxs("button", { onClick: checkConnection, disabled: checking, className: "flex items-center gap-1.5 text-xs text-signal hover:underline disabled:opacity-50", children: [_jsx(RefreshCw, { size: 12, className: checking ? 'animate-spin' : '' }), "Verificar conexi\u00F3n"] }), _jsxs("button", { onClick: openRegisterOnu, className: "flex items-center gap-1.5 text-xs text-signal hover:underline", children: [_jsx(PlusCircle, { size: 12 }), "Registrar ONU"] })] })] }), !ponData ? (_jsx("p", { className: "text-muted text-sm", children: "Cargando\u2026" })) : !ponData.supported ? (_jsx("div", { className: "status-panel status-panel--neutral text-sm text-muted", children: ponData.reason })) : (_jsxs("div", { children: [_jsx("p", { className: "text-xs font-medium text-muted mb-2 uppercase tracking-wide", children: "Puertos PON" }), _jsxs("div", { className: "grid grid-cols-2 gap-3", children: [ponData.ponPorts.map((p) => (_jsxs("div", { className: `status-panel ${p.status === 'ONLINE' ? 'status-panel--ok' : 'status-panel--critical'}`, children: [_jsxs("p", { className: "font-medium", children: ["PON ", p.ponId] }), _jsxs("p", { className: "text-xs text-muted", children: [p.onlineOnuCount, "/", p.onuCount, " ONUs en l\u00EDnea"] })] }, p.ponId))), ponData.ponPorts.length === 0 && _jsx("p", { className: "text-xs text-muted", children: "Sin puertos reportados." })] })] })), _jsxs("div", { children: [_jsx("p", { className: "text-xs font-medium text-muted mb-2 uppercase tracking-wide", children: "ONUs registradas" }), onus.length === 0 ? (_jsx("p", { className: "text-xs text-muted", children: "No hay ONUs registradas en esta OLT todav\u00EDa." })) : (_jsx("div", { className: "border border-border rounded-md divide-y divide-border", children: onus.map((onu) => (_jsxs("div", { className: "px-3 py-2.5 flex items-center justify-between text-sm", children: [_jsxs("div", { children: [_jsxs("p", { children: ["PON ", onu.ponPort, " \u00B7 ", _jsx("span", { className: "text-muted", children: onu.serial })] }), onu.model && _jsx("p", { className: "text-[11px] text-muted", children: onu.model })] }), _jsxs("div", { className: "flex items-center gap-3", children: [_jsx(StatusBadge, { status: onu.status }), _jsxs("button", { onClick: () => toggleOnu(onu), className: `flex items-center gap-1 text-xs ${onu.status === 'ONLINE' ? 'text-critical hover:underline' : 'text-ok hover:underline'}`, children: [onu.status === 'ONLINE' ? _jsx(PowerOff, { size: 12 }) : _jsx(Power, { size: 12 }), onu.status === 'ONLINE' ? 'Desautorizar' : 'Autorizar'] })] })] }, onu.id))) }))] })] })) })] }), oltModalOpen && (_jsx("div", { className: "fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 backdrop-blur-sm p-6 pt-[8vh]", onClick: () => setOltModalOpen(false), children: _jsxs("div", { onClick: (e) => e.stopPropagation(), className: "w-full max-w-lg bg-surface border border-border rounded-lg shadow-2xl", children: [_jsxs("div", { className: "flex items-start justify-between border-b border-border px-6 py-4", children: [_jsxs("div", { children: [_jsx("h2", { className: "font-display font-bold text-lg", children: "Agregar OLT" }), _jsx("p", { className: "text-xs text-muted mt-0.5", children: "Huawei, ZTE y FiberHome usan drivers en verificaci\u00F3n; SNMP gen\u00E9rico ya lee datos reales." })] }), _jsx("button", { onClick: () => setOltModalOpen(false), className: "text-muted hover:text-ink p-1 -mr-1 -mt-1", "aria-label": "Cerrar", children: _jsx(X, { size: 18 }) })] }), _jsxs("form", { onSubmit: handleOltSubmit, className: "px-6 py-5 space-y-4", children: [oltError && _jsx("div", { className: "status-panel status-panel--critical text-sm text-critical py-2.5", children: oltError }), _jsxs("div", { children: [_jsx("label", { className: labelClass(), children: "Nombre" }), _jsx("input", { required: true, placeholder: "Ej. OLT Central - Sector 1", value: oltForm.name, onChange: (e) => setOltForm({ ...oltForm, name: e.target.value }), className: fieldClass() })] }), _jsxs("div", { className: "grid grid-cols-2 gap-3", children: [_jsxs("div", { children: [_jsx("label", { className: labelClass(), children: "Fabricante" }), _jsx("select", { value: oltForm.vendor, onChange: (e) => setOltForm({ ...oltForm, vendor: e.target.value }), className: fieldClass(), children: VENDORS.map((v) => (_jsx("option", { value: v.value, children: v.label }, v.value))) })] }), _jsxs("div", { children: [_jsx("label", { className: labelClass(), children: "Modelo (opcional)" }), _jsx("input", { placeholder: "Ej. MA5800-X7", value: oltForm.model, onChange: (e) => setOltForm({ ...oltForm, model: e.target.value }), className: fieldClass() })] })] }), _jsxs("div", { children: [_jsx("label", { className: labelClass(), children: "Direcci\u00F3n IP" }), _jsx("input", { required: true, placeholder: "10.0.0.10", value: oltForm.host, onChange: (e) => setOltForm({ ...oltForm, host: e.target.value }), className: fieldClass() })] }), _jsxs("div", { children: [_jsx("label", { className: labelClass(), children: "Comunidad SNMP" }), _jsx("input", { value: oltForm.snmpCommunity, onChange: (e) => setOltForm({ ...oltForm, snmpCommunity: e.target.value }), className: fieldClass() })] }), _jsxs("div", { children: [_jsx("label", { className: labelClass(), children: "Ubicaci\u00F3n (opcional)" }), _jsx("input", { placeholder: "Ej. Nodo Este", value: oltForm.location, onChange: (e) => setOltForm({ ...oltForm, location: e.target.value }), className: fieldClass() })] }), _jsxs("div", { className: "flex justify-end gap-2 pt-2", children: [_jsx("button", { type: "button", onClick: () => setOltModalOpen(false), className: "text-sm text-muted hover:text-ink px-4 py-2", children: "Cancelar" }), _jsx("button", { type: "submit", disabled: savingOlt, className: "bg-signal text-base text-sm font-medium rounded-md px-5 py-2 disabled:opacity-50", children: savingOlt ? 'Guardando…' : 'Guardar OLT' })] })] })] }) })), onuModalOpen && selected && (_jsx("div", { className: "fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 backdrop-blur-sm p-6 pt-[8vh]", onClick: () => setOnuModalOpen(false), children: _jsxs("div", { onClick: (e) => e.stopPropagation(), className: "w-full max-w-lg bg-surface border border-border rounded-lg shadow-2xl", children: [_jsxs("div", { className: "flex items-start justify-between border-b border-border px-6 py-4", children: [_jsxs("div", { children: [_jsx("h2", { className: "font-display font-bold text-lg", children: "Registrar ONU" }), _jsxs("p", { className: "text-xs text-muted mt-0.5", children: ["En ", selected.name] })] }), _jsx("button", { onClick: () => setOnuModalOpen(false), className: "text-muted hover:text-ink p-1 -mr-1 -mt-1", "aria-label": "Cerrar", children: _jsx(X, { size: 18 }) })] }), _jsxs("form", { onSubmit: handleOnuSubmit, className: "px-6 py-5 space-y-4", children: [onuError && _jsx("div", { className: "status-panel status-panel--critical text-sm text-critical py-2.5", children: onuError }), _jsxs("div", { children: [_jsx("label", { className: labelClass(), children: "Puerto PON" }), _jsx("input", { required: true, placeholder: "Ej. 0/1/1", value: onuForm.ponPort, onChange: (e) => setOnuForm({ ...onuForm, ponPort: e.target.value }), className: fieldClass() })] }), _jsxs("div", { children: [_jsx("label", { className: labelClass(), children: "N\u00FAmero de serie" }), _jsx("input", { required: true, placeholder: "Ej. HWTC12345678", value: onuForm.serial, onChange: (e) => setOnuForm({ ...onuForm, serial: e.target.value }), className: fieldClass() })] }), _jsxs("div", { className: "grid grid-cols-2 gap-3", children: [_jsxs("div", { children: [_jsx("label", { className: labelClass(), children: "MAC (opcional)" }), _jsx("input", { placeholder: "00:11:22:33:44:55", value: onuForm.mac, onChange: (e) => setOnuForm({ ...onuForm, mac: e.target.value }), className: fieldClass() })] }), _jsxs("div", { children: [_jsx("label", { className: labelClass(), children: "Modelo (opcional)" }), _jsx("input", { placeholder: "Ej. HG8310M", value: onuForm.model, onChange: (e) => setOnuForm({ ...onuForm, model: e.target.value }), className: fieldClass() })] })] }), _jsxs("div", { className: "flex justify-end gap-2 pt-2", children: [_jsx("button", { type: "button", onClick: () => setOnuModalOpen(false), className: "text-sm text-muted hover:text-ink px-4 py-2", children: "Cancelar" }), _jsx("button", { type: "submit", disabled: savingOnu, className: "bg-signal text-base text-sm font-medium rounded-md px-5 py-2 disabled:opacity-50", children: savingOnu ? 'Guardando…' : 'Registrar ONU' })] })] })] }) }))] }));
}
