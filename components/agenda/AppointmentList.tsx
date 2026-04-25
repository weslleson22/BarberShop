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
    <div className="space-y-4 relative z-10">
      {/* Header Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center space-x-4">
          <h2 className="text-xl font-semibold text-white">Agendamentos</h2>
          <div className="flex items-center space-x-2 text-white/60">
            <Calendar className="w-4 h-4" />
            <span className="text-sm">{appointments.length} agendamentos</span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          {/* Status Filter */}
          <div className="relative">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="appearance-none bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white text-sm focus:outline-none focus:border-yellow-400/50 focus:bg-white/10 transition-all cursor-pointer"
            >
              <option value="all" className="bg-gray-900">Todos Status</option>
              <option value="pending" className="bg-gray-900">Pendente</option>
              <option value="completed" className="bg-gray-900">Concluído</option>
              <option value="cancelled" className="bg-gray-900">Cancelado</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40 pointer-events-none" />
          </div>

          {/* Sort By */}
          <div className="relative">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="appearance-none bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white text-sm focus:outline-none focus:border-yellow-400/50 focus:bg-white/10 transition-all cursor-pointer"
            >
              <option value="time" className="bg-gray-900">Ordenar por Horário</option>
              <option value="client" className="bg-gray-900">Ordenar por Cliente</option>
              <option value="value" className="bg-gray-900">Ordenar por Valor</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Status Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        <div className="bg-white/5 border border-white/10 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white/60 text-sm">Pendentes</p>
              <p className="text-2xl font-bold text-yellow-400">{stats.pending}</p>
            </div>
            <div className="w-8 h-8 bg-yellow-400/20 rounded-lg flex items-center justify-center">
              <Clock className="w-4 h-4 text-yellow-400" />
            </div>
          </div>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white/60 text-sm">Concluídos</p>
              <p className="text-2xl font-bold text-green-400">{stats.completed}</p>
            </div>
            <div className="w-8 h-8 bg-green-400/20 rounded-lg flex items-center justify-center">
              <Calendar className="w-4 h-4 text-green-400" />
            </div>
          </div>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white/60 text-sm">Cancelados</p>
              <p className="text-2xl font-bold text-red-400">{stats.cancelled}</p>
            </div>
            <div className="w-8 h-8 bg-red-400/20 rounded-lg flex items-center justify-center">
              <X className="w-4 h-4 text-red-400" />
            </div>
          </div>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white/60 text-sm">Total</p>
              <p className="text-2xl font-bold text-white">{stats.total}</p>
            </div>
            <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
              <Calendar className="w-4 h-4 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white/60 text-sm">Faturamento</p>
              <p className="text-2xl font-bold text-yellow-400">{formatCurrency(stats.totalRevenue)}</p>
            </div>
            <div className="w-8 h-8 bg-yellow-400/20 rounded-lg flex items-center justify-center">
              <span className="text-yellow-400 text-sm font-bold">R$</span>
            </div>
          </div>
        </div>
      </div>

      {/* Appointments List */}
      <div className="space-y-4">
        {filteredAndSortedAppointments.length === 0 ? (
          <div className="text-center py-12">
            <Calendar className="w-16 h-16 text-white/20 mx-auto mb-4" />
            <p className="text-white/60 text-lg">Nenhum agendamento encontrado</p>
            <p className="text-white/40 text-sm mt-2">
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
