import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface AuthContextType {
  user: any | null;
  profile: any | null;
  loading: boolean;
  signOut: () => Promise<void>;
  updateUserRole: (role: 'admin' | 'barber' | 'client') => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any | null>(null);
  const [profile, setProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!supabase) {
      console.log('❌ Supabase no inicializado');
      setLoading(false);
      return;
    }

    // Verificar sesión actual
    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase!.auth.getSession();
        console.log('📋 Sesión:', session?.user?.email);
        
        if (session?.user) {
          setUser(session.user);
          
          // Obtener perfil del usuario (con reintentos rápidos)
          let profileData = null;
          let attempts = 0;
          const maxAttempts = 2; // Reducido a 2
          
          while (!profileData && attempts < maxAttempts) {
            try {
              const { data, error } = await supabase!
                .from('profiles')
                .select('*')
                .eq('id', session.user.id)
                .single();

              if (error) {
                console.log(`Intento ${attempts + 1}: Cargando perfil...`);
                if (attempts < maxAttempts - 1) {
                  await new Promise(resolve => setTimeout(resolve, 300)); // 300ms en lugar de 1s
                }
              } else if (data) {
                profileData = data;
                console.log('✓ Perfil cargado:', data.role);
              }
            } catch (err) {
              console.error(`Intento ${attempts + 1}: Error:`, err);
            }
            attempts++;
          }
          
          setProfile(profileData);
        }
      } catch (error) {
        console.error('Error en checkSession:', error);
      } finally {
        setLoading(false);
      }
    };

    checkSession();

    // Escuchar cambios en auth
    const { data: { subscription } } = supabase!.auth.onAuthStateChange(
      async (event, session) => {
        console.log('🔄 Auth state change:', event, session?.user?.email);
        
        if (session?.user) {
          setUser(session.user);
          
          // Obtener perfil con timeout
          let profileData = null;
          try {
            const profilePromise = supabase!
              .from('profiles')
              .select('*')
              .eq('id', session.user.id)
              .single();
            
            // Timeout de 2 segundos máximo
            const timeoutPromise = new Promise((_, reject) =>
              setTimeout(() => reject(new Error('timeout')), 2000)
            );
            
            const { data } = await Promise.race([profilePromise, timeoutPromise]) as any;
            profileData = data;
            console.log('✓ Perfil actualizado:', data?.role);
          } catch (err) {
            console.log('⏱️ Perfil no disponible aún (timeout o error)');
          }
          
          setProfile(profileData || null);
        } else {
          setUser(null);
          setProfile(null);
          console.log('👤 Usuario desconectado');
        }
      }
    );

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    if (!supabase) return;
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Error al cerrar sesión:', error);
    } else {
      setUser(null);
      setProfile(null);
    }
  };

  const updateUserRole = async (role: 'admin' | 'barber' | 'client') => {
    if (!supabase || !user) return;
    
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role })
        .eq('id', user.id);
      
      if (error) throw error;
      
      setProfile((prev: any) => prev ? { ...prev, role } : null);
      console.log('✓ Rol actualizado a:', role);
    } catch (error) {
      console.error('Error al actualizar rol:', error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, signOut, updateUserRole }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
