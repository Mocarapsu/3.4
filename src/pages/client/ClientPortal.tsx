'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { BookingForm } from '../../components/client/BookingForm';
import { 
  Scissors, 
  Calendar, 
  Clock, 
  Plus,
  LogOut,
  User
} from 'lucide-react';
import type { Appointment, Profile, Service, Barber } from '../../types';

export function ClientPortal() {
  const { signOut, profile } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAppointments();
  }, []);

  const fetchAppointments = async () => {
    try {
      const { data, error } = await supabase
        .from('appointments')
        .select(`
          *,
          barber:barbers(*, profile:profiles(*)),
          service:services(*)
        `)
        .order('appointment_date', { ascending: false })
        .order('start_time', { ascending: false });

      if (error) throw error;
      setAppointments(data || []);
    } catch (error) {
      console.error('Error fetching appointments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelAppointment = async (appointmentId: string) => {
    if (!confirm('¿Estás seguro de cancelar esta cita?')) return;

    try {
      const { error } = await supabase
        .from('appointments')
        .update({ status: 'cancelled' })
        .eq('id', appointmentId);

      if (error) throw error;
      fetchAppointments();
    } catch (error) {
      console.error('Error cancelling appointment:', error);
    }
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

  const upcomingAppointments = appointments.filter(
    a => new Date(`${a.appointment_date}T${a.start_time}`) >= new Date() && 
         a.status !== 'cancelled' && 
         a.status !== 'completed'
  );

  const pastAppointments = appointments.filter(
    a => new Date(`${a.appointment_date}T${a.start_time}`) < new Date() || 
         a.status === 'cancelled' || 
         a.status === 'completed'
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                <Scissors className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h1 className="font-bold text-foreground">BarberShop</h1>
                <p className="text-xs text-muted-foreground">Tu estilo, tu barbería</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                  <User className="w-4 h-4 text-muted-foreground" />
                </div>
                <span className="text-sm font-medium text-foreground hidden sm:block">
                  {profile?.full_name}
                </span>
              </div>
              <Button variant="ghost" size="sm" onClick={signOut}>
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Hero Section */}
        <div className="bg-gradient-to-r from-primary/20 to-primary/5 rounded-2xl p-8 mb-8">
          <h2 className="text-2xl font-bold text-foreground mb-2">
            Hola, {profile?.full_name?.split(' ')[0]}
          </h2>
          <p className="text-muted-foreground mb-6">
            Agenda tu próxima cita y luce increíble
          </p>
          <Button onClick={() => setShowBookingModal(true)} size="lg">
            <Plus className="w-5 h-5 mr-2" />
            Agendar Cita
          </Button>
        </div>

        {/* Upcoming Appointments */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" />
              Próximas Citas
            </CardTitle>
            <CardDescription>Tus citas programadas</CardDescription>
          </CardHeader>
          <CardContent>
            {upcomingAppointments.length > 0 ? (
              <div className="space-y-4">
                {upcomingAppointments.map((appointment) => (
                  <div 
                    key={appointment.id} 
                    className="p-4 bg-muted rounded-lg border border-border"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-start gap-4">
                        <div className="text-center min-w-[70px] bg-primary/10 rounded-lg p-2">
                          <p className="text-xs text-muted-foreground">
                            {new Date(appointment.appointment_date).toLocaleDateString('es-MX', { 
                              month: 'short', 
                              day: 'numeric' 
                            })}
                          </p>
                          <p className="text-lg font-bold text-primary">
                            {appointment.start_time.slice(0, 5)}
                          </p>
                        </div>
                        <div>
                          <h4 className="font-semibold text-foreground">
                            {(appointment.service as Service)?.name}
                          </h4>
                          <p className="text-sm text-muted-foreground">
                            Con {((appointment.barber as Barber & { profile: Profile })?.profile as Profile)?.full_name}
                          </p>
                          <p className="text-sm font-medium text-primary mt-1">
                            ${Number(appointment.total_amount).toFixed(2)}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Badge variant={getStatusColor(appointment.status)}>
                          {getStatusText(appointment.status)}
                        </Badge>
                        <Badge variant={appointment.payment_status === 'paid' ? 'success' : 'warning'}>
                          {appointment.payment_status === 'paid' ? 'Pagado' : 'Por pagar'}
                        </Badge>
                        {appointment.status === 'pending' && (
                          <Button 
                            size="sm" 
                            variant="danger"
                            onClick={() => handleCancelAppointment(appointment.id)}
                          >
                            Cancelar
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Calendar className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground mb-4">No tienes citas programadas</p>
                <Button onClick={() => setShowBookingModal(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Agendar Cita
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Past Appointments */}
        {pastAppointments.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-muted-foreground" />
                Historial
              </CardTitle>
              <CardDescription>Tus citas anteriores</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {pastAppointments.slice(0, 5).map((appointment) => (
                  <div 
                    key={appointment.id} 
                    className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className="text-sm text-muted-foreground min-w-[80px]">
                        {new Date(appointment.appointment_date).toLocaleDateString('es-MX', {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {(appointment.service as Service)?.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {((appointment.barber as Barber & { profile: Profile })?.profile as Profile)?.full_name}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={getStatusColor(appointment.status)} className="text-xs">
                        {getStatusText(appointment.status)}
                      </Badge>
                      <span className="text-sm font-medium text-foreground">
                        ${Number(appointment.total_amount).toFixed(2)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </main>

      {/* Booking Modal */}
      <Modal 
        isOpen={showBookingModal} 
        onClose={() => setShowBookingModal(false)} 
        title="Agendar Nueva Cita"
        size="lg"
      >
        <BookingForm 
          onSuccess={() => {
            setShowBookingModal(false);
            fetchAppointments();
          }}
          onCancel={() => setShowBookingModal(false)}
        />
      </Modal>
    </div>
  );
}
