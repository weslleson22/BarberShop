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
    <div className="min-h-screen bg-gray-950 text-white pb-20 pt-20">
      <DropdownHeader />

      <main className="w-full px-4 md:px-8 max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#374151] pb-6">
          <div>
            <div className="flex items-center gap-2 text-white text-xs font-bold uppercase tracking-wider mb-1.5">
              <span className="p-1 rounded bg-[#2563eb] text-white"><CreditCard className="w-3.5 h-3.5" /></span>
              <span>SaaS Billing & Revenue</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-white">Faturamento & Cobranças da Plataforma</h1>
            <p className="text-sm md:text-base text-white font-medium mt-1">
              Visão macro de receita recorrente (MRR), assinaturas ativas, trials e faturas emitidas.
            </p>
          </div>

          <button
            onClick={loadBillingData}
            disabled={loading}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-xs md:text-sm font-bold rounded-xl bg-[#2563eb] hover:bg-[#1d4ed8] text-white border border-[#3b82f6] transition cursor-pointer self-start sm:self-auto"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Atualizar dados</span>
          </button>
        </div>

        {/* Global Financial Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-[#111827] border border-[#374151] rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between text-white text-xs font-bold uppercase tracking-wider mb-2">
              <span>MRR Estimado</span>
              <span className="p-1 rounded bg-[#059669] text-white"><DollarSign className="w-4 h-4 stroke-[2.5]" /></span>
            </div>
            <div className="text-3xl font-extrabold text-white">{formatPrice(mrr)}</div>
            <span className="text-xs text-white font-bold mt-2 block">
              {activeSubs.length} assinaturas ativas pagantes
            </span>
          </div>

          <div className="bg-[#111827] border border-[#374151] rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between text-white text-xs font-bold uppercase tracking-wider mb-2">
              <span>Receita Total Recebida</span>
              <span className="p-1 rounded bg-[#2563eb] text-white"><TrendingUp className="w-4 h-4 stroke-[2.5]" /></span>
            </div>
            <div className="text-3xl font-extrabold text-white">{formatPrice(totalRevenue)}</div>
            <span className="text-xs text-white font-bold mt-2 block">
              {paidInvoices.length} faturas liquidadas
            </span>
          </div>

          <div className="bg-[#111827] border border-[#374151] rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between text-white text-xs font-bold uppercase tracking-wider mb-2">
              <span>Contas em Trial</span>
              <span className="p-1 rounded bg-[#d97706] text-white"><Clock className="w-4 h-4 stroke-[2.5]" /></span>
            </div>
            <div className="text-3xl font-extrabold text-white">{trialingSubs.length}</div>
            <span className="text-xs text-white font-bold mt-2 block">
              Período de 30 dias ativo
            </span>
          </div>

          <div className="bg-[#111827] border border-[#374151] rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between text-white text-xs font-bold uppercase tracking-wider mb-2">
              <span>Inadimplentes (Past Due)</span>
              <span className="p-1 rounded bg-[#dc2626] text-white"><AlertTriangle className="w-4 h-4 stroke-[2.5]" /></span>
            </div>
            <div className="text-3xl font-extrabold text-white">{pastDueSubs.length}</div>
            <span className="text-xs text-white font-bold mt-2 block">
              Requer atenção operacional
            </span>
          </div>
        </div>

        {/* Tab Controls */}
        <div className="flex items-center justify-between border-b border-[#374151] pb-4 gap-4 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setActiveTab('cobrancas')}
              className={`px-4 py-2.5 rounded-xl text-xs md:text-sm font-bold transition flex items-center gap-1.5 cursor-pointer border ${
                activeTab === 'cobrancas'
                  ? 'bg-[#2563eb] text-white border-[#3b82f6]'
                  : 'bg-[#111827] text-white border-[#374151] hover:bg-[#1f2937]'
              }`}
            >
              <CreditCard className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Cobranças Gateway</span>
            </button>

            <button
              onClick={() => setActiveTab('produtos')}
              className={`px-4 py-2.5 rounded-xl text-xs md:text-sm font-bold transition flex items-center gap-1.5 cursor-pointer border ${
                activeTab === 'produtos'
                  ? 'bg-[#2563eb] text-white border-[#3b82f6]'
                  : 'bg-[#111827] text-white border-[#374151] hover:bg-[#1f2937]'
              }`}
            >
              <Package className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Produtos & Planos</span>
            </button>

            <button
              onClick={() => setActiveTab('clientes')}
              className={`px-4 py-2.5 rounded-xl text-xs md:text-sm font-bold transition flex items-center gap-1.5 cursor-pointer border ${
                activeTab === 'clientes'
                  ? 'bg-[#2563eb] text-white border-[#3b82f6]'
                  : 'bg-[#111827] text-white border-[#374151] hover:bg-[#1f2937]'
              }`}
            >
              <Users className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Clientes Gateway</span>
            </button>

            <button
              onClick={() => setActiveTab('subscriptions')}
              className={`px-4 py-2.5 rounded-xl text-xs md:text-sm font-bold transition flex items-center gap-1.5 cursor-pointer border ${
                activeTab === 'subscriptions'
                  ? 'bg-[#2563eb] text-white border-[#3b82f6]'
                  : 'bg-[#111827] text-white border-[#374151] hover:bg-[#1f2937]'
              }`}
            >
              <Receipt className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Assinaturas SaaS ({subscriptions.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('invoices')}
              className={`px-4 py-2.5 rounded-xl text-xs md:text-sm font-bold transition flex items-center gap-1.5 cursor-pointer border ${
                activeTab === 'invoices'
                  ? 'bg-[#2563eb] text-white border-[#3b82f6]'
                  : 'bg-[#111827] text-white border-[#374151] hover:bg-[#1f2937]'
              }`}
            >
              <FileText className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Faturas & Invoices ({invoices.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('checkout')}
              className={`px-4 py-2.5 rounded-xl text-xs md:text-sm font-bold transition flex items-center gap-1.5 cursor-pointer border ${
                activeTab === 'checkout'
                  ? 'bg-[#059669] text-white border-[#10b981]'
                  : 'bg-[#111827] text-white border-[#374151] hover:bg-[#1f2937]'
              }`}
            >
              <Sliders className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Personalizar Checkout</span>
            </button>
          </div>

          {activeTab === 'subscriptions' && (
            <div className="flex items-center gap-2">
              <label className="text-xs text-white font-bold">Filtro:</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="text-xs bg-[#111827] border border-[#374151] rounded-lg px-3 py-2 text-white font-bold focus:outline-none focus:border-[#2563eb]"
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
          <div className="bg-[#111827] border border-[#374151] rounded-2xl p-6 md:p-8 shadow-sm">
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((n) => (
                  <div key={n} className="h-14 bg-[#030712] rounded-xl border border-[#374151]" />
                ))}
              </div>
            ) : filteredSubscriptions.length === 0 ? (
              <div className="text-center py-12 border border-dashed border-[#374151] rounded-xl">
                <Users className="w-8 h-8 text-white mx-auto mb-2 opacity-50" />
                <p className="text-sm font-bold text-white">Nenhuma assinatura encontrada no filtro atual.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-[#374151] bg-[#030712] text-xs text-white uppercase tracking-wider font-bold">
                      <th className="py-3 px-4 font-bold">Barbearia</th>
                      <th className="py-3 px-4 font-bold">Plano</th>
                      <th className="py-3 px-4 font-bold">Valor / Ciclo</th>
                      <th className="py-3 px-4 font-bold">Status</th>
                      <th className="py-3 px-4 font-bold">Trial / Fim Período</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#374151] bg-[#111827] text-white">
                    {filteredSubscriptions.map((sub) => (
                      <tr key={sub.id} className="hover:bg-[#1f2937] transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-white text-xs md:text-sm">
                            {sub.barbershop?.name || 'Barbearia'}
                          </div>
                          <div className="text-xs text-white font-mono mt-0.5">
                            /b/{sub.barbershop?.slug || sub.barbershop?.id}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-xs text-white font-bold">
                          {sub.plan?.name || 'Plano Padrão'}
                        </td>
                        <td className="py-3.5 px-4 text-xs text-white font-bold">
                          {formatPrice(Number(sub.plan?.price || 0))}
                          <span className="text-[11px] text-white font-medium ml-1">
                            /{sub.plan?.billingInterval === 'YEARLY' ? 'ano' : 'mês'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          {sub.status === 'ACTIVE' ? (
                            <span className="px-3 py-1 text-xs font-bold rounded-full bg-[#059669] text-white border border-[#10b981]">
                              Ativo
                            </span>
                          ) : sub.status === 'TRIALING' ? (
                            <span className="px-3 py-1 text-xs font-bold rounded-full bg-[#d97706] text-white border border-[#f59e0b]">
                              Trial
                            </span>
                          ) : sub.status === 'PAST_DUE' ? (
                            <span className="px-3 py-1 text-xs font-bold rounded-full bg-[#dc2626] text-white border border-[#ef4444]">
                              Past Due
                            </span>
                          ) : (
                            <span className="px-3 py-1 text-xs font-bold rounded-full bg-[#1f2937] text-white border border-[#374151]">
                              {sub.status}
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-xs text-white font-bold">
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
          <div className="space-y-4">
            {/* Aviso e atalho para gestão de produtos */}
            <div className="bg-[#111827] border border-[#374151] rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2.5 text-white font-semibold">
                <span className="p-1 rounded bg-[#059669] text-white"><Package className="w-4 h-4 shrink-0" /></span>
                <span>
                  Procurando os produtos e planos da <strong>AbacatePay</strong> para criar ou <strong>excluir</strong>?
                </span>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('produtos')}
                className="px-4 py-2 rounded-xl bg-[#059669] hover:bg-[#047857] text-white font-bold transition cursor-pointer flex items-center gap-1.5 shrink-0 border border-[#10b981]"
              >
                <Package className="w-3.5 h-3.5" />
                <span>Gerenciar Produtos na AbacatePay</span>
              </button>
            </div>

            <div className="bg-[#111827] border border-[#374151] rounded-2xl p-6 md:p-8 shadow-sm">
              {loading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((n) => (
                    <div key={n} className="h-14 bg-[#030712] rounded-xl border border-[#374151]" />
                  ))}
                </div>
              ) : invoices.length === 0 ? (
                <div className="text-center py-12 border border-dashed border-[#374151] rounded-xl">
                  <FileText className="w-8 h-8 text-white mx-auto mb-2 opacity-50" />
                  <p className="text-sm font-bold text-white">Nenhuma fatura registrada na plataforma.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-[#374151] bg-[#030712] text-xs text-white uppercase tracking-wider font-bold">
                        <th className="py-3 px-4 font-bold">Barbearia</th>
                        <th className="py-3 px-4 font-bold"># Sequência</th>
                        <th className="py-3 px-4 font-bold">Valor</th>
                        <th className="py-3 px-4 font-bold">Status</th>
                        <th className="py-3 px-4 font-bold">Vencimento</th>
                        <th className="py-3 px-4 font-bold">Pagamento</th>
                        <th className="py-3 px-4 font-bold text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#374151] bg-[#111827] text-white">
                    {invoices.map((inv, idx) => (
                      <tr key={inv.id} className="hover:bg-[#1f2937] transition-colors">
                        <td className="py-3.5 px-4 text-xs font-bold text-white">
                          {inv.barbershop?.name || 'Barbearia'}
                        </td>
                        <td className="py-3.5 px-4 font-mono text-xs text-white font-bold">
                          #{String(idx + 1).padStart(3, '0')}
                        </td>
                        <td className="py-3.5 px-4 font-bold text-white text-xs">
                          {formatPrice(Number(inv.amount))}
                        </td>
                        <td className="py-3.5 px-4">
                          {inv.status === 'PAID' ? (
                            <span className="px-3 py-1 text-xs font-bold rounded-full bg-[#059669] text-white border border-[#10b981]">
                              Pago
                            </span>
                          ) : inv.status === 'PENDING' ? (
                            <span className="px-3 py-1 text-xs font-bold rounded-full bg-[#d97706] text-white border border-[#f59e0b]">
                              Pendente
                            </span>
                          ) : (
                            <span className="px-3 py-1 text-xs font-bold rounded-full bg-[#dc2626] text-white border border-[#ef4444]">
                              {inv.status}
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-xs text-white font-medium">{formatDate(inv.dueDate)}</td>
                        <td className="py-3.5 px-4 text-xs text-white font-medium">{formatDate(inv.paidAt)}</td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {inv.hostedInvoiceUrl ? (
                              <a
                                href={inv.hostedInvoiceUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-xs text-white font-bold bg-[#2563eb] hover:bg-[#1d4ed8] px-3 py-1.5 rounded-lg border border-[#3b82f6]"
                              >
                                <span>Recibo</span>
                                <ExternalLink className="w-3 h-3 stroke-[2.5]" />
                              </a>
                            ) : null}
                            <button
                              type="button"
                              onClick={() => handleDeleteInvoice(inv.id)}
                              className="p-1.5 rounded-lg text-white bg-[#dc2626] hover:bg-[#b91c1c] border border-[#ef4444] transition cursor-pointer"
                              title="Excluir fatura"
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

