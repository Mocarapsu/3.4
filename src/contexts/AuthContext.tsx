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

// Usar fetch nativo para queries al perfil. Esto evita
// el AbortController interno de supabase-js que cancela
// las peticiones cuando hay operaciones de auth en curso.
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

async function fetchProfileDirect(userId: string, accessToken: string): Promise<Profile | null> {
  for (let i = 0; i < 3; i++) {
    try {
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/profiles?id=eq.${userId}&select=*`,
        {
          headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${accessToken}`,
            'Accept': 'application/json',
          },
        }
      );
      if (!res.ok) {
        console.warn('[v0] fetchProfileDirect HTTP', res.status);
        if (i < 2) { await new Promise(r => setTimeout(r, 400)); continue; }
        return null;
      }
      const rows = await res.json();
      if (rows && rows.length > 0) return rows[0] as Profile;
      // No profile found - might be a new user, retry
      if (i < 2) { await new Promise(r => setTimeout(r, 400)); continue; }
      return null;
    } catch (e) {
      console.warn('[v0] fetchProfileDirect error:', e);
      if (i < 2) { await new Promise(r => setTimeout(r, 400)); continue; }
    }
  }
  return null;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function init() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!mounted) return;

        if (session?.user) {
          setUser(session.user);
          const p = await fetchProfileDirect(session.user.id, session.access_token);
          if (mounted) {
            setProfile(p);
            console.log('[v0] init: profile loaded, role:', p?.role);
          }
        }
      } catch (e) {
        console.warn('[v0] init error:', e);
      }
      if (mounted) setLoading(false);
    }

    init();

    // Escuchar cambios de auth
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('[v0] onAuthStateChange:', event);
        if (!mounted) return;

        if (event === 'SIGNED_IN' && session?.user) {
          setUser(session.user);
          setLoading(true);
          // Usar setTimeout(0) para salir del contexto del callback de auth
          setTimeout(async () => {
            const p = await fetchProfileDirect(session.user.id, session.access_token);
            if (mounted) {
              setProfile(p);
              setLoading(false);
              console.log('[v0] SIGNED_IN: profile loaded, role:', p?.role);
            }
          }, 0);
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
          setProfile(null);
          setLoading(false);
        } else if (event === 'TOKEN_REFRESHED' && session?.user) {
          // Actualizar el user con el nuevo token
          setUser(session.user);
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
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
  if (!context) throw new Error('useAuth debe usarse dentro de un AuthProvider');
  return context;
}
