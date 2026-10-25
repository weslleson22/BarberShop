'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import DropdownHeader from '@/components/shared/DropdownHeader'
import { useAuth } from '@/lib/auth-context'
import { getAuthHeaders } from '@/lib/utils'
import AbacateBillingsManager from '@/components/billing/AbacateBillingsManager'
import AbacateProductsManager from '@/components/billing/AbacateProductsManager'
import AbacateCustomersManager from '@/components/billing/AbacateCustomersManager'
import CheckoutCustomizer from '@/components/billing/CheckoutCustomizer'
import {
  CreditCard,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  FileText,
  Building,
  RefreshCw,
  ExternalLink,
  Users,
  CheckCircle2,
  Clock,
  Sliders,
  Receipt,
  QrCode,
  Package,
  Trash2,
  AlertCircle
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'

interface SubscriptionItem {
  id: string
  status: string
  currentPeriodStart?: string
  currentPeriodEnd?: string
  trialStart?: string
  trialEnd?: string
  barbershop?: {
    id: string
    name: string
    slug: string
  }
  plan?: {
    id: string
    name: string
    price: number
    billingInterval: string
  }
}

interface InvoiceItem {
  id: string
  amount: number
  currency: string
  status: string
  dueDate: string
  paidAt?: string
  hostedInvoiceUrl?: string
  barbershop?: {
    id: string
    name: string
    slug: string
  }
  subscription?: {
    plan?: {
      name: string
    }
  }
}

function DeveloperBillingContent() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const initialTab = (searchParams.get('tab') as any) || 'cobrancas'

  const [subscriptions, setSubscriptions] = useState<SubscriptionItem[]>([])
  const [invoices, setInvoices] = useState<InvoiceItem[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'cobrancas' | 'produtos' | 'clientes' | 'checkout' | 'subscriptions' | 'invoices'>(initialTab)
  const [statusFilter, setStatusFilter] = useState<string>('ALL')

  useEffect(() => {
    if (!authLoading && user?.role !== 'DEVELOPER') {
      router.replace('/dashboard')
    }
  }, [user, authLoading, router])

  const loadBillingData = async () => {
    setLoading(true)
    try {
      const headers = getAuthHeaders()
      const [subsRes, invRes] = await Promise.all([
        fetch('/api/billing/subscriptions', { headers, credentials: 'include' }),
        fetch('/api/billing/invoices', { headers, credentials: 'include' }),
      ])

      if (subsRes.ok) {
        const subs = await subsRes.json()
        setSubscriptions(Array.isArray(subs) ? subs : [])
      }

      if (invRes.ok) {
        const invs = await invRes.json()
        setInvoices(Array.isArray(invs) ? invs : [])
      }
    } catch (err) {
      console.error('Erro ao carregar dados de faturamento global:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (user?.role === 'DEVELOPER') {
      loadBillingData()
    }
  }, [user])

  const handleDeleteInvoice = async (invoiceId: string) => {
    if (!confirm('Deseja realmente excluir esta fatura? Esta ação é irreversível.')) return
    try {
      const headers = getAuthHeaders()
      const res = await fetch(`/api/billing/invoices?id=${invoiceId}&force=true`, {
        method: 'DELETE',
        headers,
        credentials: 'include',
      })
      const data = await res.json()
      if (res.ok) {
        await loadBillingData()
      } else {
        alert(data.error || 'Erro ao excluir fatura')
      }
    } catch {
      alert('Falha na comunicação ao tentar excluir fatura')
    }
  }

  const formatPrice = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)
  }

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-'
    const d = new Date(dateStr)
    return isNaN(d.getTime()) ? '-' : d.toLocaleDateString('pt-BR')
  }

  // Calculated Metrics
  const activeSubs = subscriptions.filter((s) => s.status === 'ACTIVE')
  const trialingSubs = subscriptions.filter((s) => s.status === 'TRIALING')
  const pastDueSubs = subscriptions.filter((s) => s.status === 'PAST_DUE')
  const mrr = activeSubs.reduce((acc, curr) => acc + (Number(curr.plan?.price) || 0), 0)
  const paidInvoices = invoices.filter((i) => i.status === 'PAID')
  const totalRevenue = paidInvoices.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0)

  const filteredSubscriptions = subscriptions.filter((s) => {
    if (statusFilter === 'ALL') return true
    return s.status === statusFilter
  })

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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-6">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <Badge variant="outline" className="text-primary bg-primary/10 border-primary/20 text-xs font-semibold gap-1.5">
                <CreditCard className="w-3.5 h-3.5" />
                <span>SaaS Billing & Revenue</span>
              </Badge>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">Faturamento & Cobranças da Plataforma</h1>
            <p className="text-sm md:text-base text-muted-foreground mt-1">
              Visão macro de receita recorrente (MRR), assinaturas ativas, trials e faturas emitidas.
            </p>
          </div>

          <Button
            onClick={loadBillingData}
            disabled={loading}
            className="gap-2 shadow-sm self-start sm:self-auto"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Atualizar dados</span>
          </Button>
        </div>

        {/* Global Financial Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-border shadow-sm">
            <CardContent className="p-5">
              <div className="flex items-center justify-between text-muted-foreground text-xs font-medium uppercase tracking-wider mb-2">
                <span>MRR Estimado</span>
                <span className="p-1.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <DollarSign className="w-4 h-4" />
                </span>
              </div>
              <div className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">{formatPrice(mrr)}</div>
              <span className="text-xs text-muted-foreground font-medium mt-1.5 block">
                {activeSubs.length} assinaturas ativas pagantes
              </span>
            </CardContent>
          </Card>

          <Card className="border-border shadow-sm">
            <CardContent className="p-5">
              <div className="flex items-center justify-between text-muted-foreground text-xs font-medium uppercase tracking-wider mb-2">
                <span>Receita Total Recebida</span>
                <span className="p-1.5 rounded-md bg-primary/10 text-primary">
                  <TrendingUp className="w-4 h-4" />
                </span>
              </div>
              <div className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">{formatPrice(totalRevenue)}</div>
              <span className="text-xs text-muted-foreground font-medium mt-1.5 block">
                {paidInvoices.length} faturas liquidadas
              </span>
            </CardContent>
          </Card>

          <Card className="border-border shadow-sm">
            <CardContent className="p-5">
              <div className="flex items-center justify-between text-muted-foreground text-xs font-medium uppercase tracking-wider mb-2">
                <span>Contas em Trial</span>
                <span className="p-1.5 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400">
                  <Clock className="w-4 h-4" />
                </span>
              </div>
              <div className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">{trialingSubs.length}</div>
              <span className="text-xs text-muted-foreground font-medium mt-1.5 block">
                Período de 30 dias ativo
              </span>
            </CardContent>
          </Card>

          <Card className="border-border shadow-sm">
            <CardContent className="p-5">
              <div className="flex items-center justify-between text-muted-foreground text-xs font-medium uppercase tracking-wider mb-2">
                <span>Inadimplentes (Past Due)</span>
                <span className="p-1.5 rounded-md bg-destructive/10 text-destructive">
                  <AlertTriangle className="w-4 h-4" />
                </span>
              </div>
              <div className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">{pastDueSubs.length}</div>
              <span className="text-xs text-muted-foreground font-medium mt-1.5 block">
                Requer atenção operacional
              </span>
            </CardContent>
          </Card>
        </div>

        {/* Tab Controls */}
        <div className="flex items-center justify-between border-b border-border pb-4 gap-4 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant={activeTab === 'cobrancas' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveTab('cobrancas')}
              className="gap-1.5 h-9"
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span>Cobranças Gateway</span>
            </Button>

            <Button
              variant={activeTab === 'produtos' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveTab('produtos')}
              className="gap-1.5 h-9"
            >
              <Package className="w-3.5 h-3.5" />
              <span>Produtos & Planos</span>
            </Button>

            <Button
              variant={activeTab === 'clientes' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveTab('clientes')}
              className="gap-1.5 h-9"
            >
              <Users className="w-3.5 h-3.5" />
              <span>Clientes Gateway</span>
            </Button>

            <Button
              variant={activeTab === 'subscriptions' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveTab('subscriptions')}
              className="gap-1.5 h-9"
            >
              <Receipt className="w-3.5 h-3.5" />
              <span>Assinaturas SaaS ({subscriptions.length})</span>
            </Button>

            <Button
              variant={activeTab === 'invoices' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveTab('invoices')}
              className="gap-1.5 h-9"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Faturas & Invoices ({invoices.length})</span>
            </Button>

            <Button
              variant={activeTab === 'checkout' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveTab('checkout')}
              className="gap-1.5 h-9"
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Personalizar Checkout</span>
            </Button>
          </div>

          {activeTab === 'subscriptions' && (
            <div className="flex items-center gap-2">
              <label className="text-xs text-muted-foreground font-medium">Filtro:</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="text-xs bg-background border border-border rounded-lg px-3 py-2 text-foreground font-medium focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="ALL">Todos os status</option>
                <option value="ACTIVE">Ativos</option>
                <option value="TRIALING">Em Trial</option>
                <option value="PAST_DUE">Inadimplente</option>
                <option value="CANCELED">Cancelados</option>
              </select>
            </div>
          )}
        </div>

        {/* Tab 1: Cobranças AbacatePay */}
        {activeTab === 'cobrancas' && <AbacateBillingsManager />}

        {/* Tab 2: Produtos AbacatePay & Planos Developer */}
        {activeTab === 'produtos' && <AbacateProductsManager />}

        {/* Tab 3: Clientes AbacatePay (Admins de Barbearias) */}
        {activeTab === 'clientes' && <AbacateCustomersManager />}

        {/* Tab 4: Personalizar Checkout */}
        {activeTab === 'checkout' && <CheckoutCustomizer />}

        {/* Subscriptions Table */}
        {activeTab === 'subscriptions' && (
          <Card className="shadow-sm">
            <CardContent className="p-6">
              {loading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((n) => (
                    <div key={n} className="h-14 bg-muted/40 rounded-xl border border-border animate-pulse" />
                  ))}
                </div>
              ) : filteredSubscriptions.length === 0 ? (
                <div className="text-center py-12 border border-dashed border-border rounded-xl">
                  <Users className="w-8 h-8 text-muted-foreground mx-auto mb-2 opacity-50" />
                  <p className="text-sm font-medium text-muted-foreground">Nenhuma assinatura encontrada no filtro atual.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/30">
                        <TableHead className="font-semibold text-xs uppercase">Barbearia</TableHead>
                        <TableHead className="font-semibold text-xs uppercase">Plano</TableHead>
                        <TableHead className="font-semibold text-xs uppercase">Valor / Ciclo</TableHead>
                        <TableHead className="font-semibold text-xs uppercase">Status</TableHead>
                        <TableHead className="font-semibold text-xs uppercase">Trial / Fim Período</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredSubscriptions.map((sub) => (
                        <TableRow key={sub.id}>
                          <TableCell>
                            <div className="font-semibold text-foreground text-sm">
                              {sub.barbershop?.name || 'Barbearia'}
                            </div>
                            <div className="text-xs text-muted-foreground font-mono mt-0.5">
                              /b/{sub.barbershop?.slug || sub.barbershop?.id}
                            </div>
                          </TableCell>
                          <TableCell className="text-xs text-foreground font-medium">
                            {sub.plan?.name || 'Plano Padrão'}
                          </TableCell>
                          <TableCell className="text-xs text-foreground font-medium">
                            {formatPrice(Number(sub.plan?.price || 0))}
                            <span className="text-[11px] text-muted-foreground font-normal ml-1">
                              /{sub.plan?.billingInterval === 'YEARLY' ? 'ano' : 'mês'}
                            </span>
                          </TableCell>
                          <TableCell>
                            {sub.status === 'ACTIVE' ? (
                              <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-xs font-semibold">
                                Ativo
                              </Badge>
                            ) : sub.status === 'TRIALING' ? (
                              <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 text-xs font-semibold">
                                Trial
                              </Badge>
                            ) : sub.status === 'PAST_DUE' ? (
                              <Badge variant="destructive" className="text-xs font-semibold">
                                Inadimplente
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-xs font-semibold">
                                {sub.status}
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground font-normal">
                            {formatDate(sub.trialEnd || sub.currentPeriodEnd)}
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

        {/* Invoices Table */}
        {activeTab === 'invoices' && (
          <div className="space-y-4">
            {/* Aviso e atalho para gestão de produtos */}
            <Card className="p-4 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2.5 text-foreground font-medium">
                <span className="p-1 rounded bg-primary/10 text-primary"><Package className="w-4 h-4 shrink-0" /></span>
                <span>
                  Procurando os produtos e planos da <strong>AbacatePay</strong> para criar ou <strong>excluir</strong>?
                </span>
              </div>
              <Button
                type="button"
                size="sm"
                onClick={() => setActiveTab('produtos')}
                className="gap-1.5 shrink-0 h-9"
              >
                <Package className="w-3.5 h-3.5" />
                <span>Gerenciar Produtos na AbacatePay</span>
              </Button>
            </Card>

            <Card className="shadow-sm">
              <CardContent className="p-6">
                {loading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((n) => (
                      <div key={n} className="h-14 bg-muted/40 rounded-xl border border-border animate-pulse" />
                    ))}
                  </div>
                ) : invoices.length === 0 ? (
                  <div className="text-center py-12 border border-dashed border-border rounded-xl">
                    <FileText className="w-8 h-8 text-muted-foreground mx-auto mb-2 opacity-50" />
                    <p className="text-sm font-medium text-muted-foreground">Nenhuma fatura registrada na plataforma.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/30">
                          <TableHead className="font-semibold text-xs uppercase">Barbearia</TableHead>
                          <TableHead className="font-semibold text-xs uppercase"># Sequência</TableHead>
                          <TableHead className="font-semibold text-xs uppercase">Valor</TableHead>
                          <TableHead className="font-semibold text-xs uppercase">Status</TableHead>
                          <TableHead className="font-semibold text-xs uppercase">Vencimento</TableHead>
                          <TableHead className="font-semibold text-xs uppercase">Pagamento</TableHead>
                          <TableHead className="font-semibold text-xs uppercase text-right">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {invoices.map((inv, idx) => (
                          <TableRow key={inv.id}>
                            <TableCell className="text-xs font-semibold text-foreground">
                              {inv.barbershop?.name || 'Barbearia'}
                            </TableCell>
                            <TableCell className="font-mono text-xs text-muted-foreground">
                              #{String(idx + 1).padStart(3, '0')}
                            </TableCell>
                            <TableCell className="font-semibold text-foreground text-xs">
                              {formatPrice(Number(inv.amount))}
                            </TableCell>
                            <TableCell>
                              {inv.status === 'PAID' ? (
                                <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-xs font-semibold">
                                  Pago
                                </Badge>
                              ) : inv.status === 'PENDING' ? (
                                <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 text-xs font-semibold">
                                  Pendente
                                </Badge>
                              ) : (
                                <Badge variant="destructive" className="text-xs font-semibold">
                                  {inv.status}
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground font-normal">
                              {formatDate(inv.dueDate)}
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground font-normal">
                              {formatDate(inv.paidAt)}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-2">
                                {inv.hostedInvoiceUrl ? (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    asChild
                                    className="h-8 gap-1 text-xs"
                                  >
                                    <a
                                      href={inv.hostedInvoiceUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                    >
                                      <span>Recibo</span>
                                      <ExternalLink className="w-3 h-3 stroke-[2.5]" />
                                    </a>
                                  </Button>
                                ) : null}
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleDeleteInvoice(inv.id)}
                                  className="h-8 w-8 text-destructive hover:bg-destructive/10"
                                  title="Excluir fatura"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
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
          </div>
        )}
      </main>
    </div>
  )
}

export default function DeveloperBillingPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen bg-background">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
        </div>
      }
    >
      <DeveloperBillingContent />
    </Suspense>
  )
}

