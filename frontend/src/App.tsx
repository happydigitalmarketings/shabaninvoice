import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Provider, useSelector } from 'react-redux';
import { Toaster } from 'react-hot-toast';
import { store } from './store/store';
import type { RootState } from './store/store';

import Sidebar   from './components/layout/Sidebar';
import Header    from './components/layout/Header';
import MobileNav from './components/layout/MobileNav';

import Login         from './pages/Login';
import Dashboard     from './pages/Dashboard';
import Invoices      from './pages/Invoices';
import CreateInvoice from './pages/CreateInvoice';
import InvoiceDetail from './pages/InvoiceDetail';
import Customers     from './pages/Customers';
import Products      from './pages/Products';
import Reports       from './pages/Reports';
import Settings      from './pages/Settings';

import './styles/global.css';

const PAGE_TITLES: Record<string, string> = {
  '/':               'Dashboard',
  '/invoices':       'Invoices',
  '/invoices/new':   'New Invoice',
  '/customers':      'Customers',
  '/products':       'Products',
  '/reports':        'Reports',
  '/settings':       'Settings',
};

// Protected route wrapper
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const token = useSelector((state: RootState) => state.auth.token);
  return token ? <>{children}</> : <Navigate to="/login" replace />;
};

// Main app shell (with layout)
const AppShell: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  const title = Object.keys(PAGE_TITLES)
    .sort((a, b) => b.length - a.length)
    .find(k => location.pathname.startsWith(k)) || 'Dashboard';

  return (
    <div className="app-shell">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="main-content">
        <Header title={PAGE_TITLES[title] || 'Dashboard'} onMenuClick={() => setSidebarOpen(true)} />

        <main className="page-body">
          <Routes>
            <Route path="/"               element={<Dashboard />} />
            <Route path="/invoices"       element={<Invoices />} />
            <Route path="/invoices/new"   element={<CreateInvoice />} />
            <Route path="/invoices/:id"   element={<InvoiceDetail />} />
            <Route path="/invoices/:id/edit" element={<CreateInvoice />} />
            <Route path="/customers"      element={<Customers />} />
            <Route path="/products"       element={<Products />} />
            <Route path="/reports"        element={<Reports />} />
            <Route path="/settings"       element={<Settings />} />
            <Route path="*"              element={<Navigate to="/" replace />} />
          </Routes>
        </main>

        <MobileNav />
      </div>
    </div>
  );
};

// Root with auth check
const AppRoutes: React.FC = () => {
  const token = useSelector((state: RootState) => state.auth.token);

  return (
    <Routes>
      <Route path="/login" element={token ? <Navigate to="/" replace /> : <Login />} />
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <AppShell />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
};

function App() {
  return (
    <Provider store={store}>
      <BrowserRouter>
        <AppRoutes />
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: 'var(--color-bg-elevated)',
              color: 'var(--color-text-primary)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
            },
            success: { iconTheme: { primary: 'var(--color-success)', secondary: 'white' } },
            error:   { iconTheme: { primary: 'var(--color-error)',   secondary: 'white' } },
          }}
        />
      </BrowserRouter>
    </Provider>
  );
}

export default App;
