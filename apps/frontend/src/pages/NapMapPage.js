import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { X } from 'lucide-react';
import { api } from '../lib/api';
function dotIcon(color) {
    return L.divIcon({
        className: '',
        html: `<div style="width:14px;height:14px;border-radius:50%;background:${color};border:2px solid white;box-shadow:0 0 0 1px rgba(0,0,0,.3)"></div>`,
        iconSize: [14, 14],
    });
}
const napIcon = dotIcon('#1FB6A6');
const oltIcon = dotIcon('#E1554F');
const customerIcon = dotIcon('#39B76B');
export function NapMapPage() {
    const [naps, setNaps] = useState([]);
    const [olts, setOlts] = useState([]);
    const [customers, setCustomers] = useState([]);
    const [selected, setSelected] = useState(null);
    useEffect(() => {
        api.get('/nap').then((res) => setNaps(res.data));
        api.get('/olt').then((res) => setOlts(res.data.filter((o) => o.latitude && o.longitude)));
        api
            .get('/customers', { params: { pageSize: 100 } })
            .then((res) => setCustomers(res.data.items.filter((c) => c.latitude && c.longitude)));
    }, []);
    const center = naps[0]
        ? [naps[0].latitude, naps[0].longitude]
        : olts[0]
            ? [olts[0].latitude, olts[0].longitude]
            : [18.4861, -69.9312];
    return (_jsxs("div", { className: "h-screen flex flex-col", children: [_jsxs("div", { className: "p-4 border-b border-border flex items-center justify-between shrink-0", children: [_jsxs("div", { children: [_jsx("h1", { className: "text-xl font-display font-bold", children: "Mapa de red" }), _jsx("p", { className: "text-muted text-xs", children: "Selecciona un punto para ver su detalle." })] }), _jsxs("div", { className: "flex items-center gap-4 text-xs text-muted", children: [_jsx(Legend, { color: "#1FB6A6", label: "NAP" }), _jsx(Legend, { color: "#E1554F", label: "OLT" }), _jsx(Legend, { color: "#39B76B", label: "Cliente" })] })] }), _jsxs("div", { className: "flex-1 relative", children: [_jsxs(MapContainer, { center: center, zoom: 13, style: { height: '100%', width: '100%' }, children: [_jsx(TileLayer, { attribution: '\u00A9 <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors', url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" }), naps.map((n) => (_jsx(Marker, { position: [n.latitude, n.longitude], icon: napIcon, eventHandlers: { click: () => setSelected({ kind: 'nap', data: n }) } }, n.id))), olts.map((o) => (_jsx(Marker, { position: [o.latitude, o.longitude], icon: oltIcon, eventHandlers: { click: () => setSelected({ kind: 'olt', data: o }) } }, o.id))), customers.map((c) => (_jsx(Marker, { position: [c.latitude, c.longitude], icon: customerIcon, eventHandlers: { click: () => setSelected({ kind: 'customer', data: c }) } }, c.id)))] }), selected && (_jsxs("div", { className: "absolute top-4 right-4 w-72 bg-surface border border-border rounded-lg shadow-2xl p-4 z-[1000]", children: [_jsxs("div", { className: "flex items-start justify-between mb-3", children: [_jsx("p", { className: "text-[10px] uppercase tracking-wide text-muted", children: selected.kind === 'nap' ? 'NAP' : selected.kind === 'olt' ? 'OLT' : 'Cliente' }), _jsx("button", { onClick: () => setSelected(null), className: "text-muted hover:text-ink", "aria-label": "Cerrar", children: _jsx(X, { size: 14 }) })] }), selected.kind === 'nap' && (_jsxs("div", { className: "space-y-1 text-sm", children: [_jsx("p", { className: "font-medium", children: selected.data.name }), _jsxs("p", { className: "text-xs text-muted", children: ["Splitter: ", selected.data.splitterRatio ?? 'no especificado'] }), _jsxs("p", { className: "text-xs text-muted", children: ["Puertos: ", selected.data.totalPorts] })] })), selected.kind === 'olt' && (_jsxs("div", { className: "space-y-1 text-sm", children: [_jsx("p", { className: "font-medium", children: selected.data.name }), _jsxs("p", { className: "text-xs text-muted", children: [selected.data.vendor, " \u00B7 ", selected.data.model ?? 'sin modelo'] }), _jsx("p", { className: "text-xs text-muted", children: selected.data.host }), _jsxs("p", { className: "text-xs text-muted", children: ["Estado: ", selected.data.status] })] })), selected.kind === 'customer' && (_jsxs("div", { className: "space-y-1 text-sm", children: [_jsxs("p", { className: "font-medium", children: [selected.data.firstName, " ", selected.data.lastName] }), _jsx("p", { className: "text-xs text-muted", children: selected.data.address ?? 'sin dirección' }), _jsxs("p", { className: "text-xs text-muted", children: ["Estado: ", selected.data.status] })] }))] }))] })] }));
}
function Legend({ color, label }) {
    return (_jsxs("span", { className: "flex items-center gap-1.5", children: [_jsx("span", { className: "h-2.5 w-2.5 rounded-full shrink-0", style: { background: color } }), label] }));
}
