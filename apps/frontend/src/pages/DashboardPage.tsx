import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { MetricPanel } from '../components/MetricPanel';

interface Metric {
  value: number | null;
  source: string;
}

interface DashboardSummary {
  [key: string]: Metric;
}

const LABELS: Record<string, string> = {
  systemUsers: 'Usuarios del sistema',
  auditEventsTotal: 'Eventos de auditoría',
  customersTotal: 'Clientes totales',
  customersActive: 'Clientes activos',
  customersSuspended: 'Clientes suspendidos',
  revenueToday: 'Ingresos de hoy',
  revenueMonth: 'Ingresos del mes',
  invoicesPending: 'Facturas pendientes',
  invoicesOverdue: 'Facturas vencidas',
  mikrotikOnline: 'MikroTik online',
  oltOnline: 'OLT online',
  onuOnline: 'ONU/ONT online',
  openTickets: 'Tickets abiertos',
};

export function DashboardPage() {
  const [data, setData] = useState<DashboardSummary | null>(null);

  useEffect(() => {
    api.get('/dashboard/summary').then((res) => setData(res.data));
  }, []);

  return (
    <div className="p-8 max-w-7xl">
      <h1 className="text-2xl font-display font-bold mb-1">Vista general de la red</h1>
      <p className="text-muted text-sm mb-8">
        Fase 1: autenticación, roles y auditoría en vivo. Los módulos de clientes, facturación y red
        se activan en las fases siguientes — cada panel indica cuándo estará disponible.
      </p>

      {!data ? (
        <p className="text-muted text-sm">Cargando...</p>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
          {Object.entries(data).map(([key, metric]) => (
            <MetricPanel
              key={key}
              label={LABELS[key] ?? key}
              value={metric.value}
              severity={metric.source === 'live' ? 'ok' : 'neutral'}
              pendingPhase={metric.source !== 'live' ? metric.source : undefined}
            />
          ))}
        </div>
      )}
    </div>
  );
}
