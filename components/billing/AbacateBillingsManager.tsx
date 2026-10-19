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
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-[#059669] text-white border border-[#10b981]">
            <CheckCircle2 className="w-3.5 h-3.5 stroke-[2.5]" />
            Paga
          </span>
        )
      case 'PENDING':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-[#d97706] text-white border border-[#f59e0b]">
            <Clock className="w-3.5 h-3.5 stroke-[2.5]" />
            Pendente
          </span>
        )
      case 'REFUNDED':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-[#7c3aed] text-white border border-[#8b5cf6]">
            <RotateCcw className="w-3.5 h-3.5 stroke-[2.5]" />
            Reembolsada
          </span>
        )
      case 'CANCELLED':
      case 'EXPIRED':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-[#dc2626] text-white border border-[#ef4444]">
            Expirada
          </span>
        )
      default:
        return <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#1f2937] text-white border border-[#374151]">{status}</span>
    }
  }

  const getMethodBadge = (method: string) => {
    switch (method) {
      case 'PIX':
        return (
          <span className="inline-flex items-center gap-1 text-xs font-bold text-white bg-[#059669] px-2.5 py-0.5 rounded border border-[#10b981]">
            <QrCode className="w-3.5 h-3.5" />
            PIX
          </span>
        )
      case 'CREDIT_CARD':
        return (
          <span className="inline-flex items-center gap-1 text-xs font-bold text-white bg-[#2563eb] px-2.5 py-0.5 rounded border border-[#3b82f6]">
            <CreditCard className="w-3.5 h-3.5" />
            Cartão
          </span>
        )
      case 'BOLETO':
        return (
          <span className="inline-flex items-center gap-1 text-xs font-bold text-white bg-[#d97706] px-2.5 py-0.5 rounded border border-[#f59e0b]">
            <Barcode className="w-3.5 h-3.5" />
            Boleto
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center gap-1 text-xs font-bold text-white bg-[#2563eb] px-2.5 py-0.5 rounded border border-[#3b82f6]">
            <ExternalLink className="w-3.5 h-3.5" />
            Checkout
          </span>
        )
    }
  }

  return (
    <div className="space-y-8">
      {/* Top Banner de Mensagem */}
      {actionMessage && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between text-sm ${
            actionMessage.type === 'success'
              ? 'bg-[#059669] border-[#10b981] text-white'
              : 'bg-[#dc2626] border-[#ef4444] text-white'
          }`}
        >
          <div className="flex items-center gap-2.5 font-bold">
            {actionMessage.type === 'success' ? <CheckCircle2 className="w-5 h-5 shrink-0 stroke-[2.5]" /> : <AlertCircle className="w-5 h-5 shrink-0 stroke-[2.5]" />}
            <span>{actionMessage.text}</span>
          </div>
          <button type="button" onClick={() => setActionMessage(null)} className="text-white hover:opacity-80 cursor-pointer">
            <X className="w-4 h-4 stroke-[2.5]" />
          </button>
        </div>
      )}

      {/* Header com Ações Principais */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#374151] pb-6">
        <div>
          <div className="flex items-center gap-2 text-white text-xs font-bold uppercase tracking-wider mb-1">
            <span className="p-1 rounded bg-[#2563eb] text-white"><CreditCard className="w-3.5 h-3.5" /></span>
            <span>Gateway de Pagamentos</span>
          </div>
          <h2 className="text-2xl font-extrabold text-white">Gestão de Cobranças</h2>
          <p className="text-sm text-white font-medium mt-0.5">
            Visualize faturas, crie cobranças transparentes e gerencie pagamentos em tempo real.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={fetchCharges}
            disabled={loading}
            className="p-2.5 rounded-xl border border-[#374151] bg-[#111827] hover:bg-[#1f2937] text-white text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
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
            className="py-2.5 px-5 rounded-xl bg-[#059669] hover:bg-[#047857] text-white text-xs font-bold flex items-center gap-2 transition shadow-md border border-[#10b981] cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Nova Cobrança</span>
          </button>
        </div>
      </div>

      {/* Grid de KPIs Financeiros */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#111827] border border-[#374151] rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-white text-xs font-bold uppercase tracking-wider mb-2">
            <span>Volume Liquidado</span>
            <span className="p-1 rounded bg-[#059669] text-white"><DollarSign className="w-4 h-4 stroke-[2.5]" /></span>
          </div>
          <div className="text-3xl font-extrabold text-white">{formatPrice(metrics.totalVolume)}</div>
          <span className="text-xs text-white font-bold mt-1.5 block">
            {metrics.paidCount} cobranças pagas
          </span>
        </div>

        <div className="bg-[#111827] border border-[#374151] rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-white text-xs font-bold uppercase tracking-wider mb-2">
            <span>Cobranças Pendentes</span>
            <span className="p-1 rounded bg-[#d97706] text-white"><Clock className="w-4 h-4 stroke-[2.5]" /></span>
          </div>
          <div className="text-3xl font-extrabold text-white">{metrics.pendingCount}</div>
          <span className="text-xs text-white font-medium mt-1.5 block">Aguardando compensação</span>
        </div>

        <div className="bg-[#111827] border border-[#374151] rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-white text-xs font-bold uppercase tracking-wider mb-2">
            <span>Total de Cobranças</span>
            <span className="p-1 rounded bg-[#2563eb] text-white"><FileText className="w-4 h-4 stroke-[2.5]" /></span>
          </div>
          <div className="text-3xl font-extrabold text-white">{metrics.totalCount}</div>
          <span className="text-xs text-white font-medium mt-1.5 block">Emitidas na plataforma</span>
        </div>

        <div className="bg-[#111827] border border-[#374151] rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-white text-xs font-bold uppercase tracking-wider mb-2">
            <span>Taxa de Conversão</span>
            <span className="p-1 rounded bg-[#059669] text-white"><Percent className="w-4 h-4 stroke-[2.5]" /></span>
          </div>
          <div className="text-3xl font-extrabold text-white">{metrics.conversionRate}%</div>
          <span className="text-xs text-white font-bold mt-1.5 block">Aprovação de checkout</span>
        </div>
      </div>

      {/* Barra de Filtros e Busca */}
      <div className="bg-[#111827] border border-[#374151] p-4 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Status Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
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
              className={`px-4 py-2 rounded-xl text-xs font-bold transition shrink-0 cursor-pointer border ${
                statusFilter === tab.value
                  ? 'bg-[#2563eb] text-white border-[#3b82f6]'
                  : 'bg-[#030712] text-white border-[#374151] hover:bg-[#1f2937]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Input de Busca */}
        <form onSubmit={handleSearchSubmit} className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-white absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por ID, cliente ou valor..."
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-[#030712] border border-[#374151] text-xs text-white placeholder:text-gray-400 font-medium focus:outline-none focus:border-[#2563eb]"
          />
        </form>
      </div>

      {/* Tabela de Cobranças */}
      <div className="bg-[#111827] border border-[#374151] rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#030712] border-b border-[#374151] text-white uppercase font-bold text-[11px]">
              <tr>
                <th className="py-3.5 px-4 font-bold">Identificador</th>
                <th className="py-3.5 px-4 font-bold">Cliente</th>
                <th className="py-3.5 px-4 font-bold">Descrição</th>
                <th className="py-3.5 px-4 font-bold">Método</th>
                <th className="py-3.5 px-4 font-bold">Valor</th>
                <th className="py-3.5 px-4 font-bold">Status</th>
                <th className="py-3.5 px-4 font-bold">Data</th>
                <th className="py-3.5 px-4 text-right font-bold">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#374151] bg-[#111827] text-white">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-white font-medium">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-[#059669]" />
                    <span>Carregando cobranças da AbacatePay...</span>
                  </td>
                </tr>
              ) : charges.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-white font-medium">
                    Nenhuma cobrança encontrada para os filtros selecionados.
                  </td>
                </tr>
              ) : (
                charges.map((charge) => (
                  <tr key={charge.id} className="hover:bg-[#1f2937] transition-colors">
                    {/* ID */}
                    <td className="py-3.5 px-4 font-mono font-bold">
                      <div className="flex items-center gap-1.5">
                        <span className="truncate max-w-[120px] text-white">{charge.id}</span>
                        <button
                          type="button"
                          onClick={() => handleCopy(charge.id, charge.id)}
                          className="text-white hover:opacity-80 cursor-pointer p-1 rounded hover:bg-[#374151]"
                          title="Copiar ID"
                        >
                          {copiedId === charge.id ? <Check className="w-3.5 h-3.5 text-[#059669]" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </td>

                    {/* Cliente */}
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-white">{charge.customer?.name || 'Cliente Direto'}</div>
                      <div className="text-xs text-white font-medium">{charge.customer?.email || '-'}</div>
                    </td>

                    {/* Descrição */}
                    <td className="py-3.5 px-4 max-w-[200px] truncate text-white font-medium">
                      {charge.description}
                    </td>

                    {/* Método */}
                    <td className="py-3.5 px-4">{getMethodBadge(charge.method)}</td>

                    {/* Valor */}
                    <td className="py-3.5 px-4 font-bold text-white text-sm">
                      {formatPrice(charge.amount)}
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4">{getStatusBadge(charge.status)}</td>

                    {/* Data */}
                    <td className="py-3.5 px-4 text-white font-medium whitespace-nowrap">
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
                            className="p-1.5 rounded-lg border border-[#3b82f6] text-white bg-[#2563eb] hover:bg-[#1d4ed8]"
                            title="Abrir Checkout"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        )}

                        {charge.status === 'PENDING' && (
                          <button
                            type="button"
                            onClick={() => handleSimulatePayment(charge.id)}
                            className="p-1.5 rounded-lg border border-[#10b981] text-white bg-[#059669] hover:bg-[#047857] cursor-pointer"
                            title="Simular Aprovação (Sandbox)"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5 stroke-[2.5]" />
                          </button>
                        )}

                        {charge.status === 'PAID' && (
                          <button
                            type="button"
                            onClick={() => setRefundingChargeId(charge.id)}
                            className="p-1.5 rounded-lg border border-[#8b5cf6] text-white bg-[#7c3aed] hover:bg-[#6d28d9] cursor-pointer"
                            title="Reembolsar"
                          >
                            <RotateCcw className="w-3.5 h-3.5 stroke-[2.5]" />
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 overflow-y-auto">
          <div className="bg-[#111827] border border-[#374151] rounded-2xl max-w-lg w-full p-6 sm:p-8 space-y-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#374151] pb-4">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-lg bg-[#059669] text-white flex items-center justify-center">
                  <CreditCard className="w-5 h-5 stroke-[2.5]" />
                </div>
                <h3 className="text-lg font-bold text-white">Nova Cobrança</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1.5 text-white bg-[#1f2937] hover:bg-[#374151] border border-[#4b5563] rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {createdResult ? (
              <div className="space-y-4 text-center py-4">
                <div className="w-14 h-14 rounded-full bg-[#059669] text-white mx-auto flex items-center justify-center">
                  <CheckCircle2 className="w-8 h-8 stroke-[2.5]" />
                </div>
                <h4 className="font-bold text-lg text-white">Cobrança Gerada com Sucesso!</h4>
                <p className="text-xs text-white font-mono">ID da Cobrança: {createdResult.id}</p>

                {createdResult.brCode && (
                  <div className="p-4 bg-[#030712] rounded-xl border border-[#374151] space-y-3">
                    <span className="text-xs font-bold block text-white">Código PIX Copia e Cola:</span>
                    <input
                      readOnly
                      value={createdResult.brCode}
                      className="w-full px-3 py-2 text-xs font-mono bg-[#111827] border border-[#374151] rounded-lg text-white font-bold"
                    />
                    <button
                      type="button"
                      onClick={() => handleCopy(createdResult.brCode, 'new_pix')}
                      className="w-full py-2.5 px-3 rounded-lg bg-[#059669] hover:bg-[#047857] text-white text-xs font-bold border border-[#10b981] cursor-pointer"
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
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#2563eb] hover:bg-[#1d4ed8] text-white text-xs font-bold border border-[#3b82f6]"
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
                    className="w-full py-2.5 rounded-xl bg-[#1f2937] hover:bg-[#374151] text-white text-xs font-bold border border-[#4b5563] cursor-pointer"
                  >
                    Fechar
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleCreateCharge} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-white mb-1.5">Valor (R$)</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={createForm.amount}
                      onChange={(e) => setCreateForm({ ...createForm, amount: e.target.value })}
                      placeholder="49,90"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#030712] border border-[#374151] text-xs text-white font-medium focus:outline-none focus:border-[#2563eb]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-white mb-1.5">Método</label>
                    <select
                      value={createForm.method}
                      onChange={(e) => setCreateForm({ ...createForm, method: e.target.value as any })}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#030712] border border-[#374151] text-xs text-white font-bold focus:outline-none focus:border-[#2563eb]"
                    >
                      <option value="PIX" className="bg-[#111827] text-white">PIX Instantâneo</option>
                      <option value="BOLETO" className="bg-[#111827] text-white">Boleto Bancário</option>
                      <option value="CHECKOUT" className="bg-[#111827] text-white">Checkout Link</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-white mb-1.5">Descrição</label>
                  <input
                    type="text"
                    required
                    value={createForm.description}
                    onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                    placeholder="Ex: Mensalidade Barbearia Pro"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#030712] border border-[#374151] text-xs text-white font-medium focus:outline-none focus:border-[#2563eb]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-white mb-1.5">Nome do Cliente</label>
                    <input
                      type="text"
                      required
                      value={createForm.customerName}
                      onChange={(e) => setCreateForm({ ...createForm, customerName: e.target.value })}
                      placeholder="Nome do cliente"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#030712] border border-[#374151] text-xs text-white font-medium focus:outline-none focus:border-[#2563eb]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-white mb-1.5">Email</label>
                    <input
                      type="email"
                      required
                      value={createForm.customerEmail}
                      onChange={(e) => setCreateForm({ ...createForm, customerEmail: e.target.value })}
                      placeholder="email@cliente.com"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#030712] border border-[#374151] text-xs text-white font-medium focus:outline-none focus:border-[#2563eb]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-white mb-1.5">CPF / CNPJ</label>
                    <input
                      type="text"
                      required
                      value={createForm.customerTaxId}
                      onChange={(e) => setCreateForm({ ...createForm, customerTaxId: e.target.value })}
                      placeholder="000.000.000-00"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#030712] border border-[#374151] text-xs text-white font-mono focus:outline-none focus:border-[#2563eb]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-white mb-1.5">Telefone</label>
                    <input
                      type="tel"
                      value={createForm.customerPhone}
                      onChange={(e) => setCreateForm({ ...createForm, customerPhone: e.target.value })}
                      placeholder="(11) 99999-9999"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#030712] border border-[#374151] text-xs text-white font-mono focus:outline-none focus:border-[#2563eb]"
                    />
                  </div>
                </div>

                <div className="pt-3 border-t border-[#374151] flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setIsCreateModalOpen(false)}
                    className="py-2.5 px-4 rounded-xl border border-[#4b5563] bg-[#1f2937] hover:bg-[#374151] text-white text-xs font-bold cursor-pointer"
                  >
                    Cancelar
                  </button>

                  <button
                    type="submit"
                    disabled={creatingCharge}
                    className="py-2.5 px-5 rounded-xl bg-[#059669] hover:bg-[#047857] text-white text-xs font-bold flex items-center gap-2 border border-[#10b981] disabled:opacity-50 cursor-pointer"
                  >
                    {creatingCharge ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4 stroke-[2.5]" />}
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4">
          <div className="bg-[#111827] border border-[#374151] rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="w-12 h-12 rounded-xl bg-[#7c3aed] border border-[#8b5cf6] text-white mx-auto flex items-center justify-center">
              <RotateCcw className="w-6 h-6 stroke-[2.5]" />
            </div>

            <div className="text-center space-y-2">
              <h3 className="font-bold text-lg text-white">Confirmar Reembolso?</h3>
              <p className="text-xs text-white font-medium">
                Você está prestes a reembolsar integralmente a cobrança <strong className="font-mono text-white bg-[#030712] px-2 py-0.5 rounded border border-[#374151]">{refundingChargeId}</strong> via AbacatePay. O valor será estornado ao cliente.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#374151]">
              <button
                type="button"
                onClick={() => setRefundingChargeId(null)}
                className="w-full py-2.5 rounded-xl border border-[#4b5563] bg-[#1f2937] hover:bg-[#374151] text-white text-xs font-bold cursor-pointer"
              >
                Voltar
              </button>

              <button
                type="button"
                onClick={handleConfirmRefund}
                disabled={refunding}
                className="w-full py-2.5 rounded-xl bg-[#7c3aed] hover:bg-[#6d28d9] text-white text-xs font-bold flex items-center justify-center gap-2 cursor-pointer border border-[#8b5cf6] disabled:opacity-50"
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
