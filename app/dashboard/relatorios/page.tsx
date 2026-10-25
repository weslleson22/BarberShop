'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import DropdownHeader from '@/components/shared/DropdownHeader'
import { useAuth } from '@/lib/auth-context'
import { getAuthHeaders } from '@/lib/utils'
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Users,
  Scissors,
  DollarSign,
  CheckCircle2,
  RefreshCw,
  Download,
  Award,
  Sparkles,
  Receipt,
  Activity,
  Layers,
  Crown,
  Trophy,
  Clock,
  Star,
  Phone,
  Building2,
  Package,
  Calendar,
  ChevronRight,
  ArrowUpRight,
} from 'lucide-react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import NoSSR from '@/components/dashboard/NoSSR'
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts'

interface ReportsApiResponse {
  summary: {
    totalRevenue: number
    monthRevenue: number
    totalAppointments: number
    completedAppointments: number
    cancelledAppointments: number
    completionRate: number
    averageTicket: number
    totalClients: number
    totalServices: number
    totalBarbers: number
  }
  expenses: {
    totalAmount: number
    monthAmount: number
    paidAmount: number
    pendingAmount: number
    pendingCount: number
    netProfitMonth: number
    netMarginMonth: number
    byCategory: Array<{
      category: string
      label: string
      amount: number
      percent: number
    }>
    inventoryCost: number
    recentExpenses: Array<any>
  }
  barbers: {
    ranking: Array<{
      id: string
      name: string
      email: string
      phone: string | null
      avatar: string | null
      completedCount: number
      totalCount: number
      cancelledCount: number
      revenue: number
      averageTicket: number
      completionRate: number
    }>
    topBarber: {
      id: string
      name: string
      email: string
      phone: string | null
      avatar: string | null
      completedCount: number
      revenue: number
      averageTicket: number
    } | null
    totalBarbers: number
  }
  clients: {
    totalClients: number
    newThisMonth: number
    activeClientsCount: number
    inactiveClientsCount: number
    retentionRate: number
    averageSpendPerClient: number
    topClients: Array<{
      id: string
      name: string
      phone: string
      email: string | null
      totalVisits: number
      totalSpent: number
      lastVisitDate: string | null
    }>
  }
  services: {
    ranking: Array<{
      id: string
      name: string
      price: number
      duration: number
      appointmentCount: number
      totalRevenue: number
      sharePercent: number
    }>
    topService: {
      id: string
      name: string
      price: number
      appointmentCount: number
      totalRevenue: number
    } | null
    highestRevenueService: {
      id: string
      name: string
      price: number
      totalRevenue: number
    } | null
    totalCatalogServices: number
    averageServicePrice: number
  }
  revenueEvolution: Array<{
    date: string
    name: string
    revenue: number
    appointments: number
  }>
}

