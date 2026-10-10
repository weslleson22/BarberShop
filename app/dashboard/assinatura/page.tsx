'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import DropdownHeader from '@/components/shared/DropdownHeader'
import { useAuth } from '@/lib/auth-context'
import { getAuthHeaders } from '@/lib/utils'
import AbacateCheckout from '@/components/billing/AbacateCheckout'
import { parseStoredAddress, CustomerDefaults } from '@/lib/billing/checkout-config'
import { 
  CreditCard, 
  Check, 
  Sparkles, 
  Calendar, 
  Clock, 
  AlertTriangle, 
  FileText, 
  ExternalLink, 
  RefreshCw,
  ShieldCheck,
  CheckCircle2,
  QrCode,
  Copy,
  Zap,
  X,
  Lock,
  Smartphone,
  ChevronRight,
  Info
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
  provider?: string
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

interface PaymentModalState {
  isOpen: boolean
  plan: Plan | null
  method: 'PIX' | 'CREDIT_CARD'
  pixId?: string
  brCode?: string
  brCodeBase64?: string
  amount: number
  status: 'IDLE' | 'PENDING' | 'PAID'
}

function detectCardBrand(num: string) {
  const clean = num.replace(/\D/g, '')
  if (/^4/.test(clean)) return { name: 'Visa', color: 'from-blue-600 to-indigo-900', badge: 'bg-blue-500/20 text-blue-400 border-blue-500/30' }
  if (/^5[1-5]/.test(clean) || /^2[2-7]/.test(clean)) return { name: 'Mastercard', color: 'from-red-600 to-amber-900', badge: 'bg-orange-500/20 text-orange-400 border-orange-500/30' }
  if (/^(4011|4389|4514|4576|5041|5066|5067|509|6277|6362|6363|650|6516|6550)/.test(clean)) return { name: 'Elo', color: 'from-amber-600 to-yellow-900', badge: 'bg-amber-500/20 text-amber-400 border-amber-500/30' }
  if (/^3[47]/.test(clean)) return { name: 'Amex', color: 'from-cyan-700 to-blue-950', badge: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30' }
  if (/^(606282|3841)/.test(clean)) return { name: 'Hipercard', color: 'from-rose-600 to-red-950', badge: 'bg-rose-500/20 text-rose-400 border-rose-500/30' }
  return { name: 'Cartão de Crédito', color: 'from-slate-800 to-slate-950', badge: 'bg-slate-500/20 text-slate-300 border-slate-500/30' }
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

  // Estado do Modal de Checkout AbacatePay (com etapas e dados da base)
  const [checkoutModal, setCheckoutModal] = useState<{
    isOpen: boolean
    plan: Plan | null
    method: 'PIX' | 'CREDIT_CARD'
  }>({
    isOpen: false,
    plan: null,
    method: 'PIX',
  })

  // Dados do cliente/barbearia pré-carregados da base
  const [customerDefaults, setCustomerDefaults] = useState<CustomerDefaults>({})

  // Estado unificado do Modal de Pagamento (PIX e Cartão de Crédito)
  const [paymentModal, setPaymentModal] = useState<PaymentModalState>({
    isOpen: false,
    plan: null,
    method: 'PIX',
    amount: 0,
    status: 'IDLE',
  })

  // Formulário do Cartão de Crédito
  const [cardForm, setCardForm] = useState({
    number: '',
    holder: '',
    expiry: '',
    cvv: '',
    installments: '1',
    taxId: '',
  })
  const [processingCard, setProcessingCard] = useState(false)
  const [copiedCode, setCopiedCode] = useState(false)
  const [simulating, setSimulating] = useState(false)
  const pollingRef = useRef<NodeJS.Timeout | null>(null)
  const hasLoadedRef = useRef(false)

  useEffect(() => {
    if (!authLoading && user?.role === 'DEVELOPER') {
      router.replace('/developer/billing')
    }
  }, [user?.role, authLoading, router])

  useEffect(() => {
    if (paymentStatus === 'success') {
      setSuccessBanner('Pagamento confirmado com sucesso via AbacatePay! Sua assinatura foi ativada.')
    } else if (paymentStatus === 'canceled') {
      setErrorMessage('O processo de pagamento foi cancelado. Você pode tentar novamente a qualquer momento.')
    }
  }, [paymentStatus])

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

      if (plansRes.ok) {
        const plansData = await plansRes.json()
        setPlans(Array.isArray(plansData) ? plansData.filter((p: Plan) => p.isActive) : [])
      }

      if (invRes.ok) {
        const invData = await invRes.json()
        setInvoices(Array.isArray(invData) ? invData : [])
      }

      // Carrega dados cadastrais da barbearia para pré-preenchimento no checkout
      try {
        const shopRes = await fetch('/api/barbershop', { credentials: 'include', headers })
        if (shopRes.ok) {
          const shop = await shopRes.json()
          const parsedAddr = parseStoredAddress(shop.address || user?.address)
          setCustomerDefaults({
            name: shop.name || user?.name || '',
            email: shop.email || user?.email || '',
            phone: shop.phone || user?.phone || '',
            address: parsedAddr,
          })
        } else if (user) {
          setCustomerDefaults({
            name: user.name,
            email: user.email,
            phone: user.phone,
            address: parseStoredAddress(user.address),
          })
        }
      } catch (shopErr) {
        if (user) {
          setCustomerDefaults({
            name: user.name,
            email: user.email,
            phone: user.phone,
            address: parseStoredAddress(user.address),
          })
        }
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

  // Monitoramento em tempo real do status do PIX Transparente
  useEffect(() => {
    if (paymentModal.isOpen && paymentModal.method === 'PIX' && paymentModal.pixId && paymentModal.status === 'PENDING') {
      pollingRef.current = setInterval(async () => {
        try {
          const query = new URLSearchParams({ id: paymentModal.pixId! })
          if (paymentModal.plan?.id) query.set('planId', paymentModal.plan.id)

          const res = await fetch(`/api/billing/pix/check?${query.toString()}`, {
            headers: getAuthHeaders(),
            credentials: 'include',
          })
          if (res.ok) {
            const data = await res.json()
            if (data.status === 'PAID') {
              if (pollingRef.current) {
                clearInterval(pollingRef.current)
                pollingRef.current = null
              }
              setPaymentModal((prev) => ({ ...prev, status: 'PAID' }))
              setSuccessBanner(`Pagamento PIX confirmado instantaneamente! O plano ${paymentModal.plan?.name} está ativo.`)
              setTimeout(() => {
                setPaymentModal((prev) => ({ ...prev, isOpen: false }))
                loadData(true)
              }, 2200)
            }
          }
        } catch (err) {
          console.warn('Erro ao checar status do PIX:', err)
        }
      }, 3000)
    }

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current)
        pollingRef.current = null
      }
    }
  }, [paymentModal.isOpen, paymentModal.method, paymentModal.pixId, paymentModal.status, paymentModal.plan?.id])

  // Abre o checkout AbacatePay com os dados da base pré-carregados e editáveis
  const handleOpenCheckout = (plan: Plan, method: 'PIX' | 'CREDIT_CARD') => {
    setErrorMessage(null)
    setCheckoutModal({
      isOpen: true,
      plan,
      method,
    })
  }

  // Abre o modal de pagamento na aba selecionada (PIX ou Cartão)
  const handleOpenPayment = async (plan: Plan, initialMethod: 'PIX' | 'CREDIT_CARD' = 'PIX') => {
    setErrorMessage(null)
    setPaymentModal({
      isOpen: true,
      plan,
      method: initialMethod,
      amount: Math.round(Number(plan.price) * 100),
      status: 'PENDING',
    })

    // Se a aba for PIX, já inicializa a geração do QR Code transparente da AbacatePay
    if (initialMethod === 'PIX') {
      await generatePixForPlan(plan)
    }
  }

  // Gera cobrança PIX para o plano
  const generatePixForPlan = async (plan: Plan) => {
    setCheckoutLoading(`${plan.id}_PIX`)
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
          mode: 'TRANSPARENT',
          provider: 'ABACATEPAY',
          successUrl: `${origin}/dashboard/assinatura?payment=success`,
          cancelUrl: `${origin}/dashboard/assinatura?payment=canceled`,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Erro ao gerar PIX na AbacatePay')
      }

      if (data.pix) {
        setPaymentModal((prev) => ({
          ...prev,
          pixId: data.pix.id,
          brCode: data.pix.brCode,
          brCodeBase64: data.pix.brCodeBase64,
          amount: data.pix.amount,
          status: 'PENDING',
        }))
      }
    } catch (err: any) {
      console.error('Erro ao gerar PIX:', err)
      setErrorMessage(err.message || 'Falha ao conectar com o gateway PIX.')
    } finally {
      setCheckoutLoading(null)
    }
  }

  // Troca de aba dentro do modal
  const handleSwitchMethod = async (method: 'PIX' | 'CREDIT_CARD') => {
    setPaymentModal((prev) => ({ ...prev, method }))
    if (method === 'PIX' && !paymentModal.brCode && paymentModal.plan) {
      await generatePixForPlan(paymentModal.plan)
    }
  }

  // Processa o pagamento via Cartão de Crédito
  const handlePayWithCard = async () => {
    if (!paymentModal.plan) return
    setProcessingCard(true)
    setErrorMessage(null)

    try {
      const res = await fetch('/api/billing/card/pay', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        credentials: 'include',
        body: JSON.stringify({
          planId: paymentModal.plan.id,
          cardNumber: cardForm.number,
          cardHolder: cardForm.holder,
          cardExpiry: cardForm.expiry,
          cardCvv: cardForm.cvv,
          installments: cardForm.installments,
          customerTaxId: cardForm.taxId,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Falha ao aprovar transação no cartão.')
      }

      setPaymentModal((prev) => ({ ...prev, status: 'PAID' }))
      setSuccessBanner(`Pagamento no cartão confirmado! Plano ${paymentModal.plan.name} ativado com sucesso.`)
      setTimeout(() => {
        setPaymentModal((prev) => ({ ...prev, isOpen: false }))
        loadData(true)
      }, 2000)
    } catch (err: any) {
      console.error('Erro no pagamento via cartão:', err)
      setErrorMessage(err.message || 'Erro ao processar cartão.')
    } finally {
      setProcessingCard(false)
    }
  }

  // Preenche dados com cartão de teste para simulação instantânea
  const handleFillTestCard = () => {
    setCardForm({
      number: '4532 0123 4567 8910',
      holder: user?.name ? user.name.toUpperCase() : 'ADMINISTRADOR BARBERSHOP',
      expiry: '12/29',
      cvv: '888',
      installments: '1',
      taxId: '391.511.420-54',
    })
  }

  // Simula pagamento aprovado do PIX em DevMode / Sandbox
  const handleSimulatePixPayment = async () => {
    if (!paymentModal.pixId) return
    setSimulating(true)
    try {
      const res = await fetch('/api/billing/pix/simulate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        credentials: 'include',
        body: JSON.stringify({
          pixId: paymentModal.pixId,
          planId: paymentModal.plan?.id,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Erro ao simular pagamento')
      }

      setPaymentModal((prev) => ({ ...prev, status: 'PAID' }))
      setSuccessBanner(`Pagamento PIX simulado e aprovado! Plano ${paymentModal.plan?.name} ativado com sucesso.`)
      setTimeout(() => {
        setPaymentModal((prev) => ({ ...prev, isOpen: false }))
        loadData(true)
      }, 1800)
    } catch (err: any) {
      setErrorMessage(err.message || 'Erro ao simular pagamento')
    } finally {
      setSimulating(false)
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

  // Checkout hospedado externo da AbacatePay
  const handleHostedCheckout = async (planId: string) => {
    setCheckoutLoading(`${planId}_HOSTED`)
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
          mode: 'HOSTED',
          provider: 'ABACATEPAY',
          successUrl: `${origin}/dashboard/assinatura?payment=success`,
          cancelUrl: `${origin}/dashboard/assinatura?payment=canceled`,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Erro ao iniciar checkout na AbacatePay')
      }

      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl
      } else {
        throw new Error('URL de checkout não retornada pelo provedor.')
      }
    } catch (err: any) {
      console.error('Erro no checkout hospedado:', err)
      setErrorMessage(err.message || 'Falha ao conectar com o checkout AbacatePay.')
    } finally {
      setCheckoutLoading(null)
    }
  }

  const handleCopyPix = () => {
    if (paymentModal.brCode) {
      navigator.clipboard.writeText(paymentModal.brCode)
      setCopiedCode(true)
      setTimeout(() => setCopiedCode(false), 2500)
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

  if (authLoading || (user?.role === 'DEVELOPER')) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
      </div>
    )
  }

  const currentBrand = detectCardBrand(cardForm.number)

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
          <button
            onClick={() => loadData(false)}
            disabled={loading}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs md:text-sm font-medium rounded-xl border border-border bg-card hover:bg-accent hover:text-accent-foreground transition-all shrink-0 self-start sm:self-auto cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Atualizar dados
          </button>
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
        <div className="bg-gradient-to-br from-card via-card to-card/60 border border-border rounded-2xl p-6 md:p-8 backdrop-blur-sm relative overflow-hidden shadow-sm">
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
                </div>
                <h2 className="text-2xl md:text-3xl font-extrabold text-foreground tracking-tight">
                  {subscription?.planName || subscription?.plan?.name || (subscription?.status === 'TRIALING' ? 'Plano Trial Gratuito (30 dias)' : 'Sem plano contratado')}
                </h2>
                <p className="text-sm text-muted-foreground max-w-2xl">
                  {subscription?.status === 'ACTIVE'
                    ? 'Acesso a todas as ferramentas essenciais para sua barbearia: agendamento online ilimitado, gestão de equipe, comissões e relatórios completos.'
                    : subscription?.status === 'TRIALING'
                    ? 'Você está no período de avaliação gratuita. Acesso a todas as ferramentas essenciais para sua barbearia.'
                    : 'Escolha um dos planos abaixo com pagamento via Cartão de Crédito ou PIX para liberar o acesso a todas as ferramentas essenciais da sua barbearia.'}
                </p>
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
              <h2 className="text-xl font-bold text-foreground">Planos Disponíveis para Contratação</h2>
              <p className="text-sm text-muted-foreground">
                Escolha o plano ideal com cobrança 100% segura via <strong>PIX</strong> ou <strong>Cartão de Crédito</strong>.
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
            <div className="bg-card border border-border rounded-2xl p-8 text-center">
              <p className="text-muted-foreground text-sm">Nenhum plano disponível no momento.</p>
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
                        ? 'border-emerald-500/50 ring-1 ring-emerald-500/30 shadow-lg shadow-emerald-500/5'
                        : 'border-border hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5'
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
                          <Sparkles className="w-5 h-5 text-amber-500" />
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
                          {/* Botão 1: Pagar via PIX (Abre Checkout AbacatePay com dados pré-preenchidos) */}
                          <button
                            onClick={() => handleOpenCheckout(p, 'PIX')}
                            disabled={Boolean(checkoutLoading)}
                            className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-500 via-emerald-400 to-lime-500 hover:from-emerald-600 hover:to-lime-600 text-slate-950 font-extrabold text-xs md:text-sm transition-all shadow-md shadow-emerald-500/10 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                          >
                            <QrCode className="w-4 h-4 shrink-0" />
                            <span>Pagar via PIX</span>
                          </button>

                          {/* Botão 2: Pagar com Cartão de Crédito (Abre Checkout AbacatePay com dados pré-preenchidos) */}
                          <button
                            onClick={() => handleOpenCheckout(p, 'CREDIT_CARD')}
                            disabled={Boolean(checkoutLoading)}
                            className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs md:text-sm transition-all shadow-md shadow-blue-500/10 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                          >
                            <CreditCard className="w-4 h-4 shrink-0" />
                            <span>Pagar com Cartão de Crédito</span>
                          </button>

                          {/* Botão 3: Simulação Imediata (Dev Mode) */}
                          <button
                            onClick={() => handleDirectSimulate(p)}
                            disabled={Boolean(checkoutLoading)}
                            className="w-full py-1.5 px-3 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-300 font-semibold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                          >
                            {checkoutLoading === `${p.id}_SIMULATE` ? (
                              <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-amber-300" />
                            ) : (
                              <>
                                <Zap className="w-3.5 h-3.5 text-amber-400" />
                                <span>Simular Contratação (Dev Mode)</span>
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

      {/* ========================================================================= */}
      {/* MODAL DE CHECKOUT ABACATEPAY COM DADOS E ENDEREÇO DA BASE DE DADOS        */}
      {/* ========================================================================= */}
      {checkoutModal.isOpen && checkoutModal.plan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 md:p-8 bg-black/85 backdrop-blur-md overflow-y-auto animate-in fade-in">
          <div className="relative w-full max-w-5xl my-auto">
            {/* Botão Fechar Modal */}
            <button
              type="button"
              onClick={() => setCheckoutModal({ isOpen: false, plan: null, method: 'PIX' })}
              className="absolute top-4 right-4 z-50 p-2.5 rounded-full bg-slate-900/90 hover:bg-slate-800 text-slate-300 hover:text-white transition shadow-xl border border-slate-700 cursor-pointer"
              title="Fechar checkout"
            >
              <X className="w-5 h-5" />
            </button>

            <AbacateCheckout
              product={{
                id: checkoutModal.plan.id,
                name: checkoutModal.plan.name,
                description: checkoutModal.plan.description || `Assinatura ${checkoutModal.plan.name} para barbearia`,
                price: Number(checkoutModal.plan.price),
                billingInterval: checkoutModal.plan.billingInterval,
              }}
              initialMethod={checkoutModal.method}
              customerDefaults={customerDefaults}
              onSuccess={() => {
                setSuccessBanner(`Pagamento confirmado com sucesso via AbacatePay! O plano ${checkoutModal.plan?.name} está ativo.`)
                setCheckoutModal({ isOpen: false, plan: null, method: 'PIX' })
                loadData(true)
              }}
              onCancel={() => setCheckoutModal({ isOpen: false, plan: null, method: 'PIX' })}
            />
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
