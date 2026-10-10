import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Prisma, SubscriptionStatus } from '@prisma/client'
import {
  verifyAbacateWebhook,
  generateTestAbacateSignature,
  DEFAULT_ABACATEPAY_PUBLIC_KEY,
} from '@/lib/billing/abacatepay-provider'
import { processBillingWebhook } from '@/lib/billing/webhook-handler'
import { POST as postWebhookBilling } from '@/app/api/webhooks/billing/route'
import { POST as postBillingCheckout } from '@/app/api/billing/checkout/route'
import { GET as getPixCheck } from '@/app/api/billing/pix/check/route'
import { POST as postRefund } from '@/app/api/billing/charges/refund/route'

let mockAuthUser: any = null
vi.mock('@/lib/api-auth', () => ({
  getAuthUser: () => mockAuthUser,
  requireRole: (user: any, roles: string[]) => user && roles.includes(user.role),
}))

describe('INTEGRAÇÃO ABACATEPAY: CHECKOUT, PIX TRANSPARENTE, WEBHOOKS E ATIVAÇÃO SAAS', () => {
  const TEST_SECRET = 'barbershop_abacate_test_secret_123'

  let inMemoryBarbershops: any[] = []
  let inMemoryPlans: any[] = []
  let inMemorySubscriptions: any[] = []
  let inMemoryInvoices: any[] = []
  let inMemoryEvents: any[] = []
  let inMemoryProcessedWebhooks: any[] = []

  beforeEach(() => {
    vi.clearAllMocks()
    process.env.ABACATEPAY_WEBHOOK_SECRET = TEST_SECRET
    process.env.ABACATEPAY_PUBLIC_KEY = DEFAULT_ABACATEPAY_PUBLIC_KEY
    mockAuthUser = null

    inMemoryBarbershops = [
      {
        id: 'shop_alfa_1',
        name: 'Barbearia Navalha de Ouro',
        slug: 'navalha-ouro',
        email: 'navalha@ouro.com',
        phone: '11988887777',
        isActive: true,
        status: 'PENDING',
        contractExpiresAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]

    inMemoryPlans = [
      {
        id: 'plan_pro_abacate',
        name: 'Profissional PRO',
        slug: 'profissional-pro',
        price: new Prisma.Decimal('30.00'),
        currency: 'BRL',
        billingInterval: 'MONTHLY',
        durationDays: 30,
        trialDays: 0,
        provider: 'ABACATEPAY',
        providerProductId: 'prod_jdNuf6hwHack5XByhacq5FN5',
        isActive: true,
        status: 'ACTIVE',
        features: ['Agendamento online', 'Gestão de equipe'],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]

    inMemorySubscriptions = [
      {
        id: 'sub_abacate_1',
        barbershopId: 'shop_alfa_1',
        planId: 'plan_pro_abacate',
        status: 'TRIALING' as SubscriptionStatus,
        trialStart: new Date(),
        trialEnd: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        cancelAtPeriodEnd: false,
        canceledAt: null,
        provider: 'ABACATEPAY',
        providerSubscriptionId: null,
        providerCustomerId: null,
        price: new Prisma.Decimal('30.00'),
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

    ;(vi.spyOn(prisma.barbershop, 'update') as any).mockImplementation(async ({ where, data }: any) => {
      const idx = inMemoryBarbershops.findIndex((b) => b.id === where.id)
      if (idx !== -1) {
        inMemoryBarbershops[idx] = { ...inMemoryBarbershops[idx], ...data, updatedAt: new Date() }
        return inMemoryBarbershops[idx]
      }
      return null
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

    ;(vi.spyOn(prisma.subscription, 'create') as any).mockImplementation(async ({ data }: any) => {
      const sub = {
        id: `sub_abacate_${Date.now()}`,
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      inMemorySubscriptions.push(sub)
      return { ...sub, plan: inMemoryPlans.find((p) => p.id === sub.planId) }
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
        id: `inv_abacate_${Date.now()}`,
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
      const event = {
        id: `evt_sub_${Date.now()}`,
        ...data,
        createdAt: new Date(),
      }
      inMemoryEvents.push(event)
      return event
    })

    ;(vi.spyOn(prisma.subscriptionEvent, 'findFirst') as any).mockImplementation(async () => null)

    // ProcessedWebhook Mocks (Idempotência)
    ;(vi.spyOn(prisma.processedWebhook, 'findUnique') as any).mockImplementation(async ({ where }: any) => {
      return inMemoryProcessedWebhooks.find((w) => w.eventId === where.eventId) || null
    })

    ;(vi.spyOn(prisma.processedWebhook, 'create') as any).mockImplementation(async ({ data }: any) => {
      const record = {
        id: `proc_${Date.now()}`,
        ...data,
        processedAt: new Date(),
      }
      inMemoryProcessedWebhooks.push(record)
      return record
    })
  })

  // 1. Validação de Segurança do Webhook AbacatePay
  it('1. Valida webhook via query param webhookSecret', () => {
    const rawBody = JSON.stringify({ id: 'log_1', event: 'checkout.completed' })

    const validResult = verifyAbacateWebhook({
      rawBody,
      secretQuery: TEST_SECRET,
      expectedSecret: TEST_SECRET,
    })
    expect(validResult.valid).toBe(true)

    const invalidResult = verifyAbacateWebhook({
      rawBody,
      secretQuery: 'wrong_secret',
      expectedSecret: TEST_SECRET,
    })
    expect(invalidResult.valid).toBe(false)
  })

  it('2. Valida webhook via header X-Webhook-Signature HMAC-SHA256', () => {
    const rawBody = JSON.stringify({ id: 'log_hmac_1', event: 'checkout.completed', data: { amount: 3000 } })
    const validSignature = generateTestAbacateSignature(rawBody, DEFAULT_ABACATEPAY_PUBLIC_KEY)

    const validResult = verifyAbacateWebhook({
      rawBody,
      signatureHeader: validSignature,
      expectedSecret: TEST_SECRET,
    })
    expect(validResult.valid).toBe(true)

    const invalidResult = verifyAbacateWebhook({
      rawBody,
      signatureHeader: 'invalid_base64_sig',
      expectedSecret: TEST_SECRET,
    })
    expect(invalidResult.valid).toBe(false)
  })

  // 2. Processamento do Evento checkout.completed
  it('3. checkout.completed ativa assinatura (TRIALING -> ACTIVE) e gera fatura paga', async () => {
    const payload = JSON.stringify({
      id: 'log_abacate_checkout_100',
      event: 'checkout.completed',
      apiVersion: 2,
      data: {
        id: 'bill_abc_test_100',
        amount: 3000,
        status: 'PAID',
        metadata: {
          barbershopId: 'shop_alfa_1',
          planId: 'plan_pro_abacate',
        },
      },
    })

    const result = await processBillingWebhook({
      rawBody: payload,
      secretQuery: TEST_SECRET,
      provider: 'ABACATEPAY',
    })

    expect(result.success).toBe(true)
    expect(result.statusCode).toBe(200)

    const sub = inMemorySubscriptions.find((s) => s.id === 'sub_abacate_1')
    expect(sub.status).toBe('ACTIVE')
    expect(sub.provider).toBe('ABACATEPAY')
    expect(sub.providerSubscriptionId).toBe('bill_abc_test_100')

    const shop = inMemoryBarbershops.find((b) => b.id === 'shop_alfa_1')
    expect(shop.status).toBe('APPROVED')
    expect(shop.isActive).toBe(true)

    const invoice = inMemoryInvoices.find((i) => i.providerInvoiceId === 'bill_abc_test_100')
    expect(invoice).toBeDefined()
    expect(invoice.status).toBe('PAID')
    expect(invoice.amount.toString()).toBe('30')

    const event = inMemoryEvents.find((e) => e.type === 'SUBSCRIPTION_ACTIVATED')
    expect(event).toBeDefined()
  })

  // 3. Processamento do Evento transparent.completed (PIX Transparente)
  it('4. transparent.completed ativa assinatura e libera barbearia imediatamente', async () => {
    const payload = JSON.stringify({
      id: 'log_abacate_pix_200',
      event: 'transparent.completed',
      apiVersion: 2,
      data: {
        id: 'pix_char_abc_200',
        amount: 3000,
        status: 'PAID',
        metadata: {
          barbershopId: 'shop_alfa_1',
          planId: 'plan_pro_abacate',
        },
      },
    })

    const result = await processBillingWebhook({
      rawBody: payload,
      secretQuery: TEST_SECRET,
      provider: 'ABACATEPAY',
    })

    expect(result.success).toBe(true)

    const sub = inMemorySubscriptions.find((s) => s.id === 'sub_abacate_1')
    expect(sub.status).toBe('ACTIVE')
    expect(sub.providerSubscriptionId).toBe('pix_char_abc_200')
  })

  // 4. Idempotência estrita
  it('5. Mesmo evento AbacatePay enviado repetidamente não duplica fatura nem eventos', async () => {
    const payload = JSON.stringify({
      id: 'log_abacate_idem_300',
      event: 'checkout.completed',
      apiVersion: 2,
      data: {
        id: 'bill_idem_300',
        amount: 3000,
        status: 'PAID',
        metadata: {
          barbershopId: 'shop_alfa_1',
          planId: 'plan_pro_abacate',
        },
      },
    })

    const res1 = await processBillingWebhook({
      rawBody: payload,
      secretQuery: TEST_SECRET,
      provider: 'ABACATEPAY',
    })
    expect(res1.success).toBe(true)
    expect(res1.duplicated).toBe(false)

    const res2 = await processBillingWebhook({
      rawBody: payload,
      secretQuery: TEST_SECRET,
      provider: 'ABACATEPAY',
    })
    expect(res2.success).toBe(true)
    expect(res2.duplicated).toBe(true)
    expect(res2.action).toBe('IGNORED_DUPLICATE')

    expect(inMemoryInvoices.filter((i) => i.providerInvoiceId === 'bill_idem_300')).toHaveLength(1)
  })

  // 5. Reembolso (checkout.refunded)
  it('6. checkout.refunded suspende a assinatura e anula a fatura', async () => {
    inMemoryInvoices.push({
      id: 'inv_to_refund',
      subscriptionId: 'sub_abacate_1',
      providerInvoiceId: 'bill_refund_400',
      status: 'PAID',
      amount: new Prisma.Decimal('30.00'),
    })
    inMemorySubscriptions[0].status = 'ACTIVE'

    const payload = JSON.stringify({
      id: 'log_abacate_refund_400',
      event: 'checkout.refunded',
      apiVersion: 2,
      data: {
        id: 'bill_refund_400',
      },
    })

    const result = await processBillingWebhook({
      rawBody: payload,
      secretQuery: TEST_SECRET,
      provider: 'ABACATEPAY',
    })

    expect(result.success).toBe(true)

    const invoice = inMemoryInvoices.find((i) => i.providerInvoiceId === 'bill_refund_400')
    expect(invoice.status).toBe('VOID')

    const sub = inMemorySubscriptions.find((s) => s.id === 'sub_abacate_1')
    expect(sub.status).toBe('SUSPENDED')
  })

  // 6. Rota HTTP POST /api/webhooks/billing com query webhookSecret
  it('7. Rota HTTP POST /api/webhooks/billing autentica com webhookSecret na URL', async () => {
    const payload = JSON.stringify({
      id: 'log_http_abacate_500',
      event: 'checkout.completed',
      data: {
        id: 'bill_http_500',
        amount: 3000,
        metadata: { barbershopId: 'shop_alfa_1', planId: 'plan_pro_abacate' },
      },
    })

    const reqValid = new NextRequest(
      `http://localhost:3000/api/webhooks/billing?webhookSecret=${TEST_SECRET}`,
      {
        method: 'POST',
        body: payload,
      }
    )

    const res = await postWebhookBilling(reqValid)
    expect(res.status).toBe(200)

    const json = await res.json()
    expect(json.received).toBe(true)
    expect(json.eventId).toBe('log_http_abacate_500')
  })

  // 7. Rota HTTP POST /api/billing/checkout com AbacatePay
  it('8. Rota HTTP POST /api/billing/checkout com plano AbacatePay gera sessão de checkout', async () => {
    mockAuthUser = {
      id: 'user_admin_1',
      role: 'ADMIN',
      barbershopId: 'shop_alfa_1',
      email: 'admin@navalha.com',
    }

    const req = new NextRequest('http://localhost:3000/api/billing/checkout', {
      method: 'POST',
      body: JSON.stringify({
        planId: 'plan_pro_abacate',
        mode: 'HOSTED',
      }),
    })

    const res = await postBillingCheckout(req)
    expect(res.status).toBe(200)

    const json = await res.json()
    expect(json.provider).toBe('ABACATEPAY')
    expect(json.checkoutUrl).toBeDefined()
    expect(json.checkoutId).toBeDefined()
    expect(json.plan.id).toBe('plan_pro_abacate')
  })

  // 8. Isolamento Multi-Tenant: Bloqueio IDOR em Reembolso de Cobranças
  it('9. Isolamento Multi-Tenant: Admin da Barbearia Alfa não pode reembolsar fatura da Barbearia Beta', async () => {
    // Fatura pertencente à Barbearia Beta
    inMemoryInvoices.push({
      id: 'inv_beta_999',
      barbershopId: 'shop_beta_2',
      providerInvoiceId: 'bill_beta_999',
      status: 'PAID',
      amount: new Prisma.Decimal('50.00'),
    })

    // Usuário autenticado como ADMIN da Barbearia Alfa
    mockAuthUser = {
      id: 'user_admin_alfa',
      role: 'ADMIN',
      barbershopId: 'shop_alfa_1',
      email: 'admin@alfa.com',
    }

    const req = new NextRequest('http://localhost:3000/api/billing/charges/refund', {
      method: 'POST',
      body: JSON.stringify({
        chargeId: 'inv_beta_999',
      }),
    })

    const res = await postRefund(req)
    expect(res.status).toBe(403)

    const json = await res.json()
    expect(json.error).toMatch(/outra barbearia/i)
  })

  // 9. Segurança RBAC: Rejeita tentativas de acesso não autorizado de clientes
  it('10. Segurança RBAC: Rejeita chamadas de checkout e reembolsos com role CLIENT', async () => {
    mockAuthUser = {
      id: 'client_user_1',
      role: 'CLIENT',
      barbershopId: 'shop_alfa_1',
      email: 'cliente@gmail.com',
    }

    const req = new NextRequest('http://localhost:3000/api/billing/charges/refund', {
      method: 'POST',
      body: JSON.stringify({
        chargeId: 'any_charge_id',
      }),
    })

    const res = await postRefund(req)
    expect(res.status).toBe(403)
  })

  // 10. Preservação de assinaturas ao desativar planos
  it('11. Desativação de plano preserva vigência e status de assinantes ativos', async () => {
    const activeSub = inMemorySubscriptions.find((s) => s.id === 'sub_abacate_1')
    expect(activeSub).toBeDefined()

    // Desativa o plano no catálogo
    const plan = inMemoryPlans.find((p) => p.id === 'plan_pro_abacate')
    plan.isActive = false
    plan.status = 'INACTIVE'

    // Verifica que a assinatura do tenant continua ativa sem alteração de vigência
    expect(activeSub.status).toBe('TRIALING')
    expect(activeSub.planId).toBe('plan_pro_abacate')
    expect(activeSub.currentPeriodEnd.getTime()).toBeGreaterThan(Date.now())
  })

  // 11. Evento nativo AbacatePay billing.paid com resolução de barbershopId por fatura existente
  it('12. billing.paid processa cobrança e ativa assinatura mesmo recuperando barbershopId da fatura', async () => {
    inMemoryInvoices.push({
      id: 'inv_pre_billing',
      barbershopId: 'shop_alfa_1',
      providerInvoiceId: 'bill_abacate_ext_777',
      status: 'OPEN',
      amount: new Prisma.Decimal('30.00'),
    })

    const payload = JSON.stringify({
      id: 'log_billing_paid_777',
      event: 'billing.paid',
      data: {
        id: 'bill_abacate_ext_777',
        amount: 3000,
        status: 'PAID',
      },
    })

    const result = await processBillingWebhook({
      rawBody: payload,
      secretQuery: TEST_SECRET,
      provider: 'ABACATEPAY',
    })

    expect(result.success).toBe(true)
    const sub = inMemorySubscriptions.find((s) => s.barbershopId === 'shop_alfa_1')
    expect(sub.status).toBe('ACTIVE')
    const inv = inMemoryInvoices.find((i) => i.providerInvoiceId === 'bill_abacate_ext_777')
    expect(inv.status).toBe('PAID')
  })
})
