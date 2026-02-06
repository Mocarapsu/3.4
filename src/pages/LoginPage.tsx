import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card, CardContent } from '../components/ui/Card';
import { Scissors } from 'lucide-react';

export function LoginPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const navigate = useNavigate();
  const { user } = useAuth();

  // Si ya está logueado, redirigir
  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  // Limpiar mensaje de éxito después de 5 segundos
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(''), 5000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccessMessage('');

    try {
      if (isLogin) {
        if (!supabase) {
          throw new Error('Supabase client is not initialized');
        }
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          // Si el email no está confirmado, mostrar mensaje diferente
          if (error.message.includes('Email not confirmed')) {
            setError('Debes confirmar tu correo primero. Revisa tu bandeja de entrada.');
          } else {
            setError(error.message);
          }
          throw error;
        }
        // No necesita navigate, el useAuth lo hace automáticamente
      } else {
        if (!supabase) {
          throw new Error('Supabase client is not initialized');
        }
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: fullName }
          }
        });

        if (error) throw error;
        
        setSuccessMessage('✓ Cuenta creada. Revisa tu correo para confirmar.');
        // Limpiar campos
        setEmail('');
        setPassword('');
        setFullName('');
        setIsLogin(true);
      }
    } catch (err: unknown) {
      console.error('Auth error:', err);
      if (!(err instanceof Error && err.message.includes('Email not confirmed'))) {
        setError(err instanceof Error ? err.message : 'Ha ocurrido un error');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-slate-800 rounded-lg shadow-xl p-8">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/20 mb-4">
            <Scissors className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold text-foreground">BarberShop</h1>
          <p className="text-muted-foreground mt-2">Sistema de citas profesional</p>
        </div>

        <div className="flex gap-4 mb-6">
          <button
            onClick={() => setIsLogin(true)}
            className={`flex-1 py-2 px-4 rounded-lg font-semibold transition-colors ${
              isLogin ? 'bg-amber-500 text-white' : 'bg-slate-700 text-amber-500'
            }`}
          >
            Iniciar Sesión
          </button>
          <button
            onClick={() => setIsLogin(false)}
            className={`flex-1 py-2 px-4 rounded-lg font-semibold transition-colors ${
              !isLogin ? 'bg-amber-500 text-white' : 'bg-slate-700 text-amber-500'
            }`}
          >
            Registrarse
          </button>
        </div>

        <Card variant="elevated">
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {!isLogin && (
                <Input
                  label="Nombre completo"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Juan Pérez"
                  required
                />
              )}
              <Input
                label="Correo electrónico"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="correo@ejemplo.com"
                required
              />
              <Input
                label="Contraseña"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />

              {error && (
                <p className="text-sm text-red-400">
                  {error}
                </p>
              )}

              {successMessage && (
                <p className="text-sm text-green-400">
                  {successMessage}
                </p>
              )}

              <Button type="submit" className="w-full" loading={loading}>
                {isLogin ? 'Iniciar Sesión' : 'Crear Cuenta'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
