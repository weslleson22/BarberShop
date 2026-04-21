'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { 
  Home, 
  Calendar, 
  Users, 
  Scissors, 
  ArrowLeft, 
  LogOut,
  Menu,
  X,
  Shield
} from 'lucide-react'
import { useState } from 'react'
import { useAuth } from '@/lib/auth-context'

export default function Navigation() {
  const pathname = usePathname()
  const { user, logout } = useAuth()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  const isActive = (path: string) => pathname === path

  // Itens de navegação baseados no nível de acesso
  const getNavigationItems = () => {
    if (!user) return []

    let items = []

    // Dashboard - todos os usuários logados
    items.push({ href: '/dashboard/dashboard', label: 'Dashboard', icon: Home })

    // CLIENT - apenas dashboard e agendar
    if (user.role === 'CLIENT') {
      items.push({ href: '/agendar', label: 'Agendar', icon: Calendar })
      return items
    }

    // BARBER - dashboard, agenda, clientes, serviços
    if (user.role === 'BARBER') {
      items.push({ href: '/agenda', label: 'Agenda', icon: Calendar })
      items.push({ href: '/clientes', label: 'Clientes', icon: Users })
      items.push({ href: '/servicos', label: 'Serviços', icon: Scissors })
      return items
    }

    // ADMIN - acesso total
    if (user.role === 'ADMIN') {
      items.push({ href: '/agenda', label: 'Agenda', icon: Calendar })
      items.push({ href: '/clientes', label: 'Clientes', icon: Users })
      items.push({ href: '/servicos', label: 'Serviços', icon: Scissors })
      items.push({ href: '/usuarios', label: 'Usuários', icon: Shield })
      return items
    }

    return items
  }

  const navigationItems = getNavigationItems()

  const handleLogout = () => {
    logout()
  }

  // Não mostrar navegação em páginas de login, registro e página inicial
  if (pathname === '/login' || pathname === '/register' || pathname === '/' || pathname === '/agendar') {
    return null
  }

  return (
    <>
      {/* Navegação Desktop */}
      <nav className="hidden md:block bg-white shadow-lg border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-8">
              {/* Logo */}
              <Link href="/dashboard/dashboard" className="flex items-center space-x-2">
                <Scissors className="w-8 h-8 text-blue-600" />
                <span className="text-xl font-bold text-gray-900">BarberShop</span>
              </Link>

              {/* Menu principal */}
              <div className="flex space-x-1">
                {navigationItems.map((item) => {
                  const Icon = item.icon
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                        isActive(item.href)
                          ? 'bg-blue-100 text-blue-700'
                          : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{item.label}</span>
                    </Link>
                  )
                })}
              </div>
            </div>

            {/* Logout */}
            <button
              onClick={handleLogout}
              className="flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span>Sair</span>
            </button>
          </div>
        </div>
      </nav>

      {/* Navegação Mobile */}
      <nav className="md:hidden bg-white shadow-lg border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <Link href="/dashboard/dashboard" className="flex items-center space-x-2">
              <Scissors className="w-8 h-8 text-blue-600" />
              <span className="text-xl font-bold text-gray-900">BarberShop</span>
            </Link>

            {/* Menu mobile button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 rounded-md text-gray-600 hover:bg-gray-100"
            >
              {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

          {/* Menu mobile dropdown */}
          {isMobileMenuOpen && (
            <div className="border-t border-gray-200 py-2">
              {navigationItems.map((item) => {
                const Icon = item.icon
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      isActive(item.href)
                        ? 'bg-blue-100 text-blue-700'
                        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </Link>
                )
              })}
              <button
                onClick={handleLogout}
                className="flex items-center space-x-2 w-full px-3 py-2 rounded-md text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span>Sair</span>
              </button>
            </div>
          )}
        </div>
      </nav>
    </>
  )
}

// Componente de botão voltar
interface BackButtonProps {
  href?: string
  onClick?: () => void
  label?: string
}

export function BackButton({ href = '/dashboard/dashboard', onClick, label = 'Voltar' }: BackButtonProps) {
  if (onClick) {
    return (
      <button
        onClick={onClick}
        className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 font-medium transition-colors mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>{label}</span>
      </button>
    )
  }

  return (
    <Link
      href={href}
      className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 font-medium transition-colors mb-6"
    >
      <ArrowLeft className="w-4 h-4" />
      <span>{label}</span>
    </Link>
  )
}
