'use client'

import React, { useState, useEffect } from 'react'
import {
  CreditCard,
  QrCode,
  Barcode,
  Search,
  RefreshCw,
  Plus,
  CheckCircle2,
  Clock,
  RotateCcw,
  ExternalLink,
  Copy,
  Check,
  AlertCircle,
  TrendingUp,
  DollarSign,
  Users,
  Percent,
  X,
  Loader2,
  FileText,
  ShieldCheck
} from 'lucide-react'
import { getAuthHeaders } from '@/lib/utils'
import { UnifiedCharge } from '@/app/api/billing/charges/route'

export default function AbacateBillingsManager() {
  const [charges, setCharges] = useState<UnifiedCharge[]>([])
  const [metrics, setMetrics] = useState({
    totalCount: 0,
    paidCount: 0,
    pendingCount: 0,
    totalVolume: 0,
    conversionRate: 100,
  })
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>('ALL')
  const [searchQuery, setSearchQuery] = useState('')
  const [copiedId, setCopiedId] = useState<string | null>(null)

  // Modal de Nova Cobrança
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [createForm, setCreateForm] = useState({
    amount: '',
    method: 'PIX' as 'PIX' | 'BOLETO' | 'CHECKOUT',
    description: '',
    customerName: '',
    customerEmail: '',
    customerTaxId: '',
    customerPhone: '',
  })
  const [creatingCharge, setCreatingCharge] = useState(false)
  const [createdResult, setCreatedResult] = useState<any>(null)

  // Modal de Reembolso
  const [refundingChargeId, setRefundingChargeId] = useState<string | null>(null)
  const [refunding, setRefunding] = useState(false)
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    fetchCharges()
  }, [statusFilter])

  const fetchCharges = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (statusFilter !== 'ALL') params.set('status', statusFilter)
      if (searchQuery.trim()) params.set('q', searchQuery.trim())

      const res = await fetch(`/api/billing/charges?${params.toString()}`, {
        headers: getAuthHeaders(),
        credentials: 'include',
      })

      if (res.ok) {
        const data = await res.json()
        setCharges(data.charges || [])
        if (data.metrics) setMetrics(data.metrics)
      }
    } catch (err) {
      console.warn('Erro ao carregar cobranças:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    fetchCharges()
  }

  const formatPrice = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)
  }

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return '-'
    const d = new Date(dateStr)
    return isNaN(d.getTime())
      ? '-'
      : d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  }

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  // Criar Cobrança Manual
  const handleCreateCharge = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreatingCharge(true)
    setActionMessage(null)

    try {
      const res = await fetch('/api/billing/charges', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        credentials: 'include',
        body: JSON.stringify(createForm),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Erro ao gerar cobrança')
      }

      setCreatedResult(data.charge)
      fetchCharges()
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.message || 'Falha ao criar cobrança' })
    } finally {
      setCreatingCharge(false)
    }
  }

  // Processar Reembolso
  const handleConfirmRefund = async () => {
    if (!refundingChargeId) return
    setRefunding(true)
    try {
      const res = await fetch('/api/billing/charges/refund', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        credentials: 'include',
        body: JSON.stringify({ chargeId: refundingChargeId }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Erro ao realizar reembolso')
      }

      setActionMessage({ type: 'success', text: `Cobrança ${refundingChargeId} reembolsada com sucesso!` })
      setRefundingChargeId(null)
      fetchCharges()
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.message || 'Falha no reembolso' })
    } finally {
      setRefunding(false)
    }
  }

  // Simular Pagamento Aprovado
  const handleSimulatePayment = async (chargeId: string) => {
    try {
      const res = await fetch('/api/billing/pix/simulate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        credentials: 'include',
        body: JSON.stringify({ pixId: chargeId }),
      })
      if (res.ok) {
        setActionMessage({ type: 'success', text: `Pagamento da cobrança ${chargeId} aprovado com sucesso em Sandbox!` })
        fetchCharges()
      }
    } catch (err) {
      console.warn('Erro ao simular:', err)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PAID':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Paga
          </span>
        )
      case 'PENDING':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/30">
            <Clock className="w-3.5 h-3.5" />
            Pendente
          </span>
        )
      case 'REFUNDED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-500/15 text-purple-400 border border-purple-500/30">
            <RotateCcw className="w-3.5 h-3.5" />
            Reembolsada
          </span>
        )
      case 'CANCELLED':
      case 'EXPIRED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-muted text-muted-foreground border border-border">
            Expirada
          </span>
        )
      default:
        return <span className="px-2 py-0.5 rounded text-xs bg-muted text-muted-foreground">{status}</span>
    }
  }

  const getMethodBadge = (method: string) => {
    switch (method) {
      case 'PIX':
        return (
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-400">
            <QrCode className="w-3.5 h-3.5" />
            PIX
          </span>
        )
      case 'CREDIT_CARD':
        return (
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-blue-400">
            <CreditCard className="w-3.5 h-3.5" />
            Cartão
          </span>
        )
      case 'BOLETO':
        return (
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-400">
            <Barcode className="w-3.5 h-3.5" />
            Boleto
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-primary">
            <ExternalLink className="w-3.5 h-3.5" />
            Checkout
          </span>
        )
    }
  }

  return (
    <div className="space-y-8 animate-in fade-in">
      {/* Top Banner de Mensagem */}
      {actionMessage && (
        <div
          className={`p-4 rounded-2xl border flex items-center justify-between text-sm animate-in fade-in ${
            actionMessage.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {actionMessage.type === 'success' ? <CheckCircle2 className="w-5 h-5 shrink-0" /> : <AlertCircle className="w-5 h-5 shrink-0" />}
            <span>{actionMessage.text}</span>
          </div>
          <button type="button" onClick={() => setActionMessage(null)} className="text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header com Ações Principais */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold uppercase tracking-wider mb-1">
            <CreditCard className="w-4 h-4" />
            <span>Gateway de Pagamentos</span>
          </div>
          <h2 className="text-2xl font-bold text-foreground">Gestão de Cobranças</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Visualize faturas, crie cobranças transparentes e gerencie pagamentos em tempo real.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={fetchCharges}
            disabled={loading}
            className="p-2.5 rounded-xl border border-border bg-card hover:bg-accent text-foreground text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Atualizar</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setCreatedResult(null)
              setIsCreateModalOpen(true)
            }}
            className="py-2.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-black text-xs font-bold flex items-center gap-2 transition-all shadow-md cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Nova Cobrança</span>
          </button>
        </div>
      </div>

      {/* Grid de KPIs Financeiros */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground mb-2">
            <span className="text-xs font-medium">Volume Liquidado</span>
            <DollarSign className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-extrabold text-foreground">{formatPrice(metrics.totalVolume)}</div>
          <span className="text-xs text-emerald-400 font-medium mt-1.5 block">
            {metrics.paidCount} cobranças pagas
          </span>
        </div>

        <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground mb-2">
            <span className="text-xs font-medium">Cobranças Pendentes</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-extrabold text-foreground">{metrics.pendingCount}</div>
          <span className="text-xs text-muted-foreground mt-1.5 block">Aguardando compensação</span>
        </div>

        <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground mb-2">
            <span className="text-xs font-medium">Total de Cobranças</span>
            <FileText className="w-4 h-4 text-primary" />
          </div>
          <div className="text-2xl font-extrabold text-foreground">{metrics.totalCount}</div>
          <span className="text-xs text-muted-foreground mt-1.5 block">Emitidas na plataforma</span>
        </div>

        <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground mb-2">
            <span className="text-xs font-medium">Taxa de Conversão</span>
            <Percent className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-extrabold text-foreground">{metrics.conversionRate}%</div>
          <span className="text-xs text-emerald-400 font-medium mt-1.5 block">Aprovação de checkout</span>
        </div>
      </div>

      {/* Barra de Filtros e Busca */}
      <div className="bg-card border border-border p-4 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Status Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
          {[
            { label: 'Todas', value: 'ALL' },
            { label: 'Pagas', value: 'PAID' },
            { label: 'Pendentes', value: 'PENDING' },
            { label: 'Reembolsadas', value: 'REFUNDED' },
          ].map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => setStatusFilter(tab.value)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 cursor-pointer ${
                statusFilter === tab.value
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'bg-muted/40 text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Input de Busca */}
        <form onSubmit={handleSearchSubmit} className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-muted-foreground absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por ID, cliente ou valor..."
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-background border border-border text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-emerald-500"
          />
        </form>
      </div>

      {/* Tabela de Cobranças */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-muted/50 border-b border-border text-muted-foreground uppercase font-semibold text-[11px]">
              <tr>
                <th className="py-3.5 px-4">Identificador</th>
                <th className="py-3.5 px-4">Cliente</th>
                <th className="py-3.5 px-4">Descrição</th>
                <th className="py-3.5 px-4">Método</th>
                <th className="py-3.5 px-4">Valor</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">Data</th>
                <th className="py-3.5 px-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-muted-foreground">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-emerald-400" />
                    <span>Carregando cobranças da AbacatePay...</span>
                  </td>
                </tr>
              ) : charges.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-muted-foreground">
                    Nenhuma cobrança encontrada para os filtros selecionados.
                  </td>
                </tr>
              ) : (
                charges.map((charge) => (
                  <tr key={charge.id} className="hover:bg-accent/30 transition-colors">
                    {/* ID */}
                    <td className="py-3.5 px-4 font-mono font-medium">
                      <div className="flex items-center gap-1.5">
                        <span className="truncate max-w-[120px]">{charge.id}</span>
                        <button
                          type="button"
                          onClick={() => handleCopy(charge.id, charge.id)}
                          className="text-muted-foreground hover:text-foreground cursor-pointer"
                          title="Copiar ID"
                        >
                          {copiedId === charge.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </td>

                    {/* Cliente */}
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-foreground">{charge.customer?.name || 'Cliente Direto'}</div>
                      <div className="text-[11px] text-muted-foreground">{charge.customer?.email || '-'}</div>
                    </td>

                    {/* Descrição */}
                    <td className="py-3.5 px-4 max-w-[200px] truncate text-foreground">
                      {charge.description}
                    </td>

                    {/* Método */}
                    <td className="py-3.5 px-4">{getMethodBadge(charge.method)}</td>

                    {/* Valor */}
                    <td className="py-3.5 px-4 font-bold text-foreground">
                      {formatPrice(charge.amount)}
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4">{getStatusBadge(charge.status)}</td>

                    {/* Data */}
                    <td className="py-3.5 px-4 text-muted-foreground whitespace-nowrap">
                      {formatDate(charge.createdAt)}
                    </td>

                    {/* Ações */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {charge.checkoutUrl && (
                          <a
                            href={charge.checkoutUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="p-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-accent"
                            title="Abrir Checkout"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        )}

                        {charge.status === 'PENDING' && (
                          <button
                            type="button"
                            onClick={() => handleSimulatePayment(charge.id)}
                            className="p-1.5 rounded-lg border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
                            title="Simular Aprovação (Sandbox)"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {charge.status === 'PAID' && (
                          <button
                            type="button"
                            onClick={() => setRefundingChargeId(charge.id)}
                            className="p-1.5 rounded-lg border border-purple-500/30 text-purple-400 hover:bg-purple-500/10 cursor-pointer"
                            title="Reembolsar"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: NOVA COBRANÇA */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-card border border-border rounded-3xl max-w-lg w-full p-6 sm:p-8 space-y-6 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center">
                  <CreditCard className="w-4 h-4" />
                </div>
                <h3 className="text-lg font-bold text-foreground">Nova Cobrança</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {createdResult ? (
              <div className="space-y-4 text-center py-4 animate-in fade-in">
                <div className="w-14 h-14 rounded-full bg-emerald-500/20 text-emerald-400 mx-auto flex items-center justify-center">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h4 className="font-bold text-lg text-foreground">Cobrança Gerada com Sucesso!</h4>
                <p className="text-xs text-muted-foreground">ID da Cobrança: {createdResult.id}</p>

                {createdResult.brCode && (
                  <div className="p-4 bg-muted/30 rounded-2xl border border-border space-y-3">
                    <span className="text-xs font-semibold block text-foreground">Código PIX Copia e Cola:</span>
                    <input
                      readOnly
                      value={createdResult.brCode}
                      className="w-full px-3 py-2 text-[11px] font-mono bg-background border rounded-lg"
                    />
                    <button
                      type="button"
                      onClick={() => handleCopy(createdResult.brCode, 'new_pix')}
                      className="w-full py-2 px-3 rounded-lg bg-emerald-500 text-black text-xs font-bold"
                    >
                      Copiar Código PIX
                    </button>
                  </div>
                )}

                {createdResult.url && (
                  <a
                    href={createdResult.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold"
                  >
                    <Barcode className="w-4 h-4" />
                    <span>Visualizar Boleto</span>
                  </a>
                )}

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setCreatedResult(null)
                      setIsCreateModalOpen(false)
                    }}
                    className="w-full py-2.5 rounded-xl border border-border text-xs font-semibold"
                  >
                    Fechar
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleCreateCharge} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1">Valor (R$)</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={createForm.amount}
                      onChange={(e) => setCreateForm({ ...createForm, amount: e.target.value })}
                      placeholder="49,90"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-background border border-border text-sm text-foreground focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1">Método</label>
                    <select
                      value={createForm.method}
                      onChange={(e) => setCreateForm({ ...createForm, method: e.target.value as any })}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-background border border-border text-sm text-foreground focus:outline-none focus:border-emerald-500"
                    >
                      <option value="PIX">PIX Instantâneo</option>
                      <option value="BOLETO">Boleto Bancário</option>
                      <option value="CHECKOUT">Checkout Link</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Descrição</label>
                  <input
                    type="text"
                    required
                    value={createForm.description}
                    onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                    placeholder="Ex: Mensalidade Barbearia Pro"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-background border border-border text-sm text-foreground focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1">Nome do Cliente</label>
                    <input
                      type="text"
                      required
                      value={createForm.customerName}
                      onChange={(e) => setCreateForm({ ...createForm, customerName: e.target.value })}
                      placeholder="Nome do cliente"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-background border border-border text-sm text-foreground focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1">Email</label>
                    <input
                      type="email"
                      required
                      value={createForm.customerEmail}
                      onChange={(e) => setCreateForm({ ...createForm, customerEmail: e.target.value })}
                      placeholder="email@cliente.com"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-background border border-border text-sm text-foreground focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1">CPF / CNPJ</label>
                    <input
                      type="text"
                      required
                      value={createForm.customerTaxId}
                      onChange={(e) => setCreateForm({ ...createForm, customerTaxId: e.target.value })}
                      placeholder="000.000.000-00"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-background border border-border text-sm text-foreground focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1">Telefone</label>
                    <input
                      type="tel"
                      value={createForm.customerPhone}
                      onChange={(e) => setCreateForm({ ...createForm, customerPhone: e.target.value })}
                      placeholder="(11) 99999-9999"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-background border border-border text-sm text-foreground focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setIsCreateModalOpen(false)}
                    className="py-2.5 px-4 rounded-xl border border-border text-xs font-semibold hover:bg-accent"
                  >
                    Cancelar
                  </button>

                  <button
                    type="submit"
                    disabled={creatingCharge}
                    className="py-2.5 px-5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-black text-xs font-bold flex items-center gap-2 shadow-md disabled:opacity-50"
                  >
                    {creatingCharge ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                    <span>Emitir Cobrança</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* MODAL: CONFIRMAR REEMBOLSO */}
      {refundingChargeId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-card border border-border rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-in zoom-in-95">
            <div className="w-12 h-12 rounded-full bg-purple-500/20 text-purple-400 mx-auto flex items-center justify-center">
              <RotateCcw className="w-6 h-6" />
            </div>

            <div className="text-center space-y-2">
              <h3 className="font-bold text-lg text-foreground">Confirmar Reembolso?</h3>
              <p className="text-xs text-muted-foreground">
                Você está prestes a reembolsar integralmente a cobrança <strong className="font-mono">{refundingChargeId}</strong> via AbacatePay. O valor será estornado ao cliente.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3">
              <button
                type="button"
                onClick={() => setRefundingChargeId(null)}
                className="w-full py-2.5 rounded-xl border border-border text-xs font-semibold hover:bg-accent cursor-pointer"
              >
                Voltar
              </button>

              <button
                type="button"
                onClick={handleConfirmRefund}
                disabled={refunding}
                className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {refunding ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                <span>Confirmar Reembolso</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
