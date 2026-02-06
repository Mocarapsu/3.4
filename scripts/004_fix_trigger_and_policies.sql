-- =============================================
-- EJECUTA ESTE SCRIPT EN TU SUPABASE SQL EDITOR
-- Dashboard > SQL Editor > New Query > Pega esto > Run
-- =============================================

-- 1. Arreglar el trigger: usar SECURITY DEFINER y manejar errores
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', 'Usuario'),
    'client'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Si hay error, loguear pero NO bloquear el registro del usuario
    RAISE WARNING 'Error creating profile for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;

-- 2. Recrear el trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 3. Arreglar RLS de profiles: eliminar policies que causen conflicto
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;

-- Recrear policies de profiles mas simples
CREATE POLICY "Profiles are viewable by authenticated users" ON profiles
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- Permitir que el trigger (SECURITY DEFINER) inserte sin restriccion
-- El trigger corre como superuser (security definer), asi que no necesita policy.

-- 4. Arreglar RLS de services: simplificar
DROP POLICY IF EXISTS "Public services are viewable by everyone" ON services;
DROP POLICY IF EXISTS "Admins can manage services" ON services;

CREATE POLICY "Services are viewable by authenticated users" ON services
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage services" ON services
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can update services" ON services
  FOR UPDATE TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can delete services" ON services
  FOR DELETE TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- 5. Arreglar RLS de barbers: simplificar
DROP POLICY IF EXISTS "Public barbers are viewable by everyone" ON barbers;
DROP POLICY IF EXISTS "Admins can manage barbers" ON barbers;

CREATE POLICY "Barbers are viewable by authenticated users" ON barbers
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage barbers" ON barbers
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can update barbers" ON barbers
  FOR UPDATE TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can delete barbers" ON barbers
  FOR DELETE TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- 6. Verificar que los servicios existan
INSERT INTO services (name, description, price, duration) VALUES
  ('Corte Clasico', 'Corte de cabello tradicional con acabado profesional', 150.00, 30),
  ('Corte + Barba', 'Corte de cabello y arreglo de barba completo', 250.00, 45),
  ('Solo Barba', 'Perfilado y arreglo de barba con toalla caliente', 100.00, 20)
ON CONFLICT DO NOTHING;
