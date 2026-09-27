import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Prisma, SubscriptionStatus } from '@prisma/client'
import {
  generateTestStripeSignature,
  verifyStripeWebhookSignature,
} from '@/lib/billing/stripe-provider'
import { processBillingWebhook } from '@/lib/billing/webhook-handler'
import { POST as postWebhookBilling } from '@/app/api/webhooks/billing/route'
import { POST as postBillingCheckout } from '@/app/api/billing/checkout/route'
import {
  ALLOWED_STATUS_TRANSITIONS,
  isValidStatusTransition,
  transitionSubscriptionStatus,
} from '@/lib/billing/saas-billing'

let mockAuthUser: any = null
vi.mock('@/lib/api-auth', () => ({
  getAuthUser: () => mockAuthUser,
  requireRole: (user: any, roles: string[]) => user && roles.includes(user.role),
}))

describe('SISTEMA SAAS BILLING: RECORRÊNCIA, WEBHOOKS, IDEMPOTÊNCIA E MÁQUINA DE ESTADOS', () => {
  const TEST_SECRET = 'whsec_test_secret_key_1234567890abcdef'

  let inMemoryBarbershops: any[] = []
  let inMemoryPlans: any[] = []
  let inMemorySubscriptions: any[] = []
  let inMemoryInvoices: any[] = []
  let inMemoryEvents: any[] = []
  let inMemoryProcessedWebhooks: any[] = []

  beforeEach(() => {
    vi.clearAllMocks()
    process.env.STRIPE_WEBHOOK_SECRET = TEST_SECRET
    mockAuthUser = null

    inMemoryBarbershops = [
      {
        id: 'shop_vintage_1',
        name: 'Barbearia Vintage Alfa',
        slug: 'vintage-alfa',
        email: 'vintage@alfa.com',
        phone: '11999990001',
        isActive: true,
        status: 'APPROVED',
        contractExpiresAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]

    inMemoryPlans = [
      {
        id: 'plan_pro',
        name: 'Plano Pro Mensal',
        slug: 'pro-monthly',
        price: new Prisma.Decimal('89.90'),
        currency: 'BRL',
        billingInterval: 'MONTHLY',
        trialDays: 0,
        isActive: true,
        features: { maxBarbers: 5, dashboard: true },
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'plan_premium',
        name: 'Plano Premium Mensal',
        slug: 'premium-monthly',
        price: new Prisma.Decimal('149.90'),
        currency: 'BRL',
        billingInterval: 'MONTHLY',
        trialDays: 0,
        isActive: true,
        features: { maxBarbers: 15, dashboard: true, customDomain: true },
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]

    inMemorySubscriptions = [
      {
        id: 'sub_shop_1',
        barbershopId: 'shop_vintage_1',
        planId: 'plan_pro',
        status: 'TRIALING' as SubscriptionStatus,
        trialStart: new Date(),
        trialEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        cancelAtPeriodEnd: false,
        canceledAt: null,
        provider: 'STRIPE',
        providerSubscriptionId: 'sub_stripe_prov_123',
        providerCustomerId: 'cus_stripe_prov_123',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]

    inMemoryInvoices = []
    inMemoryEvents = []
    inMemoryProcessedWebhooks = []

    // Transaction Mock
    vi.spyOn(prisma, '$transaction').mockImplementation(async (callback: any) => {
      return await callback(prisma)
    })

    // Plan Mocks
    ;(vi.spyOn(prisma.plan, 'findUnique') as any).mockImplementation(async ({ where }: any) => {
      return inMemoryPlans.find((p) => p.id === where.id) || null
    })

    // Barbershop Mocks
    ;(vi.spyOn(prisma.barbershop, 'findUnique') as any).mockImplementation(async ({ where }: any) => {
      return inMemoryBarbershops.find((b) => b.id === where.id) || null
    })

    // Subscription Mocks
    ;(vi.spyOn(prisma.subscription, 'findUnique') as any).mockImplementation(async ({ where }: any) => {
      const sub = inMemorySubscriptions.find((s) => s.id === where.id)
      if (!sub) return null
      return { ...sub, plan: inMemoryPlans.find((p) => p.id === sub.planId) }
    })

    ;(vi.spyOn(prisma.subscription, 'findFirst') as any).mockImplementation(async ({ where }: any) => {
      const sub = inMemorySubscriptions.find((s) => {
        if (where.id && s.id !== where.id) return false
        if (where.barbershopId && s.barbershopId !== where.barbershopId) return false
        if (where.providerSubscriptionId && s.providerSubscriptionId !== where.providerSubscriptionId) return false
        if (where.providerCustomerId && s.providerCustomerId !== where.providerCustomerId) return false
        return true
      })
      if (!sub) return null
      return { ...sub, plan: inMemoryPlans.find((p) => p.id === sub.planId) }
    })

    ;(vi.spyOn(prisma.subscription, 'update') as any).mockImplementation(async ({ where, data }: any) => {
      const idx = inMemorySubscriptions.findIndex((s) => s.id === where.id)
      if (idx !== -1) {
        inMemorySubscriptions[idx] = { ...inMemorySubscriptions[idx], ...data, updatedAt: new Date() }
        return inMemorySubscriptions[idx]
      }
      throw new Error('Subscription not found')
    })

    // Invoice Mocks
    ;(vi.spyOn(prisma.invoice, 'findFirst') as any).mockImplementation(async ({ where }: any) => {
      return inMemoryInvoices.find((i) => {
        if (where.id && i.id !== where.id) return false
        if (where.providerInvoiceId && i.providerInvoiceId !== where.providerInvoiceId) return false
        return true
      }) || null
    })

    ;(vi.spyOn(prisma.invoice, 'create') as any).mockImplementation(async ({ data }: any) => {
      const invoice = {
        id: `inv_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      inMemoryInvoices.push(invoice)
      return invoice
    })

    ;(vi.spyOn(prisma.invoice, 'update') as any).mockImplementation(async ({ where, data }: any) => {
      const idx = inMemoryInvoices.findIndex((i) => i.id === where.id)
      if (idx !== -1) {
        inMemoryInvoices[idx] = { ...inMemoryInvoices[idx], ...data, updatedAt: new Date() }
        return inMemoryInvoices[idx]
      }
      throw new Error('Invoice not found')
    })

    // SubscriptionEvent Mocks
    ;(vi.spyOn(prisma.subscriptionEvent, 'create') as any).mockImplementation(async ({ data }: any) => {
      const event = { id: `evt_sub_${Date.now()}`, ...data, createdAt: new Date() }
      inMemoryEvents.push(event)
      return event
    })

    // ProcessedWebhook Mocks (Idempotência)
    ;(vi.spyOn(prisma.processedWebhook, 'findUnique') as any).mockImplementation(async ({ where }: any) => {
      return inMemoryProcessedWebhooks.find((w) => w.eventId === where.eventId) || null
    })

    ;(vi.spyOn(prisma.processedWebhook, 'create') as any).mockImplementation(async ({ data }: any) => {
      const rec = { id: `wh_${Date.now()}`, ...data, processedAt: new Date() }
      inMemoryProcessedWebhooks.push(rec)
      return rec
    })
  })

  // ========================================================
  // 1. VALIDAÇÃO DE ASSINATURA & SEGURANÇA CRIPTOGRÁFICA
  // ========================================================
  it('1. Webhook válido: verifica assinatura HMAC-SHA256 e executa com sucesso', async () => {
    const payload = JSON.stringify({
      id: 'evt_stripe_valid_1',
      type: 'checkout.session.completed',
      data: {
        object: {
          client_reference_id: 'shop_vintage_1',
          customer: 'cus_stripe_prov_123',
          subscription: 'sub_stripe_prov_123',
          metadata: { planId: 'plan_pro' },
        },
      },
    })

    const signature = generateTestStripeSignature(payload, TEST_SECRET)

    const verification = verifyStripeWebhookSignature({
      payload,
      signatureHeader: signature,
      secret: TEST_SECRET,
    })

    expect(verification.valid).toBe(true)

    const result = await processBillingWebhook({
      rawBody: payload,
      signatureHeader: signature,
      secret: TEST_SECRET,
    })

    expect(result.success).toBe(true)
    expect(result.statusCode).toBe(200)
    expect(result.eventId).toBe('evt_stripe_valid_1')
    expect(result.duplicated).toBe(false)

    // Confirma que a assinatura do tenant virou ACTIVE
    const sub = inMemorySubscriptions.find((s) => s.id === 'sub_shop_1')
    expect(sub.status).toBe('ACTIVE')
  })

  it('2. Webhook inválido: rejeita requisição com assinatura adulterada ou forjada', async () => {
    const payload = JSON.stringify({
      id: 'evt_attacker_1',
      type: 'invoice.paid',
      data: { object: { id: 'in_fake' } },
    })

    // Assinatura com chave errada
    const forgedSignature = generateTestStripeSignature(payload, 'wrong_attacker_secret')

    const verification = verifyStripeWebhookSignature({
      payload,
      signatureHeader: forgedSignature,
      secret: TEST_SECRET,
    })

    expect(verification.valid).toBe(false)
    expect(verification.reason).toContain('não confere')

    const result = await processBillingWebhook({
      rawBody: payload,
      signatureHeader: forgedSignature,
      secret: TEST_SECRET,
    })

    expect(result.success).toBe(false)
    expect(result.statusCode).toBe(400)
    expect(result.error).toContain('Assinatura do webhook inválida')

    // Nenhuma fatura ou evento pode ser criado
    expect(inMemoryInvoices).toHaveLength(0)
    expect(inMemoryProcessedWebhooks).toHaveLength(0)
  })

  it('3. Replay Attack / Timestamp Expirado: rejeita webhooks fora da janela de tolerância de 5 minutos', async () => {
    const payload = JSON.stringify({
      id: 'evt_old_replay',
      type: 'invoice.paid',
      data: { object: { id: 'in_old' } },
    })

    // Timestamp de 15 minutos atrás (900 segundos)
    const oldTimestamp = Math.floor(Date.now() / 1000) - 900
    const oldSignature = generateTestStripeSignature(payload, TEST_SECRET, oldTimestamp)

    const verification = verifyStripeWebhookSignature({
      payload,
      signatureHeader: oldSignature,
      secret: TEST_SECRET,
      toleranceInSeconds: 300,
    })

    expect(verification.valid).toBe(false)
    expect(verification.reason).toContain('replay attack')

    const result = await processBillingWebhook({
      rawBody: payload,
      signatureHeader: oldSignature,
      secret: TEST_SECRET,
    })

    expect(result.success).toBe(false)
    expect(result.statusCode).toBe(400)
    expect(inMemoryProcessedWebhooks).toHaveLength(0)
  })

  // ========================================================
  // 2. IDEMPOTÊNCIA ESTRITA
  // ========================================================
  it('4. Idempotência: mesmo webhook enviado 3 vezes NÃO duplica Invoice, SubscriptionEvent ou transições', async () => {
    const payload = JSON.stringify({
      id: 'evt_stripe_idem_999',
      type: 'invoice.paid',
      data: {
        object: {
          id: 'in_unique_stripe_999',
          subscription: 'sub_stripe_prov_123',
          customer: 'cus_stripe_prov_123',
          amount_paid: 8990, // R$ 89,90
          currency: 'brl',
          period_start: Math.floor(Date.now() / 1000),
          period_end: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
        },
      },
    })

    const signature = generateTestStripeSignature(payload, TEST_SECRET)

    // 1º envio: Processamento inicial
    const res1 = await processBillingWebhook({ rawBody: payload, signatureHeader: signature, secret: TEST_SECRET })
    expect(res1.success).toBe(true)
    expect(res1.statusCode).toBe(200)
    expect(res1.duplicated).toBe(false)

    expect(inMemoryInvoices).toHaveLength(1)
    expect(inMemoryEvents).toHaveLength(1)
    expect(inMemoryProcessedWebhooks).toHaveLength(1)

    // 2º envio do MESMO evento
    const res2 = await processBillingWebhook({ rawBody: payload, signatureHeader: signature, secret: TEST_SECRET })
    expect(res2.success).toBe(true)
    expect(res2.statusCode).toBe(200)
    expect(res2.duplicated).toBe(true)

    // 3º envio do MESMO evento
    const res3 = await processBillingWebhook({ rawBody: payload, signatureHeader: signature, secret: TEST_SECRET })
    expect(res3.success).toBe(true)
    expect(res3.statusCode).toBe(200)
    expect(res3.duplicated).toBe(true)

    // ZERO duplicações
    expect(inMemoryInvoices).toHaveLength(1)
    expect(inMemoryEvents).toHaveLength(1)
    expect(inMemoryProcessedWebhooks).toHaveLength(1)
    expect(inMemoryInvoices[0].providerInvoiceId).toBe('in_unique_stripe_999')
  })

  // ========================================================
  // 3. EVENTOS: PAGAMENTO APROVADO & ATIVAÇÃO
  // ========================================================
  it('5. Pagamento aprovado via checkout.session.completed ativa assinatura (TRIALING -> ACTIVE)', async () => {
    const payload = JSON.stringify({
      id: 'evt_checkout_success_1',
      type: 'checkout.session.completed',
      data: {
        object: {
          client_reference_id: 'shop_vintage_1',
          customer: 'cus_stripe_new_99',
          subscription: 'sub_stripe_new_99',
          metadata: { planId: 'plan_premium' },
        },
      },
    })

    const signature = generateTestStripeSignature(payload, TEST_SECRET)
    const result = await processBillingWebhook({ rawBody: payload, signatureHeader: signature, secret: TEST_SECRET })

    expect(result.success).toBe(true)

    const sub = inMemorySubscriptions.find((s) => s.id === 'sub_shop_1')
    expect(sub.status).toBe('ACTIVE')
    expect(sub.planId).toBe('plan_premium')
    expect(sub.providerCustomerId).toBe('cus_stripe_new_99')
    expect(sub.providerSubscriptionId).toBe('sub_stripe_new_99')

    const activatedEvent = inMemoryEvents.find((e) => e.type === 'SUBSCRIPTION_ACTIVATED')
    expect(activatedEvent).toBeDefined()
    expect(activatedEvent.payload.activatedVia).toBe('checkout.session.completed')
  })

  it('6. Invoice Paga (invoice.paid) estende período e marca fatura como PAID', async () => {
    const futurePeriodEnd = Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60

    const payload = JSON.stringify({
      id: 'evt_inv_paid_1',
      type: 'invoice.paid',
      data: {
        object: {
          id: 'in_stripe_paid_123',
          subscription: 'sub_stripe_prov_123',
          amount_paid: 8990,
          currency: 'brl',
          period_start: Math.floor(Date.now() / 1000),
          period_end: futurePeriodEnd,
        },
      },
    })

    const signature = generateTestStripeSignature(payload, TEST_SECRET)
    const result = await processBillingWebhook({ rawBody: payload, signatureHeader: signature, secret: TEST_SECRET })

    expect(result.success).toBe(true)

    const invoice = inMemoryInvoices.find((i) => i.providerInvoiceId === 'in_stripe_paid_123')
    expect(invoice).toBeDefined()
    expect(invoice.status).toBe('PAID')
    expect(invoice.paidAt).toBeInstanceOf(Date)

    const sub = inMemorySubscriptions.find((s) => s.id === 'sub_shop_1')
    expect(sub.status).toBe('ACTIVE')
    expect(sub.currentPeriodEnd.getTime()).toBe(futurePeriodEnd * 1000)

    const payEvent = inMemoryEvents.find((e) => e.type === 'PAYMENT_SUCCEEDED')
    expect(payEvent).toBeDefined()
  })

  // ========================================================
  // 4. EVENTOS: PAGAMENTO RECUSADO (PAST_DUE & SUSPENDED)
  // ========================================================
  it('7. Pagamento recusado (invoice.payment_failed): 1ª tentativa transiciona ACTIVE -> PAST_DUE (Tolerância)', async () => {
    // Coloca a assinatura como ACTIVE
    inMemorySubscriptions[0].status = 'ACTIVE'

    const payload = JSON.stringify({
      id: 'evt_fail_attempt_1',
      type: 'invoice.payment_failed',
      data: {
        object: {
          id: 'in_stripe_fail_1',
          subscription: 'sub_stripe_prov_123',
          attempt_count: 1,
          next_payment_attempt: Math.floor(Date.now() / 1000) + 86400, // próxima tentativa amanhã
          amount_due: 8990,
          currency: 'brl',
        },
      },
    })

    const signature = generateTestStripeSignature(payload, TEST_SECRET)
    const result = await processBillingWebhook({ rawBody: payload, signatureHeader: signature, secret: TEST_SECRET })

    expect(result.success).toBe(true)

    const sub = inMemorySubscriptions.find((s) => s.id === 'sub_shop_1')
    expect(sub.status).toBe('PAST_DUE')

    const failedInvoice = inMemoryInvoices.find((i) => i.providerInvoiceId === 'in_stripe_fail_1')
    expect(failedInvoice).toBeDefined()
    expect(failedInvoice.status).toBe('FAILED')

    const failEvent = inMemoryEvents.find((e) => e.type === 'PAYMENT_FAILED')
    expect(failEvent).toBeDefined()
    expect(failEvent.payload.attemptCount).toBe(1)
  })

  it('8. Esgotamento de tentativas (invoice.payment_failed): 3ª tentativa sem próximo retry transiciona para SUSPENDED', async () => {
    inMemorySubscriptions[0].status = 'PAST_DUE'

    const payload = JSON.stringify({
      id: 'evt_fail_exhausted',
      type: 'invoice.payment_failed',
      data: {
        object: {
          id: 'in_stripe_exhausted',
          subscription: 'sub_stripe_prov_123',
          attempt_count: 3,
          next_payment_attempt: null, // Provedor encerrou régua de cobrança
          amount_due: 8990,
          currency: 'brl',
        },
      },
    })

    const signature = generateTestStripeSignature(payload, TEST_SECRET)
    const result = await processBillingWebhook({ rawBody: payload, signatureHeader: signature, secret: TEST_SECRET })

    expect(result.success).toBe(true)

    const sub = inMemorySubscriptions.find((s) => s.id === 'sub_shop_1')
    expect(sub.status).toBe('SUSPENDED')

    const suspendedEvent = inMemoryEvents.find((e) => e.type === 'SUBSCRIPTION_SUSPENDED')
    expect(suspendedEvent).toBeDefined()
  })

  // ========================================================
  // 5. EVENTOS: ASSINATURA CANCELADA
  // ========================================================
  it('9. Assinatura cancelada (customer.subscription.deleted) transiciona para CANCELED', async () => {
    inMemorySubscriptions[0].status = 'ACTIVE'

    const payload = JSON.stringify({
      id: 'evt_sub_deleted_1',
      type: 'customer.subscription.deleted',
      data: {
        object: {
          id: 'sub_stripe_prov_123',
        },
      },
    })

    const signature = generateTestStripeSignature(payload, TEST_SECRET)
    const result = await processBillingWebhook({ rawBody: payload, signatureHeader: signature, secret: TEST_SECRET })

    expect(result.success).toBe(true)

    const sub = inMemorySubscriptions.find((s) => s.id === 'sub_shop_1')
    expect(sub.status).toBe('CANCELED')
    expect(sub.canceledAt).toBeInstanceOf(Date)

    const cancelEvent = inMemoryEvents.find((e) => e.type === 'SUBSCRIPTION_CANCELED')
    expect(cancelEvent).toBeDefined()
  })

  // ========================================================
  // 6. MÁQUINA DE ESTADOS: TRANSIÇÕES PROIBIDAS
  // ========================================================
  it('10. Máquina de Estados: impede transições arbitrárias ou proibidas (ex: CANCELED -> PAST_DUE)', async () => {
    inMemorySubscriptions[0].status = 'CANCELED'

    expect(isValidStatusTransition('CANCELED', 'PAST_DUE')).toBe(false)
    expect(isValidStatusTransition('CANCELED', 'SUSPENDED')).toBe(false)
    expect(isValidStatusTransition('SUSPENDED', 'PAST_DUE')).toBe(false)
    expect(isValidStatusTransition('TRIALING', 'ACTIVE')).toBe(true)
    expect(isValidStatusTransition('ACTIVE', 'PAST_DUE')).toBe(true)

    await expect(
      transitionSubscriptionStatus('sub_shop_1', 'PAST_DUE')
    ).rejects.toThrow('Transição de status inválida')

    // O status continua estritamente CANCELED
    const sub = inMemorySubscriptions.find((s) => s.id === 'sub_shop_1')
    expect(sub.status).toBe('CANCELED')
  })

  // ========================================================
  // 7. ENDPOINT HTTP: POST /api/webhooks/billing
  // ========================================================
  it('11. Rota HTTP POST /api/webhooks/billing: responde 200 para webhook assinado e 400 para não assinado', async () => {
    const payload = JSON.stringify({
      id: 'evt_http_test_1',
      type: 'invoice.paid',
      data: {
        object: {
          id: 'in_http_test_1',
          subscription: 'sub_stripe_prov_123',
          amount_paid: 8990,
        },
      },
    })

    // Requisição SEM assinatura
    const reqNoSig = new NextRequest('http://localhost:3000/api/webhooks/billing', {
      method: 'POST',
      body: payload,
    })
    const resNoSig = await postWebhookBilling(reqNoSig)
    expect(resNoSig.status).toBe(400)

    // Requisição COM assinatura válida
    const signature = generateTestStripeSignature(payload, TEST_SECRET)
    const reqValid = new NextRequest('http://localhost:3000/api/webhooks/billing', {
      method: 'POST',
      body: payload,
      headers: {
        'stripe-signature': signature,
        'Content-Type': 'application/json',
      },
    })
    const resValid = await postWebhookBilling(reqValid)
    expect(resValid.status).toBe(200)

    const json = await resValid.json()
    expect(json.received).toBe(true)
    expect(json.eventId).toBe('evt_http_test_1')
  })

  // ========================================================
  // 8. ENDPOINT HTTP: POST /api/billing/checkout
  // ========================================================
  it('12. Rota HTTP POST /api/billing/checkout: ADMIN cria sessão de checkout com Hosted Checkout seguro', async () => {
    // 1. Visitante sem login é bloqueado
    const reqUnauth = new NextRequest('http://localhost:3000/api/billing/checkout', {
      method: 'POST',
      body: JSON.stringify({ planId: 'plan_pro' }),
    })
    const resUnauth = await postBillingCheckout(reqUnauth)
    expect(resUnauth.status).toBe(403)

    // 2. ADMIN autenticado da barbearia cria checkout
    mockAuthUser = {
      id: 'user_admin_1',
      role: 'ADMIN',
      barbershopId: 'shop_vintage_1',
      email: 'admin@vintage.com',
    }

    const reqAuth = new NextRequest('http://localhost:3000/api/billing/checkout', {
      method: 'POST',
      body: JSON.stringify({
        planId: 'plan_pro',
        successUrl: 'http://localhost:3000/dashboard?payment=success',
        cancelUrl: 'http://localhost:3000/dashboard?payment=cancel',
      }),
    })

    const resAuth = await postBillingCheckout(reqAuth)
    expect(resAuth.status).toBe(200)

    const json = await resAuth.json()
    expect(json.checkoutUrl).toBeDefined()
    expect(json.sessionId).toBeDefined()
    expect(json.provider).toBe('STRIPE')
    expect(json.plan.id).toBe('plan_pro')

    // NUNCA ativa a assinatura pelo checkout da tela! Apenas o webhook pode ativar.
    const sub = inMemorySubscriptions.find((s) => s.id === 'sub_shop_1')
    expect(sub.status).toBe('TRIALING')
  })
})
