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
          color: 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
        }
      case 'CONFIRMED':
        return {
          text: 'Confirmado',
          icon: CheckCircle,
          color: 'text-blue-600 dark:text-blue-400 bg-blue-500/10 border-blue-500/20',
        }
      case 'CANCELLED':
        return {
          text: 'Cancelado',
          icon: XCircle,
          color: 'text-destructive bg-destructive/10 border-destructive/20',
        }
      case 'PENDING':
      default:
        return {
          text: 'Pendente',
          icon: AlertCircle,
          color: 'text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20',
        }
    }
  }

  const statusInfo = getStatusInfo(appointment.status)
  const StatusIcon = statusInfo.icon

  return (
    <div className={`bg-card text-card-foreground border border-border rounded-xl p-3.5 md:p-4 hover:border-primary/40 transition-all shadow-sm relative z-10 ${
      appointment.status === 'CANCELLED' ? 'opacity-70' : ''
    }`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-3 md:mb-4">
        <div className="flex items-center space-x-2 md:space-x-3 min-w-0 flex-1">
          <div className={`w-8 h-8 md:w-10 md:h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
            appointment.status === 'CANCELLED' 
              ? 'bg-destructive/10 border border-destructive/20' 
              : appointment.status === 'COMPLETED'
              ? 'bg-emerald-500/10 border border-emerald-500/20'
              : 'bg-primary/10 border border-primary/20'
          }`}>
            <Clock className={`w-4 h-4 md:w-5 md:h-5 ${
              appointment.status === 'CANCELLED' 
                ? 'text-destructive' 
                : appointment.status === 'COMPLETED'
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-primary'
            }`} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center space-x-1.5 md:space-x-2 mb-1 flex-wrap">
              <span className={`text-base md:text-lg font-bold ${
                appointment.status === 'CANCELLED' ? 'text-muted-foreground' : 'text-foreground'
              }`}>
                {formatTime(appointment.startTime)}
              </span>
              <span className="text-muted-foreground text-sm md:text-base">-</span>
              <span className={`text-xs md:text-sm ${
                appointment.status === 'CANCELLED' ? 'text-muted-foreground/70' : 'text-foreground/80'
              }`}>
                {formatTime(appointment.endTime)}
              </span>
              <span className="text-muted-foreground text-xs flex items-center gap-1 ml-1">
                <Calendar className="w-3 h-3" />
                {formatDate(appointment.startTime)}
              </span>
            </div>
            <div className={`inline-flex items-center space-x-1.5 px-2 py-0.5 rounded-lg border text-xs font-medium ${statusInfo.color}`}>
              <StatusIcon className="w-3 h-3" />
              <span>{statusInfo.text}</span>
            </div>
          </div>
        </div>
        
        {/* Dropdown Menu */}
        <div className="relative" ref={menuRef}>
          <button 
            type="button"
            onClick={() => setMenuOpen(!menuOpen)}
            className="p-1.5 md:p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-all flex-shrink-0 cursor-pointer"
            title="Mais opções"
            aria-label="Mais opções"
          >
            <MoreVertical className="w-4 h-4 md:w-5 md:h-5" />
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-full mt-1 w-44 bg-popover text-popover-foreground border border-border rounded-xl shadow-lg z-30 py-1 overflow-hidden animate-fadeIn">
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false)
                  onViewDetails?.(appointment)
                }}
                className="w-full px-3 py-2 text-left text-xs hover:bg-accent hover:text-accent-foreground flex items-center gap-2 cursor-pointer"
              >
                <Eye className="w-3.5 h-3.5 text-primary" />
                <span>Ver Detalhes</span>
              </button>

              {appointment.status !== 'COMPLETED' && appointment.status !== 'CANCELLED' && onStatusChange && (
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false)
                    onStatusChange(appointment, 'COMPLETED')
                  }}
                  className="w-full px-3 py-2 text-left text-xs text-emerald-600 dark:text-emerald-400 hover:bg-accent flex items-center gap-2 cursor-pointer"
                >
                  <CheckCircle className="w-3.5 h-3.5" />
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
                  className="w-full px-3 py-2 text-left text-xs hover:bg-accent hover:text-accent-foreground flex items-center gap-2 cursor-pointer"
                >
                  <Edit className="w-3.5 h-3.5 text-blue-500" />
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
                  className="w-full px-3 py-2 text-left text-xs text-destructive hover:bg-destructive/10 flex items-center gap-2 cursor-pointer"
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
      <div className="space-y-2 md:space-y-2.5">
        {/* Client Info */}
        <div 
          onClick={() => onViewDetails?.(appointment)}
          className={`bg-muted/40 border border-border rounded-lg p-3 cursor-pointer hover:bg-muted/70 transition-all ${
            appointment.status === 'CANCELLED' ? 'opacity-80' : ''
          }`}
          title="Clique para ver detalhes"
        >
          <div className="flex items-center space-x-2 md:space-x-3">
            <div className={`w-8 h-8 md:w-9 md:h-9 rounded-full flex items-center justify-center flex-shrink-0 ${
              appointment.status === 'CANCELLED'
                ? 'bg-muted text-muted-foreground'
                : 'bg-primary/10 text-primary font-bold'
            }`}>
              <span className="text-xs md:text-sm">
                {appointment.client?.name ? appointment.client.name.charAt(0).toUpperCase() : 'C'}
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className={`font-semibold text-sm md:text-base truncate ${
                  appointment.status === 'CANCELLED' ? 'text-muted-foreground' : 'text-foreground'
                }`}>{appointment.client?.name || 'Cliente'}</p>
                {Boolean(appointment.isVip || appointment.client?.isVip) && (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] md:text-[11px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 flex-shrink-0">
                    <Crown className="w-2.5 h-2.5" />
                    VIP
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground">{appointment.client?.phone || 'Sem telefone'}</p>
            </div>
          </div>
        </div>

        {/* Barber Info */}
        <div className={`bg-muted/40 border border-border rounded-lg p-2.5 ${
          appointment.status === 'CANCELLED' ? 'opacity-80' : ''
        }`}>
          <div className="flex items-center space-x-2 md:space-x-3">
            <div className={`w-8 h-8 md:w-9 md:h-9 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden ${
              appointment.status === 'CANCELLED'
                ? 'bg-muted text-muted-foreground'
                : 'bg-primary/10 text-primary font-bold'
            }`}>
              {appointment.barber?.avatar ? (
                <img
                  src={appointment.barber.avatar}
                  alt={appointment.barber.name}
                  className="w-full h-full object-cover rounded-full"
                />
              ) : (
                <span className="text-xs">
                  {appointment.barber?.name ? appointment.barber.name.charAt(0).toUpperCase() : 'B'}
                </span>
              )}
            </div>
            <div className="min-w-0">
              <p className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Barbeiro</p>
              <p className={`font-medium text-xs md:text-sm truncate ${
                appointment.status === 'CANCELLED' ? 'text-muted-foreground' : 'text-foreground'
              }`}>{appointment.barber?.name || 'Barbeiro'}</p>
            </div>
          </div>
        </div>

        {/* Service Info */}
        <div className={`bg-muted/40 border border-border rounded-lg p-3 ${
          appointment.status === 'CANCELLED' ? 'opacity-80' : ''
        }`}>
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <p className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Serviço</p>
              <p className={`font-medium text-sm truncate ${
                appointment.status === 'CANCELLED' ? 'text-muted-foreground' : 'text-foreground'
              }`}>{appointment.service?.name || 'Serviço'}</p>
              <p className="text-xs text-muted-foreground">{appointment.service?.duration || 30}min</p>
            </div>
            <div className="text-right flex-shrink-0 ml-2">
              <p className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Valor</p>
              <p className={`text-base md:text-lg font-bold ${
                appointment.status === 'CANCELLED' ? 'text-muted-foreground' : 'text-primary'
              }`}>{formatCurrency(appointment.totalAmount || appointment.service?.price || 0)}</p>
            </div>
          </div>
        </div>

        {/* Notes */}
        {appointment.notes && (
          <div className={`bg-muted/40 border border-border rounded-lg p-2.5 ${
            appointment.status === 'CANCELLED' ? 'opacity-70' : ''
          }`}>
            <p className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground mb-0.5">Observações</p>
            <p className="text-foreground/80 text-xs line-clamp-2">{appointment.notes}</p>
          </div>
        )}
      </div>

      {/* Actions Bar */}
      <div className="flex flex-wrap items-center gap-1.5 md:gap-2 mt-3 pt-3 border-t border-border">
        {/* Sempre visível: Visualizar Detalhes */}
        <button
          type="button"
          onClick={() => onViewDetails?.(appointment)}
          className="flex-1 min-w-[90px] py-1.5 md:py-2 bg-card border border-border rounded-lg hover:bg-muted transition-all text-foreground flex items-center justify-center space-x-1.5 text-xs font-medium cursor-pointer"
        >
          <Eye className="w-3.5 h-3.5 text-primary" />
          <span>Detalhes</span>
        </button>

        {/* Concluir se Pendente/Confirmado */}
        {appointment.status !== 'COMPLETED' && appointment.status !== 'CANCELLED' && onStatusChange && (
          <button 
            type="button"
            onClick={() => onStatusChange(appointment, 'COMPLETED')}
            className="flex-1 min-w-[90px] py-1.5 md:py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg hover:bg-emerald-500/20 transition-all text-emerald-600 dark:text-emerald-400 flex items-center justify-center space-x-1.5 text-xs font-semibold cursor-pointer"
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
            className="flex-1 min-w-[80px] py-1.5 md:py-2 bg-blue-500/10 border border-blue-500/20 rounded-lg hover:bg-blue-500/20 transition-all text-blue-600 dark:text-blue-400 flex items-center justify-center space-x-1.5 text-xs font-medium cursor-pointer"
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
            className="flex-1 min-w-[80px] py-1.5 md:py-2 bg-destructive/10 border border-destructive/20 rounded-lg hover:bg-destructive/20 transition-all text-destructive flex items-center justify-center space-x-1.5 text-xs font-medium cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
            <span>Cancelar</span>
          </button>
        )}
      </div>
    </div>
  )
}
