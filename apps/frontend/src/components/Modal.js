import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect } from 'react';
import { X } from 'lucide-react';
export function Modal({ title, subtitle, onClose, children, width = 'md' }) {
    useEffect(() => {
        function onKey(e) {
            if (e.key === 'Escape')
                onClose();
        }
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onClose]);
    return (_jsx("div", { className: "fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 backdrop-blur-sm p-6 pt-[8vh]", children: _jsxs("div", { role: "dialog", "aria-modal": "true", className: `w-full ${width === 'lg' ? 'max-w-2xl' : 'max-w-lg'} bg-surface border border-border rounded-lg shadow-2xl`, children: [_jsxs("div", { className: "flex items-start justify-between border-b border-border px-6 py-4", children: [_jsxs("div", { children: [_jsx("h2", { className: "font-display font-bold text-lg", children: title }), subtitle && _jsx("p", { className: "text-xs text-muted mt-0.5", children: subtitle })] }), _jsx("button", { onClick: onClose, className: "text-muted hover:text-ink transition-colors rounded-md p-1 -mr-1 -mt-1", "aria-label": "Cerrar", children: _jsx(X, { size: 18 }) })] }), _jsx("div", { className: "px-6 py-5", children: children })] }) }));
}
