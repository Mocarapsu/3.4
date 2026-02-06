/// <reference types="vite/client" />
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const URL = import.meta.env.VITE_SUPABASE_URL ?? '';
const KEY = import.meta.env.VITE_SUPABASE_ANON_KEY ?? '';

console.log('[v0] Supabase URL definida:', !!URL);
console.log('[v0] Supabase KEY definida:', !!KEY);

let supabase: SupabaseClient;

if (URL && KEY) {
  supabase = createClient(URL, KEY);
} else {
  // Crear un cliente dummy para que la app no crashee al importar.
  // El AuthContext quedara en loading=false con user=null, mostrando LoginPage.
  console.warn('[v0] Variables de Supabase no configuradas. La app mostrara login pero no podra conectar.');
  supabase = createClient('https://placeholder.supabase.co', 'placeholder-key');
}

export { supabase };
