import React, { Suspense, lazy } from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import './index.css';
import { AppLayout } from './layouts/AppLayout';
import { RequireAuth } from './lib/RequireAuth';
import { ToastProvider } from './components/Toast';
import { ConfirmProvider } from './components/ConfirmDialog';

// Code-splitting: cada página se descarga solo cuando se visita, en vez de
// inflar el bundle inicial con todo el sistema de una vez.
const LoginPage = lazy(() => import('./pages/LoginPage').then((m) => ({ default: m.LoginPage })));
const RegisterPage = lazy(() => import('./pages/RegisterPage').then((m) => ({ default: m.RegisterPage })));
const DashboardPage = lazy(() => import('./pages/DashboardPage').then((m) => ({ default: m.DashboardPage })));
const CustomersListPage = lazy(() => import('./pages/CustomersListPage').then((m) => ({ default: m.CustomersListPage })));
const CustomerProfilePage = lazy(() => import('./pages/CustomerProfilePage').then((m) => ({ default: m.CustomerProfilePage })));
const NewCustomerPage = lazy(() => import('./pages/NewCustomerPage').then((m) => ({ default: m.NewCustomerPage })));
const PlansPage = lazy(() => import('./pages/PlansPage').then((m) => ({ default: m.PlansPage })));
const BillingPage = lazy(() => import('./pages/BillingPage').then((m) => ({ default: m.BillingPage })));
const MikrotikPage = lazy(() => import('./pages/MikrotikPage').then((m) => ({ default: m.MikrotikPage })));
const OltPage = lazy(() => import('./pages/OltPage').then((m) => ({ default: m.OltPage })));
const OnuPage = lazy(() => import('./pages/OnuPage').then((m) => ({ default: m.OnuPage })));
const TicketsPage = lazy(() => import('./pages/TicketsPage').then((m) => ({ default: m.TicketsPage })));
const InventoryPage = lazy(() => import('./pages/InventoryPage').then((m) => ({ default: m.InventoryPage })));
const MonitoringPage = lazy(() => import('./pages/MonitoringPage').then((m) => ({ default: m.MonitoringPage })));
const NapMapPage = lazy(() => import('./pages/NapMapPage').then((m) => ({ default: m.NapMapPage })));
const SettingsPage = lazy(() => import('./pages/SettingsPage').then((m) => ({ default: m.SettingsPage })));
const PlatformAdminPage = lazy(() => import('./pages/PlatformAdminPage').then((m) => ({ default: m.PlatformAdminPage })));
const PlatformBillingPage = lazy(() => import('./pages/PlatformBillingPage').then((m) => ({ default: m.PlatformBillingPage })));
const SubscriptionPage = lazy(() => import('./pages/SubscriptionPage').then((m) => ({ default: m.SubscriptionPage })));

function RouteLoader() {
  return (
    <div className="p-8">
      <div className="h-6 w-48 bg-surface-raised rounded animate-pulse mb-3" />
      <div className="h-4 w-72 bg-surface-raised rounded animate-pulse" />
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ToastProvider>
      <ConfirmProvider>
        <BrowserRouter>
          <Suspense fallback={<RouteLoader />}>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route
                path="/"
                element={
                  <RequireAuth>
                    <AppLayout />
                  </RequireAuth>
                }
              >
                <Route index element={<Navigate to="/dashboard" replace />} />
                <Route path="dashboard" element={<DashboardPage />} />
                <Route path="clientes" element={<CustomersListPage />} />
                <Route path="clientes/nuevo" element={<NewCustomerPage />} />
                <Route path="clientes/:id" element={<CustomerProfilePage />} />
                <Route path="planes" element={<PlansPage />} />
                <Route path="facturacion" element={<BillingPage />} />
                <Route path="mikrotik" element={<MikrotikPage />} />
                <Route path="olt" element={<OltPage />} />
                <Route path="onu" element={<OnuPage />} />
                <Route path="tickets" element={<TicketsPage />} />
                <Route path="inventario" element={<InventoryPage />} />
                <Route path="monitoreo" element={<MonitoringPage />} />
                <Route path="mapa" element={<NapMapPage />} />
                <Route path="settings" element={<SettingsPage />} />
                <Route path="suscripcion" element={<SubscriptionPage />} />
                <Route path="platform" element={<PlatformAdminPage />} />
                <Route path="platform/facturacion" element={<PlatformBillingPage />} />
              </Route>
            </Routes>
          </Suspense>
        </BrowserRouter>
      </ConfirmProvider>
    </ToastProvider>
  </React.StrictMode>,
);
