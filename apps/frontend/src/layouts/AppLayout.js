import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useRef, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Users, UserPlus, Wifi, FileText, Router, Radio, Boxes, Map as MapIcon, Activity, Ticket, Archive, BarChart3, Settings, LogOut, ChevronLeft, ChevronRight, Search, Bell, Building2, X, } from 'lucide-react';
import { useAuthStore } from '../store/auth.store';
import { useUIStore } from '../store/ui.store';
import { api } from '../lib/api';
const NAV = [
    { label: '', items: [{ to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, live: true }] },
    {
        label: 'Clientes',
        items: [
            { to: '/clientes', label: 'Todos', icon: Users, live: true },
            { to: '/clientes?status=ACTIVE', label: 'Activos', icon: Users, live: true },
            { to: '/clientes?status=SUSPENDED', label: 'Suspendidos', icon: Users, live: true },
            { to: '/clientes/nuevo', label: 'Nuevo cliente', icon: UserPlus, live: true },
        ],
    },
    {
        label: 'Servicios',
        items: [{ to: '/planes', label: 'Planes', icon: Wifi, live: true }],
    },
    {
        label: 'Red',
        items: [
            { to: '/mikrotik', label: 'MikroTik', icon: Router, live: true },
            { to: '/olt', label: 'OLT', icon: Radio, live: true },
            { to: '/onu', label: 'ONU / ONT', icon: Boxes, live: false },
            { to: '/mapa', label: 'NAP / Mapa', icon: MapIcon, live: true },
        ],
    },
    {
        label: 'Facturación',
        items: [{ to: '/facturacion', label: 'Facturas y pagos', icon: FileText, live: true, badgeKey: 'invoicesOverdue' }],
    },
    {
        label: 'Monitoreo',
        items: [{ to: '/monitoreo', label: 'NOC', icon: Activity, live: true }],
    },
    {
        label: 'Soporte',
        items: [
            { to: '/tickets', label: 'Tickets', icon: Ticket, live: true, badgeKey: 'openTickets' },
            { to: '/tecnicos', label: 'Técnicos', icon: Users, live: false },
        ],
    },
    {
        label: 'Gestión',
        items: [
            { to: '/inventario', label: 'Inventario', icon: Archive, live: true },
            { to: '/reportes', label: 'Reportes', icon: BarChart3, live: false },
            { to: '/auditoria', label: 'Auditoría', icon: Building2, live: false },
        ],
    },
    {
        label: '',
        items: [{ to: '/settings', label: 'Configuración', icon: Settings, live: true }],
    },
];
export function AppLayout() {
    const user = useAuthStore((s) => s.user);
    const clearSession = useAuthStore((s) => s.clearSession);
    const collapsed = useUIStore((s) => s.sidebarCollapsed);
    const toggleSidebar = useUIStore((s) => s.toggleSidebar);
    const navigate = useNavigate();
    const [summary, setSummary] = useState(null);
    useEffect(() => {
        api.get('/dashboard/summary').then((res) => setSummary(res.data)).catch(() => { });
    }, []);
    function badgeFor(key) {
        if (!key || !summary?.[key]?.value)
            return 0;
        return summary[key].value;
    }
    const alertCount = badgeFor('invoicesOverdue') + badgeFor('openTickets');
    return (_jsxs("div", { className: "min-h-screen flex", children: [_jsxs("aside", { className: `shrink-0 bg-surface border-r border-border flex flex-col transition-[width] duration-150 ${collapsed ? 'w-16' : 'w-64'}`, children: [_jsxs("div", { className: `h-16 flex items-center gap-2 border-b border-border ${collapsed ? 'justify-center px-0' : 'px-5'}`, children: [_jsx(Radio, { className: "text-signal shrink-0", size: 22, strokeWidth: 2.5 }), !collapsed && _jsx("span", { className: "font-display font-extrabold tracking-tight truncate", children: "ISP Control" })] }), _jsxs("nav", { className: "flex-1 py-3 px-2 space-y-3 overflow-y-auto overflow-x-hidden", children: [NAV.map((group, gi) => (_jsxs("div", { children: [!collapsed && group.label && (_jsx("p", { className: "px-3 pb-1 text-[10px] font-medium text-muted/70 uppercase tracking-wider", children: group.label })), _jsx("div", { className: "space-y-0.5", children: group.items.map((item) => (_jsx(SidebarLink, { item: item, collapsed: collapsed, badge: badgeFor(item.badgeKey) }, item.to))) })] }, gi))), user?.isPlatformAdmin && (_jsx("div", { className: "border-t border-border pt-3", children: _jsxs(NavLink, { to: "/platform", title: collapsed ? 'Plataforma (todas las cuentas)' : undefined, className: ({ isActive }) => `flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors ${isActive ? 'bg-surface-raised text-ink' : 'text-signal hover:text-ink hover:bg-surface-raised/60'} ${collapsed ? 'justify-center' : ''}`, children: [_jsx(Building2, { size: 16, strokeWidth: 2, className: "shrink-0" }), !collapsed && 'Plataforma (todas las cuentas)'] }) }))] }), _jsx("button", { onClick: toggleSidebar, className: "flex items-center justify-center gap-1.5 border-t border-border py-2.5 text-muted hover:text-ink transition-colors text-xs", children: collapsed ? _jsx(ChevronRight, { size: 14 }) : (_jsxs(_Fragment, { children: [_jsx(ChevronLeft, { size: 14 }), " Contraer"] })) }), _jsx("div", { className: "border-t border-border p-3", children: _jsxs("div", { className: `flex items-center py-2 ${collapsed ? 'justify-center' : 'justify-between px-2'}`, children: [!collapsed && (_jsxs("div", { className: "min-w-0", children: [_jsxs("p", { className: "text-sm truncate", children: [user?.firstName, " ", user?.lastName] }), _jsx("p", { className: "text-xs text-muted truncate", children: user?.roles?.join(', ') || (user?.isPlatformAdmin ? 'Dueño de la plataforma' : '') })] })), _jsx("button", { onClick: clearSession, className: "text-muted hover:text-critical transition-colors shrink-0", title: "Cerrar sesi\u00F3n", children: _jsx(LogOut, { size: 16 }) })] }) })] }), _jsxs("div", { className: "flex-1 min-w-0 flex flex-col", children: [_jsx(Topbar, { user: user, alertCount: alertCount, summary: summary, onNavigate: navigate, onLogout: clearSession }), _jsx("main", { className: "flex-1 min-w-0 overflow-y-auto", children: _jsx(Outlet, {}) })] })] }));
}
function SidebarLink({ item, collapsed, badge }) {
    const Icon = item.icon;
    return (_jsxs(NavLink, { to: item.to, title: collapsed ? item.label : undefined, className: ({ isActive }) => `flex items-center justify-between gap-2 px-3 py-2 rounded-md text-sm transition-colors ${isActive ? 'bg-surface-raised text-ink' : 'text-muted hover:text-ink hover:bg-surface-raised/60'} ${collapsed ? 'justify-center px-0' : ''}`, children: [_jsxs("span", { className: `flex items-center gap-2.5 min-w-0 ${collapsed ? '' : 'flex-1'}`, children: [_jsx(Icon, { size: 16, strokeWidth: 2, className: "shrink-0" }), !collapsed && _jsx("span", { className: "truncate", children: item.label })] }), !collapsed && !item.live && (_jsx("span", { className: "text-[10px] text-muted/70 border border-border rounded px-1.5 py-0.5 shrink-0", children: "pronto" })), !collapsed && item.live && badge > 0 && (_jsx("span", { className: "text-[10px] font-medium bg-critical/15 text-critical rounded-full px-1.5 py-0.5 shrink-0", children: badge }))] }));
}
function Topbar({ user, alertCount, summary, onNavigate, onLogout, }) {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [searchOpen, setSearchOpen] = useState(false);
    const [notifOpen, setNotifOpen] = useState(false);
    const [profileOpen, setProfileOpen] = useState(false);
    const searchRef = useRef(null);
    const notifRef = useRef(null);
    const profileRef = useRef(null);
    useEffect(() => {
        function onClickOutside(e) {
            if (searchRef.current && !searchRef.current.contains(e.target))
                setSearchOpen(false);
            if (notifRef.current && !notifRef.current.contains(e.target))
                setNotifOpen(false);
            if (profileRef.current && !profileRef.current.contains(e.target))
                setProfileOpen(false);
        }
        document.addEventListener('mousedown', onClickOutside);
        return () => document.removeEventListener('mousedown', onClickOutside);
    }, []);
    useEffect(() => {
        if (query.trim().length < 2) {
            setResults([]);
            return;
        }
        const timeout = setTimeout(() => {
            api
                .get('/customers', { params: { search: query, pageSize: 6 } })
                .then((res) => setResults(res.data.items ?? []))
                .catch(() => setResults([]));
        }, 250);
        return () => clearTimeout(timeout);
    }, [query]);
    const mikrotikOnline = summary?.mikrotikOnline?.value ?? null;
    const oltOnline = summary?.oltOnline?.value ?? null;
    return (_jsxs("header", { className: "h-16 shrink-0 border-b border-border bg-surface/60 backdrop-blur flex items-center gap-4 px-6", children: [_jsxs("div", { ref: searchRef, className: "relative flex-1 max-w-md", children: [_jsx(Search, { size: 15, className: "absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" }), _jsx("input", { value: query, onChange: (e) => setQuery(e.target.value), onFocus: () => setSearchOpen(true), placeholder: "Buscar cliente, IP, tel\u00E9fono, documento\u2026", className: "w-full bg-surface-raised border border-border rounded-md pl-9 pr-8 py-2 text-sm outline-none focus:border-signal transition-colors" }), query && (_jsx("button", { onClick: () => setQuery(''), className: "absolute right-2.5 top-1/2 -translate-y-1/2 text-muted hover:text-ink", children: _jsx(X, { size: 13 }) })), searchOpen && query.trim().length >= 2 && (_jsx("div", { className: "absolute top-full mt-1.5 w-full bg-surface border border-border rounded-md shadow-2xl overflow-hidden z-20", children: results.length === 0 ? (_jsxs("p", { className: "px-3 py-3 text-xs text-muted", children: ["Sin resultados para \"", query, "\"."] })) : (results.map((c) => (_jsxs("button", { onClick: () => {
                                onNavigate(`/clientes/${c.id}`);
                                setSearchOpen(false);
                                setQuery('');
                            }, className: "w-full text-left px-3 py-2.5 hover:bg-surface-raised transition-colors flex items-center justify-between text-sm border-t border-border first:border-t-0", children: [_jsxs("span", { children: [c.firstName, " ", c.lastName, _jsx("span", { className: "text-muted text-xs ml-2", children: c.documentId ?? c.phone ?? '' })] }), _jsx("span", { className: "text-[10px] text-muted", children: c.status })] }, c.id)))) }))] }), _jsxs("div", { className: "hidden md:flex items-center gap-4 text-xs text-muted", children: [_jsxs("span", { className: "flex items-center gap-1.5", children: [_jsx("span", { className: `h-1.5 w-1.5 rounded-full ${mikrotikOnline ? 'bg-ok' : 'bg-border'}` }), "MikroTik ", mikrotikOnline ?? '—'] }), _jsxs("span", { className: "flex items-center gap-1.5", children: [_jsx("span", { className: `h-1.5 w-1.5 rounded-full ${oltOnline ? 'bg-ok' : 'bg-border'}` }), "OLT ", oltOnline ?? '—'] })] }), _jsxs("div", { className: "flex items-center gap-2 ml-auto", children: [_jsxs("div", { ref: notifRef, className: "relative", children: [_jsxs("button", { onClick: () => setNotifOpen((v) => !v), className: "relative text-muted hover:text-ink p-2 rounded-md hover:bg-surface-raised transition-colors", children: [_jsx(Bell, { size: 17 }), alertCount > 0 && (_jsx("span", { className: "absolute -top-0.5 -right-0.5 h-4 min-w-[16px] px-0.5 rounded-full bg-critical text-white text-[9px] font-medium flex items-center justify-center", children: alertCount }))] }), notifOpen && (_jsxs("div", { className: "absolute right-0 top-full mt-1.5 w-72 bg-surface border border-border rounded-md shadow-2xl overflow-hidden z-20", children: [_jsx("p", { className: "px-3 py-2 text-xs font-medium text-muted border-b border-border", children: "Alertas" }), alertCount === 0 ? (_jsx("p", { className: "px-3 py-4 text-xs text-muted", children: "Sin alertas pendientes." })) : (_jsxs("div", { className: "divide-y divide-border", children: [badgeFor(summary, 'invoicesOverdue') > 0 && (_jsxs("button", { onClick: () => onNavigate('/facturacion'), className: "w-full text-left px-3 py-2.5 hover:bg-surface-raised text-sm", children: [badgeFor(summary, 'invoicesOverdue'), " factura(s) vencida(s)"] })), badgeFor(summary, 'openTickets') > 0 && (_jsxs("button", { onClick: () => onNavigate('/tickets'), className: "w-full text-left px-3 py-2.5 hover:bg-surface-raised text-sm", children: [badgeFor(summary, 'openTickets'), " ticket(s) abierto(s)"] }))] }))] }))] }), _jsxs("div", { ref: profileRef, className: "relative", children: [_jsx("button", { onClick: () => setProfileOpen((v) => !v), className: "flex items-center gap-2 pl-1 pr-2 py-1 rounded-md hover:bg-surface-raised transition-colors", children: _jsx("span", { className: "h-7 w-7 rounded-full bg-signal/20 text-signal flex items-center justify-center text-xs font-medium shrink-0", children: (user?.firstName?.[0] ?? '') + (user?.lastName?.[0] ?? '') }) }), profileOpen && (_jsxs("div", { className: "absolute right-0 top-full mt-1.5 w-52 bg-surface border border-border rounded-md shadow-2xl overflow-hidden z-20", children: [_jsxs("div", { className: "px-3 py-2.5 border-b border-border", children: [_jsxs("p", { className: "text-sm truncate", children: [user?.firstName, " ", user?.lastName] }), _jsx("p", { className: "text-xs text-muted truncate", children: user?.email })] }), _jsx("button", { onClick: () => {
                                            onNavigate('/settings');
                                            setProfileOpen(false);
                                        }, className: "w-full text-left px-3 py-2 text-sm hover:bg-surface-raised", children: "Configuraci\u00F3n" }), _jsx("button", { onClick: onLogout, className: "w-full text-left px-3 py-2 text-sm text-critical hover:bg-surface-raised", children: "Cerrar sesi\u00F3n" })] }))] })] })] }));
}
function badgeFor(summary, key) {
    return summary?.[key]?.value || 0;
}
