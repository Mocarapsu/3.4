import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { User, Session } from '@supabase/supabase-js';
import type { Profile } from '../types';

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

  // Busca el perfil en Supabase. Reintenta para dar tiempo al trigger post-signup.
  const fetchProfile = useCallback(async (userId: string, retries = 3): Promise<Profile | null> => {
    for (let i = 0; i < retries; i++) {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single();

        if (!error && data) {
          console.log('[v0] fetchProfile: found profile, role:', data.role);
          return data as Profile;
        }
        console.log('[v0] fetchProfile: attempt', i + 1, 'failed, error:', error?.message);
      } catch (e) {
        console.log('[v0] fetchProfile: exception on attempt', i + 1, e);
      }
      // Esperar antes de reintentar
      if (i < retries - 1) {
        await new Promise(r => setTimeout(r, 500));
      }
    }
    return null;
  }, []);

  // Maneja el cambio de sesion (tanto al cargar la app como al hacer login/logout)
  const handleSession = useCallback(async (session: Session | null) => {
    if (session?.user) {
      console.log('[v0] handleSession: user found:', session.user.email);
      setUser(session.user);
      const p = await fetchProfile(session.user.id);
      setProfile(p);
    } else {
      console.log('[v0] handleSession: no user, clearing');
      setUser(null);
      setProfile(null);
    }
    setLoading(false);
  }, [fetchProfile]);

  useEffect(() => {
    // Supabase recomienda usar SOLO onAuthStateChange con INITIAL_SESSION
    // para evitar race conditions entre getSession y onAuthStateChange.
    // onAuthStateChange dispara INITIAL_SESSION inmediatamente al suscribirse,
    // asi que no necesitamos llamar getSession() por separado.
    console.log('[v0] AuthProvider: mounting, subscribing to auth...');

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('[v0] onAuthStateChange:', event);

        if (event === 'INITIAL_SESSION' || event === 'SIGNED_IN') {
          await handleSession(session);
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
          setProfile(null);
          setLoading(false);
        } else if (event === 'TOKEN_REFRESHED' && session?.user) {
          // Solo actualizar el user object, no re-fetch perfil
          setUser(session.user);
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [handleSession]);

  const signOut = useCallback(async () => {
    console.log('[v0] signOut: starting');
    // Limpiar estado PRIMERO para que la UI responda inmediatamente
    setUser(null);
    setProfile(null);
    // Luego cerrar sesion en Supabase
    try {
      await supabase.auth.signOut();
      console.log('[v0] signOut: success');
    } catch (error) {
      console.error('[v0] signOut: error:', error);
    }
  }, []);

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
