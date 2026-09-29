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
  Sparkles,
  Smartphone,
  PhoneCall,
  CheckSquare,
  ShieldCheck,
  Building2,
  ArrowRight,
  MessageSquare,
  ChevronDown,
} from 'lucide-react'

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

  // Feedback Modal
  const [feedbackTenant, setFeedbackTenant] = useState<TenantItem | null>(null)
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false)

  // Filtro de Status
  const [statusFilter, setStatusFilter] = useState<string>('ALL')

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
        return 'bg-blue-500/10 text-blue-400 border-blue-500/30'
      case 'PENDING':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/30'
      case 'TRIAL':
        return 'bg-purple-500/10 text-purple-400 border-purple-500/30'
      case 'ACTIVE':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
      case 'PAST_DUE':
        return 'bg-orange-500/10 text-orange-400 border-orange-500/30'
      case 'SUSPENDED':
        return 'bg-slate-500/10 text-slate-400 border-slate-500/30'
      case 'CANCELED':
        return 'bg-rose-500/10 text-rose-400 border-rose-500/30'
      default:
        return 'bg-slate-800 text-slate-400 border-slate-700'
    }
  }

  const filteredTenants = statusFilter === 'ALL'
    ? tenants
    : tenants.filter((t) => t.lifecycleStatus === statusFilter)

  return (
    <div className="min-h-screen bg-background text-foreground pb-20 pt-20">
      <DropdownHeader />
      <main className="w-full px-4 md:px-8 max-w-7xl mx-auto space-y-8">
        {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/80 pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-amber-500 mb-1">
            <Link href="/developer" className="hover:underline text-slate-400">
              Developer Hub
            </Link>
            <span>/</span>
            <span>Customer Success & Operations</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white flex items-center gap-3">
            <span>Cockpit de Onboarding (5–10 Clientes Reais)</span>
            <span className="text-xs px-2.5 py-1 bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-full font-bold">
              Fase de Validação SaaS
            </span>
          </h1>
          <p className="text-sm text-slate-400 mt-1 max-w-3xl">
            Acompanhamento operacional em tempo real do ciclo de vida, sessão assistida de 15–30 minutos e ativação dos primeiros clientes piloto.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/developer"
            className="px-4 py-2 text-xs font-medium text-slate-300 hover:text-white bg-slate-900 border border-slate-800 hover:bg-slate-800 rounded-xl transition"
          >
            Voltar ao Developer Hub
          </Link>
          <button
            onClick={loadData}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2 text-xs font-semibold bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl transition shadow-lg shadow-amber-500/20"
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
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
          }`}
        >
          <div className="flex items-center gap-2 text-sm font-medium">
            {message.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
            <span>{message.text}</span>
          </div>
          <button onClick={() => setMessage(null)} className="text-xs hover:underline">
            Fechar
          </button>
        </div>
      )}

      {/* Visual Funnel Bar */}
      <div className="bg-slate-900/90 border border-slate-800/80 rounded-2xl p-6 shadow-xl backdrop-blur-sm">
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-4 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-amber-500" />
          Funil de Adoção dos Clientes Piloto
        </h2>

        <div className="grid grid-cols-3 md:grid-cols-9 gap-2">
          {[
            { stage: 'LEAD', label: '1. Lead', count: metrics?.countsByStatus.LEAD || 0, color: 'border-blue-500/40 bg-blue-500/10 text-blue-400' },
            { stage: 'CADASTRO', label: '2. Cadastro', count: metrics?.countsByStatus.PENDING || 0, color: 'border-amber-500/40 bg-amber-500/10 text-amber-400' },
            { stage: 'TRIAL', label: '3. Trial 30d', count: metrics?.countsByStatus.TRIAL || 0, color: 'border-purple-500/40 bg-purple-500/10 text-purple-400' },
            { stage: 'ONBOARDING', label: '4. Onboarding', count: tenants.filter((t) => t.completionPercentage >= 50 && t.completionPercentage < 100).length, color: 'border-cyan-500/40 bg-cyan-500/10 text-cyan-400' },
            { stage: 'CONFIG', label: '5. Configurado', count: tenants.filter((t) => t.servicesCount > 0 && t.usersCount > 0).length, color: 'border-indigo-500/40 bg-indigo-500/10 text-indigo-400' },
            { stage: '1ST_APPT', label: '6. 1º Agend.', count: metrics?.totalActivated || 0, color: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400' },
            { stage: 'ACTIVE_USE', label: '7. Uso Ativo', count: metrics?.activeWeeklyTenants || 0, color: 'border-teal-500/40 bg-teal-500/10 text-teal-400' },
            { stage: 'FEEDBACK', label: '8. Feedback', count: metrics?.feedbackStats.totalFeedbacks || 0, color: 'border-pink-500/40 bg-pink-500/10 text-pink-400' },
            { stage: 'CONVERSION', label: '9. Conversão', count: metrics?.countsByStatus.ACTIVE || 0, color: 'border-amber-500/40 bg-amber-500/10 text-amber-300' },
          ].map((step, idx) => (
            <div
              key={idx}
              className={`p-3 rounded-xl border flex flex-col items-center justify-center text-center transition hover:scale-[1.02] ${step.color}`}
            >
              <span className="text-[11px] font-medium text-slate-300">{step.label}</span>
              <span className="text-xl font-extrabold mt-0.5">{step.count}</span>
            </div>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Time to First Appointment */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase">
            <span>Time to 1st Appointment</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-black text-white mt-2">
            {metrics?.avgTimeToFirstAppointmentHours !== null && metrics?.avgTimeToFirstAppointmentHours !== undefined
              ? `${metrics.avgTimeToFirstAppointmentHours}h`
              : '—'}
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Meta: &lt; 24h pós-onboarding
          </p>
          <div className="text-[10px] text-slate-500 mt-2">
            Mediana: {metrics?.medianTimeToFirstAppointmentHours ?? '—'}h
          </div>
        </div>

        {/* Taxa de Ativação */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase">
            <span>Taxa de Ativação</span>
            <Sparkles className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-white mt-2">
            {metrics?.activationRate ?? 0}%
          </div>
          <p className="text-xs text-slate-400 mt-1">
            {metrics?.totalActivated ?? 0} de {metrics?.totalTenants ?? 0} barbearias ativadas
          </p>
          <div className="w-full bg-slate-800 h-1.5 rounded-full mt-3 overflow-hidden">
            <div
              className="bg-emerald-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, metrics?.activationRate ?? 0)}%` }}
            />
          </div>
        </div>

        {/* Uso Semanal & Volume */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase">
            <span>Volume de Agendamentos</span>
            <Calendar className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-black text-white mt-2">
            {metrics?.totalAppointments ?? 0}
          </div>
          <p className="text-xs text-slate-400 mt-1">
            {metrics?.activeWeeklyTenants ?? 0} barbearias ativas nesta semana
          </p>
          <div className="text-[10px] text-slate-500 mt-2">
            Indicador crítico de engajamento diário
          </div>
        </div>

        {/* Feedback & CSAT */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase">
            <span>CSAT & Facilidade</span>
            <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
          </div>
          <div className="text-2xl font-black text-white mt-2 flex items-center gap-2">
            <span>{metrics?.feedbackStats.avgSatisfactionScore || '—'}/5</span>
            <span className="text-xs font-normal text-slate-400">
              ({metrics?.feedbackStats.totalFeedbacks ?? 0} avaliações)
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Facilidade: {metrics?.feedbackStats.avgEaseScore || '—'}/5
          </p>
          <div className="text-[10px] text-emerald-400 font-semibold mt-2">
            {metrics?.feedbackStats.continueIntentRatio.yes ?? 0} clientes pretendem continuar
          </div>
        </div>
      </div>

      {/* Tabela Operacional dos Clientes Piloto */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Building2 className="w-5 h-5 text-amber-500" />
              Gestão dos Primeiros Clientes Reais
            </h2>
            <p className="text-xs text-slate-400">
              Gerencie cada etapa do onboarding assistido, URL pública e ciclo de vida do tenant
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-slate-400 font-medium">Filtrar:</span>
            {['ALL', 'TRIAL', 'PENDING', 'ACTIVE', 'PAST_DUE', 'SUSPENDED', 'CANCELED'].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition ${
                  statusFilter === st
                    ? 'bg-amber-500 text-slate-950 border-amber-500'
                    : 'bg-slate-800/80 text-slate-300 border-slate-700 hover:bg-slate-700'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        {/* Tabela */}
        <div className="overflow-x-auto rounded-xl border border-slate-800">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-800/80 text-slate-400 uppercase tracking-wider text-[11px] border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Barbearia / URL Pública</th>
                <th className="py-3 px-4">Status Ciclo de Vida</th>
                <th className="py-3 px-4">Trial (30 Dias)</th>
                <th className="py-3 px-4">Onboarding (12 Passos)</th>
                <th className="py-3 px-4">Ativação (1º Agend.)</th>
                <th className="py-3 px-4">Uso / Contadores</th>
                <th className="py-3 px-4">Última Atividade</th>
                <th className="py-3 px-4 text-right">Ações Operacionais</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-200">
              {filteredTenants.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-500">
                    Nenhuma barbearia encontrada para o filtro selecionado.
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
                    <tr key={shop.id} className="hover:bg-slate-800/40 transition">
                      {/* Nome e URL Pública */}
                      <td className="py-3.5 px-4 font-medium">
                        <div className="text-sm font-bold text-white">{shop.name}</div>
                        {shop.slug ? (
                          <div className="flex items-center gap-1.5 mt-1 text-slate-400 text-xs">
                            <span className="font-mono text-amber-400/90">/b/{shop.slug}</span>
                            <button
                              onClick={() => handleCopyUrl(shop.slug!, shop.id)}
                              className="p-1 hover:text-white rounded hover:bg-slate-700/60 transition"
                              title="Copiar link da página pública"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                            {copiedId === shop.id && (
                              <span className="text-[10px] text-emerald-400 font-bold">Copiado!</span>
                            )}
                            <a
                              href={`/b/${shop.slug}`}
                              target="_blank"
                              rel="noreferrer"
                              className="p-1 hover:text-white rounded hover:bg-slate-700/60 transition"
                              title="Abrir página pública em nova aba"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          </div>
                        ) : (
                          <span className="text-[11px] text-rose-400">Sem slug gerado</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        <div className="relative inline-block">
                          <select
                            value={shop.lifecycleStatus}
                            disabled={actionLoadingId === shop.id}
                            onChange={(e) => handleStatusChange(shop.id, e.target.value)}
                            className={`text-xs font-bold py-1 px-2.5 rounded-lg border appearance-none pr-7 cursor-pointer focus:outline-none ${getStatusColor(
                              shop.lifecycleStatus
                            )}`}
                          >
                            <option value="LEAD" className="bg-slate-900 text-white">LEAD</option>
                            <option value="PENDING" className="bg-slate-900 text-white">PENDING</option>
                            <option value="TRIAL" className="bg-slate-900 text-white">TRIAL</option>
                            <option value="ACTIVE" className="bg-slate-900 text-white">ACTIVE</option>
                            <option value="PAST_DUE" className="bg-slate-900 text-white">PAST_DUE</option>
                            <option value="SUSPENDED" className="bg-slate-900 text-white">SUSPENDED</option>
                            <option value="CANCELED" className="bg-slate-900 text-white">CANCELED</option>
                          </select>
                          <ChevronDown className="w-3 h-3 absolute right-2 top-2.5 pointer-events-none text-current" />
                        </div>
                      </td>

                      {/* Trial */}
                      <td className="py-3.5 px-4">
                        {shop.trial?.isTrial ? (
                          <div className="space-y-0.5">
                            <span className="font-semibold text-purple-300">
                              {shop.trial.daysRemaining} dias restantes
                            </span>
                            <div className="text-[10px] text-slate-400">
                              {shop.trial.trialEnd ? new Date(shop.trial.trialEnd).toLocaleDateString('pt-BR') : '—'}
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-xs">
                            {shop.lifecycleStatus === 'ACTIVE' ? 'Assinatura Ativa' : 'Trial Encerrado'}
                          </span>
                        )}
                      </td>

                      {/* Onboarding Checklist (12 Passos) */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <div className="w-20 bg-slate-800 h-2 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${
                                dynamicPercentage >= 100
                                  ? 'bg-emerald-500'
                                  : dynamicPercentage >= 50
                                  ? 'bg-amber-500'
                                  : 'bg-rose-500'
                              }`}
                              style={{ width: `${dynamicPercentage}%` }}
                            />
                          </div>
                          <span className="font-bold text-xs">{dynamicPercentage}%</span>
                        </div>
                        <div className="text-[10px] text-slate-400 mt-1">
                          {completedCount} de 12 itens
                        </div>
                      </td>

                      {/* Ativação */}
                      <td className="py-3.5 px-4">
                        {shop.isActivated ? (
                          <div className="space-y-0.5">
                            <span className="inline-flex items-center gap-1 text-emerald-400 font-bold">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Ativado
                            </span>
                            <div className="text-[10px] text-slate-400">
                              TTFA: {shop.timeToFirstAppointmentHours !== null ? `${shop.timeToFirstAppointmentHours}h` : 'Registrado'}
                            </div>
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-amber-400 font-medium">
                            <Clock className="w-3.5 h-3.5" /> Aguardando 1º agend.
                          </span>
                        )}
                      </td>

                      {/* Contadores */}
                      <td className="py-3.5 px-4">
                        <div className="text-[11px] space-y-0.5">
                          <div>
                            <span className="text-slate-400">Agendamentos:</span>{' '}
                            <strong className="text-white">{shop.appointmentsCount}</strong>
                          </div>
                          <div>
                            <span className="text-slate-400">Clientes:</span>{' '}
                            <strong className="text-white">{shop.clientsCount}</strong>
                          </div>
                          <div>
                            <span className="text-slate-400">Serviços / Equipe:</span>{' '}
                            <strong className="text-white">{shop.servicesCount}</strong> /{' '}
                            <strong className="text-white">{shop.usersCount}</strong>
                          </div>
                        </div>
                      </td>

                      {/* Última Atividade */}
                      <td className="py-3.5 px-4 text-slate-300">
                        <div className="text-xs">
                          {shop.lastActivity
                            ? new Date(shop.lastActivity).toLocaleDateString('pt-BR', {
                                day: '2-digit',
                                month: '2-digit',
                                hour: '2-digit',
                                minute: '2-digit',
                              })
                            : '—'}
                        </div>
                        <div className="text-[10px] text-slate-500">
                          Acesso: {new Date(shop.lastAccess).toLocaleDateString('pt-BR')}
                        </div>
                      </td>

                      {/* Ações */}
                      <td className="py-3.5 px-4 text-right space-x-2">
                        <button
                          onClick={() => setActiveChecklistTenant(shop)}
                          className="px-2.5 py-1.5 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-amber-400 border border-amber-500/20 rounded-lg transition inline-flex items-center gap-1"
                        >
                          <CheckSquare className="w-3.5 h-3.5" />
                          Sessão 15–30m
                        </button>
                        <button
                          onClick={() => {
                            setFeedbackTenant(shop)
                            setIsFeedbackModalOpen(true)
                          }}
                          className="px-2.5 py-1.5 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-lg transition inline-flex items-center gap-1"
                        >
                          <MessageSquare className="w-3.5 h-3.5 text-pink-400" />
                          Feedback
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Feedbacks Recebidos dos Clientes Piloto */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-pink-400" />
              Voz do Cliente Piloto (Feedbacks Recebidos)
            </h2>
            <p className="text-xs text-slate-400">
              Insights diretos dos proprietários e barbeiros para direcionar melhorias prioritárias
            </p>
          </div>
          <span className="text-xs px-3 py-1 bg-slate-800 border border-slate-700 rounded-full text-slate-300 font-bold">
            {feedbacks.length} avaliações
          </span>
        </div>

        {feedbacks.length === 0 ? (
          <div className="p-8 text-center border border-dashed border-slate-800 rounded-xl text-slate-500 text-xs">
            Nenhum feedback registrado até o momento. Colete o primeiro feedback ao final da sessão assistida ou após 7 dias de uso!
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {feedbacks.map((fb) => (
              <div
                key={fb.id}
                className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-4 space-y-3"
              >
                <div className="flex items-center justify-between border-b border-slate-700/50 pb-2">
                  <div>
                    <strong className="text-xs text-white block">
                      {fb.barbershop?.name || fb.userName || 'Cliente Anônimo'}
                    </strong>
                    <span className="text-[10px] text-slate-400">
                      {new Date(fb.createdAt).toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                      fb.continueIntent === 'YES'
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                        : fb.continueIntent === 'NO'
                        ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                        : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                    }`}
                  >
                    {fb.continueIntent === 'YES'
                      ? 'Pretende Continuar'
                      : fb.continueIntent === 'NO'
                      ? 'Não Continua'
                      : 'Em Dúvida'}
                  </span>
                </div>

                <div className="flex items-center gap-3 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 block">Facilidade:</span>
                    <span className="font-bold text-amber-400">{fb.easeScore}/5 ★</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Satisfação:</span>
                    <span className="font-bold text-amber-400">{fb.satisfactionScore}/5 ★</span>
                  </div>
                </div>

                {fb.mostUsedFeature && (
                  <div className="text-xs">
                    <span className="text-[10px] text-slate-400 block">Mais usada:</span>
                    <span className="text-slate-200">{fb.mostUsedFeature}</span>
                  </div>
                )}

                {fb.missingFeature && (
                  <div className="text-xs">
                    <span className="text-[10px] text-slate-400 block">Faz falta:</span>
                    <span className="text-amber-300">{fb.missingFeature}</span>
                  </div>
                )}

                {fb.problems && (
                  <div className="text-xs">
                    <span className="text-[10px] text-slate-400 block">Dificuldade relatada:</span>
                    <span className="text-slate-300 italic">&quot;{fb.problems}&quot;</span>
                  </div>
                )}

                {fb.bugsReported && (
                  <div className="text-xs p-2 bg-rose-500/10 border border-rose-500/20 rounded-lg text-rose-300">
                    <span className="text-[10px] font-bold block">Bug reportado:</span>
                    {fb.bugsReported}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* MODAL: Checklist da Sessão de Onboarding Assistido (15–30 min) */}
      {activeChecklistTenant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="relative w-full max-w-2xl max-h-[92vh] overflow-y-auto bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 text-slate-100 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <div className="text-xs font-semibold text-amber-400 uppercase tracking-wider">
                  Roteiro de Onboarding Assistido (15–30 min)
                </div>
                <h3 className="text-xl font-bold text-white">
                  {activeChecklistTenant.name}
                </h3>
              </div>
              <button
                onClick={() => setActiveChecklistTenant(null)}
                className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Conduza uma ligação ou chamada de vídeo rápida (Google Meet/WhatsApp) seguindo os 12 passos abaixo. Os passos operacionais são validados automaticamente pelo sistema, e os testes práticos podem ser checados ao vivo.
            </p>

            <div className="space-y-3">
              {activeChecklistTenant.onboardingSteps.map((step) => {
                const manual = manualStepOverrides[activeChecklistTenant.id]?.[step.id]
                const isDone = step.completed || manual

                return (
                  <div
                    key={step.id}
                    onClick={() => toggleManualStep(activeChecklistTenant.id, step.id)}
                    className={`p-3.5 rounded-xl border flex items-start gap-3 cursor-pointer transition select-none ${
                      isDone
                        ? 'bg-emerald-500/10 border-emerald-500/30'
                        : 'bg-slate-800/50 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div
                      className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 mt-0.5 border ${
                        isDone
                          ? 'bg-emerald-500 text-slate-950 border-emerald-500 font-bold'
                          : 'border-slate-600 bg-slate-800 text-slate-400'
                      }`}
                    >
                      {isDone ? '✓' : step.number}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <strong className={`text-xs ${isDone ? 'text-emerald-300' : 'text-white'}`}>
                          Passo {step.number}: {step.title}
                        </strong>
                        <span className="text-[10px] text-slate-500 uppercase tracking-wider">
                          {step.isAutomated ? 'Auto-Verificado' : 'Teste Prático'}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">{step.description}</p>
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-800">
              <div className="text-xs text-slate-400">
                URL Pública:{' '}
                <span className="font-mono text-amber-400">
                  /b/{activeChecklistTenant.slug || 'sem-slug'}
                </span>
              </div>
              <button
                onClick={() => setActiveChecklistTenant(null)}
                className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-xl transition"
              >
                Concluir Sessão
              </button>
            </div>
          </div>
        </div>
      )}

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
