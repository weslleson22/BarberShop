'use client'

import { useState } from 'react'
import { useAuth } from '@/lib/auth-context'
import { useRouter, usePathname } from 'next/navigation'
import {
  BarChart3,
  Calendar,
  Users,
  Settings,
  DollarSign,
  Package,
  TrendingUp,
  Star,
  Bell,
  Menu,
  X,
  LogOut,
  Crown,
  ChevronRight
} from 'lucide-react'

interface MenuItem {
  id: string
  label: string
  icon: any
  path: string
  roles?: string[]
}

export default function AgendaSidebar() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const { user, logout } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  const menuItems: MenuItem[] = [
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
      id: 'financial',
      label: 'Financeiro',
      icon: DollarSign,
      path: '/dashboard',
      roles: ['ADMIN', 'BARBER']
    },
    {
      id: 'products',
      label: 'Produtos',
      icon: Package,
      path: '/dashboard',
      roles: ['ADMIN', 'BARBER']
    },
    {
      id: 'reports',
      label: 'Relatórios',
      icon: TrendingUp,
      path: '/dashboard',
      roles: ['ADMIN', 'BARBER']
    },
    {
      id: 'promotions',
      label: 'Promoções',
      icon: Star,
      path: '/dashboard',
      roles: ['ADMIN']
    },
    {
      id: 'reviews',
      label: 'Avaliações',
      icon: Star,
      path: '/dashboard',
      roles: ['ADMIN', 'BARBER']
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
        className="lg:hidden fixed top-4 left-4 z-50 p-3 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-xl text-black"
      >
        {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {/* Sidebar */}
      <div className={`
        fixed inset-y-0 left-0 z-20 w-80 bg-gradient-to-br from-gray-950 via-blue-950 to-black border-r border-white/6
        transform transition-transform duration-300 ease-in-out
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="flex flex-col h-full">
          {/* User Profile */}
          <div className="p-6 border-b border-white/6">
            <div className="flex items-center space-x-3">
              {(user as any)?.avatar ? (
                <img 
                  src={(user as any).avatar} 
                  alt="Avatar" 
                  className="w-10 h-10 rounded-xl object-cover"
                />
              ) : (
                <div className="w-10 h-10 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-xl flex items-center justify-center">
                  <svg className="w-6 h-6 text-black" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2L2 7v10c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-10-5z"/>
                  </svg>
                </div>
              )}
              <div>
                <h1 className="text-xl font-bold text-white">BARBEARIA</h1>
                <p className="text-yellow-400 text-sm font-medium">BUSINESS</p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-2 overflow-y-auto scrollbar-hide">
            {filteredMenuItems.map((item, index) => {
              const Icon = item.icon
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavigation(item.path)}
                  className={`
                    w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200
                    ${isActive(item.path) 
                      ? 'bg-gradient-to-r from-yellow-400/20 to-yellow-600/20 border border-yellow-400/30 text-yellow-400' 
                      : 'text-white/60 hover:text-white hover:bg-white/5'
                    }
                  `}
                >
                  <Icon className="w-5 h-5" />
                  <span className="font-medium">{item.label}</span>
                  {isActive(item.path) && <ChevronRight className="w-4 h-4 ml-auto" />}
                </button>
              )
            })}
          </nav>

          {/* Upgrade Card */}
          <div className="p-4 border-t border-white/6">
            <div className="bg-gradient-to-br from-yellow-400/10 to-yellow-600/10 border border-yellow-400/20 rounded-xl p-4">
              <div className="flex items-center space-x-2 mb-2">
                <Crown className="w-4 h-4 text-yellow-400" />
                <span className="text-yellow-400 font-semibold text-sm">PROFESSIONAL</span>
              </div>
              <p className="text-white/80 text-sm mb-3">
                Desbloqueie relatórios avançados e recursos ilimitados
              </p>
              <button className="w-full py-2 bg-gradient-to-r from-yellow-400 to-yellow-600 text-black font-semibold rounded-lg hover:from-yellow-500 hover:to-yellow-700 transition-all">
                Fazer Upgrade
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