export default function RelatoriosPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()

  // Subitens de Relatório: 'visao_geral' | 'gastos' | 'barbeiros' | 'clientes' | 'servicos'
  const [activeSubItem, setActiveSubItem] = useState<
    'visao_geral' | 'gastos' | 'barbeiros' | 'clientes' | 'servicos'
  >('visao_geral')

  const [reportData, setReportData] = useState<ReportsApiResponse | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.replace('/login')
      } else if (user.role === 'CLIENT') {
        router.replace('/meus-agendamentos')
      }
    }
  }, [user, authLoading, router])

  const loadData = async () => {
    setLoading(true)
    try {
      const headers = getAuthHeaders()
      const res = await fetch('/api/dashboard/reports', { headers, credentials: 'include' })

      if (res.ok) {
        const data = await res.json()
        setReportData(data)
      } else {
        // Fallback para api anterior caso necessário
        const fallbackRes = await fetch('/api/dashboard/stats', { headers, credentials: 'include' })
        if (fallbackRes.ok) {
          const stats = await fallbackRes.json()
          setReportData({
            summary: {
              totalRevenue: stats.revenue?.total || 0,
              monthRevenue: stats.revenue?.thisMonth || 0,
              totalAppointments: stats.appointments?.total || 0,
              completedAppointments: stats.appointments?.completed || 0,
              cancelledAppointments: stats.appointments?.cancelled || 0,
              completionRate: 100,
              averageTicket: stats.averageTicket?.value || 0,
              totalClients: stats.clients?.total || 0,
              totalServices: stats.services?.total || 0,
              totalBarbers: stats.barbers?.total || 0,
            },
            expenses: {
              totalAmount: 0,
              monthAmount: 0,
              paidAmount: 0,
              pendingAmount: 0,
              pendingCount: 0,
              netProfitMonth: stats.revenue?.thisMonth || 0,
              netMarginMonth: 100,
              byCategory: [],
              inventoryCost: 0,
              recentExpenses: [],
            },
            barbers: { ranking: [], topBarber: null, totalBarbers: 0 },
            clients: {
              totalClients: stats.clients?.total || 0,
              newThisMonth: stats.clients?.newThisMonth || 0,
              activeClientsCount: stats.clients?.total || 0,
              inactiveClientsCount: 0,
              retentionRate: 100,
              averageSpendPerClient: 0,
              topClients: [],
            },
            services: {
              ranking: [],
              topService: null,
              highestRevenueService: null,
              totalCatalogServices: 0,
              averageServicePrice: 0,
            },
            revenueEvolution: [],
          })
        }
      }
    } catch (err) {
      console.error('Erro ao buscar relatórios:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (user) {
      loadData()
    }
  }, [user])

  const formatPrice = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0)
  }

  // Exportação CSV completa e categorizada
  const handleExportReport = () => {
    if (!reportData) return

    const rows: string[][] = [
      ['Relatório Estratégico & Indicadores de Gestão - BarberShop Cloud', ''],
      ['Data de Emissão', new Date().toLocaleDateString('pt-BR') + ' ' + new Date().toLocaleTimeString('pt-BR')],
      ['Gerado por', user?.name || user?.email || 'Administrador'],
      ['', ''],
      ['--- RESUMO GERAL ---', ''],
      ['Faturamento do Mês', formatPrice(reportData.summary.monthRevenue)],
      ['Faturamento Total Histórico', formatPrice(reportData.summary.totalRevenue)],
      ['Ticket Médio', formatPrice(reportData.summary.averageTicket)],
      ['Atendimentos Concluídos', String(reportData.summary.completedAppointments)],
      ['Taxa de Conclusão', `${reportData.summary.completionRate}%`],
      ['', ''],
      ['--- GASTOS DO ESTABELECIMENTO ---', ''],
      ['Gastos no Mês Atual', formatPrice(reportData.expenses.monthAmount)],
      ['Gastos Totais Históricos', formatPrice(reportData.expenses.totalAmount)],
      ['Lucro Líquido Real no Mês', formatPrice(reportData.expenses.netProfitMonth)],
      ['Margem Líquida Real', `${reportData.expenses.netMarginMonth}%`],
      ['Contas Pendentes a Pagar', formatPrice(reportData.expenses.pendingAmount)],
      ['Capital Investido em Estoque', formatPrice(reportData.expenses.inventoryCost)],
      ['', ''],
      ['--- RANKING DE BARBEIROS (QUEM MAIS ATENDEU) ---', ''],
      ['Posição', 'Barbeiro', 'Atendimentos Concluídos', 'Faturamento Gerado (R$)', 'Ticket Médio (R$)'],
      ...reportData.barbers.ranking.map((b, idx) => [
        `#${idx + 1}`,
        b.name,
        String(b.completedCount),
        b.revenue.toFixed(2),
        b.averageTicket.toFixed(2),
      ]),
      ['', ''],
      ['--- TOP CLIENTES ---', ''],
      ['Posição', 'Cliente', 'Telefone', 'Total de Visitas', 'Total Gasto (R$)'],
      ...reportData.clients.topClients.map((c, idx) => [
        `#${idx + 1}`,
        c.name,
        c.phone,
        String(c.totalVisits),
        c.totalSpent.toFixed(2),
      ]),
      ['', ''],
      ['--- SERVIÇOS & PREÇOS ---', ''],
      ['Serviço', 'Preço Tabela (R$)', 'Atendimentos', 'Faturamento Gerado (R$)', 'Participação (%)'],
      ...reportData.services.ranking.map((s) => [
        s.name,
        s.price.toFixed(2),
        String(s.appointmentCount),
        s.totalRevenue.toFixed(2),
        `${s.sharePercent}%`,
      ]),
    ]

    const csvContent = rows
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(';'))
      .join('\n')

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute('download', `relatorio-estrategico-${new Date().toISOString().split('T')[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const summary = reportData?.summary
  const expenses = reportData?.expenses
  const barbers = reportData?.barbers
  const clients = reportData?.clients
  const services = reportData?.services
  const revenueEvolution = reportData?.revenueEvolution || []

  return (
    <div className="min-h-screen bg-background text-foreground pb-20 pt-20">
      <DropdownHeader />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Cabeçalho da Página */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="secondary" className="gap-1.5 font-semibold text-xs bg-primary/10 text-primary border-primary/20">
                <Sparkles className="w-3.5 h-3.5" />
                Business Intelligence & Analytics
              </Badge>
              <span className="text-xs text-muted-foreground">• Indicadores de Desempenho</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-3">
              <BarChart3 className="w-7 h-7 text-primary" />
              Relatórios & Métricas Estratégicas
            </h1>
            <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
              Consulte subitens analíticos de gastos, desempenho de barbeiros, fidelidade de clientes e rentabilidade de serviços.
            </p>
          </div>

          <div className="flex items-center gap-2.5 self-start md:self-auto shrink-0 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={loadData}
              disabled={loading}
              className="gap-2 text-xs h-9"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Atualizar</span>
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={handleExportReport}
              disabled={loading || !reportData}
              className="gap-2 text-xs h-9 shadow-sm"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Exportar Todos os Dados (CSV)</span>
            </Button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* NAVEGAÇÃO ENTRE SUBITENS DE RELATÓRIO (TABS SHADCN)                       */}
        {/* ========================================================================= */}
        <div className="flex border-b border-border overflow-x-auto gap-2">
          {/* Subitem 1: Visão Geral */}
          <button
            type="button"
            onClick={() => setActiveSubItem('visao_geral')}
            className={`flex items-center gap-2 py-3 px-4 text-xs sm:text-sm font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeSubItem === 'visao_geral'
                ? 'border-primary text-primary bg-primary/5 rounded-t-lg'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>Visão Geral & Faturamento</span>
          </button>

          {/* Subitem 2: Gastos do Estabelecimento */}
          <button
            type="button"
            onClick={() => setActiveSubItem('gastos')}
            className={`flex items-center gap-2 py-3 px-4 text-xs sm:text-sm font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeSubItem === 'gastos'
                ? 'border-primary text-primary bg-primary/5 rounded-t-lg'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
            }`}
          >
            <TrendingDown className="w-4 h-4 text-destructive" />
            <span>Gastos do Estabelecimento</span>
            {expenses && expenses.pendingCount > 0 && (
              <Badge variant="outline" className="ml-1 text-[10px] px-1.5 py-0 text-amber-600 border-amber-500/30">
                {expenses.pendingCount} pendente(s)
              </Badge>
            )}
          </button>

          {/* Subitem 3: Barbeiros & Produtividade */}
          <button
            type="button"
            onClick={() => setActiveSubItem('barbeiros')}
            className={`flex items-center gap-2 py-3 px-4 text-xs sm:text-sm font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeSubItem === 'barbeiros'
                ? 'border-primary text-primary bg-primary/5 rounded-t-lg'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
            }`}
          >
            <Trophy className="w-4 h-4 text-amber-500" />
            <span>Barbeiros (Quem Mais Atendeu)</span>
            {barbers?.topBarber && (
              <Badge className="ml-1 text-[10px] px-1.5 py-0 bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                1º {barbers.topBarber.name.split(' ')[0]}
              </Badge>
            )}
          </button>

          {/* Subitem 4: Métricas dos Clientes */}
          <button
            type="button"
            onClick={() => setActiveSubItem('clientes')}
            className={`flex items-center gap-2 py-3 px-4 text-xs sm:text-sm font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeSubItem === 'clientes'
                ? 'border-primary text-primary bg-primary/5 rounded-t-lg'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
            }`}
          >
            <Users className="w-4 h-4 text-purple-500" />
            <span>Métricas dos Clientes</span>
            <Badge variant="secondary" className="ml-1 text-[10px] px-1.5 py-0">
              {clients?.totalClients || 0}
            </Badge>
          </button>

          {/* Subitem 5: Serviços e Preços */}
          <button
            type="button"
            onClick={() => setActiveSubItem('servicos')}
            className={`flex items-center gap-2 py-3 px-4 text-xs sm:text-sm font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeSubItem === 'servicos'
                ? 'border-primary text-primary bg-primary/5 rounded-t-lg'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
            }`}
          >
            <Scissors className="w-4 h-4 text-blue-500" />
            <span>Serviços & Preços</span>
            <Badge variant="secondary" className="ml-1 text-[10px] px-1.5 py-0">
              {services?.totalCatalogServices || 0}
            </Badge>
          </button>
        </div>

        {/* ========================================================================= */}
        {/* 1. SUBITEM: VISÃO GERAL & FATURAMENTO                                     */}
        {/* ========================================================================= */}
        {activeSubItem === 'visao_geral' && (
          <div className="space-y-8 animate-in fade-in">
            {/* 4 Cards de Métricas */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="border-border shadow-sm hover:border-border/80 transition-colors">
                <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                  <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Faturamento do Mês
                  </CardTitle>
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                    <DollarSign className="w-4 h-4" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold tracking-tight text-foreground">
                    {formatPrice(summary?.monthRevenue || 0)}
                  </div>
                  <p className="text-muted-foreground text-xs mt-1">
                    Total histórico: {formatPrice(summary?.totalRevenue || 0)}
                  </p>
                </CardContent>
              </Card>

              <Card className="border-border shadow-sm hover:border-border/80 transition-colors">
                <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                  <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Ticket Médio
                  </CardTitle>
                  <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                    <Receipt className="w-4 h-4" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold tracking-tight text-foreground">
                    {formatPrice(summary?.averageTicket || 0)}
                  </div>
                  <p className="text-muted-foreground text-xs mt-1">
                    Média por atendimento concluído
                  </p>
                </CardContent>
              </Card>

              <Card className="border-border shadow-sm hover:border-border/80 transition-colors">
                <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                  <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Taxa de Conclusão
                  </CardTitle>
                  <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold tracking-tight text-foreground">
                    {summary?.completionRate || 100}%
                  </div>
                  <p className="text-muted-foreground text-xs mt-1">
                    {summary?.completedAppointments || 0} de {summary?.totalAppointments || 0} finalizados
                  </p>
                </CardContent>
              </Card>

              <Card className="border-border shadow-sm hover:border-border/80 transition-colors">
                <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                  <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Crescimento da Base
                  </CardTitle>
                  <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                    <Users className="w-4 h-4" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold tracking-tight text-foreground">
                    +{clients?.newThisMonth || 0} novos
                  </div>
                  <p className="text-muted-foreground text-xs mt-1">
                    Base total de {clients?.totalClients || 0} clientes cadastrados
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Gráfico de Faturamento dos Últimos 7 Dias */}
            <Card className="border-border shadow-sm">
              <CardHeader className="pb-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-primary" />
                      <span>Evolução do Faturamento Recente</span>
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Valores realizados em atendimentos concluídos nos últimos 7 dias.
                    </CardDescription>
                  </div>
                  <Badge variant="outline" className="text-xs font-semibold self-start sm:self-auto">
                    Últimos 7 Dias
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-2">
                <NoSSR fallback={<div className="h-64 flex items-center justify-center text-xs text-muted-foreground">Carregando gráfico de evolução...</div>}>
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={revenueEvolution} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                        <defs>
                          <linearGradient id="reportsRevenueGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.35} />
                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                        <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
                        <YAxis
                          stroke="hsl(var(--muted-foreground))"
                          fontSize={11}
                          tickLine={false}
                          axisLine={false}
                          tickFormatter={(val) => `R$${val}`}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: 'hsl(var(--card))',
                            borderColor: 'hsl(var(--border))',
                            borderRadius: '0.75rem',
                            color: 'hsl(var(--foreground))',
                            fontSize: '12px',
                          }}
                          formatter={(value: any) => [formatPrice(Number(value) || 0), 'Faturamento']}
                        />
                        <Area
                          type="monotone"
                          dataKey="revenue"
                          stroke="#3b82f6"
                          strokeWidth={2.5}
                          fillOpacity={1}
                          fill="url(#reportsRevenueGrad)"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </NoSSR>
              </CardContent>
            </Card>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 2. SUBITEM: GASTOS DO ESTABELECIMENTO                                     */}
        {/* ========================================================================= */}
        {activeSubItem === 'gastos' && (
          <div className="space-y-6 animate-in fade-in">
            {/* 4 Cards de Métricas de Gastos */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Card 1: Gastos do Mês */}
              <Card className="border-border shadow-sm hover:border-border/80 transition-colors">
                <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                  <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Gastos do Mês
                  </CardTitle>
                  <div className="w-8 h-8 rounded-lg bg-destructive/10 text-destructive flex items-center justify-center">
                    <TrendingDown className="w-4 h-4" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold tracking-tight text-foreground">
                    {formatPrice(expenses?.monthAmount || 0)}
                  </div>
                  <p className="text-muted-foreground text-xs mt-1">
                    Histórico total: {formatPrice(expenses?.totalAmount || 0)}
                  </p>
                </CardContent>
              </Card>

              {/* Card 2: Lucro Líquido Real */}
              <Card className="border-border shadow-sm hover:border-border/80 transition-colors">
                <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                  <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Lucro Líquido Real
                  </CardTitle>
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                    <DollarSign className="w-4 h-4" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className={`text-2xl font-bold tracking-tight ${
                    (expenses?.netProfitMonth || 0) >= 0
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-destructive'
                  }`}>
                    {formatPrice(expenses?.netProfitMonth || 0)}
                  </div>
                  <p className="text-muted-foreground text-xs mt-1">
                    Faturamento ({formatPrice(summary?.monthRevenue || 0)}) - Gastos
                  </p>
                </CardContent>
              </Card>

              {/* Card 3: Margem Líquida */}
              <Card className="border-border shadow-sm hover:border-border/80 transition-colors">
                <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                  <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Margem Líquida (%)
                  </CardTitle>
                  <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                    <Activity className="w-4 h-4" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold tracking-tight text-foreground">
                    {expenses?.netMarginMonth || 0}%
                  </div>
                  <p className="text-muted-foreground text-xs mt-1">
                    Rentabilidade real sobre as receitas do mês
                  </p>
                </CardContent>
              </Card>

              {/* Card 4: Contas Pendentes */}
              <Card className="border-border shadow-sm hover:border-border/80 transition-colors">
                <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                  <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Contas Pendentes
                  </CardTitle>
                  <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                    <Clock className="w-4 h-4" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold tracking-tight text-amber-600 dark:text-amber-400">
                    {formatPrice(expenses?.pendingAmount || 0)}
                  </div>
                  <p className="text-muted-foreground text-xs mt-1">
                    {expenses?.pendingCount || 0} conta(s) a pagar em aberto
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Linha Dupla: Distribuição de Gastos por Categoria + Balanço Operacional */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Categorias de Gastos (col-span-7) */}
              <Card className="lg:col-span-7 border-border shadow-sm p-6 space-y-4">
                <div>
                  <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                    <Receipt className="w-4 h-4 text-primary" />
                    <span>Despesas por Categoria</span>
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Onde o estabelecimento mais investe seus recursos financeiros.
                  </p>
                </div>

                {expenses && expenses.byCategory.length > 0 ? (
                  <div className="space-y-3 pt-2">
                    {expenses.byCategory.map((cat, idx) => (
                      <div key={idx} className="space-y-1">
                        <div className="flex items-center justify-between text-xs font-medium">
                          <span className="text-foreground">{cat.label}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground">({cat.percent}%)</span>
                            <span className="font-bold text-foreground">{formatPrice(cat.amount)}</span>
                          </div>
                        </div>
                        <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                          <div
                            className="bg-primary h-2 rounded-full transition-all duration-500"
                            style={{ width: `${Math.min(100, cat.percent)}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-xs text-muted-foreground">
                    Nenhum gasto registrado até o momento. Cadastre contas em &quot;Gastos do Estabelecimento&quot;.
                  </div>
                )}
              </Card>

              {/* Balanço e Patrimônio (col-span-5) */}
              <Card className="lg:col-span-5 border-border shadow-sm p-6 space-y-4 flex flex-col justify-between">
                <div>
                  <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-emerald-500" />
                    <span>Demonstrativo Operacional do Mês</span>
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Resultado contábil simplificado da unidade.
                  </p>
                </div>

                <div className="space-y-3 text-xs divide-y divide-border/60">
                  <div className="flex items-center justify-between pt-2">
                    <span className="text-muted-foreground">(+) Faturamento de Serviços:</span>
                    <strong className="text-emerald-600 dark:text-emerald-400 font-bold">
                      {formatPrice(summary?.monthRevenue || 0)}
                    </strong>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <span className="text-muted-foreground">(-) Despesas do Mês:</span>
                    <strong className="text-destructive font-bold">
                      {formatPrice(expenses?.monthAmount || 0)}
                    </strong>
                  </div>

                  <div className="flex items-center justify-between pt-2 bg-muted/20 p-2 rounded-lg">
                    <span className="font-bold text-foreground">(=) Lucro Líquido Apurado:</span>
                    <strong className={`font-extrabold text-sm ${
                      (expenses?.netProfitMonth || 0) >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-destructive'
                    }`}>
                      {formatPrice(expenses?.netProfitMonth || 0)}
                    </strong>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <span className="text-muted-foreground">Capital em Estoque / Insumos:</span>
                    <strong className="text-foreground">
                      {formatPrice(expenses?.inventoryCost || 0)}
                    </strong>
                  </div>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.push('/dashboard/gastos')}
                  className="w-full text-xs gap-1.5 mt-2"
                >
                  <TrendingDown className="w-3.5 h-3.5" />
                  <span>Acessar Módulo de Gastos & Estoque</span>
                </Button>
              </Card>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 3. SUBITEM: BARBEIROS (QUEM MAIS ATENDEU)                                 */}
        {/* ========================================================================= */}
        {activeSubItem === 'barbeiros' && (
          <div className="space-y-6 animate-in fade-in">
            {/* Card Dourado de Destaque: Barbeiro que Mais Atendeu */}
            {barbers?.topBarber && (
              <Card className="border-amber-500/40 bg-gradient-to-r from-amber-500/10 via-background to-amber-500/5 shadow-md">
                <CardContent className="p-6">
                  <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-2xl bg-amber-500/20 text-amber-500 border border-amber-500/40 flex items-center justify-center shrink-0 shadow-sm">
                        <Trophy className="w-7 h-7" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <Badge className="bg-amber-500 text-black font-extrabold text-[10px] uppercase tracking-wider">
                            Top 1 • Campeão de Atendimentos
                          </Badge>
                          <span className="text-xs text-muted-foreground">Profissional Destaque</span>
                        </div>
                        <h2 className="text-xl sm:text-2xl font-black text-foreground mt-1">
                          {barbers.topBarber.name}
                        </h2>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Líder da equipe com o maior volume de atendimentos concluídos na barbearia.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-6 self-stretch md:self-auto justify-around bg-background/80 p-3 rounded-xl border border-amber-500/30">
                      <div className="text-center">
                        <div className="text-xs text-muted-foreground">Atendimentos</div>
                        <div className="text-xl font-extrabold text-foreground">
                          {barbers.topBarber.completedCount}
                        </div>
                      </div>
                      <div className="h-8 w-px bg-border" />
                      <div className="text-center">
                        <div className="text-xs text-muted-foreground">Faturamento</div>
                        <div className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400">
                          {formatPrice(barbers.topBarber.revenue)}
                        </div>
                      </div>
                      <div className="h-8 w-px bg-border" />
                      <div className="text-center">
                        <div className="text-xs text-muted-foreground">Ticket Médio</div>
                        <div className="text-xl font-extrabold text-primary">
                          {formatPrice(barbers.topBarber.averageTicket)}
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Ranking Completo de Todos os Barbeiros */}
            <Card className="border-border shadow-sm p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                    <Award className="w-4 h-4 text-primary" />
                    <span>Ranking Completo de Produtividade dos Barbeiros</span>
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Classificação ordenada pelo número total de clientes e serviços atendidos.
                  </p>
                </div>
                <Badge variant="outline" className="text-xs font-semibold">
                  {barbers?.totalBarbers || 0} profissionais
                </Badge>
              </div>

              <div className="border border-border rounded-xl overflow-hidden">
                {barbers && barbers.ranking.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs w-16 text-center">Posição</TableHead>
                        <TableHead className="text-xs">Profissional / Barbeiro</TableHead>
                        <TableHead className="text-xs text-center">Atendimentos Concluídos</TableHead>
                        <TableHead className="text-xs text-center">Taxa de Conclusão</TableHead>
                        <TableHead className="text-xs text-right">Faturamento Gerado</TableHead>
                        <TableHead className="text-xs text-right">Ticket Médio</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {barbers.ranking.map((barber, index) => {
                        const isTop1 = index === 0 && barber.completedCount > 0
                        const isTop2 = index === 1 && barber.completedCount > 0
                        const isTop3 = index === 2 && barber.completedCount > 0

                        return (
                          <TableRow key={barber.id} className={isTop1 ? 'bg-amber-500/5' : ''}>
                            <TableCell className="py-3 text-center">
                              {isTop1 ? (
                                <Badge className="bg-amber-500 text-black font-extrabold text-xs px-2 py-0.5">
                                  1º 🥇
                                </Badge>
                              ) : isTop2 ? (
                                <Badge className="bg-slate-300 text-slate-900 font-bold text-xs px-2 py-0.5">
                                  2º 🥈
                                </Badge>
                              ) : isTop3 ? (
                                <Badge className="bg-amber-700 text-white font-bold text-xs px-2 py-0.5">
                                  3º 🥉
                                </Badge>
                              ) : (
                                <span className="text-xs font-semibold text-muted-foreground">
                                  #{index + 1}
                                </span>
                              )}
                            </TableCell>

                            <TableCell className="py-3">
                              <div className="font-bold text-xs text-foreground flex items-center gap-2">
                                <span>{barber.name}</span>
                                {isTop1 && (
                                  <Badge variant="outline" className="text-[9px] border-amber-500 text-amber-600 dark:text-amber-400 py-0 px-1">
                                    Mais Atendeu
                                  </Badge>
                                )}
                              </div>
                              <div className="text-[11px] text-muted-foreground">{barber.email}</div>
                            </TableCell>

                            <TableCell className="py-3 text-center font-bold text-xs text-foreground">
                              {barber.completedCount}
                              <span className="text-[10px] text-muted-foreground font-normal ml-1">
                                de {barber.totalCount}
                              </span>
                            </TableCell>

                            <TableCell className="py-3 text-center">
                              <Badge
                                variant="outline"
                                className={`text-[10px] font-semibold ${
                                  barber.completionRate >= 80
                                    ? 'text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                                    : 'text-muted-foreground'
                                }`}
                              >
                                {barber.completionRate}%
                              </Badge>
                            </TableCell>

                            <TableCell className="py-3 text-right font-extrabold text-xs text-emerald-600 dark:text-emerald-400">
                              {formatPrice(barber.revenue)}
                            </TableCell>

                            <TableCell className="py-3 text-right font-medium text-xs text-foreground">
                              {formatPrice(barber.averageTicket)}
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-12 text-xs text-muted-foreground">
                    Nenhum profissional com atendimentos registrados.
                  </div>
                )}
              </div>
            </Card>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 4. SUBITEM: MÉTRICAS DOS CLIENTES                                         */}
        {/* ========================================================================= */}
        {activeSubItem === 'clientes' && (
          <div className="space-y-6 animate-in fade-in">
            {/* 4 Cards de Métricas de Clientes */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="border-border shadow-sm hover:border-border/80 transition-colors">
                <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                  <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Total de Clientes
                  </CardTitle>
                  <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                    <Users className="w-4 h-4" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold tracking-tight text-foreground">
                    {clients?.totalClients || 0}
                  </div>
                  <p className="text-muted-foreground text-xs mt-1">
                    Cadastrados na base do estabelecimento
                  </p>
                </CardContent>
              </Card>

              <Card className="border-border shadow-sm hover:border-border/80 transition-colors">
                <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                  <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Novos neste Mês
                  </CardTitle>
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                    <Sparkles className="w-4 h-4" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
                    +{clients?.newThisMonth || 0}
                  </div>
                  <p className="text-muted-foreground text-xs mt-1">
                    Aquisição de novos clientes no período
                  </p>
                </CardContent>
              </Card>

              <Card className="border-border shadow-sm hover:border-border/80 transition-colors">
                <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                  <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Taxa de Retenção
                  </CardTitle>
                  <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                    <Activity className="w-4 h-4" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold tracking-tight text-foreground">
                    {clients?.retentionRate || 0}%
                  </div>
                  <p className="text-muted-foreground text-xs mt-1">
                    {clients?.activeClientsCount || 0} clientes ativos nos últimos 60 dias
                  </p>
                </CardContent>
              </Card>

              <Card className="border-border shadow-sm hover:border-border/80 transition-colors">
                <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                  <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Gasto Médio por Cliente
                  </CardTitle>
                  <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                    <DollarSign className="w-4 h-4" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold tracking-tight text-foreground">
                    {formatPrice(clients?.averageSpendPerClient || 0)}
                  </div>
                  <p className="text-muted-foreground text-xs mt-1">
                    Valor total acumulado por cliente cadastrado
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Tabela dos Top Clientes VIP / Mais Fieis */}
            <Card className="border-border shadow-sm p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                    <Star className="w-4 h-4 text-amber-500" />
                    <span>Clientes Mais Frequentes & VIP (Fidelidade)</span>
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Clientes que mais realizaram visitas e mais geraram faturamento para a barbearia.
                  </p>
                </div>
                <Badge variant="outline" className="text-xs font-semibold">
                  Top 15 Clientes
                </Badge>
              </div>

              <div className="border border-border rounded-xl overflow-hidden">
                {clients && clients.topClients.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs w-16 text-center">Posição</TableHead>
                        <TableHead className="text-xs">Cliente</TableHead>
                        <TableHead className="text-xs">Telefone / WhatsApp</TableHead>
                        <TableHead className="text-xs text-center">Total de Visitas</TableHead>
                        <TableHead className="text-xs text-right">Total Gasto Acumulado</TableHead>
                        <TableHead className="text-xs text-center">Último Atendimento</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {clients.topClients.map((client, index) => (
                        <TableRow key={client.id}>
                          <TableCell className="py-3 text-center">
                            {index === 0 ? (
                              <Badge className="bg-amber-500 text-black font-extrabold text-xs px-2 py-0.5">
                                1º 👑
                              </Badge>
                            ) : index === 1 ? (
                              <Badge className="bg-slate-300 text-slate-900 font-bold text-xs px-2 py-0.5">
                                2º
                              </Badge>
                            ) : index === 2 ? (
                              <Badge className="bg-amber-700 text-white font-bold text-xs px-2 py-0.5">
                                3º
                              </Badge>
                            ) : (
                              <span className="text-xs font-semibold text-muted-foreground">
                                #{index + 1}
                              </span>
                            )}
                          </TableCell>

                          <TableCell className="py-3">
                            <div className="font-bold text-xs text-foreground">{client.name}</div>
                            {client.email && (
                              <div className="text-[11px] text-muted-foreground">{client.email}</div>
                            )}
                          </TableCell>

                          <TableCell className="py-3 text-xs text-muted-foreground">
                            {client.phone || '-'}
                          </TableCell>

                          <TableCell className="py-3 text-center font-bold text-xs text-foreground">
                            <Badge variant="secondary" className="font-bold text-xs px-2 py-0.5">
                              {client.totalVisits} visitas
                            </Badge>
                          </TableCell>

                          <TableCell className="py-3 text-right font-extrabold text-xs text-emerald-600 dark:text-emerald-400">
                            {formatPrice(client.totalSpent)}
                          </TableCell>

                          <TableCell className="py-3 text-center text-xs text-muted-foreground">
                            {client.lastVisitDate
                              ? new Date(client.lastVisitDate).toLocaleDateString('pt-BR')
                              : '-'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-12 text-xs text-muted-foreground">
                    Nenhum atendimento finalizado registrado para compor a lista de clientes VIP.
                  </div>
                )}
              </div>
            </Card>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 5. SUBITEM: SERVIÇOS & PREÇOS                                             */}
        {/* ========================================================================= */}
        {activeSubItem === 'servicos' && (
          <div className="space-y-6 animate-in fade-in">
            {/* 4 Cards de Métricas de Serviços */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="border-border shadow-sm hover:border-border/80 transition-colors">
                <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                  <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Serviço Mais Procurado
                  </CardTitle>
                  <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                    <Scissors className="w-4 h-4" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-lg font-bold tracking-tight text-foreground truncate">
                    {services?.topService?.name || 'N/A'}
                  </div>
                  <p className="text-muted-foreground text-xs mt-1">
                    {services?.topService?.appointmentCount || 0} agendamentos realizados
                  </p>
                </CardContent>
              </Card>

              <Card className="border-border shadow-sm hover:border-border/80 transition-colors">
                <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                  <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Maior Faturamento
                  </CardTitle>
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                    <DollarSign className="w-4 h-4" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-lg font-bold tracking-tight text-emerald-600 dark:text-emerald-400 truncate">
                    {services?.highestRevenueService?.name || 'N/A'}
                  </div>
                  <p className="text-muted-foreground text-xs mt-1">
                    Gerou {formatPrice(services?.highestRevenueService?.totalRevenue || 0)}
                  </p>
                </CardContent>
              </Card>

              <Card className="border-border shadow-sm hover:border-border/80 transition-colors">
                <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                  <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Preço Médio do Catálogo
                  </CardTitle>
                  <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                    <Receipt className="w-4 h-4" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold tracking-tight text-foreground">
                    {formatPrice(services?.averageServicePrice || 0)}
                  </div>
                  <p className="text-muted-foreground text-xs mt-1">
                    Valor médio dos serviços cadastrados
                  </p>
                </CardContent>
              </Card>

              <Card className="border-border shadow-sm hover:border-border/80 transition-colors">
                <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                  <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Total no Catálogo
                  </CardTitle>
                  <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                    <Layers className="w-4 h-4" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold tracking-tight text-foreground">
                    {services?.totalCatalogServices || 0}
                  </div>
                  <p className="text-muted-foreground text-xs mt-1">
                    Serviços ativos no cardápio de atendimento
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Tabela de Ranking de Serviços e Preços */}
            <Card className="border-border shadow-sm p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                    <Scissors className="w-4 h-4 text-primary" />
                    <span>Desempenho de Serviços & Participação de Receita</span>
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Preços de tabela, volume de agendamentos e faturamento acumulado por tipo de serviço.
                  </p>
                </div>
                <Badge variant="outline" className="text-xs font-semibold">
                  {services?.ranking.length || 0} itens
                </Badge>
              </div>

              <div className="border border-border rounded-xl overflow-hidden">
                {services && services.ranking.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">Serviço</TableHead>
                        <TableHead className="text-xs text-right">Preço de Tabela</TableHead>
                        <TableHead className="text-xs text-center">Duração Média</TableHead>
                        <TableHead className="text-xs text-center">Total Realizado</TableHead>
                        <TableHead className="text-xs text-right">Faturamento Total</TableHead>
                        <TableHead className="text-xs text-center w-48">Participação na Receita</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {services.ranking.map((service, index) => (
                        <TableRow key={service.id}>
                          <TableCell className="py-3">
                            <div className="font-bold text-xs text-foreground flex items-center gap-2">
                              <span>{service.name}</span>
                              {index === 0 && service.appointmentCount > 0 && (
                                <Badge className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 text-[9px] py-0 px-1">
                                  Mais Pedido
                                </Badge>
                              )}
                            </div>
                          </TableCell>

                          <TableCell className="py-3 text-right font-semibold text-xs text-foreground">
                            {formatPrice(service.price)}
                          </TableCell>

                          <TableCell className="py-3 text-center text-xs text-muted-foreground">
                            {service.duration} min
                          </TableCell>

                          <TableCell className="py-3 text-center font-bold text-xs text-foreground">
                            {service.appointmentCount} atendimentos
                          </TableCell>

                          <TableCell className="py-3 text-right font-extrabold text-xs text-emerald-600 dark:text-emerald-400">
                            {formatPrice(service.totalRevenue)}
                          </TableCell>

                          <TableCell className="py-3 text-center">
                            <div className="flex items-center gap-2">
                              <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                                <div
                                  className="bg-primary h-2 rounded-full transition-all duration-500"
                                  style={{ width: `${Math.min(100, service.sharePercent)}%` }}
                                />
                              </div>
                              <span className="text-[11px] font-semibold text-muted-foreground w-10 text-right">
                                {service.sharePercent}%
                              </span>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-12 text-xs text-muted-foreground">
                    Nenhum serviço cadastrado no catálogo.
                  </div>
                )}
              </div>
            </Card>
          </div>
        )}
      </main>
    </div>
  )
}
