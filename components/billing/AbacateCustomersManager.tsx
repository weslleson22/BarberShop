'use client'

import React, { useState, useEffect } from 'react'
import {
  Users,
  RefreshCw,
  Plus,
  CheckCircle2,
  Clock,
  ExternalLink,
  Copy,
  Check,
  AlertCircle,
  ShieldCheck,
  Loader2,
  X,
  Search,
  Building2,
  Mail,
  UserCheck,
  Zap,
  Receipt
} from 'lucide-react'
import { getAuthHeaders } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'

export interface AbacateCustomerItem {
  id: string
  name?: string
  email: string
  cellphone?: string
  taxId?: string
  zipCode?: string
  metadata?: Record<string, any>
  createdAt?: string
}

export interface LocalAdminItem {
  id: string
  name: string
  email: string
  phone?: string | null
  address?: string | null
  role: string
  isActive: boolean
  createdAt: string
  barbershop?: {
    id: string
    name: string
    slug: string
    email: string
    phone?: string | null
    address?: string | null
    isActive: boolean
    status: string
    createdAt: string
  } | null
  subscription?: {
    id: string
    planName: string
    price: number
    status: string
    billingInterval: string
    provider?: string
    providerSubscriptionId?: string | null
    trialEnd?: string | null
  } | null
  invoice?: {
    id: string
    amount: number
    status: string
    dueDate: string
    provider?: string
    providerInvoiceId?: string | null
    hostedInvoiceUrl?: string | null
  } | null
  isSynced: boolean
  abacateCustomerId?: string | null
  abacateCustomer?: AbacateCustomerItem | null
  hasAbacateBilling: boolean
}

interface SummaryData {
  totalAdmins: number
  syncedCount: number
  pendingCount: number
  withBillingCount: number
  abacateCustomersCount: number
}

