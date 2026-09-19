import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';

export function PlatformAdminPage() {
  const [orgs, setOrgs] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editPlan, setEditPlan] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const [orgsRes, summaryRes] = await Promise.all([
      api.get('/platform/organizations'),
      api.get('/platform/summary'),
    ]);
    setOrgs(orgsRes.data);
    setSummary(summaryRes.data);
  }

  useEffect(() => { load(); }, []);

  async function toggle(id: string, isActive: boolean) {
    await api.post(`/platform/organizations/${id}/${isActive ? 'suspend' : 'activate'}`);
    await load();
  }

  function startEdit(o: any) {
    setError(null);
    setEditingId(o.id);
    setEditName(o.name);
    setEditPlan(o.plan);
  }

  function cancelEdit() {
    setEditingId(null);
    setError(null);
  }

  async function saveEdit(id: string) {
    setError(null);
    try {
      await api.patch(`/platform/organizations/${id}`, { name: editName, plan: editPlan });
      setEditingId(null);
      await load();
    } catch (e: any) {
      setError(e?.response?.data?.message || 'No se pudo guardar el cambio.');
    }
  }

  async function remove(o: any) {
    const confirmed = window.confirm(
      `¿Eliminar "${o.name}" (${o.slug}) permanentemente?\n\nEsto borra TODOS sus clientes, usuarios, facturas, routers y OLT. No se puede deshacer.`,
    );
    if (!confirmed) return;
    setError(null);
    try {
      await api.delete(`/platform/organizations/${o.id}`);
      await load();
    } catch (e: any) {
      setError(e?.response?.data?.message || 'No se pudo eliminar la organización.');
    }
  }

  return (
    <div className="p-8 max-w-5xl">
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-2xl font-display font-bold">Plataforma — todas las cuentas</h1>
        <Link to="/platform/facturacion" className="text-sm text-signal hover:underline">Ver cobros de la plataforma →</Link>
      </div>
      <p className="text-muted text-sm mb-6">
        Solo tú ves esta página. Cada fila es un ISP con su propia cuenta aislada.
      </p>

      {error && (
        <div className="status-panel status-panel--critical mb-4 text-sm">
          {error}
        </div>
      )}

      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <div className="status-panel status-panel--neutral">
            <p className="text-xs text-muted mb-1">Organizaciones</p>
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

      <div className="border border-border rounded-md overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-surface text-muted text-xs">
            <tr>
              <th className="text-left px-4 py-3">Organización</th>
              <th className="text-left px-4 py-3">Plan</th>
              <th className="text-left px-4 py-3">Clientes</th>
              <th className="text-left px-4 py-3">Usuarios</th>
              <th className="text-left px-4 py-3">Routers/OLT</th>
              <th className="text-left px-4 py-3">Estado</th>
              <th className="text-left px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {orgs.map((o) => (
              <tr key={o.id} className="border-t border-border">
                <td className="px-4 py-3">
                  {editingId === o.id ? (
                    <input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="bg-surface border border-border rounded px-2 py-1 text-sm w-full"
                    />
                  ) : (
                    <p className="font-medium">{o.name}</p>
                  )}
                  <p className="text-xs text-muted">{o.slug}</p>
                </td>
                <td className="px-4 py-3 text-muted">
                  {editingId === o.id ? (
                    <select
                      value={editPlan}
                      onChange={(e) => setEditPlan(e.target.value)}
                      className="bg-surface border border-border rounded px-2 py-1 text-sm"
                    >
                      <option value="TRIAL">TRIAL</option>
                      <option value="BASIC">BASIC</option>
                      <option value="PRO">PRO</option>
                    </select>
                  ) : (
                    o.plan
                  )}
                </td>
                <td className="px-4 py-3">{o.customersCount}</td>
                <td className="px-4 py-3">{o.usersCount}</td>
                <td className="px-4 py-3 text-muted">{o.routersCount} / {o.oltsCount}</td>
                <td className="px-4 py-3">
                  <span className={o.isActive ? 'text-ok' : 'text-critical'}>{o.isActive ? 'Activa' : 'Suspendida'}</span>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  {editingId === o.id ? (
                    <>
                      <button onClick={() => saveEdit(o.id)} className="text-xs text-ok hover:underline mr-3">
                        Guardar
                      </button>
                      <button onClick={cancelEdit} className="text-xs text-muted hover:underline">
                        Cancelar
                      </button>
                    </>
                  ) : (
                    <>
                      <button onClick={() => toggle(o.id, o.isActive)} className="text-xs text-signal hover:underline mr-3">
                        {o.isActive ? 'Suspender' : 'Reactivar'}
                      </button>
                      <button onClick={() => startEdit(o)} className="text-xs text-signal hover:underline mr-3">
                        Editar
                      </button>
                      <button onClick={() => remove(o)} className="text-xs text-critical hover:underline">
                        Eliminar
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
