'use client'

import { useState } from 'react'
import { useAuth } from '@/lib/auth-context'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { 
  BarChart3, 
  Calendar, 
  Users, 
  Scissors, 
  UserCheck, 
  DollarSign, 
  Package, 
  TrendingUp, 
  Star, 
  Settings, 
  Menu, 
  X, 
  Crown,
  ChevronDown,
  LogOut,
  Home
} from 'lucide-react'

interface MenuItem {
  id: string
  label: string
  icon: any
  path: string
  roles: string[]
  badge?: string
}

export default function ClientSidebar() {
  const { user, logout } = useAuth()
  const router = useRouter()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  const handleLogout = () => {
    logout()
    router.push('/login')
  }

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
      roles: ['ADMIN', 'BARBER'],
      badge: 'NOVO'
    },
    { 
      id: 'services', 
      label: 'Serviços', 
      icon: Scissors, 
      path: '/servicos', 
      roles: ['ADMIN', 'BARBER'] 
    },
    { 
      id: 'barbers', 
      label: 'Profissionais', 
      icon: UserCheck, 
      path: '/usuarios', 
      roles: ['ADMIN'] 
    },
    { 
      id: 'financial', 
      label: 'Financeiro', 
      icon: DollarSign, 
      path: '/financeiro', 
      roles: ['ADMIN'] 
    },
    { 
      id: 'products', 
      label: 'Produtos', 
      icon: Package, 
      path: '/produtos', 
      roles: ['ADMIN', 'BARBER'] 
    },
    { 
      id: 'reports', 
      label: 'Relatórios', 
      icon: TrendingUp, 
      path: '/relatorios', 
      roles: ['ADMIN'] 
    },
    { 
      id: 'promotions', 
      label: 'Promoções', 
      icon: Star, 
      path: '/promocoes', 
      roles: ['ADMIN', 'BARBER'] 
    },
    { 
      id: 'reviews', 
      label: 'Avaliações', 
      icon: Star, 
      path: '/avaliacoes', 
      roles: ['ADMIN', 'BARBER'] 
    },
    { 
      id: 'settings', 
      label: 'Configurações', 
      icon: Settings, 
      path: '/configuracoes', 
      roles: ['ADMIN', 'BARBER', 'CLIENT'] 
    },
  ]

  const filteredMenuItems = menuItems.filter(item => 
    user && item.roles.includes(user.role)
  )

  return (
    <>
      {/* Sidebar */}
      <div className={`
        fixed lg:static inset-y-0 left-0 z-40 w-80 bg-gradient-to-b from-gray-900 to-black border-r border-white/6
        transform transition-transform duration-300 ease-in-out
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-6 border-b border-white/6">
            <Link href="/dashboard/dashboard" className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-xl flex items-center justify-center shadow-lg">
                <Scissors className="w-6 h-6 text-black" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">BARBEARIA</h1>
                <p className="text-xs text-yellow-400 font-medium">BUSINESS</p>
              </div>
            </Link>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
            {filteredMenuItems.map((item) => {
              const Icon = item.icon
              const isActive = window.location.pathname === item.path
              
              return (
                <Link
                  key={item.id}
                  href={item.path}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`
                    flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-200 group
                    ${isActive 
                      ? 'bg-gradient-to-r from-yellow-400/20 to-yellow-600/20 border border-yellow-400/30' 
                      : 'hover:bg-white/5 border border-transparent'
                    }
                  `}
                >
                  <div className="flex items-center space-x-3">
                    <div className={`
                      w-10 h-10 rounded-lg flex items-center justify-center transition-all
                      ${isActive 
                        ? 'bg-gradient-to-br from-yellow-400 to-yellow-600' 
                        : 'bg-white/5 group-hover:bg-white/10'
                      }
                    `}>
                      <Icon className={`
                        w-5 h-5 transition-all
                        ${isActive ? 'text-black' : 'text-white/80 group-hover:text-white'}
                      `} />
                    </div>
                    <span className={`
                      font-medium transition-all
                      ${isActive ? 'text-yellow-400' : 'text-white/80 group-hover:text-white'}
                    `}>
                      {item.label}
                    </span>
                  </div>
                  {item.badge && (
                    <span className="px-2 py-1 bg-yellow-400/20 text-yellow-400 text-xs font-semibold rounded-full border border-yellow-400/30">
                      {item.badge}
                    </span>
                  )}
                </Link>
              )
            })}
          </nav>

          {/* Upgrade Card */}
          <div className="p-4 border-t border-white/6">
            <div className="bg-gradient-to-br from-yellow-400/10 to-yellow-600/10 border border-yellow-400/20 rounded-xl p-4">
              <div className="flex items-center space-x-2 mb-3">
                <Crown className="w-5 h-5 text-yellow-400" />
                <h3 className="text-yellow-400 font-semibold">PROFESSIONAL</h3>
              </div>
              <p className="text-white/60 text-sm mb-4">
                Desbloqueie relatórios avançados, múltiplas barbearias e muito mais.
              </p>
              <button className="w-full px-4 py-2 bg-gradient-to-r from-yellow-400 to-yellow-600 text-black font-semibold rounded-lg hover:from-yellow-500 hover:to-yellow-700 transition-all">
                Fazer Upgrade
              </button>
            </div>
          </div>

          {/* User Profile */}
          <div className="p-4 border-t border-white/6">
            <div className="flex items-center space-x-3 p-3 bg-gradient-to-r from-yellow-400/20 to-yellow-600/20 border border-yellow-400/30 rounded-xl">
              <div className="w-10 h-10 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full flex items-center justify-center">
                <span className="text-black font-bold text-lg">
                  {user?.name?.charAt(0).toUpperCase() || 'U'}
                </span>
              </div>
              <div className="flex-1">
                <p className="text-white font-medium">{user?.name || 'Usuário'}</p>
                <p className="text-yellow-400 text-sm font-medium">
                  {user?.role === 'ADMIN' ? 'Administrador' : 
                   user?.role === 'BARBER' ? 'Barbeiro' : 'Cliente'}
                </p>
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
    </>
  )
}
