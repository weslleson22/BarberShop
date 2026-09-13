'use client'

import { useState } from 'react'
import { useAuth } from '@/lib/auth-context'
import { useRouter } from 'next/navigation'
import { Search, Bell, Calendar, User, Filter, ChevronDown, LogOut } from 'lucide-react'

export default function DashboardHeader() {
  const [searchQuery, setSearchQuery] = useState('')
  const [dateFilter, setDateFilter] = useState('Hoje')
  const { user, logout } = useAuth()
  const router = useRouter()

  const handleLogout = () => {
    logout()
    router.push('/login')
  }

  return (
    <div className="bg-gradient-to-b from-gray-900/50 to-transparent border-b border-white/6">
      <div className="container-responsive py-4 md:py-6">
        <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4 md:gap-6">
          {/* Welcome Message */}
          <div className="flex-1 min-w-0">
            <h1 className="text-xl md:text-2xl lg:text-3xl font-bold text-white mb-1 md:mb-2 truncate">
              Olá, {user?.name || 'Usuário'}! 👋
            </h1>
            <p className="text-white/60 text-sm md:text-base lg:text-lg">
              Aqui está o resumo do seu negócio hoje.
            </p>
          </div>

          {/* Right Controls */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 md:gap-4">
            {/* Search Bar - Full width on mobile, smaller on tablet */}
            <div className="relative flex-1 sm:flex-none order-1 sm:order-none">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 md:w-5 md:h-5 text-white/40" />
              <input
                type="text"
                placeholder="Buscar..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full sm:w-48 md:w-64 lg:w-80 pl-9 md:pl-10 pr-4 py-2 md:py-3 bg-white/5 border border-white/10 rounded-lg md:rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-yellow-400/50 focus:bg-white/10 transition-all text-sm md:text-base"
              />
            </div>

            {/* Date Filter */}
            <div className="relative order-2 sm:order-none">
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="appearance-none bg-white/5 border border-white/10 rounded-lg md:rounded-xl px-3 md:px-4 py-2 md:py-3 text-white text-sm md:text-base focus:outline-none focus:border-yellow-400/50 focus:bg-white/10 transition-all cursor-pointer pr-8 md:pr-10"
              >
                <option value="Hoje" className="bg-gray-900">Hoje</option>
                <option value="Semana" className="bg-gray-900">Esta Semana</option>
                <option value="Mês" className="bg-gray-900">Este Mês</option>
                <option value="Ano" className="bg-gray-900">Este Ano</option>
              </select>
              <ChevronDown className="absolute right-2 md:right-3 top-1/2 -translate-y-1/2 w-3 h-3 md:w-4 md:h-4 text-white/40 pointer-events-none" />
            </div>

            {/* Notifications */}
            <button className="relative p-2 md:p-3 bg-white/5 border border-white/10 rounded-lg md:rounded-xl hover:bg-white/10 transition-all order-3 sm:order-none" aria-label="Notificações">
              <Bell className="w-4 h-4 md:w-5 md:h-5 text-white" />
              <span className="absolute top-1.5 md:top-2 right-1.5 md:right-2 w-2 h-2 bg-red-500 rounded-full"></span>
            </button>

            {/* Calendar */}
            <button className="p-2 md:p-3 bg-white/5 border border-white/10 rounded-lg md:rounded-xl hover:bg-white/10 transition-all order-4 sm:order-none hidden sm:block" aria-label="Calendário">
              <Calendar className="w-4 h-4 md:w-5 md:h-5 text-white" />
            </button>

            {/* User Avatar */}
            <div className="flex items-center space-x-2 md:space-x-3 p-2 bg-gradient-to-r from-yellow-400/20 to-yellow-600/20 border border-yellow-400/30 rounded-lg md:rounded-xl order-5 sm:order-none">
              <div className="w-7 h-7 md:w-8 md:h-8 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-black font-bold text-xs md:text-sm">
                  {user?.name?.charAt(0).toUpperCase() || 'U'}
                </span>
              </div>
              <div className="hidden md:block min-w-0">
                <p className="text-white font-medium text-xs md:text-sm truncate">{user?.name || 'Usuário'}</p>
                <p className="text-yellow-400 text-xs">{user?.role || 'CLIENT'}</p>
              </div>
              <button 
                onClick={handleLogout}
                className="p-1.5 md:p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-all flex-shrink-0"
                title="Sair da conta"
                aria-label="Sair da conta"
              >
                <LogOut className="w-3 h-3 md:w-4 md:h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
