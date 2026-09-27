'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import DropdownHeader from '@/components/shared/DropdownHeader'
import { useAuth } from '@/lib/auth-context'
import { getAuthHeaders } from '@/lib/utils'
import { 
  CreditCard, 
  Check, 
  Sparkles, 
  Calendar, 
  Clock, 
  AlertTriangle, 
  FileText, 
  ExternalLink, 
  ArrowRight,
  RefreshCw,
  ShieldCheck,
  CheckCircle2
} from 'lucide-react'

interface Plan {
  id: string
  name: string
  slug: string
  description?: string
  price: number
  currency: string
  billingInterval: string
  trialDays?: number
  features?: string[] | any
  isActive: boolean
}

interface Subscription {
  id: string
  status: 'TRIALING' | 'ACTIVE' | 'PAST_DUE' | 'SUSPENDED' | 'CANCELED' | 'EXPIRED' | string
  currentPeriodStart?: string
  currentPeriodEnd?: string
  trialStart?: string
  trialEnd?: string
  cancelAtPeriodEnd?: boolean
  plan?: Plan
  invoices?: Invoice[]
}

interface Invoice {
  id: string
  amount: number
  currency: string
  status: 'PENDING' | 'PAID' | 'FAILED' | 'CANCELED' | string
  dueDate: string
  paidAt?: string
  hostedInvoiceUrl?: string
  pdfUrl?: string
}

