'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import DropdownHeader from '@/components/shared/DropdownHeader'
import { useAuth } from '@/lib/auth-context'
import { getAuthHeaders } from '@/lib/utils'
import { 
  CreditCard, 
  Check, 
  Calendar,
  Clock,
  AlertTriangle, 
  FileText, 
  ExternalLink, 
  RefreshCw,
  ShieldCheck,
  CheckCircle2,
  QrCode,
  Zap,
  Lock,
  Info,
  Printer,
  Download,
  X
} from 'lucide-react'

interface Plan {
  id: string
  name: string
  slug: string
  description?: string
  price: number
  currency: string
  billingInterval: string
  durationDays?: number
  trialDays?: number
  cycleType?: string
  planType?: string
  provider?: string
  providerProductId?: string
  isSyncedWithAbacate?: boolean
  features?: string[] | any
  isActive: boolean
  status?: string
  deletedAt?: string | null
}

interface Subscription {
  id: string
  status: 'TRIALING' | 'ACTIVE' | 'PAST_DUE' | 'SUSPENDED' | 'CANCELED' | 'EXPIRED' | string
  currentPeriodStart?: string
  currentPeriodEnd?: string
  trialStart?: string
  trialEnd?: string
  cancelAtPeriodEnd?: boolean
  price?: number
  durationDays?: number
  planName?: string
  cycleType?: string
  planType?: string
  provider?: string
  plan?: Plan
  planId?: string
  invoices?: Invoice[]
}

interface Invoice {
  id: string
  amount: number
  currency: string
  status: 'PENDING' | 'PAID' | 'FAILED' | 'CANCELED' | 'VOID' | string
  dueDate: string
  paidAt?: string
  provider?: string
  hostedInvoiceUrl?: string
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
  const [receiptModalInvoice, setReceiptModalInvoice] = useState<Invoice | null>(null)
  const hasLoadedRef = useRef(false)

  useEffect(() => {
    if (!authLoading && user?.role === 'DEVELOPER') {
      router.replace('/developer/billing')
    }
  }, [user?.role, authLoading, router])

  const [syncingPayment, setSyncingPayment] = useState(false)

