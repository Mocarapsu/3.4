import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { LoadingScreen } from './LoadingScreen';
import type { UserRole } from '../types';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user, profile, loading } = useAuth();

  // Mientras el auth se resuelve, mostrar loading
  if (loading) return <LoadingScreen />;

  // No hay usuario -> ir al login
  if (!user) return <Navigate to="/login" replace />;

  // El perfil aun no existe (trigger no creo el registro) -> dejar pasar con
  // role por defecto. Esto evita loops y pantallas pegadas en loading.
  // El usuario recien registrado siempre es "client".
  const userRole = profile?.role ?? 'client';

  // Si tiene rol pero no esta permitido en esta ruta, redirigir a su dashboard
  if (allowedRoles && !allowedRoles.includes(userRole)) {
    const dashboardRoutes: Record<UserRole, string> = {
      admin: '/admin',
      barber: '/barber',
      client: '/portal',
    };
    return <Navigate to={dashboardRoutes[userRole]} replace />;
  }

  return <>{children}</>;
}
