'use client'

import { Clock, User, Phone, DollarSign, CheckCircle, AlertCircle, XCircle, MoreVertical, Edit, X } from 'lucide-react'

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

interface AppointmentCardProps {
  appointment: Appointment
  onEdit?: (appointment: Appointment) => void
  onDelete?: (appointment: Appointment) => void
  onStatusChange?: (appointment: Appointment, newStatus: string) => void
}

export default function AppointmentCard({ 
  appointment, 
  onEdit, 
  onDelete, 
  onStatusChange 
}: AppointmentCardProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value)
  }

  const handleCancel = async (appointment: Appointment) => {
    if (!confirm('Tem certeza que deseja cancelar este agendamento?')) {
      return
    }

    try {
      const response = await fetch(`/api/appointments/${appointment.id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        const result = await response.json()
        console.log('Agendamento cancelado:', result)
        onStatusChange?.(appointment, 'CANCELLED')
        alert('Agendamento cancelado com sucesso!')
      } else {
        const error = await response.json()
        console.error('Erro ao cancelar:', error)
        alert(error.error || 'Erro ao cancelar agendamento')
      }
    } catch (error) {
      console.error('Error cancelling appointment:', error)
      alert('Erro ao cancelar agendamento')
    }
  }

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return {
          text: 'Concluído',
          icon: CheckCircle,
          color: 'text-green-400 bg-green-400/10 border-green-400/30'
        }
      case 'PENDING':
        return {
          text: 'Pendente',
          icon: AlertCircle,
          color: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/30'
        }
      case 'CANCELLED':
        return {
          text: 'Cancelado',
          icon: XCircle,
          color: 'text-red-400 bg-red-400/10 border-red-400/30'
        }
      default:
        return {
          text: status,
          icon: AlertCircle,
          color: 'text-white/60 bg-white/10 border-white/20'
        }
    }
  }

  const statusInfo = getStatusInfo(appointment.status)
  const StatusIcon = statusInfo.icon

  return (
    <div className={`bg-gradient-to-br from-gray-800/50 to-black/50 border border-white/6 rounded-xl p-4 hover:border-white/10 transition-all duration-300 relative z-10 ${
      appointment.status === 'CANCELLED' ? 'opacity-60' : ''
    }`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
            appointment.status === 'CANCELLED' 
              ? 'bg-gradient-to-br from-red-400/20 to-red-600/20 border border-red-400/30'
              : 'bg-gradient-to-br from-yellow-400/20 to-yellow-600/20 border border-yellow-400/30'
          }`}>
            <Clock className={`w-5 h-5 ${
              appointment.status === 'CANCELLED' ? 'text-red-400' : 'text-yellow-400'
            }`} />
          </div>
          <div>
            <div className="flex items-center space-x-2 mb-1">
              <span className={`text-lg font-bold ${
                appointment.status === 'CANCELLED' ? 'text-white/60' : 'text-white'
              }`}>
                {formatTime(appointment.startTime)}
              </span>
              <span className="text-white/60">-</span>
              <span className={`text-sm ${
                appointment.status === 'CANCELLED' ? 'text-white/40' : 'text-white/80'
              }`}>
                {formatTime(appointment.endTime)}
              </span>
            </div>
            <div className={`flex items-center space-x-2 px-2 py-1 rounded-lg border ${statusInfo.color}`}>
              <StatusIcon className="w-3 h-3" />
              <span className="text-xs font-medium">{statusInfo.text}</span>
            </div>
          </div>
        </div>
        
        <button className="p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-all">
          <MoreVertical className="w-5 h-5" />
        </button>
      </div>

      {/* Content */}
      <div className="space-y-4">
        {/* Client Info */}
        <div className={`bg-white/5 border border-white/10 rounded-xl p-4 ${
          appointment.status === 'CANCELLED' ? 'opacity-70' : ''
        }`}>
          <div className="flex items-center space-x-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
              appointment.status === 'CANCELLED'
                ? 'bg-gradient-to-br from-gray-400 to-gray-600'
                : 'bg-gradient-to-br from-blue-400 to-blue-600'
            }`}>
              <span className="text-white font-bold text-lg">
                {appointment.client.name.charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <p className={`font-medium ${
                appointment.status === 'CANCELLED' ? 'text-white/60' : 'text-white'
              }`}>{appointment.client.name}</p>
              <p className={`text-sm ${
                appointment.status === 'CANCELLED' ? 'text-white/40' : 'text-white/60'
              }`}>{appointment.client.phone}</p>
            </div>
          </div>
        </div>

        {/* Barber Info */}
        <div className={`bg-white/5 border border-white/10 rounded-xl p-4 ${
          appointment.status === 'CANCELLED' ? 'opacity-70' : ''
        }`}>
          <div className="flex items-center space-x-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
              appointment.status === 'CANCELLED'
                ? 'bg-gradient-to-br from-gray-400 to-gray-600'
                : 'bg-gradient-to-br from-purple-400 to-purple-600'
            }`}>
              <span className="text-white font-bold text-lg">
                {appointment.barber.name.charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <p className={`text-sm mb-1 ${
                appointment.status === 'CANCELLED' ? 'text-white/40' : 'text-white/60'
              }`}>Barbeiro</p>
              <p className={`font-medium ${
                appointment.status === 'CANCELLED' ? 'text-white/60' : 'text-white'
              }`}>{appointment.barber.name}</p>
            </div>
          </div>
        </div>

        {/* Service Info */}
        <div className={`bg-white/5 border border-white/10 rounded-xl p-4 ${
          appointment.status === 'CANCELLED' ? 'opacity-70' : ''
        }`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-sm mb-1 ${
                appointment.status === 'CANCELLED' ? 'text-white/40' : 'text-white/60'
              }`}>Serviço</p>
              <p className={`font-medium ${
                appointment.status === 'CANCELLED' ? 'text-white/60' : 'text-white'
              }`}>{appointment.service.name}</p>
              <p className={`text-sm ${
                appointment.status === 'CANCELLED' ? 'text-white/30' : 'text-white/60'
              }`}>{appointment.service.duration}min</p>
            </div>
            <div className="text-right">
              <p className={`text-sm mb-1 ${
                appointment.status === 'CANCELLED' ? 'text-white/40' : 'text-white/60'
              }`}>Valor</p>
              <p className={`text-xl font-bold ${
                appointment.status === 'CANCELLED' ? 'text-white/40' : 'text-yellow-400'
              }`}>{formatCurrency(appointment.totalAmount)}</p>
            </div>
          </div>
        </div>

        {/* Notes */}
        {appointment.notes && (
          <div className={`bg-white/5 border border-white/10 rounded-xl p-4 ${
            appointment.status === 'CANCELLED' ? 'opacity-70' : ''
          }`}>
            <p className={`text-sm mb-1 ${
              appointment.status === 'CANCELLED' ? 'text-white/40' : 'text-white/60'
            }`}>Observações</p>
            <p className={`text-white/80 ${
              appointment.status === 'CANCELLED' ? 'text-white/40' : ''
            }`}>{appointment.notes}</p>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center space-x-3 mt-6 pt-4 border-t border-white/6">
        {appointment.status !== 'CANCELLED' && (
          <button 
            onClick={() => onEdit?.(appointment)}
            className="flex-1 py-2 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-all text-white/80 hover:text-white flex items-center justify-center space-x-2"
          >
            <Edit className="w-4 h-4" />
            <span>Editar</span>
          </button>
        )}
        {appointment.status !== 'COMPLETED' && appointment.status !== 'CANCELLED' && (
          <button 
            onClick={() => onStatusChange?.(appointment, 'COMPLETED')}
            className="flex-1 py-2 bg-green-500/20 border border-green-500/30 rounded-lg hover:bg-green-500/30 transition-all text-green-400 hover:text-green-300 flex items-center justify-center space-x-2"
          >
            <CheckCircle className="w-4 h-4" />
            <span>Concluir</span>
          </button>
        )}
        {appointment.status !== 'CANCELLED' && (
          <button 
            onClick={() => handleCancel(appointment)}
            className="flex-1 py-2 bg-red-500/20 border border-red-500/30 rounded-lg hover:bg-red-500/30 transition-all text-red-400 hover:text-red-300 flex items-center justify-center space-x-2"
          >
            <X className="w-4 h-4" />
            <span>Cancelar</span>
          </button>
        )}
      </div>
    </div>
  )
}
