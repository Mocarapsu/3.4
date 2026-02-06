import React from "react"
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { LoginPage } from './pages/LoginPage';
import { RoleSelector } from './components/RoleSelector';
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { BarberDashboard } from './pages/barber/BarberDashboard';
import { ClientPortal } from './pages/client/ClientPortal';
import { Scissors } from 'lucide-react';

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/20 mb-4 animate-pulse">
          <Scissors className="w-8 h-8 text-primary" />
        </div>
        <p className="text-muted-foreground">Cargando...</p>
      </div>
    </div>
  );
}

function ProtectedRoute({ children, allowedRoles }: { children: React.ReactNode; allowedRoles?: string[] }) {
  const { user, profile, loading } = useAuth();

  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;
  if (!profile || !profile.role) return <Navigate to="/select-role" replace />;
  if (allowedRoles && profile && !allowedRoles.includes(profile.role)) {
    if (profile.role === 'admin') return <Navigate to="/admin" replace />;
    if (profile.role === 'barber') return <Navigate to="/barber" replace />;
    return <Navigate to="/client" replace />;
  }

  return <>{children}</>;
}

function AppRoutes() {
  const { user, profile, loading } = useAuth();

  if (loading) return <LoadingScreen />;

  const getDefaultRoute = () => {
    if (!user) return '/login';
    if (!profile || !profile.role) return '/select-role';
    switch (profile.role) {
      case 'admin': return '/admin';
      case 'barber': return '/barber';
      default: return '/client';
    }
  };

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to={getDefaultRoute()} replace /> : <LoginPage />} />
      <Route path="/select-role" element={user && !profile?.role ? <RoleSelector /> : <Navigate to={getDefaultRoute()} replace />} />
      <Route path="/admin/*" element={<ProtectedRoute allowedRoles={['admin']}><AdminDashboard /></ProtectedRoute>} />
      <Route path="/barber/*" element={<ProtectedRoute allowedRoles={['barber']}><BarberDashboard /></ProtectedRoute>} />
      <Route path="/client/*" element={<ProtectedRoute allowedRoles={['client']}><ClientPortal /></ProtectedRoute>} />
      <Route path="/" element={<Navigate to={getDefaultRoute()} replace />} />
      <Route path="*" element={<Navigate to={getDefaultRoute()} replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  )
}
