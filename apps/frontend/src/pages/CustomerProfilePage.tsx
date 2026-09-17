import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { PauseCircle, PlayCircle } from 'lucide-react';
import { api } from '../lib/api';
import { StatusBadge } from '../components/StatusBadge';

const TABS = [
  'Información', 'Servicio', 'Facturas', 'Pagos', 'Conexión',
  'OLT/ONU', 'Tickets', 'Historial', 'Notas', 'Auditoría',
] as const;

type Tab = typeof TABS[number];

export function CustomerProfilePage() {
  const { id } = useParams();
  const [profile, setProfile] = useState<any>(null);
  const [tab, setTab] = useState<Tab>('Información');
  const [busy, setBusy] = useState(false);

  async function load() {
    const { data } = await api.get(`/customers/${id}`);
    setProfile(data);
  }

  useEffect(() => { load(); }, [id]);

  async function toggleSuspension() {
    setBusy(true);
    try {
      if (profile.information.status === 'SUSPENDED') {
        await api.post(`/customers/${id}/reactivate`);
      } else {
        await api.post(`/customers/${id}/suspend`, { reason: 'Suspensión manual desde el panel' });
      }
      await load();
    } finally {
      setBusy(false);
    }
  }

  if (!profile) return <div className="p-8 text-muted text-sm">Cargando...</div>;

  const info = profile.information;
  const isSuspended = info.status === 'SUSPENDED';

  return (
    <div className="p-8 max-w-5xl">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-display font-bold mb-1">{info.firstName} {info.lastName}</h1>
          <div className="flex items-center gap-2 text-sm text-muted">
            <StatusBadge status={info.status} />
            <span>{info.documentId ?? 'sin documento'}</span>
          </div>
        </div>
        <button
          onClick={toggleSuspension}
          disabled={busy}
          className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-opacity disabled:opacity-50 ${
            isSuspended ? 'bg-ok text-base' : 'bg-critical text-base'
          }`}
        >
          {isSuspended ? <PlayCircle size={16} /> : <PauseCircle size={16} />}
          {isSuspended ? 'Reactivar' : 'Suspender'}
        </button>
      </div>

      <div className="flex gap-1 border-b border-border mb-6 overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-3 py-2 text-sm whitespace-nowrap border-b-2 transition-colors ${
              tab === t ? 'border-signal text-ink' : 'border-transparent text-muted hover:text-ink'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'Información' && (
        <div className="grid grid-cols-2 gap-4 text-sm">
          <Field label="Teléfono" value={info.phone} />
          <Field label="WhatsApp" value={info.whatsapp} />
          <Field label="Email" value={info.email} />
          <Field label="Dirección" value={info.address} />
          <Field label="Referencia" value={info.reference} />
          <Field label="Técnico asignado" value={info.technician ? `${info.technician.firstName} ${info.technician.lastName}` : null} />
          <Field label="Día de corte" value={info.billingDay} />
          <Field label="Método de pago" value={info.paymentMethod} />
        </div>
      )}

      {tab === 'Servicio' && (
        <div className="space-y-3">
          {profile.service.length === 0 ? (
            <p className="text-muted text-sm">Este cliente no tiene un servicio activo todavía.</p>
          ) : profile.service.map((s: any) => (
            <div key={s.id} className="status-panel status-panel--ok">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-medium">{s.plan.name}</p>
                  <p className="text-xs text-muted">{s.plan.downloadMbps}/{s.plan.uploadMbps} Mbps · ${s.plan.price}/{s.plan.currency}</p>
                </div>
                <StatusBadge status={s.status} />
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'Facturas' && <PendingPhase note="El módulo de facturación se activa en la Fase 3." />}
      {tab === 'Pagos' && <PendingPhase note="El registro de pagos se activa en la Fase 3." />}

      {tab === 'Conexión' && (
        <div className="grid grid-cols-2 gap-4 text-sm">
          <Field label="Usuario PPPoE" value={profile.connection.pppoeUsername} />
          <Field label="IP asignada" value={profile.connection.ipAddress} />
          <div className="col-span-2">
            <p className="text-xs text-muted mt-2">
              La sesión en vivo (uptime, tráfico, router) se conecta a MikroTik real en la Fase 4.
            </p>
          </div>
        </div>
      )}

      {tab === 'OLT/ONU' && (
        <div className="grid grid-cols-2 gap-4 text-sm">
          <Field label="OLT" value={profile.oltOnu.oltId} />
          <Field label="Serial ONU" value={profile.oltOnu.onuSerial} />
          <div className="col-span-2">
            <p className="text-xs text-muted mt-2">Señal óptica en vivo disponible en la Fase 5.</p>
          </div>
        </div>
      )}

      {tab === 'Tickets' && <PendingPhase note="El módulo de tickets se activa en la Fase 8." />}

      {tab === 'Historial' && <AuditList items={profile.history} />}
      {tab === 'Auditoría' && <AuditList items={profile.audit} />}

      {tab === 'Notas' && (
        <p className="text-sm text-muted">{info.notes || 'Sin notas registradas.'}</p>
      )}
    </div>
  );
}

function Field({ label, value }: { label: string; value: any }) {
  return (
    <div>
      <p className="text-xs text-muted mb-0.5">{label}</p>
      <p>{value ?? '—'}</p>
    </div>
  );
}

function PendingPhase({ note }: { note: string }) {
  return <div className="status-panel status-panel--neutral text-sm text-muted">{note}</div>;
}

function AuditList({ items }: { items: any[] }) {
  if (!items?.length) return <p className="text-sm text-muted">Sin eventos registrados aún.</p>;
  return (
    <div className="space-y-2">
      {items.map((log) => (
        <div key={log.id} className="text-sm border-b border-border pb-2">
          <span className="text-muted">{new Date(log.createdAt).toLocaleString('es-DO')}</span>
          {' — '}
          <span>{log.user ? `${log.user.firstName} ${log.user.lastName}` : 'Sistema'}</span>
          {' realizó '}
          <span className="text-ink">{log.action}</span>
        </div>
      ))}
    </div>
  );
}
