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
  Shield,
  FileText,
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
              { title: "Todas as Unidades", url: "/developer" },
              { title: "Unidades Ativas", url: "/developer?status=APPROVED" },
              { title: "Em Avaliação", url: "/developer?status=PENDING" },
              { title: "Suspensas", url: "/developer?status=SUSPENDED", badge: "Em breve", disabled: true },
              { title: "Canceladas", url: "/developer?status=CANCELLED", badge: "Em breve", disabled: true },
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
            title: "Assinaturas",
            icon: Receipt,
            items: [
              { title: "Ativas", url: "#", badge: "Em breve", disabled: true },
              { title: "Vencidas", url: "#", badge: "Em breve", disabled: true },
              { title: "Gestão Completa", url: "/developer/billing" },
            ],
          },
          {
            title: "Financeiro Global",
            icon: CreditCard,
            items: [
              { title: "Receita Recorrente & Invoices", url: "/developer/billing" },
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
        label: "Monitoramento & Sistema",
        items: [
          {
            title: "Monitoramento",
            icon: Activity,
            items: [
              { title: "System Health & Métricas", url: "/developer/monitoring" },
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
            icon: CreditCard,
            badge: "Em breve",
            disabled: true,
          },
          {
            title: "Relatórios & BI",
            icon: BarChart3,
            badge: "Em breve",
            disabled: true,
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
            url: "/configuracoes",
            icon: Settings,
          },
          {
            title: "Perfil do Estabelecimento",
            url: "/perfil",
            icon: Store,
          },
          {
            title: "Termos de Uso",
            url: "/termos",
            icon: FileText,
          },
          {
            title: "Privacidade & LGPD",
            url: "/privacidade",
            icon: Shield,
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
            icon: BarChart3,
            badge: "Em breve",
            disabled: true,
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
          {
            title: "Privacidade & LGPD",
            url: "/privacidade",
            icon: Shield,
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
            icon: CreditCard,
            badge: "Em breve",
            disabled: true,
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
          {
            title: "Privacidade & LGPD",
            url: "/privacidade",
            icon: Shield,
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
        {
          title: "Termos & Privacidade",
          url: "/privacidade",
          icon: Shield,
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
