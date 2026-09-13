'use client'

import { useState } from 'react'
import { useAuth } from '@/lib/auth-context'
import { useSidebar } from '@/lib/sidebar-context'
import { useRouter, usePathname } from 'next/navigation'
import {
  BarChart3,
  Calendar,
  Users,
  Settings,
  Menu,
  X,
  LogOut,
  Crown,
  ChevronRight,
  Home,
  ChevronLeft
} from 'lucide-react'

interface MenuItem {
  id: string
  label: string
  icon: any
  path: string
  roles?: string[]
}

export default function AppSidebar() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const { isSidebarCollapsed, toggleSidebar } = useSidebar()
  const { user, logout } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  const menuItems: MenuItem[] = [
    {
      id: 'home',
      label: 'Página Inicial',
      icon: Home,
      path: '/',
      roles: ['ADMIN', 'BARBER', 'CLIENT']
    },
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: BarChart3,
      path: '/dashboard/dashboard',
      roles: ['ADMIN', 'BARBER', 'CLIENT']
    },
    {
      id: 'appointments',
      label: 'Agendamentos',
      icon: Calendar,
      path: '/agenda',
      roles: ['ADMIN', 'BARBER', 'CLIENT']
    },
    {
      id: 'clients',
      label: 'Clientes',
      icon: Users,
      path: '/clientes',
      roles: ['ADMIN', 'BARBER']
    },
    {
      id: 'services',
      label: 'Serviços',
      icon: Settings,
      path: '/servicos',
      roles: ['ADMIN', 'BARBER']
    },
    {
      id: 'professionals',
      label: 'Profissionais',
      icon: Users,
      path: '/usuarios',
      roles: ['ADMIN']
    },
    {
      id: 'settings',
      label: 'Configurações',
      icon: Settings,
      path: '/configuracoes',
      roles: ['ADMIN', 'BARBER', 'CLIENT']
    }
  ]

  // Filter menu items based on user role
  const filteredMenuItems = menuItems.filter(item => 
    !item.roles || item.roles.includes(user?.role || '')
  )

  const handleNavigation = (path: string) => {
    router.push(path)
    setIsMobileMenuOpen(false)
  }

  const handleLogout = () => {
    logout()
    router.push('/login')
  }

  const isActive = (path: string) => {
    return pathname === path || pathname.startsWith(path + '/')
  }

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-3 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-xl text-black shadow-lg min-h-[44px] min-w-[44px]"
        aria-label={isMobileMenuOpen ? 'Fechar menu' : 'Abrir menu'}
      >
        {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {/* Sidebar */}
      <div className={`
        fixed inset-y-0 left-0 z-50 bg-gradient-to-br from-gray-950 via-blue-950 to-black border-r border-white/6
        transform transition-all duration-300 ease-in-out
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        ${isSidebarCollapsed ? 'lg:w-16 lg:pl-0' : 'sidebar-responsive'}
      `}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-4 border-b border-white/6 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-xl flex items-center justify-center flex-shrink-0">
                <svg className="w-6 h-6 text-black" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2L2 7v10c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-10-5z"/>
                </svg>
              </div>
              {!isSidebarCollapsed && (
                <div>
                  <h1 className="text-xl font-bold text-white">BARBEARIA</h1>
                  <p className="text-yellow-400 text-sm font-medium">BUSINESS</p>
                </div>
              )}
            </div>
            {/* Toggle Sidebar Button - Desktop only */}
            <button
              onClick={toggleSidebar}
              className="hidden lg:flex p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-all"
              aria-label={isSidebarCollapsed ? 'Expandir menu' : 'Recolher menu'}
            >
              {isSidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-2 overflow-y-auto scrollbar-hide">
            {filteredMenuItems.map((item) => {
              const Icon = item.icon
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavigation(item.path)}
                  className={`
                    w-full flex items-center px-4 py-3 rounded-xl transition-all duration-200 min-h-[44px]
                    ${isActive(item.path) 
                      ? 'bg-gradient-to-r from-yellow-400/20 to-yellow-600/20 border border-yellow-400/30 text-yellow-400' 
                      : 'text-white/60 hover:text-white hover:bg-white/5'
                    }
                    ${isSidebarCollapsed ? 'justify-center' : 'space-x-3'}
                  `}
                  title={isSidebarCollapsed ? item.label : ''}
                >
                  <Icon className="w-5 h-5 flex-shrink-0" />
                  {!isSidebarCollapsed && <span className="font-medium">{item.label}</span>}
                  {!isSidebarCollapsed && isActive(item.path) && <ChevronRight className="w-4 h-4 ml-auto" />}
                </button>
              )
            })}
          </nav>

          {/* Upgrade Card */}
          <div className="p-4 border-t border-white/6 hidden md:block">
            {!isSidebarCollapsed ? (
              <div className="bg-gradient-to-br from-yellow-400/10 to-yellow-600/10 border border-yellow-400/20 rounded-xl p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <Crown className="w-4 h-4 text-yellow-400" />
                  <span className="text-yellow-400 font-semibold text-sm">PROFESSIONAL</span>
                </div>
                <p className="text-white/80 text-sm mb-3">
                  Desbloqueie relatórios avançados e recursos ilimitados
                </p>
                <button className="w-full py-2 bg-gradient-to-r from-yellow-400 to-yellow-600 text-black font-semibold rounded-lg hover:from-yellow-500 hover:to-yellow-700 transition-all text-sm">
                  Fazer Upgrade
                </button>
              </div>
            ) : (
              <button
                className="w-full p-3 flex justify-center text-yellow-400 hover:bg-white/10 rounded-lg transition-all"
                title="Fazer Upgrade"
              >
                <Crown className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* User Profile */}
          <div className="p-4 border-t border-white/6">
            <div className="flex items-center">
              {(user as any)?.avatar ? (
                <img 
                  src={(user as any).avatar} 
                  alt="Avatar" 
                  className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                />
              ) : (
                <div className="w-10 h-10 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-black font-bold text-xs">
                    {user?.name?.charAt(0).toUpperCase() || 'U'}
                  </span>
                </div>
              )}
              {!isSidebarCollapsed && (
                <div className="flex-1 min-w-0 ml-3">
                  <p className="text-white font-medium text-sm truncate">{user?.name || 'Usuário'}</p>
                  <p className="text-yellow-400 text-xs">{user?.role || 'CLIENT'}</p>
                </div>
              )}
              <button 
                onClick={handleLogout}
                className="p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-all flex-shrink-0"
                title="Sair da conta"
                aria-label="Sair da conta"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-30"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}
    </>
  )
}
