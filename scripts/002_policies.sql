-- Profiles policies
CREATE POLICY "Public profiles are viewable by everyone" ON profiles
  FOR SELECT USING (true);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Barbers policies
CREATE POLICY "Public barbers are viewable by everyone" ON barbers
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage barbers" ON barbers
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Services policies
CREATE POLICY "Public services are viewable by everyone" ON services
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage services" ON services
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Appointments policies
CREATE POLICY "Users can view own appointments" ON appointments
  FOR SELECT USING (
    client_id = auth.uid() OR
    EXISTS (SELECT 1 FROM barbers WHERE barbers.id = appointments.barber_id AND barbers.profile_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Clients can create appointments" ON appointments
  FOR INSERT WITH CHECK (
    client_id = auth.uid() OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Users can update own appointments" ON appointments
  FOR UPDATE USING (
    client_id = auth.uid() OR
    EXISTS (SELECT 1 FROM barbers WHERE barbers.id = appointments.barber_id AND barbers.profile_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Payments policies
CREATE POLICY "Users can view payments for own appointments" ON payments
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM appointments WHERE appointments.id = payments.appointment_id AND appointments.client_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM barbers b JOIN appointments a ON a.barber_id = b.id WHERE a.id = payments.appointment_id AND b.profile_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins and barbers can manage payments" ON payments
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin') OR
    EXISTS (SELECT 1 FROM barbers b JOIN appointments a ON a.barber_id = b.id WHERE a.id = payments.appointment_id AND b.profile_id = auth.uid())
  );
