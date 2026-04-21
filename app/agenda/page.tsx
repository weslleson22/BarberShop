'use client'

import { useState, useEffect } from 'react'
import { Calendar, Clock, User, Phone, DollarSign, ArrowLeft, Home } from 'lucide-react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/lib/auth-context'

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
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])

  const fetchAppointments = async () => {
    try {
      console.log('=== BUSCANDO AGENDAMENTOS DO PRISMA PARA AGENDA ===')
      console.log('Data selecionada (formato ISO):', selectedDate)
      
      // Apenas agendamentos reais do Prisma via API pública
      const response = await fetch('/api/appointments/public')
      if (response.ok) {
        const data = await response.json()
        console.log('Agendamentos recebidos do Prisma:', data.length)
        console.log('Total de agendamentos do Prisma:', data.length)
        
        // Debug detalhado de cada agendamento
        data.forEach((apt: any, index: number) => {
          const aptDate = new Date(apt.startTime)
          const aptDateString = aptDate.toISOString().split('T')[0]
          console.log(`Agendamento ${index + 1}:`)
          console.log(`  ID: ${apt.id}`)
          console.log(`  Cliente: ${apt.client?.name}`)
          console.log(`  Data do agendamento: ${aptDateString}`)
          console.log(`  Data selecionada: ${selectedDate}`)
          console.log(`  Coincide: ${aptDateString === selectedDate}`)
          console.log(`  Horário completo: ${apt.startTime}`)
          console.log('---')
        })
        
        // Filtrar agendamentos pela data selecionada
        const filteredAppointments = data.filter((apt: any) => {
          const aptDate = new Date(apt.startTime).toISOString().split('T')[0]
          const matches = aptDate === selectedDate
          if (!matches && data.length <= 5) {
            console.log(`Agendamento ${apt.id} NÃO coincide - Data: ${aptDate} vs Selecionada: ${selectedDate}`)
          }
          return matches
        })
        
        console.log('=== RESULTADO DO FILTRO ===')
        console.log('Agendamentos filtrados para a data:', filteredAppointments.length)
        console.log('Agendamentos que serão mostrados:', filteredAppointments.map((apt: any) => ({
          id: apt.id,
          client: apt.client?.name,
          time: apt.startTime,
          date: new Date(apt.startTime).toISOString().split('T')[0]
        })))
        
        setAppointments(filteredAppointments)
      } else {
        console.error('Erro ao buscar agendamentos do Prisma:', response.status, response.statusText)
        // Se falhar, mostrar array vazio - sem dados mockados
        setAppointments([])
      }
    } catch (error) {
      console.error('Error ao buscar agendamentos do Prisma:', error)
      // Em caso de erro, mostrar array vazio - sem dados mockados
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Botões de navegação */}
      <div className="absolute top-4 left-4 flex space-x-2">
        <button
          onClick={() => router.back()}
          className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors"
          title="Voltar"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Voltar</span>
        </button>
        <Link
          href="/"
          className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors"
          title="Página Inicial"
        >
          <Home className="w-4 h-4" />
          <span>Home</span>
        </Link>
      </div>
      
      <div className="mb-8 pt-16">
        <h1 className="text-3xl font-bold text-gray-900">Agenda</h1>
        <p className="text-gray-600 mt-2">Visualize e gerencie todos os agendamentos</p>
      </div>

      {/* Filtro de Data */}
      <div className="mb-6">
        <div className="flex items-center space-x-4">
          <div className="flex items-center">
            <Calendar className="w-5 h-5 text-gray-500 mr-2" />
            <label htmlFor="date" className="text-sm font-medium text-gray-700 mr-2">
              Data:
            </label>
            <input
              type="date"
              id="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Lista de Agendamentos */}
      <div className="space-y-4">
        {appointments.length === 0 ? (
          <div className="text-center py-12">
            <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">Nenhum agendamento encontrado</p>
            <p className="text-gray-400 text-sm mt-2">Tente selecionar outra data</p>
          </div>
        ) : (
          appointments.map((appointment) => (
            <div key={appointment.id} className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center mb-4">
                    <Clock className="w-5 h-5 text-gray-500 mr-2" />
                    <span className="text-lg font-semibold text-gray-900">
                      {formatTime(appointment.startTime)}
                    </span>
                    <span className="mx-2 text-gray-500">-</span>
                    <span className="text-lg text-gray-600">
                      {formatTime(appointment.endTime)}
                    </span>
                    <span className={`ml-4 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(appointment.status)}`}>
                      {getStatusText(appointment.status)}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="flex items-center">
                      <User className="w-4 h-4 text-gray-500 mr-2" />
                      <div>
                        <p className="text-sm text-gray-600">Cliente</p>
                        <p className="font-medium text-gray-900">{appointment.client.name}</p>
                        <p className="text-sm text-gray-500">{appointment.client.phone}</p>
                      </div>
                    </div>

                    <div className="flex items-center">
                      <User className="w-4 h-4 text-gray-500 mr-2" />
                      <div>
                        <p className="text-sm text-gray-600">Barbeiro</p>
                        <p className="font-medium text-gray-900">{appointment.barber.name}</p>
                      </div>
                    </div>

                    <div className="flex items-center">
                      <DollarSign className="w-4 h-4 text-gray-500 mr-2" />
                      <div>
                        <p className="text-sm text-gray-600">Serviço</p>
                        <p className="font-medium text-gray-900">{appointment.service.name}</p>
                        <p className="text-sm text-gray-500">{formatCurrency(appointment.totalAmount)}</p>
                      </div>
                    </div>
                  </div>

                  {appointment.notes && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <p className="text-sm text-gray-600">
                        <span className="font-medium">Observações:</span> {appointment.notes}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Resumo do Dia */}
      {appointments.length > 0 && (
        <div className="mt-8 bg-blue-50 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-4">Resumo do Dia</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-blue-600">Total de Agendamentos</p>
              <p className="text-2xl font-bold text-blue-900">{appointments.length}</p>
            </div>
            <div>
              <p className="text-sm text-blue-600">Pendentes</p>
              <p className="text-2xl font-bold text-blue-900">
                {appointments.filter(a => a.status === 'PENDING').length}
              </p>
            </div>
            <div>
              <p className="text-sm text-blue-600">Concluídos</p>
              <p className="text-2xl font-bold text-blue-900">
                {appointments.filter(a => a.status === 'COMPLETED').length}
              </p>
            </div>
            <div>
              <p className="text-sm text-blue-600">Faturamento</p>
              <p className="text-2xl font-bold text-blue-900">
                {formatCurrency(appointments.reduce((sum, a) => sum + a.totalAmount, 0))}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
