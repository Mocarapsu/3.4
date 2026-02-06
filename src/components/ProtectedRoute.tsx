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

  // Mientras verificamos la sesion, mostramos loading
  if (loading) return <LoadingScreen />;

  // No hay usuario -> ir al login
  if (!user) return <Navigate to="/login" replace />;

  // Tiene usuario pero el perfil aun no cargo -> mostrar loading
  // (esto es temporal, el fetchProfile resolvera pronto)
  if (!profile) return <LoadingScreen />;

  // Verificar que el rol este permitido en esta ruta
  if (allowedRoles && !allowedRoles.includes(profile.role)) {
    const dashboardRoutes: Record<UserRole, string> = {
      admin: '/admin',
      barber: '/barber',
      client: '/portal',
    };
    return <Navigate to={dashboardRoutes[profile.role]} replace />;
  }

  return <>{children}</>;
}
