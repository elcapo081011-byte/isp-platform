import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Wifi, WifiOff, RefreshCw, X, Users, Activity, Pencil, Trash2 } from 'lucide-react';
import { api } from '../lib/api';
import { Router } from '../lib/types';
import { useToast } from '../components/Toast';
import { useConfirm } from '../components/ConfirmDialog';

export function MikrotikPage() {
  const [routers, setRouters] = useState<Router[]>([]);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState<string | null>(null);

  const [detail, setDetail] = useState<Router | null>(null);
  const [sessions, setSessions] = useState<any[] | null>(null);
  const [systemInfo, setSystemInfo] = useState<any | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const toast = useToast();
  const confirm = useConfirm();
  const navigate = useNavigate();

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
      const { data } = await api.post(`/mikrotik/routers/${id}/check-connection`);
      if (data.status === 'ONLINE') toast.success('Conexión exitosa.');
      else toast.error(data.error ?? 'No se pudo conectar con el router.');
      await load();
    } finally {
      setChecking(null);
    }
  }

  async function remove(r: Router) {
    const ok = await confirm({
      title: `¿Eliminar "${r.name}"?`,
      description: 'Se borra su configuración de la plataforma (no se toca el MikroTik). Si hay clientes asignados a este router, no se podrá eliminar.',
      confirmLabel: 'Eliminar',
      danger: true,
    });
    if (!ok) return;
    try {
      await api.delete(`/mikrotik/routers/${r.id}`);
      toast.success('Router eliminado.');
      await load();
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'No se pudo eliminar el router.');
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
        <Link
          to="/mikrotik/nuevo"
          className="flex items-center gap-2 bg-signal text-base text-sm font-medium rounded-md px-4 py-2 hover:opacity-90 transition-opacity shrink-0"
        >
          <Plus size={16} /> Agregar router
        </Link>
      </div>

      {loading ? (
        <p className="text-muted text-sm">Cargando routers…</p>
      ) : routers.length === 0 ? (
        <div className="status-panel status-panel--neutral text-sm text-muted">
          No hay routers registrados todavía. Agrega el primero con "Agregar router": guardas su IP o DDNS, y el sistema te da un
          script para pegar en el MikroTik que crea el usuario de API por ti.
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
                  <p className="text-[11px] text-muted mt-0.5">
                    {r.servicesCount ?? 0} cliente(s) · RouterOS {r.routerOsVersion} ·{' '}
                    {r.zone ? 'zona de facturación configurada' : 'reglas globales de facturación'}
                  </p>
                </div>
                {r.status === 'ONLINE' ? <Wifi className="text-ok" size={18} /> : <WifiOff className="text-muted" size={18} />}
              </div>

              {r.status === 'OFFLINE' && r.lastError && (
                <p className="text-[11px] text-critical mt-2">{r.lastError}</p>
              )}

              <div className="flex items-center gap-4 mt-3">
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
                <button onClick={() => navigate(`/mikrotik/${r.id}`)} className="flex items-center gap-1.5 text-xs text-muted hover:text-ink">
                  <Pencil size={12} /> Editar
                </button>
                <button onClick={() => remove(r)} className="flex items-center gap-1.5 text-xs text-muted hover:text-critical">
                  <Trash2 size={12} /> Eliminar
                </button>
              </div>

              {r.isDemo && <p className="text-[10px] text-muted/70 mt-2">Dato demo</p>}
            </div>
          ))}
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
