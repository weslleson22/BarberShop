'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/lib/auth-context'
import { getAuthHeaders } from '@/lib/utils'
import DropdownHeader from '@/components/shared/DropdownHeader'
import TenantFeedbackModal from '@/components/feedback/TenantFeedbackModal'
import {
  Users,
  Clock,
  Calendar,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  ExternalLink,
  Copy,
  ChevronRight,
  TrendingUp,
  Star,
  RefreshCw,
  Smartphone,
  PhoneCall,
  CheckSquare,
  Building2,
  ArrowRight,
  MessageSquare,
  ChevronDown,
  Scissors,
  Check,
  X,
  Play,
  CheckCheck,
  Search,
} from 'lucide-react'
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card'
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

interface OnboardingStep {
  id: string
  number: number
  title: string
  description: string
  completed: boolean
  isAutomated: boolean
  category: string
}

interface TenantItem {
  id: string
  name: string
  slug: string | null
  email: string
  phone: string | null
  address: string | null
  isActive: boolean
  createdAt: string
  trial: {
    isTrial: boolean
    trialStart: string | null
    trialEnd: string | null
    daysRemaining: number
    planName: string
    status: string
  }
  lifecycleStatus: 'LEAD' | 'PENDING' | 'TRIAL' | 'ACTIVE' | 'PAST_DUE' | 'SUSPENDED' | 'CANCELED'
  lastAccess: string
  lastActivity: string
  usersCount: number
  clientsCount: number
  servicesCount: number
  appointmentsCount: number
  isActivated: boolean
  firstAppointmentAt: string | null
  timeToFirstAppointmentHours: number | null
  onboardingSteps: OnboardingStep[]
  completionPercentage: number
}

interface FunnelMetrics {
  countsByStatus: Record<string, number>
  totalTenants: number
  totalActivated: number
  activationRate: number
  avgTimeToFirstAppointmentHours: number | null
  medianTimeToFirstAppointmentHours: number | null
  totalAppointments: number
  activeWeeklyTenants: number
  feedbackStats: {
    totalFeedbacks: number
    avgEaseScore: number
    avgSatisfactionScore: number
    continueIntentRatio: {
      yes: number
      no: number
      maybe: number
    }
  }
}

