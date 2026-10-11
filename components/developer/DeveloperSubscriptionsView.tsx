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
    <div className="min-h-screen bg-gray-950 text-foreground">
      {/* Header com navegação do sistema */}
      <DropdownHeader />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Toast Notification */}
        {toastMessage && (
          <div
            className={`fixed top-5 right-5 z-50 px-4 py-3 rounded-xl shadow-2xl border text-sm flex items-center gap-2 animate-in fade-in slide-in-from-top-4 duration-300 ${
              toastMessage.type === 'success'
                ? 'bg-emerald-950 border-emerald-500/40 text-emerald-300'
                : 'bg-red-950 border-red-500/40 text-red-300'
            }`}
          >
            {toastMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-red-400" />
            )}
            <span>{toastMessage.text}</span>
          </div>
        )}

        {/* Título & Ações Principais */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/40 pb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                SaaS Revenue Hub
              </span>
              <span className="text-xs text-muted-foreground">• Gestão de Recorrência</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
              <Receipt className="w-7 h-7 text-emerald-400" />
              {pageTitle || 'Gestão de Assinaturas SaaS'}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {pageSubtitle ||
                'Monitore assinaturas ativas, retenção, inadimplência e sincronização de pagamentos das barbearias.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={handleSyncAbacate}
              disabled={syncing}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-card hover:bg-muted border border-border text-foreground transition-all flex items-center gap-2 shadow-sm cursor-pointer disabled:opacity-60"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-emerald-400 ${syncing ? 'animate-spin' : ''}`} />
              <span>{syncing ? 'Sincronizando...' : 'Sincronizar AbacatePay'}</span>
            </button>

            <button
              onClick={handleExportCSV}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-card hover:bg-muted border border-border text-foreground transition-all flex items-center gap-2 shadow-sm cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-blue-400" />
              <span>Exportar CSV</span>
            </button>

            <button
              onClick={() => setIsGrantModalOpen(true)}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-500 hover:bg-emerald-400 text-black font-bold transition-all flex items-center gap-2 shadow-md cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>+ Conceder Assinatura</span>
            </button>
          </div>
        </div>

        {/* 5 Cards de Métricas Principais */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 md:gap-4">
          {/* MRR */}
          <div className="bg-card/70 border border-border/60 rounded-2xl p-4 shadow-sm relative overflow-hidden backdrop-blur-sm">
            <div className="flex items-center justify-between text-muted-foreground text-xs mb-1">
              <span className="font-medium">MRR Recorrente</span>
              <DollarSign className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-xl md:text-2xl font-black text-white">{formatPrice(stats.mrr)}</div>
            <div className="text-[11px] text-emerald-400/90 mt-1 flex items-center gap-1 font-medium">
              <TrendingUp className="w-3 h-3" />
              <span>Base mensal ativa</span>
            </div>
          </div>

          {/* Ativas */}
          <div
            onClick={() => setStatusFilter('ACTIVE')}
            className={`border rounded-2xl p-4 shadow-sm cursor-pointer transition-all ${
              statusFilter === 'ACTIVE'
                ? 'bg-emerald-950/40 border-emerald-500/50 ring-1 ring-emerald-500/30'
                : 'bg-card/70 border-border/60 hover:border-emerald-500/30'
            }`}
          >
            <div className="flex items-center justify-between text-muted-foreground text-xs mb-1">
              <span className="font-medium">Assinaturas Ativas</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-xl md:text-2xl font-black text-emerald-400">{stats.activeCount}</div>
            <div className="text-[11px] text-muted-foreground mt-1">
              {stats.totalCount > 0
                ? `${Math.round((stats.activeCount / stats.totalCount) * 100)}% de conversão`
                : 'Nenhuma ativa'}
            </div>
          </div>

          {/* Trialing */}
          <div
            onClick={() => setStatusFilter('TRIALING')}
            className={`border rounded-2xl p-4 shadow-sm cursor-pointer transition-all ${
              statusFilter === 'TRIALING'
                ? 'bg-amber-950/40 border-amber-500/50 ring-1 ring-amber-500/30'
                : 'bg-card/70 border-border/60 hover:border-amber-500/30'
            }`}
          >
            <div className="flex items-center justify-between text-muted-foreground text-xs mb-1">
              <span className="font-medium">Em Período de Testes</span>
              <Clock className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-xl md:text-2xl font-black text-amber-400">{stats.trialingCount}</div>
            <div className="text-[11px] text-muted-foreground mt-1">Em avaliação de 15 dias</div>
          </div>

          {/* Vencidas / Past Due */}
          <div
            onClick={() => setStatusFilter('PAST_DUE')}
            className={`border rounded-2xl p-4 shadow-sm cursor-pointer transition-all ${
              statusFilter === 'PAST_DUE'
                ? 'bg-red-950/40 border-red-500/50 ring-1 ring-red-500/30'
                : 'bg-card/70 border-border/60 hover:border-red-500/30'
            }`}
          >
            <div className="flex items-center justify-between text-muted-foreground text-xs mb-1">
              <span className="font-medium">Vencidas / Inadimplentes</span>
              <AlertTriangle className="w-4 h-4 text-red-400" />
            </div>
            <div className="text-xl md:text-2xl font-black text-red-400">{stats.pastDueCount}</div>
            <div className="text-[11px] text-red-400/90 mt-1">
              {formatPrice(stats.pastDueAmount)} em risco
            </div>
          </div>

          {/* Suspensas / Canceladas */}
          <div
            onClick={() => setStatusFilter('SUSPENDED')}
            className={`border rounded-2xl p-4 shadow-sm cursor-pointer transition-all ${
              statusFilter === 'SUSPENDED' || statusFilter === 'CANCELED'
                ? 'bg-gray-900 border-gray-600 ring-1 ring-gray-600'
                : 'bg-card/70 border-border/60 hover:border-gray-700'
            }`}
          >
            <div className="flex items-center justify-between text-muted-foreground text-xs mb-1">
              <span className="font-medium">Suspensas / Canceladas</span>
              <ShieldAlert className="w-4 h-4 text-gray-400" />
            </div>
            <div className="text-xl md:text-2xl font-black text-gray-300">
              {stats.suspendedCount + stats.canceledCount}
            </div>
            <div className="text-[11px] text-muted-foreground mt-1">
              {stats.suspendedCount} susp. • {stats.canceledCount} canc.
            </div>
          </div>
        </div>

        {/* Barra de Filtros, Abas & Busca */}
        <div className="space-y-4">
          {/* Abas Rápidas por Status */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none border-b border-border/40">
            <button
              onClick={() => setStatusFilter('ALL')}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
                statusFilter === 'ALL'
                  ? 'bg-white text-black shadow-sm font-bold'
                  : 'text-muted-foreground hover:text-white hover:bg-muted/30'
              }`}
            >
              <span>Todas</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-muted/60 text-foreground">
                {stats.totalCount}
              </span>
            </button>

            <button
              onClick={() => setStatusFilter('ACTIVE')}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
                statusFilter === 'ACTIVE'
                  ? 'bg-emerald-500 text-black shadow-sm font-bold'
                  : 'text-muted-foreground hover:text-emerald-400 hover:bg-emerald-950/20'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Ativas</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-500/20 text-emerald-300">
                {stats.activeCount}
              </span>
            </button>

            <button
              onClick={() => setStatusFilter('TRIALING')}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
                statusFilter === 'TRIALING'
                  ? 'bg-amber-500 text-black shadow-sm font-bold'
                  : 'text-muted-foreground hover:text-amber-400 hover:bg-amber-950/20'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Em Trial</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-500/20 text-amber-300">
                {stats.trialingCount}
              </span>
            </button>

            <button
              onClick={() => setStatusFilter('PAST_DUE')}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
                statusFilter === 'PAST_DUE'
                  ? 'bg-red-500 text-white shadow-sm font-bold'
                  : 'text-muted-foreground hover:text-red-400 hover:bg-red-950/20'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Vencidas / Inadimplentes</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-red-500/20 text-red-300">
                {stats.pastDueCount}
              </span>
            </button>

            <button
              onClick={() => setStatusFilter('SUSPENDED')}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
                statusFilter === 'SUSPENDED'
                  ? 'bg-orange-500 text-black shadow-sm font-bold'
                  : 'text-muted-foreground hover:text-orange-400 hover:bg-orange-950/20'
              }`}
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Suspensas</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-orange-500/20 text-orange-300">
                {stats.suspendedCount}
              </span>
            </button>

            <button
              onClick={() => setStatusFilter('CANCELED')}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
                statusFilter === 'CANCELED'
                  ? 'bg-gray-700 text-white shadow-sm font-bold'
                  : 'text-muted-foreground hover:text-gray-300 hover:bg-gray-900'
              }`}
            >
              <span>Canceladas</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-gray-800 text-gray-400">
                {stats.canceledCount}
              </span>
            </button>
          </div>

          {/* Barra de Filtros Complementares */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
            {/* Input de Busca */}
            <div className="md:col-span-5 relative">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Buscar por barbearia, slug, e-mail do admin..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-card border border-border/80 rounded-xl pl-9 pr-4 py-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-white"
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
                className="w-full bg-card border border-border/80 rounded-xl px-3 py-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-emerald-500"
              >
                <option value="ALL">Todos os Planos</option>
                {plans.map((p) => (
                  <option key={p.id} value={p.id}>
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
                className="w-full bg-card border border-border/80 rounded-xl px-3 py-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-emerald-500"
              >
                <option value="NEWEST">Mais Recentes</option>
                <option value="EXPIRATION">Vencimento Mais Próximo</option>
                <option value="PRICE_DESC">Maior Valor</option>
                <option value="NAME">Nome da Barbearia (A-Z)</option>
              </select>
            </div>

            {/* Contagem */}
            <div className="md:col-span-1 text-right text-xs text-muted-foreground">
              {filteredSubscriptions.length} {filteredSubscriptions.length === 1 ? 'item' : 'itens'}
            </div>
          </div>
        </div>

        {/* Tabela de Assinaturas */}
        <div className="bg-card border border-border/70 rounded-2xl shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-8 space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-16 bg-muted/20 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : filteredSubscriptions.length === 0 ? (
            <div className="text-center py-16 px-4">
              <Receipt className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
              <h3 className="text-base font-semibold text-white">Nenhuma assinatura encontrada</h3>
              <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto">
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
                  className="px-3.5 py-1.5 text-xs rounded-lg bg-muted text-foreground hover:bg-muted/80 cursor-pointer"
                >
                  Limpar Filtros
                </button>
                <button
                  onClick={() => setIsGrantModalOpen(true)}
                  className="px-3.5 py-1.5 text-xs rounded-lg bg-emerald-500 text-black font-semibold hover:bg-emerald-400 cursor-pointer"
                >
                  Conceder Assinatura
                </button>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-border/60 bg-muted/20 text-muted-foreground font-semibold">
                    <th className="py-3.5 px-4">Barbearia / Empresa</th>
                    <th className="py-3.5 px-4">Plano Contratado</th>
                    <th className="py-3.5 px-4">Valor & Ciclo</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4">Vigência / Vencimento</th>
                    <th className="py-3.5 px-4">Provedor</th>
                    <th className="py-3.5 px-4 text-right">Ações de Gestão</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {filteredSubscriptions.map((sub) => {
                    const priceVal = Number(sub.plan?.price ?? sub.price ?? 0)
                    const diffDays = getDaysDiff(sub.currentPeriodEnd || sub.trialEnd)

                    return (
                      <tr key={sub.id} className="hover:bg-muted/10 transition-colors group">
                        {/* Barbearia */}
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold text-xs shrink-0">
                              <Building2 className="w-4 h-4" />
                            </div>
                            <div className="min-w-0">
                              <div className="font-semibold text-white truncate flex items-center gap-1.5">
                                <span>{sub.barbershop?.name || 'Barbearia'}</span>
                              </div>
                              <div className="flex items-center gap-2 mt-0.5 text-[11px] text-muted-foreground">
                                <span className="font-mono text-emerald-400/80">
                                  /b/{sub.barbershop?.slug || sub.barbershop?.id}
                                </span>
                                {sub.barbershop?.slug && (
                                  <Link
                                    href={`/b/${sub.barbershop.slug}`}
                                    target="_blank"
                                    className="hover:text-white"
                                    title="Abrir página pública"
                                  >
                                    <ExternalLink className="w-3 h-3" />
                                  </Link>
                                )}
                              </div>
                              {sub.barbershop?.email && (
                                <div className="text-[10px] text-muted-foreground truncate">
                                  {sub.barbershop.email}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Plano */}
                        <td className="py-4 px-4">
                          <div className="font-semibold text-white">
                            {sub.plan?.name || sub.planName || 'Plano Padrão'}
                          </div>
                          <div className="text-[10px] text-muted-foreground mt-0.5">
                            {sub.plan?.planType === 'COURTESY' ? (
                              <span className="text-amber-400 font-medium">★ Cortesia Developer</span>
                            ) : (
                              <span>Plano Comercial SaaS</span>
                            )}
                          </div>
                        </td>

                        {/* Valor & Ciclo */}
                        <td className="py-4 px-4">
                          <div className="font-bold text-white text-sm">{formatPrice(priceVal)}</div>
                          <div className="text-[10px] text-muted-foreground">
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
                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                              <span>Ativa</span>
                            </div>
                          )}

                          {sub.status === 'TRIALING' && (
                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/30">
                              <Clock className="w-3 h-3" />
                              <span>Trial ({diffDays !== null ? `${diffDays}d` : '-'})</span>
                            </div>
                          )}

                          {(sub.status === 'PAST_DUE' || sub.status === 'EXPIRED') && (
                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-red-500/15 text-red-400 border border-red-500/30">
                              <AlertTriangle className="w-3 h-3" />
                              <span>Vencida</span>
                              {diffDays !== null && diffDays < 0 && (
                                <span className="text-[10px] opacity-80">({Math.abs(diffDays)}d atraso)</span>
                              )}
                            </div>
                          )}

                          {sub.status === 'SUSPENDED' && (
                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-orange-500/15 text-orange-400 border border-orange-500/30">
                              <ShieldAlert className="w-3 h-3" />
                              <span>Suspensa</span>
                            </div>
                          )}

                          {sub.status === 'CANCELED' && (
                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-gray-800 text-gray-400 border border-gray-700">
                              <span>Cancelada</span>
                            </div>
                          )}
                        </td>

                        {/* Vigência / Vencimento */}
                        <td className="py-4 px-4">
                          <div className="text-white font-medium">
                            {formatDate(sub.currentPeriodEnd || sub.trialEnd)}
                          </div>
                          <div className="text-[10px] text-muted-foreground mt-0.5">
                            {diffDays !== null ? (
                              diffDays > 0 ? (
                                <span className="text-emerald-400/90">{diffDays} dias restantes</span>
                              ) : diffDays === 0 ? (
                                <span className="text-amber-400 font-semibold">Vence hoje!</span>
                              ) : (
                                <span className="text-red-400 font-semibold">{Math.abs(diffDays)} dias em atraso</span>
                              )
                            ) : (
                              'Sem data limite'
                            )}
                          </div>
                        </td>

                        {/* Provedor */}
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-1.5">
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-muted text-foreground border border-border/60">
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
                              className="text-[9px] font-mono text-muted-foreground hover:text-white flex items-center gap-1 mt-1 cursor-pointer"
                              title="Copiar ID do cliente"
                            >
                              <span>{sub.providerCustomerId.slice(0, 14)}...</span>
                              {copiedId === sub.id ? (
                                <Check className="w-2.5 h-2.5 text-emerald-400" />
                              ) : (
                                <Copy className="w-2.5 h-2.5" />
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
                              className="p-1.5 rounded-lg bg-card hover:bg-muted text-muted-foreground hover:text-white border border-border/80 transition-colors cursor-pointer"
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
                              className="px-2 py-1 rounded-lg bg-card hover:bg-emerald-950/40 text-emerald-400 border border-emerald-500/30 transition-colors text-[10px] font-semibold cursor-pointer"
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
                              className="p-1.5 rounded-lg bg-card hover:bg-muted text-muted-foreground hover:text-white border border-border/80 transition-colors cursor-pointer"
                              title="Mudar Status Operacional"
                            >
                              <ArrowUpDown className="w-3.5 h-3.5" />
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
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-gray-900 border border-border/80 rounded-2xl w-full max-w-2xl p-6 shadow-2xl relative space-y-6">
            <button
              onClick={() => setSelectedSubForInvoices(null)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-muted-foreground hover:text-white hover:bg-muted"
            >
              <X className="w-4 h-4" />
            </button>

            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400">
                  Faturas & Invoices
                </span>
                <span className="text-xs text-muted-foreground font-mono">
                  ID: {selectedSubForInvoices.id}
                </span>
              </div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Receipt className="w-5 h-5 text-emerald-400" />
                {selectedSubForInvoices.barbershop?.name || 'Assinatura'}
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Plano: {selectedSubForInvoices.plan?.name || selectedSubForInvoices.planName} •{' '}
                {formatPrice(Number(selectedSubForInvoices.plan?.price ?? selectedSubForInvoices.price ?? 0))}
              </p>
            </div>

            {/* Invoices List */}
            <div className="space-y-3">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Faturas Geradas ({selectedSubForInvoices.invoices?.length || 0})
              </h3>

              {!selectedSubForInvoices.invoices || selectedSubForInvoices.invoices.length === 0 ? (
                <div className="text-center py-8 border border-dashed border-border rounded-xl text-xs text-muted-foreground">
                  Nenhuma fatura registrada nesta assinatura ainda.
                </div>
              ) : (
                <div className="divide-y divide-border/40 border border-border/60 rounded-xl overflow-hidden bg-card/60">
                  {selectedSubForInvoices.invoices.map((inv) => (
                    <div key={inv.id} className="p-3.5 flex items-center justify-between text-xs">
                      <div>
                        <div className="font-semibold text-white">
                          {formatPrice(Number(inv.amount))}
                        </div>
                        <div className="text-[11px] text-muted-foreground">
                          Vencimento: {formatDate(inv.dueDate)}{' '}
                          {inv.paidAt && `• Pago em ${formatDate(inv.paidAt)}`}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {inv.status === 'PAID' ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                            Paga
                          </span>
                        ) : inv.status === 'OPEN' ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                            Aberta
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-muted text-muted-foreground">
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
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Linha do Tempo (Eventos)
                </h3>
                <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                  {selectedSubForInvoices.events.map((ev) => (
                    <div
                      key={ev.id}
                      className="text-[11px] p-2 rounded-lg bg-card/40 border border-border/40 flex items-center justify-between"
                    >
                      <span className="font-mono text-emerald-400">{ev.type}</span>
                      <span className="text-muted-foreground">{formatDate(ev.createdAt)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedSubForInvoices(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-muted hover:bg-muted/80 text-foreground cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Estender Vigência / Conceder Carência */}
      {selectedSubForExtend && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-gray-900 border border-border/80 rounded-2xl w-full max-w-md p-6 shadow-2xl relative space-y-5">
            <button
              onClick={() => setSelectedSubForExtend(null)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-muted-foreground hover:text-white hover:bg-muted"
            >
              <X className="w-4 h-4" />
            </button>

            <div>
              <div className="flex items-center gap-1.5 text-emerald-400 text-xs font-semibold mb-1">
                <Clock className="w-3.5 h-3.5" />
                <span>Extensão de Vigência Comercial</span>
              </div>
              <h2 className="text-lg font-bold text-white">
                Estender Prazo: {selectedSubForExtend.barbershop?.name}
              </h2>
              <p className="text-xs text-muted-foreground mt-1">
                Adicione dias extras de contrato ou carência à assinatura desta barbearia.
              </p>
            </div>

            <div className="space-y-3">
              <label className="text-xs text-foreground font-medium block">
                Quantidade de dias adicionais:
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[7, 15, 30].map((days) => (
                  <button
                    key={days}
                    type="button"
                    onClick={() => setExtendDaysInput(days)}
                    className={`py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                      extendDaysInput === days
                        ? 'bg-emerald-500 text-black border-emerald-500 font-bold'
                        : 'bg-card border-border text-foreground hover:bg-muted'
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
                className="w-full bg-card border border-border rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                placeholder="Ou digite o número de dias..."
              />
            </div>

            <div className="bg-card/60 p-3 rounded-xl border border-border/60 text-[11px] text-muted-foreground">
              Vigência atual termina em:{' '}
              <span className="text-white font-medium">
                {formatDate(selectedSubForExtend.currentPeriodEnd || selectedSubForExtend.trialEnd)}
              </span>
              . Com a extensão, o status será reativado caso estivesse vencida.
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSelectedSubForExtend(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-muted hover:bg-muted/80 text-foreground cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleExtendSubscription}
                disabled={isExtending || extendDaysInput <= 0}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-500 hover:bg-emerald-400 text-black font-bold cursor-pointer disabled:opacity-50"
              >
                {isExtending ? 'Salvando...' : 'Confirmar Extensão'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Alterar Status Operacional */}
      {selectedSubForStatus && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-gray-900 border border-border/80 rounded-2xl w-full max-w-md p-6 shadow-2xl relative space-y-5">
            <button
              onClick={() => setSelectedSubForStatus(null)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-muted-foreground hover:text-white hover:bg-muted"
            >
              <X className="w-4 h-4" />
            </button>

            <div>
              <div className="flex items-center gap-1.5 text-amber-400 text-xs font-semibold mb-1">
                <ArrowUpDown className="w-3.5 h-3.5" />
                <span>Gestão de Ciclo de Vida</span>
              </div>
              <h2 className="text-lg font-bold text-white">
                Alterar Status: {selectedSubForStatus.barbershop?.name}
              </h2>
              <p className="text-xs text-muted-foreground mt-1">
                Atualize o estado da assinatura. Mudanças para Ativa liberam o acesso do estabelecimento.
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-xs text-foreground font-medium block">Novo Status:</label>
              <select
                value={newStatusInput}
                onChange={(e) => setNewStatusInput(e.target.value)}
                className="w-full bg-card border border-border rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
              >
                <option value="ACTIVE">ACTIVE (Ativa - Acesso Total)</option>
                <option value="TRIALING">TRIALING (Período de Testes)</option>
                <option value="PAST_DUE">PAST_DUE (Vencida / Inadimplente)</option>
                <option value="SUSPENDED">SUSPENDED (Suspensa)</option>
                <option value="CANCELED">CANCELED (Cancelada)</option>
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSelectedSubForStatus(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-muted hover:bg-muted/80 text-foreground cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleUpdateStatus}
                disabled={isUpdatingStatus}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-500 hover:bg-emerald-400 text-black font-bold cursor-pointer disabled:opacity-50"
              >
                {isUpdatingStatus ? 'Atualizando...' : 'Salvar Alteração'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Conceder Assinatura Manual / Cortesia */}
      {isGrantModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-gray-900 border border-border/80 rounded-2xl w-full max-w-lg p-6 shadow-2xl relative space-y-5">
            <button
              onClick={() => setIsGrantModalOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-muted-foreground hover:text-white hover:bg-muted"
            >
              <X className="w-4 h-4" />
            </button>

            <div>
              <div className="flex items-center gap-1.5 text-emerald-400 text-xs font-semibold mb-1">
                <Plus className="w-3.5 h-3.5" />
                <span>Nova Vinculação de Plano</span>
              </div>
              <h2 className="text-xl font-bold text-white">Conceder Assinatura Manual</h2>
              <p className="text-xs text-muted-foreground mt-1">
                Atribua um plano de assinatura comercial ou cortesia para qualquer estabelecimento.
              </p>
            </div>

            <form onSubmit={handleGrantSubscription} className="space-y-4">
              <div>
                <label className="text-xs text-foreground font-medium block mb-1">
                  Barbearia / Estabelecimento:
                </label>
                <select
                  value={grantShopId}
                  onChange={(e) => setGrantShopId(e.target.value)}
                  required
                  className="w-full bg-card border border-border rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                >
                  <option value="">Selecione o estabelecimento...</option>
                  {barbershops.map((shop) => (
                    <option key={shop.id} value={shop.id}>
                      {shop.name} ({shop.slug ? `/b/${shop.slug}` : shop.email})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs text-foreground font-medium block mb-1">
                  Plano SaaS a Conceder:
                </label>
                <select
                  value={grantPlanId}
                  onChange={(e) => setGrantPlanId(e.target.value)}
                  required
                  className="w-full bg-card border border-border rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                >
                  <option value="">Selecione o plano...</option>
                  {plans.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} — {formatPrice(Number(p.price))} ({p.billingInterval}){' '}
                      {p.planType === 'COURTESY' ? '★ CORTESIA' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs text-foreground font-medium block mb-1">
                  Observações / Justificativa (Opcional):
                </label>
                <textarea
                  value={grantNotes}
                  onChange={(e) => setGrantNotes(e.target.value)}
                  rows={2}
                  placeholder="Ex: Concessão especial de parceria, upgrade manual ou cortesia de onboarding..."
                  className="w-full bg-card border border-border rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-emerald-500 placeholder:text-muted-foreground"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsGrantModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-muted hover:bg-muted/80 text-foreground cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isGranting}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-500 hover:bg-emerald-400 text-black font-bold cursor-pointer disabled:opacity-50"
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
    <div className="min-h-screen bg-gray-950 text-foreground p-8 space-y-6">
      <div className="h-10 w-64 bg-muted/30 rounded-xl animate-pulse" />
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-24 bg-muted/20 rounded-2xl animate-pulse" />
        ))}
      </div>
      <div className="h-96 bg-muted/20 rounded-2xl animate-pulse" />
    </div>
  )
}
