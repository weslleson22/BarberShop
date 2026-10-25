'use client'

import React from 'react'
import { X, Calendar, Clock, User, Phone, Mail, Scissors, DollarSign, FileText, CheckCircle, AlertCircle, XCircle, Edit, Crown } from 'lucide-react'

export interface AppointmentDetails {
  id: string
  startTime: string
  endTime: string
  status: string
  totalAmount: number
  notes?: string
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
    email?: string
    avatar?: string
    phone?: string
  }
  service: {
    id: string
    name: string
    price: number
    duration: number
  }
}

interface AppointmentDetailsModalProps {
  isOpen: boolean
  onClose: () => void
  appointment: AppointmentDetails | null
  onEdit?: (appointment: AppointmentDetails) => void
  onStatusChange?: (appointment: AppointmentDetails, newStatus: string) => void
  onCancel?: (appointment: AppointmentDetails) => void
  userRole?: string
}

export default function AppointmentDetailsModal({
  isOpen,
  onClose,
  appointment,
  onEdit,
  onStatusChange,
  onCancel,
  userRole,
}: AppointmentDetailsModalProps) {
  if (!isOpen || !appointment) return null

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value)
  }

  const formatDateTime = (dateString: string) => {
    const d = new Date(dateString)
    return {
      date: d.toLocaleDateString('pt-BR', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }),
      time: d.toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
      }),
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return {
          label: 'Concluído',
          icon: CheckCircle,
          className: 'bg-green-500/10 text-green-400 border-green-500/30',
        }
      case 'CONFIRMED':
        return {
          label: 'Confirmado',
          icon: CheckCircle,
          className: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
        }
      case 'CANCELLED':
        return {
          label: 'Cancelado',
          icon: XCircle,
          className: 'bg-red-500/10 text-red-400 border-red-500/30',
        }
      case 'PENDING':
      default:
        return {
          label: 'Pendente',
          icon: AlertCircle,
          className: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30',
        }
    }
  }

  const startInfo = formatDateTime(appointment.startTime)
  const endInfo = formatDateTime(appointment.endTime)
  const statusInfo = getStatusBadge(appointment.status)
  const StatusIcon = statusInfo.icon

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-lg bg-card text-card-foreground border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border bg-muted/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">Detalhes do Agendamento</h2>
              {userRole === 'DEVELOPER' && (
                <p className="text-xs text-muted-foreground font-mono">ID: {appointment.id}</p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-xl transition-all cursor-pointer"
            aria-label="Fechar modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto space-y-4">
          {/* Status & Valor */}
          <div className="flex items-center justify-between p-4 bg-muted/40 border border-border rounded-xl">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Status Atual</p>
              <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg border text-xs font-semibold ${statusInfo.className}`}>
                <StatusIcon className="w-3.5 h-3.5" />
                <span>{statusInfo.label}</span>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground mb-1">Valor Total</p>
              <p className="text-xl font-bold text-primary">
                {formatCurrency(appointment.totalAmount || appointment.service?.price || 0)}
              </p>
            </div>
          </div>

          {/* Data e Horário */}
          <div className="p-4 bg-muted/40 border border-border rounded-xl space-y-2">
            <div className="flex items-center gap-2 text-muted-foreground text-xs uppercase tracking-wider font-semibold">
              <Clock className="w-4 h-4 text-primary" />
              <span>Data e Horário</span>
            </div>
            <p className="text-foreground font-medium capitalize text-sm">{startInfo.date}</p>
            <div className="flex items-center gap-2 text-foreground/80 text-sm">
              <span className="font-semibold text-primary">{startInfo.time}</span>
              <span>até</span>
              <span className="font-semibold text-primary">{endInfo.time}</span>
              <span className="text-xs text-muted-foreground">({appointment.service.duration} min)</span>
            </div>
          </div>

          {/* Cliente */}
          <div className="p-4 bg-muted/40 border border-border rounded-xl space-y-2">
            <div className="flex items-center gap-2 text-muted-foreground text-xs uppercase tracking-wider font-semibold">
              <User className="w-4 h-4 text-blue-500" />
              <span>Cliente</span>
            </div>
            <div className="flex items-center justify-between">
              <p className="text-foreground font-semibold text-base">{appointment.client.name}</p>
              {Boolean(appointment.isVip || appointment.client?.isVip) && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                  <Crown className="w-3.5 h-3.5" />
                  Cliente VIP
                </span>
              )}
            </div>
            <div className="space-y-1 text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 text-muted-foreground/60" />
                <span>{appointment.client.phone || 'Sem telefone'}</span>
              </div>
              {appointment.client.email && (
                <div className="flex items-center gap-2">
                  <Mail className="w-3.5 h-3.5 text-muted-foreground/60" />
                  <span>{appointment.client.email}</span>
                </div>
              )}
            </div>
          </div>

          {/* Serviço e Barbeiro */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-4 bg-muted/40 border border-border rounded-xl space-y-1">
              <div className="flex items-center gap-2 text-muted-foreground text-xs uppercase tracking-wider font-semibold">
                <Scissors className="w-4 h-4 text-primary" />
                <span>Serviço</span>
              </div>
              <p className="text-foreground font-medium text-sm">{appointment.service.name}</p>
              <p className="text-xs text-muted-foreground">{appointment.service.duration} minutos</p>
            </div>

            <div className="p-4 bg-muted/40 border border-border rounded-xl space-y-2">
              <div className="flex items-center gap-2 text-muted-foreground text-xs uppercase tracking-wider font-semibold">
                <User className="w-4 h-4 text-primary" />
                <span>Profissional</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full overflow-hidden bg-primary/10 text-primary flex items-center justify-center flex-shrink-0 border border-primary/20">
                  {appointment.barber.avatar ? (
                    <img
                      src={appointment.barber.avatar}
                      alt={appointment.barber.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="font-bold text-sm">
                      {appointment.barber.name ? appointment.barber.name.charAt(0).toUpperCase() : 'B'}
                    </span>
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-foreground font-semibold text-sm truncate">{appointment.barber.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{appointment.barber.email || 'Barbeiro'}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Observações */}
          {appointment.notes && (
            <div className="p-4 bg-muted/40 border border-border rounded-xl space-y-1">
              <div className="flex items-center gap-2 text-muted-foreground text-xs uppercase tracking-wider font-semibold">
                <FileText className="w-4 h-4 text-muted-foreground/60" />
                <span>Observações</span>
              </div>
              <p className="text-xs text-foreground/80 whitespace-pre-wrap">{appointment.notes}</p>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-border bg-muted/20 flex flex-wrap items-center justify-end gap-2">
          {appointment.status !== 'CANCELLED' && onEdit && (
            <button
              type="button"
              onClick={() => {
                onClose()
                onEdit(appointment)
              }}
              className="px-4 py-2 bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 hover:bg-blue-500/20 rounded-xl transition-all text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
            >
              <Edit className="w-3.5 h-3.5" />
              Editar
            </button>
          )}

          {appointment.status !== 'COMPLETED' && appointment.status !== 'CANCELLED' && onStatusChange && (
            <button
              type="button"
              onClick={() => {
                onClose()
                onStatusChange(appointment, 'COMPLETED')
              }}
              className="px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 rounded-xl transition-all text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
            >
              <CheckCircle className="w-3.5 h-3.5" />
              Concluir
            </button>
          )}

          {appointment.status !== 'CANCELLED' && onCancel && (
            <button
              type="button"
              onClick={() => {
                onClose()
                onCancel(appointment)
              }}
              className="px-4 py-2 bg-destructive/10 border border-destructive/20 text-destructive hover:bg-destructive/20 rounded-xl transition-all text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
            >
              <XCircle className="w-3.5 h-3.5" />
              Cancelar
            </button>
          )}

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-card border border-border text-foreground hover:bg-muted rounded-xl transition-all text-xs font-medium cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  )
}
