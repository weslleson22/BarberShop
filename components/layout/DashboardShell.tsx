"use client"

import * as React from "react"
import { usePathname, useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { ROLE_LABELS, type UserRole } from "@/lib/roles"
import {
  SidebarProvider,
  SidebarTrigger,
  SidebarInset,
} from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { Separator } from "@/components/ui/separator"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ThemeToggle } from "@/components/theme-toggle"
import NotificationBell from "@/components/shared/NotificationBell"
import {
  Search,
  LogOut,
  User,
  Settings,
  ChevronRight,
  Store,
} from "lucide-react"

const PAGE_TITLES: Record<string, { title: string; subtitle?: string }> = {
  "/dashboard": { title: "Dashboard", subtitle: "Visão Geral & Indicadores" },
  "/agenda": { title: "Agenda", subtitle: "Atendimentos & Horários" },
  "/clientes": { title: "Clientes", subtitle: "Gestão da Base de Clientes" },
  "/servicos": { title: "Serviços", subtitle: "Catálogo de Serviços & Preços" },
  "/usuarios": { title: "Equipe & Usuários", subtitle: "Membros da Barbearia" },
  "/configuracoes": { title: "Configurações", subtitle: "Preferências da Conta" },
  "/perfil": { title: "Meu Perfil", subtitle: "Dados Pessoais & Unidade" },
  "/developer": { title: "Painel SaaS", subtitle: "Gestão Global de Barbearias" },
  "/developer/online-users": { title: "Tempo Real & Auditoria", subtitle: "Usuários Online" },
  "/developer/audit-logs": { title: "Tempo Real & Auditoria", subtitle: "Audit Logs" },
  "/developer/reports": { title: "Tempo Real & Auditoria", subtitle: "Relatórios" },
  "/developer/monitoring": { title: "Tempo Real & Auditoria", subtitle: "System Health" },
  "/developer/realtime": { title: "Tempo Real & Auditoria", subtitle: "Telemetria & Métricas" },
  "/developer/credentials": { title: "Gestão de Credenciais", subtitle: "Controle Restrito de Senhas & Acessos" },
  "/developer/notifications-settings": { title: "Notificações & Alertas", subtitle: "Configurações Globais & Canais" },
  "/developer/notifications-settings/telegram": { title: "Notificações & Alertas", subtitle: "Telegram" },
  "/developer/notifications-settings/email": { title: "Notificações & Alertas", subtitle: "E-mail SMTP" },
  "/developer/notifications-settings/history": { title: "Notificações & Alertas", subtitle: "Histórico" },
  "/developer/backup": { title: "Backup & Restore", subtitle: "Gestão de Dados" },
  "/developer/billing": { title: "Faturamento & Cobranças", subtitle: "AbacatePay, Cobranças & Checkout" },
  "/developer/plans": { title: "Planos", subtitle: "Tiers & Configuração" },
  "/checkout": { title: "Checkout Seguro", subtitle: "AbacatePay Pagamentos" },
  "/developer/onboarding": { title: "Cockpit Onboarding", subtitle: "Gestão de Novos Tenants" },
  "/onboarding": { title: "Onboarding", subtitle: "Guia de Configuração da Barbearia" },
  "/dashboard/onboarding": { title: "Onboarding", subtitle: "Guia de Configuração da Barbearia" },
  "/meus-agendamentos": { title: "Meus Agendamentos", subtitle: "Histórico & Próximos Atendimentos" },
  "/agendar": { title: "Novo Agendamento", subtitle: "Reserva de Horários" },
}

interface DashboardShellProps {
  children: React.ReactNode
}

