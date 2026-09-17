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
    <div className="bg-gradient-to-b from-gray-900/50 to-transparent border-b border-white/6">
      <div className="w-full px-4 md:px-6 py-6">
        {/* Page Header - Título e Descrição */}
        <div className="flex flex-col w-full mb-6">
          <div className="flex flex-col w-full max-w-2xl">
            <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">
              Agenda
            </h1>
            <p className="text-white/60 text-sm md:text-base">
              Visualize, filtre e gerencie todos os agendamentos da barbearia
            </p>
          </div>
        </div>

        {/* Toolbar - Busca, Filtros e Ações */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          {/* Search Bar */}
          <div className="relative w-full sm:flex-1 sm:min-w-[200px] sm:max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
            <input
              type="text"
              placeholder="Buscar por cliente, telefone, barbeiro ou serviço..."
              value={searchQuery}
              onChange={(e) => onSearchChange?.(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-yellow-400/50 focus:bg-white/10 transition-all text-sm"
            />
          </div>

          {/* Filters and Actions */}
          <div className="flex flex-wrap items-center gap-2 md:gap-3">
            {/* Period Filter (Todos, Hoje, Semana, Mês) */}
            <div className="relative flex-shrink-0">
              <select
                value={currentPeriod}
                onChange={(e) => onDatePeriodFilter?.(e.target.value as any)}
                className="appearance-none bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-xs md:text-sm focus:outline-none focus:border-yellow-400/50 focus:bg-white/10 transition-all cursor-pointer min-w-[120px] pr-8"
                aria-label="Filtrar por período"
              >
                <option value="all" className="bg-gray-900">Todos os Períodos</option>
                <option value="today" className="bg-gray-900">Hoje</option>
                <option value="week" className="bg-gray-900">Esta Semana</option>
                <option value="month" className="bg-gray-900">Este Mês</option>
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/40 pointer-events-none" />
            </div>

            {/* Status Filter */}
            <div className="relative flex-shrink-0">
              <select
                value={currentStatus}
                onChange={(e) => onStatusFilter?.(e.target.value)}
                className="appearance-none bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-xs md:text-sm focus:outline-none focus:border-yellow-400/50 focus:bg-white/10 transition-all cursor-pointer min-w-[110px] pr-8"
                aria-label="Filtrar por status"
              >
                <option value="" className="bg-gray-900">Todos Status</option>
                <option value="PENDING" className="bg-gray-900">Pendente</option>
                <option value="CONFIRMED" className="bg-gray-900">Confirmado</option>
                <option value="COMPLETED" className="bg-gray-900">Concluído</option>
                <option value="CANCELLED" className="bg-gray-900">Cancelado</option>
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/40 pointer-events-none" />
            </div>

            {/* Barber Filter */}
            {!hideBarberFilter && (
              <div className="relative flex-shrink-0">
                <select
                  value={currentBarber}
                  onChange={(e) => onBarberFilter?.(e.target.value)}
                  className="appearance-none bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-xs md:text-sm focus:outline-none focus:border-yellow-400/50 focus:bg-white/10 transition-all cursor-pointer min-w-[130px] pr-8"
                  aria-label="Filtrar por barbeiro"
                >
                  <option value="" className="bg-gray-900">Todos Barbeiros</option>
                  {barbers.map((b) => (
                    <option key={b.id} value={b.id} className="bg-gray-900">{b.name}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/40 pointer-events-none" />
              </div>
            )}

            {/* New Appointment Button */}
            <button
              type="button"
              onClick={onNewAppointment}
              className="w-full sm:w-auto px-4 py-2.5 bg-gradient-to-r from-yellow-400 to-yellow-600 text-black font-semibold rounded-xl hover:from-yellow-500 hover:to-yellow-700 transition-all flex items-center justify-center space-x-2 flex-shrink-0 text-sm shadow-md"
            >
              <Plus className="w-4 h-4" />
              <span>Novo Agendamento</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
