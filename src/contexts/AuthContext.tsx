import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
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

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  // Ref para saber si ya terminamos la carga inicial
  const initialLoad = useRef(true);

  // --- PASO 1: Solo escuchar auth y setear user ---
  useEffect(() => {
    // Cargar sesion existente
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      // Si no hay sesion, ya terminamos de cargar
      if (!session?.user) {
        setLoading(false);
        initialLoad.current = false;
      }
    }).catch(() => {
      setLoading(false);
      initialLoad.current = false;
    });

    // Escuchar cambios: SOLO setear user, nada de queries aqui
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (!session?.user) {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // --- PASO 2: Cuando user cambia, cargar perfil FUERA del callback de auth ---
  useEffect(() => {
    if (!user) {
      setProfile(null);
      return;
    }

    let cancelled = false;

    async function fetchProfile() {
      // Reintentar hasta 4 veces con delay incremental
      for (let i = 0; i < 4; i++) {
        if (cancelled) return;

        // Pequeno delay antes de cada intento (excepto el primero en carga inicial)
        if (i > 0 || !initialLoad.current) {
          await new Promise(r => setTimeout(r, 300 * (i + 1)));
        }

        if (cancelled) return;

        try {
          const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();

          if (cancelled) return;

          if (data && !error) {
            setProfile(data as Profile);
            setLoading(false);
            initialLoad.current = false;
            return;
          }

          // Si el error NO es abort, no reintentar
          const msg = error?.message ?? '';
          if (!msg.includes('abort') && !msg.includes('AbortError')) {
            console.warn('Error loading profile:', msg);
            break;
          }
        } catch {
          // Error de red, reintentar
        }
      }

      // Si llegamos aqui, no se pudo cargar el perfil
      if (!cancelled) {
        setProfile(null);
        setLoading(false);
        initialLoad.current = false;
      }
    }

    fetchProfile();
    return () => { cancelled = true; };
  }, [user]);

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
