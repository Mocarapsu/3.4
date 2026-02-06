import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Button } from './ui/Button';

interface RoleSelectorProps {
  onRoleSelected?: () => void;
  isModal?: boolean;
}

export function RoleSelector({ onRoleSelected, isModal = false }: RoleSelectorProps) {
  const { updateUserRole, profile } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSelectRole = async (role: 'admin' | 'barber' | 'client') => {
    setLoading(true);
    setError('');
    try {
      await updateUserRole(role);
      // Esperar un poco antes de redirigir
      setTimeout(() => {
        if (onRoleSelected) {
          onRoleSelected();
        } else {
          navigate('/');
        }
      }, 500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cambiar rol');
      setLoading(false);
    }
  };

  const roles = [
    { id: 'client', label: 'Cliente', description: 'Reservar citas' },
    { id: 'barber', label: 'Barbero', description: 'Gestionar citas' },
    { id: 'admin', label: 'Administrador', description: 'Controlar todo' },
  ];

  return (
    <div className={`${isModal ? 'p-6' : 'min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center p-4'}`}>
      <div className={`${isModal ? '' : 'w-full max-w-md bg-slate-800 rounded-lg shadow-xl p-8'}`}>
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-white mb-2">Selecciona tu rol</h2>
          <p className="text-slate-400">¿Qué tipo de usuario eres?</p>
        </div>

        <div className="space-y-3 mb-6">
          {roles.map((role) => (
            <button
              key={role.id}
              onClick={() => handleSelectRole(role.id as any)}
              disabled={loading || profile?.role === role.id}
              className={`w-full p-4 rounded-lg border-2 transition-all text-left ${
                profile?.role === role.id
                  ? 'border-amber-500 bg-amber-500/10'
                  : 'border-slate-600 bg-slate-700 hover:border-amber-500 hover:bg-slate-600'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-semibold text-white">{role.label}</div>
                  <div className="text-sm text-slate-400">{role.description}</div>
                </div>
                {profile?.role === role.id && (
                  <div className="text-amber-500 font-bold">✓</div>
                )}
              </div>
            </button>
          ))}
        </div>

        {error && (
          <p className="text-red-400 text-sm text-center mb-4">{error}</p>
        )}

        {loading && (
          <p className="text-slate-400 text-sm text-center">Cambiando rol...</p>
        )}
      </div>
    </div>
  );
}
