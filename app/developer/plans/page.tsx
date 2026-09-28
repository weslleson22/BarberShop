'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import DropdownHeader from '@/components/shared/DropdownHeader'
import { useAuth } from '@/lib/auth-context'
import { getAuthHeaders } from '@/lib/utils'
import {
  Sparkles,
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
  currency: string
  billingInterval: string
  trialDays?: number
  features?: string[] | any
  status: 'ACTIVE' | 'INACTIVE'
  isActive: boolean
  provider?: string
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
      status: 'ACTIVE',
      trialDays: '0',
      features: 'Agendamento online, Gestão de profissionais, Relatórios financeiros, Página pública',
    })
    setPlanModalOpen(true)
  }

  // Open Edit Modal
  const handleOpenEdit = (plan: PlanItem) => {
    setEditingPlan(plan)
    const featuresStr = Array.isArray(plan.features) ? plan.features.join(', ') : ''
    setPlanForm({
      name: plan.name,
      slug: plan.slug,
      description: plan.description || '',
      planType: plan.planType,
      cycleType: plan.cycleType,
      durationDays: plan.durationDays ? String(plan.durationDays) : '30',
      price: plan.planType === 'COURTESY' ? '0' : String(plan.price),
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
      // Tab filter
      if (activeTab === 'ACTIVE' && p.status !== 'ACTIVE') return false
      if (activeTab === 'INACTIVE' && p.status !== 'INACTIVE') return false
      if (activeTab === 'PAID' && p.planType !== 'PAID') return false
      if (activeTab === 'COURTESY' && p.planType !== 'COURTESY') return false

      // Search filter
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
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background text-foreground pb-20 pt-20">
      <DropdownHeader />

      <main className="w-full px-4 md:px-8 max-w-7xl mx-auto space-y-8">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-primary text-xs font-semibold uppercase tracking-wider mb-1">
              <Sparkles className="w-4 h-4" />
              <span>Gestão de Planos & Assinaturas SaaS</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">Catálogo de Planos</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Gerencie planos pagos, cortesias com período livre, descontinuação segura e histórico de assinaturas.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={fetchPlans}
              disabled={loading}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs md:text-sm font-medium rounded-xl border border-border bg-card hover:bg-accent text-foreground transition-all shadow-sm"
              title="Atualizar lista"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Atualizar
            </button>
            <button
              onClick={() => setCourtesyModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs md:text-sm font-semibold rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 transition-all shadow-sm"
            >
              <Gift className="w-4 h-4" />
              <span>Conceder Cortesia</span>
            </button>
            <button
              onClick={handleOpenCreate}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs md:text-sm font-semibold rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm transition-all"
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
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                : 'bg-destructive/10 border-destructive/30 text-destructive-foreground'
            }`}
          >
            <div className="flex items-center gap-2.5">
              {feedback.type === 'success' ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-destructive shrink-0" />
              )}
              <span>{feedback.message}</span>
            </div>
            <button onClick={() => setFeedback(null)} className="opacity-70 hover:opacity-100 text-xs font-bold">
              ✕
            </button>
          </div>
        )}

        {/* Filters and Search Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card border border-border p-3 rounded-2xl shadow-sm">
          {/* Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
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
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                  activeTab === tab.id
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por nome ou slug..."
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl bg-background border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>

        {/* Plans Table (Requirement 21) */}
        <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs md:text-sm">
              <thead className="bg-muted/50 border-b border-border text-muted-foreground font-semibold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3.5 px-4 md:px-6">Plano</th>
                  <th className="py-3.5 px-3">Tipo</th>
                  <th className="py-3.5 px-3">Ciclo</th>
                  <th className="py-3.5 px-3 text-center">Duração</th>
                  <th className="py-3.5 px-4 text-right">Preço</th>
                  <th className="py-3.5 px-3 text-center">Assinaturas</th>
                  <th className="py-3.5 px-3 text-center">Status</th>
                  <th className="py-3.5 px-4 md:px-6 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-muted-foreground">
                      <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-primary" />
                      Carregando catálogo de planos...
                    </td>
                  </tr>
                ) : filteredPlans.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-muted-foreground">
                      <Layers className="w-8 h-8 mx-auto mb-2 opacity-40" />
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
                        className={`hover:bg-accent/40 transition-colors ${
                          isInactive ? 'opacity-70 bg-muted/20' : ''
                        }`}
                      >
                        {/* Plano Column */}
                        <td className="py-4 px-4 md:px-6 font-medium text-foreground">
                          <div className="font-bold text-sm text-foreground flex items-center gap-2">
                            {plan.name}
                            {isCourtesy && (
                              <span title="Plano Cortesia">
                                <Gift className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-muted-foreground font-mono mt-0.5">
                            slug: {plan.slug}
                          </div>
                          {plan.description && (
                            <div className="text-xs text-muted-foreground/80 line-clamp-1 mt-0.5">
                              {plan.description}
                            </div>
                          )}
                        </td>

                        {/* Tipo Column */}
                        <td className="py-4 px-3">
                          {isCourtesy ? (
                            <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                              Cortesia
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                              Pago
                            </span>
                          )}
                        </td>

                        {/* Ciclo Column */}
                        <td className="py-4 px-3 font-medium text-foreground">
                          {getCycleLabel(plan.cycleType, plan.billingInterval)}
                        </td>

                        {/* Duração Column */}
                        <td className="py-4 px-3 text-center text-muted-foreground font-medium">
                          {plan.durationDays || (plan.billingInterval === 'YEARLY' ? 365 : 30)} dias
                        </td>

                        {/* Preço Column */}
                        <td className="py-4 px-4 text-right font-extrabold text-foreground">
                          {isCourtesy ? (
                            <span className="text-muted-foreground font-medium">R$ 0,00</span>
                          ) : (
                            formatPrice(plan.price)
                          )}
                        </td>

                        {/* Assinaturas Column */}
                        <td className="py-4 px-3 text-center">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold ${
                              subCount > 0
                                ? 'bg-primary/20 text-primary border border-primary/30'
                                : 'bg-muted text-muted-foreground'
                            }`}
                          >
                            {subCount}
                          </span>
                        </td>

                        {/* Status Column */}
                        <td className="py-4 px-3 text-center">
                          {plan.status === 'ACTIVE' ? (
                            <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                              Ativo
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                              Descontinuado
                            </span>
                          )}
                        </td>

                        {/* Ações Column */}
                        <td className="py-4 px-4 md:px-6 text-right space-x-1.5 whitespace-nowrap">
                          {plan.status === 'ACTIVE' ? (
                            <>
                              <button
                                onClick={() => handleOpenEdit(plan)}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-border hover:bg-accent text-foreground text-xs font-medium transition-all"
                                title="Editar configurações do plano"
                              >
                                <Edit2 className="w-3.5 h-3.5 text-muted-foreground" />
                                <span>Editar</span>
                              </button>

                              <button
                                onClick={() => setDeleteConfirmPlan(plan)}
                                className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                                  subCount > 0
                                    ? 'border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400'
                                    : 'border-destructive/30 bg-destructive/10 hover:bg-destructive/20 text-destructive'
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
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-border hover:bg-accent text-foreground text-xs font-medium transition-all"
                                title="Visualizar histórico e assinantes"
                              >
                                <Eye className="w-3.5 h-3.5 text-muted-foreground" />
                                <span>Visualizar</span>
                              </button>
                              <button
                                onClick={() => handleOpenEdit(plan)}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-border hover:bg-accent text-muted-foreground text-xs font-medium transition-all"
                                title="Editar ou Reativar"
                              >
                                <RotateCcw className="w-3.5 h-3.5" />
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
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
            <div className="bg-card border border-border rounded-2xl p-6 md:p-8 max-w-xl w-full space-y-6 shadow-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-border pb-4">
                <div>
                  <h3 className="text-lg font-bold text-foreground">
                    {editingPlan ? `Editar Plano: ${editingPlan.name}` : 'Novo Plano SaaS'}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Defina tipo, ciclo de vigência, preço e regras contratuais.
                  </p>
                </div>
                <button
                  onClick={() => setPlanModalOpen(false)}
                  className="text-muted-foreground hover:text-foreground text-sm font-bold p-1"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSubmitPlan} className="space-y-4 text-xs md:text-sm">
                {/* Nome & Slug */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-foreground font-medium mb-1">Nome do Plano *</label>
                    <input
                      type="text"
                      required
                      value={planForm.name}
                      onChange={(e) => setPlanForm({ ...planForm, name: e.target.value })}
                      placeholder="Ex: Pro Anual, Cortesia VIP"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-background border border-border text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-foreground font-medium mb-1">Slug Identificador</label>
                    <input
                      type="text"
                      value={planForm.slug}
                      onChange={(e) => setPlanForm({ ...planForm, slug: e.target.value })}
                      placeholder="pro-anual (opcional)"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-background border border-border text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                </div>

                {/* Tipo de Plano (PAID vs COURTESY) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-foreground font-medium mb-1">Tipo de Plano *</label>
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
                      className="w-full px-3.5 py-2.5 rounded-xl bg-background border border-border text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                      <option value="PAID">Comercial Pago (PAID)</option>
                      <option value="COURTESY">Cortesia / Isento (COURTESY)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-foreground font-medium mb-1">Status do Plano *</label>
                    <select
                      value={planForm.status}
                      onChange={(e) => setPlanForm({ ...planForm, status: e.target.value as 'ACTIVE' | 'INACTIVE' })}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-background border border-border text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                      <option value="ACTIVE">ACTIVE (Disponível para contratação)</option>
                      <option value="INACTIVE">INACTIVE (Descontinuado para novas)</option>
                    </select>
                  </div>
                </div>

                {/* Ciclo & Duração */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-foreground font-medium mb-1">Ciclo *</label>
                    <select
                      value={planForm.cycleType}
                      onChange={(e) => {
                        const cycle = e.target.value as 'MONTHLY' | 'YEARLY' | 'CUSTOM'
                        let defDays = '30'
                        if (cycle === 'YEARLY') defDays = '365'
                        if (cycle === 'CUSTOM') defDays = planForm.durationDays || '45'
                        setPlanForm({ ...planForm, cycleType: cycle, durationDays: defDays })
                      }}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-background border border-border text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                      <option value="MONTHLY">Mensal (30 dias)</option>
                      <option value="YEARLY">Anual (365 dias)</option>
                      <option value="CUSTOM">Personalizado (Dias)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-foreground font-medium mb-1">
                      Duração (Dias) {planForm.cycleType === 'CUSTOM' ? '*' : ''}
                    </label>
                    <input
                      type="number"
                      min="1"
                      required
                      value={planForm.durationDays}
                      onChange={(e) => setPlanForm({ ...planForm, durationDays: e.target.value })}
                      disabled={planForm.cycleType !== 'CUSTOM'}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-background border border-border text-foreground focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50 disabled:bg-muted"
                    />
                  </div>

                  <div>
                    <label className="block text-foreground font-medium mb-1">Preço (R$) *</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      required
                      disabled={planForm.planType === 'COURTESY'}
                      value={planForm.planType === 'COURTESY' ? '0' : planForm.price}
                      onChange={(e) => setPlanForm({ ...planForm, price: e.target.value })}
                      placeholder="97.00"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-background border border-border text-foreground focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50 disabled:bg-muted"
                    />
                  </div>
                </div>

                {/* Descrição */}
                <div>
                  <label className="block text-foreground font-medium mb-1">Descrição Comercial</label>
                  <input
                    type="text"
                    value={planForm.description}
                    onChange={(e) => setPlanForm({ ...planForm, description: e.target.value })}
                    placeholder="Ex: Completo com agendamentos ilimitados e suporte VIP"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-background border border-border text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                {/* Recursos */}
                <div>
                  <label className="block text-foreground font-medium mb-1">Recursos (separados por vírgula)</label>
                  <textarea
                    rows={2}
                    value={planForm.features}
                    onChange={(e) => setPlanForm({ ...planForm, features: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl bg-background border border-border text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
                  <button
                    type="button"
                    onClick={() => setPlanModalOpen(false)}
                    className="px-4 py-2 text-xs md:text-sm rounded-xl border border-border hover:bg-muted text-muted-foreground font-medium"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-5 py-2 text-xs md:text-sm rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-all disabled:opacity-50"
                  >
                    {submitting ? 'Salvando...' : editingPlan ? 'Atualizar Plano' : 'Criar Plano'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal 2: Smart Delete / Discontinue Confirmation (Requirements 14 & 15) */}
        {deleteConfirmPlan && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="bg-card border border-border rounded-2xl p-6 md:p-8 max-w-md w-full space-y-5 shadow-2xl">
              <div className="flex items-center gap-3">
                <div
                  className={`p-3 rounded-xl shrink-0 ${
                    (deleteConfirmPlan._count?.subscriptions || 0) > 0
                      ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                      : 'bg-destructive/10 text-destructive border border-destructive/20'
                  }`}
                >
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-foreground">
                    {(deleteConfirmPlan._count?.subscriptions || 0) > 0
                      ? 'Descontinuar plano?'
                      : 'Excluir plano?'}
                  </h3>
                  <p className="text-xs text-muted-foreground font-mono">
                    Plano: {deleteConfirmPlan.name}
                  </p>
                </div>
              </div>

              {/* Requirement 14 Dynamic Text */}
              {(deleteConfirmPlan._count?.subscriptions || 0) > 0 ? (
                <div className="space-y-3 text-xs md:text-sm text-muted-foreground bg-muted/30 p-4 rounded-xl border border-border">
                  <p className="font-semibold text-foreground">
                    Este plano possui{' '}
                    <span className="text-primary font-bold">
                      {deleteConfirmPlan._count?.subscriptions} barbearias
                    </span>{' '}
                    com histórico/assinaturas vinculadas.
                  </p>
                  <p>
                    As assinaturas existentes <strong className="text-foreground">NÃO serão canceladas</strong>.
                    As barbearias continuarão utilizando o plano normalmente até o término do período contratado.
                  </p>
                  <p>
                    Após a descontinuação, novas barbearias não poderão contratar este plano.
                  </p>
                  <p className="font-medium text-foreground pt-1">Deseja continuar?</p>
                </div>
              ) : (
                <div className="text-xs md:text-sm text-muted-foreground bg-muted/30 p-4 rounded-xl border border-border">
                  <p>Este plano não possui assinaturas ativas ou histórico registrado.</p>
                  <p className="mt-2 text-foreground font-medium">
                    Deseja realmente excluir este registro definitivamente do banco de dados?
                  </p>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setDeleteConfirmPlan(null)}
                  disabled={submitting}
                  className="px-4 py-2 text-xs md:text-sm rounded-xl border border-border hover:bg-muted text-muted-foreground font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleExecuteDeleteOrDeactivate}
                  disabled={submitting}
                  className={`px-5 py-2 text-xs md:text-sm rounded-xl font-semibold transition-all ${
                    (deleteConfirmPlan._count?.subscriptions || 0) > 0
                      ? 'bg-amber-600 hover:bg-amber-500 text-white'
                      : 'bg-destructive hover:bg-destructive/90 text-destructive-foreground'
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

        {/* Modal 3: Grant Courtesy Subscription (Requirements 2, 3, 4) */}
        {courtesyModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
            <div className="bg-card border border-border rounded-2xl p-6 md:p-8 max-w-lg w-full space-y-6 shadow-2xl">
              <div className="flex items-center justify-between border-b border-border pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    <Gift className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-foreground">Conceder Plano Cortesia</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Atribuição direta pelo DEVELOPER sem cobrança financeira.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setCourtesyModalOpen(false)}
                  className="text-muted-foreground hover:text-foreground text-sm font-bold p-1"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleGrantCourtesy} className="space-y-4 text-xs md:text-sm">
                <div>
                  <label className="block text-foreground font-medium mb-1">Barbearia Beneficiada *</label>
                  {barbershops.length > 0 ? (
                    <select
                      required
                      value={courtesyForm.barbershopId}
                      onChange={(e) => setCourtesyForm({ ...courtesyForm, barbershopId: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-background border border-border text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
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
                      className="w-full px-3.5 py-2.5 rounded-xl bg-background border border-border text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  )}
                </div>

                <div>
                  <label className="block text-foreground font-medium mb-1">
                    Plano Cortesia Existente (opcional)
                  </label>
                  <select
                    value={courtesyForm.planId}
                    onChange={(e) => setCourtesyForm({ ...courtesyForm, planId: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-background border border-border text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
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
                  <label className="block text-foreground font-medium mb-1">Duração da Cortesia (Dias) *</label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {[7, 15, 30, 45, 60, 90, 180, 365].map((days) => (
                      <button
                        type="button"
                        key={days}
                        onClick={() => setCourtesyForm({ ...courtesyForm, durationDays: String(days) })}
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all border ${
                          courtesyForm.durationDays === String(days)
                            ? 'bg-amber-500 text-black border-amber-500'
                            : 'bg-muted/40 border-border text-muted-foreground hover:text-foreground'
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
                    className="w-full px-3.5 py-2.5 rounded-xl bg-background border border-border text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div>
                  <label className="block text-foreground font-medium mb-1">Motivo / Observações</label>
                  <input
                    type="text"
                    value={courtesyForm.notes}
                    onChange={(e) => setCourtesyForm({ ...courtesyForm, notes: e.target.value })}
                    placeholder="Ex: Parceria institucional, Teste estendido, etc."
                    className="w-full px-3.5 py-2.5 rounded-xl bg-background border border-border text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
                  <button
                    type="button"
                    onClick={() => setCourtesyModalOpen(false)}
                    className="px-4 py-2 text-xs md:text-sm rounded-xl border border-border hover:bg-muted text-muted-foreground font-medium"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-5 py-2 text-xs md:text-sm rounded-xl bg-amber-500 text-black font-bold hover:bg-amber-400 transition-all disabled:opacity-50"
                  >
                    {submitting ? 'Concedendo...' : 'Conceder Cortesia'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal 4: View History / Audit Details (Requirement 11) */}
        {viewHistoryPlan && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="bg-card border border-border rounded-2xl p-6 md:p-8 max-w-2xl w-full space-y-6 shadow-2xl max-h-[85vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-border pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold text-foreground">{viewHistoryPlan.name}</h3>
                    {viewHistoryPlan.status === 'INACTIVE' && (
                      <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
                        Descontinuado
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Histórico de barbearias e assinaturas contratadas sob as condições deste plano.
                  </p>
                </div>
                <button
                  onClick={() => setViewHistoryPlan(null)}
                  className="text-muted-foreground hover:text-foreground text-sm font-bold p-1"
                >
                  ✕
                </button>
              </div>

              {/* Informações Resumidas */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-muted/30 p-3 rounded-xl border border-border text-xs">
                <div>
                  <div className="text-muted-foreground">Preço Original</div>
                  <div className="font-extrabold text-sm text-foreground">
                    {formatPrice(viewHistoryPlan.price)}
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground">Ciclo</div>
                  <div className="font-semibold text-foreground">
                    {getCycleLabel(viewHistoryPlan.cycleType, viewHistoryPlan.billingInterval)}
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground">Duração</div>
                  <div className="font-semibold text-foreground">{viewHistoryPlan.durationDays} dias</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Total Assinaturas</div>
                  <div className="font-extrabold text-sm text-primary">
                    {viewHistoryPlan.totalSubscriptionsCount ??
                      viewHistoryPlan.subscriptions?.length ??
                      viewHistoryPlan._count?.subscriptions ??
                      0}
                  </div>
                </div>
              </div>

              {/* Lista de Assinaturas Históricas */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Histórico de Assinaturas Vinculadas
                </h4>

                {Array.isArray(viewHistoryPlan.subscriptions) &&
                viewHistoryPlan.subscriptions.length > 0 ? (
                  <div className="divide-y divide-border border border-border rounded-xl overflow-hidden">
                    {viewHistoryPlan.subscriptions.map((sub: any) => (
                      <div
                        key={sub.id}
                        className="p-3 bg-card flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                      >
                        <div>
                          <div className="font-bold text-foreground">
                            {sub.barbershop?.name || `Barbearia #${sub.barbershopId}`}
                          </div>
                          <div className="text-muted-foreground text-[11px] font-mono">
                            {new Date(sub.currentPeriodStart).toLocaleDateString('pt-BR')} até{' '}
                            {new Date(sub.currentPeriodEnd).toLocaleDateString('pt-BR')}
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <span className="font-bold text-foreground">
                            {formatPrice(sub.price ?? viewHistoryPlan.price)}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              sub.status === 'ACTIVE'
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                : 'bg-muted text-muted-foreground'
                            }`}
                          >
                            {sub.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-xs text-muted-foreground border border-dashed border-border rounded-xl">
                    Nenhuma barbearia assinou este plano até o momento.
                  </div>
                )}
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setViewHistoryPlan(null)}
                  className="px-4 py-2 text-xs font-medium rounded-xl bg-muted hover:bg-muted/80 text-foreground"
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
