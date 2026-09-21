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
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-yellow-400 mb-3"></div>
        <p className="text-white/60 text-sm">Carregando agendamentos...</p>
      </div>
    )
  }

  return (
    <div className="space-y-4 relative z-10">
      {/* Header Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center space-x-3 md:space-x-4 min-w-0">
          <h2 className="text-lg md:text-xl font-bold text-white truncate">
            {titlePrefix} Agendamentos
          </h2>
          <div className="flex items-center space-x-1.5 px-2.5 py-1 bg-white/5 border border-white/10 rounded-lg text-white/70 flex-shrink-0 text-xs font-medium">
            <Calendar className="w-3.5 h-3.5 text-yellow-400" />
            <span>{appointments.length} registros</span>
          </div>
        </div>

        {/* Sort selector */}
        <div className="flex items-center gap-2">
          <span className="text-white/50 text-xs hidden sm:inline">Ordenar:</span>
          <div className="relative">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="appearance-none bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-white text-xs md:text-sm focus:outline-none focus:border-yellow-400/50 focus:bg-white/10 transition-all cursor-pointer pr-8"
              aria-label="Ordenar agendamentos"
            >
              <option value="time" className="bg-gray-900">Horário</option>
              <option value="client" className="bg-gray-900">Cliente</option>
              <option value="value" className="bg-gray-900">Valor</option>
              <option value="status" className="bg-gray-900">Status</option>
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/40 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Cards de Indicadores Consolidados (4 Cards: Total, Pendentes, Concluídos, Cancelados) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 md:gap-3.5">
        {/* Total */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-3 md:p-4 hover:border-white/20 transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white/60 text-xs uppercase tracking-wider font-semibold">Total</p>
              <p className="text-xl md:text-2xl font-bold text-white mt-0.5">{stats.total}</p>
            </div>
            <div className="w-8 h-8 md:w-9 md:h-9 bg-blue-500/10 border border-blue-500/20 rounded-lg flex items-center justify-center">
              <Calendar className="w-4 h-4 text-blue-400" />
            </div>
          </div>
        </div>

        {/* Pendentes */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-3 md:p-4 hover:border-white/20 transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white/60 text-xs uppercase tracking-wider font-semibold">Pendentes</p>
              <p className="text-xl md:text-2xl font-bold text-yellow-400 mt-0.5">{stats.pending}</p>
            </div>
            <div className="w-8 h-8 md:w-9 md:h-9 bg-yellow-400/10 border border-yellow-400/20 rounded-lg flex items-center justify-center">
              <Clock className="w-4 h-4 text-yellow-400" />
            </div>
          </div>
        </div>

        {/* Concluídos */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-3 md:p-4 hover:border-white/20 transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white/60 text-xs uppercase tracking-wider font-semibold">Concluídos</p>
              <p className="text-xl md:text-2xl font-bold text-green-400 mt-0.5">{stats.completed}</p>
            </div>
            <div className="w-8 h-8 md:w-9 md:h-9 bg-green-500/10 border border-green-500/20 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-4 h-4 text-green-400" />
            </div>
          </div>
        </div>

        {/* Cancelados */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-3 md:p-4 hover:border-white/20 transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white/60 text-xs uppercase tracking-wider font-semibold">Cancelados</p>
              <p className="text-xl md:text-2xl font-bold text-red-400 mt-0.5">{stats.cancelled}</p>
            </div>
            <div className="w-8 h-8 md:w-9 md:h-9 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center justify-center">
              <XCircle className="w-4 h-4 text-red-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Grid de Agendamentos */}
      <div className="space-y-3">
        {sortedAppointments.length === 0 ? (
          <div className="bg-white/[0.02] border border-white/6 rounded-2xl p-8 md:p-12 text-center">
            <Calendar className="w-12 h-12 md:w-14 md:h-14 text-white/20 mx-auto mb-3" />
            <p className="text-white/70 text-base font-semibold">Nenhum agendamento encontrado</p>
            <p className="text-white/40 text-xs md:text-sm mt-1 max-w-sm mx-auto">
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
