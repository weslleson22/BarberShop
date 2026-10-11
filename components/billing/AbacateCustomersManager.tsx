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
  TrendingUp,
  ShieldCheck,
  Loader2,
  X,
  Search,
  Building2,
  Phone,
  Mail,
  FileText,
  UserCheck,
  Zap,
  CreditCard,
  Receipt
} from 'lucide-react'
import { getAuthHeaders } from '@/lib/utils'

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
  const [syncingAdminId, setSyncingAdminId] = useState<string | null>(null)
  const [syncingSubId, setSyncingSubId] = useState<string | null>(null)
  const [syncingAll, setSyncingAll] = useState(false)
  const [syncingAllSubs, setSyncingAllSubs] = useState(false)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeSubTab, setActiveSubTab] = useState<'admins' | 'abacate'>('admins')

  // Modal para cadastrar cliente manual
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [createForm, setCreateForm] = useState({
    name: '',
    email: '',
    cellphone: '',
    taxId: '',
    zipCode: '',
  })
  const [creatingCustomer, setCreatingCustomer] = useState(false)

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
      const json = await res.json()

      if (res.ok && json.success) {
        setAdmins(json.admins || [])
        setAbacateCustomers(json.abacateCustomers || [])
        setSummary(json.summary || {
          totalAdmins: json.admins?.length || 0,
          syncedCount: json.admins?.filter((a: any) => a.isSynced)?.length || 0,
          pendingCount: json.admins?.filter((a: any) => !a.isSynced)?.length || 0,
          withBillingCount: json.admins?.filter((a: any) => a.hasAbacateBilling)?.length || 0,
          abacateCustomersCount: json.abacateCustomers?.length || 0,
        })
      } else {
        setFeedback({
          type: 'error',
          message: json.error || 'Erro ao carregar clientes da AbacatePay',
        })
      }
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err?.message || 'Falha na conexão com a API de clientes',
      })
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
          message: json.message || 'Cliente administrador sincronizado com sucesso na AbacatePay!',
        })
        await fetchCustomersData()
      } else {
        setFeedback({
          type: 'error',
          message: json.error || 'Falha ao sincronizar cliente na AbacatePay',
        })
      }
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err?.message || 'Erro inesperado na sincronização',
      })
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
          message: json.message || 'Cobrança e assinatura vinculadas com sucesso na AbacatePay!',
        })
        await fetchCustomersData()
      } else {
        setFeedback({
          type: 'error',
          message: json.error || 'Falha ao vincular cobrança/assinatura na AbacatePay',
        })
      }
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err?.message || 'Erro inesperado ao gerar assinatura na AbacatePay',
      })
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
          message: json.message || `Sincronização concluída! ${json.synced} clientes sincronizados.`,
        })
        await fetchCustomersData()
      } else {
        setFeedback({
          type: 'error',
          message: json.error || 'Falha ao sincronizar clientes em lote',
        })
      }
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err?.message || 'Erro inesperado na sincronização em lote',
      })
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
          className={`p-4 rounded-xl border flex items-center justify-between transition-all ${
            feedback.type === 'success'
              ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
              : 'bg-red-950/40 border-red-500/40 text-red-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
            )}
            <span className="text-sm font-medium">{feedback.message}</span>
          </div>
          <button
            onClick={() => setFeedback(null)}
            className="text-xs opacity-70 hover:opacity-100 transition-opacity"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground mb-2">
            <span className="text-xs font-medium">Admins do Sistema</span>
            <Users className="w-4 h-4 text-primary" />
          </div>
          <div className="text-2xl font-extrabold text-foreground">{summary.totalAdmins}</div>
          <span className="text-xs text-muted-foreground mt-2 block">
            Donos/Gestores de Barbearias
          </span>
        </div>

        <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground mb-2">
            <span className="text-xs font-medium">Clientes Sincronizados</span>
            <UserCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-extrabold text-emerald-400">{summary.syncedCount}</div>
          <span className="text-xs text-emerald-300 font-medium mt-2 block">
            Cadastrados na AbacatePay
          </span>
        </div>

        <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground mb-2">
            <span className="text-xs font-medium">Cobranças & Assinaturas</span>
            <Receipt className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-extrabold text-lime-400">{summary.withBillingCount}</div>
          <span className="text-xs text-lime-300 font-medium mt-2 block">
            Vinculadas na AbacatePay
          </span>
        </div>

        <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground mb-2">
            <span className="text-xs font-medium">Total no Gateway</span>
            <ShieldCheck className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-extrabold text-foreground">{summary.abacateCustomersCount}</div>
          <span className="text-xs text-muted-foreground mt-2 block">
            Base na AbacatePay API v2
          </span>
        </div>
      </div>

      {/* Header Actions & Sub-Tabs */}
      <div className="bg-card border border-border rounded-2xl p-5 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        {/* SubTabs */}
        <div className="flex items-center gap-2 p-1 bg-muted/30 rounded-xl border border-border/50 w-full md:w-auto">
          <button
            onClick={() => setActiveSubTab('admins')}
            className={`flex-1 md:flex-none px-4 py-2 rounded-lg text-xs md:text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
              activeSubTab === 'admins'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>Admins de Barbearias ({admins.length})</span>
          </button>
          <button
            onClick={() => setActiveSubTab('abacate')}
            className={`flex-1 md:flex-none px-4 py-2 rounded-lg text-xs md:text-sm font-semibold transition-colors flex items-center justify-center gap-2 ${
              activeSubTab === 'abacate'
                ? 'bg-emerald-600 text-white font-medium'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Clientes Gateway ({abacateCustomers.length})</span>
          </button>
        </div>

        {/* Global Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap w-full md:w-auto justify-end">
          <button
            onClick={fetchCustomersData}
            disabled={loading}
            className="p-2.5 rounded-xl border border-border hover:bg-muted text-muted-foreground hover:text-foreground transition-all cursor-pointer disabled:opacity-50"
            title="Atualizar dados"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={handleSyncAll}
            disabled={syncingAll || loading}
            className="px-3.5 py-2.5 rounded-xl bg-muted hover:bg-muted/80 text-foreground font-semibold text-xs md:text-sm flex items-center gap-2 transition-all border border-border cursor-pointer disabled:opacity-50"
            title="Sincroniza os perfis de clientes na AbacatePay"
          >
            {syncingAll ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Sincronizando...</span>
              </>
            ) : (
              <>
                <UserCheck className="w-4 h-4 text-emerald-400" />
                <span>Sincronizar Clientes</span>
              </>
            )}
          </button>

          <button
            onClick={handleSyncAllSubscriptions}
            disabled={syncingAllSubs || loading}
            className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs md:text-sm flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50 shadow-md"
            title="Gera cobranças e checkouts de assinaturas vinculados a cada cliente na AbacatePay"
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
          </button>

          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="px-3.5 py-2.5 rounded-xl bg-muted/60 hover:bg-muted text-foreground font-semibold text-xs md:text-sm flex items-center gap-2 transition-all border border-border cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Cadastrar Manual</span>
          </button>
        </div>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          placeholder={
            activeSubTab === 'admins'
              ? 'Buscar por nome, e-mail, barbearia, plano ou telefone...'
              : 'Buscar clientes na AbacatePay por nome, e-mail, telefone, CPF...'
          }
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-card border border-border rounded-xl text-xs md:text-sm text-foreground focus:outline-none focus:border-emerald-500 transition-colors"
        />
      </div>

      {/* SUBTAB 1: Admins de Barbearias do Sistema */}
      {activeSubTab === 'admins' && (
        <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
          <div className="p-4 border-b border-border/60 bg-muted/10 flex items-center justify-between flex-wrap gap-2">
            <div>
              <h3 className="text-sm font-bold text-foreground">Administradores e Donos de Barbearias</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Os clientes pagantes do seu SaaS. Suas cobranças e assinaturas aparecem diretamente em /customers/ na AbacatePay.
              </p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-muted border border-border text-muted-foreground">
              {filteredAdmins.length} registros
            </span>
          </div>

          {loading ? (
            <div className="p-12 text-center text-muted-foreground">
              <Loader2 className="w-8 h-8 animate-spin mx-auto text-emerald-500 mb-3" />
              <p className="text-sm">Carregando lista de administradores e faturamento...</p>
            </div>
          ) : filteredAdmins.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">
              <Users className="w-8 h-8 mx-auto opacity-30 mb-3" />
              <p className="text-sm">Nenhum administrador encontrado com o filtro atual.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs md:text-sm">
                <thead className="bg-muted/30 text-muted-foreground border-b border-border text-[11px] uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Administrador / Barbearia</th>
                    <th className="py-3 px-4">Plano Contratado</th>
                    <th className="py-3 px-4 text-center">Status Cliente</th>
                    <th className="py-3 px-4">Cobrança & Assinatura AbacatePay</th>
                    <th className="py-3 px-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {filteredAdmins.map((admin) => (
                    <tr key={admin.id} className="hover:bg-muted/20 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-foreground">{admin.name}</div>
                        <div className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
                          <Mail className="w-3 h-3" />
                          <span>{admin.email}</span>
                        </div>
                        {admin.barbershop && (
                          <div className="text-xs text-emerald-400 font-medium flex items-center gap-1 mt-1">
                            <Building2 className="w-3 h-3" />
                            <span>{admin.barbershop.name}</span>
                            <span className="text-muted-foreground font-mono text-[10px]">
                              (/{admin.barbershop.slug})
                            </span>
                          </div>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        {admin.subscription ? (
                          <div>
                            <span className="font-semibold text-foreground block">
                              {admin.subscription.planName}
                            </span>
                            <div className="text-xs text-muted-foreground">
                              {formatPrice(admin.subscription.price)} / {admin.subscription.billingInterval === 'YEARLY' ? 'ano' : 'mês'}
                            </div>
                            <span
                              className={`inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                admin.subscription.status === 'ACTIVE'
                                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                  : admin.subscription.status === 'TRIALING'
                                  ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                  : 'bg-muted text-muted-foreground'
                              }`}
                            >
                              {admin.subscription.status}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground italic">Sem plano ativo</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        {admin.isSynced ? (
                          <div className="inline-flex flex-col items-center gap-1">
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Sincronizado
                            </span>
                            {admin.abacateCustomerId && (
                              <button
                                onClick={() => copyToClipboard(admin.abacateCustomerId!, admin.id)}
                                className="text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-1"
                                title="Copiar ID na AbacatePay"
                              >
                                <code>{admin.abacateCustomerId.substring(0, 14)}...</code>
                                {copiedId === admin.id ? (
                                  <Check className="w-2.5 h-2.5 text-emerald-400" />
                                ) : (
                                  <Copy className="w-2.5 h-2.5" />
                                )}
                              </button>
                            )}
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                            <Clock className="w-3.5 h-3.5" />
                            Pendente
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        {admin.hasAbacateBilling ? (
                          <div className="space-y-1">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-lime-500/10 text-lime-400 border border-lime-500/20">
                              <Receipt className="w-3 h-3" />
                              Cobrança Vinculada
                            </span>
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
                                className="text-[11px] text-emerald-400 hover:underline flex items-center gap-1"
                              >
                                <span>Ver Checkout AbacatePay</span>
                                <ExternalLink className="w-2.5 h-2.5" />
                              </a>
                            )}
                          </div>
                        ) : (
                          <div className="space-y-1">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-muted text-muted-foreground border border-border">
                              Sem cobrança na AbacatePay
                            </span>
                            <p className="text-[10px] text-muted-foreground/80">
                              Gere uma assinatura para aparecer em /customers/
                            </p>
                          </div>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5 flex-wrap">
                          <button
                            onClick={() => handleSyncSubscriptionOne(admin.id)}
                            disabled={syncingSubId === admin.id}
                            className="px-2.5 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer disabled:opacity-50"
                            title="Gera o checkout de assinatura na AbacatePay para este cliente"
                          >
                            {syncingSubId === admin.id ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <Zap className="w-3 h-3" />
                            )}
                            <span>{admin.hasAbacateBilling ? 'Atualizar Assinatura' : 'Gerar Cobrança'}</span>
                          </button>

                          <button
                            onClick={() => handleSyncOne(admin.id)}
                            disabled={syncingAdminId === admin.id}
                            className="px-2 py-1.5 rounded-lg border border-border hover:bg-muted text-xs text-muted-foreground hover:text-foreground transition-all cursor-pointer disabled:opacity-50"
                            title="Atualizar dados cadastrais do cliente"
                          >
                            {syncingAdminId === admin.id ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              'Perfil'
                            )}
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

      {/* SUBTAB 2: Clientes na AbacatePay */}
      {activeSubTab === 'abacate' && (
        <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
          <div className="p-4 border-b border-border/60 bg-muted/10 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-foreground">Base de Clientes na AbacatePay</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Clientes cadastrados diretamente no gateway de pagamentos via API v2.
              </p>
            </div>
            <a
              href="https://app.abacatepay.com/customers"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-semibold text-emerald-400 hover:underline flex items-center gap-1"
            >
              <span>Painel AbacatePay</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>

          {loading ? (
            <div className="p-12 text-center text-muted-foreground">
              <Loader2 className="w-8 h-8 animate-spin mx-auto text-emerald-500 mb-3" />
              <p className="text-sm">Consultando clientes na AbacatePay...</p>
            </div>
          ) : filteredAbacateCustomers.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">
              <ShieldCheck className="w-8 h-8 mx-auto opacity-30 mb-3" />
              <p className="text-sm">Nenhum cliente cadastrado na AbacatePay ainda.</p>
              <p className="text-xs mt-1 text-muted-foreground/80">
                Clique em &quot;Sincronizar Clientes&quot; acima para exportar todos os admins de barbearias existentes.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs md:text-sm">
                <thead className="bg-muted/30 text-muted-foreground border-b border-border text-[11px] uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">ID Cliente</th>
                    <th className="py-3 px-4">Nome / Razão</th>
                    <th className="py-3 px-4">E-mail</th>
                    <th className="py-3 px-4">Telefone</th>
                    <th className="py-3 px-4">CPF / CNPJ</th>
                    <th className="py-3 px-4">Metadata Vinculada</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {filteredAbacateCustomers.map((customer) => (
                    <tr key={customer.id} className="hover:bg-muted/20 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <code className="text-xs font-mono text-emerald-400 font-bold">
                            {customer.id}
                          </code>
                          <button
                            onClick={() => copyToClipboard(customer.id, customer.id)}
                            className="text-muted-foreground hover:text-foreground"
                            title="Copiar ID"
                          >
                            {copiedId === customer.id ? (
                              <Check className="w-3 h-3 text-emerald-400" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 font-semibold text-foreground">
                        {customer.name || 'Sem nome'}
                      </td>

                      <td className="py-3.5 px-4 text-foreground">
                        {customer.email}
                      </td>

                      <td className="py-3.5 px-4 text-muted-foreground">
                        {customer.cellphone || '—'}
                      </td>

                      <td className="py-3.5 px-4 text-muted-foreground font-mono text-xs">
                        {customer.taxId || '—'}
                      </td>

                      <td className="py-3.5 px-4">
                        {customer.metadata ? (
                          <div className="text-[11px] text-muted-foreground">
                            {customer.metadata.barbershopName && (
                              <span className="font-medium text-foreground block">
                                {customer.metadata.barbershopName}
                              </span>
                            )}
                            {customer.metadata.role && (
                              <span className="text-[10px] text-emerald-400">
                                {customer.metadata.role}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground italic">—</span>
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

      {/* MODAL: Cadastrar Cliente Manual */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl w-full max-w-lg shadow-2xl p-6 relative">
            <div className="flex items-center justify-between pb-4 border-b border-border mb-5">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white">
                  <Users className="w-4 h-4" />
                </div>
                <h3 className="text-base font-bold text-foreground">Cadastrar Cliente no Gateway</h3>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCustomer} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-foreground mb-1 block">
                  E-mail do Cliente *
                </label>
                <input
                  type="email"
                  required
                  placeholder="admin@barbearia.com"
                  value={createForm.email}
                  onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-background border border-border rounded-xl text-xs md:text-sm text-foreground focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground mb-1 block">
                  Nome Completo / Razão Social
                </label>
                <input
                  type="text"
                  placeholder="Nome do Dono ou Barbearia"
                  value={createForm.name}
                  onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-background border border-border rounded-xl text-xs md:text-sm text-foreground focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-foreground mb-1 block">
                    WhatsApp / Telefone
                  </label>
                  <input
                    type="text"
                    placeholder="(11) 99999-9999"
                    value={createForm.cellphone}
                    onChange={(e) => setCreateForm({ ...createForm, cellphone: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-background border border-border rounded-xl text-xs md:text-sm text-foreground focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-foreground mb-1 block">
                    CPF / CNPJ
                  </label>
                  <input
                    type="text"
                    placeholder="000.000.000-00"
                    value={createForm.taxId}
                    onChange={(e) => setCreateForm({ ...createForm, taxId: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-background border border-border rounded-xl text-xs md:text-sm text-foreground focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground mb-1 block">
                  CEP (Opcional)
                </label>
                <input
                  type="text"
                  placeholder="00000-000"
                  value={createForm.zipCode}
                  onChange={(e) => setCreateForm({ ...createForm, zipCode: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-background border border-border rounded-xl text-xs md:text-sm text-foreground focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-border mt-5">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-border hover:bg-muted text-xs font-semibold text-muted-foreground"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={creatingCustomer}
                  className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold flex items-center gap-2 shadow-md disabled:opacity-50"
                >
                  {creatingCustomer ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Cadastrando...</span>
                    </>
                  ) : (
                    <span>Cadastrar na AbacatePay</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
