'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import DropdownHeader from '@/components/shared/DropdownHeader'
import { useAuth } from '@/lib/auth-context'
import { getAuthHeaders } from '@/lib/utils'
import {
  CreditCard,
  Plus,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Gift,
  Edit2,
  Trash2,
  Eye,
  Archive,
  Search,
  Check,
  Calendar,
  Layers,
  Building2,
  Clock,
  RotateCcw,
} from 'lucide-react'

export interface PlanItem {
  id: string
  name: string
  slug: string
  description?: string
  planType: 'PAID' | 'COURTESY'
  cycleType: 'MONTHLY' | 'YEARLY' | 'CUSTOM'
  durationDays: number
  price: number | string
  originalPrice?: number | string | null
  discountBadge?: string | null
  discountPercent?: number
  savingsAmount?: number
  currency: string
  billingInterval: string
  trialDays?: number
  features?: string[] | any
  status: 'ACTIVE' | 'INACTIVE'
  isActive: boolean
  provider?: string
  providerProductId?: string
  isSyncedWithAbacate?: boolean
  abacateProductId?: string | null
  createdAt: string
  _count?: {
    subscriptions: number
  }
}

interface BarbershopOption {
  id: string
  name: string
  slug: string
}

type FilterTab = 'ALL' | 'ACTIVE' | 'INACTIVE' | 'PAID' | 'COURTESY'

