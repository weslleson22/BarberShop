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
    <div className="bg-gradient-to-b from-gray-900/50 to-transparent border-b border-white/6">
      <div className="px-6 py-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          {/* Welcome Message */}
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-white mb-2">
              Agenda
            </h1>
            <p className="text-white/60 text-lg">
              Visualize e gerencie todos os agendamentos
            </p>
          </div>

          {/* Right Controls */}
          <div className="flex flex-col sm:flex-row items-center gap-4">
            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
              <input
                type="text"
                placeholder="Buscar agendamentos..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full sm:w-80 pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-yellow-400/50 focus:bg-white/10 transition-all"
              />
            </div>

            {/* Status Filter */}
            <div className="relative">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="appearance-none bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-yellow-400/50 focus:bg-white/10 transition-all cursor-pointer"
              >
                <option value="Todos" className="bg-gray-900">Todos</option>
                <option value="Pendente" className="bg-gray-900">Pendente</option>
                <option value="Confirmado" className="bg-gray-900">Confirmado</option>
                <option value="Concluído" className="bg-gray-900">Concluído</option>
                <option value="Cancelado" className="bg-gray-900">Cancelado</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40 pointer-events-none" />
            </div>

            {/* Date Filter */}
            <div className="relative">
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="appearance-none bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-yellow-400/50 focus:bg-white/10 transition-all cursor-pointer"
              >
                <option value="Hoje" className="bg-gray-900">Hoje</option>
                <option value="Semana" className="bg-gray-900">Esta Semana</option>
                <option value="Mês" className="bg-gray-900">Este Mês</option>
                <option value="Ano" className="bg-gray-900">Este Ano</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40 pointer-events-none" />
            </div>

            {/* Action Buttons */}
            <button className="p-3 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-all">
              <Download className="w-5 h-5 text-white" />
            </button>

            <button className="p-3 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-all">
              <Bell className="w-5 h-5 text-white" />
            </button>

            <button 
              onClick={onNewAppointment}
              className="px-4 py-3 bg-gradient-to-r from-yellow-400 to-yellow-600 text-black font-semibold rounded-xl hover:from-yellow-500 hover:to-yellow-700 transition-all flex items-center space-x-2"
            >
              <Plus className="w-5 h-5" />
              <span>Novo Agendamento</span>
            </button>

            {/* User Avatar */}
            <div className="flex items-center space-x-3 p-2 bg-gradient-to-r from-yellow-400/20 to-yellow-600/20 border border-yellow-400/30 rounded-xl">
              <div className="w-8 h-8 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full flex items-center justify-center">
                <span className="text-black font-bold text-sm">
                  {user?.name?.charAt(0).toUpperCase() || 'U'}
                </span>
              </div>
              <div className="hidden sm:block">
                <p className="text-white font-medium text-sm">{user?.name || 'Usuário'}</p>
                <p className="text-yellow-400 text-xs">{user?.role || 'CLIENT'}</p>
              </div>
              <button 
                onClick={handleLogout}
                className="p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-all"
                title="Sair da conta"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
