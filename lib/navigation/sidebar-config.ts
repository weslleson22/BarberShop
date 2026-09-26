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
              { title: "Suspensas", url: "/developer?status=SUSPENDED", badge: "Em breve" },
              { title: "Canceladas", url: "/developer?status=CANCELLED", badge: "Em breve" },
            ],
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
              { title: "Período Trial", url: "#", badge: "Em breve", disabled: true },
            ],
          },
          {
            title: "Financeiro Global",
            icon: CreditCard,
            items: [
              { title: "Receita Recorrente", url: "#", badge: "Em breve", disabled: true },
              { title: "Cobranças", url: "#", badge: "Em breve", disabled: true },
              { title: "Faturas & Invoices", url: "#", badge: "Em breve", disabled: true },
            ],
          },
          {
            title: "Planos & Tiers",
            icon: Layers,
            items: [
              { title: "Planos do SaaS", url: "#", badge: "Em breve", disabled: true },
              { title: "Benefícios & Limites", url: "#", badge: "Em breve", disabled: true },
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
              { title: "Métricas de Servidor", url: "#", badge: "Em breve", disabled: true },
              { title: "Logs de Auditoria", url: "#", badge: "Em breve", disabled: true },
            ],
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
              { title: "Assinatura Ativa", url: "#", badge: "Em breve", disabled: true },
              { title: "Faturas & Recibos", url: "#", badge: "Em breve", disabled: true },
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
