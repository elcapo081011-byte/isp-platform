import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { X } from 'lucide-react';
import { api } from '../lib/api';

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

type Selected =
  | { kind: 'nap'; data: any }
  | { kind: 'olt'; data: any }
  | { kind: 'customer'; data: any }
  | null;

export function NapMapPage() {
  const [naps, setNaps] = useState<any[]>([]);
  const [olts, setOlts] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [selected, setSelected] = useState<Selected>(null);

  useEffect(() => {
    api.get('/nap').then((res) => setNaps(res.data));
    api.get('/olt').then((res) => setOlts(res.data.filter((o: any) => o.latitude && o.longitude)));
    api
      .get('/customers', { params: { pageSize: 100 } })
      .then((res) => setCustomers(res.data.items.filter((c: any) => c.latitude && c.longitude)));
  }, []);

  const center: [number, number] = naps[0]
    ? [naps[0].latitude, naps[0].longitude]
    : olts[0]
    ? [olts[0].latitude, olts[0].longitude]
    : [18.4861, -69.9312];

  return (
    <div className="h-screen flex flex-col">
      <div className="p-4 border-b border-border flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-xl font-display font-bold">Mapa de red</h1>
          <p className="text-muted text-xs">Selecciona un punto para ver su detalle.</p>
        </div>
        <div className="flex items-center gap-4 text-xs text-muted">
          <Legend color="#1FB6A6" label="NAP" />
          <Legend color="#E1554F" label="OLT" />
          <Legend color="#39B76B" label="Cliente" />
        </div>
      </div>

      <div className="flex-1 relative">
        <MapContainer center={center} zoom={13} style={{ height: '100%', width: '100%' }}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {naps.map((n) => (
            <Marker key={n.id} position={[n.latitude, n.longitude]} icon={napIcon} eventHandlers={{ click: () => setSelected({ kind: 'nap', data: n }) }} />
          ))}
          {olts.map((o) => (
            <Marker key={o.id} position={[o.latitude, o.longitude]} icon={oltIcon} eventHandlers={{ click: () => setSelected({ kind: 'olt', data: o }) }} />
          ))}
          {customers.map((c) => (
            <Marker
              key={c.id}
              position={[c.latitude, c.longitude]}
              icon={customerIcon}
              eventHandlers={{ click: () => setSelected({ kind: 'customer', data: c }) }}
            />
          ))}
        </MapContainer>

        {selected && (
          <div className="absolute top-4 right-4 w-72 bg-surface border border-border rounded-lg shadow-2xl p-4 z-[1000]">
            <div className="flex items-start justify-between mb-3">
              <p className="text-[10px] uppercase tracking-wide text-muted">
                {selected.kind === 'nap' ? 'NAP' : selected.kind === 'olt' ? 'OLT' : 'Cliente'}
              </p>
              <button onClick={() => setSelected(null)} className="text-muted hover:text-ink" aria-label="Cerrar">
                <X size={14} />
              </button>
            </div>

            {selected.kind === 'nap' && (
              <div className="space-y-1 text-sm">
                <p className="font-medium">{selected.data.name}</p>
                <p className="text-xs text-muted">Splitter: {selected.data.splitterRatio ?? 'no especificado'}</p>
                <p className="text-xs text-muted">Puertos: {selected.data.totalPorts}</p>
              </div>
            )}
            {selected.kind === 'olt' && (
              <div className="space-y-1 text-sm">
                <p className="font-medium">{selected.data.name}</p>
                <p className="text-xs text-muted">{selected.data.vendor} · {selected.data.model ?? 'sin modelo'}</p>
                <p className="text-xs text-muted">{selected.data.host}</p>
                <p className="text-xs text-muted">Estado: {selected.data.status}</p>
              </div>
            )}
            {selected.kind === 'customer' && (
              <div className="space-y-1 text-sm">
                <p className="font-medium">
                  {selected.data.firstName} {selected.data.lastName}
                </p>
                <p className="text-xs text-muted">{selected.data.address ?? 'sin dirección'}</p>
                <p className="text-xs text-muted">Estado: {selected.data.status}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: color }} />
      {label}
    </span>
  );
}
