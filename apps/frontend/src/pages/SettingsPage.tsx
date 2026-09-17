import { useEffect, useState } from 'react';
import { api } from '../lib/api';

export function SettingsPage() {
  const [graceDays, setGraceDays] = useState('3');
  const [notifyDays, setNotifyDays] = useState('3');
  const [rxWarn, setRxWarn] = useState('-25');
  const [rxCritical, setRxCritical] = useState('-28');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    api.get('/settings').then((res) => {
      const s = res.data.suspension_rules;
      const t = res.data.optical_thresholds;
      if (s) { setGraceDays(String(s.graceDays)); setNotifyDays(String(s.notifyDaysBeforeDue)); }
      if (t) { setRxWarn(String(t.rxWarnDbm)); setRxCritical(String(t.rxCriticalDbm)); }
    });
  }, []);

  async function save() {
    await api.put('/settings/suspension_rules', { value: { graceDays: Number(graceDays), notifyDaysBeforeDue: Number(notifyDays) } });
    await api.put('/settings/optical_thresholds', { value: { rxWarnDbm: Number(rxWarn), rxCriticalDbm: Number(rxCritical) } });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="p-8 max-w-lg">
      <h1 className="text-2xl font-display font-bold mb-1">Configuración</h1>
      <p className="text-muted text-sm mb-6">Reglas de negocio del sistema. El branding completo (logo, colores) se termina de exponer aquí en producción.</p>

      <div className="status-panel status-panel--neutral space-y-4">
        <p className="text-sm font-medium">Motor de suspensión</p>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Días de gracia" value={graceDays} onChange={setGraceDays} />
          <Field label="Avisar N días antes" value={notifyDays} onChange={setNotifyDays} />
        </div>

        <p className="text-sm font-medium pt-2 border-t border-border">Umbrales de señal óptica (configurables, no universales)</p>
        <div className="grid grid-cols-2 gap-3">
          <Field label="RX advertencia (dBm)" value={rxWarn} onChange={setRxWarn} />
          <Field label="RX crítico (dBm)" value={rxCritical} onChange={setRxCritical} />
        </div>

        <button onClick={save} className="bg-signal text-base text-sm font-medium rounded-md px-4 py-2">
          {saved ? 'Guardado ✓' : 'Guardar cambios'}
        </button>
      </div>
    </div>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="block text-xs text-muted mb-1">{label}</label>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-surface-raised border border-border rounded-md px-3 py-2 text-sm outline-none focus:border-signal"
      />
    </div>
  );
}
