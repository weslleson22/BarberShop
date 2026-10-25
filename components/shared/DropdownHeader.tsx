'use client'

import React from 'react'
import { useAuth } from '@/lib/auth-context'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import NotificationBell from './NotificationBell'
import {
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from '@/components/ui/sidebar'
import { AppSidebar } from '@/components/app-sidebar'
import { Separator } from '@/components/ui/separator'
import TopBarTrialWidget from '@/components/dashboard/TopBarTrialWidget'

const PAGE_TITLES: Record<string, { title: string; subtitle?: string }> = {
  '/dashboard/financeiro': { title: 'Financeiro', subtitle: 'Fluxo de Caixa & Faturamento' },
  '/dashboard/gastos': { title: 'Gastos do Estabelecimento', subtitle: 'Despesas & Custos Operacionais' },
  '/dashboard/relatorios': { title: 'Relatórios & BI', subtitle: 'Indicadores Estratégicos' },
  '/dashboard/tutorial': { title: 'Tutorial & Guias', subtitle: 'Aprenda a Usar a Plataforma' },
  '/dashboard/suporte': { title: 'Central de Suporte', subtitle: 'Atendimento, Contato & FAQ' },
  '/tutorial': { title: 'Tutorial & Guias', subtitle: 'Aprenda a Usar a Plataforma' },
  '/suporte': { title: 'Central de Suporte', subtitle: 'Atendimento, Contato & FAQ' },
  '/dashboard': { title: 'Dashboard', subtitle: 'Visão Geral & Indicadores' },
  '/agenda': { title: 'Agenda', subtitle: 'Atendimentos & Horários' },
  '/clientes': { title: 'Clientes', subtitle: 'Gestão da Base de Clientes' },
  '/servicos': { title: 'Serviços', subtitle: 'Catálogo de Serviços & Preços' },
  '/usuarios': { title: 'Equipe & Usuários', subtitle: 'Membros da Barbearia' },
  '/configuracoes': { title: 'Configurações', subtitle: 'Preferências da Conta' },
  '/perfil': { title: 'Meu Perfil', subtitle: 'Dados Pessoais & Unidade' },
  '/developer': { title: 'Painel SaaS', subtitle: 'Gestão Global de Barbearias' },
  '/developer/suporte': { title: 'Suporte (Chamados)', subtitle: 'Central de Chamados dos Clientes' },
  '/developer/tutorial': { title: 'Gestão de Tutoriais', subtitle: 'Vídeos e Guias para os Clientes' },
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
  handleLogout: () => void
  currentPageInfo: { title: string; subtitle?: string }
  user: any
}

function HeaderContent({
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
        className="fixed top-0 right-0 z-30 transition-[left] duration-200 ease-linear bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border"
      >
        <div className="w-full px-4 md:px-6 py-2.5">
          <div className="flex items-center justify-between gap-4 h-11">
            {/* Lado Esquerdo: SidebarTrigger + Separator + Título da Página Atual */}
            <div className="flex items-center gap-3">
              <SidebarTrigger className="h-8 w-8 text-foreground hover:bg-muted hover:text-foreground rounded-md transition-colors border border-border" />

              <Separator orientation="vertical" className="h-5 bg-border" />

              <div className="flex flex-col">
                <span className="text-sm font-semibold text-foreground tracking-tight">
                  {currentPageInfo.title}
                </span>
                {currentPageInfo.subtitle && (
                  <span className="text-[11px] text-muted-foreground font-normal hidden sm:block">
                    {currentPageInfo.subtitle}
                  </span>
                )}
              </div>
            </div>

            {/* Centro / Top Bar: Período de Avaliação Gratuita (Apenas para barbearias SEM plano ativo) */}
            <TopBarTrialWidget />
            <div className="flex items-center gap-2.5">
              {/* Notificações em Tempo Real (Equipe e Clientes) */}
              {user && user.role !== 'DEVELOPER' && <NotificationBell />}
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

function DropdownHeaderInner() {
  const { user, logout } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

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
      if (isDev) {
        return { title: 'Configurações Globais', subtitle: 'Preferências do Desenvolvedor & Sistema' }
      }
      const tab = searchParams?.get('tab')
      if (tab === 'hours') {
        return { title: 'Horários de Atendimento', subtitle: 'Perfil do Estabelecimento & Grade Semanal' }
      }
      if (tab === 'barbershop') {
        return { title: 'Perfil do Estabelecimento', subtitle: 'Dados da Barbearia & Link Público' }
      }
      return { title: 'Configurações da Conta', subtitle: 'Preferências da Conta' }
    }

    for (const [route, info] of Object.entries(PAGE_TITLES)) {
      if (pathname === route || pathname.startsWith(route + '/')) {
        return info
      }
    }
    return { title: 'BarberShop', subtitle: 'Plataforma SaaS' }
  }, [pathname, user?.role, searchParams])

  return (
    <SidebarProvider defaultOpen={true} className="!min-h-0 !h-0 overflow-visible">
      <AppSidebar />
      <HeaderContent
        handleLogout={handleLogout}
        currentPageInfo={currentPageInfo}
        user={user}
      />
    </SidebarProvider>
  )
}

export default function DropdownHeader() {
  return (
    <React.Suspense fallback={null}>
      <DropdownHeaderInner />
    </React.Suspense>
  )
}
