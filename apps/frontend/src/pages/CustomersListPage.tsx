import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Search, Plus } from 'lucide-react';
import { api } from '../lib/api';
import { Customer } from '../lib/types';
import { StatusBadge } from '../components/StatusBadge';

export function CustomersListPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [items, setItems] = useState<Customer[]>([]);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState(searchParams.get('status') ?? '');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setLoading(true);
      api
        .get('/customers', { params: { search: search || undefined, status: status || undefined } })
        .then((res) => setItems(res.data.items))
        .finally(() => setLoading(false));
    }, 300);
    return () => clearTimeout(timeout);
  }, [search, status]);

  return (
    <div className="p-8 max-w-7xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-display font-bold mb-1">Clientes</h1>
          <p className="text-muted text-sm">Busca por nombre, documento, teléfono o usuario PPPoE.</p>
        </div>
        <button
          onClick={() => navigate('/clientes/nuevo')}
          className="flex items-center gap-2 bg-signal text-base text-sm font-medium rounded-md px-4 py-2 hover:opacity-90 transition-opacity"
        >
          <Plus size={16} /> Nuevo cliente
        </button>
      </div>

      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar cliente..."
            className="w-full bg-surface border border-border rounded-md pl-9 pr-3 py-2 text-sm outline-none focus:border-signal"
          />
        </div>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="bg-surface border border-border rounded-md px-3 py-2 text-sm outline-none focus:border-signal"
        >
          <option value="">Todos los estados</option>
          <option value="ACTIVE">Activo</option>
          <option value="SUSPENDED">Suspendido</option>
          <option value="DISCONNECTED">Desconectado</option>
          <option value="PENDING_INSTALLATION">Por instalar</option>
        </select>
      </div>

      <div className="border border-border rounded-md overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-surface text-muted text-xs">
            <tr>
              <th className="text-left px-4 py-3 font-medium">Cliente</th>
              <th className="text-left px-4 py-3 font-medium">Plan</th>
              <th className="text-left px-4 py-3 font-medium">Usuario PPPoE</th>
              <th className="text-left px-4 py-3 font-medium">Técnico</th>
              <th className="text-left px-4 py-3 font-medium">Estado</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="px-4 py-6 text-center text-muted">Cargando...</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-6 text-center text-muted">Sin resultados</td></tr>
            ) : (
              items.map((c) => (
                <tr
                  key={c.id}
                  onClick={() => navigate(`/clientes/${c.id}`)}
                  className="border-t border-border hover:bg-surface-raised/50 cursor-pointer transition-colors"
                >
                  <td className="px-4 py-3">
                    <p className="font-medium">{c.firstName} {c.lastName}</p>
                    <p className="text-xs text-muted">{c.documentId ?? '—'} · {c.phone ?? 'sin teléfono'}</p>
                  </td>
                  <td className="px-4 py-3">{c.services[0]?.plan?.name ?? '—'}</td>
                  <td className="px-4 py-3 text-muted">{c.services[0]?.pppoeUsername ?? '—'}</td>
                  <td className="px-4 py-3 text-muted">
                    {c.technician ? `${c.technician.firstName} ${c.technician.lastName}` : '—'}
                  </td>
                  <td className="px-4 py-3"><StatusBadge status={c.status} /></td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
