'use client'

import { useState } from 'react'
import { Calendar, Clock, CheckCircle, XCircle, ChevronDown, UserCheck } from 'lucide-react'
import AppointmentCard from './AppointmentCard'

interface Appointment {
  id: string
  startTime: string
  endTime: string
  status: string
  totalAmount: number
  notes: string
  isVip?: boolean
  client: {
    id: string
    name: string
    phone: string
    email?: string
    isVip?: boolean
  }
  barber: {
    id: string
    name: string
    email: string
  }
  service: {
    id: string
    name: string
    price: number
    duration: number
  }
}

interface AppointmentListProps {
  appointments: Appointment[]
  loading?: boolean
  onEdit?: (appointment: Appointment) => void
  onDelete?: (appointment: Appointment) => void
  onStatusChange?: (appointment: Appointment, newStatus: string) => void
  onViewDetails?: (appointment: Appointment) => void
  userRole?: string
  titlePrefix?: string
}

export default function AppointmentList({ 
  appointments, 
  loading, 
  onEdit, 
  onDelete, 
  onStatusChange,
  onViewDetails,
  userRole,
  titlePrefix = 'Todos os',
}: AppointmentListProps) {
  const [sortBy, setSortBy] = useState<'time' | 'client' | 'value' | 'status'>('time')

  const sortedAppointments = [...appointments].sort((a, b) => {
    switch (sortBy) {
      case 'time':
        return new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
      case 'client':
        return (a.client?.name || '').localeCompare(b.client?.name || '')
      case 'value':
        return (b.totalAmount || b.service?.price || 0) - (a.totalAmount || a.service?.price || 0)
      case 'status':
        return a.status.localeCompare(b.status)
      default:
        return 0
    }
  })

  // Cálculos consolidados e consistentes
  const stats = {
    total: appointments.length,
    pending: appointments.filter(apt => apt.status === 'PENDING' || apt.status === 'CONFIRMED').length,
    completed: appointments.filter(apt => apt.status === 'COMPLETED').length,
    cancelled: appointments.filter(apt => apt.status === 'CANCELLED').length,
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mb-3"></div>
        <p className="text-muted-foreground text-sm">Carregando agendamentos...</p>
      </div>
    )
  }

  return (
    <div className="space-y-4 relative z-10">
      {/* Header Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-2">
        <div className="flex items-center space-x-3 md:space-x-4 min-w-0">
          <h2 className="text-base sm:text-lg font-bold text-foreground truncate">
            {titlePrefix} Agendamentos
          </h2>
          <div className="flex items-center space-x-1.5 px-2.5 py-1 bg-muted/50 border border-border rounded-lg text-muted-foreground flex-shrink-0 text-xs font-medium">
            <Calendar className="w-3.5 h-3.5 text-primary" />
            <span>{appointments.length} registros</span>
          </div>
        </div>

        {/* Sort selector */}
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground text-xs hidden sm:inline">Ordenar:</span>
          <div className="relative">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="appearance-none bg-background border border-input rounded-lg px-3 py-1.5 text-foreground text-xs md:text-sm focus:outline-none focus:ring-1 focus:ring-ring transition-all cursor-pointer pr-8"
              aria-label="Ordenar agendamentos"
            >
              <option value="time" className="bg-popover text-popover-foreground">Horário</option>
              <option value="client" className="bg-popover text-popover-foreground">Cliente</option>
              <option value="value" className="bg-popover text-popover-foreground">Valor</option>
              <option value="status" className="bg-popover text-popover-foreground">Status</option>
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Grid de Agendamentos */}
      <div className="space-y-3">
        {sortedAppointments.length === 0 ? (
          <div className="bg-card border border-border rounded-xl p-8 md:p-12 text-center">
            <Calendar className="w-10 h-10 md:w-12 md:h-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-foreground text-base font-semibold">Nenhum agendamento encontrado</p>
            <p className="text-muted-foreground text-xs md:text-sm mt-1 max-w-sm mx-auto">
              Nenhum registro corresponde aos filtros ou ao período selecionado. Tente alterar o período ou os filtros acima.
            </p>
          </div>
        ) : (
          sortedAppointments.map((appointment) => (
            <AppointmentCard
              key={appointment.id}
              appointment={appointment}
              onEdit={onEdit}
              onDelete={onDelete}
              onStatusChange={onStatusChange}
              onViewDetails={onViewDetails}
              userRole={userRole}
            />
          ))
        )}
      </div>
    </div>
  )
}
