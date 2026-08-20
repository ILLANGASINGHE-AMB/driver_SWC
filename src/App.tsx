import React from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './components/Toast';
import { ConfirmProvider } from './components/ConfirmDialog';
import { BottomNav } from './components/BottomNav';
import { LoginPage } from './pages/LoginPage';
import { TransportPage } from './pages/TransportPage';
import { VehiclesPage } from './pages/VehiclesPage';
import { CustomersPage } from './pages/CustomersPage';
import { OrdersPage } from './pages/OrdersPage';
import { OrderBillPage } from './pages/OrderBillPage';
import { PlaceOrderPage } from './pages/PlaceOrderPage';
import { ProfilePage } from './pages/ProfilePage';

function Shell() {
  const { status } = useAuth();

  if (status === 'loading') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
        <i className="fas fa-spinner fa-spin" style={{ fontSize: '1.5em' }} />
      </div>
    );
  }

  if (status !== 'ready') {
    return <LoginPage />;
  }

  return (
    <div className="app-shell">
      <BottomNav />
      <div className="app-content">
        <Routes>
          <Route path="/" element={<Navigate to="/transport" replace />} />
          <Route path="/transport" element={<TransportPage />} />
          <Route path="/vehicles" element={<VehiclesPage />} />
          <Route path="/customers" element={<CustomersPage />} />
          <Route path="/orders" element={<OrdersPage />} />
          <Route path="/orders/new" element={<PlaceOrderPage />} />
          <Route path="/orders/:id" element={<OrderBillPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="*" element={<Navigate to="/transport" replace />} />
        </Routes>
      </div>
    </div>
  );
}

export function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <ConfirmProvider>
            <Shell />
          </ConfirmProvider>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
