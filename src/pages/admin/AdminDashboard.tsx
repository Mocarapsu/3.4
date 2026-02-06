'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { BarberManagement } from '../../components/admin/BarberManagement';
import { 
  LayoutDashboard, 
  Users, 
  Scissors, 
  DollarSign, 
  Calendar,
  TrendingUp,
  LogOut
} from 'lucide-react';
import type { Appointment, Barber, Profile } from '../../types';

type TabType = 'overview' | 'barbers' | 'appointments';

export function AdminDashboard() {
  const { signOut, profile } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [barbers, setBarbers] = useState<(Barber & { profile: Profile })[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [stats, setStats] = useState({
    totalEarnings: 0,
    totalAppointments: 0,
    completedToday: 0,
    pendingPayments: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Fetch barbers with profiles
      const { data: barbersData } = await supabase
        .from('barbers')
        .select(`
          *,
          profile:profiles(*)
        `);

      if (barbersData) {
        setBarbers(barbersData as (Barber & { profile: Profile })[]);
      }

      // Fetch appointments
      const { data: appointmentsData } = await supabase
        .from('appointments')
        .select(`
          *,
          client:profiles!appointments_client_id_fkey(*),
          barber:barbers(*, profile:profiles(*)),
          service:services(*)
        `)
        .order('appointment_date', { ascending: false })
        .limit(50);

      if (appointmentsData) {
        setAppointments(appointmentsData);
        
        // Calculate stats
        const today = new Date().toISOString().split('T')[0];
        const completedToday = appointmentsData.filter(
          a => a.appointment_date === today && a.status === 'completed'
        ).length;
        
        const totalEarnings = appointmentsData
          .filter(a => a.payment_status === 'paid')
          .reduce((sum, a) => sum + Number(a.total_amount), 0);
        
        const pendingPayments = appointmentsData.filter(
          a => a.payment_status === 'pending' && a.status !== 'cancelled'
        ).length;

        setStats({
          totalEarnings,
          totalAppointments: appointmentsData.length,
          completedToday,
          pendingPayments,
        });
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'overview' as TabType, label: 'Resumen', icon: LayoutDashboard },
    { id: 'barbers' as TabType, label: 'Barberos', icon: Users },
    { id: 'appointments' as TabType, label: 'Citas', icon: Calendar },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 h-full w-64 bg-card border-r border-border p-4">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
            <Scissors className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="font-bold text-foreground">BarberShop</h1>
            <p className="text-xs text-muted-foreground">Panel Admin</p>
          </div>
        </div>

        <nav className="space-y-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                activeTab === tab.id
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              <tab.icon className="w-5 h-5" />
              {tab.label}
            </button>
          ))}
        </nav>

        <div className="absolute bottom-4 left-4 right-4">
          <div className="p-3 bg-muted rounded-lg mb-3">
            <p className="text-sm font-medium text-foreground">{profile?.full_name}</p>
            <p className="text-xs text-muted-foreground">{profile?.email}</p>
          </div>
          <Button variant="ghost" className="w-full justify-start" onClick={signOut}>
            <LogOut className="w-4 h-4 mr-2" />
            Cerrar Sesión
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="ml-64 p-8">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-foreground">Resumen General</h2>
            
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Ganancias Totales</p>
                      <p className="text-2xl font-bold text-foreground">${stats.totalEarnings.toFixed(2)}</p>
                    </div>
                    <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center">
                      <DollarSign className="w-6 h-6 text-green-400" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Total Citas</p>
                      <p className="text-2xl font-bold text-foreground">{stats.totalAppointments}</p>
                    </div>
                    <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center">
                      <Calendar className="w-6 h-6 text-blue-400" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Completadas Hoy</p>
                      <p className="text-2xl font-bold text-foreground">{stats.completedToday}</p>
                    </div>
                    <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                      <TrendingUp className="w-6 h-6 text-primary" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Pagos Pendientes</p>
                      <p className="text-2xl font-bold text-foreground">{stats.pendingPayments}</p>
                    </div>
                    <div className="w-12 h-12 rounded-full bg-yellow-500/20 flex items-center justify-center">
                      <DollarSign className="w-6 h-6 text-yellow-400" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Barbers Performance */}
            <Card>
              <CardHeader>
                <CardTitle>Rendimiento por Barbero</CardTitle>
                <CardDescription>Ganancias y citas completadas por cada barbero</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {barbers.map((barber) => {
                    const barberAppointments = appointments.filter(a => a.barber_id === barber.id);
                    const completed = barberAppointments.filter(a => a.status === 'completed').length;
                    const earnings = barberAppointments
                      .filter(a => a.payment_status === 'paid')
                      .reduce((sum, a) => sum + Number(a.total_amount), 0);
                    
                    return (
                      <div key={barber.id} className="flex items-center justify-between p-4 bg-muted rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                            <span className="text-primary font-bold">
                              {barber.profile?.full_name?.charAt(0) || 'B'}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium text-foreground">{barber.profile?.full_name}</p>
                            <p className="text-sm text-muted-foreground">{completed} citas completadas</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-green-400">${earnings.toFixed(2)}</p>
                          <Badge variant={barber.is_active ? 'success' : 'danger'}>
                            {barber.is_active ? 'Activo' : 'Inactivo'}
                          </Badge>
                        </div>
                      </div>
                    );
                  })}
                  {barbers.length === 0 && !loading && (
                    <p className="text-center text-muted-foreground py-8">No hay barberos registrados</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Recent Appointments */}
            <Card>
              <CardHeader>
                <CardTitle>Citas Recientes</CardTitle>
                <CardDescription>Últimas citas registradas en el sistema</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Cliente</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Barbero</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Servicio</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Fecha</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Estado</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Pago</th>
                        <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Monto</th>
                      </tr>
                    </thead>
                    <tbody>
                      {appointments.slice(0, 10).map((appointment) => (
                        <tr key={appointment.id} className="border-b border-border/50">
                          <td className="py-3 px-4 text-foreground">
                            {(appointment.client as Profile)?.full_name || 'Cliente'}
                          </td>
                          <td className="py-3 px-4 text-foreground">
                            {((appointment.barber as Barber & { profile: Profile })?.profile as Profile)?.full_name || 'Barbero'}
                          </td>
                          <td className="py-3 px-4 text-foreground">
                            {(appointment.service as { name: string })?.name || 'Servicio'}
                          </td>
                          <td className="py-3 px-4 text-muted-foreground">
                            {appointment.appointment_date} {appointment.start_time}
                          </td>
                          <td className="py-3 px-4">
                            <Badge variant={
                              appointment.status === 'completed' ? 'success' :
                              appointment.status === 'cancelled' ? 'danger' :
                              appointment.status === 'confirmed' ? 'info' : 'warning'
                            }>
                              {appointment.status === 'completed' ? 'Completada' :
                               appointment.status === 'cancelled' ? 'Cancelada' :
                               appointment.status === 'confirmed' ? 'Confirmada' : 'Pendiente'}
                            </Badge>
                          </td>
                          <td className="py-3 px-4">
                            <Badge variant={
                              appointment.payment_status === 'paid' ? 'success' :
                              appointment.payment_status === 'refunded' ? 'danger' : 'warning'
                            }>
                              {appointment.payment_status === 'paid' ? 'Pagado' :
                               appointment.payment_status === 'refunded' ? 'Reembolsado' : 'Pendiente'}
                            </Badge>
                          </td>
                          <td className="py-3 px-4 text-right font-medium text-foreground">
                            ${Number(appointment.total_amount).toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {appointments.length === 0 && !loading && (
                    <p className="text-center text-muted-foreground py-8">No hay citas registradas</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === 'barbers' && <BarberManagement />}

        {activeTab === 'appointments' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-foreground">Todas las Citas</h2>
            <Card>
              <CardContent className="pt-6">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Cliente</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Barbero</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Servicio</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Fecha</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Hora</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Estado</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Pago</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Método</th>
                        <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Monto</th>
                      </tr>
                    </thead>
                    <tbody>
                      {appointments.map((appointment) => (
                        <tr key={appointment.id} className="border-b border-border/50 hover:bg-muted/50">
                          <td className="py-3 px-4 text-foreground">
                            {(appointment.client as Profile)?.full_name || 'Cliente'}
                          </td>
                          <td className="py-3 px-4 text-foreground">
                            {((appointment.barber as Barber & { profile: Profile })?.profile as Profile)?.full_name || 'Barbero'}
                          </td>
                          <td className="py-3 px-4 text-foreground">
                            {(appointment.service as { name: string })?.name || 'Servicio'}
                          </td>
                          <td className="py-3 px-4 text-muted-foreground">{appointment.appointment_date}</td>
                          <td className="py-3 px-4 text-muted-foreground">{appointment.start_time}</td>
                          <td className="py-3 px-4">
                            <Badge variant={
                              appointment.status === 'completed' ? 'success' :
                              appointment.status === 'cancelled' ? 'danger' :
                              appointment.status === 'confirmed' ? 'info' : 'warning'
                            }>
                              {appointment.status === 'completed' ? 'Completada' :
                               appointment.status === 'cancelled' ? 'Cancelada' :
                               appointment.status === 'confirmed' ? 'Confirmada' : 'Pendiente'}
                            </Badge>
                          </td>
                          <td className="py-3 px-4">
                            <Badge variant={
                              appointment.payment_status === 'paid' ? 'success' :
                              appointment.payment_status === 'refunded' ? 'danger' : 'warning'
                            }>
                              {appointment.payment_status === 'paid' ? 'Pagado' :
                               appointment.payment_status === 'refunded' ? 'Reembolsado' : 'Pendiente'}
                            </Badge>
                          </td>
                          <td className="py-3 px-4 text-muted-foreground">
                            {appointment.payment_method === 'cash' ? 'Efectivo' : 
                             appointment.payment_method === 'online' ? 'En línea' : '-'}
                          </td>
                          <td className="py-3 px-4 text-right font-medium text-foreground">
                            ${Number(appointment.total_amount).toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {appointments.length === 0 && !loading && (
                    <p className="text-center text-muted-foreground py-8">No hay citas registradas</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}
