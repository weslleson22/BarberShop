'use client'

import { useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { cn } from '@/lib/utils'
import { 
  LayoutDashboard,
  Calendar,
  Users,
  DollarSign,
  Settings,
  Menu,
  X,
  LogOut,
  Camera,
  Scissors,
  User
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
    router.push('/login')
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
          className="p-2 rounded-md bg-gradient-to-br from-yellow-400 to-yellow-600 shadow-md border border-yellow-400/30 hover:from-yellow-500 hover:to-yellow-700"
        >
          <Menu className="h-4 w-4 text-black" />
        </button>
      </div>

      {/* Sidebar */}
      <div className={cn(
        "fixed inset-y-0 left-0 z-20 w-64 bg-gradient-to-br from-gray-950 via-blue-950 to-black border-r border-white/6 transition-transform duration-300 ease-in-out lg:translate-x-0",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-white/6">
            <h2 className="text-lg font-semibold text-white">BarberShop</h2>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-1 rounded-md hover:bg-white/10"
            >
              <X className="h-4 w-4 text-white" />
            </button>
          </div>

          {/* User Profile */}
          <div className="p-6 border-b border-white/6">
            <div className="flex items-center space-x-3">
              <div className="relative group">
                {(user as any)?.avatar ? (
                  <img 
                    src={(user as any).avatar} 
                    alt="Avatar" 
                    className="h-10 w-10 rounded-full object-cover cursor-pointer transition-all"
                  />
                ) : (
                  <div className="h-10 w-10 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full flex items-center justify-center cursor-pointer transition-all">
                    <span className="text-black font-bold text-sm">
                      {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                    </span>
                  </div>
                )}
                <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all cursor-pointer z-10">
                  <Camera className="w-4 h-4 text-white" />
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{user?.name}</p>
                <p className="text-xs text-yellow-400 truncate">{user?.role}</p>
              </div>
              <button 
                onClick={() => router.push('/configuracoes')}
                className="p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-all"
                title="Configurações"
              >
                <Settings className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto scrollbar-hide">
            {filteredItems.map((item) => (
              <button
                key={item.href}
                onClick={() => handleNavClick(item.href)}
                className={cn(
                  "w-full flex items-center space-x-3 px-3 py-2 text-sm font-medium rounded-md transition-colors",
                  pathname === item.href 
                    ? "bg-gradient-to-r from-yellow-400/20 to-yellow-600/20 border border-yellow-400/30 text-yellow-400" 
                    : "text-white/60 hover:text-white hover:bg-white/5"
                )}
              >
                {item.icon}
                <span>{item.title}</span>
              </button>
            ))}
          </nav>
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
