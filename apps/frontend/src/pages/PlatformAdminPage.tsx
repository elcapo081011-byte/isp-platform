import { useEffect, useState } from 'react';
import { api } from '../lib/api';

export function PlatformAdminPage() {
  const [orgs, setOrgs] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);

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

  return (
    <div className="p-8 max-w-5xl">
      <h1 className="text-2xl font-display font-bold mb-1">Plataforma — todas las cuentas</h1>
      <p className="text-muted text-sm mb-6">
        Solo tú ves esta página. Cada fila es un ISP con su propia cuenta aislada.
      </p>

      {summary && (
        <div className="grid grid-cols-4 gap-4 mb-6">
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
                  <p className="font-medium">{o.name}</p>
                  <p className="text-xs text-muted">{o.slug}</p>
                </td>
                <td className="px-4 py-3 text-muted">{o.plan}</td>
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
    </div>
  );
}
