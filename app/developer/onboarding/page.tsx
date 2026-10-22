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
  ShieldCheck,
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
        return 'bg-[#2563eb] text-white border border-[#3b82f6]'
      case 'PENDING':
        return 'bg-[#d97706] text-white border border-[#f59e0b]'
      case 'TRIAL':
        return 'bg-[#7c3aed] text-white border border-[#8b5cf6]'
      case 'ACTIVE':
        return 'bg-[#059669] text-white border border-[#10b981]'
      case 'PAST_DUE':
        return 'bg-[#ea580c] text-white border border-[#f97316]'
      case 'SUSPENDED':
        return 'bg-[#4b5563] text-white border border-[#6b7280]'
      case 'CANCELED':
        return 'bg-[#dc2626] text-white border border-[#ef4444]'
      default:
        return 'bg-[#1f2937] text-white border border-[#374151]'
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
    <div className="min-h-screen bg-gray-950 text-white pb-20 pt-20">
      <DropdownHeader />
      <main className="w-full px-4 md:px-8 max-w-7xl mx-auto space-y-8">
        {/* Top Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#374151] pb-6">
          <div>
            <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-white mb-1.5">
              <Link href="/developer" className="hover:underline text-white font-medium">
                Developer Hub
              </Link>
              <span className="text-[#3b82f6]">/</span>
              <span className="text-white">Customer Success & Operations</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-3">
              <span>Cockpit de Onboarding (5–10 Clientes Reais)</span>
              <span className="text-xs px-3 py-1 bg-[#d97706] text-white border border-[#f59e0b] rounded-full font-medium">
                Fase de Validação SaaS
              </span>
            </h1>
            <p className="text-sm text-white font-normal mt-1 max-w-3xl">
              Acompanhamento operacional em tempo real do ciclo de vida, sessão assistida de 15–30 minutos e ativação dos primeiros clientes piloto.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/developer"
              className="px-4 py-2 text-xs font-medium text-white bg-[#111827] border border-[#374151] hover:bg-[#1f2937] rounded-xl transition"
            >
              Voltar ao Developer Hub
            </Link>
            <button
              onClick={loadData}
              disabled={isLoading}
              className="flex items-center gap-2 px-4 py-2 text-xs font-medium bg-[#2563eb] hover:bg-[#1d4ed8] text-white rounded-xl transition border border-[#3b82f6] cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              Atualizar Dados
            </button>
          </div>
        </div>

        {message && (
          <div
            className={`p-4 rounded-xl border flex items-center justify-between ${
              message.type === 'success'
                ? 'bg-[#059669] border-[#10b981] text-white'
                : 'bg-[#dc2626] border-[#ef4444] text-white'
            }`}
          >
            <div className="flex items-center gap-2 text-sm font-medium">
              {message.type === 'success' ? <CheckCircle2 className="w-5 h-5 stroke-[2.5]" /> : <AlertCircle className="w-5 h-5 stroke-[2.5]" />}
              <span>{message.text}</span>
            </div>
            <button onClick={() => setMessage(null)} className="text-xs text-white font-medium hover:underline cursor-pointer">
              Fechar
            </button>
          </div>
        )}

        {/* Visual Funnel Bar */}
        <Card className="bg-[#111827] border-[#374151] rounded-2xl p-6 shadow-xl text-white space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="p-2 rounded-xl bg-[#d97706] text-white border border-[#f59e0b] shadow-md shadow-amber-500/20">
                <TrendingUp className="w-5 h-5 stroke-[2.5]" />
              </span>
              <div>
                <CardTitle className="text-base font-semibold text-white flex items-center gap-2">
                  <span>Funil de Adoção dos Clientes Piloto</span>
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-[#059669] border border-[#10b981] text-white">
                    9 Estágios
                  </span>
                </CardTitle>
                <CardDescription className="text-xs text-white font-normal mt-0.5">
                  Mapeamento em tempo real do ciclo de vida: da entrada do lead à ativação e conversão
                </CardDescription>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-normal text-white bg-[#030712] px-3 py-1 rounded-lg border border-[#374151]">
                Total: <strong className="text-white font-semibold">{metrics?.totalTenants ?? 0} Barbearias</strong>
              </span>
              <span className="text-xs font-normal text-white bg-[#030712] px-3 py-1 rounded-lg border border-[#374151]">
                Ativação: <strong className="text-white font-semibold">{metrics?.activationRate ?? 0}%</strong>
              </span>
              <span className="text-xs font-normal text-white bg-[#059669] px-3 py-1 rounded-lg border border-[#10b981]">
                Convertidas: <strong className="text-white font-semibold">{metrics?.countsByStatus.ACTIVE ?? 0}</strong>
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
                borderColor: 'border-[#3b82f6]',
                badgeBg: 'bg-[#2563eb]',
                barColor: 'bg-[#3b82f6]',
              },
              {
                id: 'CADASTRO',
                filterKey: 'PENDING',
                num: 2,
                label: 'Cadastro',
                desc: 'Conta criada',
                count: metrics?.countsByStatus.PENDING || 0,
                icon: Building2,
                borderColor: 'border-[#d97706]',
                badgeBg: 'bg-[#d97706]',
                barColor: 'bg-[#f59e0b]',
              },
              {
                id: 'TRIAL',
                filterKey: 'TRIAL',
                num: 3,
                label: 'Trial 30d',
                desc: 'Período teste',
                count: metrics?.countsByStatus.TRIAL || 0,
                icon: Clock,
                borderColor: 'border-[#8b5cf6]',
                badgeBg: 'bg-[#7c3aed]',
                barColor: 'bg-[#a78bfa]',
              },
              {
                id: 'ONBOARDING',
                filterKey: null,
                num: 4,
                label: 'Onboarding',
                desc: 'Sessão ≥ 50%',
                count: tenants.filter((t) => t.completionPercentage >= 50 && t.completionPercentage < 100).length,
                icon: CheckSquare,
                borderColor: 'border-[#06b6d4]',
                badgeBg: 'bg-[#0891b2]',
                barColor: 'bg-[#22d3ee]',
              },
              {
                id: 'CONFIG',
                filterKey: null,
                num: 5,
                label: 'Configurado',
                desc: 'Serviço + equipe',
                count: tenants.filter((t) => t.servicesCount > 0 && t.usersCount > 0).length,
                icon: Scissors,
                borderColor: 'border-[#6366f1]',
                badgeBg: 'bg-[#4f46e5]',
                barColor: 'bg-[#818cf8]',
              },
              {
                id: '1ST_APPT',
                filterKey: null,
                num: 6,
                label: '1º Agend.',
                desc: 'AHA Moment',
                count: metrics?.totalActivated || 0,
                icon: CheckCircle2,
                borderColor: 'border-[#10b981]',
                badgeBg: 'bg-[#059669]',
                barColor: 'bg-[#34d399]',
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
                borderColor: 'border-[#14b8a6]',
                badgeBg: 'bg-[#0d9488]',
                barColor: 'bg-[#2dd4bf]',
              },
              {
                id: 'FEEDBACK',
                filterKey: null,
                num: 8,
                label: 'Feedback',
                desc: 'CSAT coletado',
                count: metrics?.feedbackStats.totalFeedbacks || 0,
                icon: MessageSquare,
                borderColor: 'border-[#ec4899]',
                badgeBg: 'bg-[#db2777]',
                barColor: 'bg-[#f472b6]',
              },
              {
                id: 'CONVERSION',
                filterKey: 'ACTIVE',
                num: 9,
                label: 'Conversão',
                desc: 'Assinatura paga',
                count: metrics?.countsByStatus.ACTIVE || 0,
                icon: Star,
                borderColor: 'border-[#f59e0b]',
                badgeBg: 'bg-[#d97706]',
                barColor: 'bg-[#fbbf24]',
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
                      className={`group relative p-3.5 rounded-xl border bg-[#030712] flex flex-col justify-between transition-all duration-200 select-none ${stage.borderColor} ${
                        stage.filterKey ? 'cursor-pointer hover:-translate-y-1 hover:shadow-xl' : 'cursor-default'
                      } ${
                        stage.highlight
                          ? 'ring-1 ring-[#10b981] bg-[#022c22]/30'
                          : ''
                      } ${
                        isSelected
                          ? 'ring-2 ring-white scale-[1.03] shadow-2xl'
                          : ''
                      }`}
                      title={stage.filterKey ? `Clique para filtrar por ${stage.label}` : undefined}
                    >
                      {/* Header do Card com Ícone e Número */}
                      <div>
                        <div className="flex items-center justify-between gap-1 mb-2">
                          <span className={`w-6 h-6 rounded-lg ${stage.badgeBg} text-white flex items-center justify-center shrink-0 shadow-md`}>
                            <Icon className="w-3.5 h-3.5 text-white" />
                          </span>
                          <span className="text-[10px] font-mono text-white bg-[#111827] px-1.5 py-0.5 rounded border border-[#374151]">
                            #{stage.num}
                          </span>
                        </div>

                        <span className="text-2xl font-bold text-white block tracking-tight group-hover:scale-105 transition-transform duration-200">
                          {stage.count}
                        </span>

                        <span className="text-xs font-semibold text-white block mt-1 truncate">
                          {stage.label}
                        </span>

                        <span className="text-[10px] text-white font-normal block truncate mt-0.5">
                          {stage.desc}
                        </span>
                      </div>

                      {/* Barra de Participação no Funil */}
                      <div className="mt-3 pt-2 border-t border-[#374151]">
                        <div className="h-1.5 w-full bg-[#111827] rounded-full overflow-hidden border border-[#374151]">
                          <div
                            className={`h-full ${stage.barColor} rounded-full transition-all duration-500`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <div className="flex items-center justify-between text-[10px] text-white mt-1 font-mono">
                          <span>Fase {stage.num}</span>
                          <span>{pct}%</span>
                        </div>
                      </div>

                      {stage.highlight && (
                        <span className="absolute -top-2 right-2 text-[9px] font-semibold uppercase tracking-wider bg-[#059669] text-white px-1.5 py-0.5 rounded-full border border-[#10b981] shadow-sm">
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
          <Card className="bg-[#111827] border-[#374151] rounded-2xl p-5 shadow-lg relative overflow-hidden text-white transition-all duration-200 hover:-translate-y-1 hover:border-[#f59e0b]">
            <div className="flex items-center justify-between text-white text-xs font-medium uppercase tracking-wider">
              <span>Time to 1st Appointment</span>
              <span className="p-1.5 rounded-lg bg-[#d97706] text-white border border-[#f59e0b] shadow-sm"><Clock className="w-4 h-4 stroke-[2.5]" /></span>
            </div>
            <div className="text-3xl font-bold text-white mt-2">
              {metrics?.avgTimeToFirstAppointmentHours !== null && metrics?.avgTimeToFirstAppointmentHours !== undefined
                ? `${metrics.avgTimeToFirstAppointmentHours}h`
                : '—'}
            </div>
            <p className="text-xs text-white font-normal mt-1">
              Meta: &lt; 24h pós-onboarding
            </p>
            <div className="text-xs text-white font-normal mt-2">
              Mediana: {metrics?.medianTimeToFirstAppointmentHours ?? '—'}h
            </div>
          </Card>

          {/* Taxa de Ativação */}
          <Card className="bg-[#111827] border-[#374151] rounded-2xl p-5 shadow-lg relative overflow-hidden text-white transition-all duration-200 hover:-translate-y-1 hover:border-[#10b981]">
            <div className="flex items-center justify-between text-white text-xs font-medium uppercase tracking-wider">
              <span>Taxa de Ativação</span>
              <span className="p-1.5 rounded-lg bg-[#059669] text-white border border-[#10b981] shadow-sm"><CheckCircle2 className="w-4 h-4 stroke-[2.5]" /></span>
            </div>
            <div className="text-3xl font-bold text-white mt-2">
              {metrics?.activationRate ?? 0}%
            </div>
            <p className="text-xs text-white font-normal mt-1">
              {metrics?.totalActivated ?? 0} de {metrics?.totalTenants ?? 0} barbearias ativadas
            </p>
            <div className="w-full bg-[#030712] border border-[#374151] h-2.5 rounded-full mt-3 overflow-hidden p-0.5">
              <div
                className="bg-[#059669] h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, metrics?.activationRate ?? 0)}%` }}
              />
            </div>
          </Card>

          {/* Uso Semanal & Volume */}
          <Card className="bg-[#111827] border-[#374151] rounded-2xl p-5 shadow-lg relative overflow-hidden text-white transition-all duration-200 hover:-translate-y-1 hover:border-[#3b82f6]">
            <div className="flex items-center justify-between text-white text-xs font-medium uppercase tracking-wider">
              <span>Volume de Agendamentos</span>
              <span className="p-1.5 rounded-lg bg-[#2563eb] text-white border border-[#3b82f6] shadow-sm"><Calendar className="w-4 h-4 stroke-[2.5]" /></span>
            </div>
            <div className="text-3xl font-bold text-white mt-2">
              {metrics?.totalAppointments ?? 0}
            </div>
            <p className="text-xs text-white font-normal mt-1">
              {metrics?.activeWeeklyTenants ?? 0} barbearias ativas nesta semana
            </p>
            <div className="text-xs text-white font-normal mt-2">
              Indicador crítico de engajamento diário
            </div>
          </Card>

          {/* Feedback & CSAT */}
          <Card className="bg-[#111827] border-[#374151] rounded-2xl p-5 shadow-lg relative overflow-hidden text-white transition-all duration-200 hover:-translate-y-1 hover:border-[#f59e0b]">
            <div className="flex items-center justify-between text-white text-xs font-medium uppercase tracking-wider">
              <span>CSAT & Facilidade</span>
              <span className="p-1.5 rounded-lg bg-[#d97706] text-white border border-[#f59e0b] shadow-sm"><Star className="w-4 h-4 fill-white stroke-[2.5]" /></span>
            </div>
            <div className="text-3xl font-bold text-white mt-2 flex items-center gap-2">
              <span>{metrics?.feedbackStats.avgSatisfactionScore || '—'}/5</span>
              <span className="text-xs font-normal text-white">
                ({metrics?.feedbackStats.totalFeedbacks ?? 0} avaliações)
              </span>
            </div>
            <p className="text-xs text-white font-normal mt-1">
              Facilidade: {metrics?.feedbackStats.avgEaseScore || '—'}/5
            </p>
            <div className="text-xs text-white font-normal mt-2">
              {metrics?.feedbackStats.continueIntentRatio.yes ?? 0} clientes pretendem continuar
            </div>
          </Card>
        </div>

        {/* Tabela Operacional dos Clientes Piloto */}
        <Card className="bg-[#111827] border-[#374151] rounded-2xl p-6 shadow-xl space-y-5 text-white">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2.5">
                <span className="p-2 rounded-xl bg-[#d97706] text-white border border-[#f59e0b] shadow-md shadow-amber-500/20">
                  <Building2 className="w-5 h-5 stroke-[2.5]" />
                </span>
                <div>
                  <CardTitle className="text-lg font-bold text-white flex items-center gap-2">
                    <span>Gestão dos Primeiros Clientes Reais</span>
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-[#1e293b] text-white border border-[#374151]">
                      {filteredTenants.length} de {tenants.length} barbearias
                    </span>
                  </CardTitle>
                  <CardDescription className="text-xs text-white font-normal mt-0.5">
                    Acompanhamento operacional assistido, URL pública (/b/), ativação e ciclo de vida
                  </CardDescription>
                </div>
              </div>
            </div>

            {/* Barra de Busca Rápida */}
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-white/50" />
              <input
                type="text"
                placeholder="Buscar por barbearia, e-mail, slug..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#030712] border border-[#374151] rounded-xl pl-9 pr-7 py-2 text-xs text-white placeholder:text-white/40 focus:outline-none focus:border-[#3b82f6] focus:ring-1 focus:ring-[#3b82f6] transition-all"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-2.5 text-white/50 hover:text-white text-xs"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Filtros em Pílulas Sólidas com Contadores */}
          <div className="flex items-center gap-2 flex-wrap pt-1 border-t border-[#374151]/60">
            <span className="text-xs text-white/70 font-normal mr-1">Filtrar por Status:</span>
            {[
              { id: 'ALL', label: 'Todos', count: tenants.length, activeBg: 'bg-[#2563eb] border-[#3b82f6]' },
              { id: 'TRIAL', label: 'Trial 30d', count: tenants.filter((t) => t.lifecycleStatus === 'TRIAL').length, activeBg: 'bg-[#7c3aed] border-[#8b5cf6]' },
              { id: 'PENDING', label: 'Pendentes', count: tenants.filter((t) => t.lifecycleStatus === 'PENDING').length, activeBg: 'bg-[#d97706] border-[#f59e0b]' },
              { id: 'ACTIVE', label: 'Ativos', count: tenants.filter((t) => t.lifecycleStatus === 'ACTIVE').length, activeBg: 'bg-[#059669] border-[#10b981]' },
              { id: 'PAST_DUE', label: 'Atrasados', count: tenants.filter((t) => t.lifecycleStatus === 'PAST_DUE').length, activeBg: 'bg-[#ea580c] border-[#f97316]' },
              { id: 'SUSPENDED', label: 'Suspensos', count: tenants.filter((t) => t.lifecycleStatus === 'SUSPENDED').length, activeBg: 'bg-[#4b5563] border-[#6b7280]' },
              { id: 'CANCELED', label: 'Cancelados', count: tenants.filter((t) => t.lifecycleStatus === 'CANCELED').length, activeBg: 'bg-[#dc2626] border-[#ef4444]' },
            ].map((st) => {
              const isSelected = statusFilter === st.id
              return (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => setStatusFilter(st.id)}
                  className={`h-8 px-3 text-xs font-medium rounded-lg border transition-all duration-150 cursor-pointer active:scale-95 inline-flex items-center gap-1.5 ${
                    isSelected
                      ? `${st.activeBg} text-white shadow-md`
                      : 'bg-[#030712] text-white border-[#374151] hover:bg-[#1f2937] hover:border-[#4b5563]'
                  }`}
                >
                  <span>{st.label}</span>
                  <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${isSelected ? 'bg-black/30 text-white' : 'bg-[#111827] text-white/70 border border-[#374151]'}`}>
                    {st.count}
                  </span>
                </button>
              )
            })}
          </div>

          {/* Tabela Operacional */}
          <TooltipProvider delayDuration={150}>
            <div className="overflow-x-auto rounded-xl border border-[#374151]">
              <Table className="w-full text-left text-xs">
                <TableHeader className="bg-[#030712] text-white uppercase tracking-wider text-[11px] border-b border-[#374151]">
                  <TableRow className="border-b border-[#374151] hover:bg-transparent">
                    <TableHead className="py-3.5 px-4 font-semibold text-white">Barbearia & Contato</TableHead>
                    <TableHead className="py-3.5 px-4 font-semibold text-white">Status Ciclo de Vida</TableHead>
                    <TableHead className="py-3.5 px-4 font-semibold text-white">Trial (7 Dias)</TableHead>
                    <TableHead className="py-3.5 px-4 font-semibold text-white">Onboarding (12 Passos)</TableHead>
                    <TableHead className="py-3.5 px-4 font-semibold text-white">Ativação (1º Agend.)</TableHead>
                    <TableHead className="py-3.5 px-4 font-semibold text-white">Uso & Contadores</TableHead>
                    <TableHead className="py-3.5 px-4 font-semibold text-white">Última Atividade</TableHead>
                    <TableHead className="py-3.5 px-4 text-center font-semibold text-white whitespace-nowrap min-w-[370px]">Ações Operacionais</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-[#374151] bg-[#111827] text-white">
                  {filteredTenants.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-white">
                        <div className="max-w-xs mx-auto space-y-2">
                          <Building2 className="w-8 h-8 text-white/40 mx-auto" />
                          <div className="text-sm font-semibold text-white">Nenhuma barbearia encontrada</div>
                          <p className="text-xs text-white/70 font-normal">
                            Nenhum cliente corresponde ao filtro de status &ldquo;{statusFilter}&rdquo;
                            {searchQuery ? ` ou busca "${searchQuery}"` : ''}.
                          </p>
                          {(statusFilter !== 'ALL' || searchQuery) && (
                            <button
                              type="button"
                              onClick={() => {
                                setStatusFilter('ALL')
                                setSearchQuery('')
                              }}
                              className="mt-2 px-3 py-1.5 text-xs font-medium bg-[#2563eb] hover:bg-[#1d4ed8] text-white rounded-lg border border-[#3b82f6] transition cursor-pointer"
                            >
                              Limpar Filtros
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredTenants.map((shop) => {
                      const manualSteps = manualStepOverrides[shop.id] || {}
                      const completedCount = shop.onboardingSteps.filter(
                        (s) => s.completed || manualSteps[s.id]
                      ).length
                      const dynamicPercentage = Math.round((completedCount / shop.onboardingSteps.length) * 100)

                      return (
                        <tr key={shop.id} className="hover:bg-[#1f2937]/70 transition-colors duration-150 group">
                          {/* 1. Nome, Contato e URL Pública */}
                          <td className="py-4 px-4 align-middle">
                            <div className="flex items-center gap-3">
                              <Avatar className="w-10 h-10 rounded-xl border border-[#3b82f6] bg-[#030712] shrink-0 shadow-sm">
                                <AvatarFallback className="rounded-xl bg-[#2563eb] text-white font-semibold text-xs border border-[#3b82f6]">
                                  {shop.name.slice(0, 2).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div className="space-y-1 min-w-0">
                                <div className="text-sm font-semibold text-white truncate max-w-[200px]">{shop.name}</div>
                                <div className="text-xs text-white/90 font-normal truncate max-w-[200px]">
                                  {shop.email}
                                </div>
                                {shop.phone && (
                                  <div className="text-[11px] text-white/70 font-mono truncate max-w-[200px] flex items-center gap-1">
                                    <PhoneCall className="w-3 h-3 text-[#10b981]" />
                                    <span>{shop.phone}</span>
                                  </div>
                                )}
                                {shop.slug ? (
                                  <div className="flex items-center gap-1.5 pt-0.5">
                                    <span className="font-mono text-white font-normal text-[11px] bg-[#030712] px-2 py-0.5 rounded border border-[#374151]">
                                      /b/{shop.slug}
                                    </span>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <button
                                          type="button"
                                          onClick={() => handleCopyUrl(shop.slug!, shop.id)}
                                          className="p-1 text-white hover:bg-[#374151] rounded transition cursor-pointer"
                                        >
                                          {copiedId === shop.id ? (
                                            <Check className="w-3.5 h-3.5 text-white" />
                                          ) : (
                                            <Copy className="w-3.5 h-3.5 text-white" />
                                          )}
                                        </button>
                                      </TooltipTrigger>
                                      <TooltipContent className="bg-[#111827] text-white border-[#374151] text-xs">
                                        {copiedId === shop.id ? 'Copiado!' : 'Copiar URL pública'}
                                      </TooltipContent>
                                    </Tooltip>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <a
                                          href={`/b/${shop.slug}`}
                                          target="_blank"
                                          rel="noreferrer"
                                          className="p-1 text-white hover:bg-[#374151] rounded transition cursor-pointer"
                                        >
                                          <ExternalLink className="w-3.5 h-3.5 text-white" />
                                        </a>
                                      </TooltipTrigger>
                                      <TooltipContent className="bg-[#111827] text-white border-[#374151] text-xs">
                                        Abrir página pública
                                      </TooltipContent>
                                    </Tooltip>
                                  </div>
                                ) : (
                                  <span className="text-[10px] text-white font-medium bg-[#dc2626] border border-[#ef4444] px-2 py-0.5 rounded inline-block">
                                    Sem slug gerado
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* 2. Status Ciclo de Vida */}
                          <td className="py-4 px-4 align-middle">
                            <div className="relative inline-block">
                              <select
                                value={shop.lifecycleStatus}
                                disabled={actionLoadingId === shop.id}
                                onChange={(e) => handleStatusChange(shop.id, e.target.value)}
                                className={`text-xs font-semibold py-1.5 px-3 rounded-xl border appearance-none pr-8 cursor-pointer focus:outline-none transition shadow-sm ${getStatusColor(
                                  shop.lifecycleStatus
                                )}`}
                              >
                                <option value="LEAD" className="bg-[#111827] text-white">LEAD</option>
                                <option value="PENDING" className="bg-[#111827] text-white">PENDING</option>
                                <option value="TRIAL" className="bg-[#111827] text-white">TRIAL</option>
                                <option value="ACTIVE" className="bg-[#111827] text-white">ACTIVE</option>
                                <option value="PAST_DUE" className="bg-[#111827] text-white">PAST_DUE</option>
                                <option value="SUSPENDED" className="bg-[#111827] text-white">SUSPENDED</option>
                                <option value="CANCELED" className="bg-[#111827] text-white">CANCELED</option>
                              </select>
                              <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-2.5 pointer-events-none text-white stroke-[2.5]" />
                            </div>
                          </td>

                          {/* 3. Trial */}
                          <td className="py-4 px-4 align-middle">
                            {shop.trial?.isTrial ? (
                              <div className="space-y-1">
                                <span
                                  className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-lg border text-white shadow-sm ${
                                    shop.trial.daysRemaining <= 5
                                      ? 'bg-[#dc2626] border-[#ef4444]'
                                      : 'bg-[#030712] border-[#374151]'
                                  }`}
                                >
                                  <Clock className="w-3.5 h-3.5 text-white" />
                                  <span>{shop.trial.daysRemaining} dias restantes</span>
                                </span>
                                <div className="text-xs text-white font-normal">
                                  Término: {shop.trial.trialEnd ? new Date(shop.trial.trialEnd).toLocaleDateString('pt-BR') : '—'}
                                </div>
                              </div>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-white px-2.5 py-1 rounded-lg border border-[#10b981] bg-[#059669] shadow-sm">
                                <ShieldCheck className="w-3.5 h-3.5 text-white" />
                                {shop.lifecycleStatus === 'ACTIVE' ? 'Assinatura Ativa' : 'Trial Encerrado'}
                              </span>
                            )}
                          </td>

                          {/* 4. Onboarding Checklist (12 Passos) */}
                          <td className="py-4 px-4 align-middle">
                            <div className="space-y-1.5">
                              <div className="flex items-center gap-2">
                                <div className="w-24 bg-[#030712] border border-[#374151] h-2.5 rounded-full overflow-hidden p-0.5">
                                  <div
                                    className={`h-full rounded-full transition-all duration-500 ${
                                      dynamicPercentage >= 100
                                        ? 'bg-[#059669]'
                                        : dynamicPercentage >= 50
                                        ? 'bg-[#d97706]'
                                        : 'bg-[#dc2626]'
                                    }`}
                                    style={{ width: `${dynamicPercentage}%` }}
                                  />
                                </div>
                                <span className="text-xs font-semibold text-white">{dynamicPercentage}%</span>
                              </div>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button
                                    type="button"
                                    onClick={() => setActiveChecklistTenant(shop)}
                                    className="text-xs text-white hover:underline cursor-pointer flex items-center gap-1.5 font-normal group/step text-left"
                                  >
                                    <CheckCircle2 className="w-3.5 h-3.5 text-white shrink-0 group-hover/step:scale-110 transition-transform" />
                                    <span>{completedCount} de 12 concluídos</span>
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent className="bg-[#111827] text-white border-[#374151] text-xs">
                                  Clique para abrir o roteiro assistido de 12 passos
                                </TooltipContent>
                              </Tooltip>
                            </div>
                          </td>

                          {/* 5. Ativação (1º Agendamento) */}
                          <td className="py-4 px-4 align-middle">
                            {shop.isActivated ? (
                              <div className="space-y-1">
                                <span className="inline-flex items-center gap-1 text-xs font-medium text-white bg-[#059669] border border-[#10b981] px-2.5 py-0.5 rounded-full shadow-sm">
                                  <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                                  <span>Ativado</span>
                                </span>
                                <div className="text-xs text-white font-normal">
                                  TTFA: {shop.timeToFirstAppointmentHours !== null ? `${shop.timeToFirstAppointmentHours}h` : 'Registrado'}
                                </div>
                              </div>
                            ) : (
                              <div className="space-y-1">
                                <span className="inline-flex items-center gap-1 text-xs font-medium text-white bg-[#d97706] border border-[#f59e0b] px-2.5 py-0.5 rounded-full shadow-sm">
                                  <Clock className="w-3.5 h-3.5 text-white" />
                                  <span>Aguardando 1º agend.</span>
                                </span>
                              </div>
                            )}
                          </td>

                          {/* 6. Uso & Contadores */}
                          <td className="py-4 px-4 align-middle">
                            <div className="flex flex-col gap-1 text-xs text-white">
                              <span className="inline-flex items-center gap-1.5 bg-[#030712] border border-[#374151] px-2.5 py-1 rounded-md text-[11px] text-white font-medium hover:border-[#4b5563] transition-colors">
                                <Calendar className="w-3 h-3 text-white shrink-0" />
                                <span>{shop.appointmentsCount} agendamentos</span>
                              </span>
                              <span className="inline-flex items-center gap-1.5 bg-[#030712] border border-[#374151] px-2.5 py-1 rounded-md text-[11px] text-white font-medium hover:border-[#4b5563] transition-colors">
                                <Users className="w-3 h-3 text-white shrink-0" />
                                <span>{shop.clientsCount} clientes</span>
                              </span>
                              <span className="inline-flex items-center gap-1.5 bg-[#030712] border border-[#374151] px-2.5 py-1 rounded-md text-[11px] text-white font-medium hover:border-[#4b5563] transition-colors">
                                <Scissors className="w-3 h-3 text-white shrink-0" />
                                <span>{shop.servicesCount} serviços • {shop.usersCount} equipe</span>
                              </span>
                            </div>
                          </td>

                          {/* 7. Última Atividade */}
                          <td className="py-4 px-4 align-middle text-white">
                            <div className="space-y-1">
                              <div className="text-xs font-normal text-white flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-[#059669] shrink-0 animate-pulse" />
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
                              <div className="text-xs text-white/80 font-normal">
                                Acesso: {new Date(shop.lastAccess).toLocaleDateString('pt-BR')}
                              </div>
                            </div>
                          </td>

                          {/* 8. Ações Operacionais */}
                          <td className="py-4 px-4 align-middle whitespace-nowrap text-center min-w-[370px]">
                            <div className="flex items-center justify-center gap-2">
                              {/* Roteiro 15-30m */}
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    size="sm"
                                    type="button"
                                    onClick={() => setActiveChecklistTenant(shop)}
                                    className="h-[34px] px-3 min-w-[128px] text-xs font-medium bg-[#1e293b] hover:bg-[#334155] text-white border border-[#475569] rounded-lg shadow-sm transition-all duration-150 inline-flex items-center justify-center gap-1.5 cursor-pointer active:scale-[0.98]"
                                  >
                                    <CheckSquare className="w-3.5 h-3.5 text-white shrink-0" />
                                    <span>Roteiro 15–30m</span>
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent className="bg-[#111827] text-white border-[#374151] text-xs">
                                  Conduzir sessão assistida de ativação (12 passos)
                                </TooltipContent>
                              </Tooltip>

                              {/* Feedback */}
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    size="sm"
                                    type="button"
                                    onClick={() => {
                                      setFeedbackTenant(shop)
                                      setIsFeedbackModalOpen(true)
                                    }}
                                    className="h-[34px] px-3 min-w-[96px] text-xs font-medium bg-[#2563eb] hover:bg-[#1d4ed8] text-white border border-[#3b82f6] rounded-lg shadow-sm transition-all duration-150 inline-flex items-center justify-center gap-1.5 cursor-pointer active:scale-[0.98]"
                                  >
                                    <MessageSquare className="w-3.5 h-3.5 text-white shrink-0" />
                                    <span>Feedback</span>
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent className="bg-[#111827] text-white border-[#374151] text-xs">
                                  Registrar feedback e CSAT do cliente piloto
                                </TooltipContent>
                              </Tooltip>

                              {/* WhatsApp Contato Direto */}
                              {shop.phone ? (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      asChild
                                      size="sm"
                                      className="h-[34px] px-3 min-w-[102px] text-xs font-medium bg-[#059669] hover:bg-[#047857] text-white border border-[#10b981] rounded-lg shadow-sm transition-all duration-150 inline-flex items-center justify-center gap-1.5 cursor-pointer active:scale-[0.98]"
                                    >
                                      <a
                                        href={`https://wa.me/55${shop.phone.replace(/\D/g, '')}?text=${encodeURIComponent(
                                          `Olá, tudo bem? Aqui é da equipe de suporte do sistema Barber! Como está a implantação da ${shop.name}? Posso te ajudar em alguma etapa?`
                                        )}`}
                                        target="_blank"
                                        rel="noreferrer"
                                      >
                                        <PhoneCall className="w-3.5 h-3.5 text-white shrink-0" />
                                        <span>WhatsApp</span>
                                      </a>
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent className="bg-[#111827] text-white border-[#374151] text-xs">
                                    Iniciar conversa no WhatsApp com {shop.name}
                                  </TooltipContent>
                                </Tooltip>
                              ) : (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      disabled
                                      size="sm"
                                      type="button"
                                      className="h-[34px] px-3 min-w-[102px] text-xs font-medium bg-[#030712] text-white/40 border border-[#374151] rounded-lg cursor-not-allowed inline-flex items-center justify-center gap-1.5 opacity-40 select-none"
                                    >
                                      <PhoneCall className="w-3.5 h-3.5 text-white/40 shrink-0" />
                                      <span>WhatsApp</span>
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent className="bg-[#111827] text-white border-[#374151] text-xs">
                                    Nenhum telefone cadastrado para esta barbearia
                                  </TooltipContent>
                                </Tooltip>
                              )}
                            </div>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </TooltipProvider>
        </Card>

        {/* Feedbacks Recebidos dos Clientes Piloto */}
        <Card className="bg-[#111827] border-[#374151] rounded-2xl p-6 shadow-xl space-y-4 text-white">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg font-semibold text-white flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-[#db2777] text-white border border-[#f472b6]">
                  <MessageSquare className="w-4 h-4 stroke-[2.5]" />
                </span>
                Voz do Cliente Piloto (Feedbacks Recebidos)
              </CardTitle>
              <CardDescription className="text-xs text-white font-normal mt-1">
                Insights diretos dos proprietários e barbeiros para direcionar melhorias prioritárias
              </CardDescription>
            </div>
            <Badge variant="outline" className="text-xs px-3 py-1 bg-[#030712] border-[#374151] rounded-full text-white font-medium">
              {feedbacks.length} avaliações
            </Badge>
          </div>

          {feedbacks.length === 0 ? (
            <div className="p-8 text-center border border-dashed border-[#374151] rounded-xl text-white font-normal text-xs">
              Nenhum feedback registrado até o momento. Colete o primeiro feedback ao final da sessão assistida ou após 7 dias de uso!
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {feedbacks.map((fb) => (
                <div
                  key={fb.id}
                  className="bg-[#030712] border border-[#374151] rounded-xl p-4 space-y-3"
                >
                  <div className="flex items-center justify-between border-b border-[#374151] pb-2">
                    <div>
                      <strong className="text-xs text-white block font-semibold">
                        {fb.barbershop?.name || fb.userName || 'Cliente Anônimo'}
                      </strong>
                      <span className="text-[11px] text-white font-normal">
                        {new Date(fb.createdAt).toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                    <span
                      className={`text-[10px] font-medium px-2.5 py-0.5 rounded-full border ${
                        fb.continueIntent === 'YES'
                          ? 'bg-[#059669] text-white border-[#10b981]'
                          : fb.continueIntent === 'NO'
                          ? 'bg-[#dc2626] text-white border-[#ef4444]'
                          : 'bg-[#d97706] text-white border-[#f59e0b]'
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
                      <span className="text-[11px] text-white font-normal block">Facilidade:</span>
                      <span className="font-medium text-white bg-[#d97706] px-2 py-0.5 rounded">{fb.easeScore}/5 ★</span>
                    </div>
                    <div>
                      <span className="text-[11px] text-white font-normal block">Satisfação:</span>
                      <span className="font-medium text-white bg-[#059669] px-2 py-0.5 rounded">{fb.satisfactionScore}/5 ★</span>
                    </div>
                  </div>

                  {fb.mostUsedFeature && (
                    <div className="text-xs">
                      <span className="text-[11px] text-white font-normal block">Mais usada:</span>
                      <span className="text-white font-normal">{fb.mostUsedFeature}</span>
                    </div>
                  )}

                  {fb.missingFeature && (
                    <div className="text-xs">
                      <span className="text-[11px] text-white font-normal block">Faz falta:</span>
                      <span className="text-white font-normal">{fb.missingFeature}</span>
                    </div>
                  )}

                  {fb.problems && (
                    <div className="text-xs">
                      <span className="text-[11px] text-white font-normal block">Dificuldade relatada:</span>
                      <span className="text-white italic font-normal">&quot;{fb.problems}&quot;</span>
                    </div>
                  )}

                  {fb.bugsReported && (
                    <div className="text-xs p-2 bg-[#dc2626] border border-[#ef4444] rounded-lg text-white font-medium">
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
            <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-filter-none animate-in fade-in duration-200">
              <div className="relative w-full max-w-2xl max-h-[92vh] flex flex-col bg-[#0f172a] sm:bg-[#111827] border border-[#374151] rounded-2xl shadow-2xl text-white overflow-hidden animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="p-5 sm:p-6 pb-4 border-b border-[#374151] bg-[#030712] flex items-center justify-between gap-4 shrink-0">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#2563eb] border border-[#3b82f6] flex items-center justify-center text-white shrink-0 shadow-lg shadow-blue-500/20">
                      <CheckSquare className="w-5 h-5 text-white stroke-[2.5]" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-medium text-white tracking-wider uppercase bg-[#1f2937] px-2 py-0.5 rounded border border-[#374151]">
                          Roteiro Assistido • 15–30 min
                        </span>
                        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${getStatusColor(activeChecklistTenant.lifecycleStatus)}`}>
                          {activeChecklistTenant.lifecycleStatus}
                        </span>
                      </div>
                      <h3 className="text-lg sm:text-xl font-bold text-white mt-1">
                        {activeChecklistTenant.name}
                      </h3>
                    </div>
                  </div>

                  <button
                    onClick={() => setActiveChecklistTenant(null)}
                    className="p-2 text-white bg-[#1f2937] hover:bg-[#374151] border border-[#4b5563] rounded-xl transition cursor-pointer active:scale-95"
                    aria-label="Fechar roteiro"
                  >
                    <X className="w-4 h-4 text-white" />
                  </button>
                </div>

                {/* Conteúdo com Scroll */}
                <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
                  {/* Card de Progresso Dinâmico */}
                  <div className="bg-[#030712] border border-[#374151] rounded-xl p-4 space-y-3 shadow-inner">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-white">Progresso da Sessão</span>
                        <span className="text-[11px] text-white font-normal">
                          ({completedCount} de {totalSteps} etapas concluídas)
                        </span>
                      </div>
                      <span
                        className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border transition-colors ${
                          isAllDone
                            ? 'bg-[#059669] border-[#10b981] text-white shadow-sm shadow-emerald-500/30'
                            : percent >= 50
                            ? 'bg-[#2563eb] border-[#3b82f6] text-white shadow-sm shadow-blue-500/30'
                            : 'bg-[#d97706] border-[#f59e0b] text-white shadow-sm shadow-amber-500/30'
                        }`}
                      >
                        {percent}% concluído
                      </span>
                    </div>

                    {/* Barra de Progresso com Transição Suave */}
                    <div className="h-2.5 w-full bg-[#111827] border border-[#374151] rounded-full overflow-hidden p-0.5">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ease-out ${
                          isAllDone
                            ? 'bg-[#059669]'
                            : percent >= 50
                            ? 'bg-[#2563eb]'
                            : 'bg-[#d97706]'
                        }`}
                        style={{ width: `${percent}%` }}
                      />
                    </div>

                    <p className="text-[11px] text-white font-normal leading-relaxed">
                      💡 Conduza a chamada marcando cada etapa. Os passos técnicos são verificados automaticamente e os testes práticos podem ser checados ao vivo com o cliente.
                    </p>
                  </div>

                  {/* Banner de Celebração de 100% Concluído */}
                  {isAllDone && (
                    <div className="p-4 bg-[#059669] border border-[#10b981] rounded-xl text-white shadow-lg shadow-emerald-500/20 flex items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
                      <div className="p-2 rounded-lg bg-[#030712] text-white shrink-0 border border-white/20">
                        <CheckCheck className="w-5 h-5 text-white stroke-[2.5]" />
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-white">
                          Onboarding 100% Concluído com Sucesso!
                        </div>
                        <p className="text-[11px] text-white font-normal mt-0.5">
                          A barbearia concluiu todos os 12 passos assistidos e está totalmente ativada para operar no sistema.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Filtros em Abas */}
                  <div className="flex items-center justify-between gap-2 border-b border-[#374151] pb-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        type="button"
                        onClick={() => setModalFilter('ALL')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer border ${
                          modalFilter === 'ALL'
                            ? 'bg-[#2563eb] text-white border-[#3b82f6] shadow-sm'
                            : 'bg-[#030712] text-white border-[#374151] hover:bg-[#1f2937]'
                        }`}
                      >
                        Todos ({totalSteps})
                      </button>
                      <button
                        type="button"
                        onClick={() => setModalFilter('PENDING')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer border ${
                          modalFilter === 'PENDING'
                            ? 'bg-[#2563eb] text-white border-[#3b82f6] shadow-sm'
                            : 'bg-[#030712] text-white border-[#374151] hover:bg-[#1f2937]'
                        }`}
                      >
                        Pendentes ({totalSteps - completedCount})
                      </button>
                      <button
                        type="button"
                        onClick={() => setModalFilter('DONE')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer border ${
                          modalFilter === 'DONE'
                            ? 'bg-[#2563eb] text-white border-[#3b82f6] shadow-sm'
                            : 'bg-[#030712] text-white border-[#374151] hover:bg-[#1f2937]'
                        }`}
                      >
                        Concluídos ({completedCount})
                      </button>
                    </div>

                    <span className="text-[11px] text-white font-normal hidden sm:inline-block">
                      Clique no item para alterar
                    </span>
                  </div>

                  {/* Lista de Passos do Roteiro */}
                  <div className="space-y-2.5">
                    {filteredSteps.map((step) => {
                      const isNext = !step.isDone && step.id === firstPendingStepId

                      return (
                        <div
                          key={step.id}
                          onClick={() => toggleManualStep(tenantId, step.id)}
                          className={`group relative p-3.5 rounded-xl border flex items-start gap-3.5 cursor-pointer transition-all duration-200 select-none ${
                            step.isDone
                              ? 'bg-[#022c22] border-[#059669] hover:bg-[#064e3b] hover:border-[#10b981] hover:-translate-y-0.5 shadow-sm'
                              : isNext
                              ? 'bg-[#0b1329] border-[#2563eb] hover:bg-[#1e293b] ring-1 ring-[#3b82f6] hover:-translate-y-0.5 shadow-md shadow-blue-500/10'
                              : 'bg-[#030712] border-[#374151] hover:bg-[#1f2937] hover:border-[#4b5563] hover:-translate-y-0.5 shadow-sm'
                          }`}
                        >
                          {/* Ícone de Número ou Checkmark */}
                          <div
                            className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 text-xs font-semibold border transition-all duration-200 ${
                              step.isDone
                                ? 'bg-[#059669] text-white border-[#10b981] shadow-md shadow-emerald-500/30'
                                : isNext
                                ? 'bg-[#2563eb] text-white border-[#3b82f6] shadow-md shadow-blue-500/30 group-hover:scale-105'
                                : 'bg-[#111827] text-white border-[#4b5563] group-hover:border-[#3b82f6] group-hover:bg-[#2563eb]'
                            }`}
                          >
                            {step.isDone ? <Check className="w-4 h-4 text-white stroke-[3]" /> : step.number}
                          </div>

                          {/* Informações da Etapa */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2 flex-wrap">
                              <div className="flex items-center gap-2">
                                <strong className="text-xs text-white font-semibold">
                                  Passo {step.number}: {step.title}
                                </strong>
                                {isNext && (
                                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-[#2563eb] text-white border border-[#3b82f6] inline-flex items-center gap-1 animate-pulse">
                                    <Play className="w-2.5 h-2.5 fill-white" /> Próximo Passo
                                  </span>
                                )}
                              </div>

                              <div className="flex items-center gap-2">
                                <span className="text-[10px] text-white font-normal bg-[#030712] px-2 py-0.5 rounded border border-[#374151]">
                                  {step.isAutomated ? 'Auto-Verificado' : 'Teste Prático'}
                                </span>
                                <span
                                  className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${
                                    step.isDone
                                      ? 'bg-[#059669] text-white border-[#10b981]'
                                      : 'bg-[#111827] text-white border-[#374151]'
                                  }`}
                                >
                                  {step.isDone ? 'Concluído ✓' : 'Pendente'}
                                </span>
                              </div>
                            </div>
                            <p className="text-xs text-white font-normal mt-1 leading-relaxed">
                              {step.description}
                            </p>
                            <div className="text-[11px] text-white/50 group-hover:text-white mt-1 transition-colors">
                              {step.isDone ? 'Clique para desmarcar etapa' : 'Clique para marcar como concluído'}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Rodapé da Modal */}
                <div className="p-4 px-5 sm:px-6 border-t border-[#374151] bg-[#030712] flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
                  <div className="flex items-center gap-2 text-xs text-white font-normal">
                    <span>URL Pública:</span>
                    <span className="font-mono text-white bg-[#111827] px-2 py-1 rounded-md border border-[#374151] text-[11px]">
                      /b/{activeChecklistTenant.slug || 'sem-slug'}
                    </span>
                    {activeChecklistTenant.slug && (
                      <button
                        type="button"
                        onClick={() => handleCopyUrl(activeChecklistTenant.slug!, activeChecklistTenant.id)}
                        className="p-1.5 bg-[#111827] hover:bg-[#1f2937] text-white rounded-md border border-[#374151] transition cursor-pointer"
                        title="Copiar URL"
                      >
                        {copiedId === activeChecklistTenant.id ? (
                          <Check className="w-3.5 h-3.5 text-white" />
                        ) : (
                          <Copy className="w-3.5 h-3.5 text-white" />
                        )}
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-2 justify-end">
                    <button
                      type="button"
                      onClick={() => setActiveChecklistTenant(null)}
                      className="px-4 py-2 bg-[#111827] hover:bg-[#1f2937] text-white font-medium text-xs rounded-xl border border-[#374151] transition cursor-pointer"
                    >
                      Fechar
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveChecklistTenant(null)}
                      className="px-5 py-2 bg-[#059669] hover:bg-[#047857] text-white font-medium text-xs rounded-xl border border-[#10b981] shadow-md shadow-emerald-500/20 transition cursor-pointer active:scale-95 flex items-center gap-1.5"
                    >
                      <Check className="w-3.5 h-3.5 text-white stroke-[2.5]" />
                      <span>Concluir Sessão</span>
                    </button>
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