export function DashboardShell({ children }: DashboardShellProps) {
  const { user, logout } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const [searchQuery, setSearchQuery] = React.useState("")

  const handleLogout = () => {
    logout()
    router.push("/login")
  }

  const role = (user?.role || "CLIENT") as UserRole

  // Identificação do título da página
  const currentPageInfo = React.useMemo(() => {
    const isDev = user?.role === "DEVELOPER"

    if (pathname === "/usuarios" || pathname.startsWith("/usuarios/")) {
      return isDev
        ? { title: "Usuários da Plataforma", subtitle: "Gestão Global de Acessos & Usuários" }
        : { title: "Equipe & Usuários", subtitle: "Membros da Barbearia" }
    }

    if (pathname === "/configuracoes" || pathname.startsWith("/configuracoes/")) {
      return isDev
        ? { title: "Configurações Globais", subtitle: "Preferências do Desenvolvedor & Sistema" }
        : { title: "Configurações", subtitle: "Preferências da Conta" }
    }

    for (const [route, info] of Object.entries(PAGE_TITLES)) {
      if (pathname === route || pathname.startsWith(route + "/")) {
        return info
      }
    }
    return { title: "BarberShop Cloud", subtitle: "Plataforma SaaS Multi-Tenant" }
  }, [pathname, user?.role])

  // Iniciais para o AvatarFallback
  const userInitials = React.useMemo(() => {
    if (!user?.name) return "US"
    const parts = user.name.trim().split(" ")
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
    }
    return user.name.slice(0, 2).toUpperCase()
  }, [user?.name])

  return (
    <SidebarProvider defaultOpen={true}>
      {/* 1. SIDEBAR ESTÁTICA À ESQUERDA — Altura 100% com rolagem invisível */}
      <AppSidebar />

      {/* 2. ÁREA PRINCIPAL COM HEADER E CONTEÚDO ROLÁVEL */}
      <SidebarInset className="flex flex-col min-h-screen bg-background text-foreground overflow-hidden">
        {/* TOP HEADER — Padrão oficial shadcn (h-14, border-b sutil, busca e ações) */}
        <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-4 border-b border-border bg-background/95 px-4 md:px-6 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          {/* Lado Esquerdo: Trigger + Separator + Breadcrumb Simples */}
          <div className="flex items-center gap-3">
            <SidebarTrigger className="h-8 w-8 text-muted-foreground hover:text-foreground rounded-md border border-border transition-colors" />

            <Separator orientation="vertical" className="h-4 bg-border" />

            <div className="flex items-center gap-2 text-sm font-medium">
              <span className="text-muted-foreground hidden sm:inline">Painel</span>
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/60 hidden sm:inline" />
              <span className="font-semibold text-foreground tracking-tight">
                {currentPageInfo.title}
              </span>
            </div>
          </div>

          {/* Centro: Campo de Busca Estilo shadcn */}
          <div className="hidden md:flex flex-1 max-w-sm ml-auto mr-4">
            <div className="relative w-full">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Buscar clientes, barbeiros, serviços..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 h-8 text-xs bg-muted/40 hover:bg-muted/70 focus:bg-background border-border rounded-md placeholder:text-muted-foreground transition-colors"
              />
            </div>
          </div>

          {/* Lado Direito: Ações (ThemeToggle, Notificações, Avatar) */}
          <div className="flex items-center gap-2 ml-auto md:ml-0">
            {/* Alternador de Tema */}
            <ThemeToggle
              variant="ghost"
              className="h-8 w-8 text-muted-foreground hover:text-foreground rounded-md"
            />

            {/* Notificações em Tempo Real */}
            {user && user.role !== "DEVELOPER" && <NotificationBell />}

            <Separator orientation="vertical" className="h-4 bg-border hidden sm:block mx-1" />

            {/* Dropdown do Usuário */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="relative h-8 w-8 rounded-full border border-border p-0 hover:ring-2 hover:ring-ring transition-all"
                >
                  <Avatar className="h-8 w-8 rounded-full">
                    {user?.avatar && (
                      <AvatarImage src={user.avatar} alt={user?.name || "Avatar"} />
                    )}
                    <AvatarFallback className="bg-muted text-foreground font-medium text-xs">
                      {userInitials}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>

              <DropdownMenuContent
                className="w-56 rounded-md bg-popover text-popover-foreground border-border shadow-md"
                align="end"
                side="bottom"
                sideOffset={8}
              >
                <DropdownMenuLabel className="p-0 font-normal">
                  <div className="flex items-center gap-2.5 px-2.5 py-2 text-left text-sm">
                    <Avatar className="size-8 rounded-full border border-border">
                      {user?.avatar && (
                        <AvatarImage src={user.avatar} alt={user?.name || "Avatar"} />
                      )}
                      <AvatarFallback className="bg-muted text-foreground font-medium text-xs">
                        {userInitials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="grid flex-1 text-left text-sm leading-tight">
                      <span className="truncate font-medium">{user?.name || "Usuário"}</span>
                      <span className="truncate text-xs text-muted-foreground">
                        {ROLE_LABELS[role]}
                      </span>
                    </div>
                  </div>
                </DropdownMenuLabel>

                <DropdownMenuSeparator />

                <DropdownMenuGroup>
                  <DropdownMenuItem
                    onClick={() => router.push("/perfil")}
                    className="gap-2 cursor-pointer text-xs"
                  >
                    <User className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>Meu Perfil</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => router.push("/configuracoes")}
                    className="gap-2 cursor-pointer text-xs"
                  >
                    <Settings className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>Configurações</span>
                  </DropdownMenuItem>
                  {role !== "DEVELOPER" && (
                    <DropdownMenuItem
                      onClick={() => router.push("/perfil")}
                      className="gap-2 cursor-pointer text-xs"
                    >
                      <Store className="h-3.5 w-3.5 text-muted-foreground" />
                      <span>Unidade & Estabelecimento</span>
                    </DropdownMenuItem>
                  )}
                </DropdownMenuGroup>

                <DropdownMenuSeparator />

                <DropdownMenuItem
                  onClick={handleLogout}
                  className="gap-2 text-destructive focus:bg-destructive/10 focus:text-destructive cursor-pointer text-xs"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  <span>Sair da Conta</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* 3. MAIN CONTENT AREA — Rolagem independente e padding consistente */}
        <main className="flex-1 overflow-y-auto no-scrollbar p-6 md:p-8">
          <div className="max-w-7xl mx-auto w-full space-y-6">
            {children}
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
export default DashboardShell
