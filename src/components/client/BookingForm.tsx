'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { 
  Calendar, 
  Clock, 
  User, 
  Scissors,
  CreditCard,
  Banknote,
  ChevronLeft,
  ChevronRight,
  Check
} from 'lucide-react';
import type { Service, Barber, Profile, WorkSchedule } from '../../types';

interface BookingFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

type Step = 'service' | 'barber' | 'datetime' | 'payment' | 'confirm';

export function BookingForm({ onSuccess, onCancel }: BookingFormProps) {
  const { user } = useAuth();
  const [step, setStep] = useState<Step>('service');
  const [services, setServices] = useState<Service[]>([]);
  const [barbers, setBarbers] = useState<(Barber & { profile: Profile })[]>([]);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedBarber, setSelectedBarber] = useState<(Barber & { profile: Profile }) | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'online'>('cash');
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [bookedSlots, setBookedSlots] = useState<string[]>([]);

  useEffect(() => {
    fetchServices();
    fetchBarbers();
  }, []);

  useEffect(() => {
    if (selectedBarber && selectedDate && selectedService) {
      fetchAvailableSlots();
    }
  }, [selectedBarber, selectedDate, selectedService]);

  const fetchServices = async () => {
    if (!supabase) return;
    const { data } = await supabase
      .from('services')
      .select('*')
      .eq('is_active', true);
    setServices(data || []);
  };

  const fetchBarbers = async () => {
    if (!supabase) return;
    const { data } = await supabase
      .from('barbers')
      .select(`*, profile:profiles(*)`)
      .eq('is_active', true);
    setBarbers((data as (Barber & { profile: Profile })[]) || []);
  };

  const fetchAvailableSlots = async () => {
    if (!selectedBarber || !selectedDate || !selectedService) return;

    const dateStr = selectedDate.toISOString().split('T')[0];
    const dayNames = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
    const dayName = dayNames[selectedDate.getDay()];
    
    const schedule = selectedBarber.work_schedule as WorkSchedule;
    const daySchedule = schedule?.[dayName];

    if (!daySchedule?.enabled) {
      setAvailableSlots([]);
      return;
    }

    // Get existing appointments for this barber on this date
    if (!supabase) return;
    const { data: existingAppointments } = await supabase
      .from('appointments')
      .select('start_time, end_time')
      .eq('barber_id', selectedBarber.id)
      .eq('appointment_date', dateStr)
      .neq('status', 'cancelled');

    const booked = (existingAppointments || []).map(a => a.start_time.slice(0, 5));
    setBookedSlots(booked);

    // Generate time slots
    const slots: string[] = [];
    const [startHour, startMin] = daySchedule.start.split(':').map(Number);
    const [endHour, endMin] = daySchedule.end.split(':').map(Number);
    
    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;
    const serviceDuration = selectedService.duration || 30;

    for (let time = startMinutes; time + serviceDuration <= endMinutes; time += 30) {
      const hours = Math.floor(time / 60);
      const mins = time % 60;
      const timeStr = `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
      
      if (!booked.includes(timeStr)) {
        // Check if it's not in the past for today
        if (dateStr === new Date().toISOString().split('T')[0]) {
          const now = new Date();
          const slotTime = new Date(selectedDate);
          slotTime.setHours(hours, mins);
          if (slotTime > now) {
            slots.push(timeStr);
          }
        } else {
          slots.push(timeStr);
        }
      }
    }

    setAvailableSlots(slots);
  };

  const handleSubmit = async () => {
    if (!user || !selectedService || !selectedBarber || !selectedTime) return;

    setLoading(true);
    try {
      const dateStr = selectedDate.toISOString().split('T')[0];
      const [hours, mins] = selectedTime.split(':').map(Number);
      const endMinutes = hours * 60 + mins + (selectedService.duration || 30);
      const endTime = `${Math.floor(endMinutes / 60).toString().padStart(2, '0')}:${(endMinutes % 60).toString().padStart(2, '0')}`;

      if (!supabase) throw new Error('Supabase client is not initialized');
      const { error } = await supabase.from('appointments').insert({
        client_id: user.id,
        barber_id: selectedBarber.id,
        service_id: selectedService.id,
        appointment_date: dateStr,
        start_time: selectedTime,
        end_time: endTime,
        total_amount: selectedService.price,
        payment_method: paymentMethod,
        status: 'pending',
        payment_status: 'pending',
      });

      if (error) throw error;

      // If online payment selected, here you would redirect to MercadoPago
      if (paymentMethod === 'online') {
        // TODO: Integrate MercadoPago checkout
        alert('La integración con Mercado Pago estará disponible próximamente. Por ahora, selecciona pago en efectivo.');
      }

      onSuccess();
    } catch (error) {
      console.error('Error creating appointment:', error);
      alert('Error al crear la cita. Por favor intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const nextStep = () => {
    const steps: Step[] = ['service', 'barber', 'datetime', 'payment', 'confirm'];
    const currentIndex = steps.indexOf(step);
    if (currentIndex < steps.length - 1) {
      setStep(steps[currentIndex + 1]);
    }
  };

  const prevStep = () => {
    const steps: Step[] = ['service', 'barber', 'datetime', 'payment', 'confirm'];
    const currentIndex = steps.indexOf(step);
    if (currentIndex > 0) {
      setStep(steps[currentIndex - 1]);
    }
  };

  const canProceed = () => {
    switch (step) {
      case 'service': return !!selectedService;
      case 'barber': return !!selectedBarber;
      case 'datetime': return !!selectedTime;
      case 'payment': return !!paymentMethod;
      default: return true;
    }
  };

  const generateDateOptions = () => {
    const dates: Date[] = [];
    const today = new Date();
    for (let i = 0; i < 14; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      dates.push(date);
    }
    return dates;
  };

  const isBarberAvailableOnDate = (barber: Barber & { profile: Profile }, date: Date) => {
    const dayNames = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
    const dayName = dayNames[date.getDay()];
    const schedule = barber.work_schedule as WorkSchedule;
    return schedule?.[dayName]?.enabled || false;
  };

  return (
    <div className="space-y-6">
      {/* Progress Indicator */}
      <div className="flex items-center justify-center gap-2 mb-6">
        {['service', 'barber', 'datetime', 'payment', 'confirm'].map((s, i) => (
          <div key={s} className="flex items-center">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
              step === s ? 'bg-primary text-primary-foreground' :
              ['service', 'barber', 'datetime', 'payment', 'confirm'].indexOf(step) > i 
                ? 'bg-green-500 text-white' 
                : 'bg-muted text-muted-foreground'
            }`}>
              {['service', 'barber', 'datetime', 'payment', 'confirm'].indexOf(step) > i ? (
                <Check className="w-4 h-4" />
              ) : (
                i + 1
              )}
            </div>
            {i < 4 && <div className={`w-8 h-0.5 ${
              ['service', 'barber', 'datetime', 'payment', 'confirm'].indexOf(step) > i 
                ? 'bg-green-500' 
                : 'bg-muted'
            }`} />}
          </div>
        ))}
      </div>

      {/* Step: Select Service */}
      {step === 'service' && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Scissors className="w-5 h-5 text-primary" />
            Selecciona un servicio
          </h3>
          <div className="grid gap-3">
            {services.map((service) => (
              <button
                key={service.id}
                onClick={() => setSelectedService(service)}
                className={`p-4 rounded-lg border text-left transition-all ${
                  selectedService?.id === service.id
                    ? 'border-primary bg-primary/10'
                    : 'border-border bg-muted hover:border-primary/50'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-medium text-foreground">{service.name}</h4>
                    <p className="text-sm text-muted-foreground">{service.description}</p>
                    <p className="text-xs text-muted-foreground mt-1">{service.duration} minutos</p>
                  </div>
                  <span className="text-lg font-bold text-primary">${service.price}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Step: Select Barber */}
      {step === 'barber' && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <User className="w-5 h-5 text-primary" />
            Selecciona tu barbero
          </h3>
          <div className="grid gap-3">
            {barbers.map((barber) => (
              <button
                key={barber.id}
                onClick={() => setSelectedBarber(barber)}
                className={`p-4 rounded-lg border text-left transition-all ${
                  selectedBarber?.id === barber.id
                    ? 'border-primary bg-primary/10'
                    : 'border-border bg-muted hover:border-primary/50'
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                    <span className="text-primary font-bold text-lg">
                      {barber.profile?.full_name?.charAt(0) || 'B'}
                    </span>
                  </div>
                  <div>
                    <h4 className="font-medium text-foreground">{barber.profile?.full_name}</h4>
                    <p className="text-sm text-muted-foreground">
                      {Object.entries(barber.work_schedule || {})
                        .filter(([, v]) => (v as { enabled: boolean }).enabled)
                        .map(([k]) => k.slice(0, 3))
                        .join(', ')}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Step: Select Date & Time */}
      {step === 'datetime' && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary" />
            Selecciona fecha y hora
          </h3>
          
          {/* Date Selection */}
          <div className="flex gap-2 overflow-x-auto pb-2">
            {generateDateOptions().map((date) => {
              const isAvailable = selectedBarber ? isBarberAvailableOnDate(selectedBarber, date) : true;
              return (
                <button
                  key={date.toISOString()}
                  onClick={() => isAvailable && setSelectedDate(date)}
                  disabled={!isAvailable}
                  className={`flex-shrink-0 p-3 rounded-lg border text-center min-w-[70px] transition-all ${
                    selectedDate.toDateString() === date.toDateString()
                      ? 'border-primary bg-primary/10'
                      : isAvailable 
                        ? 'border-border bg-muted hover:border-primary/50'
                        : 'border-border bg-muted/50 opacity-50 cursor-not-allowed'
                  }`}
                >
                  <p className="text-xs text-muted-foreground">
                    {date.toLocaleDateString('es-MX', { weekday: 'short' })}
                  </p>
                  <p className="text-lg font-bold text-foreground">{date.getDate()}</p>
                  <p className="text-xs text-muted-foreground">
                    {date.toLocaleDateString('es-MX', { month: 'short' })}
                  </p>
                </button>
              );
            })}
          </div>

          {/* Time Selection */}
          <div>
            <h4 className="text-sm font-medium text-foreground mb-2 flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Horarios disponibles
            </h4>
            {availableSlots.length > 0 ? (
              <div className="grid grid-cols-4 gap-2">
                {availableSlots.map((time) => (
                  <button
                    key={time}
                    onClick={() => setSelectedTime(time)}
                    className={`py-2 px-3 rounded-lg border text-sm font-medium transition-all ${
                      selectedTime === time
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-border bg-muted hover:border-primary/50 text-foreground'
                    }`}
                  >
                    {time}
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-4">
                No hay horarios disponibles para esta fecha
              </p>
            )}
          </div>
        </div>
      )}

      {/* Step: Payment Method */}
      {step === 'payment' && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-primary" />
            Método de pago
          </h3>
          <div className="grid gap-3">
            <button
              onClick={() => setPaymentMethod('cash')}
              className={`p-4 rounded-lg border text-left transition-all ${
                paymentMethod === 'cash'
                  ? 'border-primary bg-primary/10'
                  : 'border-border bg-muted hover:border-primary/50'
              }`}
            >
              <div className="flex items-center gap-4">
                <Banknote className="w-8 h-8 text-green-400" />
                <div>
                  <h4 className="font-medium text-foreground">Efectivo</h4>
                  <p className="text-sm text-muted-foreground">Paga directamente en la barbería</p>
                </div>
              </div>
            </button>
            <button
              onClick={() => setPaymentMethod('online')}
              className={`p-4 rounded-lg border text-left transition-all ${
                paymentMethod === 'online'
                  ? 'border-primary bg-primary/10'
                  : 'border-border bg-muted hover:border-primary/50'
              }`}
            >
              <div className="flex items-center gap-4">
                <CreditCard className="w-8 h-8 text-blue-400" />
                <div>
                  <h4 className="font-medium text-foreground">Mercado Pago</h4>
                  <p className="text-sm text-muted-foreground">Paga en línea de forma segura</p>
                  <Badge variant="warning" className="mt-1">Próximamente</Badge>
                </div>
              </div>
            </button>
          </div>
        </div>
      )}

      {/* Step: Confirmation */}
      {step === 'confirm' && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Check className="w-5 h-5 text-primary" />
            Confirma tu cita
          </h3>
          <Card className="bg-muted">
            <div className="p-4 space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Servicio:</span>
                <span className="font-medium text-foreground">{selectedService?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Barbero:</span>
                <span className="font-medium text-foreground">{selectedBarber?.profile?.full_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Fecha:</span>
                <span className="font-medium text-foreground">
                  {selectedDate.toLocaleDateString('es-MX', { 
                    weekday: 'long', 
                    day: 'numeric', 
                    month: 'long' 
                  })}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Hora:</span>
                <span className="font-medium text-foreground">{selectedTime}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Pago:</span>
                <span className="font-medium text-foreground">
                  {paymentMethod === 'cash' ? 'Efectivo' : 'Mercado Pago'}
                </span>
              </div>
              <div className="border-t border-border pt-3 mt-3">
                <div className="flex justify-between">
                  <span className="font-medium text-foreground">Total:</span>
                  <span className="text-xl font-bold text-primary">${selectedService?.price}</span>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Navigation Buttons */}
      <div className="flex gap-3 pt-4 border-t border-border">
        {step !== 'service' ? (
          <Button variant="outline" className="flex-1 bg-transparent" onClick={prevStep}>
            <ChevronLeft className="w-4 h-4 mr-1" />
            Anterior
          </Button>
        ) : (
          <Button variant="outline" className="flex-1 bg-transparent" onClick={onCancel}>
            Cancelar
          </Button>
        )}
        
        {step !== 'confirm' ? (
          <Button 
            className="flex-1" 
            onClick={nextStep}
            disabled={!canProceed()}
          >
            Siguiente
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        ) : (
          <Button 
            className="flex-1" 
            onClick={handleSubmit}
            loading={loading}
          >
            Confirmar Cita
          </Button>
        )}
      </div>
    </div>
  );
}
