import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { NavLink, Outlet } from 'react-router-dom';
import { LayoutDashboard, Users, Router, Boxes, Radio, Map as MapIcon, Activity, Ticket, Archive, FileText, Shield, Settings, LogOut, Wifi, Building2, } from 'lucide-react';
import { useAuthStore } from '../store/auth.store';
const NAV_ITEMS = [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, live: true },
    { to: '/clientes', label: 'Clientes', icon: Users, live: true },
    { to: '/planes', label: 'Planes', icon: Wifi, live: true },
    { to: '/facturacion', label: 'Facturación', icon: FileText, live: true },
    { to: '/mikrotik', label: 'MikroTik', icon: Router, live: true },
    { to: '/olt', label: 'OLT', icon: Radio, live: true },
    { to: '/onu', label: 'ONU / ONT', icon: Boxes, live: false },
    { to: '/mapa', label: 'NAP / Mapa', icon: MapIcon, live: true },
    { to: '/monitoreo', label: 'Monitoreo', icon: Activity, live: true },
    { to: '/tickets', label: 'Tickets', icon: Ticket, live: true },
    { to: '/inventario', label: 'Inventario', icon: Archive, live: true },
    { to: '/auditoria', label: 'Auditoría', icon: Shield, live: false },
    { to: '/settings', label: 'Configuración', icon: Settings, live: true },
];
export function AppLayout() {
    const user = useAuthStore((s) => s.user);
    const clearSession = useAuthStore((s) => s.clearSession);
    return (_jsxs("div", { className: "min-h-screen flex", children: [_jsxs("aside", { className: "w-60 shrink-0 bg-surface border-r border-border flex flex-col", children: [_jsxs("div", { className: "h-16 flex items-center gap-2 px-5 border-b border-border", children: [_jsx(Radio, { className: "text-signal", size: 20, strokeWidth: 2.5 }), _jsx("span", { className: "font-display font-extrabold tracking-tight", children: "ISP Control" })] }), _jsxs("nav", { className: "flex-1 py-3 px-2 space-y-0.5 overflow-y-auto", children: [NAV_ITEMS.map(({ to, label, icon: Icon, live }) => (_jsxs(NavLink, { to: to, className: ({ isActive }) => `flex items-center justify-between gap-2 px-3 py-2 rounded-md text-sm transition-colors ${isActive ? 'bg-surface-raised text-ink' : 'text-muted hover:text-ink hover:bg-surface-raised/60'}`, children: [_jsxs("span", { className: "flex items-center gap-2.5", children: [_jsx(Icon, { size: 16, strokeWidth: 2 }), label] }), !live && _jsx("span", { className: "text-[10px] text-muted/70 border border-border rounded px-1.5 py-0.5", children: "pronto" })] }, to))), user?.isPlatformAdmin && (_jsxs(NavLink, { to: "/platform", className: ({ isActive }) => `flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors mt-2 border-t border-border pt-3 ${isActive ? 'bg-surface-raised text-ink' : 'text-signal hover:text-ink hover:bg-surface-raised/60'}`, children: [_jsx(Building2, { size: 16, strokeWidth: 2 }), "Plataforma (todas las cuentas)"] }))] }), _jsx("div", { className: "border-t border-border p-3", children: _jsxs("div", { className: "flex items-center justify-between px-2 py-2", children: [_jsxs("div", { className: "min-w-0", children: [_jsxs("p", { className: "text-sm truncate", children: [user?.firstName, " ", user?.lastName] }), _jsx("p", { className: "text-xs text-muted truncate", children: user?.roles?.join(', ') || (user?.isPlatformAdmin ? 'Dueño de la plataforma' : '') })] }), _jsx("button", { onClick: clearSession, className: "text-muted hover:text-critical transition-colors shrink-0", title: "Cerrar sesi\u00F3n", children: _jsx(LogOut, { size: 16 }) })] }) })] }), _jsx("main", { className: "flex-1 min-w-0", children: _jsx(Outlet, {}) })] }));
}
