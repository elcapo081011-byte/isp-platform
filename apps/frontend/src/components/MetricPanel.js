import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
const REASON_LABELS = {
    not_tracked_daily: 'No se registra por día todavía',
    requires_vendor_driver: 'Requiere driver de fabricante verificado',
};
function reasonLabel(source) {
    if (!source)
        return 'Aún no disponible';
    if (source.startsWith('pending_phase_'))
        return `Disponible en ${source.replace('pending_', '').replace('_', ' ')}`;
    return REASON_LABELS[source] ?? 'Aún no disponible';
}
export function MetricPanel({ label, value, severity = 'neutral', pendingPhase }) {
    const isPending = value === null;
    return (_jsxs("div", { className: `status-panel status-panel--${isPending ? 'neutral' : severity}`, children: [_jsx("p", { className: "text-xs text-muted mb-2", children: label }), isPending ? (_jsx("p", { className: "text-sm text-muted/80", children: reasonLabel(pendingPhase) })) : (_jsx("p", { className: "text-3xl font-display font-bold", children: value.toLocaleString('es-DO') }))] }));
}
