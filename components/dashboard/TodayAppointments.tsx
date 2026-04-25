'use client'

import { useState, useEffect } from 'react'
import { Clock, Users, CheckCircle, AlertCircle, XCircle, Calendar } from 'lucide-react'

interface Appointment {
  id: string
  startTime: string
  client: {
    name: string
    phone: string
  }
  service: {
    name: string
    price: number
  }
  status: 'PENDING' | 'COMPLETED' | 'CANCELLED'
  barber: {
    name: string
  }
}

export default function TodayAppointments() {
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchTodayAppointments()
  }, [])

  const fetchTodayAppointments = async () => {
    try {
      // Get today's date in YYYY-MM-DD format
      const today = new Date()
      const todayStr = today.toISOString().split('T')[0]
      
      console.log('=== BUSCANDO AGENDAMENTOS DE HOJE ===')
      console.log('Data de hoje:', todayStr)
      
      const response = await fetch('/api/appointments/public')
      const allAppointments = await response.json()
      
      console.log('Total de agendamentos recebidos:', allAppointments.length)
      
      // Filter appointments for today
      const todayAppointments = allAppointments.filter((apt: any) => {
        const aptDate = new Date(apt.startTime).toISOString().split('T')[0]
        const isToday = aptDate === todayStr
        
        if (isToday) {
          console.log('Agendamento de hoje encontrado:', {
            client: apt.client,
            service: apt.service,
            time: apt.startTime,
            status: apt.status
          })
        }
        
        return isToday
      })
      
      console.log('Agendamentos de hoje filtrados:', todayAppointments.length)
      setAppointments(todayAppointments)
      
    } catch (error) {
      console.error('Erro ao buscar agendamentos de hoje:', error)
      setAppointments([])
    } finally {
      setLoading(false)
    }
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleTimeString('pt-BR', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    })
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return <CheckCircle className="w-4 h-4 text-green-400" />
      case 'CANCELLED':
        return <XCircle className="w-4 h-4 text-red-400" />
      case 'PENDING':
      default:
        return <AlertCircle className="w-4 h-4 text-yellow-400" />
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'Concluído'
      case 'CANCELLED':
        return 'Cancelado'
      case 'PENDING':
      default:
        return 'Pendente'
    }
  }

  if (loading) {
    return (
      <div className="bg-gradient-to-br from-gray-800/50 to-black/50 border border-white/6 rounded-2xl p-6">
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-yellow-400"></div>
        </div>
      </div>
    )
  }

  const todayAppointments = appointments

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'text-green-400 bg-green-400/10 border-green-400/30'
      case 'PENDING':
        return 'text-yellow-400 bg-yellow-400/10 border-yellow-400/30'
      case 'CANCELLED':
        return 'text-red-400 bg-red-400/10 border-red-400/30'
      default:
        return 'text-white/60 bg-white/10 border-white/20'
    }
  }

  return (
    <div className="bg-gradient-to-br from-gray-800/50 to-black/50 border border-white/6 rounded-2xl p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-xl font-semibold text-white">Agendamentos de Hoje</h3>
          <p className="text-white/60 text-sm">{appointments.length} agendamentos</p>
        </div>
        <div className="flex items-center space-x-2 text-white/60">
          <Clock className="w-4 h-4" />
          <span className="text-sm">Hoje</span>
        </div>
      </div>

      <div className="space-y-3">
        {appointments.map((appointment) => (
          <div
            key={appointment.id}
            className="flex items-center justify-between p-4 bg-white/5 border border-white/6 rounded-xl hover:bg-white/10 transition-all"
          >
            <div className="flex items-center space-x-4">
              {/* Time */}
              <div className="text-center">
                <p className="text-white font-semibold">{formatTime(appointment.startTime)}</p>
                <p className="text-white/40 text-xs">30min</p>
              </div>

              {/* Client Info */}
              <div className="flex-1">
                <p className="text-white font-medium">{appointment.client.name}</p>
                <p className="text-white/60 text-sm">{appointment.service.name}</p>
              </div>
            </div>

            {/* Status */}
            <div className={`flex items-center space-x-2 px-3 py-1 rounded-lg border ${getStatusColor(appointment.status)}`}>
              {getStatusIcon(appointment.status)}
              <span className="text-xs font-medium">{getStatusText(appointment.status)}</span>
            </div>
          </div>
        ))}
      </div>

      {/* View All Button */}
      <div className="mt-6 pt-4 border-t border-white/6">
        <button className="w-full py-3 text-yellow-400 hover:text-yellow-300 font-medium transition-colors">
          Ver todos os agendamentos
        </button>
      </div>
    </div>
  )
}
