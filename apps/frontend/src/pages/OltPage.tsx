import { FormEvent, useEffect, useState } from 'react';
import { Plus, X, RefreshCw, Wifi, WifiOff, PlusCircle, Power, PowerOff } from 'lucide-react';
import { api } from '../lib/api';
import { StatusBadge } from '../components/StatusBadge';
import { Olt, Onu, PonPort } from '../lib/types';
import { useToast } from '../components/Toast';

const VENDORS = [
  { value: 'HUAWEI', label: 'Huawei' },
  { value: 'ZTE', label: 'ZTE' },
  { value: 'FIBERHOME', label: 'FiberHome' },
  { value: 'GENERIC_SNMP', label: 'Genérica (SNMP)' },
  { value: 'MOCK', label: 'Simulada (pruebas)' },
];

const EMPTY_OLT_FORM = { name: '', vendor: 'GENERIC_SNMP', model: '', host: '', snmpCommunity: 'public', location: '' };
const EMPTY_ONU_FORM = { ponPort: '', serial: '', mac: '', model: '' };

function fieldClass() {
  return 'w-full bg-surface-raised border border-border rounded-md px-3 py-2 text-sm outline-none focus:border-signal transition-colors';
}
function labelClass() {
  return 'block text-xs text-muted mb-1.5';
}

