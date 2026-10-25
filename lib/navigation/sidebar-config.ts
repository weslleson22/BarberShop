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
  Store,
  Layers,
  Activity,
  HardDrive,
  Rocket,
  KeyRound,
  Bell,
  TrendingDown,
  GraduationCap,
  HelpCircle,
  type LucideIcon,
} from "lucide-react"
import { ROLE_LABELS, type UserRole } from "@/lib/roles"

export interface NavSubItem {
  title: string
  url: string
  badge?: string
  disabled?: boolean
}

export interface NavItem {
  title: string
  url?: string
  icon: LucideIcon
  badge?: string
  disabled?: boolean
  items?: NavSubItem[]
}

export interface NavSection {
  label: string
  items: NavItem[]
}

export function getSidebarSections(role: UserRole): NavSection[] {
  if (role === "DEVELOPER") {
    return [
      {
        label: "Platform",
        items: [
          {
            title: "Dashboard SaaS",
            url: "/developer",
            icon: LayoutDashboard,
          },
          {
            title: "Barbearias",
            icon: Building2,
            items: [
              { title: "Todas as Unidades", url: "/developer?status=ALL" },
              { title: "Unidades Ativas", url: "/developer?status=APPROVED" },
              { title: "Em Avaliação", url: "/developer?status=PENDING" },
              { title: "Suspensas", url: "/developer?status=SUSPENDED" },
              { title: "Canceladas", url: "/developer?status=CANCELLED" },
            ],
          },
          {
            title: "Cockpit Onboarding",
            url: "/developer/onboarding",
            icon: Rocket,
          },
          {
            title: "Usuários da Plataforma",
            url: "/usuarios",
            icon: UserCog,
          },
        ],
      },
      {
        label: "SaaS & Faturamento",
        items: [
          {
            title: "Cobranças & Checkout",
            icon: CreditCard,
            items: [
              { title: "Cobranças AbacatePay", url: "/developer/billing?tab=cobrancas" },
              { title: "Personalizar Checkout", url: "/developer/billing?tab=checkout" },
            ],
          },
          {
            title: "Assinaturas",
            icon: Receipt,
            items: [
              { title: "Ativas", url: "/developer/subscriptions/ativas" },
              { title: "Vencidas", url: "/developer/subscriptions/vencidas" },
              { title: "Gestão Completa", url: "/developer/subscriptions" },
            ],
          },
          {
            title: "Financeiro Global",
            icon: CreditCard,
            items: [
              { title: "Receita Recorrente & Invoices", url: "/developer/billing?tab=invoices" },
            ],
          },
          {
            title: "Planos & Tiers",
            icon: Layers,
            items: [
              { title: "Planos do SaaS", url: "/developer/plans" },
            ],
          },
        ],
      },
      {
        label: "Monitoramento & Telemetria",
        items: [
          {
            title: "Tempo Real & Auditoria",
            icon: Activity,
            items: [
              { title: "Usuários Online", url: "/developer/online-users" },
              { title: "Audit Logs", url: "/developer/audit-logs" },
              { title: "Relatórios", url: "/developer/reports" },
              { title: "System Health", url: "/developer/monitoring" },
            ],
          },
          {
            title: "Segurança & Credenciais",
            url: "/developer/credentials",
            icon: KeyRound,
          },
          {
            title: "Notificações & Alertas",
            icon: Bell,
            items: [
              { title: "Telegram", url: "/developer/notifications-settings/telegram" },
              { title: "E-mail SMTP", url: "/developer/notifications-settings/email" },
              { title: "Histórico", url: "/developer/notifications-settings/history" },
            ],
          },
          {
            title: "Backup & Restore",
            url: "/developer/backup",
            icon: HardDrive,
          },
          {
            title: "Configurações Globais",
            url: "/configuracoes",
            icon: Settings,
          },
        ],
      },

      {
        label: "Atendimento & Conteúdo",
        items: [
          {
            title: "Suporte",
            url: "/developer/suporte",
            icon: HelpCircle,
          },
          {
            title: "Tutorial",
            url: "/developer/tutorial",
            icon: GraduationCap,
          },
        ],
      },
    ]
  }

  if (role === "ADMIN") {
    return [
      {
        label: "Principal",
        items: [
          {
            title: "Dashboard",
            url: "/dashboard",
            icon: LayoutDashboard,
          },
          {
            title: "Agenda de Atendimentos",
            url: "/agenda",
            icon: CalendarDays,
          },
        ],
      },
      {
        label: "Gestão do Negócio",
        items: [
          {
            title: "Clientes",
            url: "/clientes",
            icon: Users,
          },
          {
            title: "Serviços & Preços",
            url: "/servicos",
            icon: Scissors,
          },
          {
            title: "Equipe de Barbeiros",
            url: "/usuarios",
            icon: UserCog,
          },
        ],
      },
      {
        label: "Financeiro & Métricas",
        items: [
          {
            title: "Pagamentos & Caixa",
            url: "/dashboard/financeiro",
            icon: CreditCard,
          },
          {
            title: "Gastos do Estabelecimento",
            url: "/dashboard/gastos",
            icon: TrendingDown,
          },
          {
            title: "Relatórios & BI",
            url: "/dashboard/relatorios",
            icon: BarChart3,
          },
        ],
      },
      {
        label: "SaaS & Assinatura",
        items: [
          {
            title: "Meu Plano",
            icon: ShieldCheck,
            items: [
              { title: "Assinatura & Planos", url: "/dashboard/assinatura" },
              { title: "Guia de Onboarding", url: "/dashboard/onboarding" },
            ],
          },
        ],
      },
      {
        label: "Configurações",
        items: [
          {
            title: "Configurações da Conta",
            url: "/configuracoes?tab=profile",
            icon: Settings,
          },
          {
            title: "Perfil do Estabelecimento",
            icon: Store,
            items: [
              { title: "Dados da Barbearia", url: "/configuracoes?tab=barbershop" },
              { title: "Horários de Atendimento", url: "/configuracoes?tab=hours" },
            ],
          },
        ],
      },
      {
        label: "Ajuda & Recursos",
        items: [
          {
            title: "Tutorial",
            url: "/dashboard/tutorial",
            icon: GraduationCap,
          },
          {
            title: "Suporte",
            url: "/dashboard/suporte",
            icon: HelpCircle,
          },
        ],
      },
    ]
  }

  if (role === "BARBER") {
    return [
      {
        label: "Principal",
        items: [
          {
            title: "Dashboard",
            url: "/dashboard",
            icon: LayoutDashboard,
          },
          {
            title: "Minha Agenda",
            url: "/agenda",
            icon: CalendarDays,
          },
        ],
      },
      {
        label: "Atendimento",
        items: [
          {
            title: "Clientes",
            url: "/clientes",
            icon: Users,
          },
          {
            title: "Serviços Oferecidos",
            url: "/servicos",
            icon: Scissors,
          },
          {
            title: "Meus Relatórios",
            url: "/dashboard/relatorios",
            icon: BarChart3,
          },
        ],
      },
      {
        label: "Conta",
        items: [
          {
            title: "Meu Perfil",
            url: "/perfil",
            icon: User,
          },
          {
            title: "Configurações",
            url: "/configuracoes",
            icon: Settings,
          },
        ],
      },
      {
        label: "Ajuda & Recursos",
        items: [
          {
            title: "Tutorial",
            url: "/dashboard/tutorial",
            icon: GraduationCap,
          },
          {
            title: "Suporte",
            url: "/dashboard/suporte",
            icon: HelpCircle,
          },
        ],
      },
    ]
  }

  if (role === "RECEPTIONIST") {
    return [
      {
        label: "Principal",
        items: [
          {
            title: "Dashboard",
            url: "/dashboard",
            icon: LayoutDashboard,
          },
          {
            title: "Agenda Geral",
            url: "/agenda",
            icon: CalendarDays,
          },
        ],
      },
      {
        label: "Atendimento",
        items: [
          {
            title: "Clientes",
            url: "/clientes",
            icon: Users,
          },
          {
            title: "Catálogo de Serviços",
            url: "/servicos",
            icon: Scissors,
          },
          {
            title: "Pagamentos de Balcão",
            url: "/dashboard/financeiro",
            icon: CreditCard,
          },
        ],
      },
      {
        label: "Conta",
        items: [
          {
            title: "Meu Perfil",
            url: "/perfil",
            icon: User,
          },
          {
            title: "Configurações",
            url: "/configuracoes",
            icon: Settings,
          },
        ],
      },
      {
        label: "Ajuda & Recursos",
        items: [
          {
            title: "Tutorial",
            url: "/dashboard/tutorial",
            icon: GraduationCap,
          },
          {
            title: "Suporte",
            url: "/dashboard/suporte",
            icon: HelpCircle,
          },
        ],
      },
    ]
  }

  // Role CLIENT
  return [
    {
      label: "Principal",
      items: [
        {
          title: "Início",
          url: "/dashboard",
          icon: LayoutDashboard,
        },
        {
          title: "Agendar Horário",
          url: "/agendar",
          icon: Calendar,
        },
        {
          title: "Meus Agendamentos",
          url: "/meus-agendamentos",
          icon: CalendarCheck,
        },
      ],
    },
    {
      label: "Minha Conta",
      items: [
        {
          title: "Meu Perfil",
          url: "/perfil",
          icon: User,
        },
        {
          title: "Configurações",
          url: "/configuracoes",
          icon: Settings,
        },
      ],
    },
  ]
}

export function getOrganizationContext(role: UserRole) {
  if (role === "DEVELOPER") {
    return {
      name: "BarberShop Cloud",
      subtitle: "Gestão SaaS Multi-Tenant",
      plan: "Developer",
      icon: Building2,
    }
  }
  return {
    name: "BarberShop",
    subtitle: ROLE_LABELS[role] || "Gestão Operacional",
    plan: "Plano Profissional",
    icon: Scissors,
  }
}
