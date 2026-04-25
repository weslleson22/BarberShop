'use client'

import { Clock, Users, CheckCircle, AlertCircle, XCircle } from 'lucide-react'

interface Appointment {
  id: string
  time: string
  client: string
  service: string
  status: 'confirmed' | 'pending' | 'cancelled'
  duration: string
}

export default function TodayAppointments() {
  const appointments: Appointment[] = [
    {
      id: '1',
      time: '09:00',
      client: 'Carlos Silva',
      service: 'Corte + Barba',
      status: 'confirmed',
      duration: '1h 30min'
    },
    {
      id: '2',
      time: '10:30',
      client: 'Maria Santos',
      service: 'Progressiva',
      status: 'confirmed',
      duration: '2h'
    },
    {
      id: '3',
      time: '14:00',
      client: 'João Oliveira',
      service: 'Barba',
      status: 'pending',
      duration: '30min'
    },
    {
      id: '4',
      time: '15:30',
      client: 'Ana Costa',
      service: 'Corte Masculino',
      status: 'confirmed',
      duration: '45min'
    },
    {
      id: '5',
      time: '16:30',
      client: 'Pedro Santos',
      service: 'Corte + Pigmentação',
      status: 'cancelled',
      duration: '2h'
    },
    {
      id: '6',
      time: '17:00',
      client: 'Lucas Ferreira',
      service: 'Sobrancelha',
      status: 'pending',
      duration: '20min'
    }
  ]

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'confirmed':
        return <CheckCircle className="w-4 h-4 text-green-400" />
      case 'pending':
        return <AlertCircle className="w-4 h-4 text-yellow-400" />
      case 'cancelled':
        return <XCircle className="w-4 h-4 text-red-400" />
      default:
        return null
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'Confirmado'
      case 'pending':
        return 'Pendente'
      case 'cancelled':
        return 'Cancelado'
      default:
        return status
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'text-green-400 bg-green-400/10 border-green-400/30'
      case 'pending':
        return 'text-yellow-400 bg-yellow-400/10 border-yellow-400/30'
      case 'cancelled':
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
                <p className="text-white font-semibold">{appointment.time}</p>
                <p className="text-white/40 text-xs">{appointment.duration}</p>
              </div>

              {/* Client Info */}
              <div className="flex-1">
                <p className="text-white font-medium">{appointment.client}</p>
                <p className="text-white/60 text-sm">{appointment.service}</p>
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
