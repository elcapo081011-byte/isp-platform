import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { createContext, useCallback, useContext, useRef, useState } from 'react';
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from 'lucide-react';
const ToastContext = createContext(null);
const VARIANT_STYLES = {
    success: { icon: CheckCircle2, className: 'border-l-ok text-ok' },
    warning: { icon: AlertTriangle, className: 'border-l-warn text-warn' },
    error: { icon: XCircle, className: 'border-l-critical text-critical' },
    info: { icon: Info, className: 'border-l-signal text-signal' },
};
export function ToastProvider({ children }) {
    const [toasts, setToasts] = useState([]);
    const idRef = useRef(0);
    const dismiss = useCallback((id) => {
        setToasts((t) => t.filter((x) => x.id !== id));
    }, []);
    const show = useCallback((message, variant = 'info') => {
        const id = ++idRef.current;
        setToasts((t) => [...t, { id, variant, message }]);
        setTimeout(() => dismiss(id), 5000);
    }, [dismiss]);
    const value = {
        show,
        success: (m) => show(m, 'success'),
        error: (m) => show(m, 'error'),
        warning: (m) => show(m, 'warning'),
        info: (m) => show(m, 'info'),
    };
    return (_jsxs(ToastContext.Provider, { value: value, children: [children, _jsx("div", { className: "fixed bottom-5 right-5 z-[100] flex flex-col gap-2 w-80 max-w-[90vw]", children: toasts.map((t) => {
                    const { icon: Icon, className } = VARIANT_STYLES[t.variant];
                    return (_jsxs("div", { className: `bg-surface border border-border border-l-[3px] rounded-md shadow-lg px-3.5 py-3 flex items-start gap-2.5 animate-[toast-in_0.18s_ease-out] ${className}`, children: [_jsx(Icon, { size: 16, className: "shrink-0 mt-0.5" }), _jsx("p", { className: "text-sm text-ink flex-1 leading-snug", children: t.message }), _jsx("button", { onClick: () => dismiss(t.id), className: "text-muted hover:text-ink shrink-0", "aria-label": "Cerrar notificaci\u00F3n", children: _jsx(X, { size: 14 }) })] }, t.id));
                }) })] }));
}
export function useToast() {
    const ctx = useContext(ToastContext);
    if (!ctx)
        throw new Error('useToast debe usarse dentro de <ToastProvider>');
    return ctx;
}
