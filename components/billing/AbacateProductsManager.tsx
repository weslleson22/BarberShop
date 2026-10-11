'use client'

import React, { useState, useEffect } from 'react'
import {
  Package,
  RefreshCw,
  Plus,
  CheckCircle2,
  Clock,
  ExternalLink,
  Copy,
  Check,
  AlertCircle,
  TrendingUp,
  DollarSign,
  Layers,
  ArrowRight,
  ShieldCheck,
  Loader2,
  X
} from 'lucide-react'
import { getAuthHeaders } from '@/lib/utils'

export interface AbacateProductItem {
  id: string
  externalId?: string
  name: string
  description?: string
  price: number // em centavos
  currency?: string
  createdAt?: string
}

export interface LocalPlanItem {
  id: string
  name: string
  slug: string
  description?: string
  price: number
  currency: string
  billingInterval: string
  cycleType: string
  durationDays: number
  isActive: boolean
  status: string
  providerProductId?: string
  isSyncedWithAbacate: boolean
  abacateProductId?: string | null
  _count?: {
    subscriptions: number
  }
}

export default function AbacateProductsManager() {
  const [abacateProducts, setAbacateProducts] = useState<AbacateProductItem[]>([])
  const [localPlans, setLocalPlans] = useState<LocalPlanItem[]>([])
  const [loading, setLoading] = useState(true)
  const [syncingPlanId, setSyncingPlanId] = useState<string | null>(null)
  const [syncingAll, setSyncingAll] = useState(false)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [activeSubTab, setActiveSubTab] = useState<'abacate' | 'local'>('abacate')

  // Modal para criar produto avulso direto na AbacatePay
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [createForm, setCreateForm] = useState({
    name: '',
    price: '',
    description: '',
  })
  const [creatingProduct, setCreatingProduct] = useState(false)

  useEffect(() => {
    fetchProductsAndPlans()
  }, [])

  const fetchProductsAndPlans = async () => {
    setLoading(true)
    setFeedback(null)
    try {
      const res = await fetch('/api/billing/products', {
        headers: getAuthHeaders(),
        credentials: 'include',
      })

      if (res.ok) {
        const data = await res.json()
        setAbacateProducts(data.abacateProducts || [])
        setLocalPlans(data.localPlans || [])
      } else {
        const err = await res.json()
        setFeedback({ type: 'error', message: err.error || 'Erro ao carregar produtos' })
      }
    } catch (err: any) {
      console.warn('Erro ao carregar produtos:', err)
      setFeedback({ type: 'error', message: 'Falha na conexão com a AbacatePay' })
    } finally {
      setLoading(false)
    }
  }

  // Sincroniza um plano individual com a AbacatePay
  const handleSyncPlan = async (planId: string) => {
    setSyncingPlanId(planId)
    setFeedback(null)
    try {
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
        setFeedback({ type: 'success', message: data.message || 'Plano sincronizado com sucesso na AbacatePay!' })
        await fetchProductsAndPlans()
      } else {
        setFeedback({ type: 'error', message: data.error || 'Erro ao sincronizar plano' })
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Falha ao sincronizar' })
    } finally {
      setSyncingPlanId(null)
    }
  }

  // Sincroniza todos os planos pendentes de uma vez
  const handleSyncAllPlans = async () => {
    setSyncingAll(true)
    setFeedback(null)
    try {
      const res = await fetch('/api/billing/products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        credentials: 'include',
        body: JSON.stringify({ syncAll: true, forceSync: true }),
      })

      const data = await res.json()
      if (res.ok) {
        setFeedback({ type: 'success', message: data.message || 'Todos os planos foram sincronizados!' })
        await fetchProductsAndPlans()
      } else {
        setFeedback({ type: 'error', message: data.error || 'Erro ao sincronizar planos' })
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Falha ao sincronizar todos' })
    } finally {
      setSyncingAll(false)
    }
  }

  // Cria produto avulso direto na AbacatePay
  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreatingProduct(true)
    setFeedback(null)
    try {
      const priceNum = parseFloat(createForm.price.replace(',', '.'))
      if (isNaN(priceNum) || priceNum <= 0) {
        throw new Error('Informe um preço válido em reais')
      }

      const res = await fetch('/api/billing/products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        credentials: 'include',
        body: JSON.stringify({
          name: createForm.name.trim(),
          price: priceNum,
          description: createForm.description.trim(),
        }),
      })

      const data = await res.json()
      if (res.ok) {
        setFeedback({ type: 'success', message: data.message || 'Produto cadastrado na AbacatePay com sucesso!' })
        setIsCreateModalOpen(false)
        setCreateForm({ name: '', price: '', description: '' })
        await fetchProductsAndPlans()
      } else {
        throw new Error(data.error || 'Erro ao criar produto')
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Erro ao cadastrar produto' })
    } finally {
      setCreatingProduct(false)
    }
  }

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopiedId(text)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const formatPriceBRL = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)
  }

  const unsyncedCount = localPlans.filter((p) => !p.isSyncedWithAbacate).length

  return (
    <div className="space-y-6">
      {/* Feedback Alert */}
      {feedback && (
        <div
          className={`p-4 rounded-xl flex items-center justify-between text-sm animate-in fade-in ${
            feedback.type === 'success'
              ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300'
              : 'bg-destructive/10 border border-destructive/30 text-destructive'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-destructive shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="opacity-70 hover:opacity-100 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Cards de Métricas e Ações Rápidas */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Métrica 1: Produtos AbacatePay */}
        <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Produtos Gateway</span>
            <Package className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-3xl font-extrabold text-foreground">{abacateProducts.length}</div>
          <span className="text-xs text-muted-foreground mt-1 block">
            Produtos ativos na sua conta AbacatePay
          </span>
        </div>

        {/* Métrica 2: Planos no BarberShop */}
        <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Planos no Sistema</span>
            <Layers className="w-4 h-4 text-primary" />
          </div>
          <div className="text-3xl font-extrabold text-foreground">{localPlans.length}</div>
          <span className="text-xs text-muted-foreground mt-1 block">
            Planos cadastrados pelo Developer
          </span>
        </div>

        {/* Métrica 3: Sincronização */}
        <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Status da Sincronia</span>
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-3xl font-extrabold text-emerald-400">
            {localPlans.filter((p) => p.isSyncedWithAbacate).length} / {localPlans.length}
          </div>
          <span className="text-xs text-emerald-300/80 mt-1 block">
            {unsyncedCount > 0 ? `${unsyncedCount} plano(s) pendente(s)` : 'Todos sincronizados'}
          </span>
        </div>
      </div>

      {/* Barra de Ações: Sincronizar Todos & Criar Produto & Atualizar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveSubTab('abacate')}
            className={`px-4 py-2 rounded-xl text-xs md:text-sm font-semibold transition-colors flex items-center gap-2 cursor-pointer ${
              activeSubTab === 'abacate'
                ? 'bg-emerald-600 text-white font-medium'
                : 'bg-muted/40 hover:bg-muted text-muted-foreground'
            }`}
          >
            <Package className="w-3.5 h-3.5" />
            <span>Produtos Gateway ({abacateProducts.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('local')}
            className={`px-4 py-2 rounded-xl text-xs md:text-sm font-semibold transition-all flex items-center gap-2 cursor-pointer ${
              activeSubTab === 'local'
                ? 'bg-primary text-primary-foreground shadow-sm font-bold'
                : 'bg-muted/40 hover:bg-muted text-muted-foreground'
            }`}
          >
            <span>📦 Planos Cadastrados pelo Developer ({localPlans.length})</span>
          </button>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {unsyncedCount > 0 && (
            <button
              type="button"
              onClick={handleSyncAllPlans}
              disabled={syncingAll}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs rounded-xl transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {syncingAll ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <RefreshCw className="w-3.5 h-3.5" />
              )}
              <span>Sincronizar Todos no AbacatePay ({unsyncedCount})</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsCreateModalOpen(true)}
            className="px-3.5 py-2 bg-card hover:bg-accent border border-border text-foreground font-semibold text-xs rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Novo Produto AbacatePay</span>
          </button>

          <button
            type="button"
            onClick={fetchProductsAndPlans}
            disabled={loading}
            className="p-2 rounded-xl border border-border bg-card hover:bg-accent text-muted-foreground hover:text-foreground transition cursor-pointer"
            title="Atualizar lista"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* ABA 1: PRODUTOS DIRETOS NA ABACATEPAY */}
      {activeSubTab === 'abacate' && (
        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-foreground">Produtos Registrados na AbacatePay</h3>
              <p className="text-xs text-muted-foreground">
                Estes são os produtos sincronizados com a chave de API da sua conta AbacatePay.
              </p>
            </div>
            <a
              href="https://app.abacatepay.com/products"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-emerald-400 hover:underline flex items-center gap-1 font-medium"
            >
              <span>Painel AbacatePay</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>

          {loading ? (
            <div className="space-y-3 py-6">
              {[1, 2, 3].map((n) => (
                <div key={n} className="h-14 bg-muted/30 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : abacateProducts.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-border rounded-xl">
              <Package className="w-8 h-8 text-muted-foreground mx-auto mb-2 opacity-50" />
              <p className="text-sm font-medium text-foreground">Nenhum produto encontrado na sua conta AbacatePay.</p>
              <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto">
                Você pode sincronizar os planos cadastrados pelo developer clicando no botão <strong>Sincronizar Todos</strong> ou cadastrar um novo produto acima.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-border text-xs text-muted-foreground">
                    <th className="pb-3 font-medium"># ID AbacatePay</th>
                    <th className="pb-3 font-medium">Nome do Produto</th>
                    <th className="pb-3 font-medium">Valor</th>
                    <th className="pb-3 font-medium">ID Externo (Plano)</th>
                    <th className="pb-3 font-medium">Descrição</th>
                    <th className="pb-3 font-medium text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {abacateProducts.map((prod, idx) => (
                    <tr key={prod.id || idx} className="hover:bg-muted/20 transition-colors">
                      <td className="py-3.5 font-mono text-xs text-foreground font-semibold">
                        <div className="flex items-center gap-1.5">
                          <span>{prod.id}</span>
                          <button
                            type="button"
                            onClick={() => handleCopy(prod.id)}
                            className="text-muted-foreground hover:text-foreground transition cursor-pointer"
                            title="Copiar ID"
                          >
                            {copiedId === prod.id ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                          </button>
                        </div>
                      </td>
                      <td className="py-3.5 font-bold text-foreground flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-400" />
                        <span>{prod.name}</span>
                      </td>
                      <td className="py-3.5 font-extrabold text-emerald-400 font-mono">
                        {formatPriceBRL((prod.price || 0) / 100)}
                      </td>
                      <td className="py-3.5 font-mono text-xs text-muted-foreground">
                        {prod.externalId || '-'}
                      </td>
                      <td className="py-3.5 text-xs text-muted-foreground max-w-xs truncate">
                        {prod.description || '-'}
                      </td>
                      <td className="py-3.5 text-right">
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                          Ativo na API
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ABA 2: PLANOS DO DEVELOPER NO SISTEMA */}
      {activeSubTab === 'local' && (
        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-foreground">Planos Cadastrados pelo Developer no Sistema</h3>
              <p className="text-xs text-muted-foreground">
                Planos comerciais configurados para contratação pelas barbearias.
              </p>
            </div>
            <span className="text-xs text-muted-foreground">
              Total: <strong>{localPlans.length}</strong> planos
            </span>
          </div>

          {loading ? (
            <div className="space-y-3 py-6">
              {[1, 2, 3].map((n) => (
                <div key={n} className="h-14 bg-muted/30 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : localPlans.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-border rounded-xl">
              <Layers className="w-8 h-8 text-muted-foreground mx-auto mb-2 opacity-50" />
              <p className="text-sm font-medium text-foreground">Nenhum plano cadastrado no banco de dados.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-border text-xs text-muted-foreground">
                    <th className="pb-3 font-medium">Plano</th>
                    <th className="pb-3 font-medium">Preço / Ciclo</th>
                    <th className="pb-3 font-medium">Status Sistema</th>
                    <th className="pb-3 font-medium">Sincronia AbacatePay</th>
                    <th className="pb-3 font-medium text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {localPlans.map((plan) => (
                    <tr key={plan.id} className="hover:bg-muted/20 transition-colors">
                      <td className="py-3.5">
                        <div className="font-bold text-foreground">{plan.name}</div>
                        <span className="text-xs text-muted-foreground font-mono">{plan.slug}</span>
                      </td>
                      <td className="py-3.5 font-semibold text-foreground font-mono">
                        {formatPriceBRL(Number(plan.price))}
                        <span className="text-xs text-muted-foreground font-normal ml-1">
                          /{plan.billingInterval === 'YEARLY' ? 'ano' : 'mês'}
                        </span>
                      </td>
                      <td className="py-3.5">
                        {plan.isActive ? (
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                            Ativo
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-muted text-muted-foreground border border-border">
                            Inativo
                          </span>
                        )}
                      </td>
                      <td className="py-3.5">
                        {plan.isSyncedWithAbacate ? (
                          <div className="flex items-center gap-1.5">
                            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Sincronizado</span>
                            </span>
                            {plan.abacateProductId && (
                              <span className="text-[11px] font-mono text-muted-foreground">
                                ({plan.abacateProductId})
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/30 flex items-center gap-1 w-fit">
                            <Clock className="w-3 h-3" />
                            <span>Pendente de Sincronia</span>
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 text-right">
                        {plan.isSyncedWithAbacate ? (
                          <button
                            type="button"
                            onClick={() => handleSyncPlan(plan.id)}
                            disabled={syncingPlanId === plan.id}
                            className="text-xs text-muted-foreground hover:text-foreground font-medium underline cursor-pointer disabled:opacity-50"
                          >
                            {syncingPlanId === plan.id ? 'Revalidando...' : 'Revalidar'}
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleSyncPlan(plan.id)}
                            disabled={syncingPlanId === plan.id}
                            className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs rounded-lg transition cursor-pointer disabled:opacity-50 flex items-center gap-1 ml-auto"
                          >
                            {syncingPlanId === plan.id ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <RefreshCw className="w-3 h-3" />
                            )}
                            <span>Sincronizar</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Modal de Criar Novo Produto na AbacatePay */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl relative text-foreground">
            <button
              onClick={() => setIsCreateModalOpen(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-white transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 mb-2">
              <Package className="w-5 h-5 text-emerald-400" />
              <h3 className="text-lg font-bold text-white">Novo Produto</h3>
            </div>
            <p className="text-xs text-slate-400 mb-6">
              Cadastre um novo item comercial diretamente no gateway de pagamentos.
            </p>

            <form onSubmit={handleCreateProduct} className="space-y-4">
              <div>
                <label className="text-xs text-slate-300 font-medium block mb-1">Nome do Produto *</label>
                <input
                  type="text"
                  required
                  value={createForm.name}
                  onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                  placeholder="Ex: Plano Trimestral BarberShop"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-3 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-xs text-slate-300 font-medium block mb-1">Preço em Reais (R$) *</label>
                <input
                  type="text"
                  required
                  value={createForm.price}
                  onChange={(e) => setCreateForm({ ...createForm, price: e.target.value })}
                  placeholder="Ex: 59.90"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-3 text-xs font-mono text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-xs text-slate-300 font-medium block mb-1">Descrição</label>
                <textarea
                  rows={3}
                  value={createForm.description}
                  onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                  placeholder="Descrição das funcionalidades e vigência do produto..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-3 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={creatingProduct}
                  className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                >
                  {creatingProduct ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                  <span>Criar na AbacatePay</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
