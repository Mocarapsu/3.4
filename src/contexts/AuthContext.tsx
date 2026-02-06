import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { User } from '@supabase/supabase-js';
import type { Profile } from '../types';

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Buscar perfil en la DB con reintentos (por si hay AbortError, red lenta, etc)
async function loadProfile(userId: string, retries = 3): Promise<Profile | null> {
  for (let i = 0; i <= retries; i++) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (data && !error) return data as Profile;

      // Si es AbortError, reintentar
      const msg = error?.message ?? '';
      if (msg.includes('abort') || msg.includes('AbortError')) {
        if (i < retries) {
          await new Promise(r => setTimeout(r, 600));
          continue;
        }
      }
    } catch {
      // error de red, reintentar
    }
    if (i < retries) await new Promise(r => setTimeout(r, 600));
  }
  return null;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Cargar sesion existente
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
        const p = await loadProfile(session.user.id, 3);
        setProfile(p);
      }
      setLoading(false);
    }).catch(() => {
      setLoading(false);
    });

    // 2. Escuchar cambios de auth (login, logout, token refresh)
    // NO llamamos unsubscribe en el cleanup -- hacerlo aborta las
    // peticiones internas de supabase-js. AuthProvider vive toda
    // la vida de la app, no necesita cleanup.
    supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        setUser(session.user);
        setLoading(true);
        const p = await loadProfile(session.user.id, 3);
        setProfile(p);
        setLoading(false);
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setProfile(null);
        setLoading(false);
      } else if (event === 'TOKEN_REFRESHED' && session?.user) {
        setUser(session.user);
      }
    });
  }, []);

  function signOut() {
    setUser(null);
    setProfile(null);
    setLoading(false);
    supabase.auth.signOut().catch(() => {});
  }

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