export function OltPage() {
  const [olts, setOlts] = useState<Olt[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Olt | null>(null);
  const [ponData, setPonData] = useState<{ supported: boolean; reason?: string; ponPorts: PonPort[] } | null>(null);
  const [onus, setOnus] = useState<Onu[]>([]);
  const [checking, setChecking] = useState(false);

  const [oltModalOpen, setOltModalOpen] = useState(false);
  const [oltForm, setOltForm] = useState(EMPTY_OLT_FORM);
  const [savingOlt, setSavingOlt] = useState(false);
  const [oltError, setOltError] = useState<string | null>(null);

  const [onuModalOpen, setOnuModalOpen] = useState(false);
  const [onuForm, setOnuForm] = useState(EMPTY_ONU_FORM);
  const [savingOnu, setSavingOnu] = useState(false);
  const [onuError, setOnuError] = useState<string | null>(null);
  const toast = useToast();

  async function loadOlts() {
    setLoading(true);
    try {
      const { data } = await api.get('/olt');
      setOlts(data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadOlts();
  }, []);

  async function selectOlt(olt: Olt) {
    setSelected(olt);
    setPonData(null);
    setOnus([]);
    const [ponRes, onuRes] = await Promise.all([
      api.get(`/olt/${olt.id}/pon-ports`),
      api.get(`/olt/${olt.id}/onus`),
    ]);
    setPonData(ponRes.data);
    setOnus(onuRes.data);
  }

  async function checkConnection() {
    if (!selected) return;
    setChecking(true);
    try {
      await api.post(`/olt/${selected.id}/check-connection`);
      await loadOlts();
      await selectOlt(selected);
    } finally {
      setChecking(false);
    }
  }

  function openCreateOlt() {
    setOltForm(EMPTY_OLT_FORM);
    setOltError(null);
    setOltModalOpen(true);
  }

  async function handleOltSubmit(e: FormEvent) {
    e.preventDefault();
    setSavingOlt(true);
    setOltError(null);
    try {
      await api.post('/olt', {
        name: oltForm.name,
        vendor: oltForm.vendor,
        model: oltForm.model || undefined,
        host: oltForm.host,
        snmpCommunity: oltForm.snmpCommunity || undefined,
        location: oltForm.location || undefined,
      });
      setOltModalOpen(false);
      toast.success('OLT agregada.');
      await loadOlts();
    } catch (err: any) {
      setOltError(err?.response?.data?.message ?? 'No se pudo guardar la OLT.');
    } finally {
      setSavingOlt(false);
    }
  }

  function openRegisterOnu() {
    setOnuForm(EMPTY_ONU_FORM);
    setOnuError(null);
    setOnuModalOpen(true);
  }

  async function handleOnuSubmit(e: FormEvent) {
    e.preventDefault();
    if (!selected) return;
    setSavingOnu(true);
    setOnuError(null);
    try {
      await api.post('/olt/onus', {
        oltId: selected.id,
        ponPort: onuForm.ponPort,
        serial: onuForm.serial,
        mac: onuForm.mac || undefined,
        model: onuForm.model || undefined,
      });
      setOnuModalOpen(false);
      toast.success('ONU registrada.');
      await selectOlt(selected);
    } catch (err: any) {
      setOnuError(err?.response?.data?.message ?? 'No se pudo registrar la ONU.');
    } finally {
      setSavingOnu(false);
    }
  }

  async function toggleOnu(onu: Onu) {
    const action = onu.status === 'ONLINE' ? 'deauthorize' : 'authorize';
    await api.post(`/olt/onus/${onu.id}/${action}`);
    if (selected) await selectOlt(selected);
  }

  return (
    <div className="p-8 max-w-6xl">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-display font-bold mb-1">OLT</h1>
          <p className="text-muted text-sm max-w-lg">
            Los fabricantes sin driver verificado muestran claramente que la lectura de PON/ONU no está
            soportada todavía — no se inventan datos.
          </p>
        </div>
        <button
          onClick={openCreateOlt}
          className="flex items-center gap-2 bg-signal text-base text-sm font-medium rounded-md px-4 py-2 hover:opacity-90 transition-opacity shrink-0"
        >
          <Plus size={16} /> Agregar OLT
        </button>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="space-y-2">
          {loading ? (
            <p className="text-muted text-sm">Cargando…</p>
          ) : olts.length === 0 ? (
            <div className="status-panel status-panel--neutral text-sm text-muted">
              No hay OLT registradas. Agrega la primera con "Agregar OLT".
            </div>
          ) : (
            olts.map((olt) => (
              <button
                key={olt.id}
                onClick={() => selectOlt(olt)}
                className={`w-full text-left status-panel ${
                  olt.status === 'ONLINE' ? 'status-panel--ok' : 'status-panel--neutral'
                } ${selected?.id === olt.id ? 'ring-1 ring-signal' : ''}`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium">{olt.name}</p>
                    <p className="text-xs text-muted">{VENDORS.find((v) => v.value === olt.vendor)?.label ?? olt.vendor} · {olt.model ?? 'modelo no especificado'}</p>
                  </div>
                  {olt.status === 'ONLINE' ? <Wifi className="text-ok shrink-0" size={16} /> : <WifiOff className="text-muted shrink-0" size={16} />}
                </div>
                <StatusBadge status={olt.status} />
                {olt.isDemo && <p className="text-[10px] text-muted/70 mt-2">Dato demo</p>}
              </button>
            ))
          )}
        </div>

        <div className="col-span-2">
          {!selected ? (
            <p className="text-muted text-sm">Selecciona una OLT para ver sus puertos PON y ONUs.</p>
          ) : (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-display font-bold">{selected.name}</p>
                  <p className="text-xs text-muted">{selected.host} · {selected.location ?? 'sin ubicación'}</p>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={checkConnection}
                    disabled={checking}
                    className="flex items-center gap-1.5 text-xs text-signal hover:underline disabled:opacity-50"
                  >
                    <RefreshCw size={12} className={checking ? 'animate-spin' : ''} />
                    Verificar conexión
                  </button>
                  <button
                    onClick={openRegisterOnu}
                    className="flex items-center gap-1.5 text-xs text-signal hover:underline"
                  >
                    <PlusCircle size={12} />
                    Registrar ONU
                  </button>
                </div>
              </div>

              {!ponData ? (
                <p className="text-muted text-sm">Cargando…</p>
              ) : !ponData.supported ? (
                <div className="status-panel status-panel--neutral text-sm text-muted">{ponData.reason}</div>
              ) : (
                <div>
                  <p className="text-xs font-medium text-muted mb-2 uppercase tracking-wide">Puertos PON</p>
                  <div className="grid grid-cols-2 gap-3">
                    {ponData.ponPorts.map((p) => (
                      <div key={p.ponId} className={`status-panel ${p.status === 'ONLINE' ? 'status-panel--ok' : 'status-panel--critical'}`}>
                        <p className="font-medium">PON {p.ponId}</p>
                        <p className="text-xs text-muted">{p.onlineOnuCount}/{p.onuCount} ONUs en línea</p>
                      </div>
                    ))}
                    {ponData.ponPorts.length === 0 && <p className="text-xs text-muted">Sin puertos reportados.</p>}
                  </div>
                </div>
              )}

              <div>
                <p className="text-xs font-medium text-muted mb-2 uppercase tracking-wide">ONUs registradas</p>
                {onus.length === 0 ? (
                  <p className="text-xs text-muted">No hay ONUs registradas en esta OLT todavía.</p>
                ) : (
                  <div className="border border-border rounded-md divide-y divide-border">
                    {onus.map((onu) => (
                      <div key={onu.id} className="px-3 py-2.5 flex items-center justify-between text-sm">
                        <div>
                          <p>
                            PON {onu.ponPort} · <span className="text-muted">{onu.serial}</span>
                          </p>
                          {onu.model && <p className="text-[11px] text-muted">{onu.model}</p>}
                        </div>
                        <div className="flex items-center gap-3">
                          <StatusBadge status={onu.status} />
                          <button
                            onClick={() => toggleOnu(onu)}
                            className={`flex items-center gap-1 text-xs ${onu.status === 'ONLINE' ? 'text-critical hover:underline' : 'text-ok hover:underline'}`}
                          >
                            {onu.status === 'ONLINE' ? <PowerOff size={12} /> : <Power size={12} />}
                            {onu.status === 'ONLINE' ? 'Desautorizar' : 'Autorizar'}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {oltModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 backdrop-blur-sm p-6 pt-[8vh]"
          onClick={() => setOltModalOpen(false)}
        >
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-lg bg-surface border border-border rounded-lg shadow-2xl">
            <div className="flex items-start justify-between border-b border-border px-6 py-4">
              <div>
                <h2 className="font-display font-bold text-lg">Agregar OLT</h2>
                <p className="text-xs text-muted mt-0.5">Huawei, ZTE y FiberHome usan drivers en verificación; SNMP genérico ya lee datos reales.</p>
              </div>
              <button onClick={() => setOltModalOpen(false)} className="text-muted hover:text-ink p-1 -mr-1 -mt-1" aria-label="Cerrar">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleOltSubmit} className="px-6 py-5 space-y-4">
              {oltError && <div className="status-panel status-panel--critical text-sm text-critical py-2.5">{oltError}</div>}

              <div>
                <label className={labelClass()}>Nombre</label>
                <input
                  required
                  placeholder="Ej. OLT Central - Sector 1"
                  value={oltForm.name}
                  onChange={(e) => setOltForm({ ...oltForm, name: e.target.value })}
                  className={fieldClass()}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass()}>Fabricante</label>
                  <select
                    value={oltForm.vendor}
                    onChange={(e) => setOltForm({ ...oltForm, vendor: e.target.value })}
                    className={fieldClass()}
                  >
                    {VENDORS.map((v) => (
                      <option key={v.value} value={v.value}>
                        {v.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelClass()}>Modelo (opcional)</label>
                  <input
                    placeholder="Ej. MA5800-X7"
                    value={oltForm.model}
                    onChange={(e) => setOltForm({ ...oltForm, model: e.target.value })}
                    className={fieldClass()}
                  />
                </div>
              </div>

              <div>
                <label className={labelClass()}>Dirección IP</label>
                <input
                  required
                  placeholder="10.0.0.10"
                  value={oltForm.host}
                  onChange={(e) => setOltForm({ ...oltForm, host: e.target.value })}
                  className={fieldClass()}
                />
              </div>

              <div>
                <label className={labelClass()}>Comunidad SNMP</label>
                <input
                  value={oltForm.snmpCommunity}
                  onChange={(e) => setOltForm({ ...oltForm, snmpCommunity: e.target.value })}
                  className={fieldClass()}
                />
              </div>

              <div>
                <label className={labelClass()}>Ubicación (opcional)</label>
                <input
                  placeholder="Ej. Nodo Este"
                  value={oltForm.location}
                  onChange={(e) => setOltForm({ ...oltForm, location: e.target.value })}
                  className={fieldClass()}
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setOltModalOpen(false)} className="text-sm text-muted hover:text-ink px-4 py-2">
                  Cancelar
                </button>
                <button type="submit" disabled={savingOlt} className="bg-signal text-base text-sm font-medium rounded-md px-5 py-2 disabled:opacity-50">
                  {savingOlt ? 'Guardando…' : 'Guardar OLT'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {onuModalOpen && selected && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 backdrop-blur-sm p-6 pt-[8vh]"
          onClick={() => setOnuModalOpen(false)}
        >
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-lg bg-surface border border-border rounded-lg shadow-2xl">
            <div className="flex items-start justify-between border-b border-border px-6 py-4">
              <div>
                <h2 className="font-display font-bold text-lg">Registrar ONU</h2>
                <p className="text-xs text-muted mt-0.5">En {selected.name}</p>
              </div>
              <button onClick={() => setOnuModalOpen(false)} className="text-muted hover:text-ink p-1 -mr-1 -mt-1" aria-label="Cerrar">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleOnuSubmit} className="px-6 py-5 space-y-4">
              {onuError && <div className="status-panel status-panel--critical text-sm text-critical py-2.5">{onuError}</div>}

              <div>
                <label className={labelClass()}>Puerto PON</label>
                <input
                  required
                  placeholder="Ej. 0/1/1"
                  value={onuForm.ponPort}
                  onChange={(e) => setOnuForm({ ...onuForm, ponPort: e.target.value })}
                  className={fieldClass()}
                />
              </div>

              <div>
                <label className={labelClass()}>Número de serie</label>
                <input
                  required
                  placeholder="Ej. HWTC12345678"
                  value={onuForm.serial}
                  onChange={(e) => setOnuForm({ ...onuForm, serial: e.target.value })}
                  className={fieldClass()}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass()}>MAC (opcional)</label>
                  <input
                    placeholder="00:11:22:33:44:55"
                    value={onuForm.mac}
                    onChange={(e) => setOnuForm({ ...onuForm, mac: e.target.value })}
                    className={fieldClass()}
                  />
                </div>
                <div>
                  <label className={labelClass()}>Modelo (opcional)</label>
                  <input
                    placeholder="Ej. HG8310M"
                    value={onuForm.model}
                    onChange={(e) => setOnuForm({ ...onuForm, model: e.target.value })}
                    className={fieldClass()}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setOnuModalOpen(false)} className="text-sm text-muted hover:text-ink px-4 py-2">
                  Cancelar
                </button>
                <button type="submit" disabled={savingOnu} className="bg-signal text-base text-sm font-medium rounded-md px-5 py-2 disabled:opacity-50">
                  {savingOnu ? 'Guardando…' : 'Registrar ONU'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
