import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { api } from '../lib/api';
// Iconos por tipo de punto — divIcon con CSS, sin depender de assets de imagen
// (los íconos por defecto de Leaflet rompen con bundlers modernos).
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
    const [customers, setCustomers] = useState([]);
    useEffect(() => {
        api.get('/nap').then((res) => setNaps(res.data));
        api.get('/customers', { params: { pageSize: 100 } }).then((res) => setCustomers(res.data.items.filter((c) => c.latitude && c.longitude)));
    }, []);
    // Santo Domingo como centro por defecto si no hay datos geolocalizados aún.
    const center = naps[0] ? [naps[0].latitude, naps[0].longitude] : [18.4861, -69.9312];
    return (_jsxs("div", { className: "h-screen flex flex-col", children: [_jsx("div", { className: "p-4 border-b border-border flex items-center justify-between", children: _jsxs("div", { children: [_jsx("h1", { className: "text-xl font-display font-bold", children: "Mapa de red" }), _jsx("p", { className: "text-muted text-xs", children: "NAP en teal, clientes con GPS en verde. OLT se agregan cuando tengan coordenadas." })] }) }), _jsx("div", { className: "flex-1", children: _jsxs(MapContainer, { center: center, zoom: 13, style: { height: '100%', width: '100%' }, children: [_jsx(TileLayer, { attribution: '\u00A9 <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors', url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" }), naps.map((n) => (_jsx(Marker, { position: [n.latitude, n.longitude], icon: napIcon, children: _jsxs(Popup, { children: [_jsx("b", { children: n.name }), _jsx("br", {}), "Splitter: ", n.splitterRatio ?? 'no especificado', _jsx("br", {}), "Puertos: ", n.totalPorts] }) }, n.id))), customers.map((c) => (_jsx(Marker, { position: [c.latitude, c.longitude], icon: customerIcon, children: _jsxs(Popup, { children: [_jsxs("b", { children: [c.firstName, " ", c.lastName] }), _jsx("br", {}), c.address ?? 'sin dirección'] }) }, c.id)))] }) })] }));
}
