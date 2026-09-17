import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { createContext, useCallback, useContext, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
const ConfirmContext = createContext(null);
export function ConfirmProvider({ children }) {
    const [state, setState] = useState(null);
    const confirm = useCallback((options) => {
        return new Promise((resolve) => {
            setState({ options, resolve });
        });
    }, []);
    function close(result) {
        state?.resolve(result);
        setState(null);
    }
    return (_jsxs(ConfirmContext.Provider, { value: confirm, children: [children, state && (_jsx("div", { className: "fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-sm p-6", onClick: () => close(false), children: _jsxs("div", { onClick: (e) => e.stopPropagation(), className: "w-full max-w-sm bg-surface border border-border rounded-lg shadow-2xl p-5", children: [_jsxs("div", { className: "flex items-start gap-3 mb-4", children: [_jsx("div", { className: `shrink-0 rounded-full p-2 ${state.options.danger ? 'bg-critical/10 text-critical' : 'bg-signal/10 text-signal'}`, children: _jsx(AlertTriangle, { size: 18 }) }), _jsxs("div", { children: [_jsx("p", { className: "font-display font-bold", children: state.options.title }), state.options.description && _jsx("p", { className: "text-sm text-muted mt-1", children: state.options.description })] })] }), _jsxs("div", { className: "flex justify-end gap-2", children: [_jsx("button", { onClick: () => close(false), className: "text-sm text-muted hover:text-ink px-4 py-2", children: state.options.cancelLabel ?? 'Cancelar' }), _jsx("button", { onClick: () => close(true), className: `text-sm font-medium rounded-md px-4 py-2 ${state.options.danger ? 'bg-critical text-white hover:opacity-90' : 'bg-signal text-base hover:opacity-90'}`, children: state.options.confirmLabel ?? 'Confirmar' })] })] }) }))] }));
}
export function useConfirm() {
    const ctx = useContext(ConfirmContext);
    if (!ctx)
        throw new Error('useConfirm debe usarse dentro de <ConfirmProvider>');
    return ctx;
}
