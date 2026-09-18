import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
export function SkeletonLine({ className = '' }) {
    return _jsx("div", { className: `skeleton h-4 ${className}` });
}
export function SkeletonCard() {
    return (_jsxs("div", { className: "status-panel status-panel--neutral", children: [_jsx(SkeletonLine, { className: "w-16 mb-3" }), _jsx(SkeletonLine, { className: "w-10 h-7 mb-2" }), _jsx(SkeletonLine, { className: "w-24" })] }));
}
export function SkeletonRow({ cols = 4 }) {
    return (_jsx("tr", { className: "border-t border-border", children: Array.from({ length: cols }).map((_, i) => (_jsx("td", { className: "px-4 py-3", children: _jsx(SkeletonLine, { className: "w-full max-w-[120px]" }) }, i))) }));
}
