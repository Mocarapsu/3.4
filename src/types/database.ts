// =============================================
// Tipos centralizados del proyecto BarberShop
// =============================================
// Este archivo es la UNICA fuente de verdad para
// los tipos de la base de datos. Nunca los dupliques
// en otro archivo.
//
// Analogia PHP: Es como tener tus modelos Eloquent
// (User.php, Barber.php, etc.) en app/Models/.
// Aqui definimos la "forma" de cada tabla de Supabase.
// =============================================

/** Roles posibles del sistema */
export type UserRole = 'admin' | 'barber' | 'client';

/** Tabla: profiles (se crea via trigger al registrarse) */
export interface Profile {
  id: string;
  email: string;
  full_name: string;
  phone: string | null;
  role: UserRole;
  avatar_url: string | null;
  created_at: string;
}

/** Horario de un dia individual */
export interface DaySchedule {
  enabled: boolean;
  start: string;
  end: string;
}

/** Horario semanal completo del barbero */
export interface WorkSchedule {
  [day: string]: DaySchedule;
}

/** Tabla: barbers */
export interface Barber {
  id: string;
  profile_id: string;
  is_active: boolean;
  work_schedule: WorkSchedule;
  created_at: string;
  /** Se llena via JOIN con profiles */
  profile?: Profile;
}

/** Tabla: services */
export interface Service {
  id: string;
  name: string;
  description: string | null;
  price: number;
  duration: number;
  is_active: boolean;
  created_at: string;
}

/** Estados posibles de una cita */
export type AppointmentStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled';

/** Estados posibles de un pago */
export type PaymentStatus = 'pending' | 'paid' | 'refunded';

/** Metodos de pago soportados */
export type PaymentMethod = 'cash' | 'online';

/** Tabla: appointments */
export interface Appointment {
  id: string;
  client_id: string;
  barber_id: string;
  service_id: string;
  appointment_date: string;
  start_time: string;
  end_time: string;
  status: AppointmentStatus;
  payment_status: PaymentStatus;
  payment_method: PaymentMethod | null;
  payment_id: string | null;
  total_amount: number;
  notes: string | null;
  created_at: string;
  /** Relaciones JOIN opcionales */
  client?: Profile;
  barber?: Barber & { profile?: Profile };
  service?: Service;
}

/** Slot de hora disponible para agendar */
export interface TimeSlot {
  time: string;
  available: boolean;
}
