import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
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
function RouteLoader() {
    return (_jsxs("div", { className: "p-8", children: [_jsx("div", { className: "h-6 w-48 bg-surface-raised rounded animate-pulse mb-3" }), _jsx("div", { className: "h-4 w-72 bg-surface-raised rounded animate-pulse" })] }));
}
ReactDOM.createRoot(document.getElementById('root')).render(_jsx(React.StrictMode, { children: _jsx(ToastProvider, { children: _jsx(ConfirmProvider, { children: _jsx(BrowserRouter, { children: _jsx(Suspense, { fallback: _jsx(RouteLoader, {}), children: _jsxs(Routes, { children: [_jsx(Route, { path: "/login", element: _jsx(LoginPage, {}) }), _jsx(Route, { path: "/register", element: _jsx(RegisterPage, {}) }), _jsxs(Route, { path: "/", element: _jsx(RequireAuth, { children: _jsx(AppLayout, {}) }), children: [_jsx(Route, { index: true, element: _jsx(Navigate, { to: "/dashboard", replace: true }) }), _jsx(Route, { path: "dashboard", element: _jsx(DashboardPage, {}) }), _jsx(Route, { path: "clientes", element: _jsx(CustomersListPage, {}) }), _jsx(Route, { path: "clientes/nuevo", element: _jsx(NewCustomerPage, {}) }), _jsx(Route, { path: "clientes/:id", element: _jsx(CustomerProfilePage, {}) }), _jsx(Route, { path: "planes", element: _jsx(PlansPage, {}) }), _jsx(Route, { path: "facturacion", element: _jsx(BillingPage, {}) }), _jsx(Route, { path: "mikrotik", element: _jsx(MikrotikPage, {}) }), _jsx(Route, { path: "olt", element: _jsx(OltPage, {}) }), _jsx(Route, { path: "onu", element: _jsx(OnuPage, {}) }), _jsx(Route, { path: "tickets", element: _jsx(TicketsPage, {}) }), _jsx(Route, { path: "inventario", element: _jsx(InventoryPage, {}) }), _jsx(Route, { path: "monitoreo", element: _jsx(MonitoringPage, {}) }), _jsx(Route, { path: "mapa", element: _jsx(NapMapPage, {}) }), _jsx(Route, { path: "settings", element: _jsx(SettingsPage, {}) }), _jsx(Route, { path: "platform", element: _jsx(PlatformAdminPage, {}) })] })] }) }) }) }) }) }));
