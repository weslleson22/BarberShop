'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/lib/auth-context'
import { useRouter } from 'next/navigation'
import DropdownHeader from '@/components/shared/DropdownHeader'
import AgendaHeader from '@/components/agenda/AgendaHeader'
import CalendarView from '@/components/agenda/CalendarView'
import AppointmentList from '@/components/agenda/AppointmentList'
import AppointmentModal from '@/components/agenda/AppointmentModal'
import AppointmentDetailsModal from '@/components/agenda/AppointmentDetailsModal'

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

// Formatação segura de data no timezone local (evita bug de offset UTC após as 21h)
function formatLocalDate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export default function AgendaPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [datePeriod, setDatePeriod] = useState<'all' | 'today' | 'week' | 'month' | 'custom'>('all')
  const [statusFilter, setStatusFilter] = useState('')
  const [barberFilter, setBarberFilter] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  
  // Modais
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null)
  const [isDetailsOpen, setIsDetailsOpen] = useState(false)
  const [selectedDetailsAppointment, setSelectedDetailsAppointment] = useState<Appointment | null>(null)

  const fetchAppointments = useCallback(async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()

      // Filtro de data por período ou dia específico
      if (datePeriod === 'custom') {
        params.set('date', formatLocalDate(selectedDate))
      } else if (datePeriod === 'today') {
        const todayStr = formatLocalDate(new Date())
        params.set('date', todayStr)
      } else if (datePeriod === 'week') {
        const now = new Date()
        const dayOfWeek = now.getDay()
        const startOfWeek = new Date(now)
        startOfWeek.setDate(now.getDate() - dayOfWeek)
        startOfWeek.setHours(0, 0, 0, 0)
        
        const endOfWeek = new Date(startOfWeek)
        endOfWeek.setDate(startOfWeek.getDate() + 6)
        endOfWeek.setHours(23, 59, 59, 999)

        params.set('startDate', startOfWeek.toISOString())
        params.set('endDate', endOfWeek.toISOString())
      } else if (datePeriod === 'month') {
        const year = selectedDate.getFullYear()
        const month = selectedDate.getMonth()
        const startOfMonth = new Date(year, month, 1, 0, 0, 0, 0)
        const endOfMonth = new Date(year, month + 1, 0, 23, 59, 59, 999)

        params.set('startDate', startOfMonth.toISOString())
        params.set('endDate', endOfMonth.toISOString())
      }
      // datePeriod === 'all': sem restrição de data

      if (statusFilter) params.set('status', statusFilter)
      if (barberFilter) params.set('barberId', barberFilter)
      if (searchQuery.trim()) params.set('search', searchQuery.trim())

      const response = await fetch(`/api/appointments?${params.toString()}`)
      if (response.ok) {
        const data = await response.json()
        setAppointments(Array.isArray(data) ? data : [])
      } else {
        console.error('Erro ao buscar agendamentos:', response.status, response.statusText)
        setAppointments([])
      }
    } catch (error) {
      console.error('Error ao buscar agendamentos:', error)
      setAppointments([])
    } finally {
      setLoading(false)
    }
  }, [selectedDate, datePeriod, statusFilter, barberFilter, searchQuery])

  useEffect(() => {
    fetchAppointments()
  }, [fetchAppointments])

  // Aguardar carregamento inicial do contexto
  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-950 via-blue-950 to-black">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-yellow-400 mx-auto mb-4"></div>
      </div>
    )
  }

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date)
    setDatePeriod('custom')
  }

  const handlePeriodChange = (period: 'all' | 'today' | 'week' | 'month') => {
    setDatePeriod(period)
    if (period === 'today') {
      setSelectedDate(new Date())
    }
  }

  const handleMonthSelect = (monthDate: Date) => {
    setSelectedDate(monthDate)
    setDatePeriod('month')
  }

  const handleNewAppointment = () => {
    setEditingAppointment(null)
    setIsModalOpen(true)
  }

  const handleEditAppointment = (appointment: Appointment) => {
    setEditingAppointment(appointment)
    setIsModalOpen(true)
  }

  const handleViewDetails = (appointment: Appointment) => {
    setSelectedDetailsAppointment(appointment)
    setIsDetailsOpen(true)
  }

  const handleSaveAppointment = () => {
    fetchAppointments()
    setIsModalOpen(false)
    setEditingAppointment(null)
  }

  const triggerNotificationRefresh = () => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('notification-refresh'))
      try {
        const channel = new BroadcastChannel('barbershop-notifications')
        channel.postMessage({ type: 'APPOINTMENT_STATUS_CHANGED' })
        channel.close()
      } catch {}
    }
  }

  const handleDeleteAppointment = async (appointment: Appointment) => {
    if (confirm('Tem certeza que deseja cancelar este agendamento?')) {
      try {
        const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null
        const response = await fetch(`/api/appointments/${appointment.id}`, {
          method: 'DELETE',
          headers: token ? { 'Authorization': `Bearer ${token}` } : {},
          credentials: 'include',
        })

        if (response.ok) {
          await fetchAppointments()
          triggerNotificationRefresh()
          alert('Agendamento cancelado com sucesso!')
        } else {
          const error = await response.json()
          alert(error.error || 'Erro ao cancelar agendamento')
        }
      } catch (error) {
        console.error('Error cancelling appointment:', error)
        alert('Erro ao cancelar agendamento')
      }
    }
  }

  const handleStatusChange = async (appointment: Appointment, newStatus: string) => {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null
      const response = await fetch(`/api/appointments/${appointment.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        credentials: 'include',
        body: JSON.stringify({ status: newStatus }),
      })

      if (response.ok) {
        await fetchAppointments()
        triggerNotificationRefresh()
        const label = newStatus === 'COMPLETED' ? 'concluído' : newStatus === 'CONFIRMED' ? 'confirmado' : 'atualizado'
        alert(`Agendamento marcado como ${label} com sucesso!`)
      } else {
        const error = await response.json()
        alert(error.error || 'Erro ao atualizar status do agendamento')
      }
    } catch (error) {
      console.error('Error changing appointment status:', error)
      alert('Erro ao atualizar status do agendamento')
    }
  }

  const getPeriodLabel = () => {
    switch (datePeriod) {
      case 'today':
        return 'Hoje'
      case 'week':
        return 'Esta Semana'
      case 'month': {
        const monthNames = [
          'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
          'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
        ]
        return `Mês de ${monthNames[selectedDate.getMonth()]}/${selectedDate.getFullYear()}`
      }
      case 'custom':
        return selectedDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
      case 'all':
      default:
        return 'Geral (Todos)'
    }
  }

  return (
    <div className="min-h-screen overflow-x-hidden bg-gradient-to-br from-gray-950 via-blue-950 to-black pt-20">
      {/* Header Fixo no Topo */}
      <DropdownHeader />

      {/* Conteúdo Principal */}
      <div className="w-full px-4 md:px-6">
        {/* Header com controles de busca e filtro */}
        <div className="flex-shrink-0">
          <AgendaHeader
            onNewAppointment={handleNewAppointment}
            onDatePeriodFilter={handlePeriodChange}
            onStatusFilter={setStatusFilter}
            onBarberFilter={setBarberFilter}
            onSearchChange={setSearchQuery}
            hideBarberFilter={user?.role === 'BARBER'}
            currentPeriod={datePeriod === 'custom' ? 'all' : datePeriod}
            currentStatus={statusFilter}
            currentBarber={barberFilter}
            searchQuery={searchQuery}
          />
        </div>
        
        {/* Conteúdo da Agenda */}
        <div className="flex-1 min-w-0">
          <div className="container-responsive py-4 px-2 md:px-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 md:gap-4 mb-4 md:mb-6">
              {/* Calendar View - 2 colunas */}
              <div className="lg:col-span-2">
                <CalendarView 
                  onDateSelect={handleDateSelect} 
                  onMonthSelect={handleMonthSelect}
                  selectedDate={selectedDate} 
                  isMonthView={datePeriod === 'month'}
                />
              </div>
              
              {/* Resumo do Período - 1 coluna (sem Faturamento, foco em agendamentos) */}
              <div className="space-y-2 md:space-y-3">
                <div className="bg-gradient-to-br from-gray-800/50 to-black/50 border border-white/6 rounded-xl p-4 md:p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-base md:text-lg font-bold text-white">Resumo: {getPeriodLabel()}</h3>
                    {datePeriod !== 'all' && (
                      <button
                        type="button"
                        onClick={() => setDatePeriod('all')}
                        className="text-xs text-yellow-400 hover:text-yellow-300 underline"
                      >
                        Ver todos
                      </button>
                    )}
                  </div>

                  <div className="space-y-3">
                    {/* Total */}
                    <div className="flex items-center justify-between py-2 border-b border-white/10">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 bg-blue-500/20 rounded-lg flex items-center justify-center">
                          <span className="text-blue-400 text-xs font-bold">T</span>
                        </div>
                        <span className="text-white/80 text-sm">Total</span>
                      </div>
                      <span className="text-xl font-bold text-white">{appointments.length}</span>
                    </div>

                    {/* Pendentes e Confirmados */}
                    <div className="flex items-center justify-between py-2 border-b border-white/10">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 bg-yellow-500/20 rounded-lg flex items-center justify-center">
                          <span className="text-yellow-400 text-xs font-bold">P</span>
                        </div>
                        <span className="text-white/80 text-sm">Pendentes / Confirmados</span>
                      </div>
                      <span className="text-lg font-bold text-yellow-400">
                        {appointments.filter(a => a.status === 'PENDING' || a.status === 'CONFIRMED').length}
                      </span>
                    </div>

                    {/* Concluídos */}
                    <div className="flex items-center justify-between py-2 border-b border-white/10">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 bg-green-500/20 rounded-lg flex items-center justify-center">
                          <span className="text-green-400 text-xs font-bold">C</span>
                        </div>
                        <span className="text-white/80 text-sm">Concluídos</span>
                      </div>
                      <span className="text-lg font-bold text-green-400">
                        {appointments.filter(a => a.status === 'COMPLETED').length}
                      </span>
                    </div>

                    {/* Cancelados */}
                    <div className="flex items-center justify-between py-2">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 bg-red-500/20 rounded-lg flex items-center justify-center">
                          <span className="text-red-400 text-xs font-bold">X</span>
                        </div>
                        <span className="text-white/80 text-sm">Cancelados</span>
                      </div>
                      <span className="text-lg font-bold text-red-400">
                        {appointments.filter(a => a.status === 'CANCELLED').length}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Appointments List */}
            <AppointmentList 
              appointments={appointments}
              loading={loading}
              onEdit={handleEditAppointment}
              onDelete={handleDeleteAppointment}
              onStatusChange={handleStatusChange}
              onViewDetails={handleViewDetails}
              userRole={user?.role}
              titlePrefix={getPeriodLabel()}
            />
          </div>
        </div>
      </div>

      {/* Appointment Modal (Criar / Editar) */}
      <AppointmentModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false)
          setEditingAppointment(null)
        }}
        onSave={handleSaveAppointment}
        appointment={editingAppointment}
      />

      {/* Appointment Details Modal (Visualizar Detalhes) */}
      <AppointmentDetailsModal
        isOpen={isDetailsOpen}
        onClose={() => {
          setIsDetailsOpen(false)
          setSelectedDetailsAppointment(null)
        }}
        appointment={selectedDetailsAppointment}
        onEdit={(apt) => {
          setIsDetailsOpen(false)
          handleEditAppointment(apt as Appointment)
        }}
        onStatusChange={(apt, status) => {
          handleStatusChange(apt as Appointment, status)
        }}
        onCancel={(apt) => {
          handleDeleteAppointment(apt as Appointment)
        }}
        userRole={user?.role}
      />
    </div>
  )
}
