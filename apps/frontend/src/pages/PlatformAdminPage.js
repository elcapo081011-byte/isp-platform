import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { api } from '../lib/api';
export function PlatformAdminPage() {
    const [orgs, setOrgs] = useState([]);
    const [summary, setSummary] = useState(null);
    async function load() {
        const [orgsRes, summaryRes] = await Promise.all([
            api.get('/platform/organizations'),
            api.get('/platform/summary'),
        ]);
        setOrgs(orgsRes.data);
        setSummary(summaryRes.data);
    }
    useEffect(() => { load(); }, []);
    async function toggle(id, isActive) {
        await api.post(`/platform/organizations/${id}/${isActive ? 'suspend' : 'activate'}`);
        await load();
    }
    return (_jsxs("div", { className: "p-8 max-w-5xl", children: [_jsx("h1", { className: "text-2xl font-display font-bold mb-1", children: "Plataforma \u2014 todas las cuentas" }), _jsx("p", { className: "text-muted text-sm mb-6", children: "Solo t\u00FA ves esta p\u00E1gina. Cada fila es un ISP con su propia cuenta aislada." }), summary && (_jsxs("div", { className: "grid grid-cols-1 sm:grid-cols-2 sm:grid-cols-4 gap-4 mb-6", children: [_jsxs("div", { className: "status-panel status-panel--neutral", children: [_jsx("p", { className: "text-xs text-muted mb-1", children: "Organizaciones" }), _jsx("p", { className: "text-2xl font-display font-bold", children: summary.totalOrganizations })] }), _jsxs("div", { className: "status-panel status-panel--ok", children: [_jsx("p", { className: "text-xs text-muted mb-1", children: "Activas" }), _jsx("p", { className: "text-2xl font-display font-bold", children: summary.activeOrganizations })] }), _jsxs("div", { className: "status-panel status-panel--neutral", children: [_jsx("p", { className: "text-xs text-muted mb-1", children: "Clientes (todas)" }), _jsx("p", { className: "text-2xl font-display font-bold", children: summary.totalCustomersAcrossAllOrgs })] }), _jsxs("div", { className: "status-panel status-panel--neutral", children: [_jsx("p", { className: "text-xs text-muted mb-1", children: "Usuarios (todas)" }), _jsx("p", { className: "text-2xl font-display font-bold", children: summary.totalUsersAcrossAllOrgs })] })] })), _jsx("div", { className: "border border-border rounded-md overflow-hidden", children: _jsxs("table", { className: "w-full text-sm", children: [_jsx("thead", { className: "bg-surface text-muted text-xs", children: _jsxs("tr", { children: [_jsx("th", { className: "text-left px-4 py-3", children: "Organizaci\u00F3n" }), _jsx("th", { className: "text-left px-4 py-3", children: "Plan" }), _jsx("th", { className: "text-left px-4 py-3", children: "Clientes" }), _jsx("th", { className: "text-left px-4 py-3", children: "Usuarios" }), _jsx("th", { className: "text-left px-4 py-3", children: "Routers/OLT" }), _jsx("th", { className: "text-left px-4 py-3", children: "Estado" }), _jsx("th", { className: "text-left px-4 py-3" })] }) }), _jsx("tbody", { children: orgs.map((o) => (_jsxs("tr", { className: "border-t border-border", children: [_jsxs("td", { className: "px-4 py-3", children: [_jsx("p", { className: "font-medium", children: o.name }), _jsx("p", { className: "text-xs text-muted", children: o.slug })] }), _jsx("td", { className: "px-4 py-3 text-muted", children: o.plan }), _jsx("td", { className: "px-4 py-3", children: o.customersCount }), _jsx("td", { className: "px-4 py-3", children: o.usersCount }), _jsxs("td", { className: "px-4 py-3 text-muted", children: [o.routersCount, " / ", o.oltsCount] }), _jsx("td", { className: "px-4 py-3", children: _jsx("span", { className: o.isActive ? 'text-ok' : 'text-critical', children: o.isActive ? 'Activa' : 'Suspendida' }) }), _jsx("td", { className: "px-4 py-3", children: _jsx("button", { onClick: () => toggle(o.id, o.isActive), className: "text-xs text-signal hover:underline", children: o.isActive ? 'Suspender' : 'Reactivar' }) })] }, o.id))) })] }) })] }));
}
