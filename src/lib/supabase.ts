/// <reference types="vite/client" />
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const URL = import.meta.env.VITE_SUPABASE_URL ?? '';
const KEY = import.meta.env.VITE_SUPABASE_ANON_KEY ?? '';

let supabase: SupabaseClient;

if (URL && KEY) {
  supabase = createClient(URL, KEY);
} else {
  // Cliente placeholder para que la app no crashee si faltan las vars.
  // El AuthContext quedara con user=null, mostrando LoginPage.
  supabase = createClient('https://placeholder.supabase.co', 'placeholder-key');
}

export { supabase };
