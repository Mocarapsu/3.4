export interface Profile {
  id: string;
  email: string;
  full_name: string;
  phone?: string;
  role: 'admin' | 'barber' | 'client';
  avatar_url?: string;
  created_at: string;
}

export interface WorkSchedule {
  [day: string]: {
    enabled: boolean;
    start: string;
    end: string;
  };
}

export interface Barber {
  id: string;
  profile_id: string;
  is_active: boolean;
  work_schedule: WorkSchedule;
  created_at: string;
  profile?: Profile;
}

export interface Service {
  id: string;
  name: string;
  description?: string;
  price: number;
  duration: number;
  is_active: boolean;
  created_at: string;
}

export interface Appointment {
  id: string;
  client_id: string;
  barber_id: string;
  service_id: string;
  appointment_date: string;
  start_time: string;
  end_time: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  payment_status: 'pending' | 'paid' | 'refunded';
  payment_method?: 'cash' | 'online';
  payment_id?: string;
  total_amount: number;
  notes?: string;
  created_at: string;
  client?: Profile;
  barber?: Barber;
  service?: Service;
}

export interface Payment {
  id: string;
  appointment_id: string;
  amount: number;
  payment_method: 'cash' | 'online';
  payment_provider?: string;
  payment_provider_id?: string;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  created_at: string;
}

export interface DaySchedule {
  enabled: boolean;
  start: string;
  end: string;
}

export interface BarberStats {
  barber_id: string;
  barber_name: string;
  total_appointments: number;
  completed_appointments: number;
  total_earnings: number;
  cash_earnings: number;
  online_earnings: number;
  days_worked: number;
}

export interface TimeSlot {
  time: string;
  available: boolean;
}
