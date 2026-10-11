'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import DropdownHeader from '@/components/shared/DropdownHeader'
import { useAuth } from '@/lib/auth-context'
import { getAuthHeaders } from '@/lib/utils'
import {
  BarChart3,
  TrendingUp,
  Users,
  Scissors,
  DollarSign,
  Calendar,
  CheckCircle2,
  PieChart,
  ArrowUpRight,
  ShieldCheck,
  Award
} from 'lucide-react'

interface StatsData {
  appointments?: {
    total: number
    completed: number
    pending: number
    cancelled: number
    change: number
  }
  clients?: {
    total: number
    newThisMonth: number
    change: number
  }
  revenue?: {
    total: number
    thisMonth: number
    change: number
  }
  averageTicket?: {
    value: number
    thisMonth: number
  }
  services?: {
    total: number
  }
  barbers?: {
    total: number
  }
}

export default function RelatoriosPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()

  const [stats, setStats] = useState<StatsData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/login')
    }
  }, [user, authLoading, router])

  const loadStats = async () => {
    setLoading(true)
    try {
      const headers = getAuthHeaders()
      const res = await fetch('/api/dashboard/stats', { headers, credentials: 'include' })
      if (res.ok) {
        const data = await res.json()
        setStats(data)
      }
    } catch (err) {
      console.error('Erro ao buscar relatórios:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (user) {
      loadStats()
    }
  }, [user])

  const formatPrice = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)
  }

  return (
    <div className="min-h-screen bg-gray-950 text-foreground">
      <DropdownHeader />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Cabeçalho */}
        <div className="border-b border-border/40 pb-6">
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
              Business Intelligence
            </span>
            <span className="text-xs text-muted-foreground">• Relatórios & Métricas</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
            <BarChart3 className="w-7 h-7 text-blue-400" />
            Relatórios & Indicadores de Desempenho
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Análise aprofundada de retenção, ticket médio, produtividade da equipe e crescimento de clientes.
          </p>
        </div>

        {/* Cards de BI */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-card/70 border border-border/60 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between text-muted-foreground text-xs mb-1">
              <span className="font-medium">Crescimento de Clientes</span>
              <Users className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-black text-white">
              +{stats?.clients?.newThisMonth || 0} novos
            </div>
            <div className="text-[11px] text-emerald-400 mt-1 flex items-center gap-1">
              <ArrowUpRight className="w-3 h-3" />
              <span>Base total: {stats?.clients?.total || 0} clientes</span>
            </div>
          </div>

          <div className="bg-card/70 border border-border/60 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between text-muted-foreground text-xs mb-1">
              <span className="font-medium">Taxa de Conclusão</span>
              <CheckCircle2 className="w-4 h-4 text-blue-400" />
            </div>
            <div className="text-2xl font-black text-white">
              {stats?.appointments?.total && stats.appointments.total > 0
                ? `${Math.round(((stats.appointments.completed || 0) / stats.appointments.total) * 100)}%`
                : '100%'}
            </div>
            <div className="text-[11px] text-muted-foreground mt-1">
              {stats?.appointments?.completed || 0} de {stats?.appointments?.total || 0} atendimentos
            </div>
          </div>

          <div className="bg-card/70 border border-border/60 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between text-muted-foreground text-xs mb-1">
              <span className="font-medium">Eficiência da Equipe</span>
              <Award className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-2xl font-black text-amber-400">
              {stats?.barbers?.total || 1} profissionais
            </div>
            <div className="text-[11px] text-muted-foreground mt-1">
              {stats?.services?.total || 0} serviços no catálogo
            </div>
          </div>

          <div className="bg-card/70 border border-border/60 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between text-muted-foreground text-xs mb-1">
              <span className="font-medium">Receita Média por Cliente</span>
              <DollarSign className="w-4 h-4 text-purple-400" />
            </div>
            <div className="text-2xl font-black text-white">
              {formatPrice(stats?.averageTicket?.thisMonth || stats?.averageTicket?.value || 0)}
            </div>
            <div className="text-[11px] text-muted-foreground mt-1">Ticket médio apurado</div>
          </div>
        </div>

        {/* Resumo Gerencial */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-card border border-border/70 rounded-2xl p-6 shadow-sm space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-emerald-400" />
              Saúde Operacional & Conversão
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Os indicadores refletem a performance real de faturamento e agendamentos processados pela sua barbearia.
            </p>
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between text-xs p-3 rounded-xl bg-muted/20 border border-border/40">
                <span className="text-muted-foreground">Atendimentos Concluídos</span>
                <span className="font-bold text-emerald-400">{stats?.appointments?.completed || 0}</span>
              </div>
              <div className="flex items-center justify-between text-xs p-3 rounded-xl bg-muted/20 border border-border/40">
                <span className="text-muted-foreground">Atendimentos Cancelados</span>
                <span className="font-bold text-red-400">{stats?.appointments?.cancelled || 0}</span>
              </div>
              <div className="flex items-center justify-between text-xs p-3 rounded-xl bg-muted/20 border border-border/40">
                <span className="text-muted-foreground">Faturamento Apurado</span>
                <span className="font-bold text-white">{formatPrice(stats?.revenue?.thisMonth || 0)}</span>
              </div>
            </div>
          </div>

          <div className="bg-card border border-border/70 rounded-2xl p-6 shadow-sm space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-400" />
              Recomendações de Crescimento
            </h3>
            <ul className="text-xs text-muted-foreground space-y-2.5">
              <li className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-1.5 shrink-0" />
                <span>
                  Incentive o agendamento recorrente via link público exclusivo da barbearia.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
                <span>
                  Aumente o ticket médio oferecendo combos ou produtos complementares no checkout.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 shrink-0" />
                <span>
                  Monitore clientes sem agendamentos há mais de 30 dias para campanhas de reativação.
                </span>
              </li>
            </ul>
          </div>
        </div>
      </main>
    </div>
  )
}
