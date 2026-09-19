'use client'

import { useState } from 'react'
import { useAuth } from '@/lib/auth-context'
import { useRouter, usePathname } from 'next/navigation'
import { ROLE_LABELS, type UserRole } from '@/lib/roles'
import NotificationBell from './NotificationBell'
import {
  Home,
  LayoutDashboard,
  Calendar,
  CalendarClock,
  Building2,
  Users,
  Scissors,
  UserCog,
  Settings,
  Search,
  LogOut,
  ChevronDown,
  Menu,
  X
} from 'lucide-react'

interface MenuItem {
  id: string
  label: string
  path: string
  icon: any
}

// Cada perfil vê apenas os itens que fazem sentido para sua função — não é
// a mesma lista com botões escondidos depois. Isso é só a experiência de
// navegação; a proteção de verdade está no middleware e nas rotas de API.
function getMenuItems(role?: UserRole): MenuItem[] {
  if (!role) {
    return [{ id: 'home', label: 'Página Inicial', path: '/', icon: Home }]
  }

  if (role === 'DEVELOPER') {
    return [
      { id: 'developer', label: 'Painel SaaS', path: '/developer', icon: LayoutDashboard },
      { id: 'nova-barbearia', label: 'Cadastrar Barbearia', path: '/developer?action=new', icon: Building2 },
      { id: 'usuarios', label: 'Usuários da Plataforma', path: '/usuarios', icon: UserCog },
      { id: 'perfil', label: 'Meu Perfil', path: '/perfil', icon: Settings },
    ]
  }

  if (role === 'CLIENT') {
    return [
      { id: 'meus-agendamentos', label: 'Meus Agendamentos', path: '/meus-agendamentos', icon: CalendarClock },
      { id: 'agendar', label: 'Novo Agendamento', path: '/agendar', icon: Calendar },
      { id: 'perfil', label: 'Meu Perfil', path: '/perfil', icon: Home },
      { id: 'configuracoes', label: 'Configurações', path: '/configuracoes', icon: Settings },
    ]
  }

  // Equipe da barbearia: ADMIN, BARBER, RECEPTIONIST
  const items: MenuItem[] = [
    { id: 'dashboard', label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { id: 'agenda', label: 'Agenda', path: '/agenda', icon: Calendar },
    { id: 'clientes', label: 'Clientes', path: '/clientes', icon: Users },
    { id: 'servicos', label: 'Serviços', path: '/servicos', icon: Scissors },
  ]

  if (role === 'ADMIN') {
    items.push({ id: 'equipe', label: 'Equipe', path: '/usuarios', icon: UserCog })
  }

  items.push({ id: 'configuracoes', label: 'Configurações', path: '/configuracoes', icon: Settings })

  return items
}

export default function DropdownHeader() {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const { user, logout } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  const handleLogout = () => {
    logout()
    router.push('/login')
  }

  const handleNavigation = (path: string) => {
    router.push(path)
    setIsDropdownOpen(false)
    setIsMobileMenuOpen(false)
  }

  const isActive = (path: string) => {
    if (path === '/') return pathname === '/'
    return pathname.startsWith(path)
  }

  const visibleMenuItems = getMenuItems(user?.role)

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-b from-gray-900/95 to-gray-950/95 backdrop-blur-md border-b border-white/10">
      <div className="w-full px-4 md:px-6 py-4">
        <div className="flex items-center justify-between gap-4">
          {/* Logo e Menu Dropdown */}
          <div className="flex items-center gap-4">
            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden p-2 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-lg text-black hover:from-yellow-500 hover:to-yellow-700 transition-all"
              aria-label={isMobileMenuOpen ? 'Fechar menu' : 'Abrir menu'}
            >
              {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

            {/* Logo */}
            <div
              onClick={() => {
                const target = user?.role === 'DEVELOPER' ? '/developer' : user?.role === 'CLIENT' ? '/meus-agendamentos' : user ? '/dashboard' : '/'
                handleNavigation(target)
              }}
              className="flex items-center gap-2 cursor-pointer group"
            >
              <div className="w-10 h-10 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-xl flex items-center justify-center group-hover:scale-105 transition-transform">
                <Scissors className="w-6 h-6 text-black" />
              </div>
              <span className="text-xl font-bold text-white hidden sm:block">BarberShop</span>
            </div>

            {/* Desktop Dropdown Menu */}
            <div className="hidden lg:block relative">
              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-all text-white"
              >
                <span className="font-medium">Menu</span>
                <ChevronDown className={`w-4 h-4 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {isDropdownOpen && (
                <div className="absolute top-full left-0 mt-2 w-64 bg-gray-900/95 backdrop-blur-md border border-white/10 rounded-xl shadow-2xl overflow-hidden">
                  {visibleMenuItems.map((item) => {
                    const Icon = item.icon
                    return (
                      <button
                        key={item.id}
                        onClick={() => handleNavigation(item.path)}
                        className={`
                          w-full flex items-center gap-3 px-4 py-3 transition-all
                          ${isActive(item.path) 
                            ? 'bg-gradient-to-r from-yellow-400/20 to-yellow-600/20 border-l-4 border-yellow-400 text-yellow-400' 
                            : 'text-white/60 hover:text-white hover:bg-white/5'
                          }
                        `}
                      >
                        <Icon className="w-5 h-5 flex-shrink-0" />
                        <span className="font-medium">{item.label}</span>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Search Bar - Desktop */}
          <div className="hidden md:flex flex-1 max-w-md mx-4">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
              <input
                type="text"
                placeholder="Buscar..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-yellow-400/50 focus:bg-white/10 transition-all"
              />
            </div>
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-2">
            {/* Notifications (apenas para equipe e clientes que possuem agendamentos) */}
            {user && user.role !== 'DEVELOPER' && <NotificationBell />}

            {/* User Avatar */}
            <div className="flex items-center gap-2 p-2 bg-gradient-to-r from-yellow-400/20 to-yellow-600/20 border border-yellow-400/30 rounded-lg">
              <div className="w-8 h-8 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden">
                {user?.avatar ? (
                  <img 
                    src={user.avatar} 
                    alt="Avatar" 
                    className="w-8 h-8 rounded-full object-cover"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none'
                      const sibling = e.currentTarget.nextElementSibling as HTMLElement
                      if (sibling) sibling.style.display = 'flex'
                    }}
                  />
                ) : null}
                <span className={`text-black font-bold text-sm ${user?.avatar ? 'hidden' : 'flex'}`}>
                  {user?.name?.charAt(0).toUpperCase() || 'U'}
                </span>
              </div>
              <div className="hidden sm:block min-w-0">
                <p className="text-white font-medium text-sm truncate">{user?.name || 'Usuário'}</p>
                <p className="text-yellow-400 text-xs">{ROLE_LABELS[user?.role || 'CLIENT']}</p>
              </div>
              <button 
                onClick={handleLogout}
                className="p-1.5 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-all flex-shrink-0"
                title="Sair da conta"
                aria-label="Sair da conta"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="lg:hidden mt-4 pt-4 border-t border-white/10">
            <div className="space-y-2">
              {visibleMenuItems.map((item) => {
                const Icon = item.icon
                return (
                  <button
                    key={item.id}
                    onClick={() => handleNavigation(item.path)}
                    className={`
                      w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all
                      ${isActive(item.path) 
                        ? 'bg-gradient-to-r from-yellow-400/20 to-yellow-600/20 border border-yellow-400/30 text-yellow-400' 
                        : 'text-white/60 hover:text-white hover:bg-white/5'
                      }
                    `}
                  >
                    <Icon className="w-5 h-5 flex-shrink-0" />
                    <span className="font-medium">{item.label}</span>
                  </button>
                )
              })}
            </div>

            {/* Mobile Search */}
            <div className="mt-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                <input
                  type="text"
                  placeholder="Buscar..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-yellow-400/50 focus:bg-white/10 transition-all"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </header>
  )
}
