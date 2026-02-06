import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { LoadingScreen } from './components/LoadingScreen';
import { LoginPage } from './pages/LoginPage';
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { BarberDashboard } from './pages/barber/BarberDashboard';
import { ClientPortal } from './pages/client/ClientPortal';
import type { UserRole } from './types';

// =============================================
// Analogia PHP:
// App.tsx es como tu archivo routes/web.php de Laravel.
// Define TODAS las URLs de tu aplicacion y que componente
// (pagina) se muestra en cada una.
// =============================================

/**
 * Calcula la ruta por defecto segun el rol del usuario.
 * - No logueado -> /login
 * - Sin perfil/rol -> /portal (sera client por defecto via trigger)
 * - Con rol -> su dashboard correspondiente
 */
function AppRoutes() {
  const { user, profile, loading } = useAuth();

  console.log('[v0] AppRoutes:', { loading, user: user?.email, role: profile?.role });

  if (loading) return <LoadingScreen />;

  // Si no hay usuario -> login. Si hay usuario -> redirigir segun su rol.
  let defaultRoute = '/login';
  if (user) {
    const role = profile?.role ?? 'client';
    const routes: Record<UserRole, string> = {
      admin: '/admin',
      barber: '/barber',
      client: '/portal',
    };
    defaultRoute = routes[role];
  }

  return (
    <Routes>
      {/* Ruta publica: login */}
      <Route
        path="/login"
        element={user ? <Navigate to={defaultRoute} replace /> : <LoginPage />}
      />

      {/* Rutas protegidas por rol */}
      <Route
        path="/admin/*"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AdminDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/barber/*"
        element={
          <ProtectedRoute allowedRoles={['barber']}>
            <BarberDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/portal/*"
        element={
          <ProtectedRoute allowedRoles={['client']}>
            <ClientPortal />
          </ProtectedRoute>
        }
      />

      {/* Cualquier otra ruta -> redirigir al default */}
      <Route path="*" element={<Navigate to={defaultRoute} replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}
