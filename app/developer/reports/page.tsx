'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import DropdownHeader from '@/components/shared/DropdownHeader'
import RealtimeNavTabs from '@/components/developer/RealtimeNavTabs'
import { getAuthHeaders } from '@/lib/utils'
import {
  TrendingUp,
  BarChart3,
  Calendar,
  Users,
  Building2,
  Scissors,
  CheckCircle2,
  XCircle,
  Clock,
  Download,
  RefreshCw,
  Activity,
  Layers,
  Zap,
  ArrowUpRight,
  PieChart as PieIcon,
  ShieldAlert,
} from 'lucide-react'

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts'

interface ReportsData {
  periodDays: number
  totals: {
    totalUsers: number
    totalClients: number
    totalBarbershops: number
    totalAppointments: number
    periodAppointmentsCount: number
    periodLogsCount: number
    completionRate: number
  }
  statusCounts: {
    COMPLETED: number
    CONFIRMED: number
    PENDING: number
    CANCELLED: number
    NO_SHOW: number
  }
  dailyActivity: Array<{
    date: string
    appointments: number
    completed: number
    cancelled: number
    actions: number
  }>
  hourlyCounts: Array<{
    hour: string
    hourNumber: number
    appointments: number
    logins: number
  }>
  actionCategories: {
    Agendamentos: number
    Clientes: number
    Autenticacao: number
    Servicos: number
    Assinaturas: number
    Outros: number
  }
  topBarbershops: Array<{
    name: string
    slug: string | null
    appointments: number
    completed: number
  }>
}

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4']

