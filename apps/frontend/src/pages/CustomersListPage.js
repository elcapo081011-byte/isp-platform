import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Plus } from 'lucide-react';
import { api } from '../lib/api';
import { StatusBadge } from '../components/StatusBadge';
export function CustomersListPage() {
    const navigate = useNavigate();
    const [items, setItems] = useState([]);
    const [search, setSearch] = useState('');
    const [status, setStatus] = useState('');
    const [loading, setLoading] = useState(true);
    useEffect(() => {
        const timeout = setTimeout(() => {
            setLoading(true);
            api
                .get('/customers', { params: { search: search || undefined, status: status || undefined } })
                .then((res) => setItems(res.data.items))
                .finally(() => setLoading(false));
        }, 300);
        return () => clearTimeout(timeout);
    }, [search, status]);
    return (_jsxs("div", { className: "p-8 max-w-7xl", children: [_jsxs("div", { className: "flex items-center justify-between mb-6", children: [_jsxs("div", { children: [_jsx("h1", { className: "text-2xl font-display font-bold mb-1", children: "Clientes" }), _jsx("p", { className: "text-muted text-sm", children: "Busca por nombre, documento, tel\u00E9fono o usuario PPPoE." })] }), _jsxs("button", { onClick: () => navigate('/clientes/nuevo'), className: "flex items-center gap-2 bg-signal text-base text-sm font-medium rounded-md px-4 py-2 hover:opacity-90 transition-opacity", children: [_jsx(Plus, { size: 16 }), " Nuevo cliente"] })] }), _jsxs("div", { className: "flex items-center gap-3 mb-4", children: [_jsxs("div", { className: "relative flex-1 max-w-sm", children: [_jsx(Search, { size: 16, className: "absolute left-3 top-1/2 -translate-y-1/2 text-muted" }), _jsx("input", { value: search, onChange: (e) => setSearch(e.target.value), placeholder: "Buscar cliente...", className: "w-full bg-surface border border-border rounded-md pl-9 pr-3 py-2 text-sm outline-none focus:border-signal" })] }), _jsxs("select", { value: status, onChange: (e) => setStatus(e.target.value), className: "bg-surface border border-border rounded-md px-3 py-2 text-sm outline-none focus:border-signal", children: [_jsx("option", { value: "", children: "Todos los estados" }), _jsx("option", { value: "ACTIVE", children: "Activo" }), _jsx("option", { value: "SUSPENDED", children: "Suspendido" }), _jsx("option", { value: "DISCONNECTED", children: "Desconectado" }), _jsx("option", { value: "PENDING_INSTALLATION", children: "Por instalar" })] })] }), _jsx("div", { className: "border border-border rounded-md overflow-hidden", children: _jsxs("table", { className: "w-full text-sm", children: [_jsx("thead", { className: "bg-surface text-muted text-xs", children: _jsxs("tr", { children: [_jsx("th", { className: "text-left px-4 py-3 font-medium", children: "Cliente" }), _jsx("th", { className: "text-left px-4 py-3 font-medium", children: "Plan" }), _jsx("th", { className: "text-left px-4 py-3 font-medium", children: "Usuario PPPoE" }), _jsx("th", { className: "text-left px-4 py-3 font-medium", children: "T\u00E9cnico" }), _jsx("th", { className: "text-left px-4 py-3 font-medium", children: "Estado" })] }) }), _jsx("tbody", { children: loading ? (_jsx("tr", { children: _jsx("td", { colSpan: 5, className: "px-4 py-6 text-center text-muted", children: "Cargando..." }) })) : items.length === 0 ? (_jsx("tr", { children: _jsx("td", { colSpan: 5, className: "px-4 py-6 text-center text-muted", children: "Sin resultados" }) })) : (items.map((c) => (_jsxs("tr", { onClick: () => navigate(`/clientes/${c.id}`), className: "border-t border-border hover:bg-surface-raised/50 cursor-pointer transition-colors", children: [_jsxs("td", { className: "px-4 py-3", children: [_jsxs("p", { className: "font-medium", children: [c.firstName, " ", c.lastName] }), _jsxs("p", { className: "text-xs text-muted", children: [c.documentId ?? '—', " \u00B7 ", c.phone ?? 'sin teléfono'] })] }), _jsx("td", { className: "px-4 py-3", children: c.services[0]?.plan?.name ?? '—' }), _jsx("td", { className: "px-4 py-3 text-muted", children: c.services[0]?.pppoeUsername ?? '—' }), _jsx("td", { className: "px-4 py-3 text-muted", children: c.technician ? `${c.technician.firstName} ${c.technician.lastName}` : '—' }), _jsx("td", { className: "px-4 py-3", children: _jsx(StatusBadge, { status: c.status }) })] }, c.id)))) })] }) })] }));
}
