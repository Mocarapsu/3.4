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
    // 1. Revisar si ya hay una sesion guardada (cookie / localStorage)
    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();

        if (session?.user) {
          setUser(session.user);
          // Solo 1 intento rapido -- si el perfil no existe aun, lo
          // reintentaremos cuando onAuthStateChange dispare SIGNED_IN
          await fetchProfile(session.user.id, 1);
        }
      } catch (error) {
        console.error('Error en checkSession:', error);
      } finally {
        setLoading(false);
      }
    };

    checkSession();

    // 2. Escuchar cambios: login, logout, token refresh
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session?.user) {
          setUser(session.user);
          setLoading(true);
          // Tras un signup el trigger tarda un poco, 3 intentos bastan
          await fetchProfile(session.user.id, 3);
          setLoading(false);
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
          setProfile(null);
        } else if (event === 'TOKEN_REFRESHED' && session?.user) {
          setUser(session.user);
        }
      }
    );

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  /**
   * Obtener perfil de Supabase.
   * El trigger de la DB crea el perfil con role='client' al registrarse,
   * pero puede tardar milisegundos. Reintentamos con espera corta.
   *
   * @param maxAttempts  1 = rapido (sesion existente), 3 = post-signup
   */
  const fetchProfile = async (userId: string, maxAttempts = 1) => {
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

      // Espera corta entre intentos: 400ms, 800ms
      if (attempt < maxAttempts - 1) {
        await new Promise(resolve => setTimeout(resolve, 400 * (attempt + 1)));
      }
    }

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
