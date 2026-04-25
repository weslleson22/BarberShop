'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth-context'
import { useRouter } from 'next/navigation'
import AgendaSidebar from '@/components/agenda/AgendaSidebar'
import AgendaHeader from '@/components/agenda/AgendaHeader'
import CalendarView from '@/components/agenda/CalendarView'
import AppointmentList from '@/components/agenda/AppointmentList'
import AppointmentModal from '@/components/agenda/AppointmentModal'

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

export default function AgendaPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null)

  const fetchAppointments = async () => {
    try {
      console.log('=== BUSCANDO AGENDAMENTOS DO PRISMA PARA AGENDA ===')
      console.log('Data selecionada:', selectedDate)
      
      // Apenas agendamentos reais do Prisma via API pública
      const response = await fetch('/api/appointments/public')
      if (response.ok) {
        const data = await response.json()
        console.log('Agendamentos recebidos do Prisma:', data.length)
        console.log('Dados completos:', data)
        
        // Filtrar agendamentos pela data selecionada
        const selectedDateString = selectedDate.toISOString().split('T')[0]
        console.log('Data selecionada (string):', selectedDateString)
        
        const filteredAppointments = data.filter((apt: any) => {
          const aptDate = new Date(apt.startTime).toISOString().split('T')[0]
          const matches = aptDate === selectedDateString
          console.log(`Agendamento ${apt.id}: ${apt.client?.name} - Status: ${apt.status} - Data: ${aptDate} vs Selecionada: ${selectedDateString} - Match: ${matches}`)
          return matches
        })
        
        console.log('Agendamentos filtrados para a data:', filteredAppointments.length)
        console.log('Agendamentos filtrados:', filteredAppointments)
        setAppointments(filteredAppointments)
      } else {
        console.error('Erro ao buscar agendamentos do Prisma:', response.status, response.statusText)
        setAppointments([])
      }
    } catch (error) {
      console.error('Error ao buscar agendamentos do Prisma:', error)
      setAppointments([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAppointments()
  }, [selectedDate])

  // Aguardar carregamento inicial do contexto
  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Carregando...</p>
      </div>
    )
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value)
  }

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'bg-green-100 text-green-800'
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800'
      case 'CANCELLED':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'Concluído'
      case 'PENDING':
        return 'Pendente'
      case 'CANCELLED':
        return 'Cancelado'
      default:
        return status
    }
  }

  const handleDateSelect = (date: Date) => {
    console.log('handleDateSelect chamado com:', date)
    setSelectedDate(date)
  }

  const handleNewAppointment = () => {
    console.log('handleNewAppointment chamado')
    setEditingAppointment(null)
    setIsModalOpen(true)
  }

  const handleEditAppointment = (appointment: Appointment) => {
    setEditingAppointment(appointment)
    setIsModalOpen(true)
  }

  const handleSaveAppointment = (appointment: Appointment) => {
    fetchAppointments() // Refresh appointments after save
    setIsModalOpen(false)
    setEditingAppointment(null)
  }

  const handleDeleteAppointment = (appointment: Appointment) => {
    if (confirm('Tem certeza que deseja cancelar este agendamento?')) {
      // TODO: Implement delete API call
      console.log('Delete appointment:', appointment)
    }
  }

  const handleStatusChange = (appointment: Appointment, newStatus: string) => {
    // TODO: Implement status change API call
    console.log('Change status:', appointment, newStatus)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-black to-gray-900">
      <AgendaSidebar />
      
      <div className="lg:pl-80">
        <AgendaHeader onNewAppointment={handleNewAppointment} onDateFilter={handleDateSelect} />
        
        <div className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            {/* Calendar View - 2 columns */}
            <div className="lg:col-span-2">
              <CalendarView onDateSelect={handleDateSelect} selectedDate={selectedDate} />
            </div>
            
            {/* Quick Stats - 1 column */}
            <div className="space-y-4">
              <div className="bg-gradient-to-br from-gray-800/50 to-black/50 border border-white/6 rounded-2xl p-6">
                <h3 className="text-xl font-semibold text-white mb-4">Resumo do Dia</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-white/60">Total</span>
                    <span className="text-2xl font-bold text-white">{appointments.length}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-white/60">Pendentes</span>
                    <span className="text-xl font-bold text-yellow-400">
                      {appointments.filter(a => a.status === 'PENDING').length}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-white/60">Concluídos</span>
                    <span className="text-xl font-bold text-green-400">
                      {appointments.filter(a => a.status === 'COMPLETED').length}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-white/60">Faturamento</span>
                    <span className="text-xl font-bold text-yellow-400">
                      {formatCurrency(appointments.reduce((sum, a) => sum + a.totalAmount, 0))}
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
          />
        </div>
      </div>

      {/* Appointment Modal */}
      <AppointmentModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveAppointment}
        appointment={editingAppointment}
      />
    </div>
  )
}
