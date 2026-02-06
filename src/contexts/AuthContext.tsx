import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { User } from '@supabase/supabase-js';
import type { Profile } from '../types';

// =============================================
// Analogia PHP: Este archivo es como tu "sesion" de PHP.
// En PHP usabas $_SESSION['user'] para saber quien esta logueado.
// Aqui usamos React Context para que CUALQUIER componente hijo
// pueda acceder al usuario y su perfil sin pasarlo como prop.
// =============================================

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();

        if (session?.user) {
          setUser(session.user);
          await fetchProfile(session.user.id);
        }
      } catch (error) {
        console.error('Error en checkSession:', error);
      } finally {
        setLoading(false);
      }
    };

    checkSession();

    // Escuchar cambios en auth (login, logout, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          setUser(session.user);
          await fetchProfile(session.user.id);
        } else {
          setUser(null);
          setProfile(null);
        }
      }
    );

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  /**
   * Obtener perfil de Supabase.
   * El trigger de Supabase crea el perfil automaticamente con role='client'
   * al registrarse, pero puede tardar unos milisegundos.
   * Hacemos hasta 5 intentos con espera progresiva para darle tiempo.
   */
  const fetchProfile = async (userId: string) => {
    const maxAttempts = 5;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (!error && data) {
        setProfile(data as Profile);
        return;
      }

      // Espera progresiva: 300ms, 500ms, 800ms, 1200ms
      if (attempt < maxAttempts - 1) {
        await new Promise(resolve => setTimeout(resolve, 300 + (attempt * 200)));
      }
    }

    // Si despues de todos los intentos no hay perfil, dejamos null.
    // El ProtectedRoute redirigira al login.
    setProfile(null);
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Error al cerrar sesion:', error);
    } else {
      setUser(null);
      setProfile(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe usarse dentro de un AuthProvider');
  }
  return context;
}
