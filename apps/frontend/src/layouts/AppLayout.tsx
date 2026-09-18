import { useEffect, useRef, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Users, Wifi, FileText, Router, Radio, Boxes,
  Map as MapIcon, Activity, Ticket, Archive, BarChart3, Settings, LogOut,
  ChevronLeft, ChevronRight, Search, Bell, Building2, X, Menu, CreditCard,
} from 'lucide-react';
import { Logomark } from '../components/Logomark';
import { useAuthStore } from '../store/auth.store';
import { useUIStore } from '../store/ui.store';
import { api } from '../lib/api';
import { Customer } from '../lib/types';

interface NavItem {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  live: boolean;
  badgeKey?: string;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const NAV: NavGroup[] = [
  { label: '', items: [{ to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, live: true }] },
  {
    label: 'Clientes',
    items: [
      { to: '/clientes', label: 'Todos', icon: Users, live: true },
      { to: '/clientes?status=ACTIVE', label: 'Activos', icon: Users, live: true },
      { to: '/clientes?status=SUSPENDED', label: 'Suspendidos', icon: Users, live: true },
    ],
  },
  {
    label: 'Servicios',
    items: [{ to: '/planes', label: 'Planes', icon: Wifi, live: true }],
  },
  {
    label: 'Red',
    items: [
      { to: '/mikrotik', label: 'MikroTik', icon: Router, live: true },
      { to: '/olt', label: 'OLT', icon: Radio, live: true },
      { to: '/onu', label: 'ONU / ONT', icon: Boxes, live: true },
      { to: '/mapa', label: 'NAP / Mapa', icon: MapIcon, live: true },
    ],
  },
  {
    label: 'Facturación',
    items: [{ to: '/facturacion', label: 'Facturas y pagos', icon: FileText, live: true, badgeKey: 'invoicesOverdue' }],
  },
  {
    label: 'Monitoreo',
    items: [{ to: '/monitoreo', label: 'NOC', icon: Activity, live: true }],
  },
  {
    label: 'Soporte',
    items: [
      { to: '/tickets', label: 'Tickets', icon: Ticket, live: true, badgeKey: 'openTickets' },
      { to: '/tecnicos', label: 'Técnicos', icon: Users, live: false },
    ],
  },
  {
    label: 'Gestión',
    items: [
      { to: '/inventario', label: 'Inventario', icon: Archive, live: true },
      { to: '/reportes', label: 'Reportes', icon: BarChart3, live: false },
      { to: '/auditoria', label: 'Auditoría', icon: Building2, live: false },
    ],
  },
  {
    label: '',
    items: [
      { to: '/suscripcion', label: 'Mi suscripción', icon: CreditCard, live: true },
      { to: '/settings', label: 'Configuración', icon: Settings, live: true },
    ],
  },
];

interface Metric {
  value: number | null;
  source: string;
}
type Summary = Record<string, Metric>;

export function AppLayout() {
  const user = useAuthStore((s) => s.user);
  const clearSession = useAuthStore((s) => s.clearSession);
  const collapsed = useUIStore((s) => s.sidebarCollapsed);
  const toggleSidebar = useUIStore((s) => s.toggleSidebar);
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const [summary, setSummary] = useState<Summary | null>(null);
  useEffect(() => {
    api.get('/dashboard/summary').then((res) => setSummary(res.data)).catch(() => {});
  }, []);

  function badgeFor(key?: string): number {
    if (!key || !summary?.[key]?.value) return 0;
    return summary[key]!.value as number;
  }

  const alertCount = badgeFor('invoicesOverdue') + badgeFor('openTickets');

  return (
    <div className="min-h-screen flex">
      {mobileOpen && (
        <div className="fixed inset-0 z-30 bg-black/60 md:hidden" onClick={() => setMobileOpen(false)} />
      )}

      <aside
        className={`shrink-0 bg-surface border-r border-border flex flex-col transition-[width,transform] duration-150 fixed inset-y-0 left-0 z-40 md:static md:translate-x-0 ${
          collapsed ? 'md:w-16' : 'md:w-64'
        } w-64 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className={`h-16 flex items-center gap-2 border-b border-border shrink-0 ${collapsed ? 'md:justify-center md:px-0' : ''} px-5`}>
          <Logomark size={22} />
          <span className={`font-display font-extrabold tracking-tight truncate ${collapsed ? 'md:hidden' : ''}`}>ISP Control</span>
          <button onClick={() => setMobileOpen(false)} className="ml-auto text-muted hover:text-ink md:hidden" aria-label="Cerrar menú">
            <X size={18} />
          </button>
        </div>

        <nav className="flex-1 py-3 px-2 space-y-3 overflow-y-auto overflow-x-hidden">
          {NAV.map((group, gi) => (
            <div key={gi}>
              {group.label && (
                <p className={`px-3 pb-1 text-[10px] font-medium text-muted/70 uppercase tracking-wider ${collapsed ? 'md:hidden' : ''}`}>
                  {group.label}
                </p>
              )}
              <div className="space-y-0.5">
                {group.items.map((item) => (
                  <SidebarLink key={item.to} item={item} collapsed={collapsed} badge={badgeFor(item.badgeKey)} onNavigate={() => setMobileOpen(false)} />
                ))}
              </div>
            </div>
          ))}

          {user?.isPlatformAdmin && (
            <div className="border-t border-border pt-3 space-y-0.5">
              <NavLink
                to="/platform"
                onClick={() => setMobileOpen(false)}
                title={collapsed ? 'Plataforma (todas las cuentas)' : undefined}
                className={({ isActive }) =>
                  `flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors ${
                    isActive ? 'bg-surface-raised text-ink' : 'text-signal hover:text-ink hover:bg-surface-raised/60'
                  } ${collapsed ? 'md:justify-center' : ''}`
                }
              >
                <Building2 size={16} strokeWidth={2} className="shrink-0" />
                <span className={collapsed ? 'md:hidden' : ''}>Plataforma (todas las cuentas)</span>
              </NavLink>
              <NavLink
                to="/platform/facturacion"
                onClick={() => setMobileOpen(false)}
                title={collapsed ? 'Cobros de la plataforma' : undefined}
                className={({ isActive }) =>
                  `flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors ${
                    isActive ? 'bg-surface-raised text-ink' : 'text-signal hover:text-ink hover:bg-surface-raised/60'
                  } ${collapsed ? 'md:justify-center' : ''}`
                }
              >
                <FileText size={16} strokeWidth={2} className="shrink-0" />
                <span className={collapsed ? 'md:hidden' : ''}>Cobros de la plataforma</span>
              </NavLink>
            </div>
          )}
        </nav>

        <button
          onClick={toggleSidebar}
          className="hidden md:flex items-center justify-center gap-1.5 border-t border-border py-2.5 text-muted hover:text-ink transition-colors text-xs"
        >
          {collapsed ? <ChevronRight size={14} /> : (
            <>
              <ChevronLeft size={14} /> Contraer
            </>
          )}
        </button>

        <div className="border-t border-border p-3">
          <div className={`flex items-center py-2 justify-between px-2 ${collapsed ? 'md:justify-center' : ''}`}>
            <div className={`min-w-0 ${collapsed ? 'md:hidden' : ''}`}>
              <p className="text-sm truncate">{user?.firstName} {user?.lastName}</p>
              <p className="text-xs text-muted truncate">{user?.roles?.join(', ') || (user?.isPlatformAdmin ? 'Dueño de la plataforma' : '')}</p>
            </div>
            <button
              onClick={clearSession}
              className="text-muted hover:text-critical transition-colors shrink-0"
              title="Cerrar sesión"
              aria-label="Cerrar sesión"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      <div className="flex-1 min-w-0 flex flex-col">
        <Topbar
          user={user}
          alertCount={alertCount}
          summary={summary}
          onNavigate={navigate}
          onLogout={clearSession}
          onOpenMobileNav={() => setMobileOpen(true)}
        />
        <main className="flex-1 min-w-0 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function SidebarLink({
  item,
  collapsed,
  badge,
  onNavigate,
}: {
  item: NavItem;
  collapsed: boolean;
  badge: number;
  onNavigate: () => void;
}) {
  const Icon = item.icon;
  return (
    <NavLink
      to={item.to}
      onClick={onNavigate}
      title={collapsed ? item.label : undefined}
      className={({ isActive }) =>
        `flex items-center justify-between gap-2 px-3 py-2 rounded-md text-sm transition-colors ${
          isActive ? 'bg-surface-raised text-ink' : 'text-muted hover:text-ink hover:bg-surface-raised/60'
        } ${collapsed ? 'md:justify-center md:px-0' : ''}`
      }
    >
      <span className={`flex items-center gap-2.5 min-w-0 ${collapsed ? 'md:flex-none' : 'flex-1'}`}>
        <Icon size={16} strokeWidth={2} className="shrink-0" />
        <span className={`truncate ${collapsed ? 'md:hidden' : ''}`}>{item.label}</span>
      </span>
      {!item.live && (
        <span className={`text-[10px] text-muted/70 border border-border rounded px-1.5 py-0.5 shrink-0 ${collapsed ? 'md:hidden' : ''}`}>pronto</span>
      )}
      {item.live && badge > 0 && (
        <span className={`text-[10px] font-medium bg-critical/15 text-critical rounded-full px-1.5 py-0.5 shrink-0 ${collapsed ? 'md:hidden' : ''}`}>
          {badge}
        </span>
      )}
    </NavLink>
  );
}

function Topbar({
  user,
  alertCount,
  summary,
  onNavigate,
  onLogout,
  onOpenMobileNav,
}: {
  user: ReturnType<typeof useAuthStore.getState>['user'];
  alertCount: number;
  summary: Summary | null;
  onNavigate: (path: string) => void;
  onLogout: () => void;
  onOpenMobileNav: () => void;
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Customer[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setSearchOpen(false);
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false);
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setProfileOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }
    const timeout = setTimeout(() => {
      api
        .get('/customers', { params: { search: query, pageSize: 6 } })
        .then((res) => setResults(res.data.items ?? []))
        .catch(() => setResults([]));
    }, 250);
    return () => clearTimeout(timeout);
  }, [query]);

  const mikrotikOnline = summary?.mikrotikOnline?.value ?? null;
  const oltOnline = summary?.oltOnline?.value ?? null;

  return (
    <header className="h-16 shrink-0 border-b border-border bg-surface/60 backdrop-blur flex items-center gap-4 px-4 md:px-6">
      <button onClick={onOpenMobileNav} className="text-muted hover:text-ink md:hidden shrink-0" aria-label="Abrir menú">
        <Menu size={20} />
      </button>
      <div ref={searchRef} className="relative flex-1 max-w-md">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setSearchOpen(true)}
          placeholder="Buscar cliente, IP, teléfono, documento…"
          className="w-full bg-surface-raised border border-border rounded-md pl-9 pr-8 py-2 text-sm outline-none focus:border-signal transition-colors"
        />
        {query && (
          <button onClick={() => setQuery('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted hover:text-ink">
            <X size={13} />
          </button>
        )}

        {searchOpen && query.trim().length >= 2 && (
          <div className="absolute top-full mt-1.5 w-full bg-surface border border-border rounded-md shadow-2xl overflow-hidden z-20">
            {results.length === 0 ? (
              <p className="px-3 py-3 text-xs text-muted">Sin resultados para "{query}".</p>
            ) : (
              results.map((c) => (
                <button
                  key={c.id}
                  onClick={() => {
                    onNavigate(`/clientes/${c.id}`);
                    setSearchOpen(false);
                    setQuery('');
                  }}
                  className="w-full text-left px-3 py-2.5 hover:bg-surface-raised transition-colors flex items-center justify-between text-sm border-t border-border first:border-t-0"
                >
                  <span>
                    {c.firstName} {c.lastName}
                    <span className="text-muted text-xs ml-2">{c.documentId ?? c.phone ?? ''}</span>
                  </span>
                  <span className="text-[10px] text-muted">{c.status}</span>
                </button>
              ))
            )}
          </div>
        )}
      </div>

      <div className="hidden md:flex items-center gap-4 text-xs text-muted">
        <span className="flex items-center gap-1.5">
          <span className={`h-1.5 w-1.5 rounded-full ${mikrotikOnline ? 'bg-ok' : 'bg-border'}`} />
          MikroTik {mikrotikOnline ?? '—'}
        </span>
        <span className="flex items-center gap-1.5">
          <span className={`h-1.5 w-1.5 rounded-full ${oltOnline ? 'bg-ok' : 'bg-border'}`} />
          OLT {oltOnline ?? '—'}
        </span>
      </div>

      <div className="flex items-center gap-2 ml-auto">
        <div ref={notifRef} className="relative">
          <button
            onClick={() => setNotifOpen((v) => !v)}
            className="relative text-muted hover:text-ink p-2 rounded-md hover:bg-surface-raised transition-colors"
            aria-label="Alertas"
          >
            <Bell size={17} />
            {alertCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 h-4 min-w-[16px] px-0.5 rounded-full bg-critical text-white text-[9px] font-medium flex items-center justify-center">
                {alertCount}
              </span>
            )}
          </button>
          {notifOpen && (
            <div className="absolute right-0 top-full mt-1.5 w-72 bg-surface border border-border rounded-md shadow-2xl overflow-hidden z-20">
              <p className="px-3 py-2 text-xs font-medium text-muted border-b border-border">Alertas</p>
              {alertCount === 0 ? (
                <p className="px-3 py-4 text-xs text-muted">Sin alertas pendientes.</p>
              ) : (
                <div className="divide-y divide-border">
                  {badgeFor(summary, 'invoicesOverdue') > 0 && (
                    <button
                      onClick={() => onNavigate('/facturacion')}
                      className="w-full text-left px-3 py-2.5 hover:bg-surface-raised text-sm"
                    >
                      {badgeFor(summary, 'invoicesOverdue')} factura(s) vencida(s)
                    </button>
                  )}
                  {badgeFor(summary, 'openTickets') > 0 && (
                    <button
                      onClick={() => onNavigate('/tickets')}
                      className="w-full text-left px-3 py-2.5 hover:bg-surface-raised text-sm"
                    >
                      {badgeFor(summary, 'openTickets')} ticket(s) abierto(s)
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <div ref={profileRef} className="relative">
          <button
            onClick={() => setProfileOpen((v) => !v)}
            className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-md hover:bg-surface-raised transition-colors"
            aria-label="Menú de usuario"
          >
            <span className="h-7 w-7 rounded-full bg-signal/20 text-signal flex items-center justify-center text-xs font-medium shrink-0">
              {(user?.firstName?.[0] ?? '') + (user?.lastName?.[0] ?? '')}
            </span>
          </button>
          {profileOpen && (
            <div className="absolute right-0 top-full mt-1.5 w-52 bg-surface border border-border rounded-md shadow-2xl overflow-hidden z-20">
              <div className="px-3 py-2.5 border-b border-border">
                <p className="text-sm truncate">{user?.firstName} {user?.lastName}</p>
                <p className="text-xs text-muted truncate">{user?.email}</p>
              </div>
              <button
                onClick={() => {
                  onNavigate('/settings');
                  setProfileOpen(false);
                }}
                className="w-full text-left px-3 py-2 text-sm hover:bg-surface-raised"
              >
                Configuración
              </button>
              <button onClick={onLogout} className="w-full text-left px-3 py-2 text-sm text-critical hover:bg-surface-raised">
                Cerrar sesión
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

function badgeFor(summary: Summary | null, key: string): number {
  return (summary?.[key]?.value as number) || 0;
}
