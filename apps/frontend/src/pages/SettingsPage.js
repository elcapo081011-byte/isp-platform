import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { useUIStore, ACCENT_OPTIONS } from '../store/ui.store';
import { useToast } from '../components/Toast';
export function SettingsPage() {
    const [graceDays, setGraceDays] = useState('3');
    const [notifyDays, setNotifyDays] = useState('3');
    const [rxWarn, setRxWarn] = useState('-25');
    const [rxCritical, setRxCritical] = useState('-28');
    const accent = useUIStore((s) => s.accent);
    const setAccent = useUIStore((s) => s.setAccent);
    const toast = useToast();
    useEffect(() => {
        api.get('/settings').then((res) => {
            const s = res.data.suspension_rules;
            const t = res.data.optical_thresholds;
            if (s) {
                setGraceDays(String(s.graceDays));
                setNotifyDays(String(s.notifyDaysBeforeDue));
            }
            if (t) {
                setRxWarn(String(t.rxWarnDbm));
                setRxCritical(String(t.rxCriticalDbm));
            }
        });
    }, []);
    async function save() {
        try {
            await api.put('/settings/suspension_rules', { value: { graceDays: Number(graceDays), notifyDaysBeforeDue: Number(notifyDays) } });
            await api.put('/settings/optical_thresholds', { value: { rxWarnDbm: Number(rxWarn), rxCriticalDbm: Number(rxCritical) } });
            toast.success('Configuración guardada.');
        }
        catch {
            toast.error('No se pudo guardar la configuración.');
        }
    }
    return (_jsxs("div", { className: "p-8 max-w-lg space-y-5", children: [_jsxs("div", { children: [_jsx("h1", { className: "text-2xl font-display font-bold mb-1", children: "Configuraci\u00F3n" }), _jsx("p", { className: "text-muted text-sm", children: "Reglas de negocio y apariencia del sistema." })] }), _jsxs("div", { className: "status-panel status-panel--neutral space-y-3", children: [_jsx("p", { className: "text-sm font-medium", children: "Apariencia" }), _jsx("p", { className: "text-xs text-muted", children: "Color principal de la interfaz \u2014 se aplica al instante para todos tus usuarios en este navegador." }), _jsx("div", { className: "flex flex-wrap gap-2 pt-1", children: ACCENT_OPTIONS.map((opt) => (_jsxs("button", { onClick: () => setAccent(opt.key), className: `flex items-center gap-2 border rounded-md px-3 py-1.5 text-xs transition-colors ${accent === opt.key ? 'border-signal text-ink bg-surface-raised' : 'border-border text-muted hover:text-ink'}`, children: [_jsx("span", { className: "h-3 w-3 rounded-full shrink-0", style: { background: opt.key === 'teal' ? '#1FB6A6' : opt.key === 'indigo' ? '#6366F1' : opt.key === 'amber' ? '#E8A23D' : '#E1554F' } }), opt.label] }, opt.key))) })] }), _jsxs("div", { className: "status-panel status-panel--neutral space-y-4", children: [_jsx("p", { className: "text-sm font-medium", children: "Motor de suspensi\u00F3n" }), _jsxs("div", { className: "grid grid-cols-2 gap-3", children: [_jsx(Field, { label: "D\u00EDas de gracia", value: graceDays, onChange: setGraceDays }), _jsx(Field, { label: "Avisar N d\u00EDas antes", value: notifyDays, onChange: setNotifyDays })] }), _jsx("p", { className: "text-sm font-medium pt-2 border-t border-border", children: "Umbrales de se\u00F1al \u00F3ptica (configurables, no universales)" }), _jsxs("div", { className: "grid grid-cols-2 gap-3", children: [_jsx(Field, { label: "RX advertencia (dBm)", value: rxWarn, onChange: setRxWarn }), _jsx(Field, { label: "RX cr\u00EDtico (dBm)", value: rxCritical, onChange: setRxCritical })] }), _jsx("button", { onClick: save, className: "bg-signal text-base text-sm font-medium rounded-md px-4 py-2", children: "Guardar cambios" })] })] }));
}
function Field({ label, value, onChange }) {
    return (_jsxs("div", { children: [_jsx("label", { className: "block text-xs text-muted mb-1", children: label }), _jsx("input", { type: "number", value: value, onChange: (e) => onChange(e.target.value), className: "w-full bg-surface-raised border border-border rounded-md px-3 py-2 text-sm outline-none focus:border-signal" })] }));
}
