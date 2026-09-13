'use client'

import { useState } from 'react'
import { Search, ChevronDown, Plus, Bell } from 'lucide-react'

interface AgendaHeaderProps {
  onNewAppointment?: () => void
  onDateFilter?: (date: Date) => void
}

export default function AgendaHeader({ onNewAppointment, onDateFilter }: AgendaHeaderProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [dateFilter, setDateFilter] = useState('Hoje')
  const [statusFilter, setStatusFilter] = useState('Todos')

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
              Visualize e gerencie todos os agendamentos
            </p>
          </div>
        </div>

        {/* Toolbar - Busca, Filtros e Ações */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* Search Bar */}
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
            <input
              type="text"
              placeholder="Buscar agendamentos..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-yellow-400/50 focus:bg-white/10 transition-all"
            />
          </div>

          {/* Filters and Actions */}
          <div className="flex items-center gap-2 md:gap-3 flex-shrink-0">
            {/* Status Filter */}
            <div className="relative flex-shrink-0">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="appearance-none bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-yellow-400/50 focus:bg-white/10 transition-all cursor-pointer min-w-[100px]"
              >
                <option value="Todos" className="bg-gray-900">Todos</option>
                <option value="Pendente" className="bg-gray-900">Pendente</option>
                <option value="Confirmado" className="bg-gray-900">Confirmado</option>
                <option value="Concluído" className="bg-gray-900">Concluído</option>
                <option value="Cancelado" className="bg-gray-900">Cancelado</option>
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40 pointer-events-none" />
            </div>

            {/* Date Filter */}
            <div className="relative flex-shrink-0">
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="appearance-none bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-yellow-400/50 focus:bg-white/10 transition-all cursor-pointer min-w-[80px]"
              >
                <option value="Hoje" className="bg-gray-900">Hoje</option>
                <option value="Semana" className="bg-gray-900">Esta Semana</option>
                <option value="Mês" className="bg-gray-900">Este Mês</option>
                <option value="Ano" className="bg-gray-900">Este Ano</option>
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40 pointer-events-none" />
            </div>

            {/* Notification Button */}
            <button className="p-3 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-all flex-shrink-0">
              <Bell className="w-5 h-5 text-white" />
            </button>

            {/* New Appointment Button */}
            <button 
              onClick={onNewAppointment}
              className="px-4 py-3 bg-gradient-to-r from-yellow-400 to-yellow-600 text-black font-semibold rounded-xl hover:from-yellow-500 hover:to-yellow-700 transition-all flex items-center space-x-2 flex-shrink-0"
            >
              <Plus className="w-5 h-5" />
              <span className="hidden sm:inline">Novo Agendamento</span>
              <span className="sm:hidden">Novo</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
