import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN'
  }).format(amount)
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('es-MX', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }).format(new Date(date))
}

export function formatTime(time: string): string {
  const [hours, minutes] = time.split(':')
  const hour = parseInt(hours)
  const ampm = hour >= 12 ? 'PM' : 'AM'
  const formattedHour = hour % 12 || 12
  return `${formattedHour}:${minutes} ${ampm}`
}

export function generateTimeSlots(start: string, end: string, duration: number): string[] {
  const slots: string[] = []
  const [startHour, startMinute] = start.split(':').map(Number)
  const [endHour, endMinute] = end.split(':').map(Number)
  
  let currentHour = startHour
  let currentMinute = startMinute
  
  while (currentHour < endHour || (currentHour === endHour && currentMinute < endMinute)) {
    const timeString = `${currentHour.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')}`
    slots.push(timeString)
    
    currentMinute += duration
    if (currentMinute >= 60) {
      currentHour += Math.floor(currentMinute / 60)
      currentMinute = currentMinute % 60
    }
  }
  
  return slots
}

export function getDayName(day: number): string {
  const days = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']
  return days[day]
}

export function getStatusColor(status: string): string {
  switch (status) {
    case 'pending':
      return 'bg-warning/20 text-warning'
    case 'confirmed':
      return 'bg-primary/20 text-primary'
    case 'completed':
      return 'bg-success/20 text-success'
    case 'cancelled':
      return 'bg-destructive/20 text-destructive'
    case 'paid':
      return 'bg-success/20 text-success'
    case 'refunded':
      return 'bg-muted/20 text-muted-foreground'
    default:
      return 'bg-muted/20 text-muted-foreground'
  }
}

export function getStatusText(status: string): string {
  const statusMap: Record<string, string> = {
    pending: 'Pendiente',
    confirmed: 'Confirmada',
    completed: 'Completada',
    cancelled: 'Cancelada',
    paid: 'Pagado',
    refunded: 'Reembolsado'
  }
  return statusMap[status] || status
}
