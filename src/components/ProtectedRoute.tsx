import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { LoadingScreen } from './LoadingScreen';
import type { UserRole } from '../types';

/**
 * Componente que protege rutas segun rol.
 *
 * Analogia PHP: Es como un middleware de Laravel:
 *   Route::middleware(['auth', 'role:admin'])->group(function () {
 *     Route::get('/admin', [AdminController::class, 'index']);
 *   });
 *
 * - Si el usuario no esta logueado -> redirect a /login
 * - Si no tiene perfil -> redirect a /login (el trigger fallaria, raro)
 * - Si su rol no esta en allowedRoles -> redirect a su dashboard
 */
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

  // Tiene usuario pero no tiene perfil (el trigger aun no creo el perfil)
  // Lo mandamos al portal de cliente que es el rol por defecto
  if (!profile || !profile.role) return <Navigate to="/portal" replace />;

  // Tiene rol pero no esta permitido en esta ruta -> redirigir a su dashboard
  if (allowedRoles && !allowedRoles.includes(profile.role)) {
    const dashboardRoutes: Record<UserRole, string> = {
      admin: '/admin',
      barber: '/barber',
      client: '/portal',
    };
    return <Navigate to={dashboardRoutes[profile.role]} replace />;
  }

  // Todo bien, mostrar el contenido
  return <>{children}</>;
}
