import { useEffect, useState } from 'react';
import { Wifi, WifiOff, RefreshCw } from 'lucide-react';
import { api } from '../lib/api';

export function MikrotikPage() {
  const [routers, setRouters] = useState<any[]>([]);
  const [checking, setChecking] = useState<string | null>(null);

  async function load() {
    const { data } = await api.get('/mikrotik/routers');
    setRouters(data);
  }

  useEffect(() => { load(); }, []);

  async function check(id: string) {
    setChecking(id);
    try {
      await api.post(`/mikrotik/routers/${id}/check-connection`);
      await load();
    } finally {
      setChecking(null);
    }
  }

  return (
    <div className="p-8 max-w-5xl">
      <h1 className="text-2xl font-display font-bold mb-1">MikroTik</h1>
      <p className="text-muted text-sm mb-6">
        La conexión se verifica en vivo vía RouterOS API — no se muestra un estado simulado.
      </p>

      <div className="grid grid-cols-2 gap-4">
        {routers.map((r) => (
          <div key={r.id} className={`status-panel ${r.status === 'ONLINE' ? 'status-panel--ok' : r.status === 'OFFLINE' ? 'status-panel--critical' : 'status-panel--neutral'}`}>
            <div className="flex items-start justify-between">
              <div>
                <p className="font-medium">{r.name}</p>
                <p className="text-xs text-muted">{r.host} · {r.location ?? 'sin ubicación'}</p>
              </div>
              {r.status === 'ONLINE' ? <Wifi className="text-ok" size={18} /> : <WifiOff className="text-muted" size={18} />}
            </div>
            <button
              onClick={() => check(r.id)}
              disabled={checking === r.id}
              className="mt-3 flex items-center gap-1.5 text-xs text-signal hover:underline disabled:opacity-50"
            >
              <RefreshCw size={12} className={checking === r.id ? 'animate-spin' : ''} />
              Verificar conexión
            </button>
          </div>
        ))}
        {routers.length === 0 && <p className="text-muted text-sm">No hay routers registrados todavía.</p>}
      </div>
    </div>
  );
}
