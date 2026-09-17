import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { StatusBadge } from '../components/StatusBadge';

export function OltPage() {
  const [olts, setOlts] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [ponData, setPonData] = useState<any>(null);

  useEffect(() => { api.get('/olt').then((res) => setOlts(res.data)); }, []);

  async function selectOlt(olt: any) {
    setSelected(olt);
    setPonData(null);
    const { data } = await api.get(`/olt/${olt.id}/pon-ports`);
    setPonData(data);
  }

  return (
    <div className="p-8 max-w-6xl">
      <h1 className="text-2xl font-display font-bold mb-1">OLT</h1>
      <p className="text-muted text-sm mb-6">
        Los fabricantes sin driver verificado (Huawei/ZTE/FiberHome sin OIDs confirmados) muestran
        claramente que la lectura de PON/ONU no está soportada todavía — no se inventan datos.
      </p>

      <div className="grid grid-cols-3 gap-6">
        <div className="space-y-2">
          {olts.map((olt) => (
            <button
              key={olt.id}
              onClick={() => selectOlt(olt)}
              className={`w-full text-left status-panel ${olt.status === 'ONLINE' ? 'status-panel--ok' : 'status-panel--neutral'} ${selected?.id === olt.id ? 'ring-1 ring-signal' : ''}`}
            >
              <p className="font-medium">{olt.name}</p>
              <p className="text-xs text-muted">{olt.vendor} · {olt.model ?? 'modelo no especificado'}</p>
              <StatusBadge status={olt.status} />
            </button>
          ))}
          {olts.length === 0 && <p className="text-muted text-sm">No hay OLT registradas todavía.</p>}
        </div>

        <div className="col-span-2">
          {!selected ? (
            <p className="text-muted text-sm">Selecciona una OLT para ver sus puertos PON.</p>
          ) : !ponData ? (
            <p className="text-muted text-sm">Cargando...</p>
          ) : !ponData.supported ? (
            <div className="status-panel status-panel--neutral text-sm text-muted">{ponData.reason}</div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {ponData.ponPorts.map((p: any) => (
                <div key={p.ponId} className={`status-panel ${p.status === 'ONLINE' ? 'status-panel--ok' : 'status-panel--critical'}`}>
                  <p className="font-medium">PON {p.ponId}</p>
                  <p className="text-xs text-muted">{p.onlineOnuCount}/{p.onuCount} ONUs en línea</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
