'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import DropdownHeader from '@/components/shared/DropdownHeader'
import { useAuth } from '@/lib/auth-context'
import { getAuthHeaders } from '@/lib/utils'
import {
  Sparkles,
  Plus,
  Check,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  DollarSign,
  Calendar,
  Layers
} from 'lucide-react'

interface Plan {
  id: string
  name: string
  slug: string
  description?: string
  price: number
  currency: string
  billingInterval: string
  trialDays?: number
  features?: string[] | any
  isActive: boolean
}

export default function DeveloperPlansPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()

  const [plans, setPlans] = useState<Plan[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    price: '',
    billingInterval: 'MONTHLY',
    trialDays: '30',
    features: 'Agendamento online, Gestão de barbeiros, Relatórios financeiros, Página pública',
    isActive: true,
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

  useEffect(() => {
    if (user?.role === 'DEVELOPER') {
      fetchPlans()
    }
  }, [user])

  const handleCreatePlan = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setFeedback(null)

    try {
      const featuresArray = formData.features
        .split(',')
        .map((f) => f.trim())
        .filter(Boolean)

      const payload = {
        name: formData.name,
        slug: formData.slug || formData.name.toLowerCase().replace(/\s+/g, '-'),
        description: formData.description,
        price: parseFloat(formData.price),
        currency: 'BRL',
        billingInterval: formData.billingInterval,
        trialDays: parseInt(formData.trialDays, 10) || 30,
        features: featuresArray,
        isActive: formData.isActive,
      }

      const res = await fetch('/api/billing/plans', {
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
        setFeedback({ type: 'success', message: `Plano "${data.name}" criado com sucesso!` })
        setModalOpen(false)
        setFormData({
          name: '',
          slug: '',
          description: '',
          price: '',
          billingInterval: 'MONTHLY',
          trialDays: '30',
          features: 'Agendamento online, Gestão de barbeiros, Relatórios financeiros, Página pública',
          isActive: true,
        })
        await fetchPlans()
      } else {
        setFeedback({ type: 'error', message: data.error || 'Erro ao cadastrar plano.' })
      }
    } catch {
      setFeedback({ type: 'error', message: 'Erro de conexão ao salvar plano.' })
    } finally {
      setSubmitting(false)
    }
  }

  const formatPrice = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)
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
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-primary text-xs font-semibold uppercase tracking-wider mb-1">
              <Sparkles className="w-4 h-4" />
              <span>Gestão de Planos & Precificação</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">Catálogo de Planos do SaaS</h1>
            <p className="text-sm md:text-base text-muted-foreground mt-1">
              Configure as ofertas comerciais, preços, periodicidade e limites de recursos para os estabelecimentos.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={fetchPlans}
              disabled={loading}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs md:text-sm font-medium rounded-xl border border-border bg-card hover:bg-accent text-foreground transition-all"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Atualizar
            </button>
            <button
              onClick={() => setModalOpen(true)}
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
            <button onClick={() => setFeedback(null)} className="opacity-70 hover:opacity-100 text-xs">
              ✕
            </button>
          </div>
        )}

        {/* Plans Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map((n) => (
              <div key={n} className="bg-card border border-border rounded-2xl p-6 h-72 animate-pulse" />
            ))}
          </div>
        ) : plans.length === 0 ? (
          <div className="bg-card border border-dashed border-border rounded-2xl p-12 text-center">
            <Layers className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-50" />
            <h3 className="font-bold text-foreground text-base">Nenhum plano cadastrado no SaaS</h3>
            <p className="text-xs text-muted-foreground mt-1 mb-4">Cadastre planos comerciais para que as barbearias possam contratar.</p>
            <button
              onClick={() => setModalOpen(true)}
              className="px-4 py-2 text-xs font-semibold rounded-xl bg-primary text-primary-foreground"
            >
              Criar Primeiro Plano
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {plans.map((p) => {
              const features = Array.isArray(p.features) ? p.features : []
              return (
                <div
                  key={p.id}
                  className={`bg-card rounded-2xl p-6 border flex flex-col justify-between transition-all ${
                    p.isActive ? 'border-border' : 'border-border/50 opacity-60'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="font-bold text-lg text-foreground">{p.name}</h3>
                      <span
                        className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                          p.isActive
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : 'bg-muted text-muted-foreground border border-border'
                        }`}
                      >
                        {p.isActive ? 'Ativo' : 'Inativo'}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 font-mono">slug: {p.slug}</p>
                    <p className="text-xs text-muted-foreground mt-2">{p.description || 'Sem descrição'}</p>

                    <div className="mt-4 pb-4 border-b border-border">
                      <span className="text-3xl font-extrabold text-foreground">{formatPrice(Number(p.price))}</span>
                      <span className="text-xs text-muted-foreground">
                        /{p.billingInterval === 'YEARLY' ? 'ano' : 'mês'}
                      </span>
                    </div>

                    <div className="mt-4 space-y-2 text-xs">
                      <div className="text-muted-foreground font-medium text-[11px] uppercase tracking-wider">
                        Recursos inclusos:
                      </div>
                      {features.map((feat: string, idx: number) => (
                        <div key={idx} className="flex items-center gap-2">
                          <Check className="w-3.5 h-3.5 text-primary shrink-0" />
                          <span className="text-foreground">{feat}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="mt-6 pt-4 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
                    <span>Trial: {p.trialDays || 30} dias</span>
                    <span>Moeda: {p.currency}</span>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Create Plan Modal */}
        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <div className="bg-card border border-border rounded-2xl p-6 md:p-8 max-w-lg w-full space-y-6 shadow-2xl">
              <div>
                <h3 className="text-lg font-bold text-foreground">Novo Plano SaaS</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Cadastre um novo pacote com precificação e limites.</p>
              </div>

              <form onSubmit={handleCreatePlan} className="space-y-4 text-xs md:text-sm">
                <div>
                  <label className="block text-foreground font-medium mb-1">Nome do Plano *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Ex: Profissional Pro"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-background border border-border text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-foreground font-medium mb-1">Preço (R$) *</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                      placeholder="97.00"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-background border border-border text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-foreground font-medium mb-1">Ciclo *</label>
                    <select
                      value={formData.billingInterval}
                      onChange={(e) => setFormData({ ...formData, billingInterval: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-background border border-border text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                      <option value="MONTHLY">Mensal</option>
                      <option value="YEARLY">Anual</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-foreground font-medium mb-1">Descrição</label>
                  <input
                    type="text"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Ideal para barbearias em crescimento"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-background border border-border text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div>
                  <label className="block text-foreground font-medium mb-1">Recursos (separados por vírgula)</label>
                  <textarea
                    rows={3}
                    value={formData.features}
                    onChange={(e) => setFormData({ ...formData, features: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-background border border-border text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="isActive"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="rounded border-border text-primary focus:ring-primary"
                  />
                  <label htmlFor="isActive" className="text-foreground text-xs font-medium cursor-pointer">
                    Plano ativo para novas contratações
                  </label>
                </div>

                <div className="flex items-center justify-end gap-3 pt-3">
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="px-4 py-2 text-xs md:text-sm rounded-xl border border-border hover:bg-muted text-muted-foreground font-medium"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-4 py-2 text-xs md:text-sm rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-all disabled:opacity-50 flex items-center gap-2"
                  >
                    {submitting ? 'Salvando...' : 'Salvar Plano'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
