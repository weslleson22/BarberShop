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
  Layers,
  ShieldCheck,
  Loader2,
  Trash2,
  X,
} from 'lucide-react'
import { getAuthHeaders } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

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
    <div className="space-y-6">
      {/* Feedback Alert */}
      {feedback && (
        <div
          className={`p-4 rounded-xl flex items-center justify-between text-sm border font-medium animate-in fade-in ${
            feedback.type === 'success'
              ? 'bg-primary/10 border-primary/20 text-primary'
              : 'bg-destructive/15 border-destructive/30 text-destructive'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button
            onClick={() => setFeedback(null)}
            className="text-muted-foreground hover:text-foreground text-sm font-semibold px-2 py-1 cursor-pointer transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Cards de Métricas */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Métrica 1: Produtos AbacatePay */}
        <Card className="border-border shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center justify-between text-muted-foreground mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Produtos Gateway</span>
              <Package className="w-4 h-4 text-primary" />
            </div>
            <div className="text-3xl font-bold tracking-tight text-foreground">{abacateProducts.length}</div>
            <span className="text-xs text-muted-foreground mt-1 block">
              Produtos ativos na sua conta AbacatePay
            </span>
          </CardContent>
        </Card>

        {/* Métrica 2: Planos no BarberShop */}
        <Card className="border-border shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center justify-between text-muted-foreground mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Planos no Sistema</span>
              <Layers className="w-4 h-4 text-primary" />
            </div>
            <div className="text-3xl font-bold tracking-tight text-foreground">{localPlans.length}</div>
            <span className="text-xs text-muted-foreground mt-1 block">
              Planos cadastrados pelo Developer
            </span>
          </CardContent>
        </Card>

        {/* Métrica 3: Sincronização */}
        <Card className="border-border shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center justify-between text-muted-foreground mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Status da Sincronia</span>
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="text-3xl font-bold tracking-tight text-foreground">
              {localPlans.filter((p) => p.isSyncedWithAbacate).length} / {localPlans.length}
            </div>
            <span className="text-xs text-muted-foreground mt-1 block font-medium">
              {unsyncedCount > 0 ? (
                <span className="text-amber-600 dark:text-amber-400 font-semibold">{unsyncedCount} plano(s) pendente(s)</span>
              ) : (
                <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Todos sincronizados</span>
              )}
            </span>
          </CardContent>
        </Card>
      </div>

      {/* Barra de Ações: Sub-Tabs & Ações */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div className="flex items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant={activeSubTab === 'abacate' ? 'default' : 'outline'}
            onClick={() => setActiveSubTab('abacate')}
            className="gap-2 h-9"
          >
            <Package className="w-3.5 h-3.5" />
            <span>Produtos Gateway ({abacateProducts.length})</span>
          </Button>

          <Button
            type="button"
            size="sm"
            variant={activeSubTab === 'local' ? 'default' : 'outline'}
            onClick={() => setActiveSubTab('local')}
            className="gap-2 h-9"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Planos Cadastrados ({localPlans.length})</span>
          </Button>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={fetchProductsAndPlans}
            disabled={loading}
            title="Atualizar lista"
            className="h-9"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleSyncAllPlans}
            disabled={syncingAll || loading}
            className="gap-2 h-9"
            title="Sincroniza todos os planos pendentes com o gateway"
          >
            {syncingAll ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Sincronizando...</span>
              </>
            ) : (
              <>
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Sincronizar Todos</span>
              </>
            )}
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={() => setIsCreateModalOpen(true)}
            className="gap-2 h-9 shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Criar Produto na AbacatePay</span>
          </Button>
        </div>
      </div>

      {/* ABA 1: PRODUTOS DIRETOS NA ABACATEPAY */}
      {activeSubTab === 'abacate' && (
        <Card className="border-border shadow-sm overflow-hidden">
          <CardHeader className="pb-3 border-b border-border bg-muted/20">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">Produtos Registrados na AbacatePay</CardTitle>
                <CardDescription className="text-xs">
                  Estes são os produtos sincronizados com a chave de API da sua conta AbacatePay.
                </CardDescription>
              </div>
              <a
                href="https://app.abacatepay.com/products"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-primary hover:underline flex items-center gap-1 font-semibold"
              >
                <span>Painel AbacatePay</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="space-y-3 p-6">
                {[1, 2, 3].map((n) => (
                  <div key={n} className="h-12 bg-muted/50 rounded-lg animate-pulse border border-border" />
                ))}
              </div>
            ) : abacateProducts.length === 0 ? (
              <div className="text-center py-12 p-6">
                <Package className="w-8 h-8 text-muted-foreground/50 mx-auto mb-2" />
                <p className="text-sm font-semibold text-foreground">Nenhum produto encontrado na sua conta AbacatePay.</p>
                <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto">
                  Você pode sincronizar os planos cadastrados pelo developer clicando no botão <strong>Sincronizar Todos</strong> ou cadastrar um novo produto acima.
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead># ID AbacatePay</TableHead>
                    <TableHead>Nome do Produto</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>ID Externo (Plano)</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead className="text-right">Ação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {abacateProducts.map((prod, idx) => (
                    <TableRow key={prod.id || idx} className="hover:bg-muted/50 transition-colors">
                      <TableCell className="font-mono text-xs font-medium">
                        <div className="flex items-center gap-1.5">
                          <span className="text-foreground">{prod.id}</span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => handleCopy(prod.id)}
                            className="h-6 w-6 text-muted-foreground hover:text-foreground"
                            title="Copiar ID"
                          >
                            {copiedId === prod.id ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell className="font-semibold text-foreground">
                        {prod.name}
                      </TableCell>
                      <TableCell className="font-bold text-foreground font-mono">
                        {formatPriceBRL((prod.price || 0) / 100)}
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {prod.externalId || '-'}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-xs truncate">
                        {prod.description || '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Badge variant="outline" className="text-[11px] font-semibold border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10">
                            Ativo na API
                          </Badge>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeleteConfirmItem({ id: prod.id, name: prod.name, type: 'abacate' })}
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            title="Excluir produto da AbacatePay"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {/* ABA 2: PLANOS DO DEVELOPER NO SISTEMA */}
      {activeSubTab === 'local' && (
        <Card className="border-border shadow-sm overflow-hidden">
          <CardHeader className="pb-3 border-b border-border bg-muted/20">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">Planos Cadastrados pelo Developer no Sistema</CardTitle>
                <CardDescription className="text-xs">
                  Planos comerciais configurados para contratação pelas barbearias.
                </CardDescription>
              </div>
              <Badge variant="secondary" className="font-semibold text-xs">
                Total: {localPlans.length} planos
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="space-y-3 p-6">
                {[1, 2, 3].map((n) => (
                  <div key={n} className="h-12 bg-muted/50 rounded-lg animate-pulse border border-border" />
                ))}
              </div>
            ) : localPlans.length === 0 ? (
              <div className="text-center py-12 p-6">
                <Layers className="w-8 h-8 text-muted-foreground/50 mx-auto mb-2" />
                <p className="text-sm font-semibold text-foreground">Nenhum plano cadastrado no banco de dados.</p>
              </div>
            ) : (
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead>Plano</TableHead>
                    <TableHead>Preço / Ciclo</TableHead>
                    <TableHead>Status Sistema</TableHead>
                    <TableHead>Sincronia AbacatePay</TableHead>
                    <TableHead className="text-right">Ação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {localPlans.map((plan) => (
                    <TableRow key={plan.id} className="hover:bg-muted/50 transition-colors">
                      <TableCell>
                        <div className="font-semibold text-foreground text-sm">{plan.name}</div>
                        <span className="text-xs text-muted-foreground font-mono">{plan.slug}</span>
                      </TableCell>
                      <TableCell className="font-bold text-foreground font-mono">
                        {formatPriceBRL(Number(plan.price))}
                        <span className="text-xs text-muted-foreground font-normal ml-1">
                          /{plan.billingInterval === 'YEARLY' ? 'ano' : 'mês'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            plan.isActive
                              ? 'border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10'
                              : 'border-destructive/30 text-destructive bg-destructive/10'
                          }
                        >
                          {plan.isActive ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {plan.isSyncedWithAbacate ? (
                          <div className="flex items-center gap-1.5">
                            <Badge
                              variant="outline"
                              className="border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 gap-1 font-semibold"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Sincronizado</span>
                            </Badge>
                            {plan.abacateProductId && (
                              <span className="text-[11px] font-mono text-muted-foreground font-medium">
                                ({plan.abacateProductId})
                              </span>
                            )}
                          </div>
                        ) : (
                          <Badge
                            variant="outline"
                            className="border-amber-500/30 text-amber-600 dark:text-amber-400 bg-amber-500/10 gap-1 font-semibold"
                          >
                            <Clock className="w-3.5 h-3.5" />
                            <span>Pendente de Sincronia</span>
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            type="button"
                            variant={plan.isSyncedWithAbacate ? 'outline' : 'default'}
                            size="sm"
                            onClick={() => handleSyncPlan(plan.id)}
                            disabled={syncingPlanId === plan.id}
                            className="h-8 gap-1"
                          >
                            {syncingPlanId === plan.id ? (
                              <>
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                <span>{plan.isSyncedWithAbacate ? 'Revalidando...' : 'Sincronizando...'}</span>
                              </>
                            ) : (
                              <>
                                <RefreshCw className="w-3.5 h-3.5" />
                                <span>{plan.isSyncedWithAbacate ? 'Revalidar' : 'Sincronizar'}</span>
                              </>
                            )}
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeleteConfirmItem({ id: plan.id, name: plan.name, type: 'local' })}
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            title="Excluir plano do sistema"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {/* Modal de Criar Novo Produto na AbacatePay */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in">
          <Card className="border-border rounded-xl p-6 sm:p-8 max-w-md w-full shadow-2xl relative text-card-foreground bg-card space-y-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsCreateModalOpen(false)}
              className="absolute top-4 right-4 h-8 w-8 text-muted-foreground hover:text-foreground"
            >
              <X className="w-4 h-4" />
            </Button>

            <div className="flex items-center gap-2 mb-1">
              <Package className="w-5 h-5 text-primary" />
              <CardTitle className="text-lg">Novo Produto AbacatePay</CardTitle>
            </div>
            <CardDescription className="text-xs">
              Cadastre um novo item comercial diretamente no gateway de pagamentos.
            </CardDescription>

            <form onSubmit={handleCreateProduct} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-foreground block mb-1">Nome do Produto *</label>
                <Input
                  type="text"
                  required
                  value={createForm.name}
                  onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                  placeholder="Ex: Plano Trimestral BarberShop"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground block mb-1">Preço em Reais (R$) *</label>
                <Input
                  type="text"
                  required
                  value={createForm.price}
                  onChange={(e) => setCreateForm({ ...createForm, price: e.target.value })}
                  placeholder="Ex: 59.90"
                  className="font-mono"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground block mb-1">Descrição</label>
                <textarea
                  rows={3}
                  value={createForm.description}
                  onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                  placeholder="Descrição das funcionalidades e vigência do produto..."
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 resize-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsCreateModalOpen(false)}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={creatingProduct}
                  className="gap-2"
                >
                  {creatingProduct ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                  <span>Criar na AbacatePay</span>
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* Modal de Confirmação de Exclusão */}
      {deleteConfirmItem && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <Card className="border-border rounded-xl max-w-md w-full p-6 shadow-2xl space-y-4 bg-card text-card-foreground">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-destructive/10 border border-destructive/20 flex items-center justify-center text-destructive shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <CardTitle className="text-base">
                  {deleteConfirmItem.type === 'abacate' ? 'Excluir Produto da AbacatePay' : 'Excluir Plano do Sistema'}
                </CardTitle>
                <CardDescription className="text-xs">Esta ação é permanente e irreversível</CardDescription>
              </div>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">
              Você tem certeza que deseja excluir permanentemente o item{' '}
              <strong className="text-foreground font-semibold">&quot;{deleteConfirmItem.name}&quot;</strong>
              {deleteConfirmItem.type === 'abacate'
                ? ' da sua conta na AbacatePay? O produto deixará de existir no gateway de pagamento.'
                : ' do banco de dados do sistema?'}
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDeleteConfirmItem(null)}
                disabled={deletingProduct}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={handleConfirmDelete}
                disabled={deletingProduct}
                className="gap-1.5"
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
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
