/// <reference types="vite/client" />
import { createClient } from '@supabase/supabase-js';

const URL = import.meta.env.VITE_SUPABASE_URL;
const KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Validacion estricta: si faltan las variables, el proyecto no arranca
if (!URL || !KEY) {
  throw new Error(
    'Faltan las variables de entorno de Supabase. ' +
    'Crea un archivo .env con VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY'
  );
}

// Exportamos el cliente ya inicializado (nunca null)
export const supabase = createClient(URL, KEY);
