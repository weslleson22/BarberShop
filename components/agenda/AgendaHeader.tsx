'use client'

import { useState } from 'react'
import { useAuth } from '@/lib/auth-context'
import { useRouter } from 'next/navigation'
import { Search, Bell, Calendar, User, Filter, ChevronDown, Plus, Download, LogOut } from 'lucide-react'

interface AgendaHeaderProps {
  onNewAppointment?: () => void
  onDateFilter?: (date: Date) => void
}

export default function AgendaHeader({ onNewAppointment, onDateFilter }: AgendaHeaderProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [dateFilter, setDateFilter] = useState('Hoje')
  const [statusFilter, setStatusFilter] = useState('Todos')
  const { user, logout } = useAuth()
  const router = useRouter()

  const handleLogout = () => {
    logout()
    router.push('/login')
  }

  return (
    <div className="bg-gradient-to-br from-gray-950 via-blue-950 to-black border-b border-white/6">
      <div className="px-6 py-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          {/* Welcome Message */}
          <div className="flex-shrink-0">
            <h1 className="text-2xl font-bold text-white mb-1">
              Agenda
            </h1>
            <p className="text-white/60 text-sm">
              Visualize e gerencie todos os agendamentos
            </p>
          </div>

          {/* Right Controls */}
          <div className="flex flex-col lg:flex-row lg:items-center gap-3 lg:mt-0 w-full lg:w-auto">
            {/* Mobile First Row - Essential Actions */}
            <div className="flex items-center justify-between w-full lg:hidden">
              <button 
                onClick={onNewAppointment}
                className="px-3 py-2 bg-gradient-to-r from-yellow-400 to-yellow-600 text-black font-semibold rounded-lg hover:from-yellow-500 hover:to-yellow-700 transition-all flex items-center space-x-2 text-sm"
              >
                <Plus className="w-4 h-4" />
                <span>Novo Agendamento</span>
              </button>
            </div>

            {/* Search Bar - Always visible */}
            <div className="relative w-full lg:w-auto">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
              <input
                type="text"
                placeholder="Buscar agendamentos..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full lg:w-64 pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-yellow-400/50 focus:bg-white/10 transition-all text-sm"
              />
            </div>

            {/* Desktop Controls */}
            <div className="hidden lg:flex items-center gap-3">
              {/* Status Filter */}
              <div className="relative">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="appearance-none bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-yellow-400/50 focus:bg-white/10 transition-all cursor-pointer text-sm"
                >
                  <option value="Todos" className="bg-gray-900">Todos</option>
                  <option value="Pendente" className="bg-gray-900">Pendente</option>
                  <option value="Confirmado" className="bg-gray-900">Confirmado</option>
                  <option value="Concluído" className="bg-gray-900">Concluído</option>
                  <option value="Cancelado" className="bg-gray-900">Cancelado</option>
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-white/40 pointer-events-none" />
              </div>

              {/* Date Filter */}
              <div className="relative">
                <select
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  className="appearance-none bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-yellow-400/50 focus:bg-white/10 transition-all cursor-pointer text-sm"
                >
                  <option value="Hoje" className="bg-gray-900">Hoje</option>
                  <option value="Semana" className="bg-gray-900">Esta Semana</option>
                  <option value="Mês" className="bg-gray-900">Este Mês</option>
                  <option value="Ano" className="bg-gray-900">Este Ano</option>
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-white/40 pointer-events-none" />
              </div>

              {/* Action Buttons */}
              <button className="p-2 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-all">
                <Download className="w-4 h-4 text-white" />
              </button>

              <button className="p-2 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-all">
                <Bell className="w-4 h-4 text-white" />
              </button>

              {/* Novo Agendamento - Desktop */}
              <button 
                onClick={onNewAppointment}
                className="px-3 py-2 bg-gradient-to-r from-yellow-400 to-yellow-600 text-black font-semibold rounded-lg hover:from-yellow-500 hover:to-yellow-700 transition-all flex items-center space-x-2 whitespace-nowrap text-sm"
              >
                <Plus className="w-4 h-4" />
                <span>Novo Agendamento</span>
              </button>
            </div>

            {/* Mobile Filters Row */}
            <div className="flex lg:hidden items-center gap-2 w-full">
              {/* Status Filter - Mobile */}
              <div className="relative flex-1">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="appearance-none bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-yellow-400/50 focus:bg-white/10 transition-all cursor-pointer text-sm w-full"
                >
                  <option value="Todos" className="bg-gray-900">Todos</option>
                  <option value="Pendente" className="bg-gray-900">Pendente</option>
                  <option value="Confirmado" className="bg-gray-900">Confirmado</option>
                  <option value="Concluído" className="bg-gray-900">Concluído</option>
                  <option value="Cancelado" className="bg-gray-900">Cancelado</option>
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-white/40 pointer-events-none" />
              </div>

              {/* Date Filter - Mobile */}
              <div className="relative flex-1">
                <select
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  className="appearance-none bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-yellow-400/50 focus:bg-white/10 transition-all cursor-pointer text-sm w-full"
                >
                  <option value="Hoje" className="bg-gray-900">Hoje</option>
                  <option value="Semana" className="bg-gray-900">Esta Semana</option>
                  <option value="Mês" className="bg-gray-900">Este Mês</option>
                  <option value="Ano" className="bg-gray-900">Este Ano</option>
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-white/40 pointer-events-none" />
              </div>

              {/* Action Buttons - Mobile */}
              <button className="p-2 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-all">
                <Download className="w-4 h-4 text-white" />
              </button>

              <button className="p-2 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-all">
                <Bell className="w-4 h-4 text-white" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