export default function DeveloperReportsPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()

  const [days, setDays] = useState<number>(30)
  const [data, setData] = useState<ReportsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!authLoading && user && user.role !== 'DEVELOPER' && user.role !== 'ADMIN') {
      router.replace('/dashboard')
    }
  }, [user, authLoading, router])

  const fetchReports = async (period: number) => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/developer/reports?days=${period}`, {
        headers: getAuthHeaders(),
        credentials: 'include',
      })
      if (res.ok) {
        const json = await res.json()
        setData(json)
      } else {
        const errJson = await res.json().catch(() => ({}))
        setError(errJson.error || 'Erro ao carregar relatórios')
      }
    } catch {
      setError('Falha de conexão com os serviços de relatórios')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (user?.role === 'DEVELOPER' || user?.role === 'ADMIN') {
      fetchReports(days)
    }
  }, [user, days])

  // Exportar dados como JSON
  const handleExportJSON = () => {
    if (!data) return
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `relatorio-barbershop-${days}dias-${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  // Dados para Gráfico de Status de Agendamentos (Rosca)
  const statusPieData = data
    ? [
        { name: 'Concluídos', value: data.statusCounts.COMPLETED, color: '#10b981' },
        { name: 'Confirmados', value: data.statusCounts.CONFIRMED, color: '#3b82f6' },
        { name: 'Pendentes', value: data.statusCounts.PENDING, color: '#f59e0b' },
        { name: 'Cancelados', value: data.statusCounts.CANCELLED, color: '#ef4444' },
        { name: 'Não Compareceu', value: data.statusCounts.NO_SHOW, color: '#6b7280' },
      ].filter((item) => item.value > 0)
    : []

  // Dados para Gráfico de Categorias de Ação
  const actionCategoriesData = data
    ? Object.entries(data.actionCategories).map(([key, val]) => ({
        name: key,
        value: val,
      }))
    : []

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors">
      <DropdownHeader />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-12 space-y-8">
        {/* Navegação por Subitens / Abas */}
        <RealtimeNavTabs activeTab="reports" />

        {/* Barra Superior de Filtro de Período e Exportação */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-xl bg-card border border-border shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-card-foreground text-base">Estatísticas Consolidadas</h3>
              <p className="text-xs text-muted-foreground font-normal mt-0.5">
                Visualizando métricas consolidadas dos últimos {days} dias
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
            {/* Seletor de Período */}
            <div className="flex items-center gap-1 bg-muted/50 p-1 rounded-lg border border-border text-xs">
              {[
                { label: '7 dias', val: 7 },
                { label: '14 dias', val: 14 },
                { label: '30 dias', val: 30 },
                { label: '90 dias', val: 90 },
              ].map((p) => (
                <button
                  key={p.val}
                  type="button"
                  onClick={() => setDays(p.val)}
                  className={`px-3 py-1.5 rounded-md font-medium text-xs transition cursor-pointer ${
                    days === p.val
                      ? 'bg-primary text-primary-foreground shadow-xs'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {/* Botão de Exportar */}
            <button
              type="button"
              onClick={handleExportJSON}
              disabled={!data || loading}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-medium shadow-xs transition cursor-pointer disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Exportar Dados</span>
            </button>

            {/* Recarregar */}
            <button
              type="button"
              onClick={() => fetchReports(days)}
              disabled={loading}
              className="p-2 rounded-lg bg-background hover:bg-muted text-foreground border border-border transition cursor-pointer"
              title="Recarregar dados"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-semibold flex items-center gap-2">
            <XCircle className="w-5 h-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* KPI Cards de Resumo */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <div className="p-6 rounded-xl bg-card border border-border shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Ações no Sistema
              </span>
              <div className="w-9 h-9 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
                <Activity className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-bold text-card-foreground">
                {data?.totals.periodLogsCount.toLocaleString('pt-BR') ?? '0'}
              </span>
              <span className="text-xs text-blue-700 dark:text-blue-400 font-semibold bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">no período</span>
            </div>
            <p className="text-xs text-muted-foreground font-normal mt-1">Registros processados pela auditoria</p>
          </div>

          <div className="p-6 rounded-xl bg-card border border-border shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Agendamentos ({days}d)
              </span>
              <div className="w-9 h-9 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
                <Calendar className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-bold text-card-foreground">
                {data?.totals.periodAppointmentsCount.toLocaleString('pt-BR') ?? '0'}
              </span>
              <span className="text-xs text-emerald-700 dark:text-emerald-400 font-semibold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                {data?.statusCounts.COMPLETED ?? 0} concluídos
              </span>
            </div>
            <p className="text-xs text-muted-foreground font-normal mt-1">Total de reservas geradas no período</p>
          </div>

          <div className="p-6 rounded-xl bg-card border border-border shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Taxa de Conclusão
              </span>
              <div className="w-9 h-9 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-bold text-card-foreground">
                {data?.totals.completionRate ?? 0}%
              </span>
              <span className="text-xs text-emerald-700 dark:text-emerald-400 font-semibold bg-emerald-500/10 px-2 py-0.5 rounded flex items-center gap-0.5 border border-emerald-500/20">
                <TrendingUp className="w-3.5 h-3.5" /> Eficiência
              </span>
            </div>
            <p className="text-xs text-muted-foreground font-normal mt-1">Agendamentos realizados com sucesso</p>
          </div>

          <div className="p-6 rounded-xl bg-card border border-border shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Base Total Cadastrada
              </span>
              <div className="w-9 h-9 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-bold text-card-foreground">
                {data?.totals.totalClients.toLocaleString('pt-BR') ?? '0'}
              </span>
              <span className="text-xs text-purple-700 dark:text-purple-400 font-semibold bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20">clientes</span>
            </div>
            <p className="text-xs text-muted-foreground font-normal mt-1">
              {data?.totals.totalBarbershops ?? 0} barbearias ativas
            </p>
          </div>
        </div>

        {/* Gráfico 1: Evolução Diária de Atividade e Agendamentos */}
        <div className="p-6 rounded-xl bg-card border border-border shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <div>
              <h3 className="font-semibold text-card-foreground text-base flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-primary" />
                Evolução Diária de Atividade na Plataforma
              </h3>
              <p className="text-xs text-muted-foreground font-normal mt-0.5">
                Comparativo de novos agendamentos vs ações auditadas por dia
              </p>
            </div>
            <div className="flex items-center gap-4 text-xs font-medium">
              <span className="inline-flex items-center gap-1.5 text-foreground">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span> Agendamentos
              </span>
              <span className="inline-flex items-center gap-1.5 text-foreground">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> Concluídos
              </span>
              <span className="inline-flex items-center gap-1.5 text-foreground">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span> Ações Globais
              </span>
            </div>
          </div>

          <div className="h-72 w-full pt-4">
            {mounted && data?.dailyActivity && data.dailyActivity.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.dailyActivity} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorApt" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="colorDone" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="colorActions" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="opacity-15" vertical={false} />
                  <XAxis dataKey="date" stroke="currentColor" className="text-muted-foreground opacity-60" tick={{ fontSize: 11 }} />
                  <YAxis stroke="currentColor" className="text-muted-foreground opacity-60" tick={{ fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'var(--card)',
                      borderColor: 'var(--border)',
                      borderRadius: '0.75rem',
                      color: 'var(--foreground)',
                      fontSize: '12px',
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="actions"
                    name="Ações Gerais"
                    stroke="#3b82f6"
                    fillOpacity={1}
                    fill="url(#colorActions)"
                  />
                  <Area
                    type="monotone"
                    dataKey="appointments"
                    name="Agendamentos"
                    stroke="#f59e0b"
                    fillOpacity={1}
                    fill="url(#colorApt)"
                  />
                  <Area
                    type="monotone"
                    dataKey="completed"
                    name="Concluídos"
                    stroke="#10b981"
                    fillOpacity={1}
                    fill="url(#colorDone)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-muted-foreground font-normal">
                Sem dados suficientes no período para exibir o gráfico
              </div>
            )}
          </div>
        </div>

        {/* Linha com 2 Gráficos: Horários de Pico & Distribuição de Status */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Gráfico 2: Horários de Maior Pico (08h às 22h) */}
          <div className="p-6 rounded-xl bg-card border border-border shadow-xs space-y-4">
            <div>
              <h3 className="font-semibold text-card-foreground text-base flex items-center gap-2">
                <Clock className="w-4 h-4 text-primary" />
                Horários de Pico de Atendimento (08h às 22h)
              </h3>
              <p className="text-xs text-muted-foreground font-normal mt-0.5">
                Volume de agendamentos concentrados por hora do dia
              </p>
            </div>

            <div className="h-64 w-full pt-2">
              {mounted && data?.hourlyCounts && data.hourlyCounts.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.hourlyCounts} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="opacity-15" vertical={false} />
                    <XAxis dataKey="hour" stroke="currentColor" className="text-muted-foreground opacity-60" tick={{ fontSize: 10 }} />
                    <YAxis stroke="currentColor" className="text-muted-foreground opacity-60" tick={{ fontSize: 10 }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'var(--card)',
                        borderColor: 'var(--border)',
                        borderRadius: '0.75rem',
                        color: 'var(--foreground)',
                        fontSize: '12px',
                      }}
                    />
                    <Bar dataKey="appointments" name="Agendamentos" fill="#2563eb" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-xs text-muted-foreground font-normal">
                  Sem dados de horários no período
                </div>
              )}
            </div>
          </div>

          {/* Gráfico 3: Funil de Conversão e Status dos Agendamentos */}
          <div className="p-6 rounded-xl bg-card border border-border shadow-xs space-y-4">
            <div>
              <h3 className="font-semibold text-card-foreground text-base flex items-center gap-2">
                <PieIcon className="w-4 h-4 text-primary" />
                Distribuição por Status de Agendamento
              </h3>
              <p className="text-xs text-muted-foreground font-normal mt-0.5">
                Proporção de reservas concluídas, pendentes e canceladas
              </p>
            </div>

            <div className="h-64 w-full flex items-center justify-center">
              {mounted && statusPieData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusPieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={80}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {statusPieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'var(--card)',
                        borderColor: 'var(--border)',
                        borderRadius: '0.75rem',
                        color: 'var(--foreground)',
                        fontSize: '12px',
                      }}
                    />
                    <Legend
                      wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }}
                      formatter={(val) => <span className="text-foreground font-medium">{val}</span>}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-xs text-muted-foreground font-normal">Nenhum agendamento registrado no período</div>
              )}
            </div>
          </div>
        </div>

        {/* Top Barbearias mais Engajadas */}
        <div className="p-6 rounded-xl bg-card border border-border shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-card-foreground text-base flex items-center gap-2">
                <Building2 className="w-4 h-4 text-primary" />
                Top Estabelecimentos por Volume de Atendimento
              </h3>
              <p className="text-xs text-muted-foreground font-normal mt-0.5">
                Ranking das unidades mais ativas no período selecionado
              </p>
            </div>
            <span className="text-xs text-muted-foreground bg-muted px-3 py-1 rounded-lg border border-border font-medium">
              {data?.topBarbershops.length ?? 0} unidades ranqueadas
            </span>
          </div>

          {data?.topBarbershops && data.topBarbershops.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
              {data.topBarbershops.map((shop, idx) => (
                <div
                  key={shop.name + idx}
                  className="p-4 rounded-xl bg-muted/40 border border-border space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded border border-primary/20">#{idx + 1}</span>
                    <span className="text-xs bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 px-2 py-0.5 rounded font-semibold border border-emerald-500/20">
                      {shop.completed} concluídos
                    </span>
                  </div>
                  <h4 className="font-semibold text-foreground text-sm truncate">{shop.name}</h4>
                  <div className="flex items-center justify-between text-xs text-muted-foreground pt-1 border-t border-border">
                    <span className="font-normal">Total Reservas:</span>
                    <span className="font-semibold text-foreground">{shop.appointments}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-xs text-muted-foreground font-normal">
              Nenhuma atividade registrada para estabelecimentos no período selecionado.
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
