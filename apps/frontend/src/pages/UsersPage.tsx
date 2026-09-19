import { FormEvent, useEffect, useState } from 'react';
import { Plus, UserCog } from 'lucide-react';
import { api } from '../lib/api';
import { useAuthStore } from '../store/auth.store';
import { useToast } from '../components/Toast';
import { useConfirm } from '../components/ConfirmDialog';
import { Modal } from '../components/Modal';

interface StaffUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  isActive: boolean;
  isDemo: boolean;
  lastLoginAt: string | null;
  roles: string[];
}

interface RoleOption {
  name: string;
  description: string | null;
  permissions: string[];
}

const ROLE_LABEL: Record<string, string> = {
  SUPER_ADMIN: 'Super administrador',
  ADMIN: 'Administrador',
  SOPORTE: 'Soporte',
  TECNICO: 'Técnico',
  FACTURACION: 'Facturación',
  MONITORING: 'Solo monitoreo',
};

const emptyForm = { firstName: '', lastName: '', email: '', password: '', role: 'TECNICO' };

const inputClass =
  'w-full bg-surface-raised border border-border rounded-md px-3 py-2 text-sm outline-none focus:border-signal transition-colors';

export function UsersPage() {
  const me = useAuthStore((s) => s.user);
  const toast = useToast();
  const confirm = useConfirm();

  const [users, setUsers] = useState<StaffUser[]>([]);
  const [roles, setRoles] = useState<RoleOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<StaffUser | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  async function load() {
    try {
      const [u, r] = await Promise.all([api.get('/users'), api.get('/users/roles')]);
      setUsers(u.data);
      setRoles(r.data);
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'No se pudieron cargar los usuarios.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function openCreate() {
    setEditing(null);
    setForm({ ...emptyForm, role: roles.find((r) => r.name === 'TECNICO') ? 'TECNICO' : roles[0]?.name ?? '' });
    setModalOpen(true);
  }

  function openEdit(u: StaffUser) {
    setEditing(u);
    setForm({ firstName: u.firstName, lastName: u.lastName, email: u.email, password: '', role: u.roles[0] ?? '' });
    setModalOpen(true);
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      if (editing) {
        const body: Record<string, unknown> = { firstName: form.firstName, lastName: form.lastName, role: form.role };
        if (form.password) body.password = form.password;
        await api.patch(`/users/${editing.id}`, body);
        toast.success('Usuario actualizado.');
      } else {
        await api.post('/users', form);
        toast.success(`Usuario ${form.email} creado.`);
      }
      setModalOpen(false);
      await load();
    } catch (err: any) {
      const msg = err?.response?.data?.message;
      toast.error(Array.isArray(msg) ? msg.join(' · ') : msg ?? 'No se pudo guardar el usuario.');
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(u: StaffUser) {
    const ok = await confirm({
      title: u.isActive ? `¿Desactivar a ${u.firstName}?` : `¿Reactivar a ${u.firstName}?`,
      description: u.isActive
        ? 'No podrá iniciar sesión hasta que lo reactives. Sus datos y su historial se conservan.'
        : 'Podrá volver a iniciar sesión con su contraseña actual.',
      confirmLabel: u.isActive ? 'Desactivar' : 'Reactivar',
      danger: u.isActive,
    });
    if (!ok) return;
    try {
      await api.patch(`/users/${u.id}`, { isActive: !u.isActive });
      toast.success(u.isActive ? 'Usuario desactivado.' : 'Usuario reactivado.');
      await load();
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'No se pudo cambiar el estado.');
    }
  }

  const selectedRole = roles.find((r) => r.name === form.role);

  return (
    <div className="p-8 max-w-5xl">
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-display font-bold mb-1">Usuarios</h1>
          <p className="text-muted text-sm">
            Tu equipo: quién puede entrar a esta cuenta y qué puede hacer según su rol.
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 bg-signal text-base text-sm font-medium rounded-md px-4 py-2 hover:opacity-90 transition-opacity shrink-0"
        >
          <Plus size={16} /> Nuevo usuario
        </button>
      </div>

      <div className="border border-border rounded-md overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-surface text-muted text-xs">
            <tr>
              <th className="text-left px-4 py-3">Usuario</th>
              <th className="text-left px-4 py-3">Rol</th>
              <th className="text-left px-4 py-3">Último acceso</th>
              <th className="text-left px-4 py-3">Estado</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={5} className="px-4 py-6 text-center text-muted">Cargando…</td></tr>
            )}
            {!loading && users.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-6 text-center text-muted">Todavía no hay usuarios.</td></tr>
            )}
            {users.map((u) => (
              <tr key={u.id} className="border-t border-border">
                <td className="px-4 py-3">
                  <p className="font-medium">
                    {u.firstName} {u.lastName}
                    {u.id === me?.id && <span className="ml-2 text-[10px] text-muted border border-border rounded px-1.5 py-0.5">tú</span>}
                  </p>
                  <p className="text-xs text-muted">{u.email}</p>
                </td>
                <td className="px-4 py-3">
                  {u.roles.map((r) => (
                    <span key={r} className="inline-flex items-center gap-1 bg-signal/10 text-signal border border-signal/30 rounded px-1.5 py-0.5 text-xs">
                      <UserCog size={11} /> {ROLE_LABEL[r] ?? r}
                    </span>
                  ))}
                </td>
                <td className="px-4 py-3 text-muted">
                  {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString('es') : 'Nunca'}
                </td>
                <td className="px-4 py-3">
                  <span className={u.isActive ? 'text-ok' : 'text-critical'}>{u.isActive ? 'Activo' : 'Inactivo'}</span>
                </td>
                <td className="px-4 py-3 text-right whitespace-nowrap">
                  <button onClick={() => openEdit(u)} className="text-xs text-signal hover:underline mr-4">Editar</button>
                  {u.id !== me?.id && (
                    <button onClick={() => toggleActive(u)} className="text-xs text-muted hover:text-ink hover:underline">
                      {u.isActive ? 'Desactivar' : 'Reactivar'}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modalOpen && (
        <Modal
          title={editing ? 'Editar usuario' : 'Nuevo usuario'}
          subtitle={editing ? editing.email : 'Le darás su correo y una contraseña inicial.'}
          onClose={() => setModalOpen(false)}
        >
          <form onSubmit={submit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm text-muted mb-1.5">Nombre</label>
                <input required minLength={2} className={inputClass} value={form.firstName}
                  onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm text-muted mb-1.5">Apellido</label>
                <input required minLength={2} className={inputClass} value={form.lastName}
                  onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))} />
              </div>
            </div>

            <div>
              <label className="block text-sm text-muted mb-1.5">Correo</label>
              <input required type="email" disabled={!!editing} className={`${inputClass} disabled:opacity-60`} value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
            </div>

            <div>
              <label className="block text-sm text-muted mb-1.5">Rol</label>
              <select required className={inputClass} value={form.role}
                onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}>
                {roles.map((r) => (
                  <option key={r.name} value={r.name}>{ROLE_LABEL[r.name] ?? r.name}</option>
                ))}
              </select>
              {selectedRole && (
                <p className="text-xs text-muted mt-1.5">
                  {selectedRole.description}. Permisos: {selectedRole.permissions.length}.
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm text-muted mb-1.5">
                {editing ? 'Nueva contraseña (déjala vacía para no cambiarla)' : 'Contraseña inicial'}
              </label>
              <input
                type="password"
                required={!editing}
                minLength={8}
                autoComplete="new-password"
                className={inputClass}
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              />
              <p className="text-xs text-muted mt-1.5">Mínimo 8 caracteres.{editing && ' Al cambiarla se cierran sus sesiones abiertas.'}</p>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setModalOpen(false)} className="text-sm text-muted hover:text-ink px-4 py-2">
                Cancelar
              </button>
              <button type="submit" disabled={saving} className="bg-signal text-base text-sm font-medium rounded-md px-5 py-2 disabled:opacity-50">
                {saving ? 'Guardando…' : editing ? 'Guardar cambios' : 'Crear usuario'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
