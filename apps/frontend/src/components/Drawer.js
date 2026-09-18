import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect } from 'react';
import { X } from 'lucide-react';
export function Drawer({ title, subtitle, onClose, children, width = 'sm' }) {
    useEffect(() => {
        function onKey(e) {
            if (e.key === 'Escape')
                onClose();
        }
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onClose]);
    return (_jsx("div", { className: "fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm", onClick: onClose, children: _jsxs("div", { role: "dialog", "aria-modal": "true", onClick: (e) => e.stopPropagation(), className: `drawer-enter w-full ${width === 'md' ? 'max-w-md' : 'max-w-sm'} h-full bg-surface border-l border-border overflow-y-auto`, children: [_jsxs("div", { className: "sticky top-0 glass border-b border-border px-5 py-4 flex items-start justify-between z-10", children: [_jsxs("div", { className: "min-w-0", children: [_jsx("p", { className: "font-display font-bold truncate", children: title }), subtitle && _jsx("p", { className: "text-xs text-muted truncate", children: subtitle })] }), _jsx("button", { onClick: onClose, className: "text-muted hover:text-ink p-1 -mr-1 shrink-0", "aria-label": "Cerrar", children: _jsx(X, { size: 16 }) })] }), _jsx("div", { className: "p-5", children: children })] }) }));
}
