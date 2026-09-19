import { FormEvent, ReactNode, useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { AlertTriangle, CheckCircle2, ClipboardCopy, Cloud, Code2, Info, Pencil, Plus, Receipt, RefreshCw, Send, Settings2, Trash2, XCircle } from 'lucide-react';
import { api } from '../lib/api';
import { Router, ZoneBilling } from '../lib/types';
import { useToast } from '../components/Toast';
import { useConfirm } from '../components/ConfirmDialog';
import { Modal } from '../components/Modal';

type TabKey = 'general' | 'zona' | 'script' | 'eventos';

const inputClass =
  'w-full bg-surface-raised border border-border rounded-md px-3 py-2 text-sm outline-none focus:border-signal transition-colors disabled:opacity-60';

// Mismos valores de ejemplo que trae WispHub (ver backend zone-settings.ts).
const DEFAULT_ZONE: ZoneBilling = {
  billingType: 'POSTPAID',
  autoInvoices: true, invoiceDay: 25, invoiceHour: 17, payDay: 30,
  autoReminders: true, reminderDay: 28, reminderHour: 17,
  autoCut: true, cutDay: 5, cutHour: 17, suspendAfterInvoices: 1,
  taxPercent: 0, emailOnInvoice: true, emailOnCut: true,
};

const EMPTY_FORM = {
  name: '',
  useConnectionScript: true,
  host: '',
  failoverHost: '',
  username: '',
  password: '',
  port: '8728',
  wwwPort: '',
  useTls: false,
  lanInterface: '',
  ipRanges: '',
  comments: '',
  location: '',
  coordinates: '',
  routerOsVersion: '6' as '6' | '7',
  externalId: '',
  addClientsToRouter: true,
  cutMode: 'PPPOE_SECRET' as 'PPPOE_SECRET' | 'ADDRESS_LIST',
};
type FormState = typeof EMPTY_FORM;

function errMsg(err: any, fallback: string) {
  const m = err?.response?.data?.message;
  return Array.isArray(m) ? m.join(' · ') : m ?? fallback;
}

function Field({ label, hint, children }: { label: string; hint?: ReactNode; children: ReactNode }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] gap-x-4 gap-y-1 items-start">
      <label className="text-sm text-muted md:text-right md:pt-2">{label}</label>
      <div>
        {children}
        {hint && <p className="text-xs text-muted mt-1.5">{hint}</p>}
      </div>
    </div>
  );
}

