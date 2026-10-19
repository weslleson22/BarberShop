'use client'

import React, { useState } from 'react'
import { useAuth } from '@/lib/auth-context'
import { useRouter, usePathname } from 'next/navigation'
import { ROLE_LABELS, type UserRole } from '@/lib/roles'
import NotificationBell from './NotificationBell'
import {
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from '@/components/ui/sidebar'
import { AppSidebar } from '@/components/app-sidebar'
import { Separator } from '@/components/ui/separator'
import {
  Search,
  LogOut,
  Scissors,
} from 'lucide-react'

const PAGE_TITLES: Record<string, { title: string; subtitle?: string }> = {
  '/dashboard': { title: 'Dashboard', subtitle: 'Visão Geral & Indicadores' },
  '/agenda': { title: 'Agenda', subtitle: 'Atendimentos & Horários' },
  '/clientes': { title: 'Clientes', subtitle: 'Gestão da Base de Clientes' },
  '/servicos': { title: 'Serviços', subtitle: 'Catálogo de Serviços & Preços' },
  '/usuarios': { title: 'Equipe & Usuários', subtitle: 'Membros da Barbearia' },
  '/configuracoes': { title: 'Configurações', subtitle: 'Preferências da Conta' },
  '/perfil': { title: 'Meu Perfil', subtitle: 'Dados Pessoais & Unidade' },
  '/developer': { title: 'Painel SaaS', subtitle: 'Gestão Global de Barbearias' },
  '/developer/online-users': { title: 'Tempo Real & Auditoria', subtitle: 'Usuários Online' },
  '/developer/audit-logs': { title: 'Tempo Real & Auditoria', subtitle: 'Audit Logs' },
  '/developer/reports': { title: 'Tempo Real & Auditoria', subtitle: 'Relatórios' },
  '/developer/monitoring': { title: 'Tempo Real & Auditoria', subtitle: 'System Health' },
  '/developer/realtime': { title: 'Tempo Real & Auditoria', subtitle: 'Telemetria & Métricas' },
  '/developer/credentials': { title: 'Gestão de Credenciais', subtitle: 'Controle Restrito de Senhas & Acessos' },
  '/developer/notifications-settings': { title: 'Notificações & Alertas', subtitle: 'Configurações Globais & Canais' },
  '/developer/notifications-settings/telegram': { title: 'Notificações & Alertas', subtitle: 'Telegram' },
  '/developer/notifications-settings/email': { title: 'Notificações & Alertas', subtitle: 'E-mail SMTP' },
  '/developer/notifications-settings/history': { title: 'Notificações & Alertas', subtitle: 'Histórico' },
  '/developer/backup': { title: 'Backup & Restore', subtitle: 'Gestão de Dados' },
  '/developer/billing': { title: 'Faturamento & Cobranças', subtitle: 'AbacatePay, Cobranças & Checkout' },
  '/developer/plans': { title: 'Planos', subtitle: 'Tiers & Configuração' },
  '/checkout': { title: 'Checkout Seguro', subtitle: 'AbacatePay Pagamentos' },
  '/developer/onboarding': { title: 'Cockpit Onboarding', subtitle: 'Gestão de Novos Tenants' },
  '/onboarding': { title: 'Onboarding', subtitle: 'Guia de Configuração da Barbearia' },
  '/dashboard/onboarding': { title: 'Onboarding', subtitle: 'Guia de Configuração da Barbearia' },
  '/meus-agendamentos': { title: 'Meus Agendamentos', subtitle: 'Histórico & Próximos Atendimentos' },
  '/agendar': { title: 'Novo Agendamento', subtitle: 'Reserva de Horários' },
}

interface HeaderContentProps {
  searchQuery: string
  setSearchQuery: (query: string) => void
  handleLogout: () => void
  currentPageInfo: { title: string; subtitle?: string }
  user: any
}

function HeaderContent({
  searchQuery,
  setSearchQuery,
  handleLogout,
  currentPageInfo,
  user,
}: HeaderContentProps) {
  const sidebar = useSidebar()
  const isMobile = sidebar.isMobile
  const isCollapsed = sidebar.state === 'collapsed'
  const leftOffset = isMobile ? '0px' : isCollapsed ? 'var(--sidebar-width-icon)' : 'var(--sidebar-width)'

  return (
    <>
      <header
        style={{ left: leftOffset }}
        className="fixed top-0 right-0 z-30 transition-[left] duration-200 ease-linear bg-gray-950 border-b border-gray-800"
      >
        <div className="w-full px-4 md:px-6 py-3">
          <div className="flex items-center justify-between gap-4 h-11">
            {/* Lado Esquerdo: SidebarTrigger + Separator + Título da Página Atual */}
            <div className="flex items-center gap-3">
              <SidebarTrigger className="h-9 w-9 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground rounded-lg transition-colors border border-sidebar-border" />

              <Separator orientation="vertical" className="h-5 bg-sidebar-border" />

              <div className="flex flex-col">
                <span className="text-sm font-extrabold text-white tracking-tight">
                  {currentPageInfo.title}
                </span>
                {currentPageInfo.subtitle && (
                  <span className="text-[11px] text-gray-200 font-medium hidden sm:block">
                    {currentPageInfo.subtitle}
                  </span>
                )}
              </div>
            </div>

            {/* Centro: Barra de Busca (Desktop) */}
            <div className="hidden md:flex flex-1 max-w-sm mx-4">
              <div className="relative w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                <input
                  type="text"
                  placeholder="Buscar clientes, serviços, barbeiros..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-1.5 bg-[#030712] border border-[#374151] rounded-lg text-xs text-white placeholder-gray-400 font-medium focus:outline-none focus:border-amber-400 transition-colors"
                />
              </div>
            </div>

            {/* Lado Direito: Notificações + Avatar do Usuário */}
            <div className="flex items-center gap-3">
              {/* Notificações em Tempo Real (Equipe e Clientes) */}
              {user && user.role !== 'DEVELOPER' && <NotificationBell />}

              {/* Identificação do Usuário */}
              <div className="flex items-center gap-2.5 p-1.5 pl-2.5 bg-[#111827] border border-[#374151] rounded-lg">
                <div className="w-7 h-7 bg-[#d97706] text-white font-black rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden">
                  {user?.avatar ? (
                    <img
                      src={user.avatar}
                      alt="Avatar"
                      className="w-7 h-7 rounded-full object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none'
                        const sibling = e.currentTarget.nextElementSibling as HTMLElement
                        if (sibling) sibling.style.display = 'flex'
                      }}
                    />
                  ) : null}
                  <span className={`text-white font-extrabold text-xs ${user?.avatar ? 'hidden' : 'flex'}`}>
                    {user?.name?.charAt(0).toUpperCase() || 'U'}
                  </span>
                </div>
                <div className="hidden sm:block min-w-0 pr-1">
                  <p className="text-white font-bold text-xs truncate max-w-[130px] leading-tight">
                    {user?.name || 'Usuário'}
                  </p>
                  <p className="text-amber-400 text-[10px] leading-tight font-bold">
                    {ROLE_LABELS[(user?.role as UserRole) || 'CLIENT']}
                  </p>
                </div>
                <button
                  onClick={handleLogout}
                  className="p-1.5 text-gray-300 hover:text-white hover:bg-[#dc2626] rounded-md transition-all flex-shrink-0"
                  title="Sair da conta"
                  aria-label="Sair da conta"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Ajusta padding-left do container de conteúdo no desktop dinamicamente */}
      <style jsx global>{`
        @media (min-width: 768px) {
          body {
            padding-left: ${isCollapsed ? 'var(--sidebar-width-icon, 3rem)' : 'var(--sidebar-width, 16rem)'};
            transition: padding-left 200ms ease-linear;
          }
        }
      `}</style>
    </>
  )
}

