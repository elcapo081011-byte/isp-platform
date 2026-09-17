const STYLES: Record<string, string> = {
  ACTIVE: 'text-ok bg-ok/10 border-ok/30',
  ONLINE: 'text-ok bg-ok/10 border-ok/30',
  PAID: 'text-ok bg-ok/10 border-ok/30',
  RESOLVED: 'text-ok bg-ok/10 border-ok/30',
  CLOSED: 'text-muted bg-white/5 border-border',
  SUSPENDED: 'text-warn bg-warn/10 border-warn/30',
  PARTIAL: 'text-warn bg-warn/10 border-warn/30',
  WARNING: 'text-warn bg-warn/10 border-warn/30',
  IN_PROGRESS: 'text-warn bg-warn/10 border-warn/30',
  WAITING_CUSTOMER: 'text-warn bg-warn/10 border-warn/30',
  DISCONNECTED: 'text-critical bg-critical/10 border-critical/30',
  CANCELLED: 'text-critical bg-critical/10 border-critical/30',
  OVERDUE: 'text-critical bg-critical/10 border-critical/30',
  OFFLINE: 'text-critical bg-critical/10 border-critical/30',
  PENDING_INSTALLATION: 'text-muted bg-white/5 border-border',
  PENDING: 'text-muted bg-white/5 border-border',
  OPEN: 'text-signal bg-signal/10 border-signal/30',
  UNKNOWN: 'text-muted bg-white/5 border-border',
};

const LABELS: Record<string, string> = {
  ACTIVE: 'Activo', ONLINE: 'En línea', PAID: 'Pagada', RESOLVED: 'Resuelto', CLOSED: 'Cerrado',
  SUSPENDED: 'Suspendido', PARTIAL: 'Pago parcial', WARNING: 'Advertencia',
  IN_PROGRESS: 'En proceso', WAITING_CUSTOMER: 'Esperando cliente',
  DISCONNECTED: 'Desconectado', CANCELLED: 'Cancelada', OVERDUE: 'Vencida', OFFLINE: 'Offline',
  PENDING_INSTALLATION: 'Por instalar', PENDING: 'Pendiente', OPEN: 'Abierto', UNKNOWN: 'Desconocido',
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-block text-xs px-2 py-0.5 rounded border whitespace-nowrap ${STYLES[status] ?? STYLES.UNKNOWN}`}>
      {LABELS[status] ?? status}
    </span>
  );
}
