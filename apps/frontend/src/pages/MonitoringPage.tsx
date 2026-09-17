import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { api } from '../lib/api';
import { useAuthStore } from '../store/auth.store';

export function MonitoringPage() {
  const [alerts, setAlerts] = useState<any[]>([]);
  const accessToken = useAuthStore((s) => s.accessToken);

  useEffect(() => {
    api.get('/monitoring/alerts').then((res) => setAlerts(res.data));

    const baseUrl = (import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api/v1').replace('/api/v1', '');
    const socket = io(`${baseUrl}/noc`, { auth: { token: accessToken } });
    socket.on('alert.created', (alert) => setAlerts((prev) => [alert, ...prev]));
    return () => { socket.disconnect(); };
  }, [accessToken]);

  return (
    <div className="p-8 max-w-4xl">
      <h1 className="text-2xl font-display font-bold mb-1">Monitoreo / NOC</h1>
      <p className="text-muted text-sm mb-6">
        Alertas generadas cuando un router u OLT cambia a offline. Se actualizan en vivo por WebSocket.
      </p>

      <div className="space-y-2">
        {alerts.map((a) => (
          <div key={a.id} className={`status-panel ${a.severity === 'CRITICAL' ? 'status-panel--critical' : 'status-panel--warn'}`}>
            <div className="flex items-center justify-between">
              <p className="font-medium">{a.title}</p>
              <span className="text-xs text-muted">{new Date(a.createdAt).toLocaleString('es-DO')}</span>
            </div>
            {a.description && <p className="text-xs text-muted mt-1">{a.description}</p>}
          </div>
        ))}
        {alerts.length === 0 && <p className="text-muted text-sm">Sin alertas activas.</p>}
      </div>
    </div>
  );
}
