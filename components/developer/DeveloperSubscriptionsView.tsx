'use client'

import { useState, useEffect, useMemo, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import DropdownHeader from '@/components/shared/DropdownHeader'
import { useAuth } from '@/lib/auth-context'
import { getAuthHeaders } from '@/lib/utils'
import {
  Receipt,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ShieldAlert,
  Search,
  Filter,
  RefreshCw,
  Plus,
  ExternalLink,
  Copy,
  Check,
  ChevronRight,
  DollarSign,
  TrendingUp,
  FileText,
  Calendar,
  Building2,
  Download,
  X,
  CreditCard,
  ArrowUpDown,
  History,
  ShieldCheck,
  User,
  Zap
} from 'lucide-react'

export interface SubscriptionItem {
  id: string
  status: 'TRIALING' | 'ACTIVE' | 'PAST_DUE' | 'SUSPENDED' | 'CANCELED' | 'EXPIRED' | string
  currentPeriodStart?: string
  currentPeriodEnd?: string
  trialStart?: string
  trialEnd?: string
  cancelAtPeriodEnd?: boolean
  canceledAt?: string
  price?: number
  planName?: string
  cycleType?: string
  planType?: string
  notes?: string
  provider?: string
  providerSubscriptionId?: string
  providerCustomerId?: string
  createdAt: string
  updatedAt: string
  barbershop?: {
    id: string
    name: string
    slug: string
    email?: string
    phone?: string
  }
  plan?: {
    id: string
    name: string
    slug: string
    price: number
    billingInterval: string
    cycleType?: string
    planType?: string
  }
  invoices?: Array<{
    id: string
    amount: number
    currency: string
    status: string
    dueDate: string
    paidAt?: string
    provider?: string
    providerInvoiceId?: string
  }>
  events?: Array<{
    id: string
    type: string
    payload: any
    createdAt: string
  }>
}

interface PlanItem {
  id: string
  name: string
  slug: string
  price: number
  billingInterval: string
  planType: string
  cycleType: string
  isActive: boolean
}

interface BarbershopOption {
  id: string
  name: string
  slug: string
  email: string
}

interface DeveloperSubscriptionsViewProps {
  presetStatus?: 'ACTIVE' | 'PAST_DUE' | 'TRIALING' | 'SUSPENDED' | 'CANCELED' | 'ALL'
  pageTitle?: string
  pageSubtitle?: string
}

export default function DeveloperSubscriptionsView({
  presetStatus,
  pageTitle,
  pageSubtitle,
}: DeveloperSubscriptionsViewProps) {
  return (
    <Suspense fallback={<SubscriptionsLoadingSkeleton />}>
      <SubscriptionsContent
        presetStatus={presetStatus}
        pageTitle={pageTitle}
        pageSubtitle={pageSubtitle}
      />
    </Suspense>
  )
}

function SubscriptionsContent({
  presetStatus,
  pageTitle,
  pageSubtitle,
}: DeveloperSubscriptionsViewProps) {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()

  const queryStatus = (searchParams?.get('status') as any) || null
  const defaultStatus = presetStatus || queryStatus || 'ALL'

  const [subscriptions, setSubscriptions] = useState<SubscriptionItem[]>([])
  const [plans, setPlans] = useState<PlanItem[]>([])
  const [barbershops, setBarbershops] = useState<BarbershopOption[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [statusFilter, setStatusFilter] = useState<string>(defaultStatus)
  const [searchTerm, setSearchTerm] = useState('')
  const [planFilter, setPlanFilter] = useState<string>('ALL')
  const [sortBy, setSortBy] = useState<'NEWEST' | 'EXPIRATION' | 'PRICE_DESC' | 'NAME'>('NEWEST')

  // Notificações
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  // Modais
  const [selectedSubForInvoices, setSelectedSubForInvoices] = useState<SubscriptionItem | null>(null)
  const [selectedSubForExtend, setSelectedSubForExtend] = useState<SubscriptionItem | null>(null)
  const [extendDaysInput, setExtendDaysInput] = useState<number>(15)
  const [isExtending, setIsExtending] = useState(false)

  const [selectedSubForStatus, setSelectedSubForStatus] = useState<SubscriptionItem | null>(null)
  const [newStatusInput, setNewStatusInput] = useState<string>('ACTIVE')
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false)

  const [isGrantModalOpen, setIsGrantModalOpen] = useState(false)
  const [grantShopId, setGrantShopId] = useState('')
  const [grantPlanId, setGrantPlanId] = useState('')
  const [grantNotes, setGrantNotes] = useState('')
  const [isGranting, setIsGranting] = useState(false)

  useEffect(() => {
    if (!authLoading && user?.role !== 'DEVELOPER') {
      router.replace('/dashboard')
    }
  }, [user, authLoading, router])

  // Sincroniza status inicial se houver mudanças na prop ou query
  useEffect(() => {
    if (presetStatus) {
      setStatusFilter(presetStatus)
    } else if (queryStatus) {
      setStatusFilter(queryStatus)
    }
  }, [presetStatus, queryStatus])

  const showToast = (type: 'success' | 'error', text: string) => {
    setToastMessage({ type, text })
    setTimeout(() => setToastMessage(null), 4000)
  }

  const loadData = async () => {
    setLoading(true)
    try {
      const headers = getAuthHeaders()
      const [subsRes, plansRes, shopsRes] = await Promise.all([
        fetch('/api/billing/subscriptions', { headers, credentials: 'include' }),
        fetch('/api/billing/plans?all=true', { headers, credentials: 'include' }),
        fetch('/api/developer/barbershops', { headers, credentials: 'include' }),
      ])

      if (subsRes.ok) {
        const subsData = await subsRes.json()
        setSubscriptions(Array.isArray(subsData) ? subsData : [])
      }

      if (plansRes.ok) {
        const plansData = await plansRes.json()
        setPlans(Array.isArray(plansData) ? plansData : [])
      }

      if (shopsRes.ok) {
        const shopsData = await shopsRes.json()
        setBarbershops(Array.isArray(shopsData) ? shopsData : [])
      }
    } catch (err) {
      console.error('Erro ao carregar assinaturas:', err)
      showToast('error', 'Falha ao buscar assinaturas do SaaS')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (user?.role === 'DEVELOPER') {
      loadData()
    }
  }, [user])

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const handleSyncAbacate = async () => {
    setSyncing(true)
    try {
      const headers = getAuthHeaders()
      const res = await fetch('/api/billing/customers?sync=all', {
        headers,
        credentials: 'include',
      })
      if (res.ok) {
        showToast('success', 'Assinaturas e clientes sincronizados com AbacatePay com sucesso!')
        await loadData()
      } else {
        showToast('error', 'Falha ao sincronizar com AbacatePay')
      }
    } catch {
      showToast('error', 'Erro ao conectar ao provedor de pagamento')
    } finally {
      setSyncing(false)
    }
  }

  const handleExtendSubscription = async () => {
    if (!selectedSubForExtend) return
    setIsExtending(true)
    try {
      const headers = getAuthHeaders({ 'Content-Type': 'application/json' })
      const res = await fetch('/api/billing/subscriptions', {
        method: 'PATCH',
        headers,
        credentials: 'include',
        body: JSON.stringify({
          subscriptionId: selectedSubForExtend.id,
          extendDays: Number(extendDaysInput),
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Erro ao estender prazo')
      }

      showToast('success', `Prazo estendido em +${extendDaysInput} dias com sucesso!`)
      setSelectedSubForExtend(null)
      await loadData()
    } catch (err: any) {
      showToast('error', err.message || 'Erro ao estender assinatura')
    } finally {
      setIsExtending(false)
    }
  }

  const handleUpdateStatus = async () => {
    if (!selectedSubForStatus) return
    setIsUpdatingStatus(true)
    try {
      const headers = getAuthHeaders({ 'Content-Type': 'application/json' })
      const res = await fetch('/api/billing/subscriptions', {
        method: 'PATCH',
        headers,
        credentials: 'include',
        body: JSON.stringify({
          subscriptionId: selectedSubForStatus.id,
          status: newStatusInput,
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Erro ao alterar status')
      }

      showToast('success', `Status da assinatura alterado para ${newStatusInput}!`)
      setSelectedSubForStatus(null)
      await loadData()
    } catch (err: any) {
      showToast('error', err.message || 'Erro ao alterar status')
    } finally {
      setIsUpdatingStatus(false)
    }
  }

  const handleGrantSubscription = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!grantShopId || !grantPlanId) {
      showToast('error', 'Selecione a barbearia e o plano')
      return
    }

    setIsGranting(true)
    try {
      const headers = getAuthHeaders({ 'Content-Type': 'application/json' })
      const res = await fetch('/api/billing/subscriptions', {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({
          barbershopId: grantShopId,
          planId: grantPlanId,
          notes: grantNotes.trim() || undefined,
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Erro ao conceder assinatura')
      }

      showToast('success', 'Assinatura concedida com sucesso!')
      setIsGrantModalOpen(false)
      setGrantShopId('')
      setGrantPlanId('')
      setGrantNotes('')
      await loadData()
    } catch (err: any) {
      showToast('error', err.message || 'Falha ao conceder plano')
    } finally {
      setIsGranting(false)
    }
  }

  const handleExportCSV = () => {
    if (subscriptions.length === 0) return
    const headers = ['ID', 'Barbearia', 'Slug', 'Plano', 'Valor', 'Ciclo', 'Status', 'Fim Periodo', 'Provedor']
    const rows = filteredSubscriptions.map((s) => [
      s.id,
      s.barbershop?.name || '',
      s.barbershop?.slug || '',
      s.plan?.name || s.planName || '',
      s.plan?.price || s.price || 0,
      s.plan?.billingInterval || s.cycleType || 'MONTHLY',
      s.status,
      s.currentPeriodEnd ? new Date(s.currentPeriodEnd).toLocaleDateString('pt-BR') : '',
      s.provider || 'ABACATEPAY',
    ])

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.map((val) => `"${val}"`).join(','))].join('\n')

    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `assinaturas_saas_${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // Estatísticas e Métricas Globais
  const stats = useMemo(() => {
    let mrr = 0
    let activeCount = 0
    let trialingCount = 0
    let pastDueCount = 0
    let pastDueAmount = 0
    let suspendedCount = 0
    let canceledCount = 0

    subscriptions.forEach((sub) => {
      const price = Number(sub.plan?.price ?? sub.price ?? 0)
      const interval = sub.plan?.billingInterval || sub.cycleType || 'MONTHLY'
      const monthlyEquivalent = interval === 'YEARLY' ? price / 12 : price

      if (sub.status === 'ACTIVE') {
        activeCount++
        mrr += monthlyEquivalent
      } else if (sub.status === 'TRIALING') {
        trialingCount++
      } else if (sub.status === 'PAST_DUE' || sub.status === 'EXPIRED') {
        pastDueCount++
        pastDueAmount += price
      } else if (sub.status === 'SUSPENDED') {
        suspendedCount++
      } else if (sub.status === 'CANCELED') {
        canceledCount++
      }
    })

    return {
      mrr,
      activeCount,
      trialingCount,
      pastDueCount,
      pastDueAmount,
      suspendedCount,
      canceledCount,
      totalCount: subscriptions.length,
    }
  }, [subscriptions])

  // Filtragem e Ordenação
  const filteredSubscriptions = useMemo(() => {
    return subscriptions
      .filter((sub) => {
        // Filtro de status
        if (statusFilter === 'ACTIVE' && sub.status !== 'ACTIVE') return false
        if (statusFilter === 'TRIALING' && sub.status !== 'TRIALING') return false
        if (
          statusFilter === 'PAST_DUE' &&
          sub.status !== 'PAST_DUE' &&
          sub.status !== 'EXPIRED'
        )
          return false
        if (statusFilter === 'SUSPENDED' && sub.status !== 'SUSPENDED') return false
        if (statusFilter === 'CANCELED' && sub.status !== 'CANCELED') return false

        // Filtro de plano
        if (planFilter !== 'ALL' && sub.plan?.id !== planFilter) return false

        // Filtro de busca
        if (searchTerm.trim()) {
          const q = searchTerm.toLowerCase().trim()
          const name = sub.barbershop?.name?.toLowerCase() || ''
          const slug = sub.barbershop?.slug?.toLowerCase() || ''
          const email = sub.barbershop?.email?.toLowerCase() || ''
          const plan = (sub.plan?.name || sub.planName || '').toLowerCase()
          if (!name.includes(q) && !slug.includes(q) && !email.includes(q) && !plan.includes(q)) {
            return false
          }
        }

        return true
      })
      .sort((a, b) => {
        if (sortBy === 'NEWEST') {
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        }
        if (sortBy === 'EXPIRATION') {
          const dateA = a.currentPeriodEnd ? new Date(a.currentPeriodEnd).getTime() : 0
          const dateB = b.currentPeriodEnd ? new Date(b.currentPeriodEnd).getTime() : 0
          return dateA - dateB
        }
        if (sortBy === 'PRICE_DESC') {
          const priceA = Number(a.plan?.price ?? a.price ?? 0)
          const priceB = Number(b.plan?.price ?? b.price ?? 0)
          return priceB - priceA
        }
        if (sortBy === 'NAME') {
          return (a.barbershop?.name || '').localeCompare(b.barbershop?.name || '')
        }
        return 0
      })
  }, [subscriptions, statusFilter, planFilter, searchTerm, sortBy])

  const formatPrice = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)
  }

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-'
    try {
      return new Date(dateStr).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      })
    } catch {
      return '-'
    }
  }

  const getDaysDiff = (dateStr?: string) => {
    if (!dateStr) return null
    const diff = Math.ceil((new Date(dateStr).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    return diff
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white pb-20 pt-20">
      {/* Header com navegação do sistema */}
      <DropdownHeader />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Toast Notification */}
        {toastMessage && (
          <div
            className={`fixed top-5 right-5 z-50 px-4 py-3 rounded-xl shadow-2xl border text-sm font-bold flex items-center gap-2 ${
              toastMessage.type === 'success'
                ? 'bg-[#059669] border-[#10b981] text-white'
                : 'bg-[#dc2626] border-[#ef4444] text-white'
            }`}
          >
            {toastMessage.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-white stroke-[2.5]" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-white stroke-[2.5]" />
            )}
            <span>{toastMessage.text}</span>
          </div>
        )}

        {/* Título & Ações Principais */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#374151] pb-6">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#2563eb] text-white border border-[#3b82f6]">
                SaaS Revenue Hub
              </span>
              <span className="text-xs text-white font-semibold">• Gestão de Recorrência</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
              <span className="p-1 rounded bg-[#059669] text-white"><Receipt className="w-6 h-6 stroke-[2.5]" /></span>
              {pageTitle || 'Gestão de Assinaturas SaaS'}
            </h1>
            <p className="text-sm text-white font-medium mt-1">
              {pageSubtitle ||
                'Monitore assinaturas ativas, retenção, inadimplência e sincronização de pagamentos das barbearias.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={handleSyncAbacate}
              disabled={syncing}
              className="px-4 py-2.5 rounded-xl text-xs font-bold bg-[#111827] hover:bg-[#1f2937] border border-[#374151] text-white transition flex items-center gap-2 shadow-sm cursor-pointer disabled:opacity-60"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-white ${syncing ? 'animate-spin' : ''}`} />
              <span>{syncing ? 'Sincronizando...' : 'Sincronizar AbacatePay'}</span>
            </button>

            <button
              onClick={handleExportCSV}
              className="px-4 py-2.5 rounded-xl text-xs font-bold bg-[#111827] hover:bg-[#1f2937] border border-[#374151] text-white transition flex items-center gap-2 shadow-sm cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-white stroke-[2.5]" />
              <span>Exportar CSV</span>
            </button>

            <button
              onClick={() => setIsGrantModalOpen(true)}
              className="px-5 py-2.5 rounded-xl text-xs font-bold bg-[#059669] hover:bg-[#047857] text-white transition flex items-center gap-2 shadow-md border border-[#10b981] cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>+ Conceder Assinatura</span>
            </button>
          </div>
        </div>

        {/* 5 Cards de Métricas Principais */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 md:gap-4">
          {/* MRR */}
          <div className="bg-[#111827] border border-[#374151] rounded-2xl p-4 shadow-sm relative overflow-hidden">
            <div className="flex items-center justify-between text-white text-xs font-bold uppercase tracking-wider mb-1">
              <span>MRR Recorrente</span>
              <span className="p-1 rounded bg-[#059669] text-white"><DollarSign className="w-4 h-4 stroke-[2.5]" /></span>
            </div>
            <div className="text-xl md:text-2xl font-black text-white">{formatPrice(stats.mrr)}</div>
            <div className="text-xs text-white mt-1 flex items-center gap-1 font-bold">
              <TrendingUp className="w-3.5 h-3.5 text-[#059669]" />
              <span>Base mensal ativa</span>
            </div>
          </div>

          {/* Ativas */}
          <div
            onClick={() => setStatusFilter('ACTIVE')}
            className={`border rounded-2xl p-4 shadow-sm cursor-pointer transition ${
              statusFilter === 'ACTIVE'
                ? 'bg-[#059669] border-[#10b981]'
                : 'bg-[#111827] border-[#374151] hover:bg-[#1f2937]'
            }`}
          >
            <div className="flex items-center justify-between text-white text-xs font-bold uppercase tracking-wider mb-1">
              <span>Assinaturas Ativas</span>
              <span className="p-1 rounded bg-[#059669] text-white"><CheckCircle2 className="w-4 h-4 stroke-[2.5]" /></span>
            </div>
            <div className="text-xl md:text-2xl font-black text-white">{stats.activeCount}</div>
            <div className="text-xs text-white font-medium mt-1">
              {stats.totalCount > 0
                ? `${Math.round((stats.activeCount / stats.totalCount) * 100)}% de conversão`
                : 'Nenhuma ativa'}
            </div>
          </div>

          {/* Trialing */}
          <div
            onClick={() => setStatusFilter('TRIALING')}
            className={`border rounded-2xl p-4 shadow-sm cursor-pointer transition ${
              statusFilter === 'TRIALING'
                ? 'bg-[#d97706] border-[#f59e0b]'
                : 'bg-[#111827] border-[#374151] hover:bg-[#1f2937]'
            }`}
          >
            <div className="flex items-center justify-between text-white text-xs font-bold uppercase tracking-wider mb-1">
              <span>Em Período de Testes</span>
              <span className="p-1 rounded bg-[#d97706] text-white"><Clock className="w-4 h-4 stroke-[2.5]" /></span>
            </div>
            <div className="text-xl md:text-2xl font-black text-white">{stats.trialingCount}</div>
            <div className="text-xs text-white font-medium mt-1">Em avaliação de 15 dias</div>
          </div>

          {/* Vencidas / Past Due */}
          <div
            onClick={() => setStatusFilter('PAST_DUE')}
            className={`border rounded-2xl p-4 shadow-sm cursor-pointer transition ${
              statusFilter === 'PAST_DUE'
                ? 'bg-[#dc2626] border-[#ef4444]'
                : 'bg-[#111827] border-[#374151] hover:bg-[#1f2937]'
            }`}
          >
            <div className="flex items-center justify-between text-white text-xs font-bold uppercase tracking-wider mb-1">
              <span>Vencidas / Inadimplentes</span>
              <span className="p-1 rounded bg-[#dc2626] text-white"><AlertTriangle className="w-4 h-4 stroke-[2.5]" /></span>
            </div>
            <div className="text-xl md:text-2xl font-black text-white">{stats.pastDueCount}</div>
            <div className="text-xs text-white font-bold mt-1">
              {formatPrice(stats.pastDueAmount)} em risco
            </div>
          </div>

          {/* Suspensas / Canceladas */}
          <div
            onClick={() => setStatusFilter('SUSPENDED')}
            className={`border rounded-2xl p-4 shadow-sm cursor-pointer transition ${
              statusFilter === 'SUSPENDED' || statusFilter === 'CANCELED'
                ? 'bg-[#4b5563] border-[#6b7280]'
                : 'bg-[#111827] border-[#374151] hover:bg-[#1f2937]'
            }`}
          >
            <div className="flex items-center justify-between text-white text-xs font-bold uppercase tracking-wider mb-1">
              <span>Suspensas / Canceladas</span>
              <span className="p-1 rounded bg-[#4b5563] text-white"><ShieldAlert className="w-4 h-4 stroke-[2.5]" /></span>
            </div>
            <div className="text-xl md:text-2xl font-black text-white">
              {stats.suspendedCount + stats.canceledCount}
            </div>
            <div className="text-xs text-white font-medium mt-1">
              {stats.suspendedCount} susp. • {stats.canceledCount} canc.
            </div>
          </div>
        </div>

        {/* Barra de Filtros, Abas & Busca */}
        <div className="space-y-4">
          {/* Abas Rápidas por Status */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-[#374151]">
            <button
              onClick={() => setStatusFilter('ALL')}
              className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition flex items-center gap-1.5 cursor-pointer border ${
                statusFilter === 'ALL'
                  ? 'bg-[#2563eb] text-white border-[#3b82f6]'
                  : 'bg-[#111827] text-white border-[#374151] hover:bg-[#1f2937]'
              }`}
            >
              <span>Todas</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] bg-[#030712] text-white border border-[#374151]">
                {stats.totalCount}
              </span>
            </button>

            <button
              onClick={() => setStatusFilter('ACTIVE')}
              className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition flex items-center gap-1.5 cursor-pointer border ${
                statusFilter === 'ACTIVE'
                  ? 'bg-[#059669] text-white border-[#10b981]'
                  : 'bg-[#111827] text-white border-[#374151] hover:bg-[#1f2937]'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Ativas</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] bg-[#030712] text-white border border-[#374151]">
                {stats.activeCount}
              </span>
            </button>

            <button
              onClick={() => setStatusFilter('TRIALING')}
              className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition flex items-center gap-1.5 cursor-pointer border ${
                statusFilter === 'TRIALING'
                  ? 'bg-[#d97706] text-white border-[#f59e0b]'
                  : 'bg-[#111827] text-white border-[#374151] hover:bg-[#1f2937]'
              }`}
            >
              <Clock className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Em Trial</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] bg-[#030712] text-white border border-[#374151]">
                {stats.trialingCount}
              </span>
            </button>

            <button
              onClick={() => setStatusFilter('PAST_DUE')}
              className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition flex items-center gap-1.5 cursor-pointer border ${
                statusFilter === 'PAST_DUE'
                  ? 'bg-[#dc2626] text-white border-[#ef4444]'
                  : 'bg-[#111827] text-white border-[#374151] hover:bg-[#1f2937]'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Vencidas / Inadimplentes</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] bg-[#030712] text-white border border-[#374151]">
                {stats.pastDueCount}
              </span>
            </button>

            <button
              onClick={() => setStatusFilter('SUSPENDED')}
              className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition flex items-center gap-1.5 cursor-pointer border ${
                statusFilter === 'SUSPENDED'
                  ? 'bg-[#ea580c] text-white border-[#f97316]'
                  : 'bg-[#111827] text-white border-[#374151] hover:bg-[#1f2937]'
              }`}
            >
              <ShieldAlert className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Suspensas</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] bg-[#030712] text-white border border-[#374151]">
                {stats.suspendedCount}
              </span>
            </button>

            <button
              onClick={() => setStatusFilter('CANCELED')}
              className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition flex items-center gap-1.5 cursor-pointer border ${
                statusFilter === 'CANCELED'
                  ? 'bg-[#4b5563] text-white border-[#6b7280]'
                  : 'bg-[#111827] text-white border-[#374151] hover:bg-[#1f2937]'
              }`}
            >
              <span>Canceladas</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] bg-[#030712] text-white border border-[#374151]">
                {stats.canceledCount}
              </span>
            </button>
          </div>

          {/* Barra de Filtros Complementares */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
            {/* Input de Busca */}
            <div className="md:col-span-5 relative">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-white" />
              <input
                type="text"
                placeholder="Buscar por barbearia, slug, e-mail do admin..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-[#030712] border border-[#374151] rounded-xl pl-9 pr-4 py-2.5 text-xs text-white placeholder:text-gray-400 font-medium focus:outline-none focus:border-[#2563eb]"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white hover:opacity-80"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Filtro por Plano */}
            <div className="md:col-span-3">
              <select
                value={planFilter}
                onChange={(e) => setPlanFilter(e.target.value)}
                className="w-full bg-[#030712] border border-[#374151] rounded-xl px-3 py-2.5 text-xs text-white font-bold focus:outline-none focus:border-[#2563eb]"
              >
                <option value="ALL" className="bg-[#111827] text-white">Todos os Planos</option>
                {plans.map((p) => (
                  <option key={p.id} value={p.id} className="bg-[#111827] text-white">
                    {p.name} ({formatPrice(Number(p.price))})
                  </option>
                ))}
              </select>
            </div>

            {/* Ordenação */}
            <div className="md:col-span-3">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="w-full bg-[#030712] border border-[#374151] rounded-xl px-3 py-2.5 text-xs text-white font-bold focus:outline-none focus:border-[#2563eb]"
              >
                <option value="NEWEST" className="bg-[#111827] text-white">Mais Recentes</option>
                <option value="EXPIRATION" className="bg-[#111827] text-white">Vencimento Mais Próximo</option>
                <option value="PRICE_DESC" className="bg-[#111827] text-white">Maior Valor</option>
                <option value="NAME" className="bg-[#111827] text-white">Nome da Barbearia (A-Z)</option>
              </select>
            </div>

            {/* Contagem */}
            <div className="md:col-span-1 text-right text-xs text-white font-bold">
              {filteredSubscriptions.length} {filteredSubscriptions.length === 1 ? 'item' : 'itens'}
            </div>
          </div>
        </div>

        {/* Tabela de Assinaturas */}
        <div className="bg-[#111827] border border-[#374151] rounded-2xl shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-8 space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-16 bg-[#030712] rounded-xl border border-[#374151]" />
              ))}
            </div>
          ) : filteredSubscriptions.length === 0 ? (
            <div className="text-center py-16 px-4">
              <Receipt className="w-12 h-12 text-white/40 mx-auto mb-3" />
              <h3 className="text-base font-bold text-white">Nenhuma assinatura encontrada</h3>
              <p className="text-xs text-white font-medium mt-1 max-w-md mx-auto">
                Não há assinaturas cadastradas correspondentes ao filtro atual ({statusFilter}). Altere os filtros
                ou conceda uma nova assinatura.
              </p>
              <div className="mt-4 flex justify-center gap-2">
                <button
                  onClick={() => {
                    setStatusFilter('ALL')
                    setSearchTerm('')
                    setPlanFilter('ALL')
                  }}
                  className="px-4 py-2 text-xs font-bold rounded-lg bg-[#1f2937] text-white border border-[#4b5563] hover:bg-[#374151] cursor-pointer"
                >
                  Limpar Filtros
                </button>
                <button
                  onClick={() => setIsGrantModalOpen(true)}
                  className="px-4 py-2 text-xs rounded-lg bg-[#059669] text-white font-bold hover:bg-[#047857] border border-[#10b981] cursor-pointer"
                >
                  Conceder Assinatura
                </button>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#374151] bg-[#030712] text-white font-bold uppercase text-[11px]">
                    <th className="py-3.5 px-4 font-bold">Barbearia / Empresa</th>
                    <th className="py-3.5 px-4 font-bold">Plano Contratado</th>
                    <th className="py-3.5 px-4 font-bold">Valor & Ciclo</th>
                    <th className="py-3.5 px-4 font-bold">Status</th>
                    <th className="py-3.5 px-4 font-bold">Vigência / Vencimento</th>
                    <th className="py-3.5 px-4 font-bold">Provedor</th>
                    <th className="py-3.5 px-4 text-right font-bold">Ações de Gestão</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#374151] bg-[#111827] text-white">
                  {filteredSubscriptions.map((sub) => {
                    const priceVal = Number(sub.plan?.price ?? sub.price ?? 0)
                    const diffDays = getDaysDiff(sub.currentPeriodEnd || sub.trialEnd)

                    return (
                      <tr key={sub.id} className="hover:bg-[#1f2937] transition-colors">
                        {/* Barbearia */}
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-[#059669] border border-[#10b981] flex items-center justify-center text-white font-bold text-xs shrink-0">
                              <Building2 className="w-4 h-4 stroke-[2.5]" />
                            </div>
                            <div className="min-w-0">
                              <div className="font-bold text-white truncate flex items-center gap-1.5">
                                <span>{sub.barbershop?.name || 'Barbearia'}</span>
                              </div>
                              <div className="flex items-center gap-2 mt-0.5 text-xs text-white">
                                <span className="font-mono text-white font-bold bg-[#030712] px-2 py-0.5 rounded border border-[#374151]">
                                  /b/{sub.barbershop?.slug || sub.barbershop?.id}
                                </span>
                                {sub.barbershop?.slug && (
                                  <Link
                                    href={`/b/${sub.barbershop.slug}`}
                                    target="_blank"
                                    className="text-white hover:text-[#3b82f6]"
                                    title="Abrir página pública"
                                  >
                                    <ExternalLink className="w-3.5 h-3.5" />
                                  </Link>
                                )}
                              </div>
                              {sub.barbershop?.email && (
                                <div className="text-[11px] text-white font-medium truncate mt-0.5">
                                  {sub.barbershop.email}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Plano */}
                        <td className="py-4 px-4">
                          <div className="font-bold text-white">
                            {sub.plan?.name || sub.planName || 'Plano Padrão'}
                          </div>
                          <div className="text-[11px] text-white font-semibold mt-0.5">
                            {sub.plan?.planType === 'COURTESY' ? (
                              <span className="text-white bg-[#d97706] px-2 py-0.5 rounded font-bold">★ Cortesia Developer</span>
                            ) : (
                              <span>Plano Comercial SaaS</span>
                            )}
                          </div>
                        </td>

                        {/* Valor & Ciclo */}
                        <td className="py-4 px-4">
                          <div className="font-bold text-white text-sm">{formatPrice(priceVal)}</div>
                          <div className="text-xs text-white font-medium">
                            {sub.plan?.billingInterval === 'YEARLY'
                              ? 'Cobrança Anual'
                              : sub.plan?.billingInterval === 'QUARTERLY'
                              ? 'Cobrança Trimestral'
                              : 'Cobrança Mensal'}
                          </div>
                        </td>

                        {/* Status Badge */}
                        <td className="py-4 px-4">
                          {sub.status === 'ACTIVE' && (
                            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#059669] text-white border border-[#10b981]">
                              <CheckCircle2 className="w-3.5 h-3.5 stroke-[2.5]" />
                              <span>Ativa</span>
                            </div>
                          )}

                          {sub.status === 'TRIALING' && (
                            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#d97706] text-white border border-[#f59e0b]">
                              <Clock className="w-3.5 h-3.5 stroke-[2.5]" />
                              <span>Trial ({diffDays !== null ? `${diffDays}d` : '-'})</span>
                            </div>
                          )}

                          {(sub.status === 'PAST_DUE' || sub.status === 'EXPIRED') && (
                            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#dc2626] text-white border border-[#ef4444]">
                              <AlertTriangle className="w-3.5 h-3.5 stroke-[2.5]" />
                              <span>Vencida</span>
                              {diffDays !== null && diffDays < 0 && (
                                <span className="text-[11px] font-bold">({Math.abs(diffDays)}d atraso)</span>
                              )}
                            </div>
                          )}

                          {sub.status === 'SUSPENDED' && (
                            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#ea580c] text-white border border-[#f97316]">
                              <ShieldAlert className="w-3.5 h-3.5 stroke-[2.5]" />
                              <span>Suspensa</span>
                            </div>
                          )}

                          {sub.status === 'CANCELED' && (
                            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#4b5563] text-white border border-[#6b7280]">
                              <span>Cancelada</span>
                            </div>
                          )}
                        </td>

                        {/* Vigência / Vencimento */}
                        <td className="py-4 px-4">
                          <div className="text-white font-bold text-xs">
                            {formatDate(sub.currentPeriodEnd || sub.trialEnd)}
                          </div>
                          <div className="text-[11px] text-white font-semibold mt-0.5">
                            {diffDays !== null ? (
                              diffDays > 0 ? (
                                <span className="text-white">{diffDays} dias restantes</span>
                              ) : diffDays === 0 ? (
                                <span className="text-[#f59e0b] font-bold">Vence hoje!</span>
                              ) : (
                                <span className="text-[#ef4444] font-bold">{Math.abs(diffDays)} dias em atraso</span>
                              )
                            ) : (
                              'Sem data limite'
                            )}
                          </div>
                        </td>

                        {/* Provedor */}
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-1.5">
                            <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-[#030712] text-white border border-[#374151]">
                              {sub.provider === 'ABACATEPAY'
                                ? 'AbacatePay'
                                : sub.provider === 'NONE'
                                ? 'Cortesia'
                                : sub.provider || 'SaaS Direct'}
                            </span>
                          </div>
                          {sub.providerCustomerId && (
                            <button
                              onClick={() => handleCopy(sub.providerCustomerId!, sub.id)}
                              className="text-xs font-mono text-white hover:text-[#3b82f6] flex items-center gap-1 mt-1 cursor-pointer"
                              title="Copiar ID do cliente"
                            >
                              <span>{sub.providerCustomerId.slice(0, 14)}...</span>
                              {copiedId === sub.id ? (
                                <Check className="w-3 h-3 text-[#059669]" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </button>
                          )}
                        </td>

                        {/* Ações */}
                        <td className="py-4 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Ver Faturas */}
                            <button
                              onClick={() => setSelectedSubForInvoices(sub)}
                              className="p-2 rounded-lg bg-[#1f2937] hover:bg-[#374151] text-white border border-[#4b5563] transition cursor-pointer"
                              title="Ver Faturas e Histórico"
                            >
                              <FileText className="w-3.5 h-3.5" />
                            </button>

                            {/* Estender Prazo (+ Dias) */}
                            <button
                              onClick={() => {
                                setSelectedSubForExtend(sub)
                                setExtendDaysInput(15)
                              }}
                              className="px-3 py-1.5 rounded-lg bg-[#059669] hover:bg-[#047857] text-white border border-[#10b981] transition text-xs font-bold cursor-pointer"
                              title="Conceder dias extras de vigência"
                            >
                              + Dias
                            </button>

                            {/* Alterar Status */}
                            <button
                              onClick={() => {
                                setSelectedSubForStatus(sub)
                                setNewStatusInput(sub.status)
                              }}
                              className="p-2 rounded-lg bg-[#2563eb] hover:bg-[#1d4ed8] text-white border border-[#3b82f6] transition cursor-pointer"
                              title="Mudar Status Operacional"
                            >
                              <ArrowUpDown className="w-3.5 h-3.5 stroke-[2.5]" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* Modal: Faturas e Histórico da Assinatura */}
      {selectedSubForInvoices && (
        <div className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4">
          <div className="bg-[#111827] border border-[#374151] rounded-2xl w-full max-w-2xl p-6 shadow-2xl relative space-y-6">
            <button
              onClick={() => setSelectedSubForInvoices(null)}
              className="absolute top-4 right-4 p-2 rounded-lg text-white bg-[#1f2937] hover:bg-[#374151] border border-[#4b5563]"
            >
              <X className="w-4 h-4" />
            </button>

            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#059669] text-white border border-[#10b981]">
                  Faturas & Invoices
                </span>
                <span className="text-xs text-white font-mono">
                  ID: {selectedSubForInvoices.id}
                </span>
              </div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <span className="p-1 rounded bg-[#059669] text-white"><Receipt className="w-5 h-5 stroke-[2.5]" /></span>
                {selectedSubForInvoices.barbershop?.name || 'Assinatura'}
              </h2>
              <p className="text-xs text-white font-medium mt-1">
                Plano: {selectedSubForInvoices.plan?.name || selectedSubForInvoices.planName} •{' '}
                {formatPrice(Number(selectedSubForInvoices.plan?.price ?? selectedSubForInvoices.price ?? 0))}
              </p>
            </div>

            {/* Invoices List */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                Faturas Geradas ({selectedSubForInvoices.invoices?.length || 0})
              </h3>

              {!selectedSubForInvoices.invoices || selectedSubForInvoices.invoices.length === 0 ? (
                <div className="text-center py-8 border border-dashed border-[#374151] rounded-xl text-xs text-white font-medium">
                  Nenhuma fatura registrada nesta assinatura ainda.
                </div>
              ) : (
                <div className="divide-y divide-[#374151] border border-[#374151] rounded-xl overflow-hidden bg-[#030712]">
                  {selectedSubForInvoices.invoices.map((inv) => (
                    <div key={inv.id} className="p-3.5 flex items-center justify-between text-xs">
                      <div>
                        <div className="font-bold text-white text-sm">
                          {formatPrice(Number(inv.amount))}
                        </div>
                        <div className="text-xs text-white font-medium mt-0.5">
                          Vencimento: {formatDate(inv.dueDate)}{' '}
                          {inv.paidAt && `• Pago em ${formatDate(inv.paidAt)}`}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {inv.status === 'PAID' ? (
                          <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#059669] text-white border border-[#10b981]">
                            Paga
                          </span>
                        ) : inv.status === 'OPEN' ? (
                          <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#d97706] text-white border border-[#f59e0b]">
                            Aberta
                          </span>
                        ) : (
                          <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#1f2937] text-white border border-[#374151]">
                            {inv.status}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Eventos da Máquina de Estados */}
            {selectedSubForInvoices.events && selectedSubForInvoices.events.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                  Linha do Tempo (Eventos)
                </h3>
                <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                  {selectedSubForInvoices.events.map((ev) => (
                    <div
                      key={ev.id}
                      className="text-xs p-2.5 rounded-lg bg-[#030712] border border-[#374151] flex items-center justify-between"
                    >
                      <span className="font-mono text-white font-bold">{ev.type}</span>
                      <span className="text-white font-medium">{formatDate(ev.createdAt)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end pt-3 border-t border-[#374151]">
              <button
                onClick={() => setSelectedSubForInvoices(null)}
                className="px-5 py-2.5 rounded-xl text-xs font-bold bg-[#1f2937] hover:bg-[#374151] text-white border border-[#4b5563] cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Estender Vigência / Conceder Carência */}
      {selectedSubForExtend && (
        <div className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4">
          <div className="bg-[#111827] border border-[#374151] rounded-2xl w-full max-w-md p-6 shadow-2xl relative space-y-5">
            <button
              onClick={() => setSelectedSubForExtend(null)}
              className="absolute top-4 right-4 p-2 rounded-lg text-white bg-[#1f2937] hover:bg-[#374151] border border-[#4b5563]"
            >
              <X className="w-4 h-4" />
            </button>

            <div>
              <div className="flex items-center gap-1.5 text-white text-xs font-bold mb-1">
                <span className="p-1 rounded bg-[#059669] text-white"><Clock className="w-3.5 h-3.5 stroke-[2.5]" /></span>
                <span>Extensão de Vigência Comercial</span>
              </div>
              <h2 className="text-lg font-bold text-white mt-1">
                Estender Prazo: {selectedSubForExtend.barbershop?.name}
              </h2>
              <p className="text-xs text-white font-medium mt-1">
                Adicione dias extras de contrato ou carência à assinatura desta barbearia.
              </p>
            </div>

            <div className="space-y-3">
              <label className="text-xs text-white font-bold block">
                Quantidade de dias adicionais:
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[7, 15, 30].map((days) => (
                  <button
                    key={days}
                    type="button"
                    onClick={() => setExtendDaysInput(days)}
                    className={`py-2 rounded-xl text-xs font-bold border transition cursor-pointer ${
                      extendDaysInput === days
                        ? 'bg-[#059669] text-white border-[#10b981]'
                        : 'bg-[#030712] border-[#374151] text-white hover:bg-[#1f2937]'
                    }`}
                  >
                    +{days} Dias
                  </button>
                ))}
              </div>

              <input
                type="number"
                min="1"
                max="365"
                value={extendDaysInput}
                onChange={(e) => setExtendDaysInput(Number(e.target.value))}
                className="w-full bg-[#030712] border border-[#374151] rounded-xl px-3 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-[#059669]"
                placeholder="Ou digite o número de dias..."
              />
            </div>

            <div className="bg-[#030712] p-3 rounded-xl border border-[#374151] text-xs text-white font-medium">
              Vigência atual termina em:{' '}
              <span className="text-white font-bold">
                {formatDate(selectedSubForExtend.currentPeriodEnd || selectedSubForExtend.trialEnd)}
              </span>
              . Com a extensão, o status será reativado caso estivesse vencida.
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-[#374151]">
              <button
                type="button"
                onClick={() => setSelectedSubForExtend(null)}
                className="px-4 py-2.5 rounded-xl text-xs font-bold bg-[#1f2937] hover:bg-[#374151] text-white border border-[#4b5563] cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleExtendSubscription}
                disabled={isExtending || extendDaysInput <= 0}
                className="px-5 py-2.5 rounded-xl text-xs bg-[#059669] hover:bg-[#047857] text-white font-bold border border-[#10b981] cursor-pointer disabled:opacity-50"
              >
                {isExtending ? 'Salvando...' : 'Confirmar Extensão'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Alterar Status Operacional */}
      {selectedSubForStatus && (
        <div className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4">
          <div className="bg-[#111827] border border-[#374151] rounded-2xl w-full max-w-md p-6 shadow-2xl relative space-y-5">
            <button
              onClick={() => setSelectedSubForStatus(null)}
              className="absolute top-4 right-4 p-2 rounded-lg text-white bg-[#1f2937] hover:bg-[#374151] border border-[#4b5563]"
            >
              <X className="w-4 h-4" />
            </button>

            <div>
              <div className="flex items-center gap-1.5 text-white text-xs font-bold mb-1">
                <span className="p-1 rounded bg-[#2563eb] text-white"><ArrowUpDown className="w-3.5 h-3.5 stroke-[2.5]" /></span>
                <span>Gestão de Ciclo de Vida</span>
              </div>
              <h2 className="text-lg font-bold text-white mt-1">
                Alterar Status: {selectedSubForStatus.barbershop?.name}
              </h2>
              <p className="text-xs text-white font-medium mt-1">
                Atualize o estado da assinatura. Mudanças para Ativa liberam o acesso do estabelecimento.
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-xs text-white font-bold block">Novo Status:</label>
              <select
                value={newStatusInput}
                onChange={(e) => setNewStatusInput(e.target.value)}
                className="w-full bg-[#030712] border border-[#374151] rounded-xl px-3 py-2.5 text-xs text-white font-bold focus:outline-none focus:border-[#2563eb]"
              >
                <option value="ACTIVE" className="bg-[#111827] text-white">ACTIVE (Ativa - Acesso Total)</option>
                <option value="TRIALING" className="bg-[#111827] text-white">TRIALING (Período de Testes)</option>
                <option value="PAST_DUE" className="bg-[#111827] text-white">PAST_DUE (Vencida / Inadimplente)</option>
                <option value="SUSPENDED" className="bg-[#111827] text-white">SUSPENDED (Suspensa)</option>
                <option value="CANCELED" className="bg-[#111827] text-white">CANCELED (Cancelada)</option>
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-[#374151]">
              <button
                type="button"
                onClick={() => setSelectedSubForStatus(null)}
                className="px-4 py-2.5 rounded-xl text-xs font-bold bg-[#1f2937] hover:bg-[#374151] text-white border border-[#4b5563] cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleUpdateStatus}
                disabled={isUpdatingStatus}
                className="px-5 py-2.5 rounded-xl text-xs bg-[#2563eb] hover:bg-[#1d4ed8] text-white font-bold border border-[#3b82f6] cursor-pointer disabled:opacity-50"
              >
                {isUpdatingStatus ? 'Atualizando...' : 'Salvar Alteração'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Conceder Assinatura Manual / Cortesia */}
      {isGrantModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4">
          <div className="bg-[#111827] border border-[#374151] rounded-2xl w-full max-w-lg p-6 shadow-2xl relative space-y-5">
            <button
              onClick={() => setIsGrantModalOpen(false)}
              className="absolute top-4 right-4 p-2 rounded-lg text-white bg-[#1f2937] hover:bg-[#374151] border border-[#4b5563]"
            >
              <X className="w-4 h-4" />
            </button>

            <div>
              <div className="flex items-center gap-1.5 text-white text-xs font-bold mb-1">
                <span className="p-1 rounded bg-[#059669] text-white"><Plus className="w-3.5 h-3.5 stroke-[2.5]" /></span>
                <span>Nova Vinculação de Plano</span>
              </div>
              <h2 className="text-xl font-bold text-white mt-1">Conceder Assinatura Manual</h2>
              <p className="text-xs text-white font-medium mt-1">
                Atribua um plano de assinatura comercial ou cortesia para qualquer estabelecimento.
              </p>
            </div>

            <form onSubmit={handleGrantSubscription} className="space-y-4">
              <div>
                <label className="text-xs text-white font-bold block mb-1.5">
                  Barbearia / Estabelecimento:
                </label>
                <select
                  value={grantShopId}
                  onChange={(e) => setGrantShopId(e.target.value)}
                  required
                  className="w-full bg-[#030712] border border-[#374151] rounded-xl px-3 py-2.5 text-xs text-white font-bold focus:outline-none focus:border-[#2563eb]"
                >
                  <option value="" className="bg-[#111827] text-white">Selecione o estabelecimento...</option>
                  {barbershops.map((shop) => (
                    <option key={shop.id} value={shop.id} className="bg-[#111827] text-white">
                      {shop.name} ({shop.slug ? `/b/${shop.slug}` : shop.email})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs text-white font-bold block mb-1.5">
                  Plano SaaS a Conceder:
                </label>
                <select
                  value={grantPlanId}
                  onChange={(e) => setGrantPlanId(e.target.value)}
                  required
                  className="w-full bg-[#030712] border border-[#374151] rounded-xl px-3 py-2.5 text-xs text-white font-bold focus:outline-none focus:border-[#2563eb]"
                >
                  <option value="" className="bg-[#111827] text-white">Selecione o plano...</option>
                  {plans.map((p) => (
                    <option key={p.id} value={p.id} className="bg-[#111827] text-white">
                      {p.name} — {formatPrice(Number(p.price))} ({p.billingInterval}){' '}
                      {p.planType === 'COURTESY' ? '★ CORTESIA' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs text-white font-bold block mb-1.5">
                  Observações / Justificativa (Opcional):
                </label>
                <textarea
                  value={grantNotes}
                  onChange={(e) => setGrantNotes(e.target.value)}
                  rows={2}
                  placeholder="Ex: Concessão especial de parceria, upgrade manual ou cortesia de onboarding..."
                  className="w-full bg-[#030712] border border-[#374151] rounded-xl px-3 py-2.5 text-xs text-white font-medium focus:outline-none focus:border-[#2563eb] placeholder:text-gray-400"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#374151]">
                <button
                  type="button"
                  onClick={() => setIsGrantModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold bg-[#1f2937] hover:bg-[#374151] text-white border border-[#4b5563] cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isGranting}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold bg-[#059669] hover:bg-[#047857] text-white border border-[#10b981] cursor-pointer disabled:opacity-50"
                >
                  {isGranting ? 'Concedendo...' : 'Conceder Assinatura'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

function SubscriptionsLoadingSkeleton() {
  return (
    <div className="min-h-screen bg-gray-950 text-white p-8 space-y-6">
      <div className="h-10 w-64 bg-[#111827] border border-[#374151] rounded-xl" />
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-24 bg-[#111827] border border-[#374151] rounded-2xl" />
        ))}
      </div>
      <div className="h-96 bg-[#111827] border border-[#374151] rounded-2xl" />
    </div>
  )
}
