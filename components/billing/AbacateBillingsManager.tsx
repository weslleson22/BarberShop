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
  ShieldCheck,
} from 'lucide-react'
import { getAuthHeaders } from '@/lib/utils'
import { UnifiedCharge } from '@/app/api/billing/charges/route'
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
          <Badge
            variant="outline"
            className="border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 font-semibold gap-1"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            Paga
          </Badge>
        )
      case 'PENDING':
        return (
          <Badge
            variant="outline"
            className="border-amber-500/30 text-amber-600 dark:text-amber-400 bg-amber-500/10 font-semibold gap-1"
          >
            <Clock className="w-3.5 h-3.5" />
            Pendente
          </Badge>
        )
      case 'REFUNDED':
        return (
          <Badge
            variant="outline"
            className="border-purple-500/30 text-purple-600 dark:text-purple-400 bg-purple-500/10 font-semibold gap-1"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reembolsada
          </Badge>
        )
      case 'CANCELLED':
      case 'EXPIRED':
        return (
          <Badge
            variant="outline"
            className="border-destructive/30 text-destructive bg-destructive/10 font-semibold gap-1"
          >
            Expirada
          </Badge>
        )
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const getMethodBadge = (method: string) => {
    switch (method) {
      case 'PIX':
        return (
          <Badge variant="secondary" className="gap-1 font-semibold">
            <QrCode className="w-3.5 h-3.5" />
            PIX
          </Badge>
        )
      case 'CREDIT_CARD':
        return (
          <Badge variant="secondary" className="gap-1 font-semibold">
            <CreditCard className="w-3.5 h-3.5" />
            Cartão
          </Badge>
        )
      case 'BOLETO':
        return (
          <Badge variant="secondary" className="gap-1 font-semibold">
            <Barcode className="w-3.5 h-3.5" />
            Boleto
          </Badge>
        )
      default:
        return (
          <Badge variant="outline" className="gap-1 font-semibold">
            <ExternalLink className="w-3.5 h-3.5" />
            Checkout
          </Badge>
        )
    }
  }

  return (
    <div className="space-y-6">
      {/* Top Banner de Mensagem */}
      {actionMessage && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between text-sm animate-in fade-in ${
            actionMessage.type === 'success'
              ? 'bg-primary/10 border-primary/20 text-primary'
              : 'bg-destructive/15 border-destructive/30 text-destructive'
          }`}
        >
          <div className="flex items-center gap-2.5 font-semibold">
            {actionMessage.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 shrink-0" />
            )}
            <span>{actionMessage.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setActionMessage(null)}
            className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header com Ações Principais */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <Badge variant="outline" className="text-primary bg-primary/10 border-primary/20 text-xs font-semibold gap-1.5">
              <CreditCard className="w-3.5 h-3.5" />
              <span>Gateway de Pagamentos</span>
            </Badge>
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">Gestão de Cobranças</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Visualize faturas, crie cobranças transparentes e gerencie pagamentos em tempo real.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={fetchCharges}
            disabled={loading}
            className="h-10 gap-1.5"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Atualizar</span>
          </Button>

          <Button
            type="button"
            size="default"
            onClick={() => {
              setCreatedResult(null)
              setIsCreateModalOpen(true)
            }}
            className="gap-2 shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Nova Cobrança</span>
          </Button>
        </div>
      </div>

      {/* Grid de KPIs Financeiros */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-border shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center justify-between text-muted-foreground text-xs font-medium uppercase tracking-wider mb-2">
              <span>Volume Liquidado</span>
              <span className="p-1.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <DollarSign className="w-4 h-4" />
              </span>
            </div>
            <div className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
              {formatPrice(metrics.totalVolume)}
            </div>
            <span className="text-xs text-muted-foreground font-medium mt-1.5 block">
              {metrics.paidCount} cobranças pagas
            </span>
          </CardContent>
        </Card>

        <Card className="border-border shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center justify-between text-muted-foreground text-xs font-medium uppercase tracking-wider mb-2">
              <span>Cobranças Pendentes</span>
              <span className="p-1.5 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400">
                <Clock className="w-4 h-4" />
              </span>
            </div>
            <div className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
              {metrics.pendingCount}
            </div>
            <span className="text-xs text-muted-foreground font-medium mt-1.5 block">
              Aguardando compensação
            </span>
          </CardContent>
        </Card>

        <Card className="border-border shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center justify-between text-muted-foreground text-xs font-medium uppercase tracking-wider mb-2">
              <span>Total de Cobranças</span>
              <span className="p-1.5 rounded-md bg-primary/10 text-primary">
                <FileText className="w-4 h-4" />
              </span>
            </div>
            <div className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
              {metrics.totalCount}
            </div>
            <span className="text-xs text-muted-foreground font-medium mt-1.5 block">
              Emitidas na plataforma
            </span>
          </CardContent>
        </Card>

        <Card className="border-border shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center justify-between text-muted-foreground text-xs font-medium uppercase tracking-wider mb-2">
              <span>Taxa de Conversão</span>
              <span className="p-1.5 rounded-md bg-primary/10 text-primary">
                <Percent className="w-4 h-4" />
              </span>
            </div>
            <div className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
              {metrics.conversionRate}%
            </div>
            <span className="text-xs text-muted-foreground font-medium mt-1.5 block">
              Aprovação de checkout
            </span>
          </CardContent>
        </Card>
      </div>

      {/* Barra de Filtros e Busca */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Status Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
          {[
            { label: 'Todas', value: 'ALL' },
            { label: 'Pagas', value: 'PAID' },
            { label: 'Pendentes', value: 'PENDING' },
            { label: 'Reembolsadas', value: 'REFUNDED' },
          ].map((tab) => (
            <Button
              key={tab.value}
              type="button"
              size="sm"
              variant={statusFilter === tab.value ? 'default' : 'outline'}
              onClick={() => setStatusFilter(tab.value)}
              className="text-xs font-medium shrink-0 h-9"
            >
              {tab.label}
            </Button>
          ))}
        </div>

        {/* Input de Busca */}
        <form onSubmit={handleSearchSubmit} className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
          <Input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por ID, cliente ou valor..."
            className="pl-9 h-9 text-xs"
          />
        </form>
      </div>

      {/* Tabela de Cobranças */}
      <Card className="border-border shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead>Identificador</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead className="hidden md:table-cell">Descrição</TableHead>
              <TableHead>Método</TableHead>
              <TableHead>Valor</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="hidden lg:table-cell">Data</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} className="py-12 text-center text-muted-foreground font-medium">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-primary" />
                  <span>Carregando cobranças da AbacatePay...</span>
                </TableCell>
              </TableRow>
            ) : charges.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="py-12 text-center text-muted-foreground font-medium">
                  Nenhuma cobrança encontrada para os filtros selecionados.
                </TableCell>
              </TableRow>
            ) : (
              charges.map((charge) => (
                <TableRow key={charge.id} className="hover:bg-muted/50 transition-colors">
                  {/* ID */}
                  <TableCell className="font-mono text-xs font-medium">
                    <div className="flex items-center gap-1.5">
                      <span className="truncate max-w-[120px] text-foreground">{charge.id}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleCopy(charge.id, charge.id)}
                        className="h-6 w-6 text-muted-foreground hover:text-foreground"
                        title="Copiar ID"
                      >
                        {copiedId === charge.id ? (
                          <Check className="w-3.5 h-3.5 text-emerald-500" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </Button>
                    </div>
                  </TableCell>

                  {/* Cliente */}
                  <TableCell>
                    <div className="font-medium text-sm text-foreground">
                      {charge.customer?.name || 'Cliente Direto'}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {charge.customer?.email || '-'}
                    </div>
                  </TableCell>

                  {/* Descrição */}
                  <TableCell className="hidden md:table-cell max-w-[200px] truncate text-xs text-muted-foreground">
                    {charge.description || '-'}
                  </TableCell>

                  {/* Método */}
                  <TableCell>{getMethodBadge(charge.method)}</TableCell>

                  {/* Valor */}
                  <TableCell className="font-bold text-foreground text-sm">
                    {formatPrice(charge.amount)}
                  </TableCell>

                  {/* Status */}
                  <TableCell>{getStatusBadge(charge.status)}</TableCell>

                  {/* Data */}
                  <TableCell className="hidden lg:table-cell text-xs text-muted-foreground whitespace-nowrap">
                    {formatDate(charge.createdAt)}
                  </TableCell>

                  {/* Ações */}
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      {charge.checkoutUrl && (
                        <Button
                          asChild
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-primary"
                          title="Abrir Checkout"
                        >
                          <a href={charge.checkoutUrl} target="_blank" rel="noreferrer">
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        </Button>
                      )}

                      {charge.status === 'PENDING' && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleSimulatePayment(charge.id)}
                          className="h-8 w-8 text-muted-foreground hover:text-emerald-500"
                          title="Simular Aprovação (Sandbox)"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                        </Button>
                      )}

                      {charge.status === 'PAID' && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => setRefundingChargeId(charge.id)}
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          title="Reembolsar"
                        >
                          <RotateCcw className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {/* MODAL: NOVA COBRANÇA */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4 overflow-y-auto animate-in fade-in">
          <Card className="border-border rounded-xl max-w-lg w-full p-6 space-y-6 shadow-2xl bg-card text-card-foreground">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center border border-primary/20">
                  <CreditCard className="w-4 h-4" />
                </div>
                <h3 className="text-lg font-bold text-foreground">Nova Cobrança</h3>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setIsCreateModalOpen(false)}
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            {createdResult ? (
              <div className="space-y-4 text-center py-4">
                <div className="w-14 h-14 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center border border-emerald-500/20">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h4 className="font-bold text-lg text-foreground">Cobrança Gerada com Sucesso!</h4>
                <p className="text-xs text-muted-foreground font-mono">ID da Cobrança: {createdResult.id}</p>

                {createdResult.brCode && (
                  <div className="p-4 bg-muted/50 rounded-xl border border-border space-y-3 text-left">
                    <span className="text-xs font-semibold block text-foreground">Código PIX Copia e Cola:</span>
                    <Input
                      readOnly
                      value={createdResult.brCode}
                      className="text-xs font-mono bg-background"
                    />
                    <Button
                      type="button"
                      onClick={() => handleCopy(createdResult.brCode, 'new_pix')}
                      className="w-full gap-2"
                    >
                      <Copy className="w-4 h-4" />
                      <span>Copiar Código PIX</span>
                    </Button>
                  </div>
                )}

                {createdResult.url && (
                  <Button asChild variant="outline" className="gap-2">
                    <a href={createdResult.url} target="_blank" rel="noreferrer">
                      <Barcode className="w-4 h-4" />
                      <span>Visualizar Boleto</span>
                    </a>
                  </Button>
                )}

                <div className="pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setCreatedResult(null)
                      setIsCreateModalOpen(false)
                    }}
                    className="w-full"
                  >
                    Fechar
                  </Button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleCreateCharge} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-foreground mb-1.5">Valor (R$)</label>
                    <Input
                      type="number"
                      step="0.01"
                      required
                      value={createForm.amount}
                      onChange={(e) => setCreateForm({ ...createForm, amount: e.target.value })}
                      placeholder="49,90"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-foreground mb-1.5">Método</label>
                    <select
                      value={createForm.method}
                      onChange={(e) => setCreateForm({ ...createForm, method: e.target.value as any })}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                    >
                      <option value="PIX">PIX Instantâneo</option>
                      <option value="BOLETO">Boleto Bancário</option>
                      <option value="CHECKOUT">Checkout Link</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-foreground mb-1.5">Descrição</label>
                  <Input
                    type="text"
                    required
                    value={createForm.description}
                    onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                    placeholder="Ex: Mensalidade Barbearia Pro"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-foreground mb-1.5">Nome do Cliente</label>
                    <Input
                      type="text"
                      required
                      value={createForm.customerName}
                      onChange={(e) => setCreateForm({ ...createForm, customerName: e.target.value })}
                      placeholder="Nome do cliente"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-foreground mb-1.5">Email</label>
                    <Input
                      type="email"
                      required
                      value={createForm.customerEmail}
                      onChange={(e) => setCreateForm({ ...createForm, customerEmail: e.target.value })}
                      placeholder="email@cliente.com"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-foreground mb-1.5">CPF / CNPJ</label>
                    <Input
                      type="text"
                      required
                      value={createForm.customerTaxId}
                      onChange={(e) => setCreateForm({ ...createForm, customerTaxId: e.target.value })}
                      placeholder="000.000.000-00"
                      className="font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-foreground mb-1.5">Telefone</label>
                    <Input
                      type="tel"
                      value={createForm.customerPhone}
                      onChange={(e) => setCreateForm({ ...createForm, customerPhone: e.target.value })}
                      placeholder="(11) 99999-9999"
                      className="font-mono"
                    />
                  </div>
                </div>

                <div className="pt-3 border-t border-border flex items-center justify-end gap-2.5">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsCreateModalOpen(false)}
                  >
                    Cancelar
                  </Button>

                  <Button
                    type="submit"
                    disabled={creatingCharge}
                    className="gap-2"
                  >
                    {creatingCharge ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                    <span>Emitir Cobrança</span>
                  </Button>
                </div>
              </form>
            )}
          </Card>
        </div>
      )}

      {/* MODAL: CONFIRMAR REEMBOLSO */}
      {refundingChargeId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4 animate-in fade-in">
          <Card className="border-border rounded-xl max-w-md w-full p-6 space-y-4 shadow-2xl bg-card text-card-foreground">
            <div className="w-12 h-12 rounded-full bg-destructive/10 border border-destructive/20 text-destructive mx-auto flex items-center justify-center">
              <RotateCcw className="w-6 h-6" />
            </div>

            <div className="text-center space-y-2">
              <h3 className="font-bold text-lg text-foreground">Confirmar Reembolso?</h3>
              <p className="text-xs text-muted-foreground">
                Você está prestes a reembolsar integralmente a cobrança <strong className="font-mono text-foreground bg-muted px-2 py-0.5 rounded border border-border">{refundingChargeId}</strong> via AbacatePay. O valor será estornado ao cliente.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-border">
              <Button
                type="button"
                variant="outline"
                onClick={() => setRefundingChargeId(null)}
                className="w-full"
              >
                Voltar
              </Button>

              <Button
                type="button"
                variant="destructive"
                onClick={handleConfirmRefund}
                disabled={refunding}
                className="w-full gap-2"
              >
                {refunding ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                <span>Confirmar Reembolso</span>
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
