'use client';

import React from "react"

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Badge } from '../ui/Badge';
import { Modal } from '../ui/Modal';
import { UserPlus, Edit, Trash2, Clock, Calendar } from 'lucide-react';
import type { Barber, Profile, WorkSchedule } from '../../types';

const DAYS = [
  { key: 'lunes', label: 'Lunes' },
  { key: 'martes', label: 'Martes' },
  { key: 'miércoles', label: 'Miércoles' },
  { key: 'jueves', label: 'Jueves' },
  { key: 'viernes', label: 'Viernes' },
  { key: 'sábado', label: 'Sábado' },
  { key: 'domingo', label: 'Domingo' },
];

const DEFAULT_SCHEDULE: WorkSchedule = {
  lunes: { enabled: true, start: '09:00', end: '19:00' },
  martes: { enabled: true, start: '09:00', end: '19:00' },
  miércoles: { enabled: true, start: '09:00', end: '19:00' },
  jueves: { enabled: true, start: '09:00', end: '19:00' },
  viernes: { enabled: true, start: '09:00', end: '19:00' },
  sábado: { enabled: true, start: '09:00', end: '17:00' },
  domingo: { enabled: false, start: '09:00', end: '14:00' },
};

export function BarberManagement() {
  const [barbers, setBarbers] = useState<(Barber & { profile: Profile })[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [selectedBarber, setSelectedBarber] = useState<(Barber & { profile: Profile }) | null>(null);
  const [formData, setFormData] = useState({
    email: '',
    fullName: '',
    phone: '',
    password: '',
  });
  const [schedule, setSchedule] = useState<WorkSchedule>(DEFAULT_SCHEDULE);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchBarbers();
  }, []);

  const fetchBarbers = async () => {
    try {
      if (!supabase) throw new Error('Supabase client is not initialized');
      
      const { data, error } = await supabase
        .from('barbers')
        .select(`
          *,
          profile:profiles(*)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setBarbers(data as (Barber & { profile: Profile })[]);
    } catch (error) {
      console.error('Error fetching barbers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddBarber = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      if (!supabase) throw new Error('Supabase client is not initialized');
      
      // Create user account
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            full_name: formData.fullName,
            role: 'barber',
          },
        },
      });

      if (authError) throw authError;

      // The profile will be created automatically via trigger
      // Now create the barber record
      if (authData.user) {
        // Wait a moment for the trigger to create the profile
        await new Promise(resolve => setTimeout(resolve, 1000));

        const { error: barberError } = await supabase
          .from('barbers')
          .insert({
            profile_id: authData.user.id,
            is_active: true,
            work_schedule: DEFAULT_SCHEDULE,
          });

        if (barberError) throw barberError;
      }

      setShowModal(false);
      setFormData({ email: '', fullName: '', phone: '', password: '' });
      fetchBarbers();
    } catch (error) {
      console.error('Error adding barber:', error);
      alert('Error al agregar barbero. Verifica los datos e intenta de nuevo.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (barber: Barber & { profile: Profile }) => {
    try {
      if (!supabase) throw new Error('Supabase client is not initialized');

      const { error } = await supabase
        .from('barbers')
        .update({ is_active: !barber.is_active })
        .eq('id', barber.id);

      if (error) throw error;
      fetchBarbers();
    } catch (error) {
      console.error('Error updating barber status:', error);
    }
  };

  const handleDeleteBarber = async (barberId: string) => {
    if (!confirm('¿Estás seguro de eliminar este barbero? Esta acción no se puede deshacer.')) {
      return;
    }

    try {
      if (!supabase) throw new Error('Supabase client is not initialized');

      const { error } = await supabase
        .from('barbers')
        .delete()
        .eq('id', barberId);

      if (error) throw error;
      fetchBarbers();
    } catch (error) {
      console.error('Error deleting barber:', error);
    }
  };

  const handleEditSchedule = (barber: Barber & { profile: Profile }) => {
    setSelectedBarber(barber);
    setSchedule(barber.work_schedule || DEFAULT_SCHEDULE);
    setShowScheduleModal(true);
  };

  const handleSaveSchedule = async () => {
    if (!selectedBarber) return;
    setSaving(true);

    try {
      if (!supabase) throw new Error('Supabase client is not initialized');

      const { error } = await supabase
        .from('barbers')
        .update({ work_schedule: schedule })
        .eq('id', selectedBarber.id);

      if (error) throw error;
      setShowScheduleModal(false);
      fetchBarbers();
    } catch (error) {
      console.error('Error updating schedule:', error);
    } finally {
      setSaving(false);
    }
  };

  const updateScheduleDay = (day: string, field: 'enabled' | 'start' | 'end', value: boolean | string) => {
    setSchedule(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        [field]: value,
      },
    }));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-foreground">Gestión de Barberos</h2>
        <Button onClick={() => setShowModal(true)}>
          <UserPlus className="w-4 h-4 mr-2" />
          Agregar Barbero
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {barbers.map((barber) => (
          <Card key={barber.id} variant="bordered">
            <CardContent className="pt-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                    <span className="text-primary font-bold text-lg">
                      {barber.profile?.full_name?.charAt(0) || 'B'}
                    </span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">{barber.profile?.full_name}</h3>
                    <p className="text-sm text-muted-foreground">{barber.profile?.email}</p>
                  </div>
                </div>
                <Badge variant={barber.is_active ? 'success' : 'danger'}>
                  {barber.is_active ? 'Activo' : 'Suspendido'}
                </Badge>
              </div>

              <div className="space-y-2 mb-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="w-4 h-4" />
                  <span>
                    {Object.entries(barber.work_schedule || {})
                      .filter(([, value]) => (value as { enabled: boolean }).enabled)
                      .map(([key]) => key.slice(0, 3))
                      .join(', ') || 'Sin horario'}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="w-4 h-4" />
                  <span>
                    {barber.work_schedule?.lunes?.start || '09:00'} - {barber.work_schedule?.lunes?.end || '19:00'}
                  </span>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 bg-transparent"
                  onClick={() => handleEditSchedule(barber)}
                >
                  <Edit className="w-4 h-4 mr-1" />
                  Horario
                </Button>
                <Button
                  variant={barber.is_active ? 'secondary' : 'primary'}
                  size="sm"
                  className="flex-1"
                  onClick={() => handleToggleStatus(barber)}
                >
                  {barber.is_active ? 'Suspender' : 'Activar'}
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => handleDeleteBarber(barber.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}

        {barbers.length === 0 && !loading && (
          <Card className="col-span-full">
            <CardContent className="py-12 text-center">
              <Users className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No hay barberos registrados</p>
              <Button className="mt-4" onClick={() => setShowModal(true)}>
                <UserPlus className="w-4 h-4 mr-2" />
                Agregar Primer Barbero
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Add Barber Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Agregar Nuevo Barbero" size="md">
        <form onSubmit={handleAddBarber} className="space-y-4">
          <Input
            label="Nombre completo"
            value={formData.fullName}
            onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
            placeholder="Juan Pérez"
            required
          />
          <Input
            label="Correo electrónico"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            placeholder="barbero@ejemplo.com"
            required
          />
          <Input
            label="Teléfono"
            type="tel"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            placeholder="+52 123 456 7890"
          />
          <Input
            label="Contraseña"
            type="password"
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            placeholder="••••••••"
            required
          />
          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" className="flex-1 bg-transparent" onClick={() => setShowModal(false)}>
              Cancelar
            </Button>
            <Button type="submit" className="flex-1" loading={saving}>
              Agregar Barbero
            </Button>
          </div>
        </form>
      </Modal>

      {/* Schedule Modal */}
      <Modal 
        isOpen={showScheduleModal} 
        onClose={() => setShowScheduleModal(false)} 
        title={`Horario de ${selectedBarber?.profile?.full_name}`}
        size="lg"
      >
        <div className="space-y-4">
          {DAYS.map((day) => (
            <div key={day.key} className="flex items-center gap-4 p-3 bg-muted rounded-lg">
              <label className="flex items-center gap-2 min-w-[120px]">
                <input
                  type="checkbox"
                  checked={schedule[day.key]?.enabled || false}
                  onChange={(e) => updateScheduleDay(day.key, 'enabled', e.target.checked)}
                  className="w-4 h-4 rounded border-border bg-input text-primary focus:ring-primary"
                />
                <span className="font-medium text-foreground">{day.label}</span>
              </label>
              
              <div className="flex items-center gap-2 flex-1">
                <input
                  type="time"
                  value={schedule[day.key]?.start || '09:00'}
                  onChange={(e) => updateScheduleDay(day.key, 'start', e.target.value)}
                  disabled={!schedule[day.key]?.enabled}
                  className="px-3 py-1.5 bg-input border border-border rounded-lg text-foreground disabled:opacity-50"
                />
                <span className="text-muted-foreground">a</span>
                <input
                  type="time"
                  value={schedule[day.key]?.end || '19:00'}
                  onChange={(e) => updateScheduleDay(day.key, 'end', e.target.value)}
                  disabled={!schedule[day.key]?.enabled}
                  className="px-3 py-1.5 bg-input border border-border rounded-lg text-foreground disabled:opacity-50"
                />
              </div>
            </div>
          ))}
          
          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" className="flex-1 bg-transparent" onClick={() => setShowScheduleModal(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveSchedule} className="flex-1" loading={saving}>
              Guardar Horario
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// For the icon used
function Users({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  );
}
