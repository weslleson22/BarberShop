'use client'

import { useState, useRef, useEffect } from 'react'
import { Clock, CheckCircle, AlertCircle, XCircle, MoreVertical, Edit, X, Eye, Calendar, Crown } from 'lucide-react'

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
    avatar?: string
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
  onViewDetails?: (appointment: Appointment) => void
  userRole?: string
}

export default function AppointmentCard({ 
  appointment, 
  onEdit, 
  onDelete, 
  onStatusChange,
  onViewDetails,
  userRole,
}: AppointmentCardProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    if (menuOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [menuOpen])

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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  }

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return {
          text: 'Concluído',
          icon: CheckCircle,
          color: 'text-green-400 bg-green-400/10 border-green-400/30',
        }
      case 'CONFIRMED':
        return {
          text: 'Confirmado',
          icon: CheckCircle,
          color: 'text-blue-400 bg-blue-400/10 border-blue-400/30',
        }
      case 'CANCELLED':
        return {
          text: 'Cancelado',
          icon: XCircle,
          color: 'text-red-400 bg-red-400/10 border-red-400/30',
        }
      case 'PENDING':
      default:
        return {
          text: 'Pendente',
          icon: AlertCircle,
          color: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/30',
        }
    }
  }

  const statusInfo = getStatusInfo(appointment.status)
  const StatusIcon = statusInfo.icon

  return (
    <div className={`bg-gradient-to-br from-gray-800/50 to-black/50 border border-white/6 rounded-lg md:rounded-xl p-3 md:p-4 hover:border-white/20 transition-all duration-300 relative z-10 ${
      appointment.status === 'CANCELLED' ? 'opacity-70' : ''
    }`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-3 md:mb-4">
        <div className="flex items-center space-x-2 md:space-x-3 min-w-0 flex-1">
          <div className={`w-8 h-8 md:w-10 md:h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
            appointment.status === 'CANCELLED' 
              ? 'bg-gradient-to-br from-red-400/20 to-red-600/20 border border-red-400/30'
              : appointment.status === 'COMPLETED'
              ? 'bg-gradient-to-br from-green-400/20 to-green-600/20 border border-green-400/30'
              : 'bg-gradient-to-br from-yellow-400/20 to-yellow-600/20 border border-yellow-400/30'
          }`}>
            <Clock className={`w-4 h-4 md:w-5 md:h-5 ${
              appointment.status === 'CANCELLED' 
                ? 'text-red-400' 
                : appointment.status === 'COMPLETED'
                ? 'text-green-400'
                : 'text-yellow-400'
            }`} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center space-x-1.5 md:space-x-2 mb-1 flex-wrap">
              <span className={`text-base md:text-lg font-bold ${
                appointment.status === 'CANCELLED' ? 'text-white/60' : 'text-white'
              }`}>
                {formatTime(appointment.startTime)}
              </span>
              <span className="text-white/60 text-sm md:text-base">-</span>
              <span className={`text-xs md:text-sm ${
                appointment.status === 'CANCELLED' ? 'text-white/40' : 'text-white/80'
              }`}>
                {formatTime(appointment.endTime)}
              </span>
              <span className="text-white/40 text-xs flex items-center gap-1 ml-1">
                <Calendar className="w-3 h-3" />
                {formatDate(appointment.startTime)}
              </span>
            </div>
            <div className={`inline-flex items-center space-x-1.5 px-2 py-0.5 rounded-lg border ${statusInfo.color}`}>
              <StatusIcon className="w-3 h-3" />
              <span className="text-xs font-medium">{statusInfo.text}</span>
            </div>
          </div>
        </div>
        
        {/* Dropdown Menu */}
        <div className="relative" ref={menuRef}>
          <button 
            type="button"
            onClick={() => setMenuOpen(!menuOpen)}
            className="p-1.5 md:p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-all flex-shrink-0"
            title="Mais opções"
            aria-label="Mais opções"
          >
            <MoreVertical className="w-4 h-4 md:w-5 md:h-5" />
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-full mt-1 w-44 bg-gray-900 border border-white/10 rounded-xl shadow-xl z-30 py-1 overflow-hidden animate-fadeIn">
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false)
                  onViewDetails?.(appointment)
                }}
                className="w-full px-3 py-2 text-left text-xs text-white/80 hover:bg-white/10 hover:text-white flex items-center gap-2"
              >
                <Eye className="w-3.5 h-3.5 text-blue-400" />
                <span>Ver Detalhes</span>
              </button>

              {appointment.status !== 'COMPLETED' && appointment.status !== 'CANCELLED' && onStatusChange && (
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false)
                    onStatusChange(appointment, 'COMPLETED')
                  }}
                  className="w-full px-3 py-2 text-left text-xs text-white/80 hover:bg-white/10 hover:text-green-400 flex items-center gap-2"
                >
                  <CheckCircle className="w-3.5 h-3.5 text-green-400" />
                  <span>Concluir</span>
                </button>
              )}

              {appointment.status !== 'CANCELLED' && onEdit && (
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false)
                    onEdit(appointment)
                  }}
                  className="w-full px-3 py-2 text-left text-xs text-white/80 hover:bg-white/10 hover:text-blue-400 flex items-center gap-2"
                >
                  <Edit className="w-3.5 h-3.5 text-blue-400" />
                  <span>Editar</span>
                </button>
              )}

              {appointment.status !== 'CANCELLED' && onDelete && (
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false)
                    onDelete(appointment)
                  }}
                  className="w-full px-3 py-2 text-left text-xs text-red-400 hover:bg-white/10 flex items-center gap-2"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Cancelar</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="space-y-2 md:space-y-3">
        {/* Client Info */}
        <div 
          onClick={() => onViewDetails?.(appointment)}
          className={`bg-white/5 border border-white/10 rounded-lg md:rounded-xl p-3 md:p-3.5 cursor-pointer hover:bg-white/10 transition-all ${
            appointment.status === 'CANCELLED' ? 'opacity-80' : ''
          }`}
          title="Clique para ver detalhes"
        >
          <div className="flex items-center space-x-2 md:space-x-3">
            <div className={`w-8 h-8 md:w-9 md:h-9 rounded-full flex items-center justify-center flex-shrink-0 ${
              appointment.status === 'CANCELLED'
                ? 'bg-gradient-to-br from-gray-400 to-gray-600'
                : 'bg-gradient-to-br from-blue-400 to-blue-600'
            }`}>
              <span className="text-white font-bold text-xs md:text-sm">
                {appointment.client?.name ? appointment.client.name.charAt(0).toUpperCase() : 'C'}
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className={`font-semibold text-sm md:text-base truncate ${
                  appointment.status === 'CANCELLED' ? 'text-white/60' : 'text-white'
                }`}>{appointment.client?.name || 'Cliente'}</p>
                {Boolean(appointment.isVip || appointment.client?.isVip) && (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] md:text-[11px] font-bold bg-gradient-to-r from-yellow-400/20 to-amber-500/20 text-yellow-300 border border-yellow-400/40 flex-shrink-0 shadow-sm shadow-yellow-400/10">
                    <Crown className="w-2.5 h-2.5 text-yellow-400" />
                    VIP
                  </span>
                )}
              </div>
              <p className={`text-xs ${
                appointment.status === 'CANCELLED' ? 'text-white/40' : 'text-white/60'
              }`}>{appointment.client?.phone || 'Sem telefone'}</p>
            </div>
          </div>
        </div>

        {/* Barber Info */}
        <div className={`bg-white/5 border border-white/10 rounded-lg md:rounded-xl p-2.5 md:p-3 ${
          appointment.status === 'CANCELLED' ? 'opacity-80' : ''
        }`}>
          <div className="flex items-center space-x-2 md:space-x-3">
            <div className={`w-8 h-8 md:w-9 md:h-9 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden ${
              appointment.status === 'CANCELLED'
                ? 'bg-gradient-to-br from-gray-400 to-gray-600'
                : 'bg-gradient-to-br from-yellow-400 to-yellow-600'
            }`}>
              {appointment.barber?.avatar ? (
                <img
                  src={appointment.barber.avatar}
                  alt={appointment.barber.name}
                  className="w-full h-full object-cover rounded-full"
                />
              ) : (
                <span className="text-black font-bold text-xs">
                  {appointment.barber?.name ? appointment.barber.name.charAt(0).toUpperCase() : 'B'}
                </span>
              )}
            </div>
            <div className="min-w-0">
              <p className={`text-[10px] uppercase font-bold tracking-wider ${
                appointment.status === 'CANCELLED' ? 'text-white/40' : 'text-yellow-400/80'
              }`}>Barbeiro</p>
              <p className={`font-medium text-xs md:text-sm truncate ${
                appointment.status === 'CANCELLED' ? 'text-white/60' : 'text-white'
              }`}>{appointment.barber?.name || 'Barbeiro'}</p>
            </div>
          </div>
        </div>

        {/* Service Info */}
        <div className={`bg-white/5 border border-white/10 rounded-lg md:rounded-xl p-3 ${
          appointment.status === 'CANCELLED' ? 'opacity-80' : ''
        }`}>
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <p className={`text-[10px] uppercase font-bold tracking-wider ${
                appointment.status === 'CANCELLED' ? 'text-white/40' : 'text-white/50'
              }`}>Serviço</p>
              <p className={`font-medium text-sm truncate ${
                appointment.status === 'CANCELLED' ? 'text-white/60' : 'text-white'
              }`}>{appointment.service?.name || 'Serviço'}</p>
              <p className={`text-xs ${
                appointment.status === 'CANCELLED' ? 'text-white/30' : 'text-white/60'
              }`}>{appointment.service?.duration || 30}min</p>
            </div>
            <div className="text-right flex-shrink-0 ml-2">
              <p className={`text-[10px] uppercase font-bold tracking-wider ${
                appointment.status === 'CANCELLED' ? 'text-white/40' : 'text-white/50'
              }`}>Valor</p>
              <p className={`text-base md:text-lg font-bold ${
                appointment.status === 'CANCELLED' ? 'text-white/40' : 'text-yellow-400'
              }`}>{formatCurrency(appointment.totalAmount || appointment.service?.price || 0)}</p>
            </div>
          </div>
        </div>

        {/* Notes */}
        {appointment.notes && (
          <div className={`bg-white/5 border border-white/10 rounded-lg md:rounded-xl p-2.5 md:p-3 ${
            appointment.status === 'CANCELLED' ? 'opacity-70' : ''
          }`}>
            <p className={`text-[10px] uppercase font-bold tracking-wider mb-0.5 ${
              appointment.status === 'CANCELLED' ? 'text-white/40' : 'text-white/50'
            }`}>Observações</p>
            <p className={`text-white/80 text-xs line-clamp-2 ${
              appointment.status === 'CANCELLED' ? 'text-white/40' : ''
            }`}>{appointment.notes}</p>
          </div>
        )}
      </div>

      {/* Actions Bar */}
      <div className="flex flex-wrap items-center gap-1.5 md:gap-2 mt-3 md:mt-4 pt-3 border-t border-white/6">
        {/* Sempre visível: Visualizar Detalhes */}
        <button
          type="button"
          onClick={() => onViewDetails?.(appointment)}
          className="flex-1 min-w-[90px] py-1.5 md:py-2 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-all text-white/80 hover:text-white flex items-center justify-center space-x-1.5 text-xs font-medium"
        >
          <Eye className="w-3.5 h-3.5 text-yellow-400" />
          <span>Detalhes</span>
        </button>

        {/* Concluir se Pendente/Confirmado */}
        {appointment.status !== 'COMPLETED' && appointment.status !== 'CANCELLED' && onStatusChange && (
          <button 
            type="button"
            onClick={() => onStatusChange(appointment, 'COMPLETED')}
            className="flex-1 min-w-[90px] py-1.5 md:py-2 bg-green-500/10 border border-green-500/20 rounded-lg hover:bg-green-500/20 transition-all text-green-400 hover:text-green-300 flex items-center justify-center space-x-1.5 text-xs font-semibold"
          >
            <CheckCircle className="w-3.5 h-3.5" />
            <span>Concluir</span>
          </button>
        )}

        {/* Editar */}
        {appointment.status !== 'CANCELLED' && onEdit && (
          <button 
            type="button"
            onClick={() => onEdit(appointment)}
            className="flex-1 min-w-[80px] py-1.5 md:py-2 bg-blue-500/10 border border-blue-500/20 rounded-lg hover:bg-blue-500/20 transition-all text-blue-400 hover:text-blue-300 flex items-center justify-center space-x-1.5 text-xs font-medium"
          >
            <Edit className="w-3.5 h-3.5" />
            <span>Editar</span>
          </button>
        )}

        {/* Cancelar */}
        {appointment.status !== 'CANCELLED' && onDelete && (
          <button 
            type="button"
            onClick={() => onDelete(appointment)}
            className="flex-1 min-w-[80px] py-1.5 md:py-2 bg-red-500/10 border border-red-500/20 rounded-lg hover:bg-red-500/20 transition-all text-red-400 hover:text-red-300 flex items-center justify-center space-x-1.5 text-xs font-medium"
          >
            <X className="w-3.5 h-3.5" />
            <span>Cancelar</span>
          </button>
        )}
      </div>
    </div>
  )
}
