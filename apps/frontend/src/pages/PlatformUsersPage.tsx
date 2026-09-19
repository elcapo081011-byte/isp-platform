import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import { api } from '../lib/api';
import { useToast } from '../components/Toast';
import { Modal } from '../components/Modal';

interface PlatformUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  isActive: boolean;
  isPlatformAdmin: boolean;
  isDemo: boolean;
  lastLoginAt: string | null;
  organization: { id: string; name: string; slug: string };
  roles: string[];
}

interface OrgOption {
  id: string;
  name: string;
  isInternal: boolean;
}

const ROLES = ['SUPER_ADMIN', 'ADMIN', 'SOPORTE', 'TECNICO', 'FACTURACION', 'MONITORING'];
const emptyForm = { organizationId: '', firstName: '', lastName: '', email: '', password: '', role: 'ADMIN' };
const inputClass =
  'w-full bg-surface-raised border border-border rounded-md px-3 py-2 text-sm outline-none focus:border-signal transition-colors';

export function PlatformUsersPage() {
  const [users, setUsers] = useState<PlatformUser[]>([]);
  const [orgs, setOrgs] = useState<OrgOption[]>([]);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  async function load() {
    const [u, o] = await Promise.all([api.get('/platform/users'), api.get('/platform/organizations')]);
    setUsers(u.data);
    setOrgs(o.data.filter((x: OrgOption) => !x.isInternal));
  }

  useEffect(() => {
    load().catch((err) => toast.error(err?.response?.data?.message ?? 'No se pudieron cargar los usuarios.'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) => `${u.firstName} ${u.lastName} ${u.email} ${u.organization.name}`.toLowerCase().includes(q));
  }, [users, search]);

  async function create(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const { organizationId, ...body } = form;
      await api.post(`/platform/organizations/${organizationId}/users`, body);
      toast.success(`Usuario ${form.email} creado.`);
      setModalOpen(false);
      setForm(emptyForm);
      await load();
    } catch (err: any) {
      const msg = err?.response?.data?.message;
      toast.error(Array.isArray(msg) ? msg.join(' · ') : msg ?? 'No se pudo crear el usuario.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-8 max-w-6xl">
      <div className="flex items-start justify-between gap-4 mb-1">
        <h1 className="text-2xl font-display font-bold">Usuarios de todas las cuentas</h1>
        <button
          onClick={() => setModalOpen(true)}
          disabled={orgs.length === 0}
          className="flex items-center gap-2 bg-signal text-base text-sm font-medium rounded-md px-4 py-2 hover:opacity-90 transition-opacity shrink-0 disabled:opacity-50"
        >
          <Plus size={16} /> Nuevo usuario
        </button>
      </div>
      <p className="text-muted text-sm mb-4">
        Cada usuario pertenece a un ISP. Aquí puedes ver a todos y dar de alta a alguien en la cuenta que elijas
        (útil para soporte o si un dueño perdió el acceso).
      </p>

      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Buscar por nombre, correo o empresa…"
        className={`${inputClass} max-w-sm mb-4`}
      />

      <div className="border border-border rounded-md overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-surface text-muted text-xs">
            <tr>
              <th className="text-left px-4 py-3">Usuario</th>
              <th className="text-left px-4 py-3">Empresa</th>
              <th className="text-left px-4 py-3">Rol</th>
              <th className="text-left px-4 py-3">Último acceso</th>
              <th className="text-left px-4 py-3">Estado</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-6 text-center text-muted">Sin resultados.</td></tr>
            )}
            {filtered.map((u) => (
              <tr key={u.id} className="border-t border-border">
                <td className="px-4 py-3">
                  <p className="font-medium">{u.firstName} {u.lastName}</p>
                  <p className="text-xs text-muted">{u.email}</p>
                </td>
                <td className="px-4 py-3 text-muted">{u.organization.name}</td>
                <td className="px-4 py-3 text-muted">
                  {u.isPlatformAdmin ? <span className="text-signal">Dueño de la plataforma</span> : u.roles.join(', ') || '—'}
                  {u.isDemo && <span className="ml-2 text-[10px] border border-border rounded px-1.5 py-0.5">demo</span>}
                </td>
                <td className="px-4 py-3 text-muted">{u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString('es') : 'Nunca'}</td>
                <td className="px-4 py-3">
                  <span className={u.isActive ? 'text-ok' : 'text-critical'}>{u.isActive ? 'Activo' : 'Inactivo'}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modalOpen && (
        <Modal title="Nuevo usuario" subtitle="Se crea dentro de la cuenta de ISP que elijas." onClose={() => setModalOpen(false)}>
          <form onSubmit={create} className="space-y-4">
            <div>
              <label className="block text-sm text-muted mb-1.5">Cuenta de ISP</label>
              <select required className={inputClass} value={form.organizationId} onChange={(e) => setForm((f) => ({ ...f, organizationId: e.target.value }))}>
                <option value="">Elige una cuenta…</option>
                {orgs.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm text-muted mb-1.5">Nombre</label>
                <input required minLength={2} className={inputClass} value={form.firstName} onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm text-muted mb-1.5">Apellido</label>
                <input required minLength={2} className={inputClass} value={form.lastName} onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))} />
              </div>
            </div>
            <div>
              <label className="block text-sm text-muted mb-1.5">Correo</label>
              <input required type="email" className={inputClass} value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
            </div>
            <div>
              <label className="block text-sm text-muted mb-1.5">Rol</label>
              <select className={inputClass} value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}>
                {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm text-muted mb-1.5">Contraseña inicial</label>
              <input required type="password" minLength={8} autoComplete="new-password" className={inputClass} value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setModalOpen(false)} className="text-sm text-muted hover:text-ink px-4 py-2">Cancelar</button>
              <button type="submit" disabled={saving} className="bg-signal text-base text-sm font-medium rounded-md px-5 py-2 disabled:opacity-50">
                {saving ? 'Creando…' : 'Crear usuario'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