/** Interruptor. `soon` = existe en WispHub pero aún no está implementado aquí: se muestra deshabilitado. */
function Switch({
  checked, onChange, disabled, soon, label,
}: { checked: boolean; onChange?: (v: boolean) => void; disabled?: boolean; soon?: boolean; label?: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled || soon}
        onClick={() => onChange?.(!checked)}
        className={`relative h-6 w-11 rounded-full border transition-colors shrink-0 ${
          checked ? 'bg-signal border-signal' : 'bg-surface-raised border-border'
        } ${disabled || soon ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
      >
        <span className={`absolute top-0.5 h-[18px] w-[18px] rounded-full bg-base transition-all ${checked ? 'left-[22px]' : 'left-0.5'}`} />
      </button>
      {soon && <span className="text-[10px] text-muted border border-border rounded px-1.5 py-0.5">pronto</span>}
    </div>
  );
}

function DayHour({
  day, hour, onDay, onHour,
}: { day: number; hour: number; onDay: (n: number) => void; onHour: (n: number) => void }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-muted">Día</span>
      <input type="number" min={1} max={31} value={day} onChange={(e) => onDay(Number(e.target.value))} className={`${inputClass} w-20`} />
      <span className="text-sm text-muted">de cada mes a las</span>
      <select value={hour} onChange={(e) => onHour(Number(e.target.value))} className={`${inputClass} w-24`}>
        {Array.from({ length: 24 }, (_, h) => (
          <option key={h} value={h}>{String(h).padStart(2, '0')}:00</option>
        ))}
      </select>
    </div>
  );
}

function parseCoordinates(raw: string): { latitude?: number; longitude?: number } | null {
  if (!raw.trim()) return {};
  const m = raw.trim().match(/^(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)$/);
  if (!m) return null;
  const latitude = Number(m[1]);
  const longitude = Number(m[2]);
  if (Math.abs(latitude) > 90 || Math.abs(longitude) > 180) return null;
  return { latitude, longitude };
}

export function MikrotikRouterPage() {
  const { id } = useParams();
  const isNew = !id || id === 'nuevo';
  const navigate = useNavigate();
  const toast = useToast();
  const confirm = useConfirm();
  const [search, setSearch] = useSearchParams();

  const tab = (search.get('tab') as TabKey) || 'general';
  const setTab = (t: TabKey) => setSearch({ tab: t }, { replace: true });

  const [router, setRouter] = useState<Router | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [zone, setZone] = useState<ZoneBilling>(DEFAULT_ZONE);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function hydrate(r: Router) {
    setRouter(r);
    setForm({
      name: r.name,
      useConnectionScript: r.useConnectionScript,
      host: r.host,
      failoverHost: r.failoverHost ?? '',
      username: '',
      password: '',
      port: String(r.port),
      wwwPort: r.wwwPort ? String(r.wwwPort) : '',
      useTls: r.useTls,
      lanInterface: r.lanInterface ?? '',
      ipRanges: r.ipRanges ?? '',
      comments: r.comments ?? '',
      location: r.location ?? '',
      coordinates: r.latitude != null && r.longitude != null ? `${r.latitude}, ${r.longitude}` : '',
      routerOsVersion: r.routerOsVersion,
      externalId: r.externalId ?? '',
      addClientsToRouter: r.addClientsToRouter,
      cutMode: (r.cutMode as 'PPPOE_SECRET' | 'ADDRESS_LIST') ?? 'PPPOE_SECRET',
    });
    setZone(r.zone ?? DEFAULT_ZONE);
  }

  useEffect(() => {
    if (isNew) return;
    setLoading(true);
    api
      .get(`/mikrotik/routers/${id}`)
      .then((res) => hydrate(res.data))
      .catch((err) => setError(errMsg(err, 'No se pudo cargar el router.')))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((f) => ({ ...f, [key]: value }));
  const setZ = <K extends keyof ZoneBilling>(key: K, value: ZoneBilling[K]) => setZone((z) => ({ ...z, [key]: value }));

  /** Guarda según la pestaña activa. Devuelve el router guardado, o null si hubo error. */
  async function save(): Promise<Router | null> {
    setError(null);
    setSaving(true);
    try {
      if (tab === 'zona' && !isNew) {
        const { data } = await api.put(`/mikrotik/routers/${id}`, { zone });
        hydrate(data);
        toast.success('Facturación de la zona guardada. Este router ya usa estas reglas.');
        return data;
      }

      const coords = parseCoordinates(form.coordinates);
      if (coords === null) {
        setError('Las coordenadas deben verse así: 18.462639, -69.979636');
        return null;
      }
      const base: Record<string, unknown> = {
        name: form.name,
        host: form.host,
        failoverHost: form.failoverHost,
        port: form.port ? Number(form.port) : undefined,
        useTls: form.useTls,
        lanInterface: form.lanInterface,
        ipRanges: form.ipRanges,
        comments: form.comments,
        location: form.location,
        routerOsVersion: form.routerOsVersion,
        externalId: form.externalId,
        addClientsToRouter: form.addClientsToRouter,
        cutMode: form.cutMode,
        // En edición, dejar vacío borra el dato; al crear simplemente se omite.
        wwwPort: form.wwwPort ? Number(form.wwwPort) : null,
        latitude: coords.latitude ?? null,
        longitude: coords.longitude ?? null,
      };

      if (isNew) {
        const body: Record<string, unknown> = { ...base, useConnectionScript: form.useConnectionScript };
        if (!form.useConnectionScript) {
          body.username = form.username;
          body.password = form.password;
        }
        // Campos vacíos se omiten al crear.
        for (const k of Object.keys(body)) if (body[k] === '' || body[k] === null) delete body[k];
        const { data } = await api.post('/mikrotik/routers', body);
        toast.success('Router guardado.');
        return data;
      }

      const body: Record<string, unknown> = { ...base };
      if (!router?.useConnectionScript) {
        if (form.username) body.username = form.username;
        if (form.password) body.password = form.password; // vacío = conservar la actual
      }
      const { data } = await api.put(`/mikrotik/routers/${id}`, body);
      hydrate(data);
      toast.success('Router actualizado.');
      return data;
    } catch (err: any) {
      setError(errMsg(err, 'No se pudo guardar el router.'));
      return null;
    } finally {
      setSaving(false);
    }
  }

  async function onSave(e?: FormEvent) {
    e?.preventDefault();
    const saved = await save();
    if (saved) navigate('/mikrotik');
  }

  async function onSaveAndContinue() {
    const saved = await save();
    if (!saved) return;
    if (isNew) {
      // Con credenciales generadas, el siguiente paso natural es pegar el script en el router.
      navigate(`/mikrotik/${saved.id}?tab=${saved.useConnectionScript ? 'script' : 'general'}`, { replace: true });
    }
  }

  async function onSaveAndCheck() {
    const saved = await save();
    if (!saved) return;
    if (saved.useConnectionScript) {
      // Todavía no pegó el script: probar ahora daría error. Lo llevamos al paso correcto.
      navigate(`/mikrotik/${saved.id}?tab=script`, { replace: true });
      return;
    }
    try {
      const { data } = await api.post(`/mikrotik/routers/${saved.id}/check-connection`);
      if (data.status === 'ONLINE') toast.success('Conexión exitosa con el router.');
      else toast.error(data.error ?? 'No se pudo conectar con el router.');
    } catch (err: any) {
      toast.error(errMsg(err, 'No se pudo verificar la conexión.'));
    }
    navigate(isNew ? `/mikrotik/${saved.id}` : `/mikrotik/${saved.id}?tab=${tab}`, { replace: true });
  }

  const tabs: { key: TabKey; label: string; icon: ReactNode }[] = [
    { key: 'general', label: 'Información general', icon: <Info size={13} /> },
    { key: 'zona', label: 'Facturación - Zona', icon: <Receipt size={13} /> },
    { key: 'script', label: 'Script de conexión', icon: <Code2 size={13} /> },
    { key: 'eventos', label: 'Eventos API personalizados', icon: <Settings2 size={13} /> },
  ];

  if (loading) return <div className="p-8 text-sm text-muted">Cargando router…</div>;
  if (!isNew && !router) {
    return (
      <div className="p-8 max-w-3xl">
        <p className="text-sm text-critical mb-3">{error ?? 'Router no encontrado.'}</p>
        <Link to="/mikrotik" className="text-sm text-signal hover:underline">← Volver a MikroTik</Link>
      </div>
    );
  }

  const savesForm = tab === 'general' || tab === 'zona';

  return (
    <div className="p-8 max-w-5xl page-enter">
      <div className="flex items-center gap-2 mb-1">
        <Cloud size={20} className="text-ok" />
        <h1 className="text-2xl font-display font-bold">{isNew ? 'Agregar router' : 'Editar router'}</h1>
      </div>
      <p className="text-sm text-muted mb-5">
        {isNew ? 'Completa la información general, guarda, y luego conecta el router con el script.' : router?.name}
        {' '}<Link to="/mikrotik" className="text-signal hover:underline">← Volver a MikroTik</Link>
      </p>

      <div className="flex flex-wrap gap-1 border-b border-border mb-6">
        {tabs.map((t) => {
          const locked = isNew && t.key !== 'general';
          return (
            <button
              key={t.key}
              type="button"
              disabled={locked}
              title={locked ? 'Guarda el router primero' : undefined}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm border-b-2 -mb-px transition-colors ${
                tab === t.key ? 'border-signal text-ink' : 'border-transparent text-muted hover:text-ink'
              } ${locked ? 'opacity-40 cursor-not-allowed' : ''}`}
            >
              {t.icon} {t.label}
            </button>
          );
        })}
      </div>

      {error && <div className="status-panel status-panel--critical text-sm text-critical py-2.5 mb-4">{error}</div>}

      <form onSubmit={onSave}>
        {tab === 'general' && (
          <GeneralTab form={form} set={set} isNew={isNew} router={router} />
        )}
        {tab === 'zona' && <ZoneTab zone={zone} setZ={setZ} configured={!!router?.zone} />}
        {tab === 'script' && router && (
          <ScriptTab router={router} onChanged={() => api.get(`/mikrotik/routers/${router.id}`).then((r) => hydrate(r.data))} />
        )}
        {tab === 'eventos' && router && <EventsTab routerId={router.id} />}

        {savesForm && (
          <div className="flex flex-wrap items-center gap-2 mt-8 md:pl-[236px]">
            <button type="submit" disabled={saving} className="bg-ok/90 text-base text-sm font-medium rounded-md px-5 py-2 disabled:opacity-50">
              {saving ? 'Guardando…' : 'Guardar'}
            </button>
            <button type="button" onClick={onSaveAndContinue} disabled={saving} className="border border-border text-sm rounded-md px-4 py-2 hover:bg-surface-raised disabled:opacity-50">
              Guardar y continuar editando
            </button>
            {tab === 'general' && (
              <button type="button" onClick={onSaveAndCheck} disabled={saving} className="border border-signal text-signal text-sm rounded-md px-4 py-2 hover:bg-signal/10 disabled:opacity-50">
                Guardar y comprobar conexión
              </button>
            )}
            <button type="button" onClick={() => navigate('/mikrotik')} className="text-sm text-muted hover:text-ink px-4 py-2">
              Cancelar
            </button>
          </div>
        )}
      </form>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Pestaña 1 — Información general