export default function DropdownHeader() {
  const [searchQuery, setSearchQuery] = useState('')
  const { user, logout } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  const handleLogout = () => {
    logout()
    router.push('/login')
  }

  // Identificar título da página atual de forma sensível ao papel (RBAC)
  const currentPageInfo = React.useMemo(() => {
    const isDev = user?.role === 'DEVELOPER'

    if (pathname === '/usuarios' || pathname.startsWith('/usuarios/')) {
      return isDev
        ? { title: 'Usuários da Plataforma', subtitle: 'Gestão Global de Acessos & Usuários' }
        : { title: 'Equipe & Usuários', subtitle: 'Membros da Barbearia' }
    }

    if (pathname === '/configuracoes' || pathname.startsWith('/configuracoes/')) {
      return isDev
        ? { title: 'Configurações Globais', subtitle: 'Preferências do Desenvolvedor & Sistema' }
        : { title: 'Configurações', subtitle: 'Preferências da Conta' }
    }

    for (const [route, info] of Object.entries(PAGE_TITLES)) {
      if (pathname === route || pathname.startsWith(route + '/')) {
        return info
      }
    }
    return { title: 'BarberShop', subtitle: 'Plataforma SaaS' }
  }, [pathname, user?.role])

  return (
    <SidebarProvider defaultOpen={true} className="!min-h-0 !h-0 overflow-visible">
      <AppSidebar />
      <HeaderContent
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        handleLogout={handleLogout}
        currentPageInfo={currentPageInfo}
        user={user}
      />
    </SidebarProvider>
  )
}