  const handleSyncPayment = async (targetPlanId?: string | null) => {
    setSyncingPayment(true)
    setErrorMessage(null)
    try {
      const headers = getAuthHeaders()
      const res = await fetch('/api/billing/checkout/confirm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
        credentials: 'include',
        body: JSON.stringify({ planId: targetPlanId || undefined }),
      })
      const data = await res.json()
      if (res.ok && data.success) {
        setSuccessBanner(
          `Pagamento confirmado com sucesso na AbacatePay! O plano "${data.plan?.name}" foi ativado. O comprovante já está disponível na coluna Comprovante.`
        )
        if (data.subscription) {
          setSubscription(data.subscription)
        }
      } else if (data.error && targetPlanId) {
        setErrorMessage(data.error)
      }
      await loadData(true)
    } catch (err: any) {
      console.warn('Erro ao sincronizar pagamento AbacatePay:', err)
      await loadData(true)
    } finally {
      setSyncingPayment(false)
    }
  }

  useEffect(() => {
    if (paymentStatus === 'success') {
      const planId = searchParams.get('plan_id')
      handleSyncPayment(planId)
    } else if (paymentStatus === 'canceled') {
      setErrorMessage('O processo de pagamento foi cancelado. Você pode tentar novamente a qualquer momento.')
    }
  }, [paymentStatus, searchParams])

  const loadData = async (silent = false) => {
    if (!silent) {
      setLoading(true)
    }
    setErrorMessage(null)
    try {
      const headers = getAuthHeaders()

      const [subRes, plansRes, invRes] = await Promise.all([
        fetch('/api/billing/subscriptions', { credentials: 'include', headers }),
        fetch('/api/billing/plans', { credentials: 'include', headers }),
        fetch('/api/billing/invoices', { credentials: 'include', headers }),
      ])

      let loadedSubscription: Subscription | null = null

      if (subRes.ok) {
        const subData = await subRes.json()
        if (Array.isArray(subData) && subData.length > 0) {
          const activeSub = subData.find((s: any) => s.status === 'ACTIVE') || subData[0]
          loadedSubscription = activeSub
          setSubscription(activeSub)
        } else if (subData && !Array.isArray(subData)) {
          loadedSubscription = subData
          setSubscription(subData)
        }
      }

      // Sincronia com endpoint de acesso para evitar estados inconsistentes
      if (!loadedSubscription) {
        try {
          const accRes = await fetch('/api/billing/access', { credentials: 'include', headers })
          if (accRes.ok) {
            const accData = await accRes.json()
            if (accData?.status && accData.status !== 'NO_SUBSCRIPTION') {
              setSubscription({
                id: 'sub_tenant_access',
                status: accData.status,
                currentPeriodStart: accData.trialStart || accData.currentPeriodStart,
                currentPeriodEnd: accData.trialEnd || accData.currentPeriodEnd,
                trialStart: accData.trialStart,
                trialEnd: accData.trialEnd,
                durationDays: accData.isTrial ? 30 : 30,
                planName: accData.plan?.name || (accData.isTrial ? 'Plano Trial Gratuito (30 dias)' : 'Plano Comercial Ativo'),
                plan: accData.plan ? { ...accData.plan, isActive: true, price: 0, currency: 'BRL', billingInterval: 'MONTHLY' } : undefined,
              } as any)
            }
          }
        } catch (accErr) {
          console.warn('Erro ao checar fallback de acesso:', accErr)
        }
      }

      // Se a assinatura não estiver com status ACTIVE (ex: trial, expirada ou nova compra não sincronizada),
      // realiza auto-recuperação consultando compras concluídas na AbacatePay
      if (!loadedSubscription || loadedSubscription.status !== 'ACTIVE') {
        try {
          const syncRes = await fetch('/api/billing/checkout/confirm', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...headers },
            credentials: 'include',
            body: JSON.stringify({}),
          })
          if (syncRes.ok) {
            const syncData = await syncRes.json()
            if (syncData.success && syncData.subscription) {
              loadedSubscription = syncData.subscription
              setSubscription(syncData.subscription)
            }
          }
        } catch (syncErr) {
          console.warn('Tentativa de sincronização automática com AbacatePay:', syncErr)
        }
      }

      if (plansRes.ok) {
        const plansData = await plansRes.json()
        // Filtra estritamente apenas os planos comerciais ativos cadastrados na AbacatePay
        // NUNCA exibe planos descontinuados (status === 'INACTIVE', isActive === false ou deletedAt)
        const abacatePlans = Array.isArray(plansData)
          ? plansData.filter(
              (p: Plan) =>
                p.isActive === true &&
                p.status !== 'INACTIVE' &&
                !p.deletedAt &&
                p.planType !== 'COURTESY' &&
                Number(p.price) > 0 &&
                (Boolean(p.providerProductId) || p.provider === 'ABACATEPAY' || p.isSyncedWithAbacate)
            )
          : []
        setPlans(abacatePlans)
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
    if (user && user.role !== 'DEVELOPER' && !hasLoadedRef.current) {
      hasLoadedRef.current = true
      loadData(false)
    }
  }, [user?.id, user?.role])

  // Checkout oficial hospedado na AbacatePay (Redirecionamento seguro para gateway oficial)
  const handleHostedCheckout = async (plan: Plan) => {
    setCheckoutLoading(plan.id)
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
          planId: plan.id,
          mode: 'HOSTED',
          provider: 'ABACATEPAY',
          successUrl: `${origin}/dashboard/assinatura?payment=success&plan_id=${plan.id}`,
          cancelUrl: `${origin}/dashboard/assinatura?payment=canceled`,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Erro ao iniciar contratação na AbacatePay')
      }

      if (data.checkoutUrl) {
        // Redireciona o usuário diretamente para o checkout oficial hospedado da AbacatePay
        window.location.href = data.checkoutUrl
      } else {
        throw new Error('URL de pagamento não retornada pela AbacatePay.')
      }
    } catch (err: any) {
      console.error('Erro no checkout hospedado:', err)
      setErrorMessage(err.message || 'Falha ao conectar com o checkout oficial da AbacatePay.')
    } finally {
      setCheckoutLoading(null)
    }
  }

  // Contratação direta simulada (Dev Mode) em 1 clique
  const handleDirectSimulate = async (p: Plan) => {
    setCheckoutLoading(`${p.id}_SIMULATE`)
    setErrorMessage(null)
    try {
      const res = await fetch('/api/billing/pix/simulate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        credentials: 'include',
        body: JSON.stringify({
          pixId: `sim_dev_${Date.now()}`,
          planId: p.id,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Erro ao simular contratação do plano')
      }

      setSuccessBanner(`Plano ${p.name} contratado e ativado com sucesso em ambiente de simulação!`)
      await loadData(true)
    } catch (err: any) {
      console.error('Erro na contratação simulada:', err)
      setErrorMessage(err.message || 'Falha ao simular contratação do plano.')
    } finally {
      setCheckoutLoading(null)
    }
  }

  const formatPrice = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)
  }

  const formatDateDetailed = (dateStr?: string) => {
    if (!dateStr) return '-'
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return '-'
    return d.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    })
  }

  const formatDateShort = (dateStr?: string) => {
    if (!dateStr) return '-'
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return '-'
    return d.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  }

  const getDaysRemaining = (endDateStr?: string) => {
    if (!endDateStr) return null
    const end = new Date(endDateStr)
    if (isNaN(end.getTime())) return null
    const now = new Date()
    const diffMs = end.getTime() - now.getTime()
    return Math.ceil(diffMs / (1000 * 60 * 60 * 24))
  }

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'ACTIVE':
        return <span className="px-2.5 py-1 text-xs rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-semibold">Ativo</span>
      case 'TRIALING':
        return <span className="px-2.5 py-1 text-xs rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 font-semibold">Trial (Avaliação Gratuita)</span>
      case 'PAST_DUE':
        return <span className="px-2.5 py-1 text-xs rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 font-semibold">Pagamento Pendente</span>
      case 'SUSPENDED':
      case 'EXPIRED':
        return <span className="px-2.5 py-1 text-xs rounded-full bg-destructive/20 text-destructive border border-destructive/30 font-semibold">Expirado / Suspenso</span>
      case 'CANCELED':
        return <span className="px-2.5 py-1 text-xs rounded-full bg-muted text-muted-foreground border border-border font-semibold">Cancelado</span>
      default:
        return <span className="px-2.5 py-1 text-xs rounded-full bg-muted text-muted-foreground border border-border font-semibold">Sem Assinatura</span>
    }
  }

  // Datas reais do período do plano
  const periodStart = subscription?.currentPeriodStart || subscription?.trialStart
  const periodEnd = subscription?.currentPeriodEnd || subscription?.trialEnd
  const daysRemaining = getDaysRemaining(periodEnd)
  const isYearly = subscription?.cycleType === 'YEARLY' || subscription?.plan?.billingInterval === 'YEARLY'
  const isCurrentPlanDiscontinued = Boolean(
    subscription?.plan &&
    (subscription.plan.status === 'INACTIVE' || subscription.plan.isActive === false || Boolean(subscription.plan.deletedAt))
  )

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
            <div className="flex items-center gap-2.5 mb-1">
              <h1 className="text-2xl md:text-3xl font-bold text-foreground">Assinatura & Planos</h1>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                <ShieldCheck className="w-3.5 h-3.5" />
                AbacatePay
              </span>
            </div>
            <p className="text-muted-foreground text-sm md:text-base">
              Gerencie a contratação da sua barbearia com pagamento em <strong>PIX instantâneo</strong> ou <strong>Cartão de Crédito</strong>.
            </p>
          </div>
          <div className="flex items-center gap-2 self-start sm:self-auto shrink-0 flex-wrap">
            <button
              onClick={() => handleSyncPayment()}
              disabled={loading || syncingPayment}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs md:text-sm font-semibold rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/25 transition-all cursor-pointer disabled:opacity-50 shadow-sm"
              title="Sincronizar pagamentos e comprovantes da AbacatePay"
            >
              <ShieldCheck className={`w-4 h-4 ${syncingPayment ? 'animate-spin' : ''}`} />
              <span>{syncingPayment ? 'Sincronizando...' : 'Sincronizar AbacatePay'}</span>
            </button>
            <button
              onClick={() => loadData(false)}
              disabled={loading}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs md:text-sm font-medium rounded-xl border border-border bg-card hover:bg-accent hover:text-accent-foreground transition-all cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Atualizar dados
            </button>
          </div>
        </div>

        {/* Feedback Banners */}
        {successBanner && (
          <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 flex items-center justify-between text-sm animate-in fade-in">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              <span>{successBanner}</span>
            </div>
            <button onClick={() => setSuccessBanner(null)} className="text-emerald-400 hover:text-emerald-200 cursor-pointer">✕</button>
          </div>
        )}

        {errorMessage && (
          <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive-foreground flex items-center justify-between text-sm animate-in fade-in">
            <div className="flex items-center gap-2.5">
              <AlertTriangle className="w-5 h-5 text-destructive shrink-0" />
              <span>{errorMessage}</span>
            </div>
            <button onClick={() => setErrorMessage(null)} className="text-destructive hover:text-foreground cursor-pointer">✕</button>
          </div>
        )}

        {/* Current Plan Overview Card (Com Período Real e Formas de Pagamento) */}
        <div className="bg-card border border-border rounded-2xl p-6 md:p-8 relative overflow-hidden shadow-sm">
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <span className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">Plano Atual</span>
                  {getStatusBadge(subscription?.status)}
                  {subscription?.status === 'ACTIVE' && (
                    <span className="px-2 py-0.5 text-xs rounded-md bg-primary/10 text-primary border border-primary/20 font-mono">
                      {isYearly ? 'Ciclo Anual' : 'Ciclo Mensal'}
                    </span>
                  )}
                  {isCurrentPlanDiscontinued && (
                    <span className="px-2 py-0.5 text-xs rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20 font-medium inline-flex items-center gap-1">
                      <Info className="w-3 h-3" />
                      Plano Descontinuado para novas contratações
                    </span>
                  )}
                </div>
                <h2 className="text-2xl md:text-3xl font-extrabold text-foreground tracking-tight">
                  {subscription?.planName || subscription?.plan?.name || (subscription?.status === 'TRIALING' ? 'Plano Trial Gratuito (30 dias)' : 'Sem plano contratado')}
                </h2>
                {isCurrentPlanDiscontinued ? (
                  <p className="text-sm text-amber-300 max-w-2xl bg-amber-500/10 p-3 rounded-xl border border-amber-500/20">
                    <strong>Aviso:</strong> O plano atual da sua barbearia foi descontinuado para novas contratações. Seu acesso permanece 100% ativo e garantido até o vencimento do período contratado. Para renovar com os recursos atuais, selecione um dos novos planos oficiais abaixo.
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground max-w-2xl">
                    {subscription?.status === 'ACTIVE'
                      ? 'Acesso a todas as ferramentas essenciais para sua barbearia: agendamento online ilimitado, gestão de equipe, comissões e relatórios completos.'
                      : subscription?.status === 'TRIALING'
                      ? 'Você está no período de avaliação gratuita. Acesso a todas as ferramentas essenciais para sua barbearia.'
                      : 'Escolha um dos planos abaixo com pagamento via Cartão de Crédito ou PIX para liberar o acesso a todas as ferramentas essenciais da sua barbearia.'}
                  </p>
                )}
              </div>

              {subscription?.status === 'ACTIVE' && subscription.price && (
                <div className="md:text-right shrink-0 bg-muted/30 p-3.5 rounded-xl border border-border">
                  <span className="text-xs text-muted-foreground block font-medium">Valor da Assinatura</span>
                  <span className="text-2xl font-extrabold text-foreground">{formatPrice(Number(subscription.price))}</span>
                  <span className="text-xs text-muted-foreground block">/{isYearly ? 'ano' : 'mês'}</span>
                </div>
              )}
            </div>

            {/* Grid de Informações Reais de Período & Formas de Pagamento */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-6 border-t border-border">
              {/* 1. Início do Período */}
              <div className="bg-muted/20 p-4 rounded-xl border border-border/60">
                <span className="text-xs text-muted-foreground block font-medium mb-1">Início do Período</span>
                <span className="text-sm font-bold text-foreground flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-emerald-400 shrink-0" />
                  {formatDateDetailed(periodStart)}
                </span>
                <span className="text-[11px] text-muted-foreground block mt-1">
                  Ativação: {formatDateShort(periodStart)}
                </span>
              </div>

              {/* 2. Vencimento / Renovação */}
              <div className="bg-muted/20 p-4 rounded-xl border border-border/60">
                <span className="text-xs text-muted-foreground block font-medium mb-1">
                  {subscription?.status === 'TRIALING' ? 'Fim do Trial' : 'Vencimento / Renovação'}
                </span>
                <span className="text-sm font-bold text-foreground flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-amber-400 shrink-0" />
                  {formatDateDetailed(periodEnd)}
                </span>
                <div className="mt-1">
                  {daysRemaining !== null ? (
                    daysRemaining > 0 ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        Restam {daysRemaining} dias
                      </span>
                    ) : daysRemaining === 0 ? (
                      <span className="text-[11px] font-semibold text-amber-400">Vence hoje</span>
                    ) : (
                      <span className="text-[11px] font-semibold text-destructive">Período expirado</span>
                    )
                  ) : (
                    <span className="text-[11px] text-muted-foreground">-</span>
                  )}
                </div>
              </div>

              {/* 3. Ciclo de Cobrança */}
              <div className="bg-muted/20 p-4 rounded-xl border border-border/60">
                <span className="text-xs text-muted-foreground block font-medium mb-1">Ciclo do Plano</span>
                <span className="text-sm font-bold text-foreground flex items-center gap-1.5">
                  <RefreshCw className="w-4 h-4 text-primary shrink-0" />
                  {isYearly ? 'Anual (365 dias)' : 'Mensal (30 dias)'}
                </span>
                <span className="text-[11px] text-muted-foreground block mt-1">
                  Renovação periódica regular
                </span>
              </div>

              {/* 4. Formas de Pagamento Disponíveis */}
              <div className="bg-muted/20 p-4 rounded-xl border border-border/60">
                <span className="text-xs text-muted-foreground block font-medium mb-1">Formas de Pagamento</span>
                <div className="flex items-center gap-1.5 mt-1">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                    <QrCode className="w-3 h-3" />
                    PIX
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-blue-500/15 text-blue-400 border border-blue-500/30">
                    <CreditCard className="w-3 h-3" />
                    Cartão
                  </span>
                </div>
                <span className="text-[11px] text-muted-foreground block mt-1">
                  Aprovação imediata no sistema
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Plans Selection Section */}
        <div>
          <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-foreground">Planos Disponíveis para Contratação</h2>
                <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  AbacatePay Oficial
                </span>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                Planos oficiais sincronizados com a <strong>AbacatePay</strong>. Cobrança segura via <strong>PIX</strong> ou <strong>Cartão de Crédito</strong>.
              </p>
            </div>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2].map((n) => (
                <div key={n} className="bg-card border border-border rounded-2xl p-6 h-80 animate-pulse" />
              ))}
            </div>
          ) : plans.length === 0 ? (
            <div className="bg-card border border-border rounded-2xl p-8 text-center space-y-2">
              <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto text-emerald-400">
                <CreditCard className="w-6 h-6" />
              </div>
              <h3 className="font-semibold text-foreground text-sm">Nenhum plano disponível na AbacatePay</h3>
              <p className="text-muted-foreground text-xs max-w-md mx-auto">
                Apenas os planos cadastrados e ativos na AbacatePay são exibidos aqui para contratação.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {plans.map((p) => {
                const isCurrent = (subscription?.plan?.id === p.id || subscription?.planId === p.id || subscription?.planName === p.name) && subscription?.status === 'ACTIVE'
                const featuresList = Array.isArray(p.features) ? p.features : []

                return (
                  <div
                    key={p.id}
                    className={`bg-card rounded-2xl p-6 border flex flex-col justify-between transition-all relative ${
                      isCurrent
                        ? 'border-emerald-500 ring-1 ring-emerald-500/30'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    {isCurrent && (
                      <span className="absolute -top-3 right-6 bg-emerald-500 text-black text-xs font-bold px-3 py-1 rounded-full shadow-sm">
                        Plano Atual Ativo
                      </span>
                    )}

                    <div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <CreditCard className="w-5 h-5 text-amber-500" />
                          <h3 className="font-bold text-lg text-foreground">{p.name}</h3>
                        </div>
                        {/* Badges de formas de pagamento aceitas */}
                        <div className="flex items-center gap-1">
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            PIX
                          </span>
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                            CARTÃO
                          </span>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1.5 min-h-[32px]">{p.description || 'Gestão completa para barbearia'}</p>

                      <div className="mt-5 pb-5 border-b border-border">
                        <span className="text-3xl font-extrabold text-foreground">{formatPrice(Number(p.price))}</span>
                        <span className="text-xs text-muted-foreground">/{p.billingInterval === 'YEARLY' ? 'ano' : 'mês'}</span>
                        <span className="text-[11px] text-muted-foreground block mt-1">
                          {p.billingInterval === 'YEARLY' ? 'Vigência de 365 dias' : 'Vigência de 30 dias renováveis'}
                        </span>
                      </div>

                      <div className="mt-5 space-y-2.5 text-xs text-muted-foreground">
                        {featuresList.length > 0 ? (
                          featuresList.map((feat: string, idx: number) => (
                            <div key={idx} className="flex items-center gap-2">
                              <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                              <span className="text-foreground">{feat}</span>
                            </div>
                          ))
                        ) : (
                          <>
                            <div className="flex items-center gap-2">
                              <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                              <span className="text-foreground">Agendamentos online ilimitados</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                              <span className="text-foreground">Gestão de barbeiros e comissões</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                              <span className="text-foreground">Página pública exclusiva da barbearia</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                              <span className="text-foreground">Relatórios financeiros completos</span>
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="mt-8 pt-4 space-y-2.5">
                      {isCurrent ? (
                        <div className="w-full py-2.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 font-bold text-sm text-center flex items-center justify-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          <span>Plano Ativo (Contratado)</span>
                        </div>
                      ) : (
                        <>
                          <button
                            onClick={() => handleHostedCheckout(p)}
                            disabled={Boolean(checkoutLoading)}
                            className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-emerald-950/20 disabled:opacity-50 group"
                          >
                            {checkoutLoading === p.id ? (
                              <>
                                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/20 border-t-white" />
                                <span>Redirecionando...</span>
                              </>
                            ) : (
                              <>
                                <ShieldCheck className="w-4 h-4 text-emerald-200 group-hover:scale-110 transition-transform" />
                                <span>Fazer assinatura do plano.</span>
                              </>
                            )}
                          </button>
                        </>
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
              <h2 className="text-xl font-bold text-foreground">Histórico de Faturas</h2>
              <p className="text-sm text-muted-foreground">Comprovantes e status de cobrança processados.</p>
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
                    <th className="pb-3 font-medium"># Sequência</th>
                    <th className="pb-3 font-medium">Vencimento</th>
                    <th className="pb-3 font-medium">Valor</th>
                    <th className="pb-3 font-medium">Status</th>
                    <th className="pb-3 font-medium">Data de Pagamento</th>
                    <th className="pb-3 font-medium text-right">Comprovante</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {invoices.map((inv, idx) => (
                    <tr key={inv.id} className="hover:bg-muted/20 transition-colors">
                      <td className="py-3.5 font-mono text-xs text-foreground font-semibold">
                        #{String(idx + 1).padStart(3, '0')}
                      </td>
                      <td className="py-3.5 text-muted-foreground">{formatDateShort(inv.dueDate)}</td>
                      <td className="py-3.5 font-semibold text-foreground">{formatPrice(Number(inv.amount))}</td>
                      <td className="py-3.5">
                        {inv.status === 'PAID' ? (
                          <span className="px-2.5 py-0.5 text-xs rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-semibold">
                            Pago
                          </span>
                        ) : inv.status === 'PENDING' || inv.status === 'OPEN' ? (
                          <span className="px-2.5 py-0.5 text-xs rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 font-semibold">
                            Pendente
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 text-xs rounded-full bg-destructive/20 text-destructive border border-destructive/30 font-semibold">
                            {inv.status}
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 text-muted-foreground">{formatDateShort(inv.paidAt)}</td>
                      <td className="py-3.5 text-right">
                        {inv.status === 'PAID' ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => setReceiptModalInvoice(inv)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/30 text-xs font-semibold transition-all hover:scale-105 shadow-sm cursor-pointer"
                              title="Visualizar e baixar comprovante oficial em PDF"
                            >
                              <FileText className="w-3.5 h-3.5 shrink-0" />
                              <span>Comprovante</span>
                              <Download className="w-3 h-3 opacity-80 shrink-0" />
                            </button>
                            {inv.hostedInvoiceUrl && (
                              <a
                                href={inv.hostedInvoiceUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1.5 rounded-lg border border-border hover:bg-muted text-muted-foreground hover:text-foreground transition-all shrink-0"
                                title="Abrir recibo oficial no portal AbacatePay"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </a>
                            )}
                          </div>
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

      {/* Modal de Comprovante Oficial de Pagamento */}
      {receiptModalInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
          <div className="bg-card border border-border w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-muted/20">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/15 flex items-center justify-center text-emerald-400">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-foreground text-sm sm:text-base">Comprovante de Pagamento</h3>
                  <p className="text-[11px] text-muted-foreground">BarberShop Pro • Liquidação via AbacatePay</p>
                </div>
              </div>
              <button
                onClick={() => setReceiptModalInvoice(null)}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body / Printable Area */}
            <div className="p-6 overflow-y-auto space-y-5 text-sm" id="printable-receipt">
              {/* Status Box */}
              <div className="p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                  <div>
                    <span className="font-bold text-emerald-400 block text-sm">Pagamento Confirmado</span>
                    <span className="text-xs text-emerald-300/80">Transação liquidada com sucesso</span>
                  </div>
                </div>
                <span className="px-2.5 py-0.5 text-xs rounded-full bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/40">
                  PAGO
                </span>
              </div>

              {/* Amount Details */}
              <div className="text-center py-4 bg-muted/30 rounded-xl border border-border">
                <span className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold">Valor Total Pago</span>
                <div className="text-3xl font-extrabold text-foreground mt-1">
                  {formatPrice(Number(receiptModalInvoice.amount))}
                </div>
                <span className="text-xs text-emerald-400 font-medium mt-1 inline-block">
                  {subscription?.planName || 'Assinatura Comercial BarberShop'}
                </span>
              </div>

              {/* Details Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3 rounded-xl border border-border bg-card/60">
                  <span className="text-[11px] text-muted-foreground block font-medium">Data do Pagamento</span>
                  <span className="text-xs font-semibold text-foreground flex items-center gap-1.5 mt-1">
                    <Calendar className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    {formatDateDetailed(receiptModalInvoice.paidAt || receiptModalInvoice.dueDate)}
                  </span>
                </div>

                <div className="p-3 rounded-xl border border-border bg-card/60">
                  <span className="text-[11px] text-muted-foreground block font-medium">Meio de Liquidação</span>
                  <span className="text-xs font-semibold text-foreground flex items-center gap-1.5 mt-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    PIX / Cartão (AbacatePay)
                  </span>
                </div>

                <div className="p-3 rounded-xl border border-border bg-card/60 sm:col-span-2">
                  <span className="text-[11px] text-muted-foreground block font-medium">Favorecido / Plataforma</span>
                  <span className="text-xs font-semibold text-foreground block mt-1">
                    BarberShop Pro Tecnologia SaaS
                  </span>
                  <span className="text-[10px] text-muted-foreground">Instituição Facilitadora: AbacatePay Meios de Pagamento</span>
                </div>

                <div className="p-3 rounded-xl border border-border bg-card/60 sm:col-span-2">
                  <span className="text-[11px] text-muted-foreground block font-medium">ID da Transação / Autenticação</span>
                  <span className="text-[11px] font-mono font-semibold text-foreground break-all block mt-1 select-all bg-muted/50 p-2 rounded-lg border border-border">
                    {receiptModalInvoice.providerInvoiceId || receiptModalInvoice.id}
                  </span>
                </div>
              </div>

              <div className="text-[10px] text-muted-foreground text-center pt-1">
                Comprovante digital emitido pelo sistema BarberShop Pro em conformidade com as transações oficiais registradas na AbacatePay.
              </div>
            </div>

            {/* Modal Footer Actions */}
            <div className="px-6 py-4 border-t border-border bg-muted/20 flex flex-col sm:flex-row items-center justify-end gap-2.5">
              {receiptModalInvoice.hostedInvoiceUrl && (
                <a
                  href={receiptModalInvoice.hostedInvoiceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl border border-border bg-card hover:bg-accent text-foreground text-xs font-semibold transition-all cursor-pointer"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Ver na AbacatePay</span>
                </a>
              )}
              <button
                onClick={() => window.print()}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-md cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Baixar / Imprimir PDF</span>
              </button>
            </div>
          </div>
        </div>
      )}

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
