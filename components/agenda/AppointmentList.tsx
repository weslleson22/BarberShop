'use client'

import { useState } from 'react'
import { Calendar, Clock, Filter, ChevronDown, X } from 'lucide-react'
import AppointmentCard from './AppointmentCard'

interface Appointment {
  id: string
  startTime: string
  endTime: string
  status: string
  totalAmount: number
  notes: string
  client: {
    id: string
    name: string
    phone: string
    email?: string
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
}

export default function AppointmentList({ 
  appointments, 
  loading, 
  onEdit, 
  onDelete, 
  onStatusChange 
}: AppointmentListProps) {
  const [sortBy, setSortBy] = useState('time')
  const [filterStatus, setFilterStatus] = useState('all')

  console.log('AppointmentList - appointments recebidos:', appointments)
  console.log('AppointmentList - filterStatus atual:', filterStatus)

  const filteredAndSortedAppointments = appointments
    .filter(apt => {
      const matches = filterStatus === 'all' || apt.status.toLowerCase() === filterStatus.toLowerCase()
      console.log(`Filtrando agendamento ${apt.id}: ${apt.client.name} - Status: ${apt.status} - Filter: ${filterStatus} - Match: ${matches}`)
      return matches
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'time':
          return new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
        case 'client':
          return a.client.name.localeCompare(b.client.name)
        case 'value':
          return b.totalAmount - a.totalAmount
        default:
          return 0
      }
    })

  // Calculate statistics
  const stats = {
    total: appointments.length,
    pending: appointments.filter(apt => apt.status === 'PENDING').length,
    completed: appointments.filter(apt => apt.status === 'COMPLETED').length,
    cancelled: appointments.filter(apt => apt.status === 'CANCELLED').length,
    totalRevenue: appointments
      .filter(apt => apt.status === 'COMPLETED')
      .reduce((sum, apt) => sum + apt.totalAmount, 0)
  }

  console.log('AppointmentList - appointments filtrados:', filteredAndSortedAppointments)

  const getStatusCount = (status: string) => {
    return appointments.filter(apt => apt.status === status).length
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-400"></div>
      </div>
    )
  }

  return (
    <div className="space-y-3 md:space-y-4 relative z-10">
      {/* Header Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center space-x-3 md:space-x-4 min-w-0">
          <h2 className="text-lg md:text-xl font-semibold text-white truncate">Agendamentos</h2>
          <div className="flex items-center space-x-2 text-white/60 flex-shrink-0">
            <Calendar className="w-3.5 h-3.5 md:w-4 md:h-4" />
            <span className="text-xs md:text-sm">{appointments.length} agendamentos</span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 md:gap-3">
          {/* Status Filter */}
          <div className="relative">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="appearance-none bg-white/5 border border-white/10 rounded-lg px-3 md:px-4 py-2 text-white text-xs md:text-sm focus:outline-none focus:border-yellow-400/50 focus:bg-white/10 transition-all cursor-pointer pr-8 md:pr-10"
            >
              <option value="all" className="bg-gray-900">Todos Status</option>
              <option value="pending" className="bg-gray-900">Pendente</option>
              <option value="completed" className="bg-gray-900">Concluído</option>
              <option value="cancelled" className="bg-gray-900">Cancelado</option>
            </select>
            <ChevronDown className="absolute right-2 md:right-3 top-1/2 -translate-y-1/2 w-3 h-3 md:w-4 md:h-4 text-white/40 pointer-events-none" />
          </div>

          {/* Sort By */}
          <div className="relative">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="appearance-none bg-white/5 border border-white/10 rounded-lg px-3 md:px-4 py-2 text-white text-xs md:text-sm focus:outline-none focus:border-yellow-400/50 focus:bg-white/10 transition-all cursor-pointer pr-8 md:pr-10"
            >
              <option value="time" className="bg-gray-900">Ordenar por Horário</option>
              <option value="client" className="bg-gray-900">Ordenar por Cliente</option>
              <option value="value" className="bg-gray-900">Ordenar por Valor</option>
            </select>
            <ChevronDown className="absolute right-2 md:right-3 top-1/2 -translate-y-1/2 w-3 h-3 md:w-4 md:h-4 text-white/40 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Status Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 md:gap-4">
        <div className="bg-white/5 border border-white/10 rounded-lg p-3 md:p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white/60 text-xs md:text-sm">Pendentes</p>
              <p className="text-xl md:text-2xl font-bold text-yellow-400">{stats.pending}</p>
            </div>
            <div className="w-7 h-7 md:w-8 md:h-8 bg-yellow-400/20 rounded-lg flex items-center justify-center">
              <Clock className="w-3.5 h-3.5 md:w-4 md:h-4 text-yellow-400" />
            </div>
          </div>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-lg p-3 md:p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white/60 text-xs md:text-sm">Concluídos</p>
              <p className="text-xl md:text-2xl font-bold text-green-400">{stats.completed}</p>
            </div>
            <div className="w-7 h-7 md:w-8 md:h-8 bg-green-400/20 rounded-lg flex items-center justify-center">
              <Calendar className="w-3.5 h-3.5 md:w-4 md:h-4 text-green-400" />
            </div>
          </div>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-lg p-3 md:p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white/60 text-xs md:text-sm">Cancelados</p>
              <p className="text-xl md:text-2xl font-bold text-red-400">{stats.cancelled}</p>
            </div>
            <div className="w-7 h-7 md:w-8 md:h-8 bg-red-400/20 rounded-lg flex items-center justify-center">
              <X className="w-3.5 h-3.5 md:w-4 md:h-4 text-red-400" />
            </div>
          </div>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-lg p-3 md:p-4 hidden sm:block">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white/60 text-xs md:text-sm">Total</p>
              <p className="text-xl md:text-2xl font-bold text-white">{stats.total}</p>
            </div>
            <div className="w-7 h-7 md:w-8 md:h-8 bg-white/20 rounded-lg flex items-center justify-center">
              <Calendar className="w-3.5 h-3.5 md:w-4 md:h-4 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-lg p-3 md:p-4 hidden sm:block">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white/60 text-xs md:text-sm">Faturamento</p>
              <p className="text-xl md:text-2xl font-bold text-yellow-400 truncate">{formatCurrency(stats.totalRevenue)}</p>
            </div>
            <div className="w-7 h-7 md:w-8 md:h-8 bg-yellow-400/20 rounded-lg flex items-center justify-center">
              <span className="text-yellow-400 text-xs md:text-sm font-bold">R$</span>
            </div>
          </div>
        </div>
      </div>

      {/* Appointments List */}
      <div className="space-y-3 md:space-y-4">
        {filteredAndSortedAppointments.length === 0 ? (
          <div className="text-center py-8 md:py-12">
            <Calendar className="w-12 h-12 md:w-16 md:h-16 text-white/20 mx-auto mb-3 md:mb-4" />
            <p className="text-white/60 text-base md:text-lg">Nenhum agendamento encontrado</p>
            <p className="text-white/40 text-xs md:text-sm mt-1 md:mt-2">
              {filterStatus !== 'all' 
                ? 'Tente alterar o filtro de status' 
                : 'Não há agendamentos para os critérios selecionados'
              }
            </p>
          </div>
        ) : (
          filteredAndSortedAppointments.map((appointment) => (
            <AppointmentCard
              key={appointment.id}
              appointment={appointment}
              onEdit={onEdit}
              onDelete={onDelete}
              onStatusChange={onStatusChange}
            />
          ))
        )}
      </div>
    </div>
  )
}
