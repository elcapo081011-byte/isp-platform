import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { api } from '../lib/api';

// Iconos por tipo de punto — divIcon con CSS, sin depender de assets de imagen
// (los íconos por defecto de Leaflet rompen con bundlers modernos).
function dotIcon(color: string) {
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
  const [naps, setNaps] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);

  useEffect(() => {
    api.get('/nap').then((res) => setNaps(res.data));
    api.get('/customers', { params: { pageSize: 100 } }).then((res) =>
      setCustomers(res.data.items.filter((c: any) => c.latitude && c.longitude)),
    );
  }, []);

  // Santo Domingo como centro por defecto si no hay datos geolocalizados aún.
  const center: [number, number] = naps[0] ? [naps[0].latitude, naps[0].longitude] : [18.4861, -69.9312];

  return (
    <div className="h-screen flex flex-col">
      <div className="p-4 border-b border-border flex items-center justify-between">
        <div>
          <h1 className="text-xl font-display font-bold">Mapa de red</h1>
          <p className="text-muted text-xs">NAP en teal, clientes con GPS en verde. OLT se agregan cuando tengan coordenadas.</p>
        </div>
      </div>
      <div className="flex-1">
        <MapContainer center={center} zoom={13} style={{ height: '100%', width: '100%' }}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {naps.map((n) => (
            <Marker key={n.id} position={[n.latitude, n.longitude]} icon={napIcon}>
              <Popup>
                <b>{n.name}</b><br />
                Splitter: {n.splitterRatio ?? 'no especificado'}<br />
                Puertos: {n.totalPorts}
              </Popup>
            </Marker>
          ))}
          {customers.map((c) => (
            <Marker key={c.id} position={[c.latitude, c.longitude]} icon={customerIcon}>
              <Popup>
                <b>{c.firstName} {c.lastName}</b><br />
                {c.address ?? 'sin dirección'}
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
    </div>
  );
}
