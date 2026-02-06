import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { User } from '@supabase/supabase-js';
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

  const fetchProfile = useCallback(async (userId: string, signal?: AbortSignal) => {
    // Intentar hasta 3 veces (para signup donde el trigger tarda)
    for (let attempt = 0; attempt < 3; attempt++) {
      // Si la peticion fue cancelada, salir limpiamente
      if (signal?.aborted) return;

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (!error && data) {
        if (!signal?.aborted) setProfile(data as Profile);
        return;
      }

      // Si es el ultimo intento o fue cancelado, no esperar
      if (attempt < 2 && !signal?.aborted) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
  }, []);

  useEffect(() => {
    const abortController = new AbortController();
    let isMounted = true;

    // 1. Revisar sesion existente (rapido, 1 round-trip)
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!isMounted) return;

      if (session?.user) {
        setUser(session.user);
        await fetchProfile(session.user.id, abortController.signal);
      }

      if (isMounted) setLoading(false);
    }).catch(() => {
      if (isMounted) setLoading(false);
    });

    // 2. Escuchar cambios futuros (login, logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!isMounted) return;

        if (event === 'SIGNED_IN' && session?.user) {
          setUser(session.user);
          // Solo fetch si no tenemos perfil o es un usuario diferente
          if (!profile || profile.id !== session.user.id) {
            await fetchProfile(session.user.id, abortController.signal);
          }
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
          setProfile(null);
        }

        if (isMounted) setLoading(false);
      }
    );

    return () => {
      isMounted = false;
      abortController.abort();
      subscription?.unsubscribe();
    };
  }, [fetchProfile]);

  const signOut = useCallback(async () => {
    setLoading(true);
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Error al cerrar sesion:', error);
      setLoading(false);
    }
    // No limpiamos estado aqui -- onAuthStateChange SIGNED_OUT lo hace
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
