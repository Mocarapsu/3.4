/// <reference types="vite/client" />
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const URL = import.meta.env.VITE_SUPABASE_URL ?? '';
const KEY = import.meta.env.VITE_SUPABASE_ANON_KEY ?? '';

// Singleton: sobrevive hot-reloads de Vite.
// Sin esto, cada hot-reload crea un nuevo cliente y el viejo
// aborta todas sus peticiones pendientes (causa AbortError).
function getSupabaseClient(): SupabaseClient {
  const globalKey = '__supabase_client__' as const;
  const g = globalThis as unknown as Record<string, SupabaseClient>;

  if (g[globalKey]) return g[globalKey];

  const client = createClient(
    URL || 'https://placeholder.supabase.co',
    KEY || 'placeholder-key',
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    }
  );

  g[globalKey] = client;
  return client;
}

export const supabase = getSupabaseClient();
