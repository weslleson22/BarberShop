'use client'

import { useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { cn } from '@/lib/utils'
import { 
  LayoutDashboard, 
  Calendar, 
  Users, 
  Scissors, 
  Settings, 
  DollarSign,
  LogOut,
  User,
  Menu,
  X
} from 'lucide-react'

interface SidebarItem {
  title: string
  icon: React.ReactNode
  href: string
  roles?: ('ADMIN' | 'BARBER' | 'CLIENT')[]
}

const sidebarItems: SidebarItem[] = [
  {
    title: 'Dashboard',
    icon: <LayoutDashboard className="h-4 w-4" />,
    href: '/dashboard',
    roles: ['ADMIN', 'BARBER', 'CLIENT']
  },
  {
    title: 'Agendamentos',
    icon: <Calendar className="h-4 w-4" />,
    href: '/agenda',
    roles: ['ADMIN', 'BARBER']
  },
  {
    title: 'Clientes',
    icon: <Users className="h-4 w-4" />,
    href: '/clientes',
    roles: ['ADMIN', 'BARBER']
  },
  {
    title: 'Serviços',
    icon: <Scissors className="h-4 w-4" />,
    href: '/servicos',
    roles: ['ADMIN', 'BARBER']
  },
  {
    title: 'Usuários',
    icon: <User className="h-4 w-4" />,
    href: '/usuarios',
    roles: ['ADMIN']
  },
  {
    title: 'Financeiro',
    icon: <DollarSign className="h-4 w-4" />,
    href: '/financeiro',
    roles: ['ADMIN']
  },
  {
    title: 'Configurações',
    icon: <Settings className="h-4 w-4" />,
    href: '/configuracoes',
    roles: ['ADMIN', 'BARBER', 'CLIENT']
  }
]

interface SidebarProps {
  className?: string
}

export function Sidebar({ className }: SidebarProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const router = useRouter()
  const pathname = usePathname()
  const { user, logout } = useAuth()

  const filteredItems = sidebarItems.filter(item => 
    !item.roles || item.roles.includes(user?.role || 'CLIENT')
  )

  const handleLogout = () => {
    logout()
    router.push('/')
  }

  const handleNavClick = (href: string) => {
    router.push(href)
    setSidebarOpen(false)
  }

  return (
    <>
      {/* Mobile menu button */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-2 rounded-md bg-white shadow-md border border-gray-200 hover:bg-gray-50"
        >
          <Menu className="h-4 w-4" />
        </button>
      </div>

      {/* Sidebar */}
      <div className={cn(
        "fixed inset-y-0 left-0 z-40 w-64 bg-white border-r border-gray-200 transition-transform duration-300 ease-in-out lg:translate-x-0",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">BarberShop</h2>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-1 rounded-md hover:bg-gray-100"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* User Profile */}
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center space-x-3">
              <div className="h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-blue-600 font-bold text-sm">
                  {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{user?.name}</p>
                <p className="text-xs text-gray-500 truncate">{user?.role}</p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-2">
            {filteredItems.map((item) => (
              <button
                key={item.href}
                onClick={() => handleNavClick(item.href)}
                className={cn(
                  "w-full flex items-center space-x-3 px-3 py-2 text-sm font-medium rounded-md transition-colors",
                  pathname === item.href 
                    ? "bg-blue-100 text-blue-700" 
                    : "text-gray-700 hover:bg-gray-100"
                )}
              >
                {item.icon}
                <span>{item.title}</span>
              </button>
            ))}
          </nav>

          {/* Footer */}
          <div className="p-4 border-t border-gray-200 mt-auto">
            <button
              onClick={handleLogout}
              className="w-full flex items-center space-x-3 px-3 py-2 text-sm font-medium text-red-600 rounded-md hover:bg-red-50 transition-colors"
            >
              <LogOut className="h-4 w-4" />
              <span>Sair</span>
            </button>
          </div>
        </div>
      </div>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </>
  )
}