// ---------------------------------------------------------------------------
function GeneralTab({
  form, set, isNew, router,
}: {
  form: FormState;
  set: <K extends keyof FormState>(k: K, v: FormState[K]) => void;
  isNew: boolean;
  router: Router | null;
}) {
  const generated = isNew ? form.useConnectionScript : router?.useConnectionScript;
  return (
    <div className="space-y-4">
      <Field label="Nombre">
        <input required minLength={2} placeholder="Ej. Router Principal - Zona Norte" className={inputClass} value={form.name} onChange={(e) => set('name', e.target.value)} />
      </Field>

      <Field
        label="¿Usar script de conexión?"
        hint={
          isNew
            ? 'Sí: el sistema crea el usuario y la clave de API por ti y te da un script para pegar en el MikroTik. No: usa un usuario que ya tengas.'
            : generated
              ? 'Este router usa credenciales generadas por el sistema (se ven en la pestaña Script de conexión).'
              : 'Este router usa el usuario y la clave que escribiste tú.'
        }
      >
        <Switch checked={!!generated} disabled={!isNew} onChange={(v) => set('useConnectionScript', v)} label="Usar script de conexión" />
      </Field>

      <Field label="IPv4 / IPv6 / DDNS" hint="IP pública o DDNS por donde la plataforma alcanza el router.">
        <input required placeholder="Ej. 203.0.113.10 o miempresa.dyn.com" className={inputClass} value={form.host} onChange={(e) => set('host', e.target.value)} />
      </Field>

      <Field label="Failover" hint="Opcional. Si el host principal no responde, se intenta con este.">
        <input placeholder="Ej. IP pública, IP de Cloud MikroTik, miempresa.dyn.com…" className={inputClass} value={form.failoverHost} onChange={(e) => set('failoverHost', e.target.value)} />
      </Field>

      {!generated && (
        <>
          <Field label="Usuario del RB">
            <input required={isNew} autoComplete="off" className={inputClass} value={form.username} onChange={(e) => set('username', e.target.value)} placeholder={isNew ? '' : 'Déjalo vacío para conservar el actual'} />
          </Field>
          <Field label="Password del RB" hint="Se guarda cifrada, nunca en texto plano.">
            <input required={isNew} type="password" autoComplete="new-password" className={inputClass} value={form.password} onChange={(e) => set('password', e.target.value)} placeholder={isNew ? '' : 'Déjala vacía para no cambiarla'} />
          </Field>
        </>
      )}

      <Field label="Puerto API">
        <input type="number" min={1} max={65535} className={inputClass} value={form.port} onChange={(e) => set('port', e.target.value)} />
      </Field>
      <Field label="Puerto WWW">
        <input type="number" min={1} max={65535} className={inputClass} value={form.wwwPort} onChange={(e) => set('wwwPort', e.target.value)} />
      </Field>
      <Field label="API-SSL" hint="Marca solo si tu router ya tiene el servicio api-ssl con certificado (puerto 8729).">
        <Switch checked={form.useTls} onChange={(v) => set('useTls', v)} label="Usar API-SSL" />
      </Field>

      <Field label="Interfaz LAN" hint="Informativo: se guarda como referencia; aún no lo usa ninguna automatización.">
        <input className={inputClass} value={form.lanInterface} onChange={(e) => set('lanInterface', e.target.value)} />
      </Field>
      <Field label="Rangos IP" hint="Un rango por línea (ej. 192.168.102.1/24). Informativo por ahora.">
        <textarea rows={4} className={inputClass} value={form.ipRanges} onChange={(e) => set('ipRanges', e.target.value)} />
      </Field>
      <Field label="Comentarios">
        <textarea rows={2} className={inputClass} value={form.comments} onChange={(e) => set('comments', e.target.value)} />
      </Field>
      <Field label="Ubicación">
        <input placeholder="Ej. Torre Central" className={inputClass} value={form.location} onChange={(e) => set('location', e.target.value)} />
      </Field>
      <Field label="Coordenadas" hint="Latitud, longitud. Ej. 18.462639, -69.979636">
        <input className={inputClass} value={form.coordinates} onChange={(e) => set('coordinates', e.target.value)} />
      </Field>
      <Field label="Versión">
        <select className={inputClass} value={form.routerOsVersion} onChange={(e) => set('routerOsVersion', e.target.value as '6' | '7')}>
          <option value="6">RouterOS 6 o inferior</option>
          <option value="7">RouterOS 7 o superior</option>
        </select>
      </Field>
      <Field label="External ID" hint="Tu propio identificador para este router (opcional).">
        <input className={inputClass} value={form.externalId} onChange={(e) => set('externalId', e.target.value)} />
      </Field>

      <Field
        label="Tipo de corte de servicio"
        hint={
          form.cutMode === 'ADDRESS_LIST' ? (
            <>
              Agrega la IP del cliente a la lista <code>moroso</code> (usa su IP fija, o la de su sesión PPPoE activa en el momento del corte).
              Necesita una regla de firewall que bloquee esa lista: el <strong>Script de conexión</strong> ya la incluye
              {isNew || !router?.useConnectionScript ? (
                <> — si usas credenciales propias, agrégala tú: <code>/ip firewall filter add chain=forward src-address-list=moroso action=drop</code></>
              ) : null}
              . Con IP dinámica, si el cliente se reconecta y cambia de IP después del corte, podría quedar fuera de la lista.
            </>
          ) : (
            'Deshabilita el usuario PPPoE del cliente: se le corta la sesión y no puede volver a conectarse.'
          )
        }
      >
        <select className={inputClass} value={form.cutMode} onChange={(e) => set('cutMode', e.target.value as 'PPPOE_SECRET' | 'ADDRESS_LIST')}>
          <option value="PPPOE_SECRET">Deshabilitar el usuario PPPoE</option>
          <option value="ADDRESS_LIST">Address list moroso</option>
          <option disabled>Simple Queue / PCQ (pronto)</option>
        </select>
      </Field>

      <div className="border-t border-border pt-4 space-y-4">
        <Field label="Agregar cliente en MikroTik" hint="Al crear un cliente en este router, se crea su usuario PPPoE en el MikroTik con el perfil de su plan.">
          <Switch checked={form.addClientsToRouter} onChange={(v) => set('addClientsToRouter', v)} label="Agregar cliente en MikroTik" />
        </Field>
        <Field label="Control PPPoE" hint="Único modo de control disponible hoy. Control de velocidad: perfil PPP del plan.">
          <Switch checked disabled label="Control PPPoE" />
        </Field>
        {[
          'Control Simple Queue', 'Control PCQ + Addresslist', 'Control HotSpot', 'IP Bindings', 'Amarre IP/Mac',
          'DHCP Leases', 'Historial de tráfico', 'Falla general', 'IPv6',
        ].map((label) => (
          <Field key={label} label={label}>
            <Switch checked={false} soon label={label} />
          </Field>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Pestaña 2 — Facturación - Zona
// ---------------------------------------------------------------------------
function ZoneTab({ zone, setZ, configured }: { zone: ZoneBilling; setZ: <K extends keyof ZoneBilling>(k: K, v: ZoneBilling[K]) => void; configured: boolean }) {
  return (
    <div className="space-y-4">
      <div className={`status-panel text-sm ${configured ? 'status-panel--ok' : 'status-panel--neutral'}`}>
        {configured
          ? 'Este router se factura y se corta con las reglas de esta zona.'
          : 'Todavía no configuraste esta zona: mientras tanto el router usa las reglas globales de tu cuenta (sin facturas automáticas). Al guardar esta pestaña, pasa a usar las de aquí.'}
        <p className="text-xs text-muted mt-1">Las horas son las del servidor. Si un mes tiene menos días que el elegido (ej. 31 en abril), se usa su último día.</p>
      </div>

      <Field label="Tipo" hint="Prepago llegará más adelante.">
        <select className={inputClass} value="POSTPAID" onChange={() => {}}>
          <option value="POSTPAID">Postpago</option>
          <option disabled>Prepago (pronto)</option>
        </select>
      </Field>

      <Field label="Crear factura" hint="Se genera una factura por cada servicio activo de la zona (sin duplicar las del mes).">
        <DayHour day={zone.invoiceDay} hour={zone.invoiceHour} onDay={(n) => setZ('invoiceDay', n)} onHour={(n) => setZ('invoiceHour', n)} />
      </Field>
      <Field label="Día pago" hint="Vencimiento de la factura generada.">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted">Día</span>
          <input type="number" min={1} max={31} value={zone.payDay} onChange={(e) => setZ('payDay', Number(e.target.value))} className={`${inputClass} w-20`} />
          <span className="text-sm text-muted">de cada mes</span>
        </div>
      </Field>
      <Field label="Recordatorio de pago" hint="Se envía por correo a quien tenga una factura pendiente (SMS/WhatsApp y push: pronto).">
        <DayHour day={zone.reminderDay} hour={zone.reminderHour} onDay={(n) => setZ('reminderDay', n)} onHour={(n) => setZ('reminderHour', n)} />
      </Field>
      <Field label="Día corte" hint="Se corta cuando llega este día DESPUÉS del vencimiento (vence el 30 y corte el 5 → se corta el 5 del mes siguiente).">
        <DayHour day={zone.cutDay} hour={zone.cutHour} onDay={(n) => setZ('cutDay', n)} onHour={(n) => setZ('cutHour', n)} />
      </Field>
      <Field label="Suspender servicio" hint="Cuántas facturas vencidas debe tener el cliente para cortarlo.">
        <div className="flex items-center gap-2">
          <input type="number" min={1} max={12} value={zone.suspendAfterInvoices} onChange={(e) => setZ('suspendAfterInvoices', Number(e.target.value))} className={`${inputClass} w-20`} />
          <span className="text-sm text-muted">factura(s) vencida(s)</span>
        </div>
      </Field>
      <Field label="Impuestos (%)" hint="Se suma a cada factura generada automáticamente.">
        <input type="number" min={0} max={100} step="0.01" value={zone.taxPercent} onChange={(e) => setZ('taxPercent', Number(e.target.value))} className={`${inputClass} w-28`} />
      </Field>

      <div className="border-t border-border pt-4 space-y-4">
        <p className="text-sm font-medium md:pl-[236px]">Tareas periódicas</p>
        <Field label="Realizar corte automáticamente">
          <Switch checked={zone.autoCut} onChange={(v) => setZ('autoCut', v)} label="Corte automático" />
        </Field>
        <Field label="Realizar facturas automáticamente">
          <Switch checked={zone.autoInvoices} onChange={(v) => setZ('autoInvoices', v)} label="Facturas automáticas" />
        </Field>
        <Field label="Realizar recordatorio de pagos">
          <Switch checked={zone.autoReminders} onChange={(v) => setZ('autoReminders', v)} label="Recordatorios" />
        </Field>
        <Field label="Enviar notificaciones push"><Switch checked={false} soon label="Push" /></Field>
        <Field label="Aviso de corte por SMS/WhatsApp"><Switch checked={false} soon label="SMS/WhatsApp" /></Field>
        <Field label="Avisos en pantalla"><Switch checked={false} soon label="Avisos en pantalla" /></Field>
      </div>

      <div className="border-t border-border pt-4 space-y-4">
        <p className="text-sm font-medium md:pl-[236px]">Correos automáticos</p>
        <Field label="Recibir correo de facturas automáticamente">
          <Switch checked={zone.emailOnInvoice} onChange={(v) => setZ('emailOnInvoice', v)} label="Correo de facturas" />
        </Field>
        <Field label="Recibir correo de corte automáticamente">
          <Switch checked={zone.emailOnCut} onChange={(v) => setZ('emailOnCut', v)} label="Correo de corte" />
        </Field>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Pestaña 3 — Script de conexión
// ---------------------------------------------------------------------------
interface ScriptResponse {
  script: string;
  apiUser: string;
  apiPort: number;
  restrictedToIp: string | null;
}

function ScriptTab({ router, onChanged }: { router: Router; onChanged: () => void }) {
  const toast = useToast();
  const confirm = useConfirm();
  const [data, setData] = useState<ScriptResponse | null>(null);
  const [loading, setLoading] = useState(router.useConnectionScript);
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState<{ status: string; error: string | null } | null>(null);

  useEffect(() => {
    if (!router.useConnectionScript) return;
    setLoading(true);
    api
      .get(`/mikrotik/routers/${router.id}/connection-script`)
      .then((res) => setData(res.data))
      .catch((err) => toast.error(errMsg(err, 'No se pudo generar el script.')))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router.id, router.useConnectionScript]);

  async function copy() {
    if (!data) return;
    try {
      await navigator.clipboard.writeText(data.script);
      toast.success('Script copiado. Pégalo en el terminal del MikroTik.');
    } catch {
      toast.error('No se pudo copiar automáticamente: selecciona el texto y cópialo a mano.');
    }
  }

  async function verify() {
    setChecking(true);
    setResult(null);
    try {
      const { data: res } = await api.post(`/mikrotik/routers/${router.id}/check-connection`);
      setResult(res);
      onChanged();
    } catch (err: any) {
      setResult({ status: 'OFFLINE', error: errMsg(err, 'No se pudo verificar la conexión.') });
    } finally {
      setChecking(false);
    }
  }

  async function regenerate() {
    const ok = await confirm({
      title: '¿Regenerar las credenciales?',
      description: 'Se crea un usuario y una clave nuevos. El router quedará desconectado hasta que pegues el nuevo script.',
      confirmLabel: 'Regenerar',
      danger: true,
    });
    if (!ok) return;
    try {
      const { data: res } = await api.post(`/mikrotik/routers/${router.id}/regenerate-credentials`);
      setData(res);
      setResult(null);
      onChanged();
      toast.success('Credenciales nuevas generadas. Pega el script actualizado en el MikroTik.');
    } catch (err: any) {
      toast.error(errMsg(err, 'No se pudieron regenerar las credenciales.'));
    }
  }

  return (
    <div className="space-y-4">
      {router.useConnectionScript ? (
        <>
          <div className="status-panel status-panel--neutral text-sm space-y-1">
            <p><strong>1.</strong> Copia el script. <strong>2.</strong> Pégalo en Winbox → New Terminal (o por SSH). <strong>3.</strong> Verifica la conexión.</p>
            <p className="text-xs text-muted">
              El script crea un usuario de API propio con permisos limitados y habilita el servicio API. Es seguro volver a ejecutarlo.
              No afecta la velocidad de tu internet ni desconecta a tus clientes.
            </p>
          </div>

          {data && !data.restrictedToIp && (
            <div className="status-panel status-panel--warn text-sm flex items-start gap-2">
              <AlertTriangle size={16} className="text-warn mt-0.5 shrink-0" />
              <p>
                El dueño de la plataforma aún no definió la IP del servidor (<code>PLATFORM_PUBLIC_IP</code>), así que este script
                <strong> no restringe por origen</strong> quién puede usar la API. Pídele que la configure y vuelve a generar el script.
              </p>
            </div>
          )}
          {data?.restrictedToIp && (
            <p className="text-xs text-muted">Solo la IP <strong className="text-ink">{data.restrictedToIp}</strong> podrá usar el usuario y el servicio API.</p>
          )}

          <div className="relative">
            <button type="button" onClick={copy} disabled={!data} className="absolute top-2 right-2 flex items-center gap-1.5 text-xs bg-surface border border-border rounded px-2.5 py-1 hover:bg-surface-raised disabled:opacity-50">
              <ClipboardCopy size={12} /> Copiar
            </button>
            <pre className="bg-[#111] text-[#d7e3d0] border border-border rounded-md p-4 pr-24 text-xs overflow-x-auto whitespace-pre min-h-[120px]">
              {loading ? 'Generando script…' : data?.script ?? 'No se pudo generar el script.'}
            </pre>
          </div>

          <p className="text-xs text-muted">
            Este script <strong>no crea una VPN</strong>. Si tu router no tiene IP pública ni DDNS alcanzable, necesitas una VPN hacia el servidor de la plataforma (aún no incluida).
          </p>
        </>
      ) : (
        <div className="status-panel status-panel--neutral text-sm">
          Este router usa el usuario y la clave que escribiste tú, así que no hay script que generar. Asegúrate de que el servicio API esté habilitado
          en el MikroTik (IP → Services → api) y que el firewall permita la conexión desde la plataforma.
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={verify} disabled={checking} className="flex items-center gap-2 bg-ok/90 text-base text-sm font-medium rounded-md px-4 py-2 disabled:opacity-50">
          <RefreshCw size={14} className={checking ? 'animate-spin' : ''} /> Verificar conexión
        </button>
        {router.useConnectionScript && (
          <button type="button" onClick={regenerate} className="text-sm text-muted hover:text-critical hover:underline">
            Regenerar credenciales
          </button>
        )}
      </div>

      {result && (
        <div className={`status-panel text-sm flex items-start gap-2 ${result.status === 'ONLINE' ? 'status-panel--ok' : 'status-panel--critical'}`}>
          {result.status === 'ONLINE' ? <CheckCircle2 size={16} className="text-ok mt-0.5" /> : <XCircle size={16} className="text-critical mt-0.5" />}
          <p>{result.status === 'ONLINE' ? 'Conexión exitosa: la plataforma ya puede administrar este router.' : result.error ?? 'No se pudo conectar.'}</p>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Pestaña 4 — Eventos API personalizados
// ---------------------------------------------------------------------------
const HOOK_EVENTS: { key: string; label: string }[] = [
  { key: 'customer.created', label: 'Cliente agregado' },
  { key: 'customer.updated', label: 'Cliente editado' },
  { key: 'customer.deleted', label: 'Cliente eliminado' },
  { key: 'customer.suspended', label: 'Cliente suspendido (corte)' },
  { key: 'customer.activated', label: 'Cliente activado (reconexión)' },
];

interface ApiHook {
  id: string;
  platform: string;
  url: string;
  enabled: boolean;
  events: string[];
  hasSecret: boolean;
  lastAt: string | null;
  lastStatus: number | null;
  lastError: string | null;
}

const EMPTY_HOOK = { platform: '', url: '', secret: '', clearSecret: false, events: ['customer.suspended', 'customer.activated'] as string[], enabled: true };

function EventsTab({ routerId }: { routerId: string }) {
  const toast = useToast();
  const confirm = useConfirm();
  const [hooks, setHooks] = useState<ApiHook[] | null>(null);
  const [editing, setEditing] = useState<ApiHook | null>(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_HOOK);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState<string | null>(null);

  const base = `/mikrotik/routers/${routerId}/api-hooks`;

  async function load() {
    try {
      const { data } = await api.get(base);
      setHooks(data);
    } catch (err: any) {
      setHooks([]);
      toast.error(errMsg(err, 'No se pudieron cargar los eventos API.'));
    }
  }
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routerId]);

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_HOOK);
    setOpen(true);
  }
  function openEdit(h: ApiHook) {
    setEditing(h);
    setForm({ platform: h.platform, url: h.url, secret: '', clearSecret: false, events: h.events, enabled: h.enabled });
    setOpen(true);
  }
  const toggleEvent = (key: string) =>
    setForm((f) => ({ ...f, events: f.events.includes(key) ? f.events.filter((e) => e !== key) : [...f.events, key] }));

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (form.events.length === 0) {
      toast.error('Elige al menos un evento.');
      return;
    }
    setSaving(true);
    try {
      const body: Record<string, unknown> = { platform: form.platform, url: form.url, events: form.events, enabled: form.enabled };
      if (form.secret) body.secret = form.secret;
      if (editing) {
        if (form.clearSecret && !form.secret) body.clearSecret = true;
        await api.put(`${base}/${editing.id}`, body);
      } else {
        await api.post(base, body);
      }
      toast.success('Evento API guardado.');
      setOpen(false);
      await load();
    } catch (err: any) {
      toast.error(errMsg(err, 'No se pudo guardar el evento API.'));
    } finally {
      setSaving(false);
    }
  }

  async function remove(h: ApiHook) {
    const ok = await confirm({ title: `¿Eliminar "${h.platform}"?`, description: 'Dejará de recibir avisos de este router.', confirmLabel: 'Eliminar', danger: true });
    if (!ok) return;
    try {
      await api.delete(`${base}/${h.id}`);
      await load();
    } catch (err: any) {
      toast.error(errMsg(err, 'No se pudo eliminar.'));
    }
  }

  async function test(h: ApiHook) {
    setTesting(h.id);
    try {
      const { data } = await api.post(`${base}/${h.id}/test`);
      if (data.ok) toast.success(`La URL respondió correctamente (HTTP ${data.status}).`);
      else toast.error(data.error ?? 'La URL no respondió bien.');
      await load();
    } catch (err: any) {
      toast.error(errMsg(err, 'No se pudo probar.'));
    } finally {
      setTesting(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="status-panel status-panel--neutral text-sm space-y-1">
        <p>
          Cuando un cliente de <strong>este router</strong> se agrega, edita, elimina, suspende o reactiva, la plataforma envía un
          <code> POST </code> con JSON a las URLs que registres aquí (tu CRM, tu contabilidad, un bot…).
        </p>
        <p className="text-xs text-muted">
          Por seguridad solo se aceptan URLs <strong>https</strong> públicas (puerto 443 u 8443): no se permiten direcciones internas.
          Si defines un secreto, cada envío trae <code>X-ISP-Signature: sha256=…</code> (HMAC-SHA256 del cuerpo) para que verifiques que viene de aquí.
          Nunca se envían contraseñas.
        </p>
      </div>

      <div className="flex justify-end">
        <button type="button" onClick={openCreate} className="flex items-center gap-2 bg-ok/90 text-base text-sm font-medium rounded-md px-4 py-2">
          <Plus size={14} /> Agregar datos de API
        </button>
      </div>

      <div className="border border-border rounded-md overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-surface text-muted">
            <tr>
              <th className="text-left px-3 py-2 font-medium">Plataforma</th>
              <th className="text-left px-3 py-2 font-medium">URL</th>
              <th className="text-left px-3 py-2 font-medium">Eventos</th>
              <th className="text-left px-3 py-2 font-medium">Estado</th>
              <th className="text-left px-3 py-2 font-medium">Último envío</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {hooks === null && <tr><td colSpan={6} className="px-3 py-4 text-muted">Cargando…</td></tr>}
            {hooks?.length === 0 && <tr><td colSpan={6} className="px-3 py-4 text-muted">Aún no tienes datos de API personalizados, agrega uno.</td></tr>}
            {hooks?.map((h) => (
              <tr key={h.id} className="border-t border-border align-top">
                <td className="px-3 py-2 font-medium">{h.platform}{h.hasSecret && <span className="ml-1.5 text-[10px] text-muted border border-border rounded px-1">firmado</span>}</td>
                <td className="px-3 py-2 text-muted break-all max-w-[220px]">{h.url}</td>
                <td className="px-3 py-2 text-muted">{h.events.map((k) => HOOK_EVENTS.find((e) => e.key === k)?.label ?? k).join(', ')}</td>
                <td className="px-3 py-2"><span className={h.enabled ? 'text-ok' : 'text-muted'}>{h.enabled ? 'Activo' : 'Pausado'}</span></td>
                <td className="px-3 py-2">
                  {h.lastAt ? (
                    <>
                      <p className={h.lastError ? 'text-critical' : 'text-ok'}>{h.lastError ? 'Falló' : `HTTP ${h.lastStatus}`}</p>
                      <p className="text-muted">{new Date(h.lastAt).toLocaleString('es')}</p>
                      {h.lastError && <p className="text-critical/80">{h.lastError}</p>}
                    </>
                  ) : <span className="text-muted">Sin envíos</span>}
                </td>
                <td className="px-3 py-2 text-right whitespace-nowrap">
                  <button type="button" onClick={() => test(h)} disabled={testing === h.id} className="inline-flex items-center gap-1 text-signal hover:underline mr-3 disabled:opacity-50">
                    <Send size={11} /> {testing === h.id ? 'Probando…' : 'Probar'}
                  </button>
                  <button type="button" onClick={() => openEdit(h)} className="inline-flex items-center gap-1 text-muted hover:text-ink mr-3"><Pencil size={11} /> Editar</button>
                  <button type="button" onClick={() => remove(h)} className="inline-flex items-center gap-1 text-muted hover:text-critical"><Trash2 size={11} /> Eliminar</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {open && (
        <Modal title={editing ? 'Editar datos de API' : 'Agregar datos de API'} subtitle="La plataforma avisará a esta URL cuando ocurran los eventos que elijas." onClose={() => setOpen(false)}>
          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="block text-sm text-muted mb-1.5">Plataforma</label>
              <input required minLength={2} placeholder="Ej. Mi CRM" className={inputClass} value={form.platform} onChange={(e) => setForm({ ...form, platform: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm text-muted mb-1.5">URL (https)</label>
              <input required type="url" placeholder="https://crm.miempresa.com/hooks/isp" className={inputClass} value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm text-muted mb-1.5">Secreto para firmar (opcional)</label>
              <input type="password" minLength={8} autoComplete="new-password" placeholder={editing?.hasSecret ? 'Déjalo vacío para conservar el actual' : 'Mínimo 8 caracteres'} className={inputClass} value={form.secret} onChange={(e) => setForm({ ...form, secret: e.target.value })} />
              {editing?.hasSecret && (
                <label className="flex items-center gap-2 text-xs text-muted mt-2 cursor-pointer">
                  <input type="checkbox" checked={form.clearSecret} onChange={(e) => setForm({ ...form, clearSecret: e.target.checked })} className="accent-signal" />
                  Quitar el secreto (los envíos dejarán de ir firmados)
                </label>
              )}
            </div>
            <div>
              <p className="text-sm text-muted mb-1.5">Avisar cuando…</p>
              <div className="space-y-1.5">
                {HOOK_EVENTS.map((ev) => (
                  <label key={ev.key} className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="checkbox" checked={form.events.includes(ev.key)} onChange={() => toggleEvent(ev.key)} className="accent-signal" />
                    {ev.label}
                  </label>
                ))}
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={form.enabled} onChange={(e) => setForm({ ...form, enabled: e.target.checked })} className="accent-signal" />
              Activo
            </label>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setOpen(false)} className="text-sm text-muted hover:text-ink px-4 py-2">Cancelar</button>
              <button type="submit" disabled={saving} className="bg-signal text-base text-sm font-medium rounded-md px-5 py-2 disabled:opacity-50">{saving ? 'Guardando…' : 'Guardar'}</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
