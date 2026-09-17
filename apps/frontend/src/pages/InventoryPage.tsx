import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { StatusBadge } from '../components/StatusBadge';

export function InventoryPage() {
  const [items, setItems] = useState<any[]>([]);

  useEffect(() => { api.get('/inventory').then((res) => setItems(res.data)); }, []);

  return (
    <div className="p-8 max-w-5xl">
      <h1 className="text-2xl font-display font-bold mb-1">Inventario</h1>
      <p className="text-muted text-sm mb-6">ONU, routers, OLT, SFP, fibra, splitters, NAP y más — con movimientos auditados.</p>

      <div className="border border-border rounded-md overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-surface text-muted text-xs">
            <tr>
              <th className="text-left px-4 py-3">Item</th>
              <th className="text-left px-4 py-3">Categoría</th>
              <th className="text-left px-4 py-3">Serial</th>
              <th className="text-left px-4 py-3">Estado</th>
            </tr>
          </thead>
          <tbody>
            {items.map((i) => (
              <tr key={i.id} className="border-t border-border">
                <td className="px-4 py-3">{i.name}</td>
                <td className="px-4 py-3 text-muted">{i.category}</td>
                <td className="px-4 py-3 text-muted">{i.serial ?? '—'}</td>
                <td className="px-4 py-3"><StatusBadge status={i.status} /></td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr><td colSpan={4} className="px-4 py-6 text-center text-muted">Sin artículos registrados.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