export default function DeveloperOnboardingCockpitPage() {
  const { user, loading } = useAuth()
  const router = useRouter()

  const [tenants, setTenants] = useState<TenantItem[]>([])
  const [metrics, setMetrics] = useState<FunnelMetrics | null>(null)
  const [feedbacks, setFeedbacks] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Checklist Modal para a Sessão Assistida (15-30m)
  const [activeChecklistTenant, setActiveChecklistTenant] = useState<TenantItem | null>(null)
  const [manualStepOverrides, setManualStepOverrides] = useState<Record<string, Record<string, boolean>>>({})
  const [modalFilter, setModalFilter] = useState<'ALL' | 'PENDING' | 'DONE'>('ALL')

  // Feedback Modal
  const [feedbackTenant, setFeedbackTenant] = useState<TenantItem | null>(null)
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false)

  // Filtro de Status e Busca
  const [statusFilter, setStatusFilter] = useState<string>('ALL')
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    if (!loading) {
      if (!user || user.role !== 'DEVELOPER') {
        router.push('/dashboard')
        return
      }
      loadData()
    }
  }, [user, loading, router])

  const loadData = async () => {
    setIsLoading(true)
    try {
      const res = await fetch('/api/developer/onboarding', {
        headers: getAuthHeaders(),
        credentials: 'include',
      })
      if (!res.ok) {
        throw new Error('Falha ao carregar dados operacionais de onboarding')
      }
      const data = await res.json()
      setTenants(data.tenants || [])
      setMetrics(data.funnelMetrics || null)
      setFeedbacks(data.feedbacks || [])
    } catch (err: any) {
      console.error(err)
      setMessage({ type: 'error', text: err?.message || 'Erro ao carregar dados' })
    } finally {
      setIsLoading(false)
    }
  }

  const handleCopyUrl = (slug: string, id: string) => {
    const origin = typeof window !== 'undefined' ? window.location.origin : ''
    navigator.clipboard.writeText(`${origin}/b/${slug}`)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2500)
  }

  const handleStatusChange = async (tenantId: string, newStatus: string) => {
    setActionLoadingId(tenantId)
    try {
      const res = await fetch('/api/developer/barbershops', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify({
          id: tenantId,
          status: newStatus,
        }),
      })

      if (!res.ok) throw new Error('Erro ao atualizar status da barbearia')
      setMessage({ type: 'success', text: `Status atualizado para ${newStatus}` })
      await loadData()
    } catch (err: any) {
      setMessage({ type: 'error', text: err?.message || 'Falha ao atualizar status' })
    } finally {
      setActionLoadingId(null)
    }
  }

  const toggleManualStep = (tenantId: string, stepId: string) => {
    setManualStepOverrides((prev) => {
      const tenantSteps = prev[tenantId] || {}
      return {
        ...prev,
        [tenantId]: {
          ...tenantSteps,
          [stepId]: !tenantSteps[stepId],
        },
      }
    })
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'LEAD':
        return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20'
      case 'PENDING':
        return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
      case 'TRIAL':
        return 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20'
      case 'ACTIVE':
        return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
      case 'PAST_DUE':
        return 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20'
      case 'SUSPENDED':
        return 'bg-muted text-muted-foreground border border-border'
      case 'CANCELED':
        return 'bg-destructive/10 text-destructive border border-destructive/20'
      default:
        return 'bg-muted text-muted-foreground border border-border'
    }
  }

  const filteredTenants = tenants.filter((t) => {
    const matchesStatus = statusFilter === 'ALL' || t.lifecycleStatus === statusFilter
    const q = searchQuery.toLowerCase().trim()
    const matchesSearch =
      !q ||
      t.name.toLowerCase().includes(q) ||
      t.email.toLowerCase().includes(q) ||
      (t.slug && t.slug.toLowerCase().includes(q)) ||
      (t.phone && t.phone.includes(q))
    return matchesStatus && matchesSearch
  })

  return (
    <div className="min-h-screen bg-background text-foreground pb-20 pt-20">
      <DropdownHeader />
      <main className="w-full px-4 md:px-8 max-w-7xl mx-auto space-y-8">
        {/* Top Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-6">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
              <Link href="/developer" className="hover:underline text-primary font-medium">
                Developer Hub
              </Link>
              <span className="text-border">/</span>
              <span>Customer Success & Operations</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-foreground">
              Cockpit de Onboarding
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/developer"
              className="px-4 py-2 text-xs font-medium text-foreground bg-card border border-border hover:bg-accent rounded-lg transition shadow-sm"
            >
              Voltar ao Developer Hub
            </Link>
            <button
              onClick={loadData}
              disabled={isLoading}
              className="flex items-center gap-2 px-4 py-2 text-xs font-medium bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg transition border border-transparent cursor-pointer shadow-sm"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              Atualizar Dados
            </button>
          </div>
        </div>

        {message && (
          <div
            className={`p-4 rounded-lg border flex items-center justify-between ${
              message.type === 'success'
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300'
                : 'bg-destructive/10 border-destructive/30 text-destructive'
            }`}
          >
            <div className="flex items-center gap-2 text-sm font-medium">
              {message.type === 'success' ? <CheckCircle2 className="w-5 h-5 stroke-[2.5]" /> : <AlertCircle className="w-5 h-5 stroke-[2.5]" />}
              <span>{message.text}</span>
            </div>
            <button onClick={() => setMessage(null)} className="text-xs font-medium hover:underline cursor-pointer">
              Fechar
            </button>
          </div>
        )}

        {/* Visual Funnel Bar */}
        <Card className="bg-card border-border rounded-xl p-6 shadow-sm text-card-foreground space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="p-2 rounded-lg bg-primary/10 text-primary border border-primary/20 shadow-sm">
                <TrendingUp className="w-5 h-5 stroke-[2.5]" />
              </span>
              <div>
                <CardTitle className="text-base font-semibold text-foreground">
                  Funil de Adoção
                </CardTitle>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-normal text-muted-foreground bg-muted/50 px-3 py-1 rounded-lg border border-border">
                Total: <strong className="text-foreground font-semibold">{metrics?.totalTenants ?? 0} Barbearias</strong>
              </span>
              <span className="text-xs font-normal text-muted-foreground bg-muted/50 px-3 py-1 rounded-lg border border-border">
                Ativação: <strong className="text-foreground font-semibold">{metrics?.activationRate ?? 0}%</strong>
              </span>
              <span className="text-xs font-normal text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-lg border border-emerald-500/20">
                Convertidas: <strong className="font-semibold">{metrics?.countsByStatus.ACTIVE ?? 0}</strong>
              </span>
            </div>
          </div>

          {(() => {
            const totalTenantsCount = metrics?.totalTenants || tenants.length || 1
            const stages = [
              {
                id: 'LEAD',
                filterKey: 'LEAD',
                num: 1,
                label: 'Lead',
                desc: 'Primeiro contato',
                count: metrics?.countsByStatus.LEAD || 0,
                icon: Users,
              },
              {
                id: 'CADASTRO',
                filterKey: 'PENDING',
                num: 2,
                label: 'Cadastro',
                desc: 'Conta criada',
                count: metrics?.countsByStatus.PENDING || 0,
                icon: Building2,
              },
              {
                id: 'TRIAL',
                filterKey: 'TRIAL',
                num: 3,
                label: 'Trial 30d',
                desc: 'Período teste',
                count: metrics?.countsByStatus.TRIAL || 0,
                icon: Clock,
              },
              {
                id: 'ONBOARDING',
                filterKey: null,
                num: 4,
                label: 'Onboarding',
                desc: 'Sessão ≥ 50%',
                count: tenants.filter((t) => t.completionPercentage >= 50 && t.completionPercentage < 100).length,
                icon: CheckSquare,
              },
              {
                id: 'CONFIG',
                filterKey: null,
                num: 5,
                label: 'Configurado',
                desc: 'Serviço + equipe',
                count: tenants.filter((t) => t.servicesCount > 0 && t.usersCount > 0).length,
                icon: Scissors,
              },
              {
                id: '1ST_APPT',
                filterKey: null,
                num: 6,
                label: '1º Agend.',
                desc: 'AHA Moment',
                count: metrics?.totalActivated || 0,
                icon: CheckCircle2,
                highlight: true,
              },
              {
                id: 'ACTIVE_USE',
                filterKey: null,
                num: 7,
                label: 'Uso Ativo',
                desc: 'Atividade semanal',
                count: metrics?.activeWeeklyTenants || 0,
                icon: TrendingUp,
              },
              {
                id: 'FEEDBACK',
                filterKey: null,
                num: 8,
                label: 'Feedback',
                desc: 'CSAT coletado',
                count: metrics?.feedbackStats.totalFeedbacks || 0,
                icon: MessageSquare,
              },
              {
                id: 'CONVERSION',
                filterKey: 'ACTIVE',
                num: 9,
                label: 'Conversão',
                desc: 'Assinatura paga',
                count: metrics?.countsByStatus.ACTIVE || 0,
                icon: Star,
              },
            ]

            return (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-9 gap-2.5">
                {stages.map((stage) => {
                  const Icon = stage.icon
                  const pct = totalTenantsCount > 0 ? Math.min(100, Math.round((stage.count / totalTenantsCount) * 100)) : 0
                  const isSelected = stage.filterKey && statusFilter === stage.filterKey

                  return (
                    <div
                      key={stage.id}
                      onClick={() => {
                        if (stage.filterKey) {
                          setStatusFilter(statusFilter === stage.filterKey ? 'ALL' : stage.filterKey)
                        }
                      }}
                      className={`group relative p-3 rounded-lg border bg-card flex flex-col justify-between transition-all duration-150 select-none ${
                        stage.filterKey ? 'cursor-pointer hover:bg-muted/50 hover:border-border' : 'cursor-default'
                      } ${
                        stage.highlight
                          ? 'border-emerald-500/40 bg-emerald-500/5 dark:bg-emerald-500/10'
                          : 'border-border'
                      } ${
                        isSelected
                          ? 'ring-2 ring-primary border-primary bg-primary/5 shadow-sm'
                          : ''
                      }`}
                      title={stage.filterKey ? `Clique para filtrar por ${stage.label}` : undefined}
                    >
                      {/* Header do Card com Ícone e Número */}
                      <div>
                        <div className="flex items-center justify-between gap-1 mb-2">
                          <span className="w-6 h-6 rounded-md bg-muted text-foreground flex items-center justify-center shrink-0 border border-border">
                            <Icon className="w-3.5 h-3.5" />
                          </span>
                          <span className="text-[10px] font-mono text-muted-foreground bg-muted/60 px-1.5 py-0.5 rounded border border-border">
                            #{stage.num}
                          </span>
                        </div>

                        <span className="text-xl font-bold text-foreground block tracking-tight group-hover:scale-105 transition-transform duration-150">
                          {stage.count}
                        </span>

                        <span className="text-xs font-medium text-foreground block mt-1 truncate">
                          {stage.label}
                        </span>

                        <span className="text-[10px] text-muted-foreground font-normal block truncate mt-0.5">
                          {stage.desc}
                        </span>
                      </div>

                      {/* Barra de Participação no Funil */}
                      <div className="mt-3 pt-2 border-t border-border">
                        <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              stage.highlight ? 'bg-emerald-500' : 'bg-primary'
                            }`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <div className="flex items-center justify-between text-[10px] text-muted-foreground mt-1 font-mono">
                          <span>Fase {stage.num}</span>
                          <span>{pct}%</span>
                        </div>
                      </div>

                      {stage.highlight && (
                        <span className="absolute -top-2 right-2 text-[9px] font-semibold uppercase tracking-wider bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-1.5 py-0.5 rounded-full border border-emerald-500/30 shadow-sm">
                          Aha Moment
                        </span>
                      )}
                    </div>
                  )
                })}
              </div>
            )
          })()}
        </Card>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Time to First Appointment */}
          <Card className="bg-card border-border rounded-xl p-5 shadow-sm relative overflow-hidden text-card-foreground transition-shadow hover:shadow-md">
            <div className="flex items-center justify-between text-muted-foreground text-xs font-medium uppercase tracking-wider">
              <span>Time to 1st Appointment</span>
              <span className="p-1.5 rounded-lg bg-muted text-foreground border border-border shadow-sm"><Clock className="w-4 h-4 stroke-[2]" /></span>
            </div>
            <div className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground mt-2">
              {metrics?.avgTimeToFirstAppointmentHours !== null && metrics?.avgTimeToFirstAppointmentHours !== undefined
                ? `${metrics.avgTimeToFirstAppointmentHours}h`
                : '—'}
            </div>
            <p className="text-xs text-muted-foreground font-normal mt-1">
              Meta: &lt; 24h pós-onboarding
            </p>
            <div className="text-xs text-muted-foreground font-normal mt-2">
              Mediana: {metrics?.medianTimeToFirstAppointmentHours ?? '—'}h
            </div>
          </Card>

          {/* Taxa de Ativação */}
          <Card className="bg-card border-border rounded-xl p-5 shadow-sm relative overflow-hidden text-card-foreground transition-shadow hover:shadow-md">
            <div className="flex items-center justify-between text-muted-foreground text-xs font-medium uppercase tracking-wider">
              <span>Taxa de Ativação</span>
              <span className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shadow-sm"><CheckCircle2 className="w-4 h-4 stroke-[2]" /></span>
            </div>
            <div className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground mt-2">
              {metrics?.activationRate ?? 0}%
            </div>
            <p className="text-xs text-muted-foreground font-normal mt-1">
              {metrics?.totalActivated ?? 0} de {metrics?.totalTenants ?? 0} barbearias ativadas
            </p>
            <div className="w-full bg-muted border border-border h-2 rounded-full mt-3 overflow-hidden">
              <div
                className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, metrics?.activationRate ?? 0)}%` }}
              />
            </div>
          </Card>

          {/* Uso Semanal & Volume */}
          <Card className="bg-card border-border rounded-xl p-5 shadow-sm relative overflow-hidden text-card-foreground transition-shadow hover:shadow-md">
            <div className="flex items-center justify-between text-muted-foreground text-xs font-medium uppercase tracking-wider">
              <span>Volume de Agendamentos</span>
              <span className="p-1.5 rounded-lg bg-muted text-foreground border border-border shadow-sm"><Calendar className="w-4 h-4 stroke-[2]" /></span>
            </div>
            <div className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground mt-2">
              {metrics?.totalAppointments ?? 0}
            </div>
            <p className="text-xs text-muted-foreground font-normal mt-1">
              {metrics?.activeWeeklyTenants ?? 0} barbearias ativas nesta semana
            </p>
            <div className="text-xs text-muted-foreground font-normal mt-2">
              Indicador crítico de engajamento diário
            </div>
          </Card>

          {/* Feedback & CSAT */}
          <Card className="bg-card border-border rounded-xl p-5 shadow-sm relative overflow-hidden text-card-foreground transition-shadow hover:shadow-md">
            <div className="flex items-center justify-between text-muted-foreground text-xs font-medium uppercase tracking-wider">
              <span>CSAT & Facilidade</span>
              <span className="p-1.5 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 shadow-sm"><Star className="w-4 h-4 fill-amber-500 stroke-amber-500" /></span>
            </div>
            <div className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground mt-2 flex items-center gap-2">
              <span>{metrics?.feedbackStats.avgSatisfactionScore || '—'}/5</span>
              <span className="text-xs font-normal text-muted-foreground">
                ({metrics?.feedbackStats.totalFeedbacks ?? 0} avaliações)
              </span>
            </div>
            <p className="text-xs text-muted-foreground font-normal mt-1">
              Facilidade: {metrics?.feedbackStats.avgEaseScore || '—'}/5
            </p>
            <div className="text-xs text-muted-foreground font-normal mt-2">
              {metrics?.feedbackStats.continueIntentRatio.yes ?? 0} clientes pretendem continuar
            </div>
          </Card>
        </div>

        {/* Tabela Operacional dos Clientes Piloto */}
        <Card className="bg-card border-border rounded-xl p-6 shadow-sm space-y-5 text-card-foreground">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2.5">
                <span className="p-2 rounded-lg bg-primary/10 text-primary border border-primary/20 shadow-sm">
                  <Building2 className="w-5 h-5 stroke-[2]" />
                </span>
                <div>
                  <CardTitle className="text-lg font-semibold text-foreground flex items-center gap-2">
                    <span>Gestão dos Clientes</span>
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border">
                      {filteredTenants.length} de {tenants.length} barbearias
                    </span>
                  </CardTitle>
                </div>
              </div>
            </div>

            {/* Barra de Busca Rápida */}
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Buscar por barbearia, e-mail, slug..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-background border border-input rounded-lg pl-9 pr-7 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring transition-all"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground text-xs"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Filtros em Pílulas Sólidas com Contadores */}
          <div className="flex items-center gap-2 flex-wrap pt-2 border-t border-border">
            <span className="text-xs text-muted-foreground font-normal mr-1">Filtrar por Status:</span>
            {[
              { id: 'ALL', label: 'Todos', count: tenants.length },
              { id: 'TRIAL', label: 'Trial 30d', count: tenants.filter((t) => t.lifecycleStatus === 'TRIAL').length },
              { id: 'PENDING', label: 'Pendentes', count: tenants.filter((t) => t.lifecycleStatus === 'PENDING').length },
              { id: 'ACTIVE', label: 'Ativos', count: tenants.filter((t) => t.lifecycleStatus === 'ACTIVE').length },
              { id: 'PAST_DUE', label: 'Atrasados', count: tenants.filter((t) => t.lifecycleStatus === 'PAST_DUE').length },
              { id: 'SUSPENDED', label: 'Suspensos', count: tenants.filter((t) => t.lifecycleStatus === 'SUSPENDED').length },
              { id: 'CANCELED', label: 'Cancelados', count: tenants.filter((t) => t.lifecycleStatus === 'CANCELED').length },
            ].map((st) => {
              const isSelected = statusFilter === st.id
              return (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => setStatusFilter(st.id)}
                  className={`h-8 px-3 text-xs font-medium rounded-lg border transition-all duration-150 cursor-pointer active:scale-95 inline-flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-primary text-primary-foreground border-transparent shadow-sm'
                      : 'bg-card text-muted-foreground border-border hover:bg-muted hover:text-foreground'
                  }`}
                >
                  <span>{st.label}</span>
                  <span
                    className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
                      isSelected ? 'bg-primary-foreground/20 text-primary-foreground' : 'bg-muted text-muted-foreground border border-border'
                    }`}
                  >
                    {st.count}
                  </span>
                </button>
              )
            })}
          </div>

          {/* Tabela Operacional */}
          <TooltipProvider delayDuration={150}>
            <div className="overflow-x-auto rounded-lg border border-border">
              <Table className="w-full text-left text-xs">
                <TableHeader className="bg-muted/50 text-muted-foreground uppercase tracking-wider text-[11px] border-b border-border">
                  <TableRow className="border-b border-border hover:bg-transparent">
                    <TableHead className="py-3 px-4 font-semibold text-muted-foreground">Barbearia & Contato</TableHead>
                    <TableHead className="py-3 px-4 font-semibold text-muted-foreground">Ciclo & Trial</TableHead>
                    <TableHead className="py-3 px-4 font-semibold text-muted-foreground">Progresso Onboarding</TableHead>
                    <TableHead className="py-3 px-4 font-semibold text-muted-foreground">Uso & Atividade</TableHead>
                    <TableHead className="py-3 px-4 text-center font-semibold text-muted-foreground whitespace-nowrap">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-border bg-card text-foreground">
                  {filteredTenants.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="py-12 text-center text-foreground">
                        <div className="max-w-xs mx-auto space-y-2">
                          <Building2 className="w-8 h-8 text-muted-foreground/40 mx-auto" />
                          <div className="text-sm font-semibold text-foreground">Nenhuma barbearia encontrada</div>
                          <p className="text-xs text-muted-foreground font-normal">
                            Nenhum cliente corresponde ao filtro de status &ldquo;{statusFilter}&rdquo;
                            {searchQuery ? ` ou busca "${searchQuery}"` : ''}.
                          </p>
                          {(statusFilter !== 'ALL' || searchQuery) && (
                            <Button
                              variant="outline"
                              size="sm"
                              type="button"
                              onClick={() => {
                                setStatusFilter('ALL')
                                setSearchQuery('')
                              }}
                              className="mt-2 text-xs"
                            >
                              Limpar Filtros
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredTenants.map((shop) => {
                      const manualSteps = manualStepOverrides[shop.id] || {}
                      const completedCount = shop.onboardingSteps.filter(
                        (s) => s.completed || manualSteps[s.id]
                      ).length
                      const dynamicPercentage = Math.round((completedCount / shop.onboardingSteps.length) * 100)

                      return (
                        <TableRow key={shop.id} className="hover:bg-muted/50 transition-colors duration-150">
                          {/* 1. Nome, Contato e URL Pública */}
                          <TableCell className="py-3.5 px-4 align-middle">
                            <div className="flex items-center gap-2.5">
                              <Avatar className="w-9 h-9 rounded-lg border border-border bg-muted shrink-0 shadow-sm">
                                <AvatarFallback className="rounded-lg bg-primary/10 text-primary font-semibold text-xs border border-primary/20">
                                  {shop.name.slice(0, 2).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div className="space-y-0.5 min-w-0">
                                <div className="text-sm font-semibold text-foreground truncate max-w-[180px]">{shop.name}</div>
                                <div className="text-xs text-muted-foreground font-normal truncate max-w-[180px]">
                                  {shop.email}
                                </div>
                                {shop.phone && (
                                  <div className="text-[11px] text-muted-foreground font-mono truncate max-w-[180px] flex items-center gap-1">
                                    <PhoneCall className="w-3 h-3 text-emerald-500" />
                                    <span>{shop.phone}</span>
                                  </div>
                                )}
                                {shop.slug && (
                                  <div className="flex items-center gap-1 pt-0.5">
                                    <span className="font-mono text-muted-foreground font-normal text-[10px] bg-muted px-1.5 py-0.5 rounded border border-border">
                                      /b/{shop.slug}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => handleCopyUrl(shop.slug!, shop.id)}
                                      className="p-1 text-muted-foreground hover:text-foreground rounded transition cursor-pointer"
                                      title={copiedId === shop.id ? 'Copiado!' : 'Copiar URL pública'}
                                    >
                                      {copiedId === shop.id ? (
                                        <Check className="w-3 h-3 text-emerald-500" />
                                      ) : (
                                        <Copy className="w-3 h-3" />
                                      )}
                                    </button>
                                    <a
                                      href={`/b/${shop.slug}`}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="p-1 text-muted-foreground hover:text-foreground rounded transition cursor-pointer"
                                      title="Abrir página pública"
                                    >
                                      <ExternalLink className="w-3 h-3" />
                                    </a>
                                  </div>
                                )}
                              </div>
                            </div>
                          </TableCell>

                          {/* 2. Ciclo & Trial */}
                          <TableCell className="py-3.5 px-4 align-middle">
                            <div className="space-y-1.5">
                              <div className="relative inline-block">
                                <select
                                  value={shop.lifecycleStatus}
                                  disabled={actionLoadingId === shop.id}
                                  onChange={(e) => handleStatusChange(shop.id, e.target.value)}
                                  className={`text-xs font-semibold py-1 px-2.5 rounded-lg border appearance-none pr-7 cursor-pointer focus:outline-none transition shadow-sm ${getStatusColor(
                                    shop.lifecycleStatus
                                  )}`}
                                >
                                  <option value="LEAD" className="bg-popover text-popover-foreground">LEAD</option>
                                  <option value="PENDING" className="bg-popover text-popover-foreground">PENDING</option>
                                  <option value="TRIAL" className="bg-popover text-popover-foreground">TRIAL</option>
                                  <option value="ACTIVE" className="bg-popover text-popover-foreground">ACTIVE</option>
                                  <option value="PAST_DUE" className="bg-popover text-popover-foreground">PAST_DUE</option>
                                  <option value="SUSPENDED" className="bg-popover text-popover-foreground">SUSPENDED</option>
                                  <option value="CANCELED" className="bg-popover text-popover-foreground">CANCELED</option>
                                </select>
                                <ChevronDown className="w-3.5 h-3.5 absolute right-2 top-2 pointer-events-none text-muted-foreground" />
                              </div>

                              {shop.trial?.isTrial && (
                                <div>
                                  <span
                                    className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded border shadow-sm ${
                                      shop.trial.daysRemaining <= 5
                                        ? 'bg-destructive/10 text-destructive border-destructive/20'
                                        : 'bg-muted text-muted-foreground border-border'
                                    }`}
                                  >
                                    <Clock className="w-3 h-3" />
                                    <span>{shop.trial.daysRemaining}d restantes</span>
                                  </span>
                                </div>
                              )}
                            </div>
                          </TableCell>

                          {/* 3. Onboarding */}
                          <TableCell className="py-3.5 px-4 align-middle">
                            <div className="space-y-1.5 max-w-[160px]">
                              <div className="flex items-center gap-2">
                                <div className="flex-1 bg-muted border border-border h-2 rounded-full overflow-hidden">
                                  <div
                                    className={`h-full rounded-full transition-all duration-500 ${
                                      dynamicPercentage >= 100
                                        ? 'bg-emerald-500'
                                        : dynamicPercentage >= 50
                                        ? 'bg-primary'
                                        : 'bg-destructive'
                                    }`}
                                    style={{ width: `${dynamicPercentage}%` }}
                                  />
                                </div>
                                <span className="text-xs font-semibold text-foreground">{dynamicPercentage}%</span>
                              </div>
                              <div className="text-[11px] text-muted-foreground font-normal">
                                {completedCount}/12 passos concluídos
                              </div>
                            </div>
                          </TableCell>

                          {/* 4. Uso & Atividade */}
                          <TableCell className="py-3.5 px-4 align-middle text-foreground">
                            <div className="space-y-1">
                              <div className="text-xs font-medium text-foreground flex items-center gap-1.5">
                                <span>{shop.appointmentsCount} agend. • {shop.clientsCount} clientes</span>
                              </div>
                              <div className="text-[11px] text-muted-foreground">
                                {shop.servicesCount} serviços • {shop.usersCount} equipe
                              </div>
                              <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                                <span>
                                  {shop.lastActivity
                                    ? new Date(shop.lastActivity).toLocaleDateString('pt-BR', {
                                        day: '2-digit',
                                        month: '2-digit',
                                        hour: '2-digit',
                                        minute: '2-digit',
                                      })
                                    : 'Sem atividade'}
                                </span>
                              </div>
                            </div>
                          </TableCell>

                          {/* 5. Ações */}
                          <TableCell className="py-3.5 px-4 align-middle text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              {/* Roteiro Checklist */}
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="outline"
                                    size="icon"
                                    type="button"
                                    onClick={() => setActiveChecklistTenant(shop)}
                                    className="h-8 w-8"
                                  >
                                    <CheckSquare className="w-4 h-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent className="bg-popover text-popover-foreground border-border text-xs">
                                  Roteiro Assistido (12 passos)
                                </TooltipContent>
                              </Tooltip>

                              {/* Feedback */}
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    size="icon"
                                    type="button"
                                    onClick={() => {
                                      setFeedbackTenant(shop)
                                      setIsFeedbackModalOpen(true)
                                    }}
                                    className="h-8 w-8"
                                  >
                                    <MessageSquare className="w-4 h-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent className="bg-popover text-popover-foreground border-border text-xs">
                                  Registrar Feedback
                                </TooltipContent>
                              </Tooltip>

                              {/* WhatsApp */}
                              {shop.phone ? (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      asChild
                                      variant="outline"
                                      size="icon"
                                      className="h-8 w-8 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10"
                                    >
                                      <a
                                        href={`https://wa.me/55${shop.phone.replace(/\D/g, '')}?text=${encodeURIComponent(
                                          `Olá, tudo bem? Aqui é da equipe de suporte do sistema Barber! Como está a implantação da ${shop.name}? Posso te ajudar em alguma etapa?`
                                        )}`}
                                        target="_blank"
                                        rel="noreferrer"
                                      >
                                        <PhoneCall className="w-4 h-4" />
                                      </a>
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent className="bg-popover text-popover-foreground border-border text-xs">
                                    WhatsApp
                                  </TooltipContent>
                                </Tooltip>
                              ) : (
                                <Button
                                  disabled
                                  variant="outline"
                                  size="icon"
                                  type="button"
                                  className="h-8 w-8 opacity-40 select-none"
                                >
                                  <PhoneCall className="w-4 h-4 text-muted-foreground" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </TooltipProvider>
        </Card>

        {/* Feedbacks Recebidos dos Clientes Piloto */}
        <Card className="bg-card border-border rounded-xl p-6 shadow-sm space-y-4 text-card-foreground">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg font-semibold text-foreground flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-primary/10 text-primary border border-primary/20">
                  <MessageSquare className="w-4 h-4 stroke-[2]" />
                </span>
                Voz do Cliente Piloto (Feedbacks Recebidos)
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground font-normal mt-1">
                Insights diretos dos proprietários e barbeiros para direcionar melhorias prioritárias
              </CardDescription>
            </div>
            <Badge variant="outline" className="text-xs px-3 py-1 bg-muted/50 border-border rounded-full text-muted-foreground font-medium">
              {feedbacks.length} avaliações
            </Badge>
          </div>

          {feedbacks.length === 0 ? (
            <div className="p-8 text-center border border-dashed border-border rounded-lg text-muted-foreground font-normal text-xs">
              Nenhum feedback registrado até o momento. Colete o primeiro feedback ao final da sessão assistida ou após 7 dias de uso!
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {feedbacks.map((fb) => (
                <div
                  key={fb.id}
                  className="bg-muted/30 border border-border rounded-lg p-4 space-y-3"
                >
                  <div className="flex items-center justify-between border-b border-border pb-2">
                    <div>
                      <strong className="text-xs text-foreground block font-semibold">
                        {fb.barbershop?.name || fb.userName || 'Cliente Anônimo'}
                      </strong>
                      <span className="text-[11px] text-muted-foreground font-normal">
                        {new Date(fb.createdAt).toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                    <span
                      className={`text-[10px] font-medium px-2.5 py-0.5 rounded-full border ${
                        fb.continueIntent === 'YES'
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                          : fb.continueIntent === 'NO'
                          ? 'bg-destructive/10 text-destructive border-destructive/20'
                          : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                      }`}
                    >
                      {fb.continueIntent === 'YES'
                        ? 'Pretende Continuar'
                        : fb.continueIntent === 'NO'
                        ? 'Não Continua'
                        : 'Em Dúvida'}
                    </span>
                  </div>

                  <div className="flex items-center gap-4 text-xs">
                    <div>
                      <span className="text-[11px] text-muted-foreground font-normal block">Facilidade:</span>
                      <span className="font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded">{fb.easeScore}/5 ★</span>
                    </div>
                    <div>
                      <span className="text-[11px] text-muted-foreground font-normal block">Satisfação:</span>
                      <span className="font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded">{fb.satisfactionScore}/5 ★</span>
                    </div>
                  </div>

                  {fb.mostUsedFeature && (
                    <div className="text-xs">
                      <span className="text-[11px] text-muted-foreground font-normal block">Mais usada:</span>
                      <span className="text-foreground font-normal">{fb.mostUsedFeature}</span>
                    </div>
                  )}

                  {fb.missingFeature && (
                    <div className="text-xs">
                      <span className="text-[11px] text-muted-foreground font-normal block">Faz falta:</span>
                      <span className="text-foreground font-normal">{fb.missingFeature}</span>
                    </div>
                  )}

                  {fb.problems && (
                    <div className="text-xs">
                      <span className="text-[11px] text-muted-foreground font-normal block">Dificuldade relatada:</span>
                      <span className="text-foreground italic font-normal">&quot;{fb.problems}&quot;</span>
                    </div>
                  )}

                  {fb.bugsReported && (
                    <div className="text-xs p-2.5 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive font-medium">
                      <span className="text-[10px] block">Bug reportado:</span>
                      {fb.bugsReported}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* MODAL: Checklist da Sessão de Onboarding Assistido (15–30 min) */}
        {activeChecklistTenant && (() => {
          const tenantId = activeChecklistTenant.id
          const currentOverrides = manualStepOverrides[tenantId] || {}
          const stepsWithStatus = activeChecklistTenant.onboardingSteps.map((s) => ({
            ...s,
            isDone: Boolean(s.completed || currentOverrides[s.id]),
          }))
          const completedCount = stepsWithStatus.filter((s) => s.isDone).length
          const totalSteps = stepsWithStatus.length
          const percent = totalSteps > 0 ? Math.round((completedCount / totalSteps) * 100) : 0
          const isAllDone = completedCount === totalSteps

          // Primeiro passo pendente para destaque dinâmico
          const firstPendingStepId = stepsWithStatus.find((s) => !s.isDone)?.id

          const filteredSteps = stepsWithStatus.filter((s) => {
            if (modalFilter === 'PENDING') return !s.isDone
            if (modalFilter === 'DONE') return s.isDone
            return true
          })

          return (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
              <div className="relative w-full max-w-2xl max-h-[92vh] flex flex-col bg-card border border-border rounded-xl shadow-xl text-card-foreground overflow-hidden animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="p-5 sm:p-6 pb-4 border-b border-border bg-card flex items-center justify-between gap-4 shrink-0">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0 shadow-sm">
                      <CheckSquare className="w-5 h-5 stroke-[2]" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-medium text-muted-foreground tracking-wider uppercase bg-muted px-2 py-0.5 rounded border border-border">
                          Roteiro Assistido • 15–30 min
                        </span>
                        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${getStatusColor(activeChecklistTenant.lifecycleStatus)}`}>
                          {activeChecklistTenant.lifecycleStatus}
                        </span>
                      </div>
                      <h3 className="text-lg sm:text-xl font-bold text-foreground mt-1">
                        {activeChecklistTenant.name}
                      </h3>
                    </div>
                  </div>

                  <button
                    onClick={() => setActiveChecklistTenant(null)}
                    className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted border border-border rounded-lg transition cursor-pointer active:scale-95"
                    aria-label="Fechar roteiro"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Conteúdo com Scroll */}
                <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
                  {/* Card de Progresso Dinâmico */}
                  <div className="bg-muted/30 border border-border rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-foreground">Progresso da Sessão</span>
                        <span className="text-[11px] text-muted-foreground font-normal">
                          ({completedCount} de {totalSteps} etapas concluídas)
                        </span>
                      </div>
                      <span
                        className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border transition-colors ${
                          isAllDone
                            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                            : percent >= 50
                            ? 'bg-primary/10 border-primary/20 text-primary'
                            : 'bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400'
                        }`}
                      >
                        {percent}% concluído
                      </span>
                    </div>

                    {/* Barra de Progresso com Transição Suave */}
                    <div className="h-2 w-full bg-muted border border-border rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ease-out ${
                          isAllDone
                            ? 'bg-emerald-500'
                            : percent >= 50
                            ? 'bg-primary'
                            : 'bg-amber-500'
                        }`}
                        style={{ width: `${percent}%` }}
                      />
                    </div>

                    <p className="text-[11px] text-muted-foreground font-normal leading-relaxed">
                      💡 Conduza a chamada marcando cada etapa. Os passos técnicos são verificados automaticamente e os testes práticos podem ser checados ao vivo com o cliente.
                    </p>
                  </div>

                  {/* Banner de Celebração de 100% Concluído */}
                  {isAllDone && (
                    <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-700 dark:text-emerald-300 flex items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
                      <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 shrink-0 border border-emerald-500/30">
                        <CheckCheck className="w-5 h-5 stroke-[2.5]" />
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-foreground">
                          Onboarding 100% Concluído com Sucesso!
                        </div>
                        <p className="text-[11px] text-muted-foreground font-normal mt-0.5">
                          A barbearia concluiu todos os 12 passos assistidos e está totalmente ativada para operar no sistema.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Filtros em Abas */}
                  <div className="flex items-center justify-between gap-2 border-b border-border pb-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Button
                        size="sm"
                        variant={modalFilter === 'ALL' ? 'default' : 'outline'}
                        onClick={() => setModalFilter('ALL')}
                        className="h-7 text-xs px-2.5"
                      >
                        Todos ({totalSteps})
                      </Button>
                      <Button
                        size="sm"
                        variant={modalFilter === 'PENDING' ? 'default' : 'outline'}
                        onClick={() => setModalFilter('PENDING')}
                        className="h-7 text-xs px-2.5"
                      >
                        Pendentes ({totalSteps - completedCount})
                      </Button>
                      <Button
                        size="sm"
                        variant={modalFilter === 'DONE' ? 'default' : 'outline'}
                        onClick={() => setModalFilter('DONE')}
                        className="h-7 text-xs px-2.5"
                      >
                        Concluídos ({completedCount})
                      </Button>
                    </div>

                    <span className="text-[11px] text-muted-foreground font-normal hidden sm:inline-block">
                      Clique no item para alterar
                    </span>
                  </div>

                  {/* Lista de Passos do Roteiro */}
                  <div className="space-y-2">
                    {filteredSteps.map((step) => {
                      const isNext = !step.isDone && step.id === firstPendingStepId

                      return (
                        <div
                          key={step.id}
                          onClick={() => toggleManualStep(tenantId, step.id)}
                          className={`group relative p-3 rounded-lg border flex items-start gap-3 cursor-pointer transition-all duration-150 select-none ${
                            step.isDone
                              ? 'bg-emerald-500/5 border-emerald-500/30 hover:bg-emerald-500/10'
                              : isNext
                              ? 'bg-primary/5 border-primary/30 ring-1 ring-primary/20 hover:bg-primary/10'
                              : 'bg-card border-border hover:bg-muted/50'
                          }`}
                        >
                          {/* Ícone de Número ou Checkmark */}
                          <div
                            className={`w-7 h-7 rounded-md flex items-center justify-center shrink-0 mt-0.5 text-xs font-semibold border transition-all duration-150 ${
                              step.isDone
                                ? 'bg-emerald-500 text-white border-transparent'
                                : isNext
                                ? 'bg-primary text-primary-foreground border-transparent'
                                : 'bg-muted text-muted-foreground border-border group-hover:border-primary group-hover:text-primary'
                            }`}
                          >
                            {step.isDone ? <Check className="w-4 h-4 stroke-[2.5]" /> : step.number}
                          </div>

                          {/* Informações da Etapa */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2 flex-wrap">
                              <div className="flex items-center gap-2">
                                <strong className="text-xs text-foreground font-semibold">
                                  Passo {step.number}: {step.title}
                                </strong>
                                {isNext && (
                                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 inline-flex items-center gap-1">
                                    <Play className="w-2.5 h-2.5 fill-primary" /> Próximo Passo
                                  </span>
                                )}
                              </div>

                              <div className="flex items-center gap-2">
                                <span className="text-[10px] text-muted-foreground font-normal bg-muted px-2 py-0.5 rounded border border-border">
                                  {step.isAutomated ? 'Auto-Verificado' : 'Teste Prático'}
                                </span>
                                <span
                                  className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${
                                    step.isDone
                                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                                      : 'bg-muted text-muted-foreground border-border'
                                  }`}
                                >
                                  {step.isDone ? 'Concluído ✓' : 'Pendente'}
                                </span>
                              </div>
                            </div>
                            <p className="text-xs text-muted-foreground font-normal mt-1 leading-relaxed">
                              {step.description}
                            </p>
                            <div className="text-[11px] text-muted-foreground/60 group-hover:text-muted-foreground mt-1 transition-colors">
                              {step.isDone ? 'Clique para desmarcar etapa' : 'Clique para marcar como concluído'}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Rodapé da Modal */}
                <div className="p-4 px-5 sm:px-6 border-t border-border bg-card flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
                  <div className="flex items-center gap-2 text-xs text-foreground font-normal">
                    <span className="text-muted-foreground">URL Pública:</span>
                    <span className="font-mono text-foreground bg-muted px-2 py-1 rounded-md border border-border text-[11px]">
                      /b/{activeChecklistTenant.slug || 'sem-slug'}
                    </span>
                    {activeChecklistTenant.slug && (
                      <button
                        type="button"
                        onClick={() => handleCopyUrl(activeChecklistTenant.slug!, activeChecklistTenant.id)}
                        className="p-1.5 bg-muted hover:bg-muted/80 text-foreground rounded-md border border-border transition cursor-pointer"
                        title="Copiar URL"
                      >
                        {copiedId === activeChecklistTenant.id ? (
                          <Check className="w-3.5 h-3.5" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-2 justify-end">
                    <Button
                      variant="outline"
                      size="sm"
                      type="button"
                      onClick={() => setActiveChecklistTenant(null)}
                    >
                      Fechar
                    </Button>
                    <Button
                      variant="default"
                      size="sm"
                      type="button"
                      onClick={() => setActiveChecklistTenant(null)}
                      className="flex items-center gap-1.5"
                    >
                      <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                      <span>Concluir Sessão</span>
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )
        })()}

        {/* MODAL: Formulário de Coleta de Feedback */}
        {feedbackTenant && (
          <TenantFeedbackModal
            isOpen={isFeedbackModalOpen}
            onClose={() => {
              setIsFeedbackModalOpen(false)
              setFeedbackTenant(null)
            }}
            barbershopId={feedbackTenant.id}
            barbershopName={feedbackTenant.name}
            onFeedbackSubmitted={loadData}
          />
        )}
      </main>
    </div>
  )
}
