import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import './index.css';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { DashboardPage } from './pages/DashboardPage';
import { CustomersListPage } from './pages/CustomersListPage';
import { CustomerProfilePage } from './pages/CustomerProfilePage';
import { NewCustomerPage } from './pages/NewCustomerPage';
import { PlansPage } from './pages/PlansPage';
import { BillingPage } from './pages/BillingPage';
import { MikrotikPage } from './pages/MikrotikPage';
import { OltPage } from './pages/OltPage';
import { TicketsPage } from './pages/TicketsPage';
import { InventoryPage } from './pages/InventoryPage';
import { MonitoringPage } from './pages/MonitoringPage';
import { NapMapPage } from './pages/NapMapPage';
import { SettingsPage } from './pages/SettingsPage';
import { PlatformAdminPage } from './pages/PlatformAdminPage';
import { AppLayout } from './layouts/AppLayout';
import { RequireAuth } from './lib/RequireAuth';
import { ToastProvider } from './components/Toast';
import { ConfirmProvider } from './components/ConfirmDialog';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ToastProvider>
      <ConfirmProvider>
        <BrowserRouter>
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
              <Route path="tickets" element={<TicketsPage />} />
              <Route path="inventario" element={<InventoryPage />} />
              <Route path="monitoreo" element={<MonitoringPage />} />
              <Route path="mapa" element={<NapMapPage />} />
              <Route path="settings" element={<SettingsPage />} />
              <Route path="platform" element={<PlatformAdminPage />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </ConfirmProvider>
    </ToastProvider>
  </React.StrictMode>,
);
