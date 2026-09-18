import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from 'react';
import { Radio, X } from 'lucide-react';
import { api } from '../lib/api';
import { StatusBadge } from '../components/StatusBadge';
export function OnuPage() {
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [signalFilter, setSignalFilter] = useState('ALL');
    const [thresholds, setThresholds] = useState({ rxWarnDbm: -25, rxCriticalDbm: -28 });
    const [selected, setSelected] = useState(null);
    useEffect(() => {
        async function load() {
            setLoading(true);
            try {
                const { data: olts } = await api.get('/olt');
                const results = await Promise.all(olts.map(async (olt) => {
                    try {
                        const { data: onus } = await api.get(`/olt/${olt.id}/onus`);
                        return onus.map((o) => ({ ...o, oltName: olt.name }));
                    }
                    catch {
                        return [];
                    }
                }));
                setRows(results.flat());
            }
            finally {
                setLoading(false);
            }
        }
        load();
        api
            .get('/settings/optical_thresholds')
            .then((res) => {
            if (res.data)
                setThresholds(res.data);
        })
            .catch(() => { });
    }, []);
    const filtered = useMemo(() => {
        return rows.filter((o) => {
            if (statusFilter !== 'ALL' && o.status !== statusFilter)
                return false;
            if (signalFilter === 'CRITICAL' && !(o.rxPowerDbm != null && o.rxPowerDbm <= thresholds.rxCriticalDbm))
                return false;
            if (signalFilter === 'WARNING' && !(o.rxPowerDbm != null && o.rxPowerDbm <= thresholds.rxWarnDbm && o.rxPowerDbm > thresholds.rxCriticalDbm))
                return false;
            return true;
        });
    }, [rows, statusFilter, signalFilter, thresholds]);
    function signalClass(rx) {
        if (rx == null)
            return 'text-muted';
        if (rx <= thresholds.rxCriticalDbm)
            return 'text-critical';
        if (rx <= thresholds.rxWarnDbm)
            return 'text-warn';
        return 'text-ok';
    }
    return (_jsxs("div", { className: "p-8 max-w-6xl page-enter", children: [_jsx("h1", { className: "text-2xl font-display font-bold mb-1", children: "ONU / ONT" }), _jsx("p", { className: "text-muted text-sm mb-6", children: "Agregado de todas tus OLT. Los umbrales de se\u00F1al se toman de Configuraci\u00F3n \u2192 Umbrales \u00F3pticos." }), _jsxs("div", { className: "flex flex-wrap gap-2 mb-4", children: [['ALL', 'ONLINE', 'OFFLINE', 'UNKNOWN'].map((s) => (_jsx("button", { onClick: () => setStatusFilter(s), className: `text-xs px-3 py-1.5 rounded-md border ${statusFilter === s ? 'bg-signal text-base border-signal' : 'border-border text-muted hover:text-ink'}`, children: s === 'ALL' ? 'Todos' : s }, s))), _jsx("span", { className: "w-px bg-border mx-1" }), ['ALL', 'WARNING', 'CRITICAL'].map((s) => (_jsx("button", { onClick: () => setSignalFilter(s), className: `text-xs px-3 py-1.5 rounded-md border ${signalFilter === s ? 'bg-signal text-base border-signal' : 'border-border text-muted hover:text-ink'}`, children: s === 'ALL' ? 'Cualquier señal' : s === 'WARNING' ? 'Señal en advertencia' : 'Señal crítica' }, s)))] }), _jsx("div", { className: "border border-border rounded-md overflow-hidden overflow-x-auto", children: _jsxs("table", { className: "w-full text-sm", children: [_jsx("thead", { className: "bg-surface text-muted text-xs", children: _jsxs("tr", { children: [_jsx("th", { className: "text-left px-4 py-3", children: "Estado" }), _jsx("th", { className: "text-left px-4 py-3", children: "Serial" }), _jsx("th", { className: "text-left px-4 py-3", children: "OLT" }), _jsx("th", { className: "text-left px-4 py-3", children: "PON" }), _jsx("th", { className: "text-left px-4 py-3", children: "RX" }), _jsx("th", { className: "text-left px-4 py-3", children: "TX" }), _jsx("th", { className: "text-left px-4 py-3", children: "Temp." }), _jsx("th", { className: "text-left px-4 py-3", children: "Distancia" }), _jsx("th", { className: "text-left px-4 py-3", children: "\u00DAltima vez en l\u00EDnea" })] }) }), _jsx("tbody", { children: loading ? (_jsx("tr", { children: _jsx("td", { colSpan: 9, className: "px-4 py-6 text-center text-muted", children: "Cargando\u2026" }) })) : filtered.length === 0 ? (_jsx("tr", { children: _jsx("td", { colSpan: 9, className: "px-4 py-6 text-center text-muted", children: "Sin ONUs que coincidan con el filtro." }) })) : (filtered.map((o) => (_jsxs("tr", { className: "border-t border-border hover:bg-surface-raised/40 cursor-pointer", onClick: () => setSelected(o), children: [_jsx("td", { className: "px-4 py-3", children: _jsx(StatusBadge, { status: o.status }) }), _jsx("td", { className: "px-4 py-3", children: o.serial }), _jsx("td", { className: "px-4 py-3 text-muted", children: o.oltName }), _jsx("td", { className: "px-4 py-3 text-muted", children: o.ponPort }), _jsx("td", { className: `px-4 py-3 ${signalClass(o.rxPowerDbm)}`, children: o.rxPowerDbm != null ? `${o.rxPowerDbm} dBm` : '—' }), _jsx("td", { className: "px-4 py-3 text-muted", children: o.txPowerDbm != null ? `${o.txPowerDbm} dBm` : '—' }), _jsx("td", { className: "px-4 py-3 text-muted", children: o.temperatureCelsius != null ? `${o.temperatureCelsius}°C` : '—' }), _jsx("td", { className: "px-4 py-3 text-muted", children: o.distanceMeters != null ? `${o.distanceMeters} m` : '—' }), _jsx("td", { className: "px-4 py-3 text-muted", children: o.lastSeenAt ? new Date(o.lastSeenAt).toLocaleString('es-DO') : '—' })] }, o.id)))) })] }) }), selected && (_jsx("div", { className: "fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm", onClick: () => setSelected(null), children: _jsxs("div", { onClick: (e) => e.stopPropagation(), className: "w-full max-w-sm h-full bg-surface border-l border-border p-6 overflow-y-auto", children: [_jsxs("div", { className: "flex items-start justify-between mb-4", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx(Radio, { size: 16, className: "text-signal" }), _jsx("p", { className: "font-display font-bold", children: selected.serial })] }), _jsx("button", { onClick: () => setSelected(null), className: "text-muted hover:text-ink", "aria-label": "Cerrar", children: _jsx(X, { size: 16 }) })] }), _jsxs("div", { className: "space-y-3 text-sm", children: [_jsx(DetailRow, { label: "Estado", value: _jsx(StatusBadge, { status: selected.status }) }), _jsx(DetailRow, { label: "OLT", value: selected.oltName }), _jsx(DetailRow, { label: "Puerto PON", value: selected.ponPort }), _jsx(DetailRow, { label: "Modelo", value: selected.model ?? '—' }), _jsx(DetailRow, { label: "MAC", value: selected.mac ?? '—' }), _jsx(DetailRow, { label: "RX", value: selected.rxPowerDbm != null ? `${selected.rxPowerDbm} dBm` : '—', valueClass: signalClass(selected.rxPowerDbm) }), _jsx(DetailRow, { label: "TX", value: selected.txPowerDbm != null ? `${selected.txPowerDbm} dBm` : '—' }), _jsx(DetailRow, { label: "Temperatura", value: selected.temperatureCelsius != null ? `${selected.temperatureCelsius}°C` : '—' }), _jsx(DetailRow, { label: "Distancia", value: selected.distanceMeters != null ? `${selected.distanceMeters} m` : '—' }), _jsx(DetailRow, { label: "\u00DAltima vez en l\u00EDnea", value: selected.lastSeenAt ? new Date(selected.lastSeenAt).toLocaleString('es-DO') : '—' })] })] }) }))] }));
}
function DetailRow({ label, value, valueClass }) {
    return (_jsxs("div", { className: "flex items-center justify-between border-b border-border pb-2", children: [_jsx("span", { className: "text-muted text-xs", children: label }), _jsx("span", { className: valueClass, children: value })] }));
}
