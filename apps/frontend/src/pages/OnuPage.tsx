import { useEffect, useMemo, useState } from 'react';
import { Radio, X } from 'lucide-react';
import { api } from '../lib/api';
import { StatusBadge } from '../components/StatusBadge';

interface Onu {
  id: string;
  oltId: string;
  ponPort: string;
  serial: string;
  mac: string | null;
  model: string | null;
  status: 'ONLINE' | 'OFFLINE' | 'UNKNOWN';
  rxPowerDbm: number | null;
  txPowerDbm: number | null;
  temperatureCelsius: number | null;
  distanceMeters: number | null;
  lastSeenAt: string | null;
}

type SignalFilter = 'ALL' | 'CRITICAL' | 'WARNING';

export function OnuPage() {
  const [rows, setRows] = useState<(Onu & { oltName: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ONLINE' | 'OFFLINE' | 'UNKNOWN'>('ALL');
  const [signalFilter, setSignalFilter] = useState<SignalFilter>('ALL');
  const [thresholds, setThresholds] = useState({ rxWarnDbm: -25, rxCriticalDbm: -28 });
  const [selected, setSelected] = useState<(Onu & { oltName: string }) | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const { data: olts } = await api.get('/olt');
        const results = await Promise.all(
          olts.map(async (olt: any) => {
            try {
              const { data: onus } = await api.get(`/olt/${olt.id}/onus`);
              return onus.map((o: Onu) => ({ ...o, oltName: olt.name }));
            } catch {
              return [];
            }
          }),
        );
        setRows(results.flat());
      } finally {
        setLoading(false);
      }
    }
    load();
    api
      .get('/settings/optical_thresholds')
      .then((res) => {
        if (res.data) setThresholds(res.data);
      })
      .catch(() => {});
  }, []);

  const filtered = useMemo(() => {
    return rows.filter((o) => {
      if (statusFilter !== 'ALL' && o.status !== statusFilter) return false;
      if (signalFilter === 'CRITICAL' && !(o.rxPowerDbm != null && o.rxPowerDbm <= thresholds.rxCriticalDbm)) return false;
      if (signalFilter === 'WARNING' && !(o.rxPowerDbm != null && o.rxPowerDbm <= thresholds.rxWarnDbm && o.rxPowerDbm > thresholds.rxCriticalDbm)) return false;
      return true;
    });
  }, [rows, statusFilter, signalFilter, thresholds]);

  function signalClass(rx: number | null) {
    if (rx == null) return 'text-muted';
    if (rx <= thresholds.rxCriticalDbm) return 'text-critical';
    if (rx <= thresholds.rxWarnDbm) return 'text-warn';
    return 'text-ok';
  }

  return (
    <div className="p-8 max-w-6xl page-enter">
      <h1 className="text-2xl font-display font-bold mb-1">ONU / ONT</h1>
      <p className="text-muted text-sm mb-6">
        Agregado de todas tus OLT. Los umbrales de señal se toman de Configuración → Umbrales ópticos.
      </p>

      <div className="flex flex-wrap gap-2 mb-4">
        {(['ALL', 'ONLINE', 'OFFLINE', 'UNKNOWN'] as const).map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`text-xs px-3 py-1.5 rounded-md border ${statusFilter === s ? 'bg-signal text-base border-signal' : 'border-border text-muted hover:text-ink'}`}
          >
            {s === 'ALL' ? 'Todos' : s}
          </button>
        ))}
        <span className="w-px bg-border mx-1" />
        {(['ALL', 'WARNING', 'CRITICAL'] as const).map((s) => (
          <button
            key={s}
            onClick={() => setSignalFilter(s)}
            className={`text-xs px-3 py-1.5 rounded-md border ${signalFilter === s ? 'bg-signal text-base border-signal' : 'border-border text-muted hover:text-ink'}`}
          >
            {s === 'ALL' ? 'Cualquier señal' : s === 'WARNING' ? 'Señal en advertencia' : 'Señal crítica'}
          </button>
        ))}
      </div>

      <div className="border border-border rounded-md overflow-hidden overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-surface text-muted text-xs">
            <tr>
              <th className="text-left px-4 py-3">Estado</th>
              <th className="text-left px-4 py-3">Serial</th>
              <th className="text-left px-4 py-3">OLT</th>
              <th className="text-left px-4 py-3">PON</th>
              <th className="text-left px-4 py-3">RX</th>
              <th className="text-left px-4 py-3">TX</th>
              <th className="text-left px-4 py-3">Temp.</th>
              <th className="text-left px-4 py-3">Distancia</th>
              <th className="text-left px-4 py-3">Última vez en línea</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={9} className="px-4 py-6 text-center text-muted">
                  Cargando…
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-6 text-center text-muted">
                  Sin ONUs que coincidan con el filtro.
                </td>
              </tr>
            ) : (
              filtered.map((o) => (
                <tr key={o.id} className="border-t border-border hover:bg-surface-raised/40 cursor-pointer" onClick={() => setSelected(o)}>
                  <td className="px-4 py-3">
                    <StatusBadge status={o.status} />
                  </td>
                  <td className="px-4 py-3">{o.serial}</td>
                  <td className="px-4 py-3 text-muted">{o.oltName}</td>
                  <td className="px-4 py-3 text-muted">{o.ponPort}</td>
                  <td className={`px-4 py-3 ${signalClass(o.rxPowerDbm)}`}>{o.rxPowerDbm != null ? `${o.rxPowerDbm} dBm` : '—'}</td>
                  <td className="px-4 py-3 text-muted">{o.txPowerDbm != null ? `${o.txPowerDbm} dBm` : '—'}</td>
                  <td className="px-4 py-3 text-muted">{o.temperatureCelsius != null ? `${o.temperatureCelsius}°C` : '—'}</td>
                  <td className="px-4 py-3 text-muted">{o.distanceMeters != null ? `${o.distanceMeters} m` : '—'}</td>
                  <td className="px-4 py-3 text-muted">{o.lastSeenAt ? new Date(o.lastSeenAt).toLocaleString('es-DO') : '—'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {selected && (
        <div
          className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm"
          onClick={() => setSelected(null)}
        >
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-sm h-full bg-surface border-l border-border p-6 overflow-y-auto">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-2">
                <Radio size={16} className="text-signal" />
                <p className="font-display font-bold">{selected.serial}</p>
              </div>
              <button onClick={() => setSelected(null)} className="text-muted hover:text-ink" aria-label="Cerrar">
                <X size={16} />
              </button>
            </div>
            <div className="space-y-3 text-sm">
              <DetailRow label="Estado" value={<StatusBadge status={selected.status} />} />
              <DetailRow label="OLT" value={selected.oltName} />
              <DetailRow label="Puerto PON" value={selected.ponPort} />
              <DetailRow label="Modelo" value={selected.model ?? '—'} />
              <DetailRow label="MAC" value={selected.mac ?? '—'} />
              <DetailRow label="RX" value={selected.rxPowerDbm != null ? `${selected.rxPowerDbm} dBm` : '—'} valueClass={signalClass(selected.rxPowerDbm)} />
              <DetailRow label="TX" value={selected.txPowerDbm != null ? `${selected.txPowerDbm} dBm` : '—'} />
              <DetailRow label="Temperatura" value={selected.temperatureCelsius != null ? `${selected.temperatureCelsius}°C` : '—'} />
              <DetailRow label="Distancia" value={selected.distanceMeters != null ? `${selected.distanceMeters} m` : '—'} />
              <DetailRow label="Última vez en línea" value={selected.lastSeenAt ? new Date(selected.lastSeenAt).toLocaleString('es-DO') : '—'} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DetailRow({ label, value, valueClass }: { label: string; value: React.ReactNode; valueClass?: string }) {
  return (
    <div className="flex items-center justify-between border-b border-border pb-2">
      <span className="text-muted text-xs">{label}</span>
      <span className={valueClass}>{value}</span>
    </div>
  );
}
