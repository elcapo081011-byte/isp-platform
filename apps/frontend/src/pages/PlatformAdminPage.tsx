import { FormEvent, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { api } from '../lib/api';
import { useToast } from '../components/Toast';
import { Modal } from '../components/Modal';

interface OrgRow {
  id: string;
  name: string;
  slug: string;
  plan: string;
  isActive: boolean;
  isInternal: boolean;
  trialEndsAt: string | null;
  createdAt: string;
  customersCount: number;
  usersCount: number;
  routersCount: number;
  oltsCount: number;
  owner: { email: string; firstName: string; lastName: string } | null;
}

const emptyForm = { organizationName: '', slug: '', firstName: '', lastName: '', email: '', password: '' };
const inputClass =
  'w-full bg-surface-raised border border-border rounded-md px-3 py-2 text-sm outline-none focus:border-signal transition-colors';

export function PlatformAdminPage() {
  const [orgs, setOrgs] = useState<OrgRow[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  async function load() {
    const [orgsRes, summaryRes] = await Promise.all([api.get('/platform/organizations'), api.get('/platform/summary')]);
    setOrgs(orgsRes.data.filter((o: OrgRow) => !o.isInternal));
    setSummary(summaryRes.data);
  }

  useEffect(() => {
    load().catch((err) => toast.error(err?.response?.data?.message ?? 'No se pudo cargar el panel.'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function toggle(id: string, isActive: boolean) {
    try {
      await api.post(`/platform/organizations/${id}/${isActive ? 'suspend' : 'activate'}`);
      await load();
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'No se pudo cambiar el estado de la cuenta.');
    }
  }

  async function createOrg(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/platform/organizations', form);
      toast.success(`Cuenta "${form.organizationName}" creada. Su dueño ya puede entrar con ${form.email}.`);
      setModalOpen(false);
      setForm(emptyForm);
      await load();
    } catch (err: any) {
      const msg = err?.response?.data?.message;
      toast.error(Array.isArray(msg) ? msg.join(' · ') : msg ?? 'No se pudo crear la cuenta.');
    } finally {
      setSaving(false);
    }
  }

  function field(key: keyof typeof emptyForm) {
    return { value: form[key], onChange: (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [key]: e.target.value })) };
  }

  return (
    <div className="p-8 max-w-6xl">
      <div className="flex items-start justify-between gap-4 mb-1">
        <h1 className="text-2xl font-display font-bold">Cuentas de ISP</h1>
        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-2 bg-signal text-base text-sm font-medium rounded-md px-4 py-2 hover:opacity-90 transition-opacity shrink-0"
        >
          <Plus size={16} /> Nueva cuenta
        </button>
      </div>
      <p className="text-muted text-sm mb-6">
        Solo tú ves esta página. Cada fila es un ISP con su propia cuenta aislada.{' '}
        <Link to="/platform/facturacion" className="text-signal hover:underline">Ver cobros y suscripciones →</Link>
      </p>

      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <div className="status-panel status-panel--neutral">
            <p className="text-xs text-muted mb-1">Cuentas de ISP</p>
            <p className="text-2xl font-display font-bold">{summary.totalOrganizations}</p>
          </div>
          <div className="status-panel status-panel--ok">
            <p className="text-xs text-muted mb-1">Activas</p>
            <p className="text-2xl font-display font-bold">{summary.activeOrganizations}</p>
          </div>
          <div className="status-panel status-panel--neutral">
            <p className="text-xs text-muted mb-1">Clientes (todas)</p>
            <p className="text-2xl font-display font-bold">{summary.totalCustomersAcrossAllOrgs}</p>
          </div>
          <div className="status-panel status-panel--neutral">
            <p className="text-xs text-muted mb-1">Usuarios (todas)</p>
            <p className="text-2xl font-display font-bold">{summary.totalUsersAcrossAllOrgs}</p>
          </div>
        </div>
      )}

      <div className="border border-border rounded-md overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-surface text-muted text-xs">
            <tr>
              <th className="text-left px-4 py-3">Organización</th>
              <th className="text-left px-4 py-3">Dueño</th>
              <th className="text-left px-4 py-3">Plan</th>
              <th className="text-left px-4 py-3">Clientes</th>
              <th className="text-left px-4 py-3">Usuarios</th>
              <th className="text-left px-4 py-3">Routers/OLT</th>
              <th className="text-left px-4 py-3">Estado</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {orgs.length === 0 && (
              <tr><td colSpan={8} className="px-4 py-6 text-center text-muted">Aún no hay cuentas de ISP registradas.</td></tr>
            )}
            {orgs.map((o) => (
              <tr key={o.id} className="border-t border-border">
                <td className="px-4 py-3">
                  <p className="font-medium">{o.name}</p>
                  <p className="text-xs text-muted">{o.slug}</p>
                </td>
                <td className="px-4 py-3 text-muted">
                  {o.owner ? (
                    <>
                      <p className="text-ink">{o.owner.firstName} {o.owner.lastName}</p>
                      <p className="text-xs">{o.owner.email}</p>
                    </>
                  ) : '—'}
                </td>
                <td className="px-4 py-3 text-muted">
                  {o.plan}
                  {o.plan === 'TRIAL' && o.trialEndsAt && (
                    <p className="text-xs">hasta {new Date(o.trialEndsAt).toLocaleDateString('es')}</p>
                  )}
                </td>
                <td className="px-4 py-3">{o.customersCount}</td>
                <td className="px-4 py-3">{o.usersCount}</td>
                <td className="px-4 py-3 text-muted">{o.routersCount} / {o.oltsCount}</td>
                <td className="px-4 py-3">
                  <span className={o.isActive ? 'text-ok' : 'text-critical'}>{o.isActive ? 'Activa' : 'Suspendida'}</span>
                </td>
                <td className="px-4 py-3">
                  <button onClick={() => toggle(o.id, o.isActive)} className="text-xs text-signal hover:underline">
                    {o.isActive ? 'Suspender' : 'Reactivar'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modalOpen && (
        <Modal
          title="Nueva cuenta de ISP"
          subtitle="Crea la organización y a su dueño (rol Super administrador). Él entra con este correo y contraseña."
          onClose={() => setModalOpen(false)}
        >
          <form onSubmit={createOrg} className="space-y-4">
            <div>
              <label className="block text-sm text-muted mb-1.5">Nombre de la empresa</label>
              <input required minLength={2} className={inputClass} {...field('organizationName')} />
            </div>
            <div>
              <label className="block text-sm text-muted mb-1.5">Identificador único</label>
              <input required minLength={2} placeholder="ej. fibraveloz" className={inputClass} {...field('slug')} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm text-muted mb-1.5">Nombre del dueño</label>
                <input required minLength={2} className={inputClass} {...field('firstName')} />
              </div>
              <div>
                <label className="block text-sm text-muted mb-1.5">Apellido</label>
                <input required minLength={2} className={inputClass} {...field('lastName')} />
              </div>
            </div>
            <div>
              <label className="block text-sm text-muted mb-1.5">Correo del dueño</label>
              <input required type="email" className={inputClass} {...field('email')} />
            </div>
            <div>
              <label className="block text-sm text-muted mb-1.5">Contraseña inicial</label>
              <input required type="password" minLength={8} autoComplete="new-password" className={inputClass} {...field('password')} />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setModalOpen(false)} className="text-sm text-muted hover:text-ink px-4 py-2">Cancelar</button>
              <button type="submit" disabled={saving} className="bg-signal text-base text-sm font-medium rounded-md px-5 py-2 disabled:opacity-50">
                {saving ? 'Creando…' : 'Crear cuenta'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
