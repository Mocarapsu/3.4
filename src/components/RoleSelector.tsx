import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Button } from './ui/Button';
import type { UserRole } from '../types';

// =============================================
// Analogia PHP: Es como un form de "completar perfil"
// despues del registro. En PHP validarias en el backend
// que el usuario NO pueda ponerse como admin.
// Aqui hacemos lo mismo: la unica opcion es "client".
// =============================================

export function RoleSelector() {
  const { updateUserRole } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSelectRole = async (role: UserRole) => {
    setLoading(true);
    setError('');
    try {
      await updateUserRole(role);
      // Esperar un momento para que el estado se propague
      setTimeout(() => {
        navigate('/');
      }, 300);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al asignar rol');
      setLoading(false);
    }
  };

  // SEGURIDAD: Solo permitimos que el usuario se registre como "client".
  // Los roles "barber" y "admin" se asignan desde el panel de Supabase
  // o desde el dashboard de admin.
  const roles = [
    {
      id: 'client' as UserRole,
      label: 'Cliente',
      description: 'Reservar citas y gestionar tu agenda',
    },
  ];

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-card rounded-xl border border-border p-8">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-foreground mb-2">Bienvenido</h2>
          <p className="text-muted-foreground">
            Tu cuenta ha sido creada. Confirma tu perfil para continuar.
          </p>
        </div>

        <div className="space-y-3 mb-6">
          {roles.map((role) => (
            <button
              key={role.id}
              onClick={() => handleSelectRole(role.id)}
              disabled={loading}
              className="w-full p-4 rounded-lg border-2 border-border bg-muted hover:border-primary transition-all text-left disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="font-semibold text-foreground">{role.label}</div>
              <div className="text-sm text-muted-foreground">{role.description}</div>
            </button>
          ))}
        </div>

        {error && (
          <p className="text-destructive text-sm text-center mb-4">{error}</p>
        )}

        {loading && (
          <p className="text-muted-foreground text-sm text-center">
            Configurando tu cuenta...
          </p>
        )}
      </div>
    </div>
  );
}