export default function AbacateCustomersManager() {
  const [abacateCustomers, setAbacateCustomers] = useState<AbacateCustomerItem[]>([])
  const [admins, setAdmins] = useState<LocalAdminItem[]>([])
  const [summary, setSummary] = useState<SummaryData>({
    totalAdmins: 0,
    syncedCount: 0,
    pendingCount: 0,
    withBillingCount: 0,
    abacateCustomersCount: 0,
  })
  const [loading, setLoading] = useState(true)
  const [syncingAll, setSyncingAll] = useState(false)
  const [syncingAllSubs, setSyncingAllSubs] = useState(false)
  const [syncingAdminId, setSyncingAdminId] = useState<string | null>(null)
  const [syncingSubId, setSyncingSubId] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeSubTab, setActiveSubTab] = useState<'admins' | 'abacate'>('admins')

  // Modal para cadastro manual
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [creatingCustomer, setCreatingCustomer] = useState(false)
  const [createForm, setCreateForm] = useState({
    name: '',
    email: '',
    cellphone: '',
    taxId: '',
    zipCode: '',
  })

  useEffect(() => {
    fetchCustomersData()
  }, [])

  const fetchCustomersData = async () => {
    setLoading(true)
    setFeedback(null)
    try {
      const headers = getAuthHeaders()
      const res = await fetch('/api/billing/customers', {
        headers,
        credentials: 'include',
      })

      if (res.ok) {
        const data = await res.json()
        setAbacateCustomers(data.abacateCustomers || [])
        setAdmins(data.admins || [])
        if (data.summary) {
          setSummary(data.summary)
        }
      } else {
        const err = await res.json()
        setFeedback({ type: 'error', message: err.error || 'Erro ao carregar dados de clientes' })
      }
    } catch (err: any) {
      console.warn('Erro ao consultar clientes da AbacatePay:', err)
      setFeedback({ type: 'error', message: 'Falha na conexão com o serviço de faturamento' })
    } finally {
      setLoading(false)
    }
  }

  const handleSyncOne = async (adminId: string) => {
    setSyncingAdminId(adminId)
    setFeedback(null)
    try {
      const headers = getAuthHeaders()
      const res = await fetch('/api/billing/customers', {
        method: 'POST',
        headers: {
          ...headers,
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          action: 'sync-one',
          userId: adminId,
        }),
      })

      const json = await res.json()
      if (res.ok && json.success) {
        setFeedback({
          type: 'success',
          message: `Cliente ${json.customer?.name || ''} sincronizado com sucesso no AbacatePay!`,
        })
        await fetchCustomersData()
      } else {
        setFeedback({ type: 'error', message: json.error || 'Falha ao sincronizar cliente' })
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err?.message || 'Erro inesperado na sincronização' })
    } finally {
      setSyncingAdminId(null)
    }
  }

  const handleSyncSubscriptionOne = async (adminId: string) => {
    setSyncingSubId(adminId)
    setFeedback(null)
    try {
      const headers = getAuthHeaders()
      const res = await fetch('/api/billing/customers', {
        method: 'POST',
        headers: {
          ...headers,
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          action: 'sync-subscription-one',
          userId: adminId,
        }),
      })

      const json = await res.json()
      if (res.ok && json.success) {
        setFeedback({
          type: 'success',
          message: json.message || 'Cobrança e assinatura vinculadas com sucesso no AbacatePay!',
        })
        await fetchCustomersData()
      } else {
        setFeedback({ type: 'error', message: json.error || 'Falha ao vincular assinatura' })
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err?.message || 'Erro inesperado ao gerar assinatura' })
    } finally {
      setSyncingSubId(null)
    }
  }

  const handleSyncAll = async () => {
    setSyncingAll(true)
    setFeedback(null)
    try {
      const headers = getAuthHeaders()
      const res = await fetch('/api/billing/customers', {
        method: 'POST',
        headers: {
          ...headers,
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          action: 'sync-all',
        }),
      })

      const json = await res.json()
      if (res.ok && json.success) {
        setFeedback({
          type: 'success',
          message: `Sincronização em lote concluída! ${json.synced} de ${json.total} clientes sincronizados na AbacatePay.`,
        })
        await fetchCustomersData()
      } else {
        setFeedback({ type: 'error', message: json.error || 'Falha ao sincronizar todos os clientes' })
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err?.message || 'Erro inesperado ao sincronizar em lote' })
    } finally {
      setSyncingAll(false)
    }
  }

  const handleSyncAllSubscriptions = async () => {
    setSyncingAllSubs(true)
    setFeedback(null)
    try {
      const headers = getAuthHeaders()
      const res = await fetch('/api/billing/customers', {
        method: 'POST',
        headers: {
          ...headers,
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          action: 'sync-subscriptions',
        }),
      })

      const json = await res.json()
      if (res.ok && json.success) {
        setFeedback({
          type: 'success',
          message:
            json.message ||
            `Sincronização concluída! ${json.synced} de ${json.total} cobranças e assinaturas vinculadas na AbacatePay.`,
        })
        await fetchCustomersData()
      } else {
        setFeedback({
          type: 'error',
          message: json.error || 'Falha ao sincronizar cobranças e assinaturas em lote',
        })
      }
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err?.message || 'Erro inesperado ao sincronizar cobranças em lote',
      })
    } finally {
      setSyncingAllSubs(false)
    }
  }

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!createForm.email.trim()) {
      setFeedback({ type: 'error', message: 'O e-mail é obrigatório para cadastrar o cliente.' })
      return
    }

    setCreatingCustomer(true)
    setFeedback(null)
    try {
      const headers = getAuthHeaders()
      const res = await fetch('/api/billing/customers', {
        method: 'POST',
        headers: {
          ...headers,
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          action: 'create-manual',
          name: createForm.name.trim() || undefined,
          email: createForm.email.trim(),
          cellphone: createForm.cellphone.trim() || undefined,
          taxId: createForm.taxId.trim() || undefined,
          zipCode: createForm.zipCode.trim() || undefined,
        }),
      })

      const json = await res.json()
      if (res.ok && json.success) {
        setFeedback({
          type: 'success',
          message: 'Cliente cadastrado com sucesso na AbacatePay!',
        })
        setIsCreateModalOpen(false)
        setCreateForm({ name: '', email: '', cellphone: '', taxId: '', zipCode: '' })
        await fetchCustomersData()
      } else {
        setFeedback({
          type: 'error',
          message: json.error || 'Erro ao criar cliente na AbacatePay',
        })
      }
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err?.message || 'Erro inesperado ao criar cliente',
      })
    } finally {
      setCreatingCustomer(false)
    }
  }

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const formatPrice = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)
  }

  const filteredAdmins = admins.filter((a) => {
    const q = searchQuery.toLowerCase().trim()
    if (!q) return true
    return (
      a.name.toLowerCase().includes(q) ||
      a.email.toLowerCase().includes(q) ||
      (a.barbershop?.name && a.barbershop.name.toLowerCase().includes(q)) ||
      (a.phone && a.phone.includes(q)) ||
      (a.subscription?.planName && a.subscription.planName.toLowerCase().includes(q))
    )
  })

  const filteredAbacateCustomers = abacateCustomers.filter((c) => {
    const q = searchQuery.toLowerCase().trim()
    if (!q) return true
    return (
      (c.name && c.name.toLowerCase().includes(q)) ||
      (c.email && c.email.toLowerCase().includes(q)) ||
      (c.cellphone && c.cellphone.includes(q)) ||
      (c.taxId && c.taxId.includes(q)) ||
      (c.id && c.id.toLowerCase().includes(q))
    )
  })

  return (
    <div className="space-y-6">
      {/* Feedback Alert */}
      {feedback && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between font-medium text-sm ${
            feedback.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
              : 'bg-destructive/10 border-destructive/20 text-destructive'
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
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setFeedback(null)}
            className="h-7 w-7 p-0"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Admins do Sistema
            </CardTitle>
            <Users className="w-4 h-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{summary.totalAdmins}</div>
            <p className="text-xs text-muted-foreground mt-1">Donos/Gestores de Barbearias</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Clientes Sincronizados
            </CardTitle>
            <UserCheck className="w-4 h-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{summary.syncedCount}</div>
            <p className="text-xs text-muted-foreground mt-1">Cadastrados na AbacatePay</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Cobranças & Assinaturas
            </CardTitle>
            <Receipt className="w-4 h-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{summary.withBillingCount}</div>
            <p className="text-xs text-muted-foreground mt-1">Vinculadas na AbacatePay</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Total no Gateway
            </CardTitle>
            <ShieldCheck className="w-4 h-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{summary.abacateCustomersCount}</div>
            <p className="text-xs text-muted-foreground mt-1">Base na AbacatePay API v2</p>
          </CardContent>
        </Card>
      </div>

      {/* Header Actions & Sub-Tabs */}
      <Card className="p-4 shadow-sm">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          {/* SubTabs */}
          <div className="flex items-center gap-2 w-full md:w-auto">
            <Button
              variant={activeSubTab === 'admins' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveSubTab('admins')}
              className="flex-1 md:flex-none gap-2 h-9"
            >
              <Building2 className="w-4 h-4" />
              <span>Admins de Barbearias ({admins.length})</span>
            </Button>
            <Button
              variant={activeSubTab === 'abacate' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveSubTab('abacate')}
              className="flex-1 md:flex-none gap-2 h-9"
            >
              <Users className="w-4 h-4" />
              <span>Clientes Gateway ({abacateCustomers.length})</span>
            </Button>
          </div>

          {/* Global Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap w-full md:w-auto justify-end">
            <Button
              variant="outline"
              size="icon"
              onClick={fetchCustomersData}
              disabled={loading}
              title="Atualizar dados"
              className="h-9 w-9"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-primary' : ''}`} />
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleSyncAll}
              disabled={syncingAll || loading}
              title="Sincroniza os perfis de clientes na AbacatePay"
              className="gap-2 h-9"
            >
              {syncingAll ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Sincronizando...</span>
                </>
              ) : (
                <>
                  <UserCheck className="w-4 h-4 text-emerald-500" />
                  <span>Sincronizar Clientes</span>
                </>
              )}
            </Button>

            <Button
              size="sm"
              onClick={handleSyncAllSubscriptions}
              disabled={syncingAllSubs || loading}
              title="Gera cobranças e checkouts de assinaturas vinculados a cada cliente na AbacatePay"
              className="gap-2 h-9 bg-emerald-600 hover:bg-emerald-700 text-white dark:bg-emerald-600 dark:hover:bg-emerald-700"
            >
              {syncingAllSubs ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Vinculando Cobranças...</span>
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4" />
                  <span>Sincronizar Cobranças & Assinaturas</span>
                </>
              )}
            </Button>

            <Button
              size="sm"
              onClick={() => setIsCreateModalOpen(true)}
              className="gap-2 h-9"
            >
              <Plus className="w-4 h-4" />
              <span>Cadastrar Manual</span>
            </Button>
          </div>
        </div>
      </Card>

      {/* Search Input */}
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="text"
          placeholder={
            activeSubTab === 'admins'
              ? 'Buscar por nome, e-mail, barbearia, plano ou telefone...'
              : 'Buscar clientes na AbacatePay por nome, e-mail, telefone, CPF...'
          }
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 h-10 bg-background"
        />
      </div>

      {/* SUBTAB 1: Admins de Barbearias do Sistema */}
      {activeSubTab === 'admins' && (
        <Card className="shadow-sm overflow-hidden">
          <CardHeader className="border-b border-border bg-muted/40 p-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <CardTitle className="text-base font-semibold">Administradores e Donos de Barbearias</CardTitle>
                <CardDescription className="text-xs mt-0.5">
                  Os clientes pagantes do seu SaaS. Suas cobranças e assinaturas aparecem diretamente em /customers/ na AbacatePay.
                </CardDescription>
              </div>
              <Badge variant="secondary">
                {filteredAdmins.length} registros
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            {loading ? (
              <div className="p-12 text-center text-muted-foreground">
                <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary mb-3" />
                <p className="text-sm font-medium">Carregando lista de administradores e faturamento...</p>
              </div>
            ) : filteredAdmins.length === 0 ? (
              <div className="p-12 text-center text-muted-foreground">
                <Users className="w-8 h-8 mx-auto mb-3 opacity-50" />
                <p className="text-sm font-medium">Nenhum administrador encontrado com o filtro atual.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30">
                      <TableHead className="font-semibold text-xs uppercase">Administrador / Barbearia</TableHead>
                      <TableHead className="font-semibold text-xs uppercase">Plano Contratado</TableHead>
                      <TableHead className="font-semibold text-xs uppercase text-center">Status Cliente</TableHead>
                      <TableHead className="font-semibold text-xs uppercase">Cobrança & Assinatura AbacatePay</TableHead>
                      <TableHead className="font-semibold text-xs uppercase text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAdmins.map((admin) => (
                      <TableRow key={admin.id}>
                        <TableCell>
                          <div className="font-semibold text-foreground text-sm">{admin.name}</div>
                          <div className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
                            <Mail className="w-3.5 h-3.5" />
                            <span>{admin.email}</span>
                          </div>
                          {admin.barbershop && (
                            <div className="text-xs text-amber-600 dark:text-amber-400 font-semibold flex items-center gap-1 mt-1">
                              <Building2 className="w-3.5 h-3.5" />
                              <span>{admin.barbershop.name}</span>
                              <span className="text-muted-foreground font-mono text-[10px]">
                                (/{admin.barbershop.slug})
                              </span>
                            </div>
                          )}
                        </TableCell>

                        <TableCell>
                          {admin.subscription ? (
                            <div>
                              <span className="font-semibold text-foreground block text-sm">
                                {admin.subscription.planName}
                              </span>
                              <div className="text-xs text-muted-foreground">
                                {formatPrice(admin.subscription.price)} / {admin.subscription.billingInterval === 'YEARLY' ? 'ano' : 'mês'}
                              </div>
                              <div className="mt-1">
                                {admin.subscription.status === 'ACTIVE' ? (
                                  <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-[10px]">
                                    Ativo
                                  </Badge>
                                ) : admin.subscription.status === 'TRIALING' ? (
                                  <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 text-[10px]">
                                    Trial
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="text-[10px]">
                                    {admin.subscription.status}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground italic">Sem plano ativo</span>
                          )}
                        </TableCell>

                        <TableCell className="text-center">
                          {admin.isSynced ? (
                            <div className="inline-flex flex-col items-center gap-1">
                              <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 gap-1 text-xs">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                Sincronizado
                              </Badge>
                              {admin.abacateCustomerId && (
                                <button
                                  onClick={() => copyToClipboard(admin.abacateCustomerId!, admin.id)}
                                  className="text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-1 font-mono cursor-pointer transition"
                                  title="Copiar ID na AbacatePay"
                                >
                                  <code>{admin.abacateCustomerId.substring(0, 14)}...</code>
                                  {copiedId === admin.id ? (
                                    <Check className="w-2.5 h-2.5 text-emerald-500" />
                                  ) : (
                                    <Copy className="w-2.5 h-2.5" />
                                  )}
                                </button>
                              )}
                            </div>
                          ) : (
                            <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 gap-1 text-xs">
                              <Clock className="w-3.5 h-3.5" />
                              Pendente
                            </Badge>
                          )}
                        </TableCell>

                        <TableCell>
                          {admin.hasAbacateBilling ? (
                            <div className="space-y-1">
                              <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 gap-1 text-[11px]">
                                <Receipt className="w-3 h-3" />
                                Cobrança Vinculada
                              </Badge>
                              {admin.subscription?.providerSubscriptionId && (
                                <div className="text-[10px] font-mono text-muted-foreground">
                                  ID: {admin.subscription.providerSubscriptionId}
                                </div>
                              )}
                              {admin.invoice?.hostedInvoiceUrl && (
                                <a
                                  href={admin.invoice.hostedInvoiceUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-[11px] text-primary font-medium hover:underline flex items-center gap-1"
                                >
                                  <span>Ver Checkout AbacatePay</span>
                                  <ExternalLink className="w-3 h-3" />
                                </a>
                              )}
                            </div>
                          ) : (
                            <div className="space-y-1">
                              <Badge variant="outline" className="text-destructive border-destructive/20 bg-destructive/10 text-[11px]">
                                Sem cobrança no Gateway
                              </Badge>
                              <p className="text-[10px] text-muted-foreground">
                                Gere uma assinatura para vincular
                              </p>
                            </div>
                          )}
                        </TableCell>

                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1.5 flex-wrap">
                            <Button
                              size="sm"
                              onClick={() => handleSyncSubscriptionOne(admin.id)}
                              disabled={syncingSubId === admin.id}
                              className="h-8 gap-1 text-xs bg-emerald-600 hover:bg-emerald-700 text-white dark:bg-emerald-600 dark:hover:bg-emerald-700"
                              title="Gera o checkout de assinatura na AbacatePay para este cliente"
                            >
                              {syncingSubId === admin.id ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <Zap className="w-3 h-3" />
                              )}
                              <span>{admin.hasAbacateBilling ? 'Atualizar Assinatura' : 'Gerar Cobrança'}</span>
                            </Button>

                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleSyncOne(admin.id)}
                              disabled={syncingAdminId === admin.id}
                              className="h-8 text-xs"
                              title="Atualizar dados cadastrais do cliente"
                            >
                              {syncingAdminId === admin.id ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                'Perfil'
                              )}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* SUBTAB 2: Clientes na AbacatePay */}
      {activeSubTab === 'abacate' && (
        <Card className="shadow-sm overflow-hidden">
          <CardHeader className="border-b border-border bg-muted/40 p-4 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base font-semibold">Base de Clientes na AbacatePay</CardTitle>
              <CardDescription className="text-xs mt-0.5">
                Clientes cadastrados diretamente no gateway de pagamentos via API v2.
              </CardDescription>
            </div>
            <a
              href="https://app.abacatepay.com/customers"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
            >
              <span>Painel AbacatePay</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </CardHeader>

          <CardContent className="p-0">
            {loading ? (
              <div className="p-12 text-center text-muted-foreground">
                <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary mb-3" />
                <p className="text-sm font-medium">Consultando clientes na AbacatePay...</p>
              </div>
            ) : filteredAbacateCustomers.length === 0 ? (
              <div className="p-12 text-center text-muted-foreground">
                <ShieldCheck className="w-8 h-8 mx-auto mb-3 opacity-50" />
                <p className="text-sm font-semibold text-foreground">Nenhum cliente cadastrado na AbacatePay ainda.</p>
                <p className="text-xs mt-1 text-muted-foreground">
                  Clique em &quot;Sincronizar Clientes&quot; acima para exportar todos os admins de barbearias existentes.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30">
                      <TableHead className="font-semibold text-xs uppercase">ID Cliente</TableHead>
                      <TableHead className="font-semibold text-xs uppercase">Nome / Razão</TableHead>
                      <TableHead className="font-semibold text-xs uppercase">E-mail</TableHead>
                      <TableHead className="font-semibold text-xs uppercase">Telefone</TableHead>
                      <TableHead className="font-semibold text-xs uppercase">CPF / CNPJ</TableHead>
                      <TableHead className="font-semibold text-xs uppercase">Metadata Vinculada</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAbacateCustomers.map((customer) => (
                      <TableRow key={customer.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <code className="text-xs font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
                              {customer.id}
                            </code>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => copyToClipboard(customer.id, customer.id)}
                              className="h-6 w-6 p-0"
                              title="Copiar ID"
                            >
                              {copiedId === customer.id ? (
                                <Check className="w-3.5 h-3.5 text-emerald-500" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </Button>
                          </div>
                        </TableCell>

                        <TableCell className="font-semibold text-foreground">
                          {customer.name || 'Sem nome'}
                        </TableCell>

                        <TableCell className="text-foreground">
                          {customer.email}
                        </TableCell>

                        <TableCell className="text-muted-foreground">
                          {customer.cellphone || '—'}
                        </TableCell>

                        <TableCell className="text-muted-foreground font-mono text-xs">
                          {customer.taxId || '—'}
                        </TableCell>

                        <TableCell>
                          {customer.metadata ? (
                            <div className="text-xs text-muted-foreground">
                              {customer.metadata.barbershopName && (
                                <span className="font-semibold text-foreground block">
                                  {customer.metadata.barbershopName}
                                </span>
                              )}
                              {customer.metadata.role && (
                                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                                  {customer.metadata.role}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground italic">—</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* MODAL: Cadastrar Cliente Manual */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <Card className="w-full max-w-lg shadow-2xl p-6 relative">
            <div className="flex items-center justify-between pb-4 border-b border-border mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <Users className="w-4 h-4" />
                </div>
                <h3 className="text-base font-semibold text-foreground">Cadastrar Cliente no Gateway</h3>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsCreateModalOpen(false)}
                className="h-8 w-8 p-0"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            <form onSubmit={handleCreateCustomer} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-foreground mb-1.5 block">
                  E-mail do Cliente *
                </label>
                <Input
                  type="email"
                  required
                  placeholder="admin@barbearia.com"
                  value={createForm.email}
                  onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground mb-1.5 block">
                  Nome Completo / Razão Social
                </label>
                <Input
                  type="text"
                  placeholder="Nome do Dono ou Barbearia"
                  value={createForm.name}
                  onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-foreground mb-1.5 block">
                    WhatsApp / Telefone
                  </label>
                  <Input
                    type="text"
                    placeholder="(11) 99999-9999"
                    value={createForm.cellphone}
                    onChange={(e) => setCreateForm({ ...createForm, cellphone: e.target.value })}
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-foreground mb-1.5 block">
                    CPF / CNPJ
                  </label>
                  <Input
                    type="text"
                    placeholder="000.000.000-00"
                    value={createForm.taxId}
                    onChange={(e) => setCreateForm({ ...createForm, taxId: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground mb-1.5 block">
                  CEP (Opcional)
                </label>
                <Input
                  type="text"
                  placeholder="00000-000"
                  value={createForm.zipCode}
                  onChange={(e) => setCreateForm({ ...createForm, zipCode: e.target.value })}
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-border mt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsCreateModalOpen(false)}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={creatingCustomer}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white dark:bg-emerald-600 dark:hover:bg-emerald-700"
                >
                  {creatingCustomer ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      <span>Cadastrando...</span>
                    </>
                  ) : (
                    <span>Cadastrar na AbacatePay</span>
                  )}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  )
}
