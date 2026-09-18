import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Users, UserCheck, UserX, Router, Radio, AlertTriangle, ArrowRight } from 'lucide-react';
import { api } from '../lib/api';
import { SkeletonCard } from '../components/Skeleton';

interface Metric {
  value: number | null;
  source: string;
}
type Summary = Record<string, Metric>;

interface Alert {
  id: string;
  title: string;
  description?: string;
  severity: 'CRITICAL' | 'WARNING' | string;
  createdAt: string;
}

function fmtMoney(v: number | null) {
  if (v == null) return '—';
  return `$${v.toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function DashboardPage() {
  const [data, setData] = useState<Summary | null>(null);
  const [alerts, setAlerts] = useState<Alert[] | null>(null);

  useEffect(() => {
    api.get('/dashboard/summary').then((res) => setData(res.data));
    api
      .get('/monitoring/alerts')
      .then((res) => setAlerts(res.data.slice(0, 5)))
      .catch(() => setAlerts([]));
  }, []);

  const v = (key: string) => data?.[key]?.value ?? null;
  const isLive = (key: string) => data?.[key]?.source === 'live';

  return (
    <div className="p-8 max-w-7xl space-y-8 page-enter">
      <div>
        <h1 className="text-2xl font-display font-bold mb-1">Vista general de la red</h1>
        <p className="text-muted text-sm">Lo más importante de tu operación, de un vistazo.</p>
      </div>

      {!data ? (
        <section>
          <SectionLabel>Clientes</SectionLabel>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        </section>
      ) : (
        <>
          <section>
            <SectionLabel>Clientes</SectionLabel>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-1 sm:grid-cols-2 sm:grid-cols-4 gap-4">
              <StatCard icon={Users} label="Clientes totales" value={v('customersTotal')} accent="neutral" href="/clientes" />
              <StatCard icon={UserCheck} label="Activos" value={v('customersActive')} accent="ok" href="/clientes?status=ACTIVE" />
              <StatCard icon={UserX} label="Suspendidos" value={v('customersSuspended')} accent="critical" href="/clientes?status=SUSPENDED" />
              <StatCard
                icon={AlertTriangle}
                label="Facturas vencidas"
                value={v('invoicesOverdue')}
                accent={v('invoicesOverdue') ? 'warn' : 'neutral'}
                href="/facturacion"
              />
            </div>
          </section>

          <section>
            <SectionLabel>Estado de red</SectionLabel>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <NetworkStatusCard
                icon={Router}
                label="MikroTik"
                online={v('mikrotikOnline')}
                live={isLive('mikrotikOnline')}
                href="/mikrotik"
              />
              <NetworkStatusCard icon={Radio} label="OLT" online={v('oltOnline')} live={isLive('oltOnline')} href="/olt" />
            </div>
          </section>

          <section>
            <SectionLabel>Ingresos del mes</SectionLabel>
            <div className="status-panel status-panel--ok max-w-sm">
              <p className="text-3xl font-display font-bold">{fmtMoney(v('revenueMonth'))}</p>
              <p className="text-xs text-muted mt-1">Cobrado en lo que va del mes actual.</p>
            </div>
          </section>

          <section>
            <div className="flex items-center justify-between mb-3">
              <SectionLabel noMargin>Alertas recientes</SectionLabel>
              <Link to="/monitoreo" className="text-xs text-signal hover:underline flex items-center gap-1">
                Ver NOC <ArrowRight size={12} />
              </Link>
            </div>
            {alerts === null ? (
              <p className="text-muted text-sm">Cargando…</p>
            ) : alerts.length === 0 ? (
              <div className="status-panel status-panel--ok text-sm text-muted">Sin alertas activas — la red está estable.</div>
            ) : (
              <div className="space-y-2">
                {alerts.map((a) => (
                  <div
                    key={a.id}
                    className={`status-panel ${a.severity === 'CRITICAL' ? 'status-panel--critical' : 'status-panel--warn'} py-3`}
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium">{a.title}</p>
                      <span className="text-xs text-muted shrink-0 ml-3">{new Date(a.createdAt).toLocaleString('es-DO')}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}

function SectionLabel({ children, noMargin }: { children: React.ReactNode; noMargin?: boolean }) {
  return <p className={`text-xs font-medium text-muted uppercase tracking-wider ${noMargin ? '' : 'mb-3'}`}>{children}</p>;
}

function StatCard({
  icon: Icon,
  label,
  value,
  accent,
  href,
}: {
  icon: typeof Users;
  label: string;
  value: number | null;
  accent: 'ok' | 'warn' | 'critical' | 'neutral';
  href: string;
}) {
  return (
    <Link to={href} className={`status-panel status-panel--${accent} block hover:brightness-110 transition-[filter]`}>
      <div className="flex items-center justify-between mb-2">
        <Icon size={16} className="text-muted" />
      </div>
      <p className="text-2xl font-display font-bold">{value ?? '—'}</p>
      <p className="text-xs text-muted mt-0.5">{label}</p>
    </Link>
  );
}

function NetworkStatusCard({
  icon: Icon,
  label,
  online,
  live,
  href,
}: {
  icon: typeof Router;
  label: string;
  online: number | null;
  live: boolean;
  href: string;
}) {
  return (
    <Link to={href} className="status-panel status-panel--neutral block hover:brightness-110 transition-[filter]">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <Icon size={18} className="text-signal" />
          <div>
            <p className="font-medium">{label}</p>
            <p className="text-xs text-muted">{live ? 'Estado en vivo' : 'Sin datos aún'}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xl font-display font-bold text-ok">{online ?? '—'}</p>
          <p className="text-[10px] text-muted">online</p>
        </div>
      </div>
    </Link>
  );
}
