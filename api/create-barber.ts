import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

// =============================================
// Analogia PHP:
// Este archivo es como un endpoint de tu API en PHP:
//   POST /api/create-barber.php
//
// La diferencia clave: usa la SERVICE_ROLE_KEY de Supabase
// (equivalente a tu "conexion admin" en PHP con root@localhost).
// Esto permite crear usuarios sin afectar la sesion del admin.
//
// IMPORTANTE: Este archivo se ejecuta en el SERVIDOR (Vercel Functions),
// nunca en el navegador del usuario. Por eso es seguro usar la
// service role key aqui.
// =============================================

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Solo aceptar POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Metodo no permitido' });
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    return res.status(500).json({
      error: 'Faltan variables de entorno del servidor. Configura SUPABASE_SERVICE_ROLE_KEY.',
    });
  }

  // Cliente admin de Supabase (con service_role key)
  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { email, password, fullName, phone, workSchedule } = req.body;

  if (!email || !password || !fullName) {
    return res.status(400).json({ error: 'Email, contrasena y nombre son obligatorios' });
  }

  try {
    // 1. Crear usuario con la API admin (NO afecta ninguna sesion)
    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Confirmar email automaticamente
      user_metadata: {
        full_name: fullName,
        role: 'barber',
      },
    });

    if (userError) throw userError;
    if (!userData.user) throw new Error('No se pudo crear el usuario');

    // 2. Crear/actualizar el perfil como barbero
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .upsert({
        id: userData.user.id,
        email,
        full_name: fullName,
        phone: phone || null,
        role: 'barber',
      });

    if (profileError) throw profileError;

    // 3. Crear el registro en la tabla barbers
    const { error: barberError } = await supabaseAdmin
      .from('barbers')
      .insert({
        profile_id: userData.user.id,
        is_active: true,
        work_schedule: workSchedule || {},
      });

    if (barberError) throw barberError;

    return res.status(200).json({
      success: true,
      message: 'Barbero creado exitosamente',
      userId: userData.user.id,
    });
  } catch (error) {
    console.error('Error creating barber:', error);
    return res.status(400).json({
      error: error instanceof Error ? error.message : 'Error desconocido al crear barbero',
    });
  }
}
