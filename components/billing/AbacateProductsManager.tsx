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
  Trash2,
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

  // Estado para exclusão de produto ou plano
  const [deleteConfirmItem, setDeleteConfirmItem] = useState<{
    id: string
    name: string
    type: 'abacate' | 'local'
  } | null>(null)
  const [deletingProduct, setDeletingProduct] = useState(false)

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

  // Executa exclusão do produto na AbacatePay ou do plano no sistema
  const handleConfirmDelete = async () => {
    if (!deleteConfirmItem) return
    setDeletingProduct(true)
    setFeedback(null)
    try {
      const isAbacate = deleteConfirmItem.type === 'abacate'
      const query = isAbacate
        ? `productId=${encodeURIComponent(deleteConfirmItem.id)}`
        : `planId=${encodeURIComponent(deleteConfirmItem.id)}&deleteLocalPlan=true`

      const res = await fetch(`/api/billing/products?${query}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
        credentials: 'include',
      })

      const data = await res.json()
      if (res.ok) {
        setFeedback({
          type: 'success',
          message: data.message || `Item "${deleteConfirmItem.name}" excluído com sucesso!`,
        })
        setDeleteConfirmItem(null)
        await fetchProductsAndPlans()
      } else {
        throw new Error(data.error || 'Erro ao excluir item')
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Falha ao excluir item' })
    } finally {
      setDeletingProduct(false)
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
    <div className="space-y-6 text-white">
      {/* Feedback Alert */}
      {feedback && (
        <div
          className={`p-4 rounded-xl flex items-center justify-between text-sm border font-bold ${
            feedback.type === 'success'
              ? 'bg-[#059669] border-[#10b981] text-white'
              : 'bg-[#dc2626] border-[#ef4444] text-white'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-white shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-white shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="text-white hover:text-gray-200 text-sm font-bold px-2 py-1 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Cards de Métricas e Ações Rápidas */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Métrica 1: Produtos AbacatePay */}
        <div className="bg-[#111827] border border-[#374151] rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-gray-300 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Produtos Gateway</span>
            <Package className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-3xl font-black text-white">{abacateProducts.length}</div>
          <span className="text-xs text-gray-200 mt-1 block font-medium">
            Produtos ativos na sua conta AbacatePay
          </span>
        </div>

        {/* Métrica 2: Planos no BarberShop */}
        <div className="bg-[#111827] border border-[#374151] rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-gray-300 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Planos no Sistema</span>
            <Layers className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-3xl font-black text-white">{localPlans.length}</div>
          <span className="text-xs text-gray-200 mt-1 block font-medium">
            Planos cadastrados pelo Developer
          </span>
        </div>

        {/* Métrica 3: Sincronização */}
        <div className="bg-[#111827] border border-[#374151] rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-gray-300 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Status da Sincronia</span>
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-3xl font-black text-emerald-400">
            {localPlans.filter((p) => p.isSyncedWithAbacate).length} / {localPlans.length}
          </div>
          <span className="text-xs text-gray-200 mt-1 block font-bold">
            {unsyncedCount > 0 ? `${unsyncedCount} plano(s) pendente(s)` : 'Todos sincronizados'}
          </span>
        </div>
      </div>

      {/* Barra de Ações: Sincronizar Todos & Criar Produto & Atualizar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#374151] pb-4">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveSubTab('abacate')}
            className={`px-4 py-2 rounded-lg text-xs md:text-sm font-bold transition-colors flex items-center gap-2 cursor-pointer border ${
              activeSubTab === 'abacate'
                ? 'bg-[#059669] text-white border-[#10b981]'
                : 'bg-[#1f2937] hover:bg-[#374151] text-white border-[#4b5563]'
            }`}
          >
            <Package className="w-3.5 h-3.5" />
            <span>Produtos Gateway ({abacateProducts.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('local')}
            className={`px-4 py-2 rounded-lg text-xs md:text-sm font-bold transition-all flex items-center gap-2 cursor-pointer border ${
              activeSubTab === 'local'
                ? 'bg-[#2563eb] text-white border-[#3b82f6]'
                : 'bg-[#1f2937] hover:bg-[#374151] text-white border-[#4b5563]'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Planos Cadastrados ({localPlans.length})</span>
          </button>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {unsyncedCount > 0 && (
            <button
              type="button"
              onClick={handleSyncAllPlans}
              disabled={syncingAll}
              className="px-4 py-2 bg-[#059669] hover:bg-emerald-600 text-white font-bold text-xs rounded-lg transition-all flex items-center gap-1.5 cursor-pointer border border-[#10b981] disabled:opacity-50"
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
            className="px-4 py-2 bg-[#2563eb] hover:bg-blue-600 border border-[#3b82f6] text-white font-bold text-xs rounded-lg transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Novo Produto AbacatePay</span>
          </button>

          <button
            type="button"
            onClick={fetchProductsAndPlans}
            disabled={loading}
            className="p-2 rounded-lg border border-[#4b5563] bg-[#1f2937] hover:bg-[#374151] text-white transition cursor-pointer"
            title="Atualizar lista"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-blue-400' : 'text-white'}`} />
          </button>
        </div>
      </div>

      {/* ABA 1: PRODUTOS DIRETOS NA ABACATEPAY */}
      {activeSubTab === 'abacate' && (
        <div className="bg-[#111827] border border-[#374151] rounded-xl p-6 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-extrabold text-white">Produtos Registrados na AbacatePay</h3>
              <p className="text-xs text-gray-200 font-medium">
                Estes são os produtos sincronizados com a chave de API da sua conta AbacatePay.
              </p>
            </div>
            <a
              href="https://app.abacatepay.com/products"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-emerald-400 hover:underline flex items-center gap-1 font-bold"
            >
              <span>Painel AbacatePay</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>

          {loading ? (
            <div className="space-y-3 py-6">
              {[1, 2, 3].map((n) => (
                <div key={n} className="h-14 bg-[#030712] rounded-xl animate-pulse border border-[#374151]" />
              ))}
            </div>
          ) : abacateProducts.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-[#374151] rounded-xl bg-[#030712]">
              <Package className="w-8 h-8 text-gray-400 mx-auto mb-2 opacity-70" />
              <p className="text-sm font-bold text-white">Nenhum produto encontrado na sua conta AbacatePay.</p>
              <p className="text-xs text-gray-300 mt-1 max-w-md mx-auto">
                Você pode sincronizar os planos cadastrados pelo developer clicando no botão <strong>Sincronizar Todos</strong> ou cadastrar um novo produto acima.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-[#374151] bg-[#1f2937] text-xs font-bold uppercase tracking-wider text-white">
                    <th className="py-3.5 px-4 font-bold"># ID AbacatePay</th>
                    <th className="py-3.5 px-3 font-bold">Nome do Produto</th>
                    <th className="py-3.5 px-3 font-bold">Valor</th>
                    <th className="py-3.5 px-3 font-bold">ID Externo (Plano)</th>
                    <th className="py-3.5 px-3 font-bold">Descrição</th>
                    <th className="py-3.5 px-4 text-right font-bold">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#374151]">
                  {abacateProducts.map((prod, idx) => (
                    <tr key={prod.id || idx} className="hover:bg-[#1f2937]/50 transition-colors">
                      <td className="py-3.5 px-4 font-mono text-xs text-white font-bold">
                        <div className="flex items-center gap-1.5">
                          <span>{prod.id}</span>
                          <button
                            type="button"
                            onClick={() => handleCopy(prod.id)}
                            className="text-gray-300 hover:text-white transition cursor-pointer p-1 rounded hover:bg-[#1f2937]"
                            title="Copiar ID"
                          >
                            {copiedId === prod.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </td>
                      <td className="py-3.5 px-3 font-bold text-white flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-400" />
                        <span>{prod.name}</span>
                      </td>
                      <td className="py-3.5 px-3 font-black text-white font-mono">
                        {formatPriceBRL((prod.price || 0) / 100)}
                      </td>
                      <td className="py-3.5 px-3 font-mono text-xs text-gray-300 font-bold">
                        {prod.externalId || '-'}
                      </td>
                      <td className="py-3.5 px-3 text-xs text-gray-200 max-w-xs truncate font-medium">
                        {prod.description || '-'}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <span className="px-2.5 py-1 rounded text-[11px] font-bold bg-[#059669] text-white border border-[#10b981]">
                            Ativo na API
                          </span>
                          <button
                            type="button"
                            onClick={() => setDeleteConfirmItem({ id: prod.id, name: prod.name, type: 'abacate' })}
                            className="p-1.5 rounded-lg text-white bg-[#dc2626] hover:bg-red-600 border border-[#ef4444] transition cursor-pointer"
                            title="Excluir produto da AbacatePay"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
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
        <div className="bg-[#111827] border border-[#374151] rounded-xl p-6 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-extrabold text-white">Planos Cadastrados pelo Developer no Sistema</h3>
              <p className="text-xs text-gray-200 font-medium">
                Planos comerciais configurados para contratação pelas barbearias.
              </p>
            </div>
            <span className="text-xs text-white font-bold bg-[#1f2937] px-3 py-1 rounded-lg border border-[#4b5563]">
              Total: <strong>{localPlans.length}</strong> planos
            </span>
          </div>

          {loading ? (
            <div className="space-y-3 py-6">
              {[1, 2, 3].map((n) => (
                <div key={n} className="h-14 bg-[#030712] rounded-xl animate-pulse border border-[#374151]" />
              ))}
            </div>
          ) : localPlans.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-[#374151] rounded-xl bg-[#030712]">
              <Layers className="w-8 h-8 text-gray-400 mx-auto mb-2 opacity-70" />
              <p className="text-sm font-bold text-white">Nenhum plano cadastrado no banco de dados.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-[#374151] bg-[#1f2937] text-xs font-bold uppercase tracking-wider text-white">
                    <th className="py-3.5 px-4 font-bold">Plano</th>
                    <th className="py-3.5 px-3 font-bold">Preço / Ciclo</th>
                    <th className="py-3.5 px-3 font-bold">Status Sistema</th>
                    <th className="py-3.5 px-3 font-bold">Sincronia AbacatePay</th>
                    <th className="py-3.5 px-4 text-right font-bold">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#374151]">
                  {localPlans.map((plan) => (
                    <tr key={plan.id} className="hover:bg-[#1f2937]/50 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-white">{plan.name}</div>
                        <span className="text-xs text-gray-300 font-mono">{plan.slug}</span>
                      </td>
                      <td className="py-3.5 px-3 font-black text-white font-mono">
                        {formatPriceBRL(Number(plan.price))}
                        <span className="text-xs text-gray-200 font-bold ml-1">
                          /{plan.billingInterval === 'YEARLY' ? 'ano' : 'mês'}
                        </span>
                      </td>
                      <td className="py-3.5 px-3">
                        {plan.isActive ? (
                          <span className="px-2.5 py-1 rounded text-xs font-bold bg-[#059669] text-white border border-[#10b981]">
                            Ativo
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded text-xs font-bold bg-[#dc2626] text-white border border-[#ef4444]">
                            Inativo
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-3">
                        {plan.isSyncedWithAbacate ? (
                          <div className="flex items-center gap-1.5">
                            <span className="px-2.5 py-1 rounded text-xs font-bold bg-[#059669] text-white border border-[#10b981] flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Sincronizado</span>
                            </span>
                            {plan.abacateProductId && (
                              <span className="text-[11px] font-mono text-gray-300 font-bold">
                                ({plan.abacateProductId})
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="px-2.5 py-1 rounded text-xs font-bold bg-[#d97706] text-white border border-[#f59e0b] flex items-center gap-1 w-fit">
                            <Clock className="w-3.5 h-3.5" />
                            <span>Pendente de Sincronia</span>
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {plan.isSyncedWithAbacate ? (
                            <button
                              type="button"
                              onClick={() => handleSyncPlan(plan.id)}
                              disabled={syncingPlanId === plan.id}
                              className="px-3 py-1 bg-[#1f2937] hover:bg-[#374151] text-white border border-[#4b5563] font-bold text-xs rounded-lg transition cursor-pointer disabled:opacity-50"
                            >
                              {syncingPlanId === plan.id ? 'Revalidando...' : 'Revalidar'}
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleSyncPlan(plan.id)}
                              disabled={syncingPlanId === plan.id}
                              className="px-3 py-1 bg-[#059669] hover:bg-emerald-600 text-white font-bold text-xs rounded-lg transition cursor-pointer disabled:opacity-50 flex items-center gap-1 border border-[#10b981]"
                            >
                              {syncingPlanId === plan.id ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <RefreshCw className="w-3.5 h-3.5" />
                              )}
                              <span>Sincronizar</span>
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => setDeleteConfirmItem({ id: plan.id, name: plan.name, type: 'local' })}
                            className="p-1.5 rounded-lg text-white bg-[#dc2626] hover:bg-red-600 border border-[#ef4444] transition cursor-pointer"
                            title="Excluir plano do sistema"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85">
          <div className="bg-[#111827] border border-[#374151] rounded-2xl p-6 sm:p-8 max-w-md w-full shadow-2xl relative text-white space-y-4">
            <button
              onClick={() => setIsCreateModalOpen(false)}
              className="absolute top-5 right-5 text-gray-300 hover:text-white transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 mb-1">
              <Package className="w-5 h-5 text-emerald-400" />
              <h3 className="text-lg font-bold text-white">Novo Produto AbacatePay</h3>
            </div>
            <p className="text-xs text-gray-200 font-medium mb-4">
              Cadastre um novo item comercial diretamente no gateway de pagamentos.
            </p>

            <form onSubmit={handleCreateProduct} className="space-y-4">
              <div>
                <label className="text-xs text-white font-bold block mb-1">Nome do Produto *</label>
                <input
                  type="text"
                  required
                  value={createForm.name}
                  onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                  placeholder="Ex: Plano Trimestral BarberShop"
                  className="w-full bg-[#030712] border border-[#374151] rounded-xl py-2.5 px-3 text-xs text-white font-medium focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="text-xs text-white font-bold block mb-1">Preço em Reais (R$) *</label>
                <input
                  type="text"
                  required
                  value={createForm.price}
                  onChange={(e) => setCreateForm({ ...createForm, price: e.target.value })}
                  placeholder="Ex: 59.90"
                  className="w-full bg-[#030712] border border-[#374151] rounded-xl py-2.5 px-3 text-xs font-mono text-white font-medium focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="text-xs text-white font-bold block mb-1">Descrição</label>
                <textarea
                  rows={3}
                  value={createForm.description}
                  onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                  placeholder="Descrição das funcionalidades e vigência do produto..."
                  className="w-full bg-[#030712] border border-[#374151] rounded-xl py-2.5 px-3 text-xs text-white font-medium focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-[#1f2937] hover:bg-[#374151] border border-[#4b5563] transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={creatingProduct}
                  className="px-5 py-2.5 rounded-xl bg-[#059669] hover:bg-emerald-600 text-white font-bold text-xs transition cursor-pointer disabled:opacity-50 flex items-center gap-1.5 border border-[#10b981]"
                >
                  {creatingProduct ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                  <span>Criar na AbacatePay</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Confirmação de Exclusão */}
      {deleteConfirmItem && (
        <div className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4">
          <div className="bg-[#111827] border border-[#ef4444] rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 text-white">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#dc2626] border border-[#ef4444] flex items-center justify-center text-white shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-white text-base">
                  {deleteConfirmItem.type === 'abacate' ? 'Excluir Produto da AbacatePay' : 'Excluir Plano do Sistema'}
                </h3>
                <span className="text-xs text-gray-300 font-medium">Esta ação é permanente e irreversível</span>
              </div>
            </div>

            <p className="text-xs text-gray-200 leading-relaxed font-medium">
              Você tem certeza que deseja excluir permanentemente o item{' '}
              <strong className="text-white font-bold">&quot;{deleteConfirmItem.name}&quot;</strong>
              {deleteConfirmItem.type === 'abacate'
                ? ' da sua conta na AbacatePay? O produto deixará de existir no gateway de pagamento.'
                : ' do banco de dados do sistema?'}
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmItem(null)}
                disabled={deletingProduct}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-[#1f2937] hover:bg-[#374151] border border-[#4b5563] transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={deletingProduct}
                className="px-5 py-2 rounded-xl bg-[#dc2626] hover:bg-red-600 text-white font-bold text-xs transition cursor-pointer disabled:opacity-50 flex items-center gap-1.5 border border-[#ef4444] shadow-sm"
              >
                {deletingProduct ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Excluindo...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Confirmar Exclusão</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
