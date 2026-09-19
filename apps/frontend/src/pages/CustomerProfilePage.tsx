import { FormEvent, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { PauseCircle, PlayCircle, Download } from 'lucide-react';
import { api } from '../lib/api';
import { StatusBadge } from '../components/StatusBadge';
import { useToast } from '../components/Toast';
import { useConfirm } from '../components/ConfirmDialog';
import { Modal } from '../components/Modal';
import { Plan, Router } from '../lib/types';

const TABS = ['Resumen', 'Servicio', 'Facturación', 'Conexión', 'OLT / ONU', 'Tickets', 'Historial'] as const;
type Tab = typeof TABS[number];

export function CustomerProfilePage() {
  const { id } = useParams();
  const [profile, setProfile] = useState<any>(null);
  const [tab, setTab] = useState<Tab>('Resumen');
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const confirm = useConfirm();

  // Cambiar plan / router / usuario PPPoE del servicio
  const [svcOpen, setSvcOpen] = useState(false);
  const [svcSaving, setSvcSaving] = useState(false);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [routers, setRouters] = useState<Router[]>([]);
  const [svcForm, setSvcForm] = useState({ planId: '', routerId: '', pppoeUsername: '', pppoePassword: '' });

  async function openServiceEditor() {
    const current = profile?.service?.[0];
    setSvcForm({
      planId: current?.planId ?? '',
      routerId: current?.routerId ?? '',
      pppoeUsername: current?.pppoeUsername ?? '',
      pppoePassword: '',
    });
    setSvcOpen(true);
    api.get('/plans', { params: { status: 'ACTIVE' } }).then((r) => setPlans(r.data)).catch(() => {});
    api.get('/mikrotik/routers').then((r) => setRouters(r.data)).catch(() => {});
  }

  async function saveService(e: FormEvent) {
    e.preventDefault();
    setSvcSaving(true);
    try {
      const body: Record<string, unknown> = {
        planId: svcForm.planId || undefined,
        routerId: svcForm.routerId, // '' = sin router
        pppoeUsername: svcForm.pppoeUsername,
      };
      if (svcForm.pppoePassword) body.pppoePassword = svcForm.pppoePassword;
      const { data } = await api.put(`/customers/${id}/service`, body);
      const net = data.networkAction;
      if (net && net.applied === false) toast.warning(`Servicio guardado, pero el router no se actualizó: ${net.reason ?? 'sin detalle'}`);
      else if (net?.warning) toast.warning(`Servicio guardado. ${net.warning}`);
      else toast.success(net?.applied ? 'Servicio guardado y sincronizado con el MikroTik.' : 'Servicio guardado.');
      setSvcOpen(false);
      await load();
    } catch (err: any) {
      const m = err?.response?.data?.message;
      toast.error(Array.isArray(m) ? m.join(' · ') : m ?? 'No se pudo guardar el servicio.');
    } finally {
      setSvcSaving(false);
    }
  }

  async function load() {
    const { data } = await api.get(`/customers/${id}`);
    setProfile(data);
  }

  useEffect(() => {
    load();
  }, [id]);

  async function toggleSuspension() {
    const isSuspended = profile.information.status === 'SUSPENDED';
    const ok = await confirm({
      title: isSuspended ? '¿Reactivar este cliente?' : '¿Suspender este cliente?',
      description: isSuspended
        ? 'Se intentará restaurar su sesión en el router asignado.'
        : 'Se intentará cortar su sesión en el router asignado de inmediato.',
      confirmLabel: isSuspended ? 'Reactivar' : 'Suspender',
      danger: !isSuspended,
    });
    if (!ok) return;
    setBusy(true);
    try {
      const { data } = isSuspended
        ? await api.post(`/customers/${id}/reactivate`)
        : await api.post(`/customers/${id}/suspend`, { reason: 'Suspensión manual desde el panel' });
      if (data?.networkAction && data.networkAction.applied === false) {
        toast.warning(`Estado actualizado, pero la acción de red no se aplicó: ${data.networkAction.reason ?? data.networkAction.error ?? 'sin detalle'}`);
      } else {
        toast.success(isSuspended ? 'Cliente reactivado.' : 'Cliente suspendido.');
      }
      await load();
    } finally {
      setBusy(false);
    }
  }

  if (!profile) return <div className="p-8 text-muted text-sm">Cargando…</div>;

  const info = profile.information;
  const service = profile.service?.[0];
  const isSuspended = info.status === 'SUSPENDED';
  const openTicketsCount = profile.tickets.filter((t: any) => !['RESOLVED', 'CLOSED'].includes(t.status)).length;
  const overdueCount = profile.invoices.filter((i: any) => i.status === 'OVERDUE').length;

  return (
    <div className="p-8 max-w-5xl page-enter">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-display font-bold mb-1">
            {info.firstName} {info.lastName}
          </h1>
          <div className="flex items-center gap-3 text-sm text-muted flex-wrap">
            <StatusBadge status={info.status} />
            <span>{info.documentId ?? 'sin documento'}</span>
            {service && <span>· {service.plan.name}</span>}
            {service?.ipAddress && <span>· {service.ipAddress}</span>}
          </div>
        </div>
        <button
          onClick={toggleSuspension}
          disabled={busy}
          className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-opacity disabled:opacity-50 ${
            isSuspended ? 'bg-ok text-base' : 'bg-critical text-white'
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
            className={`px-3 py-2 text-sm whitespace-nowrap border-b-2 transition-colors flex items-center gap-1.5 ${
              tab === t ? 'border-signal text-ink' : 'border-transparent text-muted hover:text-ink'
            }`}
          >
            {t}
            {t === 'Tickets' && openTicketsCount > 0 && (
              <span className="text-[10px] bg-critical/15 text-critical rounded-full px-1.5">{openTicketsCount}</span>
            )}
            {t === 'Facturación' && overdueCount > 0 && (
              <span className="text-[10px] bg-critical/15 text-critical rounded-full px-1.5">{overdueCount}</span>
            )}
          </button>
        ))}
      </div>

      {tab === 'Resumen' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <Field label="Teléfono" value={info.phone} />
          <Field label="WhatsApp" value={info.whatsapp} />
          <Field label="Email" value={info.email} />
          <Field label="Dirección" value={info.address} />
          <Field label="Referencia" value={info.reference} />
          <Field label="Técnico asignado" value={info.technician ? `${info.technician.firstName} ${info.technician.lastName}` : null} />
          <Field label="Día de corte" value={info.billingDay} />
          <Field label="Método de pago" value={info.paymentMethod} />
          <div className="col-span-2 pt-3 border-t border-border">
            <p className="text-xs text-muted mb-0.5">Notas</p>
            <p>{info.notes || 'Sin notas registradas.'}</p>
          </div>
        </div>
      )}

      {tab === 'Servicio' && (
        <div className="space-y-3">
          <div className="flex justify-end">
            <button onClick={openServiceEditor} className="text-sm border border-border rounded-md px-3 py-1.5 hover:bg-surface-raised">
              {profile.service.length === 0 ? 'Asignar servicio' : 'Cambiar plan / router'}
            </button>
          </div>
          {profile.service.length === 0 ? (
            <p className="text-muted text-sm">Este cliente no tiene un servicio activo todavía.</p>
          ) : (
            profile.service.map((s: any) => (
              <div key={s.id} className="status-panel status-panel--ok">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <p className="font-medium">{s.plan.name}</p>
                    <p className="text-xs text-muted">
                      {s.plan.downloadMbps}/{s.plan.uploadMbps} Mbps · ${s.plan.price} {s.plan.currency}/mes
                    </p>
                  </div>
                  <StatusBadge status={s.status} />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-3 border-t border-border">
                  <Field label="Router / zona" value={s.router?.name ?? 'Sin router asignado'} />
                  <Field label="Usuario PPPoE" value={s.pppoeUsername} />
                  <Field label="IP" value={s.ipAddress} />
                  <Field label="VLAN" value={s.plan.vlan} />
                  <Field label="Perfil MikroTik" value={s.plan.mikrotikProfile} />
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {tab === 'Facturación' && (
        <div className="space-y-6">
          <div>
            <p className="text-xs font-medium text-muted mb-2 uppercase tracking-wide">Facturas</p>
            {profile.invoices.length === 0 ? (
              <p className="text-sm text-muted">Sin facturas todavía.</p>
            ) : (
              <div className="border border-border rounded-md divide-y divide-border">
                {profile.invoices.map((inv: any) => (
                  <div key={inv.id} className="px-3 py-2.5 flex items-center justify-between text-sm">
                    <div>
                      <p>{inv.number}</p>
                      <p className="text-xs text-muted">Vence {new Date(inv.dueDate).toLocaleDateString('es-DO')}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span>${Number(inv.amount).toFixed(2)}</span>
                      <StatusBadge status={inv.status} />
                      <a
                        href={`${api.defaults.baseURL}/billing/invoices/${inv.id}/pdf`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-muted hover:text-ink"
                      >
                        <Download size={14} />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div>
            <p className="text-xs font-medium text-muted mb-2 uppercase tracking-wide">Pagos</p>
            {profile.payments.length === 0 ? (
              <p className="text-sm text-muted">Sin pagos registrados.</p>
            ) : (
              <div className="border border-border rounded-md divide-y divide-border">
                {profile.payments.map((p: any) => (
                  <div key={p.id} className="px-3 py-2.5 flex items-center justify-between text-sm">
                    <span>{new Date(p.paidAt ?? p.createdAt).toLocaleDateString('es-DO')}</span>
                    <span>${Number(p.amount).toFixed(2)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'Conexión' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <Field label="Usuario PPPoE" value={profile.connection.pppoeUsername} />
          <Field label="IP asignada" value={profile.connection.ipAddress} />
          <div className="col-span-2">
            <p className="text-xs text-muted mt-2">
              La sesión en vivo por cliente (uptime, tráfico exacto) requiere cruzar el usuario PPPoE con las sesiones activas del
              router — puedes verlo agregado en MikroTik → Ver detalle → Sesiones PPPoE.
            </p>
          </div>
        </div>
      )}

      {tab === 'OLT / ONU' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <Field label="OLT" value={profile.oltOnu.oltId} />
          <Field label="Serial ONU" value={profile.oltOnu.onuSerial} />
          <div className="col-span-2">
            <p className="text-xs text-muted mt-2">
              RX/TX y temperatura en vivo dependen del driver del fabricante de la ONU — visítalo en OLT → selecciona la OLT.
            </p>
          </div>
        </div>
      )}

      {tab === 'Tickets' && (
        <div className="space-y-2">
          {profile.tickets.length === 0 ? (
            <p className="text-sm text-muted">Sin tickets para este cliente.</p>
          ) : (
            profile.tickets.map((t: any) => (
              <div key={t.id} className="status-panel status-panel--neutral flex items-center justify-between">
                <div>
                  <p className="font-medium">{t.subject}</p>
                  <p className="text-xs text-muted">{new Date(t.createdAt).toLocaleDateString('es-DO')}</p>
                </div>
                <StatusBadge status={t.status} />
              </div>
            ))
          )}
        </div>
      )}

      {tab === 'Historial' && <AuditList items={profile.history} />}

      {svcOpen && (
        <Modal
          title={profile.service.length === 0 ? 'Asignar servicio' : 'Cambiar plan / router'}
          subtitle="Al guardar, el usuario PPPoE se crea en el router elegido y se quita del anterior."
          onClose={() => setSvcOpen(false)}
        >
          <form onSubmit={saveService} className="space-y-4">
            <div>
              <label className="block text-sm text-muted mb-1.5">Plan</label>
              <select required className="w-full bg-surface-raised border border-border rounded-md px-3 py-2 text-sm outline-none focus:border-signal" value={svcForm.planId} onChange={(e) => setSvcForm({ ...svcForm, planId: e.target.value })}>
                <option value="">Elige un plan…</option>
                {plans.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}{p.mikrotikProfile ? '' : ' (sin perfil MikroTik)'}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-muted mb-1.5">Router / zona</label>
              <select className="w-full bg-surface-raised border border-border rounded-md px-3 py-2 text-sm outline-none focus:border-signal" value={svcForm.routerId} onChange={(e) => setSvcForm({ ...svcForm, routerId: e.target.value })}>
                <option value="">Sin router</option>
                {routers.map((r) => (
                  <option key={r.id} value={r.id}>{r.name}{r.status === 'OFFLINE' ? ' (sin conexión)' : ''}</option>
                ))}
              </select>
            </div>
            {svcForm.routerId && (
              <>
                <div>
                  <label className="block text-sm text-muted mb-1.5">Usuario PPPoE</label>
                  <input required className="w-full bg-surface-raised border border-border rounded-md px-3 py-2 text-sm outline-none focus:border-signal" value={svcForm.pppoeUsername} onChange={(e) => setSvcForm({ ...svcForm, pppoeUsername: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm text-muted mb-1.5">Contraseña PPPoE</label>
                  <input type="password" minLength={4} autoComplete="new-password" placeholder="Vacía = usar la que ya está guardada" className="w-full bg-surface-raised border border-border rounded-md px-3 py-2 text-sm outline-none focus:border-signal" value={svcForm.pppoePassword} onChange={(e) => setSvcForm({ ...svcForm, pppoePassword: e.target.value })} />
                  <p className="text-xs text-muted mt-1.5">Los clientes anteriores a esta versión no tienen contraseña guardada: escríbela para poder crearlos en el router.</p>
                </div>
              </>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setSvcOpen(false)} className="text-sm text-muted hover:text-ink px-4 py-2">Cancelar</button>
              <button type="submit" disabled={svcSaving} className="bg-signal text-base text-sm font-medium rounded-md px-5 py-2 disabled:opacity-50">{svcSaving ? 'Guardando…' : 'Guardar'}</button>
            </div>
          </form>
        </Modal>
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
