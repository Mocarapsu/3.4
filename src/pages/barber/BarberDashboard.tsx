'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { 
  Scissors, 
  Calendar, 
  Clock, 
  DollarSign, 
  CheckCircle,
  XCircle,
  LogOut,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import type { Appointment, Profile, Service, Barber } from '../../types';

export function BarberDashboard() {
  const { signOut, profile, user } = useAuth();
  const [barber, setBarber] = useState<Barber | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [stats, setStats] = useState({
    todayAppointments: 0,
    completedToday: 0,
    todayEarnings: 0,
    pendingPayments: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchBarberData();
    }
  }, [user, selectedDate]);

  const fetchBarberData = async () => {
    if (!supabase) return;
    try {
      // First get the barber record
      const { data: barberData, error: barberError } = await supabase!
        .from('barbers')
        .select('*')
        .eq('profile_id', user?.id)
        .single();

      if (barberError) throw barberError;
      setBarber(barberData);

      // Then fetch appointments for this barber
      const dateStr = selectedDate.toISOString().split('T')[0];
      const { data: appointmentsData, error: appointmentsError } = await supabase!
        .from('appointments')
        .select(`
          *,
          client:profiles!appointments_client_id_fkey(*),
          service:services(*)
        `)
        .eq('barber_id', barberData.id)
        .eq('appointment_date', dateStr)
        .order('start_time', { ascending: true });

      if (appointmentsError) throw appointmentsError;
      setAppointments(appointmentsData || []);

      // Calculate stats
      const today = new Date().toISOString().split('T')[0];
      const todayAppointments = appointmentsData?.filter(a => a.appointment_date === today) || [];
      const completedToday = todayAppointments.filter(a => a.status === 'completed').length;
      const todayEarnings = todayAppointments
        .filter(a => a.payment_status === 'paid')
        .reduce((sum, a) => sum + Number(a.total_amount), 0);
      const pendingPayments = todayAppointments.filter(a => a.payment_status === 'pending').length;

      setStats({
        todayAppointments: todayAppointments.length,
        completedToday,
        todayEarnings,
        pendingPayments,
      });
    } catch (error) {
      console.error('Error fetching barber data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateAppointmentStatus = async (appointmentId: string, status: 'confirmed' | 'completed' | 'cancelled') => {
    if (!supabase) return;
    try {
      const { error } = await supabase!
        .from('appointments')
        .update({ status })
        .eq('id', appointmentId);

      if (error) throw error;
      fetchBarberData();
    } catch (error) {
      console.error('Error updating appointment:', error);
    }
  };

  const handleUpdatePaymentStatus = async (appointmentId: string, paymentStatus: 'paid', paymentMethod: 'cash' | 'online') => {
    if (!supabase) return;
    try {
      const { error } = await supabase!
        .from('appointments')
        .update({ 
          payment_status: paymentStatus,
          payment_method: paymentMethod 
        })
        .eq('id', appointmentId);

      if (error) throw error;
      fetchBarberData();
    } catch (error) {
      console.error('Error updating payment:', error);
    }
  };

  const changeDate = (days: number) => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + days);
    setSelectedDate(newDate);
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('es-MX', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'success';
      case 'cancelled': return 'danger';
      case 'confirmed': return 'info';
      default: return 'warning';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed': return 'Completada';
      case 'cancelled': return 'Cancelada';
      case 'confirmed': return 'Confirmada';
      default: return 'Pendiente';
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                <Scissors className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h1 className="font-bold text-foreground">BarberShop</h1>
                <p className="text-xs text-muted-foreground">Panel de Barbero</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm font-medium text-foreground">{profile?.full_name}</p>
                <p className="text-xs text-muted-foreground">Barbero</p>
              </div>
              <Button variant="ghost" size="sm" onClick={signOut}>
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Citas Hoy</p>
                  <p className="text-2xl font-bold text-foreground">{stats.todayAppointments}</p>
                </div>
                <Calendar className="w-8 h-8 text-primary" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Completadas</p>
                  <p className="text-2xl font-bold text-foreground">{stats.completedToday}</p>
                </div>
                <CheckCircle className="w-8 h-8 text-green-400" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Ganancias Hoy</p>
                  <p className="text-2xl font-bold text-green-400">${stats.todayEarnings.toFixed(2)}</p>
                </div>
                <DollarSign className="w-8 h-8 text-green-400" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Pagos Pendientes</p>
                  <p className="text-2xl font-bold text-yellow-400">{stats.pendingPayments}</p>
                </div>
                <Clock className="w-8 h-8 text-yellow-400" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Calendar Navigation */}
        <Card className="mb-6">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <Button variant="ghost" onClick={() => changeDate(-1)}>
                <ChevronLeft className="w-5 h-5" />
              </Button>
              <div className="text-center">
                <p className="text-lg font-semibold text-foreground capitalize">
                  {formatDate(selectedDate)}
                </p>
                {selectedDate.toDateString() === new Date().toDateString() && (
                  <Badge variant="info">Hoy</Badge>
                )}
              </div>
              <Button variant="ghost" onClick={() => changeDate(1)}>
                <ChevronRight className="w-5 h-5" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Appointments List */}
        <Card>
          <CardHeader>
            <CardTitle>Mis Citas</CardTitle>
            <CardDescription>Citas programadas para este día</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {appointments.map((appointment) => (
                <div 
                  key={appointment.id} 
                  className={`p-4 rounded-lg border ${
                    appointment.status === 'completed' ? 'bg-green-500/10 border-green-500/30' :
                    appointment.status === 'cancelled' ? 'bg-red-500/10 border-red-500/30' :
                    'bg-muted border-border'
                  }`}
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div className="text-center min-w-[60px]">
                        <p className="text-2xl font-bold text-primary">{appointment.start_time.slice(0, 5)}</p>
                        <p className="text-xs text-muted-foreground">- {appointment.end_time.slice(0, 5)}</p>
                      </div>
                      <div>
                        <h4 className="font-semibold text-foreground">
                          {(appointment.client as Profile)?.full_name || 'Cliente'}
                        </h4>
                        <p className="text-sm text-muted-foreground">
                          {(appointment.service as Service)?.name} - ${Number(appointment.total_amount).toFixed(2)}
                        </p>
                        {appointment.notes && (
                          <p className="text-sm text-muted-foreground mt-1">Nota: {appointment.notes}</p>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      <div className="flex gap-2">
                        <Badge variant={getStatusColor(appointment.status)}>
                          {getStatusText(appointment.status)}
                        </Badge>
                        <Badge variant={appointment.payment_status === 'paid' ? 'success' : 'warning'}>
                          {appointment.payment_status === 'paid' ? 'Pagado' : 'Por cobrar'}
                        </Badge>
                        {appointment.payment_method && (
                          <Badge variant="default">
                            {appointment.payment_method === 'cash' ? 'Efectivo' : 'En línea'}
                          </Badge>
                        )}
                      </div>

                      {appointment.status === 'pending' && (
                        <div className="flex gap-2">
                          <Button 
                            size="sm" 
                            onClick={() => handleUpdateAppointmentStatus(appointment.id, 'confirmed')}
                          >
                            Confirmar
                          </Button>
                          <Button 
                            size="sm" 
                            variant="danger"
                            onClick={() => handleUpdateAppointmentStatus(appointment.id, 'cancelled')}
                          >
                            Cancelar
                          </Button>
                        </div>
                      )}

                      {appointment.status === 'confirmed' && (
                        <div className="flex gap-2">
                          <Button 
                            size="sm" 
                            variant="primary"
                            onClick={() => handleUpdateAppointmentStatus(appointment.id, 'completed')}
                          >
                            <CheckCircle className="w-4 h-4 mr-1" />
                            Completar
                          </Button>
                        </div>
                      )}

                      {appointment.status === 'completed' && appointment.payment_status === 'pending' && (
                        <div className="flex gap-2">
                          <Button 
                            size="sm" 
                            variant="secondary"
                            onClick={() => handleUpdatePaymentStatus(appointment.id, 'paid', 'cash')}
                          >
                            Cobrar Efectivo
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleUpdatePaymentStatus(appointment.id, 'paid', 'online')}
                          >
                            Pagó en línea
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {appointments.length === 0 && !loading && (
                <div className="text-center py-12">
                  <Calendar className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No hay citas para este día</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
