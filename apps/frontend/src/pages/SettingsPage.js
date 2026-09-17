import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { api } from '../lib/api';
export function SettingsPage() {
    const [graceDays, setGraceDays] = useState('3');
    const [notifyDays, setNotifyDays] = useState('3');
    const [rxWarn, setRxWarn] = useState('-25');
    const [rxCritical, setRxCritical] = useState('-28');
    const [saved, setSaved] = useState(false);
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
        await api.put('/settings/suspension_rules', { value: { graceDays: Number(graceDays), notifyDaysBeforeDue: Number(notifyDays) } });
        await api.put('/settings/optical_thresholds', { value: { rxWarnDbm: Number(rxWarn), rxCriticalDbm: Number(rxCritical) } });
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
    }
    return (_jsxs("div", { className: "p-8 max-w-lg", children: [_jsx("h1", { className: "text-2xl font-display font-bold mb-1", children: "Configuraci\u00F3n" }), _jsx("p", { className: "text-muted text-sm mb-6", children: "Reglas de negocio del sistema. El branding completo (logo, colores) se termina de exponer aqu\u00ED en producci\u00F3n." }), _jsxs("div", { className: "status-panel status-panel--neutral space-y-4", children: [_jsx("p", { className: "text-sm font-medium", children: "Motor de suspensi\u00F3n" }), _jsxs("div", { className: "grid grid-cols-2 gap-3", children: [_jsx(Field, { label: "D\u00EDas de gracia", value: graceDays, onChange: setGraceDays }), _jsx(Field, { label: "Avisar N d\u00EDas antes", value: notifyDays, onChange: setNotifyDays })] }), _jsx("p", { className: "text-sm font-medium pt-2 border-t border-border", children: "Umbrales de se\u00F1al \u00F3ptica (configurables, no universales)" }), _jsxs("div", { className: "grid grid-cols-2 gap-3", children: [_jsx(Field, { label: "RX advertencia (dBm)", value: rxWarn, onChange: setRxWarn }), _jsx(Field, { label: "RX cr\u00EDtico (dBm)", value: rxCritical, onChange: setRxCritical })] }), _jsx("button", { onClick: save, className: "bg-signal text-base text-sm font-medium rounded-md px-4 py-2", children: saved ? 'Guardado ✓' : 'Guardar cambios' })] })] }));
}
function Field({ label, value, onChange }) {
    return (_jsxs("div", { children: [_jsx("label", { className: "block text-xs text-muted mb-1", children: label }), _jsx("input", { type: "number", value: value, onChange: (e) => onChange(e.target.value), className: "w-full bg-surface-raised border border-border rounded-md px-3 py-2 text-sm outline-none focus:border-signal" })] }));
}
