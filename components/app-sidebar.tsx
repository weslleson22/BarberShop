"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { ROLE_LABELS, type UserRole } from "@/lib/roles"
import {
  LayoutDashboard,
  CalendarDays,
  CalendarCheck,
  Calendar,
  Users,
  User,
  UserCog,
  Scissors,
  CreditCard,
  BarChart3,
  Settings,
  Building2,
  Receipt,
  ShieldCheck,
  FileText,
  ChevronRight,
  ChevronsUpDown,
  LogOut,
  Bell,
  Sparkles,
  Store,
  Layers,
  Activity,
  Sliders,
  HelpCircle
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
  SidebarMenuAction,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
  SidebarSeparator,
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

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { user, logout } = useAuth()
  const pathname = usePathname()
  const router = useRouter()

  const handleLogout = () => {
    logout()
    router.push("/login")
  }

  const role = user?.role || "CLIENT"

  // Obter as seções de menu de acordo com o papel do usuário (RBAC)
  const navSections = React.useMemo(() => getSidebarSections(role), [role])

  // Contexto da Barbearia para o Header
  const organizationContext = React.useMemo(() => getOrganizationContext(role), [role])
  const OrgIcon = organizationContext.icon

  // Função para verificar se a rota está ativa
  const isRouteActive = (url?: string) => {
    if (!url || url === "#") return false
    if (url === "/dashboard") return pathname === "/dashboard"
    return pathname.startsWith(url)
  }

  // Obter as iniciais do nome para o Avatar
  const userInitials = React.useMemo(() => {
    if (!user?.name) return "US"
    const parts = user.name.trim().split(" ")
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
    }
    return user.name.slice(0, 2).toUpperCase()
  }, [user?.name])

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border bg-sidebar" {...props}>
      {/* 1. HEADER DA SIDEBAR — Identidade da Empresa / Unidade */}
      <SidebarHeader className="border-b border-sidebar-border/80 p-3">
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground group-data-[collapsible=icon]:!p-0"
                >
                  <div className="flex aspect-square size-9 items-center justify-center rounded-lg bg-gradient-to-br from-amber-400 to-yellow-600 text-black shadow-md shadow-amber-500/20">
                    <OrgIcon className="size-5 font-bold" />
                  </div>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold text-sidebar-foreground">
                      {organizationContext.name}
                    </span>
                    <span className="truncate text-xs text-sidebar-foreground/70">
                      {organizationContext.subtitle}
                    </span>
                  </div>
                  <ChevronsUpDown className="ml-auto size-4 text-sidebar-foreground/50" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-56 rounded-lg bg-popover text-popover-foreground border-border shadow-xl"
                align="start"
                side="bottom"
                sideOffset={4}
              >
                <DropdownMenuLabel className="text-xs text-muted-foreground">
                  Contexto Ativo
                </DropdownMenuLabel>
                <DropdownMenuItem className="gap-2 p-2 focus:bg-accent focus:text-accent-foreground">
                  <div className="flex size-6 items-center justify-center rounded-md border border-amber-500/40 bg-amber-500/10 text-amber-400">
                    <OrgIcon className="size-3.5" />
                  </div>
                  <div className="font-medium text-xs">
                    {organizationContext.name}
                  </div>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => router.push("/perfil")}
                  className="gap-2 text-xs focus:bg-accent focus:text-accent-foreground cursor-pointer"
                >
                  <Store className="size-4 text-muted-foreground" />
                  <span>Ver Detalhes da Unidade</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      {/* 2. CONTEÚDO PRINCIPAL — Grupos e Menus com Collapsible */}
      <SidebarContent className="px-2 py-3 space-y-4">
        {navSections.map((section, sectionIdx) => (
          <SidebarGroup key={`${section.label}-${sectionIdx}`} className="py-0">
            <SidebarGroupLabel className="text-[11px] font-semibold tracking-wider text-sidebar-foreground/60 uppercase px-2 mb-1">
              {section.label}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {section.items.map((item) => {
                  const hasSubItems = Array.isArray(item.items) && item.items.length > 0
                  const isAnySubActive = hasSubItems && item.items?.some((sub) => isRouteActive(sub.url))
                  const isActive = isRouteActive(item.url) || isAnySubActive

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
                              isActive={isActive}
                              className="font-medium"
                            >
                              <item.icon className="size-4 shrink-0 text-sidebar-foreground/80 group-hover:text-sidebar-accent-foreground" />
                              <span className="truncate">{item.title}</span>
                              {item.badge && (
                                <Badge variant="secondary" className="ml-auto text-[10px] px-1.5 py-0 h-4">
                                  {item.badge}
                                </Badge>
                              )}
                              <ChevronRight className="ml-auto size-4 shrink-0 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90 text-sidebar-foreground/50" />
                            </SidebarMenuButton>
                          </CollapsibleTrigger>
                          <CollapsibleContent>
                            <SidebarMenuSub className="my-1 space-y-0.5">
                              {item.items?.map((subItem) => {
                                const isSubActive = isRouteActive(subItem.url)
                                return (
                                  <SidebarMenuSubItem key={subItem.title}>
                                    {subItem.disabled ? (
                                      <SidebarMenuSubButton
                                        aria-disabled="true"
                                        className="opacity-50 cursor-not-allowed text-sidebar-foreground/60"
                                      >
                                        <span className="truncate">{subItem.title}</span>
                                        {subItem.badge && (
                                          <Badge variant="outline" className="ml-auto text-[9px] px-1 py-0 h-3.5 border-sidebar-border text-sidebar-foreground/60">
                                            {subItem.badge}
                                          </Badge>
                                        )}
                                      </SidebarMenuSubButton>
                                    ) : (
                                      <SidebarMenuSubButton
                                        asChild
                                        isActive={isSubActive}
                                      >
                                        <Link href={subItem.url} className="flex items-center w-full">
                                          <span className="truncate">{subItem.title}</span>
                                          {subItem.badge && (
                                            <Badge variant="secondary" className="ml-auto text-[9px] px-1 py-0 h-3.5">
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

                  // Item simples sem submenu
                  if (item.disabled) {
                    return (
                      <SidebarMenuItem key={item.title}>
                        <SidebarMenuButton
                          tooltip={item.title}
                          aria-disabled="true"
                          className="opacity-50 cursor-not-allowed font-medium text-sidebar-foreground/60"
                        >
                          <item.icon className="size-4 shrink-0" />
                          <span className="truncate">{item.title}</span>
                          {item.badge && (
                            <Badge variant="outline" className="ml-auto text-[9px] px-1.5 py-0 h-4 border-sidebar-border text-sidebar-foreground/60">
                              {item.badge}
                            </Badge>
                          )}
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    )
                  }

                  return (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton
                        asChild
                        tooltip={item.title}
                        isActive={isActive}
                        className="font-medium"
                      >
                        <Link href={item.url || "#"} className="flex items-center w-full">
                          <item.icon className="size-4 shrink-0" />
                          <span className="truncate">{item.title}</span>
                          {item.badge && (
                            <Badge variant="secondary" className="ml-auto text-[9px] px-1.5 py-0 h-4">
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

      {/* 3. FOOTER DA SIDEBAR — Dados do Usuário e Logout */}
      <SidebarFooter className="border-t border-sidebar-border/80 p-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground group-data-[collapsible=icon]:!p-0"
                >
                  <Avatar className="size-8 rounded-lg border border-sidebar-border">
                    {user?.avatar && (
                      <AvatarImage src={user.avatar} alt={user?.name || "Avatar"} />
                    )}
                    <AvatarFallback className="rounded-lg bg-amber-500/20 text-amber-400 font-bold text-xs">
                      {userInitials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold text-sidebar-foreground">
                      {user?.name || "Usuário"}
                    </span>
                    <span className="truncate text-xs text-sidebar-foreground/60">
                      {user?.email || "usuario@barbershop.com"}
                    </span>
                  </div>
                  <ChevronsUpDown className="ml-auto size-4 text-sidebar-foreground/50" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-56 rounded-lg bg-popover text-popover-foreground border-border shadow-xl"
                side="bottom"
                align="end"
                sideOffset={4}
              >
                <DropdownMenuLabel className="p-0 font-normal">
                  <div className="flex items-center gap-2 px-2 py-1.5 text-left text-sm">
                    <Avatar className="size-8 rounded-lg">
                      {user?.avatar && (
                        <AvatarImage src={user.avatar} alt={user?.name || "Avatar"} />
                      )}
                      <AvatarFallback className="rounded-lg bg-amber-500/20 text-amber-400 font-bold text-xs">
                        {userInitials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="grid flex-1 text-left text-sm leading-tight">
                      <span className="truncate font-semibold">{user?.name || "Usuário"}</span>
                      <span className="truncate text-xs text-muted-foreground">{ROLE_LABELS[role]}</span>
                    </div>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <DropdownMenuItem
                    onClick={() => router.push("/perfil")}
                    className="gap-2 cursor-pointer focus:bg-accent focus:text-accent-foreground text-xs"
                  >
                    <User className="size-4 text-muted-foreground" />
                    <span>Meu Perfil</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => router.push("/configuracoes")}
                    className="gap-2 cursor-pointer focus:bg-accent focus:text-accent-foreground text-xs"
                  >
                    <Settings className="size-4 text-muted-foreground" />
                    <span>Configurações</span>
                  </DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleLogout}
                  className="gap-2 text-destructive focus:bg-destructive/10 focus:text-destructive cursor-pointer text-xs"
                >
                  <LogOut className="size-4" />
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