function AssinaturaContent() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const paymentStatus = searchParams.get('payment')

  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [plans, setPlans] = useState<Plan[]>([])
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successBanner, setSuccessBanner] = useState<string | null>(null)

  useEffect(() => {
    if (!authLoading && user?.role === 'DEVELOPER') {
      router.replace('/developer/billing')
    }
  }, [user, authLoading, router])

  useEffect(() => {
    if (paymentStatus === 'success') {
      setSuccessBanner('Pagamento confirmado com sucesso! Sua assinatura foi atualizada.')
    } else if (paymentStatus === 'canceled') {
      setErrorMessage('O processo de pagamento foi cancelado. Se desejar, tente novamente.')
    }
  }, [paymentStatus])

  const loadData = async () => {
    setLoading(true)
    setErrorMessage(null)
    try {
      const headers = getAuthHeaders()

      const [subRes, plansRes, invRes] = await Promise.all([
        fetch('/api/billing/subscriptions', { credentials: 'include', headers }),
        fetch('/api/billing/plans', { credentials: 'include', headers }),
        fetch('/api/billing/invoices', { credentials: 'include', headers }),
      ])

      if (subRes.ok) {
        const subData = await subRes.json()
        if (Array.isArray(subData) && subData.length > 0) {
          setSubscription(subData[0])
        } else if (subData && !Array.isArray(subData)) {
          setSubscription(subData)
        }
      }

      if (plansRes.ok) {
        const plansData = await plansRes.json()
        setPlans(Array.isArray(plansData) ? plansData.filter((p: Plan) => p.isActive) : [])
      }

      if (invRes.ok) {
        const invData = await invRes.json()
        setInvoices(Array.isArray(invData) ? invData : [])
      }
    } catch (err: any) {
      console.error('Erro ao carregar dados de assinatura:', err)
      setErrorMessage('Não foi possível carregar as informações da sua assinatura.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (user && user.role !== 'DEVELOPER') {
      loadData()
    }
  }, [user])

  const handleCheckout = async (planId: string) => {
    setCheckoutLoading(planId)
    setErrorMessage(null)
    try {
      const origin = window.location.origin
      const res = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        credentials: 'include',
        body: JSON.stringify({
          planId,
          successUrl: `${origin}/dashboard/assinatura?payment=success`,
          cancelUrl: `${origin}/dashboard/assinatura?payment=canceled`,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Erro ao iniciar contratação')
      }

      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl
      } else {
        throw new Error('URL de checkout não retornada pelo provedor.')
      }
    } catch (err: any) {
      console.error('Erro no checkout:', err)
      setErrorMessage(err.message || 'Falha ao conectar com o gateway de pagamento.')
      setCheckoutLoading(null)
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

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'ACTIVE':
        return <span className="px-2.5 py-1 text-xs rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-medium">Ativo</span>
      case 'TRIALING':
        return <span className="px-2.5 py-1 text-xs rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 font-medium">Trial (30 dias)</span>
      case 'PAST_DUE':
        return <span className="px-2.5 py-1 text-xs rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 font-medium">Pagamento Pendente</span>
      case 'SUSPENDED':
      case 'EXPIRED':
        return <span className="px-2.5 py-1 text-xs rounded-full bg-destructive/20 text-destructive border border-destructive/30 font-medium">Suspenso / Expirado</span>
      case 'CANCELED':
        return <span className="px-2.5 py-1 text-xs rounded-full bg-muted text-muted-foreground border border-border font-medium">Cancelado</span>
      default:
        return <span className="px-2.5 py-1 text-xs rounded-full bg-muted text-muted-foreground border border-border font-medium">Sem Assinatura</span>
    }
  }

  if (authLoading || (user?.role === 'DEVELOPER')) {
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
        {/* Header Title */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">Assinatura & Planos</h1>
            <p className="text-muted-foreground text-sm md:text-base mt-1">
              Gerencie o plano da sua barbearia, ciclo de faturamento e histórico financeiro.
            </p>
          </div>
          <button
            onClick={loadData}
            disabled={loading}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs md:text-sm font-medium rounded-xl border border-border bg-card hover:bg-accent hover:text-accent-foreground transition-all shrink-0 self-start sm:self-auto"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Atualizar dados
          </button>
        </div>

        {/* Feedback Banners */}
        {successBanner && (
          <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 flex items-center justify-between text-sm">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              <span>{successBanner}</span>
            </div>
            <button onClick={() => setSuccessBanner(null)} className="text-emerald-400 hover:text-emerald-200">✕</button>
          </div>
        )}

        {errorMessage && (
          <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive-foreground flex items-center justify-between text-sm">
            <div className="flex items-center gap-2.5">
              <AlertTriangle className="w-5 h-5 text-destructive shrink-0" />
              <span>{errorMessage}</span>
            </div>
            <button onClick={() => setErrorMessage(null)} className="text-destructive hover:text-foreground">✕</button>
          </div>
        )}

        {/* Current Plan Overview Card */}
        <div className="bg-card border border-border rounded-2xl p-6 md:p-8 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-border">
            <div className="flex items-start gap-4">
              <div className="p-3.5 rounded-2xl bg-primary/10 text-primary border border-primary/20 shrink-0">
                <CreditCard className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-3 flex-wrap">
                  <h2 className="text-xl font-bold text-foreground">
                    {subscription?.plan?.name || (subscription?.status === 'TRIALING' ? 'Período de Avaliação (Trial)' : 'Sem plano ativo')}
                  </h2>
                  {getStatusBadge(subscription?.status)}
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  {subscription?.plan?.description || 'Acesso a todas as ferramentas essenciais para sua barbearia.'}
                </p>
              </div>
            </div>

            {subscription?.plan && (
              <div className="text-left md:text-right">
                <div className="text-2xl font-black text-foreground">
                  {formatPrice(Number(subscription.plan.price))}
                  <span className="text-xs font-normal text-muted-foreground">/{subscription.plan.billingInterval === 'YEARLY' ? 'ano' : 'mês'}</span>
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-6 text-sm">
            <div className="p-3.5 bg-muted/40 rounded-xl border border-border">
              <span className="text-xs text-muted-foreground block">Início do Ciclo</span>
              <span className="font-semibold text-foreground mt-0.5 block">
                {formatDate(subscription?.trialStart || subscription?.currentPeriodStart)}
              </span>
            </div>
            <div className="p-3.5 bg-muted/40 rounded-xl border border-border">
              <span className="text-xs text-muted-foreground block">
                {subscription?.status === 'TRIALING' ? 'Término do Trial' : 'Próxima Renovação'}
              </span>
              <span className="font-semibold text-foreground mt-0.5 block">
                {formatDate(subscription?.trialEnd || subscription?.currentPeriodEnd)}
              </span>
            </div>
            <div className="p-3.5 bg-muted/40 rounded-xl border border-border">
              <span className="text-xs text-muted-foreground block">Renovação Automática</span>
              <span className="font-semibold text-foreground mt-0.5 block">
                {subscription?.cancelAtPeriodEnd ? 'Cancelamento agendado' : 'Ativada via Gateway Seguro'}
              </span>
            </div>
          </div>
        </div>

        {/* Plans Selection Section */}
        <div>
          <div className="mb-6">
            <h2 className="text-xl font-bold text-foreground">Planos Disponíveis</h2>
            <p className="text-sm text-muted-foreground">Escolha o plano ideal para a escala e ritmo do seu negócio.</p>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[1, 2, 3].map((n) => (
                <div key={n} className="bg-card border border-border rounded-2xl p-6 h-80 animate-pulse" />
              ))}
            </div>
          ) : plans.length === 0 ? (
            <div className="bg-card border border-border rounded-2xl p-8 text-center">
              <p className="text-muted-foreground text-sm">Nenhum plano disponível no momento.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {plans.map((p) => {
                const isCurrent = subscription?.plan?.id === p.id
                const featuresList = Array.isArray(p.features) ? p.features : []

                return (
                  <div
                    key={p.id}
                    className={`bg-card rounded-2xl p-6 border flex flex-col justify-between transition-all relative ${
                      isCurrent
                        ? 'border-primary ring-1 ring-primary shadow-lg shadow-primary/5'
                        : 'border-border hover:border-muted-foreground/30'
                    }`}
                  >
                    {isCurrent && (
                      <span className="absolute -top-3 right-6 bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-full shadow-sm">
                        Plano Atual
                      </span>
                    )}

                    <div>
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-primary" />
                        <h3 className="font-bold text-lg text-foreground">{p.name}</h3>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1.5 min-h-[32px]">{p.description}</p>

                      <div className="mt-5 pb-5 border-b border-border">
                        <span className="text-3xl font-extrabold text-foreground">{formatPrice(Number(p.price))}</span>
                        <span className="text-xs text-muted-foreground">/{p.billingInterval === 'YEARLY' ? 'ano' : 'mês'}</span>
                      </div>

                      <div className="mt-5 space-y-2.5 text-xs text-muted-foreground">
                        {featuresList.length > 0 ? (
                          featuresList.map((feat: string, idx: number) => (
                            <div key={idx} className="flex items-center gap-2">
                              <Check className="w-4 h-4 text-primary shrink-0" />
                              <span className="text-foreground">{feat}</span>
                            </div>
                          ))
                        ) : (
                          <>
                            <div className="flex items-center gap-2">
                              <Check className="w-4 h-4 text-primary shrink-0" />
                              <span className="text-foreground">Agendamentos ilimitados</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Check className="w-4 h-4 text-primary shrink-0" />
                              <span className="text-foreground">Gestão de equipe e comissões</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Check className="w-4 h-4 text-primary shrink-0" />
                              <span className="text-foreground">Página pública exclusiva</span>
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="mt-8 pt-4">
                      {isCurrent ? (
                        <button
                          disabled
                          className="w-full py-2.5 rounded-xl border border-border bg-muted/60 text-muted-foreground font-semibold text-sm cursor-not-allowed"
                        >
                          Plano Ativo
                        </button>
                      ) : (
                        <button
                          onClick={() => handleCheckout(p.id)}
                          disabled={Boolean(checkoutLoading)}
                          className="w-full py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-sm transition-all shadow-sm flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                          {checkoutLoading === p.id ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-foreground" />
                          ) : (
                            <>
                              <span>Contratar via Stripe</span>
                              <ArrowRight className="w-4 h-4" />
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Invoices History Table */}
        <div className="bg-card border border-border rounded-2xl p-6 md:p-8">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-foreground">Histórico de Faturas (Invoices)</h2>
              <p className="text-sm text-muted-foreground">Comprovantes e status de cobrança do SaaS.</p>
            </div>
            <FileText className="w-5 h-5 text-muted-foreground" />
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((n) => (
                <div key={n} className="h-14 bg-muted/30 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : invoices.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-border rounded-xl">
              <FileText className="w-8 h-8 text-muted-foreground mx-auto mb-2 opacity-50" />
              <p className="text-sm font-medium text-foreground">Nenhuma fatura emitida até o momento.</p>
              <p className="text-xs text-muted-foreground mt-0.5">As cobranças futuras e recibos aparecerão aqui automaticamente.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-border text-xs text-muted-foreground">
                    <th className="pb-3 font-medium">Identificador</th>
                    <th className="pb-3 font-medium">Vencimento</th>
                    <th className="pb-3 font-medium">Valor</th>
                    <th className="pb-3 font-medium">Status</th>
                    <th className="pb-3 font-medium">Data de Pagamento</th>
                    <th className="pb-3 font-medium text-right">Comprovante</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {invoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-muted/20 transition-colors">
                      <td className="py-3.5 font-mono text-xs text-foreground font-semibold">
                        {inv.id.slice(0, 8)}...
                      </td>
                      <td className="py-3.5 text-muted-foreground">{formatDate(inv.dueDate)}</td>
                      <td className="py-3.5 font-semibold text-foreground">{formatPrice(Number(inv.amount))}</td>
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
                      <td className="py-3.5 text-muted-foreground">{formatDate(inv.paidAt)}</td>
                      <td className="py-3.5 text-right">
                        {inv.hostedInvoiceUrl ? (
                          <a
                            href={inv.hostedInvoiceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-primary hover:underline font-medium"
                          >
                            <span>Visualizar</span>
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
      </main>
    </div>
  )
}

export default function AssinaturaPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen bg-background">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
        </div>
      }
    >
      <AssinaturaContent />
    </Suspense>
  )
}

