import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { Router, Radio, CheckCircle2, Check } from 'lucide-react';
import { api } from '../lib/api';
import { useAuthStore } from '../store/auth.store';
import { useToast } from '../components/Toast';

interface Alert {
  id: string;
  title: string;
  description?: string;
  severity: 'CRITICAL' | 'WARNING' | string;
  status: 'OPEN' | 'ACKNOWLEDGED' | 'RESOLVED' | string;
  createdAt: string;
}

interface NetworkEvent {
  id: string;
  source: string;
  sourceId?: string | null;
  eventType: string;
  fromState?: string | null;
  toState?: string | null;
  createdAt: string;
}

export function MonitoringPage() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [events, setEvents] = useState<NetworkEvent[] | null>(null);
  const [filter, setFilter] = useState<'OPEN' | 'ALL'>('OPEN');
  const [summary, setSummary] = useState<Record<string, { value: number | null }> | null>(null);
  const accessToken = useAuthStore((s) => s.accessToken);
  const toast = useToast();

  async function loadAlerts() {
    const { data } = await api.get('/monitoring/alerts', { params: { status: filter === 'OPEN' ? 'OPEN' : undefined } });
    setAlerts(data);
  }

  useEffect(() => {
    loadAlerts();
  }, [filter]);

  useEffect(() => {
    api.get('/monitoring/events').then((res) => setEvents(res.data));
    api.get('/dashboard/summary').then((res) => setSummary(res.data));

    const baseUrl = (import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api/v1').replace('/api/v1', '');
    const socket: Socket = io(`${baseUrl}/noc`, { auth: { token: accessToken } });
    socket.on('alert.created', (alert: Alert) => setAlerts((prev) => [alert, ...prev]));
    return () => {
      socket.disconnect();
    };
  }, [accessToken]);

  async function acknowledge(id: string) {
    await api.post(`/monitoring/alerts/${id}/acknowledge`);
    toast.info('Alerta reconocida.');
    await loadAlerts();
  }

  async function resolve(id: string) {
    await api.post(`/monitoring/alerts/${id}/resolve`);
    toast.success('Alerta resuelta.');
    await loadAlerts();
  }

  const mikrotikOnline = summary?.mikrotikOnline?.value ?? null;
  const oltOnline = summary?.oltOnline?.value ?? null;
  const criticalCount = alerts.filter((a) => a.severity === 'CRITICAL' && a.status === 'OPEN').length;

  return (
    <div className="p-8 max-w-5xl page-enter">
      <h1 className="text-2xl font-display font-bold mb-1">NOC — Monitoreo de red</h1>
      <p className="text-muted text-sm mb-6">Alertas generadas cuando un router u OLT cambia a offline. Se actualizan en vivo por WebSocket.</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8 max-w-xl">
        <HealthCard icon={Router} label="MikroTik online" value={mikrotikOnline} />
        <HealthCard icon={Radio} label="OLT online" value={oltOnline} />
        <div className={`status-panel ${criticalCount > 0 ? 'status-panel--critical' : 'status-panel--ok'}`}>
          <CheckCircle2 size={15} className="text-muted mb-2" />
          <p className="text-lg font-display font-bold">{criticalCount}</p>
          <p className="text-[11px] text-muted mt-0.5">Alertas críticas activas</p>
        </div>
      </div>

      <div className="flex gap-2 mb-4">
        {(['OPEN', 'ALL'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`text-xs px-3 py-1.5 rounded-md border ${filter === f ? 'bg-signal text-base border-signal' : 'border-border text-muted hover:text-ink'}`}
          >
            {f === 'OPEN' ? 'Activas' : 'Todas'}
          </button>
        ))}
      </div>

      <div className="space-y-2 mb-8">
        {alerts.length === 0 ? (
          <div className="status-panel status-panel--ok text-sm text-muted">Sin alertas — la red está estable.</div>
        ) : (
          alerts.map((a) => (
            <div key={a.id} className={`status-panel ${a.severity === 'CRITICAL' ? 'status-panel--critical' : 'status-panel--warn'}`}>
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium truncate">{a.title}</p>
                  {a.description && <p className="text-xs text-muted mt-0.5">{a.description}</p>}
                  <p className="text-[10px] text-muted mt-1">{new Date(a.createdAt).toLocaleString('es-DO')}</p>
                </div>
                {a.status === 'OPEN' && (
                  <div className="flex items-center gap-2 shrink-0">
                    <button onClick={() => acknowledge(a.id)} className="text-xs text-muted hover:text-ink border border-border rounded px-2 py-1">
                      Reconocer
                    </button>
                    <button
                      onClick={() => resolve(a.id)}
                      className="flex items-center gap-1 text-xs text-ok hover:underline"
                    >
                      <Check size={12} /> Resolver
                    </button>
                  </div>
                )}
                {a.status !== 'OPEN' && <span className="text-[10px] text-muted shrink-0">{a.status}</span>}
              </div>
            </div>
          ))
        )}
      </div>

      <div>
        <p className="text-xs font-medium text-muted mb-2 uppercase tracking-wide">Eventos de red</p>
        {events === null ? (
          <p className="text-sm text-muted">Cargando…</p>
        ) : events.length === 0 ? (
          <p className="text-sm text-muted">Sin eventos registrados aún.</p>
        ) : (
          <div className="border border-border rounded-md divide-y divide-border max-h-80 overflow-y-auto">
            {events.map((e) => (
              <div key={e.id} className="px-3 py-2 text-xs flex justify-between gap-3">
                <span className="text-ink">
                  {e.source}
                  {e.sourceId ? ` (${e.sourceId.slice(0, 8)})` : ''} — {e.eventType}
                  {e.fromState && e.toState ? `: ${e.fromState} → ${e.toState}` : ''}
                </span>
                <span className="text-muted shrink-0">{new Date(e.createdAt).toLocaleString('es-DO')}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function HealthCard({ icon: Icon, label, value }: { icon: typeof Router; label: string; value: number | null }) {
  return (
    <div className="status-panel status-panel--neutral">
      <Icon size={15} className="text-signal mb-2" />
      <p className="text-lg font-display font-bold">{value ?? '—'}</p>
      <p className="text-[11px] text-muted mt-0.5">{label}</p>
    </div>
  );
}
