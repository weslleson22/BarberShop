'use client'

import { useState, useEffect } from 'react'
import { Search, ChevronDown, Plus, Filter, Calendar } from 'lucide-react'
import { getAuthHeaders } from '@/lib/utils'

interface Barber {
  id: string
  name: string
}

interface AgendaHeaderProps {
  onNewAppointment?: () => void
  onDatePeriodFilter?: (period: 'all' | 'today' | 'week' | 'month') => void
  onStatusFilter?: (status: string) => void
  onBarberFilter?: (barberId: string) => void
  onSearchChange?: (query: string) => void
  hideBarberFilter?: boolean
  currentPeriod?: 'all' | 'today' | 'week' | 'month'
  currentStatus?: string
  currentBarber?: string
  searchQuery?: string
}

export default function AgendaHeader({
  onNewAppointment,
  onDatePeriodFilter,
  onStatusFilter,
  onBarberFilter,
  onSearchChange,
  hideBarberFilter,
  currentPeriod = 'all',
  currentStatus = '',
  currentBarber = '',
  searchQuery = '',
}: AgendaHeaderProps) {
  const [barbers, setBarbers] = useState<Barber[]>([])

  useEffect(() => {
    if (hideBarberFilter) return
    fetch('/api/users?role=BARBER', {
      headers: getAuthHeaders(),
      credentials: 'include',
    })
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setBarbers(Array.isArray(data) ? data : []))
      .catch(() => setBarbers([]))
  }, [hideBarberFilter])

  return (
    <div className="space-y-4">
      {/* Page Header - Título e Descrição */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight">
            Agenda
          </h1>
          <p className="text-xs md:text-sm text-muted-foreground mt-0.5">
            Visualize, filtre e gerencie todos os agendamentos da barbearia
          </p>
        </div>

        {/* New Appointment Button */}
        <button
          type="button"
          onClick={onNewAppointment}
          className="w-full sm:w-auto px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-lg transition-all flex items-center justify-center space-x-2 flex-shrink-0 text-xs md:text-sm shadow-sm cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Novo Agendamento</span>
        </button>
      </div>

      {/* Toolbar - Busca e Filtros */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Search Bar */}
        <div className="relative w-full sm:flex-1 sm:min-w-[200px] sm:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar por cliente, telefone, barbeiro ou serviço..."
            value={searchQuery}
            onChange={(e) => onSearchChange?.(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-background border border-input rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring transition-all text-xs md:text-sm"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Period Filter (Todos, Hoje, Semana, Mês) */}
          <div className="relative flex-shrink-0">
            <select
              value={currentPeriod}
              onChange={(e) => onDatePeriodFilter?.(e.target.value as any)}
              className="appearance-none bg-background border border-input rounded-lg px-3 py-2 text-foreground text-xs md:text-sm focus:outline-none focus:ring-1 focus:ring-ring transition-all cursor-pointer min-w-[125px] pr-8"
              aria-label="Filtrar por período"
            >
              <option value="all" className="bg-popover text-popover-foreground">Todos os Períodos</option>
              <option value="today" className="bg-popover text-popover-foreground">Hoje</option>
              <option value="week" className="bg-popover text-popover-foreground">Esta Semana</option>
              <option value="month" className="bg-popover text-popover-foreground">Este Mês</option>
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
          </div>

          {/* Status Filter */}
          <div className="relative flex-shrink-0">
            <select
              value={currentStatus}
              onChange={(e) => onStatusFilter?.(e.target.value)}
              className="appearance-none bg-background border border-input rounded-lg px-3 py-2 text-foreground text-xs md:text-sm focus:outline-none focus:ring-1 focus:ring-ring transition-all cursor-pointer min-w-[115px] pr-8"
              aria-label="Filtrar por status"
            >
              <option value="" className="bg-popover text-popover-foreground">Todos Status</option>
              <option value="PENDING" className="bg-popover text-popover-foreground">Pendente</option>
              <option value="CONFIRMED" className="bg-popover text-popover-foreground">Confirmado</option>
              <option value="COMPLETED" className="bg-popover text-popover-foreground">Concluído</option>
              <option value="CANCELLED" className="bg-popover text-popover-foreground">Cancelado</option>
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
          </div>

          {/* Barber Filter */}
          {!hideBarberFilter && (
            <div className="relative flex-shrink-0">
              <select
                value={currentBarber}
                onChange={(e) => onBarberFilter?.(e.target.value)}
                className="appearance-none bg-background border border-input rounded-lg px-3 py-2 text-foreground text-xs md:text-sm focus:outline-none focus:ring-1 focus:ring-ring transition-all cursor-pointer min-w-[130px] pr-8"
                aria-label="Filtrar por barbeiro"
              >
                <option value="" className="bg-popover text-popover-foreground">Todos Barbeiros</option>
                {barbers.map((b) => (
                  <option key={b.id} value={b.id} className="bg-popover text-popover-foreground">{b.name}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
