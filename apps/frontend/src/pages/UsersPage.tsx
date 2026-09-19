import { FormEvent, useEffect, useState } from 'react';
import { Plus, X, UserPlus } from 'lucide-react';
import { api } from '../lib/api';
import { useToast } from '../components/Toast';
import { useAuthStore } from '../store/auth.store';

interface Role {
  id: string;
  name: string;
  description: string | null;
}

interface OrgUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  isActive: boolean;
  lastLoginAt: string | null;
  roles: string[];
}

function fieldClass() {
  return 'w-full bg-surface-raised border border-border rounded-md px-3 py-2 text-sm outline-none focus:border-signal transition-colors';
}
function labelClass() {
  return 'block text-xs text-muted mb-1.5';
}

const EMPTY_FORM = { firstName: '', lastName: '', email: '', password: '', roleIds: [] as string[] };

export function UsersPage() {
  const [users, setUsers] = useState<OrgUser[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const me = useAuthStore((s) => s.user);
  const toast = useToast();

  async function load() {
    setLoading(true);
    try {
      const [usersRes, rolesRes] = await Promise.all([api.get('/users'), api.get('/users/roles')]);
      setUsers(usersRes.data);
      setRoles(rolesRes.data);
    } catch (err: any) {
      if (err?.response?.status === 403) setForbidden(true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  function openCreate() {
    setForm(EMPTY_FORM);
    setError(null);
    setModalOpen(true);
  }

  function toggleRole(roleId: string) {
    setForm((f) => ({
      ...f,
      roleIds: f.roleIds.includes(roleId) ? f.roleIds.filter((r) => r !== roleId) : [...f.roleIds, roleId],
    }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await api.post('/users', form);
      toast.success('Usuario creado.');
      setModalOpen(false);
      await load();
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'No se pudo crear el usuario.');
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(u: OrgUser) {
    try {
      await api.patch(`/users/${u.id}/active`, { isActive: !u.isActive });
      await load();
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'No se pudo actualizar el usuario.');
    }
  }

  if (forbidden) {
    return (
      <div className="p-8 max-w-2xl">
        <h1 className="text-2xl font-display font-bold mb-1">Usuarios</h1>
        <div className="status-panel status-panel--warn mt-4 text-sm">
          Tu usuario no tiene el permiso <code className="text-xs">users.manage</code> — pídele a quien tenga el rol
          SUPER_ADMIN o ADMIN en tu cuenta que te dé acceso, o entra con ese usuario para gestionar el equipo.
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl page-enter">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-display font-bold mb-1">Usuarios</h1>
          <p className="text-muted text-sm max-w-lg">
            Cuentas con acceso a tu ISP (técnicos, soporte, otros administradores). Cada uno ve solo lo que su rol permite.
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 bg-signal text-base text-sm font-medium rounded-md px-4 py-2 hover:opacity-90 transition-opacity shrink-0"
        >
          <Plus size={16} /> Nuevo usuario
        </button>
      </div>

      {loading ? (
        <p className="text-muted text-sm">Cargando usuarios…</p>
      ) : (
        <div className="border border-border rounded-md overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-surface text-muted text-xs">
              <tr>
                <th className="text-left px-4 py-3">Usuario</th>
                <th className="text-left px-4 py-3">Roles</th>
                <th className="text-left px-4 py-3">Último acceso</th>
                <th className="text-left px-4 py-3">Estado</th>
                <th className="text-left px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-t border-border">
                  <td className="px-4 py-3">
                    <p className="font-medium">{u.firstName} {u.lastName}</p>
                    <p className="text-xs text-muted">{u.email}</p>
                  </td>
                  <td className="px-4 py-3 text-muted">{u.roles.join(', ') || '—'}</td>
                  <td className="px-4 py-3 text-muted">{u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString('es') : 'Nunca'}</td>
                  <td className="px-4 py-3">
                    <span className={u.isActive ? 'text-ok' : 'text-critical'}>{u.isActive ? 'Activo' : 'Desactivado'}</span>
                  </td>
                  <td className="px-4 py-3">
                    {u.id !== me?.id && (
                      <button onClick={() => toggleActive(u)} className="text-xs text-signal hover:underline">
                        {u.isActive ? 'Desactivar' : 'Reactivar'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 backdrop-blur-sm p-6 pt-[6vh]"
          onClick={() => setModalOpen(false)}
        >
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md bg-surface border border-border rounded-lg shadow-2xl">
            <div className="flex items-start justify-between border-b border-border px-6 py-4">
              <div>
                <h2 className="font-display font-bold text-lg flex items-center gap-2"><UserPlus size={18} /> Nuevo usuario</h2>
                <p className="text-xs text-muted mt-0.5">Se creará solo dentro de tu organización.</p>
              </div>
              <button onClick={() => setModalOpen(false)} className="text-muted hover:text-ink p-1 -mr-1 -mt-1" aria-label="Cerrar">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
              {error && <div className="status-panel status-panel--critical text-sm text-critical py-2.5">{error}</div>}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass()}>Nombre</label>
                  <input required value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} className={fieldClass()} />
                </div>
                <div>
                  <label className={labelClass()}>Apellido</label>
                  <input required value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} className={fieldClass()} />
                </div>
              </div>

              <div>
                <label className={labelClass()}>Correo</label>
                <input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={fieldClass()} />
              </div>

              <div>
                <label className={labelClass()}>Contraseña temporal</label>
                <input required type="text" minLength={8} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className={fieldClass()} placeholder="Mínimo 8 caracteres" />
              </div>

              <div>
                <label className={labelClass()}>Roles</label>
                <div className="space-y-1.5 max-h-40 overflow-y-auto border border-border rounded-md p-2">
                  {roles.map((r) => (
                    <label key={r.id} className="flex items-center gap-2 text-sm cursor-pointer">
                      <input type="checkbox" checked={form.roleIds.includes(r.id)} onChange={() => toggleRole(r.id)} />
                      <span>{r.name}</span>
                      {r.description && <span className="text-xs text-muted">— {r.description}</span>}
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setModalOpen(false)} className="text-sm px-4 py-2 text-muted hover:text-ink">
                  Cancelar
                </button>
                <button type="submit" disabled={saving} className="bg-signal text-base text-sm font-medium rounded-md px-4 py-2 hover:opacity-90 transition-opacity disabled:opacity-50">
                  {saving ? 'Creando…' : 'Crear usuario'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