export default function DeveloperPlansPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()

  const [plans, setPlans] = useState<PlanItem[]>([])
  const [barbershops, setBarbershops] = useState<BarbershopOption[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<FilterTab>('ALL')
  const [searchTerm, setSearchTerm] = useState('')
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  // Modals state
  const [planModalOpen, setPlanModalOpen] = useState(false)
  const [editingPlan, setEditingPlan] = useState<PlanItem | null>(null)
  const [deleteConfirmPlan, setDeleteConfirmPlan] = useState<PlanItem | null>(null)
  const [courtesyModalOpen, setCourtesyModalOpen] = useState(false)
  const [viewHistoryPlan, setViewHistoryPlan] = useState<any | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // Form State for Create/Edit Plan
  const [planForm, setPlanForm] = useState({
    name: '',
    slug: '',
    description: '',
    planType: 'PAID' as 'PAID' | 'COURTESY',
    cycleType: 'MONTHLY' as 'MONTHLY' | 'YEARLY' | 'CUSTOM',
    durationDays: '30',
    price: '49.90',
    originalPrice: '79.90',
    discountBadge: '',
    status: 'ACTIVE' as 'ACTIVE' | 'INACTIVE',
    trialDays: '0',
    features: 'Agendamento online, Gestão de profissionais, Relatórios financeiros, Página pública',
  })

  // Form State for Grant Courtesy
  const [courtesyForm, setCourtesyForm] = useState({
    barbershopId: '',
    planId: '',
    durationDays: '30',
    notes: 'Cortesia concedida pelo Developer',
  })

  useEffect(() => {
    if (!authLoading && user?.role !== 'DEVELOPER') {
      router.replace('/dashboard')
    }
  }, [user, authLoading, router])

  const fetchPlans = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/billing/plans?all=true', {
        headers: getAuthHeaders(),
        credentials: 'include',
      })
      if (res.ok) {
        const data = await res.json()
        setPlans(Array.isArray(data) ? data : [])
      }
    } catch {
      setFeedback({ type: 'error', message: 'Erro ao carregar catálogo de planos.' })
    } finally {
      setLoading(false)
    }
  }

  const fetchBarbershops = async () => {
    try {
      const res = await fetch('/api/developer/barbershops', {
        headers: getAuthHeaders(),
        credentials: 'include',
      })
      if (res.ok) {
        const data = await res.json()
        const list = Array.isArray(data) ? data : data.barbershops || []
        setBarbershops(list.map((b: any) => ({ id: b.id, name: b.name, slug: b.slug })))
      }
    } catch {
      // Falha silenciosa para lista de barbearias
    }
  }

  useEffect(() => {
    if (user?.role === 'DEVELOPER') {
      fetchPlans()
      fetchBarbershops()
    }
  }, [user])

  // Open Create Modal
  const handleOpenCreate = () => {
    setEditingPlan(null)
    setPlanForm({
      name: '',
      slug: '',
      description: '',
      planType: 'PAID',
      cycleType: 'MONTHLY',
      durationDays: '30',
      price: '49.90',
      originalPrice: '79.90',
      discountBadge: '',
      status: 'ACTIVE',
      trialDays: '0',
      features: 'Agendamento online, Gestão de profissionais, Relatórios financeiros, Página pública',
    })
    setPlanModalOpen(true)
  }

  // Open Edit Modal
  const handleOpenEdit = (plan: PlanItem) => {
    setEditingPlan(plan)
    let featuresStr = ''
    if (Array.isArray(plan.features)) {
      featuresStr = plan.features.join(', ')
    } else if (plan.features && typeof plan.features === 'object') {
      if (Array.isArray(plan.features.items)) {
        featuresStr = plan.features.items.join(', ')
      }
    }

    const origPrice =
      plan.originalPrice !== undefined && plan.originalPrice !== null
        ? String(plan.originalPrice)
        : (plan.features && typeof plan.features === 'object' && plan.features.originalPrice)
        ? String(plan.features.originalPrice)
        : ''

    const discBadge =
      plan.discountBadge ||
      (plan.features && typeof plan.features === 'object' && plan.features.discountBadge) ||
      ''

    setPlanForm({
      name: plan.name,
      slug: plan.slug,
      description: plan.description || '',
      planType: plan.planType,
      cycleType: plan.cycleType,
      durationDays: plan.durationDays ? String(plan.durationDays) : '30',
      price: plan.planType === 'COURTESY' ? '0' : String(plan.price),
      originalPrice: plan.planType === 'COURTESY' ? '' : origPrice,
      discountBadge: discBadge,
      status: plan.status,
      trialDays: plan.trialDays ? String(plan.trialDays) : '0',
      features: featuresStr || 'Agendamento online, Gestão de profissionais',
    })
    setPlanModalOpen(true)
  }

  // Submit Create or Edit Plan
  const handleSubmitPlan = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setFeedback(null)

    try {
      const isCourtesy = planForm.planType === 'COURTESY'
      let finalDuration = parseInt(planForm.durationDays, 10) || 30
      if (planForm.cycleType === 'MONTHLY') finalDuration = 30
      if (planForm.cycleType === 'YEARLY') finalDuration = 365

      const featuresArray = planForm.features
        .split(',')
        .map((f) => f.trim())
        .filter(Boolean)

      const payload = {
        name: planForm.name,
        slug: planForm.slug || planForm.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        description: planForm.description,
        planType: planForm.planType,
        cycleType: planForm.cycleType,
        durationDays: finalDuration,
        price: isCourtesy ? 0 : parseFloat(planForm.price),
        originalPrice: isCourtesy || !planForm.originalPrice ? null : parseFloat(planForm.originalPrice),
        discountBadge: isCourtesy || !planForm.discountBadge.trim() ? null : planForm.discountBadge.trim(),
        currency: 'BRL',
        status: planForm.status,
        isActive: planForm.status === 'ACTIVE',
        billingInterval: planForm.cycleType === 'YEARLY' ? 'YEARLY' : 'MONTHLY',
        trialDays: parseInt(planForm.trialDays, 10) || 0,
        features: featuresArray,
      }

      let res: Response
      if (editingPlan) {
        res = await fetch(`/api/billing/plans/${editingPlan.id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            ...getAuthHeaders(),
          },
          credentials: 'include',
          body: JSON.stringify(payload),
        })
      } else {
        res = await fetch('/api/billing/plans', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...getAuthHeaders(),
          },
          credentials: 'include',
          body: JSON.stringify(payload),
        })
      }

      const data = await res.json()
      if (res.ok) {
        setFeedback({
          type: 'success',
          message: editingPlan
            ? `Plano "${data.name}" atualizado com sucesso!`
            : `Plano "${data.name}" cadastrado com sucesso!`,
        })
        setPlanModalOpen(false)
        await fetchPlans()
      } else {
        setFeedback({ type: 'error', message: data.error || 'Erro ao salvar plano.' })
      }
    } catch {
      setFeedback({ type: 'error', message: 'Erro de conexão com o servidor.' })
    } finally {
      setSubmitting(false)
    }
  }

  // Handle Sync with AbacatePay
  const handleSyncPlanWithAbacate = async (planId: string) => {
    try {
      setFeedback(null)
      const res = await fetch('/api/billing/products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        credentials: 'include',
        body: JSON.stringify({ planId }),
      })
      const data = await res.json()
      if (res.ok) {
        setFeedback({ type: 'success', message: data.message || 'Plano sincronizado com a AbacatePay com sucesso!' })
        await fetchPlans()
      } else {
        setFeedback({ type: 'error', message: data.error || 'Erro ao sincronizar com AbacatePay.' })
      }
    } catch {
      setFeedback({ type: 'error', message: 'Falha na conexão ao sincronizar com AbacatePay.' })
    }
  }

  // Handle Smart Delete / Deactivate
  const handleExecuteDeleteOrDeactivate = async () => {
    if (!deleteConfirmPlan) return
    setSubmitting(true)
    setFeedback(null)

    try {
      const res = await fetch(`/api/billing/plans/${deleteConfirmPlan.id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
        credentials: 'include',
      })

      const data = await res.json()
      if (res.ok) {
        setFeedback({
          type: 'success',
          message: data.message || 'Operação realizada com sucesso.',
        })
        setDeleteConfirmPlan(null)
        await fetchPlans()
      } else {
        setFeedback({ type: 'error', message: data.error || 'Erro ao processar plano.' })
      }
    } catch {
      setFeedback({ type: 'error', message: 'Erro de conexão ao remover/descontinuar plano.' })
    } finally {
      setSubmitting(false)
    }
  }

  // Handle Grant Courtesy
  const handleGrantCourtesy = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setFeedback(null)

    try {
      const payload: any = {
        barbershopId: courtesyForm.barbershopId,
        durationDays: parseInt(courtesyForm.durationDays, 10) || 30,
        notes: courtesyForm.notes,
      }
      if (courtesyForm.planId) {
        payload.planId = courtesyForm.planId
      }

      const res = await fetch('/api/billing/subscriptions/courtesy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        credentials: 'include',
        body: JSON.stringify(payload),
      })

      const data = await res.json()
      if (res.ok) {
        setFeedback({
          type: 'success',
          message: `Cortesia de ${data.durationDays} dias concedida com sucesso!`,
        })
        setCourtesyModalOpen(false)
        setCourtesyForm({
          barbershopId: '',
          planId: '',
          durationDays: '30',
          notes: 'Cortesia concedida pelo Developer',
        })
        await fetchPlans()
      } else {
        setFeedback({ type: 'error', message: data.error || 'Erro ao conceder cortesia.' })
      }
    } catch {
      setFeedback({ type: 'error', message: 'Erro de conexão ao conceder cortesia.' })
    } finally {
      setSubmitting(false)
    }
  }

  // Handle View History / Details
  const handleOpenViewHistory = async (plan: PlanItem) => {
    try {
      const res = await fetch(`/api/billing/plans/${plan.id}`, {
        headers: getAuthHeaders(),
        credentials: 'include',
      })
      if (res.ok) {
        const fullData = await res.json()
        setViewHistoryPlan(fullData)
      } else {
        setViewHistoryPlan(plan)
      }
    } catch {
      setViewHistoryPlan(plan)
    }
  }

  // Filtered Plans
  const filteredPlans = useMemo(() => {
    return plans.filter((p) => {
      if (activeTab === 'ACTIVE' && p.status !== 'ACTIVE') return false
      if (activeTab === 'INACTIVE' && p.status !== 'INACTIVE') return false
      if (activeTab === 'PAID' && p.planType !== 'PAID') return false
      if (activeTab === 'COURTESY' && p.planType !== 'COURTESY') return false

      if (searchTerm) {
        const term = searchTerm.toLowerCase()
        const matchesName = p.name.toLowerCase().includes(term)
        const matchesSlug = p.slug.toLowerCase().includes(term)
        return matchesName || matchesSlug
      }

      return true
    })
  }, [plans, activeTab, searchTerm])

  const formatPrice = (val: number | string) => {
    const num = Number(val) || 0
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(num)
  }

  const getCycleLabel = (cycleType?: string, interval?: string) => {
    if (cycleType === 'CUSTOM') return 'Personalizado'
    if (cycleType === 'YEARLY' || interval === 'YEARLY') return 'Anual'
    return 'Mensal'
  }

  if (authLoading || user?.role !== 'DEVELOPER') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-950 text-white">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white pb-20 pt-20">
      <DropdownHeader />

      <main className="w-full px-4 md:px-8 max-w-7xl mx-auto space-y-6">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#111827] border border-[#374151] p-6 rounded-xl">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#2563eb] text-white font-bold text-xs uppercase tracking-wider">
                <CreditCard className="w-3.5 h-3.5" />
                Gestão de Planos & Assinaturas SaaS
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-white">Catálogo de Planos</h1>
            <p className="text-sm text-gray-200 mt-1 font-medium">
              Gerencie planos pagos, cortesias com período livre, descontinuação segura e histórico de assinaturas.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={fetchPlans}
              disabled={loading}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-xs md:text-sm font-bold rounded-lg border border-[#4b5563] bg-[#1f2937] hover:bg-[#374151] text-white transition-all shadow-sm"
              title="Atualizar lista"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Atualizar
            </button>
            <button
              onClick={() => setCourtesyModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-xs md:text-sm font-bold rounded-lg bg-[#d97706] hover:bg-amber-600 text-white border border-[#f59e0b] transition-all shadow-sm"
            >
              <Gift className="w-4 h-4" />
              <span>Conceder Cortesia</span>
            </button>
            <button
              onClick={handleOpenCreate}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-xs md:text-sm font-bold rounded-lg bg-[#2563eb] hover:bg-blue-600 text-white border border-[#3b82f6] shadow-sm transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Novo Plano</span>
            </button>
          </div>
        </div>

        {/* Feedback Alert */}
        {feedback && (
          <div
            className={`p-4 rounded-xl border text-sm flex items-center justify-between gap-3 ${
              feedback.type === 'success'
                ? 'bg-[#059669] border-[#10b981] text-white'
                : 'bg-[#dc2626] border-[#ef4444] text-white'
            }`}
          >
            <div className="flex items-center gap-2.5 font-bold">
              {feedback.type === 'success' ? (
                <CheckCircle2 className="w-5 h-5 text-white shrink-0" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-white shrink-0" />
              )}
              <span>{feedback.message}</span>
            </div>
            <button onClick={() => setFeedback(null)} className="text-white hover:text-gray-200 text-sm font-bold px-2 py-1">
              ✕
            </button>
          </div>
        )}

        {/* Filters and Search Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#111827] border border-[#374151] p-4 rounded-xl">
          {/* Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 scrollbar-hide [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            {[
              { id: 'ALL', label: 'Todos' },
              { id: 'ACTIVE', label: 'Ativos' },
              { id: 'INACTIVE', label: 'Descontinuados' },
              { id: 'PAID', label: 'Pagos' },
              { id: 'COURTESY', label: 'Cortesia' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as FilterTab)}
                className={`px-4 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
                  activeTab === tab.id
                    ? 'bg-[#2563eb] text-white border border-[#3b82f6]'
                    : 'bg-[#1f2937] text-white hover:bg-[#374151] border border-[#4b5563]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-gray-300 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por nome ou slug..."
              className="w-full pl-9 pr-3 py-2 text-xs rounded-lg bg-[#030712] border border-[#374151] text-white placeholder-gray-400 font-medium focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        {/* Plans Table */}
        <div className="bg-[#111827] border border-[#374151] rounded-xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs md:text-sm">
              <thead className="bg-[#1f2937] border-b border-[#374151] text-white font-bold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-4 px-4 md:px-6">Plano</th>
                  <th className="py-4 px-3">Tipo</th>
                  <th className="py-4 px-3">Ciclo</th>
                  <th className="py-4 px-3 text-center">Duração</th>
                  <th className="py-4 px-4 text-right">Preço</th>
                  <th className="py-4 px-3 text-center">Assinaturas</th>
                  <th className="py-4 px-3 text-center">Status</th>
                  <th className="py-4 px-4 md:px-6 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#374151]">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-white font-bold">
                      <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-400" />
                      Carregando catálogo de planos...
                    </td>
                  </tr>
                ) : filteredPlans.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-white font-medium">
                      <Layers className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                      Nenhum plano encontrado para os critérios selecionados.
                    </td>
                  </tr>
                ) : (
                  filteredPlans.map((plan) => {
                    const subCount = plan._count?.subscriptions || 0
                    const isInactive = plan.status === 'INACTIVE'
                    const isCourtesy = plan.planType === 'COURTESY'

                    return (
                      <tr
                        key={plan.id}
                        className={`hover:bg-[#1f2937]/50 transition-colors ${
                          isInactive ? 'bg-[#030712]/60' : ''
                        }`}
                      >
                        {/* Plano Column */}
                        <td className="py-4 px-4 md:px-6">
                          <div className="font-bold text-sm text-white flex items-center gap-2">
                            {plan.name}
                            {isCourtesy && (
                              <span title="Plano Cortesia">
                                <Gift className="w-4 h-4 text-amber-400 shrink-0" />
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-gray-300 font-mono mt-0.5">
                            slug: {plan.slug}
                          </div>
                          {plan.description && (
                            <div className="text-xs text-gray-300 line-clamp-1 mt-0.5 font-medium">
                              {plan.description}
                            </div>
                          )}
                        </td>

                        {/* Tipo Column */}
                        <td className="py-4 px-3">
                          <div className="flex flex-col gap-1.5 items-start">
                            {isCourtesy ? (
                              <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-[#d97706] text-white border border-[#f59e0b]">
                                Cortesia
                              </span>
                            ) : (
                              <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-[#2563eb] text-white border border-[#3b82f6]">
                                Comercial
                              </span>
                            )}
                            {!isCourtesy && (
                              plan.isSyncedWithAbacate || plan.providerProductId ? (
                                <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-[#059669] text-white border border-[#10b981] flex items-center gap-1" title={plan.providerProductId || 'Sincronizado'}>
                                  <Check className="w-2.5 h-2.5" /> AbacatePay
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-[#dc2626] text-white border border-[#ef4444]" title="Não sincronizado com AbacatePay">
                                  Não Sincronizado
                                </span>
                              )
                            )}
                          </div>
                        </td>

                        {/* Ciclo Column */}
                        <td className="py-4 px-3 font-bold text-white">
                          {getCycleLabel(plan.cycleType, plan.billingInterval)}
                        </td>

                        {/* Duração Column */}
                        <td className="py-4 px-3 text-center text-white font-bold">
                          {plan.durationDays || (plan.billingInterval === 'YEARLY' ? 365 : 30)} dias
                        </td>

                        {/* Preço Column */}
                        <td className="py-4 px-4 text-right">
                          {isCourtesy ? (
                            <span className="text-gray-300 font-bold text-sm">R$ 0,00</span>
                          ) : (
                            <div className="flex flex-col items-end">
                              {plan.originalPrice && Number(plan.originalPrice) > Number(plan.price) && (
                                <div className="flex items-center gap-1.5 mb-0.5">
                                  <span className="text-[11px] text-gray-400 line-through font-normal">
                                    De {formatPrice(plan.originalPrice)}
                                  </span>
                                  <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                    {plan.discountBadge || `-${Math.round(((Number(plan.originalPrice) - Number(plan.price)) / Number(plan.originalPrice)) * 100)}%`}
                                  </span>
                                </div>
                              )}
                              <span className="font-black text-white text-sm">
                                {formatPrice(plan.price)}
                              </span>
                              <span className="text-[10px] text-gray-400">
                                /{plan.billingInterval === 'YEARLY' ? 'ano' : 'mês'}
                              </span>
                            </div>
                          )}
                        </td>

                        {/* Assinaturas Column */}
                        <td className="py-4 px-3 text-center">
                          <span
                            className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold ${
                              subCount > 0
                                ? 'bg-[#2563eb] text-white border border-[#3b82f6]'
                                : 'bg-[#1f2937] text-white border border-[#4b5563]'
                            }`}
                          >
                            {subCount}
                          </span>
                        </td>

                        {/* Status Column */}
                        <td className="py-4 px-3 text-center">
                          {plan.status === 'ACTIVE' ? (
                            <span className="px-2.5 py-1 rounded text-[11px] font-bold bg-[#059669] text-white border border-[#10b981]">
                              Ativo
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 rounded text-[11px] font-bold bg-[#dc2626] text-white border border-[#ef4444]">
                              Descontinuado
                            </span>
                          )}
                        </td>

                        {/* Ações Column */}
                        <td className="py-4 px-4 md:px-6 text-right space-x-1.5 whitespace-nowrap">
                          {!isCourtesy && !plan.isSyncedWithAbacate && !plan.providerProductId && plan.status === 'ACTIVE' && (
                            <button
                              onClick={() => handleSyncPlanWithAbacate(plan.id)}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-[#10b981] bg-[#059669] hover:bg-emerald-600 text-white text-xs font-bold transition-all shadow-sm"
                              title="Criar/Sincronizar produto na AbacatePay"
                            >
                              <RefreshCw className="w-3.5 h-3.5 text-white" />
                              <span>Sincronizar</span>
                            </button>
                          )}
                          {plan.status === 'ACTIVE' ? (
                            <>
                              <button
                                onClick={() => handleOpenEdit(plan)}
                                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-[#4b5563] bg-[#1f2937] hover:bg-[#374151] text-white text-xs font-bold transition-all shadow-sm"
                                title="Editar configurações do plano"
                              >
                                <Edit2 className="w-3.5 h-3.5 text-white" />
                                <span>Editar</span>
                              </button>

                              <button
                                onClick={() => setDeleteConfirmPlan(plan)}
                                className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm border ${
                                  subCount > 0
                                    ? 'border-[#f59e0b] bg-[#d97706] hover:bg-amber-600 text-white'
                                    : 'border-[#ef4444] bg-[#dc2626] hover:bg-red-600 text-white'
                                }`}
                                title={
                                  subCount > 0
                                    ? 'Descontinuar plano com segurança'
                                    : 'Excluir plano definitivamente'
                                }
                              >
                                {subCount > 0 ? (
                                  <>
                                    <Archive className="w-3.5 h-3.5" />
                                    <span>Descontinuar</span>
                                  </>
                                ) : (
                                  <>
                                    <Trash2 className="w-3.5 h-3.5" />
                                    <span>Excluir</span>
                                  </>
                                )}
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => handleOpenViewHistory(plan)}
                                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-[#4b5563] bg-[#1f2937] hover:bg-[#374151] text-white text-xs font-bold transition-all shadow-sm"
                                title="Visualizar histórico e assinantes"
                              >
                                <Eye className="w-3.5 h-3.5 text-white" />
                                <span>Visualizar</span>
                              </button>
                              <button
                                onClick={() => handleOpenEdit(plan)}
                                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-[#10b981] bg-[#059669] hover:bg-emerald-600 text-white text-xs font-bold transition-all shadow-sm"
                                title="Editar ou Reativar"
                              >
                                <RotateCcw className="w-3.5 h-3.5 text-white" />
                                <span>Reativar</span>
                              </button>
                            </>
                          )}
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal 1: Create / Edit Plan Modal */}
        {planModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85">
            <div className="bg-[#111827] border border-[#374151] rounded-2xl p-6 md:p-8 max-w-xl w-full space-y-6 shadow-2xl max-h-[90vh] overflow-y-auto text-white">
              <div className="flex items-center justify-between border-b border-[#374151] pb-4">
                <div>
                  <h3 className="text-lg font-bold text-white">
                    {editingPlan ? `Editar Plano: ${editingPlan.name}` : 'Novo Plano SaaS'}
                  </h3>
                  <p className="text-xs text-gray-300 mt-0.5 font-medium">
                    Defina tipo, ciclo de vigência, preço e regras contratuais.
                  </p>
                </div>
                <button
                  onClick={() => setPlanModalOpen(false)}
                  className="text-white hover:text-gray-300 text-sm font-bold p-1"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSubmitPlan} className="space-y-4 text-xs md:text-sm">
                {/* Nome & Slug */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-white font-bold mb-1">Nome do Plano *</label>
                    <input
                      type="text"
                      required
                      value={planForm.name}
                      onChange={(e) => setPlanForm({ ...planForm, name: e.target.value })}
                      placeholder="Ex: Pro Anual, Cortesia VIP"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#030712] border border-[#374151] text-white font-medium focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-white font-bold mb-1">Slug Identificador</label>
                    <input
                      type="text"
                      value={planForm.slug}
                      onChange={(e) => setPlanForm({ ...planForm, slug: e.target.value })}
                      placeholder="pro-anual (opcional)"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#030712] border border-[#374151] text-white font-medium focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                {/* Tipo de Plano (PAID vs COURTESY) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-white font-bold mb-1">Tipo de Plano *</label>
                    <select
                      value={planForm.planType}
                      onChange={(e) => {
                        const nextType = e.target.value as 'PAID' | 'COURTESY'
                        setPlanForm({
                          ...planForm,
                          planType: nextType,
                          price: nextType === 'COURTESY' ? '0' : planForm.price === '0' ? '49.90' : planForm.price,
                        })
                      }}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#030712] border border-[#374151] text-white font-medium focus:outline-none focus:border-blue-500"
                    >
                      <option value="PAID">Comercial Pago (PAID)</option>
                      <option value="COURTESY">Cortesia / Isento (COURTESY)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-white font-bold mb-1">Status do Plano *</label>
                    <select
                      value={planForm.status}
                      onChange={(e) => setPlanForm({ ...planForm, status: e.target.value as 'ACTIVE' | 'INACTIVE' })}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#030712] border border-[#374151] text-white font-medium focus:outline-none focus:border-blue-500"
                    >
                      <option value="ACTIVE">ACTIVE (Disponível para contratação)</option>
                      <option value="INACTIVE">INACTIVE (Descontinuado para novas)</option>
                    </select>
                  </div>
                </div>

                {/* Ciclo & Duração */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-white font-bold mb-1">Ciclo *</label>
                    <select
                      value={planForm.cycleType}
                      onChange={(e) => {
                        const cycle = e.target.value as 'MONTHLY' | 'YEARLY' | 'CUSTOM'
                        let defDays = '30'
                        if (cycle === 'YEARLY') defDays = '365'
                        if (cycle === 'CUSTOM') defDays = planForm.durationDays || '45'
                        setPlanForm({ ...planForm, cycleType: cycle, durationDays: defDays })
                      }}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#030712] border border-[#374151] text-white font-medium focus:outline-none focus:border-blue-500"
                    >
                      <option value="MONTHLY">Mensal (30 dias)</option>
                      <option value="YEARLY">Anual (365 dias)</option>
                      <option value="CUSTOM">Personalizado (Dias)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-white font-bold mb-1">
                      Duração (Dias) {planForm.cycleType === 'CUSTOM' ? '*' : ''}
                    </label>
                    <input
                      type="number"
                      min="1"
                      required
                      value={planForm.durationDays}
                      onChange={(e) => setPlanForm({ ...planForm, durationDays: e.target.value })}
                      disabled={planForm.cycleType !== 'CUSTOM'}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#030712] border border-[#374151] text-white font-medium focus:outline-none focus:border-blue-500 disabled:opacity-50 disabled:bg-[#1f2937]"
                    />
                  </div>
                </div>

                {/* Bloco de Precificação & Desconto Estratégico */}
                <div className="bg-[#030712] p-4 rounded-xl border border-[#374151] space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-blue-400 flex items-center gap-1.5">
                      <CreditCard className="w-3.5 h-3.5" />
                      Precificação & Estratégia de Desconto
                    </span>
                    <span className="text-[11px] text-gray-400 font-medium">
                      Exibido na Landing Page e no Checkout
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {/* Preço Atual com Desconto */}
                    <div>
                      <label className="block text-white font-bold mb-1 text-xs">
                        Preço Atual c/ Desconto (R$) *
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        required
                        disabled={planForm.planType === 'COURTESY'}
                        value={planForm.planType === 'COURTESY' ? '0' : planForm.price}
                        onChange={(e) => setPlanForm({ ...planForm, price: e.target.value })}
                        placeholder="49.90"
                        className="w-full px-3 py-2 rounded-xl bg-[#111827] border border-[#374151] text-white font-semibold focus:outline-none focus:border-blue-500 disabled:opacity-50"
                      />
                      <span className="text-[10px] text-emerald-400 block mt-1 font-medium">
                        ✓ Valor efetivamente cobrado
                      </span>
                    </div>

                    {/* Preço Original sem Desconto (Valor Riscado) */}
                    <div>
                      <label className="block text-white font-bold mb-1 text-xs">
                        Preço Original s/ Desconto (R$)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        disabled={planForm.planType === 'COURTESY'}
                        value={planForm.originalPrice}
                        onChange={(e) => setPlanForm({ ...planForm, originalPrice: e.target.value })}
                        placeholder="79.90 (opcional)"
                        className="w-full px-3 py-2 rounded-xl bg-[#111827] border border-[#374151] text-white font-semibold focus:outline-none focus:border-blue-500 disabled:opacity-50"
                      />
                      <span className="text-[10px] text-gray-400 block mt-1">
                        Aparecerá riscado (ex: ~De R$ 79,90~)
                      </span>
                    </div>

                    {/* Selo/Badge de Desconto */}
                    <div>
                      <label className="block text-white font-bold mb-1 text-xs">
                        Selo / Badge de Desconto
                      </label>
                      <input
                        type="text"
                        disabled={planForm.planType === 'COURTESY'}
                        value={planForm.discountBadge}
                        onChange={(e) => setPlanForm({ ...planForm, discountBadge: e.target.value })}
                        placeholder="Ex: 38% OFF ou Oferta Especial"
                        className="w-full px-3 py-2 rounded-xl bg-[#111827] border border-[#374151] text-white font-semibold focus:outline-none focus:border-blue-500 disabled:opacity-50"
                      />
                      <span className="text-[10px] text-gray-400 block mt-1">
                        Se vazio, calcula % automático
                      </span>
                    </div>
                  </div>

                  {/* Prévia Visual do Desconto para o Cliente */}
                  {planForm.planType === 'PAID' && (
                    <div className="mt-2 p-3 rounded-lg bg-emerald-950/40 border border-emerald-800/40 text-xs">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <span className="text-gray-300 font-medium">
                          👁️ <strong>Prévia na Landing Page:</strong>
                        </span>
                        <div className="flex items-center gap-2">
                          {Number(planForm.originalPrice) > Number(planForm.price) && (
                            <span className="text-slate-400 line-through text-xs font-semibold">
                              De R$ {parseFloat(planForm.originalPrice || '0').toFixed(2).replace('.', ',')}
                            </span>
                          )}
                          <span className="text-white font-black text-sm">
                            Por R$ {parseFloat(planForm.price || '0').toFixed(2).replace('.', ',')}
                            <span className="text-xs text-gray-300 font-normal">
                              /{planForm.cycleType === 'YEARLY' ? 'ano' : 'mês'}
                            </span>
                          </span>
                          {Number(planForm.originalPrice) > Number(planForm.price) && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                              {planForm.discountBadge.trim() ||
                                `${Math.round(
                                  ((Number(planForm.originalPrice) - Number(planForm.price)) /
                                    Number(planForm.originalPrice)) *
                                    100
                                )}% OFF`}
                            </span>
                          )}
                        </div>
                      </div>
                      {Number(planForm.originalPrice) > Number(planForm.price) && (
                        <div className="text-[11px] text-emerald-400 mt-1 font-medium">
                          🎉 O cliente terá a percepção de economizar{' '}
                          <strong>
                            R$ {(Number(planForm.originalPrice) - Number(planForm.price)).toFixed(2).replace('.', ',')}
                          </strong>{' '}
                          ao contratar este plano com desconto!
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Descrição */}
                <div>
                  <label className="block text-white font-bold mb-1">Descrição Comercial</label>
                  <input
                    type="text"
                    value={planForm.description}
                    onChange={(e) => setPlanForm({ ...planForm, description: e.target.value })}
                    placeholder="Ex: Completo com agendamentos ilimitados e suporte VIP"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#030712] border border-[#374151] text-white font-medium focus:outline-none focus:border-blue-500"
                  />
                </div>

                {/* Recursos */}
                <div>
                  <label className="block text-white font-bold mb-1">Recursos (separados por vírgula)</label>
                  <textarea
                    rows={2}
                    value={planForm.features}
                    onChange={(e) => setPlanForm({ ...planForm, features: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl bg-[#030712] border border-[#374151] text-white font-medium focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#374151]">
                  <button
                    type="button"
                    onClick={() => setPlanModalOpen(false)}
                    className="px-4 py-2 text-xs md:text-sm rounded-xl border border-[#4b5563] bg-[#1f2937] hover:bg-[#374151] text-white font-bold"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-5 py-2 text-xs md:text-sm rounded-xl bg-[#2563eb] text-white font-bold hover:bg-blue-600 border border-[#3b82f6] transition-all disabled:opacity-50"
                  >
                    {submitting ? 'Salvando...' : editingPlan ? 'Atualizar Plano' : 'Criar Plano'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal 2: Smart Delete / Discontinue Confirmation */}
        {deleteConfirmPlan && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85">
            <div className="bg-[#111827] border border-[#374151] rounded-2xl p-6 md:p-8 max-w-md w-full space-y-5 shadow-2xl text-white">
              <div className="flex items-center gap-3">
                <div
                  className={`p-3 rounded-xl shrink-0 ${
                    (deleteConfirmPlan._count?.subscriptions || 0) > 0
                      ? 'bg-[#d97706] text-white border border-[#f59e0b]'
                      : 'bg-[#dc2626] text-white border border-[#ef4444]'
                  }`}
                >
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">
                    {(deleteConfirmPlan._count?.subscriptions || 0) > 0
                      ? 'Descontinuar plano?'
                      : 'Excluir plano?'}
                  </h3>
                  <p className="text-xs text-gray-300 font-mono">
                    Plano: {deleteConfirmPlan.name}
                  </p>
                </div>
              </div>

              {(deleteConfirmPlan._count?.subscriptions || 0) > 0 ? (
                <div className="space-y-3 text-xs md:text-sm text-gray-200 bg-[#030712] p-4 rounded-xl border border-[#374151]">
                  <p className="font-bold text-white">
                    Este plano possui{' '}
                    <span className="text-blue-400 font-extrabold">
                      {deleteConfirmPlan._count?.subscriptions} barbearias
                    </span>{' '}
                    com histórico/assinaturas vinculadas.
                  </p>
                  <p>
                    As assinaturas existentes <strong className="text-white">NÃO serão canceladas</strong>.
                    As barbearias continuarão utilizando o plano normalmente até o término do período contratado.
                  </p>
                  <p>
                    Após a descontinuação, novas barbearias não poderão contratar este plano.
                  </p>
                  <p className="font-bold text-white pt-1">Deseja continuar?</p>
                </div>
              ) : (
                <div className="text-xs md:text-sm text-gray-200 bg-[#030712] p-4 rounded-xl border border-[#374151]">
                  <p>Este plano não possui assinaturas ativas ou histórico registrado.</p>
                  <p className="mt-2 text-white font-bold">
                    Deseja realmente excluir este registro definitivamente do banco de dados?
                  </p>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setDeleteConfirmPlan(null)}
                  disabled={submitting}
                  className="px-4 py-2 text-xs md:text-sm rounded-xl border border-[#4b5563] bg-[#1f2937] hover:bg-[#374151] text-white font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleExecuteDeleteOrDeactivate}
                  disabled={submitting}
                  className={`px-5 py-2 text-xs md:text-sm rounded-xl font-bold transition-all border ${
                    (deleteConfirmPlan._count?.subscriptions || 0) > 0
                      ? 'bg-[#d97706] hover:bg-amber-600 text-white border-[#f59e0b]'
                      : 'bg-[#dc2626] hover:bg-red-600 text-white border-[#ef4444]'
                  }`}
                >
                  {submitting
                    ? 'Processando...'
                    : (deleteConfirmPlan._count?.subscriptions || 0) > 0
                    ? 'Descontinuar plano'
                    : 'Excluir'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal 3: Grant Courtesy Subscription */}
        {courtesyModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85">
            <div className="bg-[#111827] border border-[#374151] rounded-2xl p-6 md:p-8 max-w-lg w-full space-y-6 shadow-2xl text-white">
              <div className="flex items-center justify-between border-b border-[#374151] pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-[#d97706] text-white border border-[#f59e0b]">
                    <Gift className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">Conceder Plano Cortesia</h3>
                    <p className="text-xs text-gray-300 mt-0.5 font-medium">
                      Atribuição direta pelo DEVELOPER sem cobrança financeira.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setCourtesyModalOpen(false)}
                  className="text-white hover:text-gray-300 text-sm font-bold p-1"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleGrantCourtesy} className="space-y-4 text-xs md:text-sm">
                <div>
                  <label className="block text-white font-bold mb-1">Barbearia Beneficiada *</label>
                  {barbershops.length > 0 ? (
                    <select
                      required
                      value={courtesyForm.barbershopId}
                      onChange={(e) => setCourtesyForm({ ...courtesyForm, barbershopId: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#030712] border border-[#374151] text-white font-medium focus:outline-none focus:border-blue-500"
                    >
                      <option value="">Selecione uma barbearia...</option>
                      {barbershops.map((shop) => (
                        <option key={shop.id} value={shop.id}>
                          {shop.name} ({shop.slug})
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      required
                      value={courtesyForm.barbershopId}
                      onChange={(e) => setCourtesyForm({ ...courtesyForm, barbershopId: e.target.value })}
                      placeholder="ID da Barbearia (ex: clyxxx...)"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#030712] border border-[#374151] text-white font-medium focus:outline-none focus:border-blue-500"
                    />
                  )}
                </div>

                <div>
                  <label className="block text-white font-bold mb-1">
                    Plano Cortesia Existente (opcional)
                  </label>
                  <select
                    value={courtesyForm.planId}
                    onChange={(e) => setCourtesyForm({ ...courtesyForm, planId: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#030712] border border-[#374151] text-white font-medium focus:outline-none focus:border-blue-500"
                  >
                    <option value="">Nenhum (Criar/Utilizar Cortesia Personalizada)</option>
                    {plans
                      .filter((p) => p.planType === 'COURTESY' && p.status === 'ACTIVE')
                      .map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({p.durationDays} dias)
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="block text-white font-bold mb-1">Duração da Cortesia (Dias) *</label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {[7, 15, 30, 45, 60, 90, 180, 365].map((days) => (
                      <button
                        type="button"
                        key={days}
                        onClick={() => setCourtesyForm({ ...courtesyForm, durationDays: String(days) })}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                          courtesyForm.durationDays === String(days)
                            ? 'bg-[#d97706] text-white border-[#f59e0b]'
                            : 'bg-[#1f2937] border-[#4b5563] text-white hover:bg-[#374151]'
                        }`}
                      >
                        {days} dias
                      </button>
                    ))}
                  </div>
                  <input
                    type="number"
                    min="1"
                    required
                    value={courtesyForm.durationDays}
                    onChange={(e) => setCourtesyForm({ ...courtesyForm, durationDays: e.target.value })}
                    placeholder="Quantidade de dias"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#030712] border border-[#374151] text-white font-medium focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-white font-bold mb-1">Motivo / Observações</label>
                  <input
                    type="text"
                    value={courtesyForm.notes}
                    onChange={(e) => setCourtesyForm({ ...courtesyForm, notes: e.target.value })}
                    placeholder="Ex: Parceria institucional, Teste estendido, etc."
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#030712] border border-[#374151] text-white font-medium focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#374151]">
                  <button
                    type="button"
                    onClick={() => setCourtesyModalOpen(false)}
                    className="px-4 py-2 text-xs md:text-sm rounded-xl border border-[#4b5563] bg-[#1f2937] hover:bg-[#374151] text-white font-bold"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-5 py-2 text-xs md:text-sm rounded-xl bg-[#d97706] text-white font-bold hover:bg-amber-600 border border-[#f59e0b] transition-all disabled:opacity-50"
                  >
                    {submitting ? 'Concedendo...' : 'Conceder Cortesia'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal 4: View History / Audit Details */}
        {viewHistoryPlan && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85">
            <div className="bg-[#111827] border border-[#374151] rounded-2xl p-6 md:p-8 max-w-2xl w-full space-y-6 shadow-2xl max-h-[85vh] overflow-y-auto text-white">
              <div className="flex items-center justify-between border-b border-[#374151] pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold text-white">{viewHistoryPlan.name}</h3>
                    {viewHistoryPlan.status === 'INACTIVE' && (
                      <span className="px-2.5 py-0.5 text-[10px] font-bold rounded bg-[#dc2626] text-white border border-[#ef4444]">
                        Descontinuado
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-300 mt-0.5 font-medium">
                    Histórico de barbearias e assinaturas contratadas sob as condições deste plano.
                  </p>
                </div>
                <button
                  onClick={() => setViewHistoryPlan(null)}
                  className="text-white hover:text-gray-300 text-sm font-bold p-1"
                >
                  ✕
                </button>
              </div>

              {/* Informações Resumidas */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-[#030712] p-4 rounded-xl border border-[#374151] text-xs">
                <div>
                  <div className="text-gray-300 font-bold">Preço Original</div>
                  <div className="font-black text-sm text-white">
                    {formatPrice(viewHistoryPlan.price)}
                  </div>
                </div>
                <div>
                  <div className="text-gray-300 font-bold">Ciclo</div>
                  <div className="font-bold text-white">
                    {getCycleLabel(viewHistoryPlan.cycleType, viewHistoryPlan.billingInterval)}
                  </div>
                </div>
                <div>
                  <div className="text-gray-300 font-bold">Duração</div>
                  <div className="font-bold text-white">{viewHistoryPlan.durationDays} dias</div>
                </div>
                <div>
                  <div className="text-gray-300 font-bold">Total Assinaturas</div>
                  <div className="font-extrabold text-sm text-blue-400">
                    {viewHistoryPlan.totalSubscriptionsCount ??
                      viewHistoryPlan.subscriptions?.length ??
                      viewHistoryPlan._count?.subscriptions ??
                      0}
                  </div>
                </div>
              </div>

              {/* Lista de Assinaturas Históricas */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-white">
                  Histórico de Assinaturas Vinculadas
                </h4>

                {Array.isArray(viewHistoryPlan.subscriptions) &&
                viewHistoryPlan.subscriptions.length > 0 ? (
                  <div className="divide-y divide-[#374151] border border-[#374151] rounded-xl overflow-hidden">
                    {viewHistoryPlan.subscriptions.map((sub: any) => (
                      <div
                        key={sub.id}
                        className="p-3 bg-[#030712] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                      >
                        <div>
                          <div className="font-bold text-white">
                            {sub.barbershop?.name || `Barbearia #${sub.barbershopId}`}
                          </div>
                          <div className="text-gray-300 text-[11px] font-mono">
                            {new Date(sub.currentPeriodStart).toLocaleDateString('pt-BR')} até{' '}
                            {new Date(sub.currentPeriodEnd).toLocaleDateString('pt-BR')}
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <span className="font-black text-white">
                            {formatPrice(sub.price ?? viewHistoryPlan.price)}
                          </span>
                          <span
                            className={`px-2.5 py-1 rounded text-[10px] font-bold ${
                              sub.status === 'ACTIVE'
                                ? 'bg-[#059669] text-white border border-[#10b981]'
                                : 'bg-[#1f2937] text-white border border-[#4b5563]'
                            }`}
                          >
                            {sub.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-xs text-white font-medium border border-dashed border-[#374151] rounded-xl bg-[#030712]">
                    Nenhuma barbearia assinou este plano até o momento.
                  </div>
                )}
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setViewHistoryPlan(null)}
                  className="px-5 py-2 text-xs font-bold rounded-xl bg-[#1f2937] hover:bg-[#374151] text-white border border-[#4b5563]"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
