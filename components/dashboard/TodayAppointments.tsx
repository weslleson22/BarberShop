'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Clock, Users, CheckCircle, AlertCircle, XCircle, Calendar } from 'lucide-react'
import { getAuthHeaders } from '@/lib/utils'

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
    avatar?: string
  }
}

export default function TodayAppointments() {
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [totalToday, setTotalToday] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchTodayAppointments()
  }, [])

  const fetchTodayAppointments = async () => {
    try {
      // Local today date bounds
      const now = new Date()
      const todayYear = now.getFullYear()
      const todayMonth = now.getMonth()
      const todayDay = now.getDate()

      const [response, barbersRes] = await Promise.all([
        fetch('/api/appointments', {
          headers: getAuthHeaders(),
          credentials: 'include',
        }),
        fetch('/api/users?role=BARBER', {
          headers: getAuthHeaders(),
          credentials: 'include',
        }).catch(() => null)
      ])

      if (!response.ok) {
        console.error('Erro ao buscar agendamentos de hoje:', response.status)
        setAppointments([])
        setTotalToday(0)
        return
      }

      const barberMap = new Map<string, string>()
      if (barbersRes && barbersRes.ok) {
        try {
          const barbersData = await barbersRes.json()
          if (Array.isArray(barbersData)) {
            barbersData.forEach((b: any) => {
              if (b.id && b.avatar) barberMap.set(b.id, b.avatar)
            })
          }
        } catch {}
      }

      const allAppointments = await response.json()
      const validAppointments = Array.isArray(allAppointments)
        ? allAppointments.filter((apt: any) => apt?.client && apt?.service)
        : []

      // Filter appointments for today using local calendar date and sort chronologically
      const todayAppointments = validAppointments
        .filter((apt: any) => {
          const aptDate = new Date(apt.startTime)
          return (
            aptDate.getFullYear() === todayYear &&
            aptDate.getMonth() === todayMonth &&
            aptDate.getDate() === todayDay
          )
        })
        .map((apt: any) => ({
          ...apt,
          barber: {
            ...apt.barber,
            avatar: apt.barber?.avatar || barberMap.get(apt.barberId) || barberMap.get(apt.barber?.id)
          }
        }))
        .sort((a: any, b: any) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())

      setTotalToday(todayAppointments.length)
      // Exibir no máximo 5 agendamentos no dashboard
      setAppointments(todayAppointments.slice(0, 5))
      
    } catch (error) {
      console.error('Erro ao buscar agendamentos de hoje:', error)
      setAppointments([])
      setTotalToday(0)
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

  const formatCurrency = (value: number) => {
    const numeric = typeof value === 'number' ? value : parseFloat(String(value))
    if (isNaN(numeric) || !isFinite(numeric)) return 'R$ 0,00'
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(numeric)
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return <CheckCircle className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
      case 'CANCELLED':
        return <XCircle className="w-3.5 h-3.5 text-destructive" />
      case 'PENDING':
      default:
        return <AlertCircle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
      case 'PENDING':
        return 'text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20'
      case 'CANCELLED':
        return 'text-destructive bg-destructive/10 border-destructive/20'
      default:
        return 'text-muted-foreground bg-muted border-border'
    }
  }

  if (loading) {
    return (
      <div className="bg-card border border-border rounded-xl md:rounded-2xl p-4 md:p-6 shadow-sm">
        <div className="flex items-center justify-center h-28 md:h-36">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
        </div>
      </div>
    )
  }

  const pendingCount = appointments.filter((a) => a.status === 'PENDING').length
  const completedCount = appointments.filter((a) => a.status === 'COMPLETED').length

  return (
    <div className="bg-card border border-border rounded-xl md:rounded-2xl p-4 md:p-6 shadow-sm">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 md:mb-5 pb-4 border-b border-border">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-lg md:text-xl font-bold text-foreground tracking-tight">Agendamentos de Hoje</h3>
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
              {totalToday}
            </span>
          </div>
          <p className="text-muted-foreground text-xs md:text-sm mt-0.5">
            Visualize os atendimentos programados para o dia de hoje
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {totalToday > 0 && (
            <div className="flex items-center gap-1.5 text-xs">
              <span className="px-2 py-0.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 rounded-md font-medium">
                {pendingCount} pendente{pendingCount === 1 ? '' : 's'}
              </span>
              <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 rounded-md font-medium">
                {completedCount} concluído{completedCount === 1 ? '' : 's'}
              </span>
            </div>
          )}
          <Link
            href="/agenda"
            className="text-xs font-semibold text-primary hover:underline flex items-center gap-1 shrink-0 ml-auto"
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Ver Agenda Completa</span>
          </Link>
        </div>
      </div>

      {/* Grid de Cards de Agendamentos */}
      {appointments.length === 0 ? (
        <div className="text-center py-10 px-4 bg-muted/30 border border-border rounded-xl">
          <Calendar className="w-10 h-10 text-muted-foreground/40 mx-auto mb-2" />
          <p className="text-foreground font-semibold text-sm">Nenhum agendamento para hoje</p>
          <p className="text-muted-foreground text-xs mt-1 max-w-sm mx-auto">
            Não há atendimentos agendados para a data de hoje. Novos horários marcados aparecerão aqui em tempo real.
          </p>
          <div className="mt-4">
            <Link
              href="/agendar"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold rounded-lg shadow-sm transition-all"
            >
              Novo Agendamento
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {appointments.map((appointment) => {
            const price = Number(appointment.service?.price || (appointment as any).totalAmount || 0)

            return (
              <div
                key={appointment.id}
                className="bg-background border border-border rounded-xl p-3.5 hover:border-primary/40 hover:shadow-sm transition-all flex flex-col justify-between"
              >
                {/* Linha Superior: Horário e Status */}
                <div className="flex items-center justify-between gap-2 mb-2.5">
                  <div className="flex items-center gap-1.5 text-foreground font-bold text-sm">
                    <Clock className="w-3.5 h-3.5 text-primary" />
                    <span>{formatTime(appointment.startTime)}</span>
                  </div>
                  <div className={`flex items-center space-x-1 px-2 py-0.5 rounded-full border text-[10px] font-semibold flex-shrink-0 ${getStatusColor(appointment.status)}`}>
                    {getStatusIcon(appointment.status)}
                    <span>{getStatusText(appointment.status)}</span>
                  </div>
                </div>

                {/* Linha Central: Cliente e Serviço */}
                <div className="mb-3">
                  <p className="text-foreground font-semibold text-sm truncate" title={appointment.client.name}>
                    {appointment.client.name}
                  </p>
                  <p className="text-muted-foreground text-xs truncate" title={appointment.service.name}>
                    {appointment.service.name}
                  </p>
                </div>

                {/* Linha Inferior: Barbeiro e Preço */}
                <div className="flex items-center justify-between pt-2 border-t border-border/70 text-xs">
                  <div className="flex items-center gap-1.5 min-w-0 flex-1 pr-2">
                    {appointment.barber?.avatar ? (
                      <img
                        src={appointment.barber.avatar}
                        alt={appointment.barber.name}
                        className="w-4 h-4 rounded-full object-cover border border-primary/40"
                      />
                    ) : (
                      <div className="w-4 h-4 rounded-full bg-primary/20 text-primary text-[9px] font-bold flex items-center justify-center">
                        {appointment.barber?.name?.charAt(0).toUpperCase() || 'B'}
                      </div>
                    )}
                    <span className="text-muted-foreground text-xs truncate font-medium">
                      {appointment.barber?.name || 'Barbeiro'}
                    </span>
                  </div>
                  <span className="text-foreground font-bold text-xs shrink-0">
                    {formatCurrency(price)}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* View All Footer */}
      {totalToday > 0 && (
        <div className="mt-4 pt-3 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
          <span>Mostrando {appointments.length} de {totalToday} agendamento{totalToday === 1 ? '' : 's'} de hoje</span>
          <Link
            href="/agenda"
            className="font-semibold text-primary hover:underline"
          >
            Gerenciar na Agenda &rarr;
          </Link>
        </div>
      )}
    </div>
  )
}

