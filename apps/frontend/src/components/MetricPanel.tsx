interface MetricPanelProps {
  label: string;
  value: number | null;
  severity?: 'ok' | 'warn' | 'critical' | 'neutral';
  pendingPhase?: string;
}

const REASON_LABELS: Record<string, string> = {
  not_tracked_daily: 'No se registra por día todavía',
  requires_vendor_driver: 'Requiere driver de fabricante verificado',
};

function reasonLabel(source?: string): string {
  if (!source) return 'Aún no disponible';
  if (source.startsWith('pending_phase_')) return `Disponible en ${source.replace('pending_', '').replace('_', ' ')}`;
  return REASON_LABELS[source] ?? 'Aún no disponible';
}

export function MetricPanel({ label, value, severity = 'neutral', pendingPhase }: MetricPanelProps) {
  const isPending = value === null;
  return (
    <div className={`status-panel status-panel--${isPending ? 'neutral' : severity}`}>
      <p className="text-xs text-muted mb-2">{label}</p>
      {isPending ? (
        <p className="text-sm text-muted/80">{reasonLabel(pendingPhase)}</p>
      ) : (
        <p className="text-3xl font-display font-bold">{value.toLocaleString('es-DO')}</p>
      )}
    </div>
  );
}
