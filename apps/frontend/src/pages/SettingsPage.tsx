import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { useUIStore, ACCENT_OPTIONS } from '../store/ui.store';
import { useToast } from '../components/Toast';

export function SettingsPage() {
  const [graceDays, setGraceDays] = useState('3');
  const [notifyDays, setNotifyDays] = useState('3');
  const [rxWarn, setRxWarn] = useState('-25');
  const [rxCritical, setRxCritical] = useState('-28');
  const accent = useUIStore((s) => s.accent);
  const setAccent = useUIStore((s) => s.setAccent);
  const toast = useToast();

  useEffect(() => {
    api.get('/settings').then((res) => {
      const s = res.data.suspension_rules;
      const t = res.data.optical_thresholds;
      if (s) { setGraceDays(String(s.graceDays)); setNotifyDays(String(s.notifyDaysBeforeDue)); }
      if (t) { setRxWarn(String(t.rxWarnDbm)); setRxCritical(String(t.rxCriticalDbm)); }
    });
  }, []);

  async function save() {
    try {
      await api.put('/settings/suspension_rules', { value: { graceDays: Number(graceDays), notifyDaysBeforeDue: Number(notifyDays) } });
      await api.put('/settings/optical_thresholds', { value: { rxWarnDbm: Number(rxWarn), rxCriticalDbm: Number(rxCritical) } });
      toast.success('Configuración guardada.');
    } catch {
      toast.error('No se pudo guardar la configuración.');
    }
  }

  return (
    <div className="p-8 max-w-lg space-y-5">
      <div>
        <h1 className="text-2xl font-display font-bold mb-1">Configuración</h1>
        <p className="text-muted text-sm">Reglas de negocio y apariencia del sistema.</p>
      </div>

      <div className="status-panel status-panel--neutral space-y-3">
        <p className="text-sm font-medium">Apariencia</p>
        <p className="text-xs text-muted">Color principal de la interfaz — se aplica al instante para todos tus usuarios en este navegador.</p>
        <div className="flex flex-wrap gap-2 pt-1">
          {ACCENT_OPTIONS.map((opt) => (
            <button
              key={opt.key}
              onClick={() => setAccent(opt.key)}
              className={`flex items-center gap-2 border rounded-md px-3 py-1.5 text-xs transition-colors ${
                accent === opt.key ? 'border-signal text-ink bg-surface-raised' : 'border-border text-muted hover:text-ink'
              }`}
            >
              <span
                className="h-3 w-3 rounded-full shrink-0"
                style={{ background: opt.key === 'teal' ? '#1FB6A6' : opt.key === 'indigo' ? '#6366F1' : opt.key === 'amber' ? '#E8A23D' : '#E1554F' }}
              />
              {opt.label}
            </button>
          ))}
        </div>
      </div>

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
          Guardar cambios
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
