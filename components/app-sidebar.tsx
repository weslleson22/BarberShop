"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { ROLE_LABELS, type UserRole } from "@/lib/roles"
import {
  ChevronRight,
  ChevronsUpDown,
  LogOut,
  Settings,
  Store,
  User,
} from "lucide-react"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
} from "@/components/ui/sidebar"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
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
import { Badge } from "@/components/ui/badge"
import { ThemeToggle } from "@/components/theme-toggle"

import {
  type NavSubItem,
  type NavItem,
  type NavSection,
  getSidebarSections,
  getOrganizationContext,
} from "@/lib/navigation/sidebar-config"

export {
  type NavSubItem,
  type NavItem,
  type NavSection,
  getSidebarSections,
  getOrganizationContext,
}

function AppSidebarInner({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { user, logout, updateUser } = useAuth()
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()

  const handleLogout = () => {
    logout()
    router.push("/login")
  }

  const role = (user?.role || "CLIENT") as UserRole

  // Obter as seções de menu de acordo com o papel do usuário (RBAC)
  const navSections = React.useMemo(() => getSidebarSections(role), [role])

  // Contexto da Barbearia para o Header
  const organizationContext = React.useMemo(() => getOrganizationContext(role), [role])
  const OrgIcon = organizationContext.icon
  const shopName =
    role !== "DEVELOPER" && user?.barbershop?.name
      ? user.barbershop.name
      : organizationContext.name
  const shopLogo =
    role !== "DEVELOPER" && user?.barbershop?.logo ? user.barbershop.logo : null

  // Sincronização de dados da barbearia se o usuário possuir barbershopId
  const hasSyncedShopRef = React.useRef<string | null>(null)

  React.useEffect(() => {
    if (!user?.barbershopId || user.role === "DEVELOPER") return
    if (hasSyncedShopRef.current === user.barbershopId) return

    hasSyncedShopRef.current = user.barbershopId

    fetch("/api/barbershop")
      .then((res) => (res.ok ? res.json() : null))
      .then((shop) => {
        if (shop && (shop.logo || shop.name)) {
          if (
            user.barbershop?.name !== shop.name ||
            user.barbershop?.logo !== shop.logo
          ) {
            updateUser({
              barbershop: {
                ...(user.barbershop || {}),
                id: shop.id,
                name: shop.name,
                slug: shop.slug,
                logo: shop.logo,
              },
            })
          }
        }
      })
      .catch(() => {})
  }, [
    user?.barbershopId,
    user?.role,
    user?.barbershop?.name,
    user?.barbershop?.logo,
    updateUser,
  ])

  // Função para checagem precisa de rota ativa (suporta rotas exatas, query params e sub-rotas)
  const isRouteActive = React.useCallback(
    (url?: string) => {
      if (!url || url === "#") return false

      const [targetPath, targetQuery] = url.split("?")

      // Se o pathname não bate, não pode ser ativo
      if (pathname !== targetPath) {
        // Suporte para rotas filhas (exceto raízes /dashboard e /developer)
        if (
          targetPath !== "/dashboard" &&
          targetPath !== "/developer" &&
          pathname.startsWith(targetPath + "/")
        ) {
          return true
        }
        return false
      }

      // Se chegamos aqui, pathname === targetPath (ex: ambos são "/developer")
      // Se a URL do item define query params (ex: "?status=APPROVED" ou "?tab=cobrancas")
      if (targetQuery) {
        const itemParams = new URLSearchParams(targetQuery)
        for (const [key, value] of itemParams.entries()) {
          if (searchParams?.get(key) !== value) {
            return false
          }
        }
        return true
      }

      // Se o item NÃO tem query params (ex: url="/developer" ou "/dashboard")
      // Se a URL do navegador tem filtros específicos (como status ou tab),
      // o link geral do topo não deve roubar o highlight do submenu específico.
      const currentStatus = searchParams?.get("status")
      const currentTab = searchParams?.get("tab")
      if (currentStatus || currentTab) {
        return false
      }

      return true
    },
    [pathname, searchParams]
  )

  // Iniciais do usuário para o AvatarFallback
  const userInitials = React.useMemo(() => {
    if (!user?.name) return "US"
    const parts = user.name.trim().split(" ")
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
    }
    return user.name.slice(0, 2).toUpperCase()
  }, [user?.name])

  return (
    <Sidebar
      collapsible="icon"
      className="h-screen flex flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground select-none"
      {...props}
    >
      {/* 1. CABEÇALHO — Identidade Limpa (dashboard-01) + ThemeToggle */}
      <SidebarHeader className="border-b border-sidebar-border/60 p-2.5">
        <SidebarMenu>
          <SidebarMenuItem className="flex items-center gap-1.5">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  className="flex-1 data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground hover:bg-sidebar-accent/80 rounded-md transition-colors"
                >
                  {shopLogo ? (
                    <div className="flex aspect-square size-8 items-center justify-center rounded-md overflow-hidden border border-border bg-muted shrink-0">
                      <img
                        src={shopLogo}
                        alt={shopName}
                        className="size-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="flex aspect-square size-8 items-center justify-center rounded-md bg-primary text-primary-foreground font-semibold text-xs shrink-0">
                      <OrgIcon className="size-4" />
                    </div>
                  )}

                  <div className="grid flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden">
                    <span className="truncate font-semibold text-sidebar-foreground">
                      {shopName}
                    </span>
                    <span className="truncate text-xs text-muted-foreground font-normal">
                      {organizationContext.subtitle}
                    </span>
                  </div>

                  <ChevronsUpDown className="ml-auto size-4 text-muted-foreground shrink-0 group-data-[collapsible=icon]:hidden" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>

              <DropdownMenuContent
                className="w-56 rounded-md bg-popover text-popover-foreground border-border shadow-md"
                align="start"
                side="bottom"
                sideOffset={6}
              >
                <DropdownMenuLabel className="text-xs font-medium text-muted-foreground">
                  Contexto da Conta
                </DropdownMenuLabel>
                <DropdownMenuItem className="gap-2 p-2 focus:bg-accent focus:text-accent-foreground text-xs font-medium">
                  {shopLogo ? (
                    <div className="flex size-6 items-center justify-center rounded border border-border overflow-hidden bg-muted">
                      <img
                        src={shopLogo}
                        alt={shopName}
                        className="size-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="flex size-6 items-center justify-center rounded bg-primary/10 text-primary">
                      <OrgIcon className="size-3.5" />
                    </div>
                  )}
                  <div className="truncate font-medium">{shopName}</div>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => router.push("/perfil")}
                  className="gap-2 text-xs focus:bg-accent focus:text-accent-foreground cursor-pointer"
                >
                  <Store className="size-3.5 text-muted-foreground" />
                  <span>Detalhes do Estabelecimento</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Alternador de Tema no Cabeçalho */}
            <div className="group-data-[collapsible=icon]:hidden shrink-0">
              <ThemeToggle
                variant="ghost"
                className="h-8 w-8 rounded-md text-muted-foreground hover:text-foreground hover:bg-sidebar-accent"
              />
            </div>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      {/* 2. ÁREA DE NAVEGAÇÃO — Rolagem Invisível (no-scrollbar) e Padrão Dashboard-01 */}
      <SidebarContent className="flex-1 overflow-y-auto no-scrollbar px-2 py-3 space-y-4">
        {navSections.map((section, sectionIdx) => (
          <SidebarGroup
            key={`${section.label}-${sectionIdx}`}
            className="py-0 px-0"
          >
            <SidebarGroupLabel className="text-[11px] font-medium tracking-wider text-muted-foreground uppercase px-2 mb-1 h-6">
              {section.label}
            </SidebarGroupLabel>

            <SidebarGroupContent>
              <SidebarMenu className="gap-1">
                {section.items.map((item) => {
                  const hasSubItems =
                    Array.isArray(item.items) && item.items.length > 0

                  const isNotificationSettingsRoute =
                    item.title.includes("Notificações") &&
                    pathname.startsWith("/developer/notifications-settings")
                  const isRealtimeRoute =
                    (item.title.includes("Tempo Real") ||
                      item.title.includes("Auditoria")) &&
                    (pathname.startsWith("/developer/online-users") ||
                      pathname.startsWith("/developer/audit-logs") ||
                      pathname.startsWith("/developer/reports") ||
                      pathname.startsWith("/developer/monitoring") ||
                      pathname.startsWith("/developer/realtime"))

                  const isAnySubActive =
                    hasSubItems &&
                    (item.items?.some((sub) => isRouteActive(sub.url)) ||
                      isNotificationSettingsRoute ||
                      isRealtimeRoute)

                  const isActive = isRouteActive(item.url) || isAnySubActive
                  const Icon = item.icon

                  // Item com Submenu Expansível (ex: Barbearias)
                  if (hasSubItems) {
                    return (
                      <Collapsible
                        key={item.title}
                        asChild
                        defaultOpen={isAnySubActive}
                        className="group/collapsible"
                      >
                        <SidebarMenuItem>
                          <CollapsibleTrigger asChild>
                            <SidebarMenuButton
                              tooltip={item.title}
                              className="h-8.5 rounded-md px-2.5 py-1.5 text-sm font-medium transition-colors text-muted-foreground hover:text-foreground hover:bg-sidebar-accent/50 group-data-[state=open]/collapsible:text-foreground"
                            >
                              <Icon className="h-4 w-4 shrink-0 text-muted-foreground group-hover/collapsible:text-foreground group-data-[state=open]/collapsible:text-foreground" />
                              <span className="truncate">{item.title}</span>
                              {item.badge && (
                                <Badge
                                  variant="secondary"
                                  className="ml-auto text-[10px] font-normal px-1.5 py-0 h-4 rounded-full"
                                >
                                  {item.badge}
                                </Badge>
                              )}
                              <ChevronRight className="ml-auto h-4 w-4 shrink-0 text-muted-foreground/70 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                            </SidebarMenuButton>
                          </CollapsibleTrigger>

                          <CollapsibleContent>
                            <SidebarMenuSub className="ml-3.5 pl-2.5 border-l border-sidebar-border/60 space-y-0.5 mt-1 py-0.5">
                              {item.items?.map((subItem) => {
                                const isSubActive = isRouteActive(subItem.url)

                                return (
                                  <SidebarMenuSubItem key={subItem.title}>
                                    {subItem.disabled ? (
                                      <SidebarMenuSubButton
                                        aria-disabled="true"
                                        size="sm"
                                        className="h-7.5 px-2 rounded-md text-xs opacity-50 cursor-not-allowed text-muted-foreground"
                                        title={subItem.title}
                                      >
                                        <span className="truncate">
                                          {subItem.title}
                                        </span>
                                        {subItem.badge && (
                                          <Badge
                                            variant="outline"
                                            className="ml-auto text-[9px] px-1 py-0 h-3.5 border-sidebar-border text-muted-foreground"
                                          >
                                            {subItem.badge}
                                          </Badge>
                                        )}
                                      </SidebarMenuSubButton>
                                    ) : (
                                      <SidebarMenuSubButton
                                        asChild
                                        size="sm"
                                        isActive={isSubActive}
                                        className="h-7.5 px-2 rounded-md text-xs font-normal transition-colors text-muted-foreground hover:text-foreground hover:bg-sidebar-accent/50 data-[active=true]:bg-sidebar-accent data-[active=true]:text-foreground data-[active=true]:font-medium"
                                      >
                                        <Link
                                          href={subItem.url}
                                          className="flex items-center w-full"
                                          title={subItem.title}
                                        >
                                          <span className="truncate">
                                            {subItem.title}
                                          </span>
                                          {subItem.badge && (
                                            <Badge
                                              variant="secondary"
                                              className="ml-auto text-[9px] px-1 py-0 h-3.5"
                                            >
                                              {subItem.badge}
                                            </Badge>
                                          )}
                                        </Link>
                                      </SidebarMenuSubButton>
                                    )}
                                  </SidebarMenuSubItem>
                                )
                              })}
                            </SidebarMenuSub>
                          </CollapsibleContent>
                        </SidebarMenuItem>
                      </Collapsible>
                    )
                  }

                  // Item Simples Desabilitado
                  if (item.disabled) {
                    return (
                      <SidebarMenuItem key={item.title}>
                        <SidebarMenuButton
                          tooltip={item.title}
                          aria-disabled="true"
                          className="h-8.5 rounded-md px-2.5 py-1.5 text-sm font-medium opacity-50 cursor-not-allowed text-muted-foreground"
                        >
                          <Icon className="h-4 w-4 shrink-0" />
                          <span className="truncate">{item.title}</span>
                          {item.badge && (
                            <Badge
                              variant="outline"
                              className="ml-auto text-[9px] px-1.5 py-0 h-4 border-sidebar-border text-muted-foreground"
                            >
                              {item.badge}
                            </Badge>
                          )}
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    )
                  }

                  // Item Simples Padrão (dashboard-01)
                  return (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton
                        asChild
                        tooltip={item.title}
                        isActive={isActive}
                        className="h-8.5 rounded-md px-2.5 py-1.5 text-sm font-medium transition-colors text-muted-foreground hover:text-sidebar-accent-foreground hover:bg-sidebar-accent data-[active=true]:bg-sidebar-accent data-[active=true]:text-sidebar-accent-foreground data-[active=true]:font-semibold"
                      >
                        <Link
                          href={item.url || "#"}
                          className="flex items-center w-full"
                        >
                          <Icon className="h-4 w-4 shrink-0 text-muted-foreground group-hover:text-sidebar-accent-foreground group-data-[active=true]:text-sidebar-accent-foreground" />
                          <span className="truncate">{item.title}</span>
                          {item.badge && (
                            <Badge
                              variant="secondary"
                              className="ml-auto text-[10px] font-normal px-1.5 py-0 h-4 rounded-full"
                            >
                              {item.badge}
                            </Badge>
                          )}
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      {/* 3. RODAPÉ — Perfil do Usuário com Dropdown e Logout (dashboard-01) */}
      <SidebarFooter className="border-t border-sidebar-border/60 p-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground hover:bg-sidebar-accent/80 rounded-md transition-colors"
                >
                  <Avatar className="size-8 rounded-full border border-sidebar-border/70 shrink-0">
                    {user?.avatar && (
                      <AvatarImage
                        src={user.avatar}
                        alt={user?.name || "Avatar"}
                      />
                    )}
                    <AvatarFallback className="rounded-full bg-muted text-foreground font-medium text-xs">
                      {userInitials}
                    </AvatarFallback>
                  </Avatar>

                  <div className="grid flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden">
                    <span className="truncate font-medium text-sidebar-foreground">
                      {user?.name || "Usuário"}
                    </span>
                    <span className="truncate text-xs text-muted-foreground font-normal">
                      {user?.email || "usuario@barbershop.com"}
                    </span>
                  </div>

                  <ChevronsUpDown className="ml-auto size-4 text-muted-foreground shrink-0 group-data-[collapsible=icon]:hidden" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>

              <DropdownMenuContent
                className="w-56 rounded-md bg-popover text-popover-foreground border-border shadow-md"
                side="bottom"
                align="end"
                sideOffset={6}
              >
                <DropdownMenuLabel className="p-0 font-normal">
                  <div className="flex items-center gap-2.5 px-2.5 py-2 text-left text-sm">
                    <Avatar className="size-8 rounded-full border border-border shrink-0">
                      {user?.avatar && (
                        <AvatarImage
                          src={user.avatar}
                          alt={user?.name || "Avatar"}
                        />
                      )}
                      <AvatarFallback className="rounded-full bg-muted text-foreground font-medium text-xs">
                        {userInitials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="grid flex-1 text-left text-sm leading-tight">
                      <span className="truncate font-medium">
                        {user?.name || "Usuário"}
                      </span>
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
                    className="gap-2 cursor-pointer focus:bg-accent focus:text-accent-foreground text-xs"
                  >
                    <User className="size-3.5 text-muted-foreground" />
                    <span>Meu Perfil</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => router.push("/configuracoes")}
                    className="gap-2 cursor-pointer focus:bg-accent focus:text-accent-foreground text-xs"
                  >
                    <Settings className="size-3.5 text-muted-foreground" />
                    <span>Configurações</span>
                  </DropdownMenuItem>
                </DropdownMenuGroup>

                <DropdownMenuSeparator />

                <DropdownMenuItem
                  onClick={handleLogout}
                  className="gap-2 text-destructive focus:bg-destructive/10 focus:text-destructive cursor-pointer text-xs"
                >
                  <LogOut className="size-3.5" />
                  <span>Sair da Conta</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  )
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <React.Suspense
      fallback={
        <Sidebar
          collapsible="icon"
          className="h-screen flex flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground"
          {...props}
        />
      }
    >
      <AppSidebarInner {...props} />
    </React.Suspense>
  )
}

