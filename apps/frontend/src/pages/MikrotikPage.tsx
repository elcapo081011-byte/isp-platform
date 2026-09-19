import { FormEvent, useEffect, useState } from 'react';
import { Plus, Wifi, WifiOff, RefreshCw, X, Users, Activity, Pencil, Trash2 } from 'lucide-react';
import { api } from '../lib/api';
import { Router } from '../lib/types';
import { useToast } from '../components/Toast';

const EMPTY_FORM = {
  name: '',
  host: '',
  port: '8728',
  username: '',
  password: '',
  useTls: false,
  location: '',
};

type FormState = typeof EMPTY_FORM;

function fieldClass() {
  return 'w-full bg-surface-raised border border-border rounded-md px-3 py-2 text-sm outline-none focus:border-signal transition-colors';
}

function labelClass() {
  return 'block text-xs text-muted mb-1.5';
}

export function MikrotikPage() {
  const [routers, setRouters] = useState<Router[]>([]);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [detail, setDetail] = useState<Router | null>(null);
  const [sessions, setSessions] = useState<any[] | null>(null);
  const [systemInfo, setSystemInfo] = useState<any | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const toast = useToast();

  async function load() {
    setLoading(true);
    try {
      const { data } = await api.get('/mikrotik/routers');
      setRouters(data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function check(id: string) {
    setChecking(id);
    try {
      await api.post(`/mikrotik/routers/${id}/check-connection`);
      await load();
    } finally {
      setChecking(null);
    }
  }

  function openCreate() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setError(null);
    setModalOpen(true);
  }

  function openEdit(r: Router) {
    setEditingId(r.id);
    setForm({
      name: r.name,
      host: r.host,
      port: String(r.port ?? 8728),
      username: r.username,
      password: '', // se deja vacía: si no se toca, se conserva la actual
      useTls: r.useTls ?? false,
      location: r.location ?? '',
    });
    setError(null);
    setModalOpen(true);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payload: any = {
        name: form.name,
        host: form.host,
        port: form.port ? Number(form.port) : undefined,
        username: form.username,
        useTls: form.useTls,
        location: form.location || undefined,
      };
      // En edición, solo se manda la contraseña si el usuario escribió una nueva.
      if (!editingId || form.password) {
        payload.password = form.password;
      }

      if (editingId) {
        await api.patch(`/mikrotik/routers/${editingId}`, payload);
        toast.success('Router actualizado.');
      } else {
        await api.post('/mikrotik/routers', payload);
        toast.success('Router agregado. Verificando conexión…');
      }
      setModalOpen(false);
      await load();
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'No se pudo guardar el router. Verifica los datos de conexión.');
    } finally {
      setSaving(false);
    }
  }

  async function remove(r: Router) {
    const confirmed = window.confirm(`¿Eliminar el router "${r.name}"? Los clientes que lo usaban quedarán sin router asignado.`);
    if (!confirmed) return;
    setDeletingId(r.id);
    try {
      await api.delete(`/mikrotik/routers/${r.id}`);
      toast.success('Router eliminado.');
      await load();
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'No se pudo eliminar el router.');
    } finally {
      setDeletingId(null);
    }
  }

  async function openDetail(r: Router) {
    setDetail(r);
    setSessions(null);
    setSystemInfo(null);
    setDetailLoading(true);
    try {
      const [sessionsRes, infoRes] = await Promise.allSettled([
        api.get(`/mikrotik/routers/${r.id}/pppoe-sessions`),
        api.get(`/mikrotik/routers/${r.id}/system-info`),
      ]);
      if (sessionsRes.status === 'fulfilled') setSessions(sessionsRes.value.data);
      if (infoRes.status === 'fulfilled') setSystemInfo(infoRes.value.data);
    } finally {
      setDetailLoading(false);
    }
  }

  return (
    <div className="p-8 max-w-6xl page-enter">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-display font-bold mb-1">MikroTik</h1>
          <p className="text-muted text-sm max-w-lg">
            Cada router se consulta en vivo por la API de RouterOS — el estado que ves nunca es simulado.
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 bg-signal text-base text-sm font-medium rounded-md px-4 py-2 hover:opacity-90 transition-opacity shrink-0"
        >
          <Plus size={16} /> Agregar router
        </button>
      </div>

      {loading ? (
        <p className="text-muted text-sm">Cargando routers…</p>
      ) : routers.length === 0 ? (
        <div className="status-panel status-panel--neutral text-sm text-muted">
          No hay routers registrados todavía. Agrega el primero con "Agregar router" — necesitarás su IP,
          usuario y contraseña de la API de RouterOS (Winbox → IP → Services → api, puerto 8728 por defecto).
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {routers.map((r) => (
            <div
              key={r.id}
              className={`status-panel ${
                r.status === 'ONLINE' ? 'status-panel--ok' : r.status === 'OFFLINE' ? 'status-panel--critical' : 'status-panel--neutral'
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-medium">{r.name}</p>
                  <p className="text-xs text-muted">
                    {r.host}:{r.port} · {r.location ?? 'sin ubicación'}
                  </p>
                </div>
                {r.status === 'ONLINE' ? <Wifi className="text-ok" size={18} /> : <WifiOff className="text-muted" size={18} />}
              </div>

              {r.status === 'OFFLINE' && r.lastError && (
                <p className="text-[11px] text-critical mt-2">{r.lastError}</p>
              )}

              <div className="flex items-center gap-4 mt-3 flex-wrap">
                <button
                  onClick={() => check(r.id)}
                  disabled={checking === r.id}
                  className="flex items-center gap-1.5 text-xs text-signal hover:underline disabled:opacity-50"
                >
                  <RefreshCw size={12} className={checking === r.id ? 'animate-spin' : ''} />
                  Verificar conexión
                </button>
                <button
                  onClick={() => openDetail(r)}
                  className="flex items-center gap-1.5 text-xs text-muted hover:text-ink"
                >
                  <Activity size={12} />
                  Ver detalle
                </button>
                <button
                  onClick={() => openEdit(r)}
                  className="flex items-center gap-1.5 text-xs text-muted hover:text-ink"
                >
                  <Pencil size={12} />
                  Editar
                </button>
                <button
                  onClick={() => remove(r)}
                  disabled={deletingId === r.id}
                  className="flex items-center gap-1.5 text-xs text-critical hover:underline disabled:opacity-50"
                >
                  <Trash2 size={12} />
                  {deletingId === r.id ? 'Eliminando…' : 'Eliminar'}
                </button>
              </div>

              {r.isDemo && <p className="text-[10px] text-muted/70 mt-2">Dato demo</p>}
            </div>
          ))}
        </div>
      )}

      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 backdrop-blur-sm p-6 pt-[8vh]"
          onClick={() => setModalOpen(false)}
        >
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-lg bg-surface border border-border rounded-lg shadow-2xl">
            <div className="flex items-start justify-between border-b border-border px-6 py-4">
              <div>
                <h2 className="font-display font-bold text-lg">{editingId ? 'Editar router MikroTik' : 'Agregar router MikroTik'}</h2>
                <p className="text-xs text-muted mt-0.5">La contraseña se guarda cifrada, nunca en texto plano.</p>
              </div>
              <button onClick={() => setModalOpen(false)} className="text-muted hover:text-ink p-1 -mr-1 -mt-1" aria-label="Cerrar">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
              {error && <div className="status-panel status-panel--critical text-sm text-critical py-2.5">{error}</div>}

              <div>
                <label className={labelClass()}>Nombre</label>
                <input
                  required
                  placeholder="Ej. Router Principal - Zona Norte"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className={fieldClass()}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className={labelClass()}>Dirección IP</label>
                  <input
                    required
                    placeholder="192.168.1.1"
                    value={form.host}
                    onChange={(e) => setForm({ ...form, host: e.target.value })}
                    className={fieldClass()}
                  />
                </div>
                <div>
                  <label className={labelClass()}>Puerto API</label>
                  <input
                    type="number"
                    value={form.port}
                    onChange={(e) => setForm({ ...form, port: e.target.value })}
                    className={fieldClass()}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={labelClass()}>Usuario</label>
                  <input
                    required
                    autoComplete="off"
                    value={form.username}
                    onChange={(e) => setForm({ ...form, username: e.target.value })}
                    className={fieldClass()}
                  />
                </div>
                <div>
                  <label className={labelClass()}>Contraseña {editingId && <span className="text-muted/60">(dejar en blanco para no cambiarla)</span>}</label>
                  <input
                    required={!editingId}
                    type="password"
                    autoComplete="new-password"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    className={fieldClass()}
                  />
                </div>
              </div>

              <div>
                <label className={labelClass()}>Ubicación (opcional)</label>
                <input
                  placeholder="Ej. Torre Central"
                  value={form.location}
                  onChange={(e) => setForm({ ...form, location: e.target.value })}
                  className={fieldClass()}
                />
              </div>

              <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={form.useTls}
                  onChange={(e) => setForm({ ...form, useTls: e.target.checked })}
                  className="rounded border-border accent-signal"
                />
                Usar API-SSL (puerto 8729)
              </label>

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setModalOpen(false)} className="text-sm text-muted hover:text-ink px-4 py-2">
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="bg-signal text-base text-sm font-medium rounded-md px-5 py-2 disabled:opacity-50"
                >
                  {saving ? 'Guardando…' : editingId ? 'Guardar cambios' : 'Guardar router'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {detail && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 backdrop-blur-sm p-6 pt-[6vh]"
          onClick={() => setDetail(null)}
        >
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-2xl bg-surface border border-border rounded-lg shadow-2xl">
            <div className="flex items-start justify-between border-b border-border px-6 py-4">
              <div>
                <h2 className="font-display font-bold text-lg">{detail.name}</h2>
                <p className="text-xs text-muted mt-0.5">
                  {detail.host}:{detail.port}
                </p>
              </div>
              <button onClick={() => setDetail(null)} className="text-muted hover:text-ink p-1 -mr-1 -mt-1" aria-label="Cerrar">
                <X size={18} />
              </button>
            </div>

            <div className="px-6 py-5 space-y-5 max-h-[60vh] overflow-y-auto">
              {detailLoading ? (
                <p className="text-muted text-sm">Consultando router…</p>
              ) : (
                <>
                  <div>
                    <p className="text-xs font-medium text-muted mb-2 uppercase tracking-wide">Información del sistema</p>
                    {systemInfo ? (
                      <pre className="bg-surface-raised border border-border rounded-md p-3 text-xs overflow-x-auto">
                        {JSON.stringify(systemInfo, null, 2)}
                      </pre>
                    ) : (
                      <p className="text-xs text-muted">No se pudo obtener — verifica la conexión.</p>
                    )}
                  </div>

                  <div>
                    <p className="text-xs font-medium text-muted mb-2 uppercase tracking-wide flex items-center gap-1.5">
                      <Users size={12} /> Sesiones PPPoE activas
                    </p>
                    {sessions && sessions.length > 0 ? (
                      <div className="border border-border rounded-md divide-y divide-border">
                        {sessions.map((s, i) => (
                          <div key={i} className="px-3 py-2 text-xs flex justify-between">
                            <span>{s.name ?? s.user ?? '—'}</span>
                            <span className="text-muted">{s.address ?? ''}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-muted">Sin sesiones activas o no disponible.</p>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
