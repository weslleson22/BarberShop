'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import DropdownHeader from '@/components/shared/DropdownHeader'
import { useAuth } from '@/lib/auth-context'
import { getAuthHeaders } from '@/lib/utils'
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
  Clock
} from 'lucide-react'

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

export default function DeveloperBillingPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()

  const [subscriptions, setSubscriptions] = useState<SubscriptionItem[]>([])
  const [invoices, setInvoices] = useState<InvoiceItem[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'subscriptions' | 'invoices'>('subscriptions')
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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-primary text-xs font-semibold uppercase tracking-wider mb-1">
              <CreditCard className="w-4 h-4" />
              <span>SaaS Billing & Revenue</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">Faturamento & Cobranças da Plataforma</h1>
            <p className="text-sm md:text-base text-muted-foreground mt-1">
              Visão macro de receita recorrente (MRR), assinaturas ativas, trials e faturas emitidas.
            </p>
          </div>

          <button
            onClick={loadBillingData}
            disabled={loading}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs md:text-sm font-semibold rounded-xl bg-card border border-border hover:bg-accent text-foreground transition-all shadow-sm self-start sm:self-auto"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Atualizar dados</span>
          </button>
        </div>

        {/* Global Financial Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between text-muted-foreground mb-2">
              <span className="text-xs font-medium">MRR Estimado</span>
              <DollarSign className="w-4 h-4 text-primary" />
            </div>
            <div className="text-2xl font-extrabold text-foreground">{formatPrice(mrr)}</div>
            <span className="text-xs text-emerald-400 font-medium mt-2 block">
              {activeSubs.length} assinaturas ativas pagantes
            </span>
          </div>

          <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between text-muted-foreground mb-2">
              <span className="text-xs font-medium">Receita Total Recebida</span>
              <TrendingUp className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-extrabold text-foreground">{formatPrice(totalRevenue)}</div>
            <span className="text-xs text-muted-foreground mt-2 block">
              {paidInvoices.length} faturas liquidadas
            </span>
          </div>

          <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between text-muted-foreground mb-2">
              <span className="text-xs font-medium">Contas em Trial</span>
              <Clock className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-2xl font-extrabold text-foreground">{trialingSubs.length}</div>
            <span className="text-xs text-amber-300 font-medium mt-2 block">
              Período de 30 dias ativo
            </span>
          </div>

          <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between text-muted-foreground mb-2">
              <span className="text-xs font-medium">Inadimplentes (Past Due)</span>
              <AlertTriangle className="w-4 h-4 text-destructive" />
            </div>
            <div className="text-2xl font-extrabold text-foreground">{pastDueSubs.length}</div>
            <span className="text-xs text-destructive font-medium mt-2 block">
              Requer atenção operacional
            </span>
          </div>
        </div>

        {/* Tab Controls */}
        <div className="flex items-center justify-between border-b border-border pb-4 gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('subscriptions')}
              className={`px-4 py-2 rounded-xl text-xs md:text-sm font-semibold transition-all ${
                activeTab === 'subscriptions'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'bg-muted/40 hover:bg-muted text-muted-foreground'
              }`}
            >
              Assinaturas ({subscriptions.length})
            </button>
            <button
              onClick={() => setActiveTab('invoices')}
              className={`px-4 py-2 rounded-xl text-xs md:text-sm font-semibold transition-all ${
                activeTab === 'invoices'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'bg-muted/40 hover:bg-muted text-muted-foreground'
              }`}
            >
              Faturas / Invoices ({invoices.length})
            </button>
          </div>

          {activeTab === 'subscriptions' && (
            <div className="flex items-center gap-2">
              <label className="text-xs text-muted-foreground">Filtro:</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="text-xs bg-card border border-border rounded-lg px-2.5 py-1.5 text-foreground focus:outline-none"
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

        {/* Subscriptions Table */}
        {activeTab === 'subscriptions' && (
          <div className="bg-card border border-border rounded-2xl p-6 md:p-8 shadow-sm">
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((n) => (
                  <div key={n} className="h-14 bg-muted/30 rounded-xl animate-pulse" />
                ))}
              </div>
            ) : filteredSubscriptions.length === 0 ? (
              <div className="text-center py-12 border border-dashed border-border rounded-xl">
                <Users className="w-8 h-8 text-muted-foreground mx-auto mb-2 opacity-50" />
                <p className="text-sm font-medium text-foreground">Nenhuma assinatura encontrada no filtro atual.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-border text-xs text-muted-foreground">
                      <th className="pb-3 font-medium">Barbearia</th>
                      <th className="pb-3 font-medium">Plano</th>
                      <th className="pb-3 font-medium">Valor / Ciclo</th>
                      <th className="pb-3 font-medium">Status</th>
                      <th className="pb-3 font-medium">Trial / Fim Período</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredSubscriptions.map((sub) => (
                      <tr key={sub.id} className="hover:bg-muted/20 transition-colors">
                        <td className="py-3.5">
                          <div className="font-semibold text-foreground text-xs md:text-sm">
                            {sub.barbershop?.name || 'Barbearia'}
                          </div>
                          <div className="text-[10px] text-muted-foreground font-mono">
                            /b/{sub.barbershop?.slug || sub.barbershop?.id}
                          </div>
                        </td>
                        <td className="py-3.5 text-xs text-foreground font-medium">
                          {sub.plan?.name || 'Plano Padrão'}
                        </td>
                        <td className="py-3.5 text-xs text-foreground font-semibold">
                          {formatPrice(Number(sub.plan?.price || 0))}
                          <span className="text-[10px] text-muted-foreground font-normal">
                            /{sub.plan?.billingInterval === 'YEARLY' ? 'ano' : 'mês'}
                          </span>
                        </td>
                        <td className="py-3.5">
                          {sub.status === 'ACTIVE' ? (
                            <span className="px-2 py-0.5 text-xs rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                              Ativo
                            </span>
                          ) : sub.status === 'TRIALING' ? (
                            <span className="px-2 py-0.5 text-xs rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
                              Trial
                            </span>
                          ) : sub.status === 'PAST_DUE' ? (
                            <span className="px-2 py-0.5 text-xs rounded-full bg-destructive/20 text-destructive border border-destructive/30">
                              Past Due
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 text-xs rounded-full bg-muted text-muted-foreground border border-border">
                              {sub.status}
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 text-xs text-muted-foreground">
                          {formatDate(sub.trialEnd || sub.currentPeriodEnd)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Invoices Table */}
        {activeTab === 'invoices' && (
          <div className="bg-card border border-border rounded-2xl p-6 md:p-8 shadow-sm">
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((n) => (
                  <div key={n} className="h-14 bg-muted/30 rounded-xl animate-pulse" />
                ))}
              </div>
            ) : invoices.length === 0 ? (
              <div className="text-center py-12 border border-dashed border-border rounded-xl">
                <FileText className="w-8 h-8 text-muted-foreground mx-auto mb-2 opacity-50" />
                <p className="text-sm font-medium text-foreground">Nenhuma fatura registrada na plataforma.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-border text-xs text-muted-foreground">
                      <th className="pb-3 font-medium">Barbearia</th>
                      <th className="pb-3 font-medium">Identificador</th>
                      <th className="pb-3 font-medium">Valor</th>
                      <th className="pb-3 font-medium">Status</th>
                      <th className="pb-3 font-medium">Vencimento</th>
                      <th className="pb-3 font-medium">Pagamento</th>
                      <th className="pb-3 font-medium text-right">Comprovante</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {invoices.map((inv) => (
                      <tr key={inv.id} className="hover:bg-muted/20 transition-colors">
                        <td className="py-3.5 text-xs font-semibold text-foreground">
                          {inv.barbershop?.name || 'Barbearia'}
                        </td>
                        <td className="py-3.5 font-mono text-[11px] text-muted-foreground">
                          {inv.id.slice(0, 8)}...
                        </td>
                        <td className="py-3.5 font-semibold text-foreground text-xs">
                          {formatPrice(Number(inv.amount))}
                        </td>
                        <td className="py-3.5">
                          {inv.status === 'PAID' ? (
                            <span className="px-2 py-0.5 text-xs rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                              Pago
                            </span>
                          ) : inv.status === 'PENDING' ? (
                            <span className="px-2 py-0.5 text-xs rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
                              Pendente
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 text-xs rounded-full bg-destructive/20 text-destructive border border-destructive/30">
                              {inv.status}
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 text-xs text-muted-foreground">{formatDate(inv.dueDate)}</td>
                        <td className="py-3.5 text-xs text-muted-foreground">{formatDate(inv.paidAt)}</td>
                        <td className="py-3.5 text-right">
                          {inv.hostedInvoiceUrl ? (
                            <a
                              href={inv.hostedInvoiceUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-xs text-primary hover:underline font-medium"
                            >
                              <span>Recibo</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          ) : (
                            <span className="text-xs text-muted-foreground">-</span>
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
      </main>
    </div>
  )
}
