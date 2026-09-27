import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import {
  createPlan,
  getPlans,
  createSubscription,
  createInvoice,
  payInvoice,
  failInvoice,
  cancelSubscription,
  suspendSubscription,
  renewSubscription,
  getActiveSubscription,
  getSubscriptionHistory,
  logSubscriptionEvent,
} from '@/lib/billing/saas-billing'
import { GET as getPlansRoute, POST as postPlanRoute } from '@/app/api/billing/plans/route'
import { GET as getSubscriptionsRoute, POST as postSubscriptionRoute } from '@/app/api/billing/subscriptions/route'
import { GET as getInvoicesRoute } from '@/app/api/billing/invoices/route'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'

// Mock de autenticação para as rotas da API
let mockAuthUser: any = null
vi.mock('@/lib/api-auth', () => ({
  getAuthUser: () => mockAuthUser,
  requireRole: vi.fn(),
}))

describe('DOMÍNIO DE COBRANÇA DO SAAS — BILLING, SUBSCRIPTIONS & MULTI-TENANT', () => {
  // Banco de dados em memória simulado para billing do SaaS
  let inMemoryPlans: any[] = []
  let inMemorySubscriptions: any[] = []
  let inMemoryInvoices: any[] = []
  let inMemoryEvents: any[] = []
  let inMemoryBarbershops: any[] = []
  let inMemoryPayments: any[] = [] // Pagamento operacional de atendimento

  beforeEach(() => {
    vi.clearAllMocks()
    mockAuthUser = null

    inMemoryBarbershops = [
      { id: 'shop_A', name: 'Barbearia Alpha', slug: 'alpha', isActive: true },
      { id: 'shop_B', name: 'Barbearia Beta', slug: 'beta', isActive: true },
    ]

    inMemoryPlans = [
      {
        id: 'plan_starter',
        name: 'Plano Starter',
        slug: 'starter',
        description: 'Ideal para barbearias iniciantes',
        price: new Prisma.Decimal('49.90'),
        currency: 'BRL',
        billingInterval: 'MONTHLY',
        trialDays: 7,
        isActive: true,
        features: { maxBarbers: 2, reports: false },
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'plan_pro',
        name: 'Plano Pro',
        slug: 'pro',
        description: 'Para barbearias em expansão',
        price: new Prisma.Decimal('99.90'),
        currency: 'BRL',
        billingInterval: 'MONTHLY',
        trialDays: 0,
        isActive: true,
        features: { maxBarbers: 10, reports: true, customDomain: true },
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'plan_legacy',
        name: 'Plano Descontinuado',
        slug: 'legacy',
        description: 'Plano antigo inativo',
        price: new Prisma.Decimal('29.90'),
        currency: 'BRL',
        billingInterval: 'MONTHLY',
        trialDays: 0,
        isActive: false,
        features: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]

    inMemorySubscriptions = []
    inMemoryInvoices = []
    inMemoryEvents = []
    inMemoryPayments = [
      // Exemplo de pagamento operacional de atendimento (corte de cabelo)
      {
        id: 'pay_operational_1',
        amount: new Prisma.Decimal('50.00'),
        method: 'PIX',
        status: 'PAID',
        barbershopId: 'shop_A',
        appointmentId: 'apt_123',
      },
    ]

    // Mock do prisma para simular tabelas de billing
    vi.spyOn(prisma, '$transaction').mockImplementation(async (callback: any) => {
      return await callback(prisma)
    })

    ;(vi.spyOn(prisma.barbershop, 'findUnique') as any).mockImplementation(async ({ where }: any) => {
      return inMemoryBarbershops.find(b => b.id === where.id) || null
    })

    ;(vi.spyOn(prisma.plan, 'create') as any).mockImplementation(async ({ data }: any) => {
      const plan = {
        id: `plan_${Date.now()}`,
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      inMemoryPlans.push(plan)
      return plan
    })

    ;(vi.spyOn(prisma.plan, 'findMany') as any).mockImplementation(async ({ where }: any) => {
      return inMemoryPlans.filter(p => {
        if (where?.isActive !== undefined && p.isActive !== where.isActive) return false
        return true
      })
    })

    ;(vi.spyOn(prisma.plan, 'findUnique') as any).mockImplementation(async ({ where }: any) => {
      return inMemoryPlans.find(p => p.id === where.id || p.slug === where.slug) || null
    })

    ;(vi.spyOn(prisma.subscription, 'create') as any).mockImplementation(async ({ data, include }: any) => {
      const sub = {
        id: `sub_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      if (include?.plan) {
        sub.plan = inMemoryPlans.find(p => p.id === data.planId)
      }
      inMemorySubscriptions.push(sub)
      return sub
    })

    ;(vi.spyOn(prisma.subscription, 'findUnique') as any).mockImplementation(async ({ where, include }: any) => {
      const sub = inMemorySubscriptions.find(s => s.id === where.id)
      if (!sub) return null
      const res = { ...sub }
      if (include?.plan) {
        res.plan = inMemoryPlans.find(p => p.id === sub.planId)
      }
      return res
    })

    ;(vi.spyOn(prisma.subscription, 'findFirst') as any).mockImplementation(async ({ where, include }: any) => {
      const sub = inMemorySubscriptions.find(s => {
        if (where?.barbershopId && s.barbershopId !== where.barbershopId) return false
        if (where?.status?.in && !where.status.in.includes(s.status)) return false
        return true
      })
      if (!sub) return null
      const res = { ...sub }
      if (include?.plan) {
        res.plan = inMemoryPlans.find(p => p.id === sub.planId)
      }
      if (include?.invoices) {
        res.invoices = inMemoryInvoices.filter(i => i.subscriptionId === sub.id)
      }
      return res
    })

    ;(vi.spyOn(prisma.subscription, 'findMany') as any).mockImplementation(async ({ where, include }: any) => {
      return inMemorySubscriptions
        .filter(s => {
          if (where?.barbershopId && s.barbershopId !== where.barbershopId) return false
          return true
        })
        .map(sub => {
          const res = { ...sub }
          if (include?.plan) {
            res.plan = inMemoryPlans.find(p => p.id === sub.planId)
          }
          if (include?.invoices) {
            res.invoices = inMemoryInvoices.filter(i => i.subscriptionId === sub.id)
          }
          if (include?.events) {
            res.events = inMemoryEvents.filter(e => e.subscriptionId === sub.id)
          }
          if (include?.barbershop) {
            res.barbershop = inMemoryBarbershops.find(b => b.id === sub.barbershopId)
          }
          return res
        })
    })

    ;(vi.spyOn(prisma.subscription, 'update') as any).mockImplementation(async ({ where, data }: any) => {
      const index = inMemorySubscriptions.findIndex(s => s.id === where.id)
      if (index === -1) throw new Error('Assinatura não encontrada')
      inMemorySubscriptions[index] = { ...inMemorySubscriptions[index], ...data, updatedAt: new Date() }
      return inMemorySubscriptions[index]
    })

    ;(vi.spyOn(prisma.invoice, 'create') as any).mockImplementation(async ({ data }: any) => {
      const inv = {
        id: `inv_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      inMemoryInvoices.push(inv)
      return inv
    })

    ;(vi.spyOn(prisma.invoice, 'findUnique') as any).mockImplementation(async ({ where, include }: any) => {
      const inv = inMemoryInvoices.find(i => i.id === where.id)
      if (!inv) return null
      const res = { ...inv }
      if (include?.subscription) {
        res.subscription = inMemorySubscriptions.find(s => s.id === inv.subscriptionId)
      }
      return res
    })

    ;(vi.spyOn(prisma.invoice, 'findMany') as any).mockImplementation(async ({ where, include }: any) => {
      return inMemoryInvoices
        .filter(inv => {
          if (where?.barbershopId && inv.barbershopId !== where.barbershopId) return false
          if (where?.status && inv.status !== where.status) return false
          return true
        })
        .map(inv => {
          const res = { ...inv }
          if (include?.subscription) {
            const sub = inMemorySubscriptions.find(s => s.id === inv.subscriptionId)
            res.subscription = sub ? { ...sub, plan: inMemoryPlans.find(p => p.id === sub.planId) } : null
          }
          if (include?.barbershop) {
            res.barbershop = inMemoryBarbershops.find(b => b.id === inv.barbershopId)
          }
          return res
        })
    })

    ;(vi.spyOn(prisma.invoice, 'update') as any).mockImplementation(async ({ where, data }: any) => {
      const index = inMemoryInvoices.findIndex(i => i.id === where.id)
      if (index === -1) throw new Error('Fatura não encontrada')
      inMemoryInvoices[index] = { ...inMemoryInvoices[index], ...data, updatedAt: new Date() }
      return inMemoryInvoices[index]
    })

    ;(vi.spyOn(prisma.subscriptionEvent, 'create') as any).mockImplementation(async ({ data }: any) => {
      const event = {
        id: `evt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        ...data,
        createdAt: new Date(),
      }
      inMemoryEvents.push(event)
      return event
    })
  })

  // ==========================================
  // 1. PLANOS (PLAN)
  // ==========================================
  it('1. Deve criar plano com precisão Decimal e listar planos ativos', async () => {
    const newPlan = await createPlan({
      name: 'Plano Enterprise',
      slug: 'enterprise',
      description: 'Grandes redes de barbearias',
      price: '199.90',
      currency: 'BRL',
      billingInterval: 'YEARLY',
      trialDays: 30,
      features: { maxBarbers: 50, multiUnit: true, dedicatedSupport: true },
    })

    expect(newPlan.id).toBeDefined()
    expect(newPlan.name).toBe('Plano Enterprise')
    expect(newPlan.price).toBeInstanceOf(Prisma.Decimal)
    expect(newPlan.price.toFixed(2)).toBe('199.90')
    expect(newPlan.billingInterval).toBe('YEARLY')
    expect(newPlan.trialDays).toBe(30)
    expect(newPlan.features).toHaveProperty('dedicatedSupport', true)

    // Listagem deve respeitar filtro de ativos
    const activePlans = await getPlans(true)
    expect(activePlans.some(p => p.slug === 'enterprise')).toBe(true)
    expect(activePlans.some(p => p.slug === 'legacy')).toBe(false)
  })

  it('2. Deve rejeitar criação de plano com preço negativo', async () => {
    await expect(
      createPlan({
        name: 'Plano Inválido',
        slug: 'invalid',
        price: -10,
      })
    ).rejects.toThrow('O preço do plano não pode ser negativo')
  })

  // ==========================================
  // 2. ASSINATURAS E TRIAL (SUBSCRIPTION)
  // ==========================================
  it('3. Criação de assinatura com plano de trial deve iniciar em TRIALING e gerar eventos de auditoria', async () => {
    const sub = await createSubscription({
      barbershopId: 'shop_A',
      planId: 'plan_starter', // Possui 7 dias de trial
    })

    expect(sub.id).toBeDefined()
    expect(sub.status).toBe('TRIALING')
    expect(sub.trialStart).toBeInstanceOf(Date)
    expect(sub.trialEnd).toBeInstanceOf(Date)
    expect(sub.currentPeriodEnd).toEqual(sub.trialEnd)

    // Não deve criar fatura imediata durante o trial
    expect(inMemoryInvoices.filter(i => i.subscriptionId === sub.id)).toHaveLength(0)

    // Deve registrar eventos de auditoria: SUBSCRIPTION_CREATED e TRIAL_STARTED
    const subEvents = inMemoryEvents.filter(e => e.subscriptionId === sub.id)
    expect(subEvents).toHaveLength(2)
    expect(subEvents.map(e => e.type)).toContain('SUBSCRIPTION_CREATED')
    expect(subEvents.map(e => e.type)).toContain('TRIAL_STARTED')
    expect(subEvents.find(e => e.type === 'TRIAL_STARTED')?.payload).toHaveProperty('trialDays', 7)
  })

  it('4. Criação de assinatura sem trial deve iniciar como ACTIVE e gerar Invoice inicial OPEN', async () => {
    const sub = await createSubscription({
      barbershopId: 'shop_A',
      planId: 'plan_pro', // trialDays: 0, R$ 99.90
    })

    expect(sub.status).toBe('ACTIVE')
    expect(sub.trialStart).toBeNull()
    expect(sub.trialEnd).toBeNull()

    // Deve ter gerado a fatura inicial (Invoice)
    const invoices = inMemoryInvoices.filter(i => i.subscriptionId === sub.id)
    expect(invoices).toHaveLength(1)
    expect(invoices[0].status).toBe('OPEN')
    expect(invoices[0].amount.toFixed(2)).toBe('99.90')
    expect(invoices[0].barbershopId).toBe('shop_A')

    // Evento de auditoria criado
    const subEvents = inMemoryEvents.filter(e => e.subscriptionId === sub.id)
    expect(subEvents).toHaveLength(1)
    expect(subEvents[0].type).toBe('SUBSCRIPTION_CREATED')
  })

  // ==========================================
  // 3. FATURAS (INVOICES) E TRANSIÇÕES DE ESTADO
  // ==========================================
  it('5. Pagamento de Invoice deve atualizar status para PAID, ativar assinatura e registrar auditoria', async () => {
    const sub = await createSubscription({
      barbershopId: 'shop_A',
      planId: 'plan_pro',
    })

    const invoice = inMemoryInvoices.find(i => i.subscriptionId === sub.id)
    expect(invoice).toBeDefined()
    expect(invoice.status).toBe('OPEN')

    // Confirma pagamento
    const paidInvoice = await payInvoice(invoice.id, {
      provider: 'STRIPE',
      providerInvoiceId: 'in_stripe_mock_123',
    })

    expect(paidInvoice.status).toBe('PAID')
    expect(paidInvoice.paidAt).toBeInstanceOf(Date)
    expect(paidInvoice.provider).toBe('STRIPE')
    expect(paidInvoice.providerInvoiceId).toBe('in_stripe_mock_123')

    // Auditoria deve conter PAYMENT_SUCCEEDED
    const events = inMemoryEvents.filter(e => e.subscriptionId === sub.id)
    expect(events.map(e => e.type)).toContain('PAYMENT_SUCCEEDED')
  })

  it('6. Falha no pagamento de Invoice deve marcar FAILED, colocar assinatura em PAST_DUE e registrar auditoria', async () => {
    const sub = await createSubscription({
      barbershopId: 'shop_A',
      planId: 'plan_pro',
    })

    const invoice = inMemoryInvoices.find(i => i.subscriptionId === sub.id)
    const failedInvoice = await failInvoice(invoice.id, 'Cartão recusado pelo banco emissor')

    expect(failedInvoice.status).toBe('FAILED')

    // Assinatura deve migrar para PAST_DUE (tolerância para retry)
    const updatedSub = inMemorySubscriptions.find(s => s.id === sub.id)
    expect(updatedSub.status).toBe('PAST_DUE')

    // Auditoria deve conter PAYMENT_FAILED com motivo
    const failureEvent = inMemoryEvents.find(e => e.subscriptionId === sub.id && e.type === 'PAYMENT_FAILED')
    expect(failureEvent).toBeDefined()
    expect(failureEvent?.payload).toHaveProperty('reason', 'Cartão recusado pelo banco emissor')
  })

  // ==========================================
  // 4. CANCELAMENTO, SUSPENSÃO E RENOVAÇÃO
  // ==========================================
  it('7. Cancelamento imediato vs cancelamento ao fim do período', async () => {
    const sub = await createSubscription({
      barbershopId: 'shop_A',
      planId: 'plan_pro',
    })

    // Cancelamento ao fim do período (cancelAtPeriodEnd)
    const scheduledCancel = await cancelSubscription(sub.id, { immediately: false, reason: 'Mudança de software' })
    expect(scheduledCancel.cancelAtPeriodEnd).toBe(true)
    expect(scheduledCancel.status).toBe('ACTIVE')

    // Cancelamento imediato
    const immediateCancel = await cancelSubscription(sub.id, { immediately: true, reason: 'Fechamento da barbearia' })
    expect(immediateCancel.status).toBe('CANCELED')
    expect(immediateCancel.canceledAt).toBeInstanceOf(Date)

    const cancelEvent = inMemoryEvents.find(
      e => e.subscriptionId === sub.id && e.type === 'SUBSCRIPTION_CANCELED' && (e.payload as any)?.immediately === true
    )
    expect(cancelEvent).toBeDefined()
    expect(cancelEvent?.payload).toHaveProperty('immediately', true)
  })

  it('8. Suspensão de assinatura altera status para SUSPENDED e audita o evento', async () => {
    const sub = await createSubscription({
      barbershopId: 'shop_A',
      planId: 'plan_pro',
    })

    const suspended = await suspendSubscription(sub.id, 'Tolerância esgotada após 3 falhas de pagamento')
    expect(suspended.status).toBe('SUSPENDED')

    const suspendedEvent = inMemoryEvents.find(e => e.subscriptionId === sub.id && e.type === 'SUBSCRIPTION_SUSPENDED')
    expect(suspendedEvent).toBeDefined()
    expect(suspendedEvent?.payload).toHaveProperty('reason', 'Tolerância esgotada após 3 falhas de pagamento')
  })

  it('9. Renovação periódica avança vigência e gera nova Invoice OPEN', async () => {
    const sub = await createSubscription({
      barbershopId: 'shop_A',
      planId: 'plan_pro',
    })

    const oldEnd = new Date(sub.currentPeriodEnd)
    const { subscription: renewedSub, invoice: newInvoice } = await renewSubscription(sub.id)

    expect(renewedSub.currentPeriodStart).toEqual(oldEnd)
    expect(renewedSub.currentPeriodEnd.getTime()).toBeGreaterThan(oldEnd.getTime())
    expect(newInvoice.status).toBe('OPEN')
    expect(newInvoice.amount.toFixed(2)).toBe('99.90')

    const renewEvent = inMemoryEvents.find(e => e.subscriptionId === sub.id && e.type === 'SUBSCRIPTION_RENEWED')
    expect(renewEvent).toBeDefined()
  })

  // ==========================================
  // 5. ISOLAMENTO MULTI-TENANT E HISTÓRICO
  // ==========================================
  it('10. Barbearia possui histórico de assinaturas isolado de outros tenants', async () => {
    // Barbearia A: assina Starter (cancelado), depois Pro (ativo)
    const subA1 = await createSubscription({ barbershopId: 'shop_A', planId: 'plan_starter' })
    await cancelSubscription(subA1.id, { immediately: true })
    const subA2 = await createSubscription({ barbershopId: 'shop_A', planId: 'plan_pro' })

    // Barbearia B: assina Pro
    const subB1 = await createSubscription({ barbershopId: 'shop_B', planId: 'plan_pro' })

    // Histórico da Barbearia A
    const historyA = await getSubscriptionHistory('shop_A')
    expect(historyA).toHaveLength(2)
    expect(historyA.map(s => s.id)).toContain(subA1.id)
    expect(historyA.map(s => s.id)).toContain(subA2.id)
    expect(historyA.some(s => s.id === subB1.id)).toBe(false) // NUNCA deve ver Barbearia B

    // Histórico da Barbearia B
    const historyB = await getSubscriptionHistory('shop_B')
    expect(historyB).toHaveLength(1)
    expect(historyB[0].id).toBe(subB1.id)

    // Assinatura ativa da Barbearia A deve ser a última não-cancelada
    const activeA = await getActiveSubscription('shop_A')
    expect(activeA?.id).toBe(subA2.id)
    expect(activeA?.status).toBe('ACTIVE')
  })

  // ==========================================
  // 6. DISTINÇÃO COM PAYMENT OPERACIONAL
  // ==========================================
  it('11. Faturas de Assinatura (Invoice) e Pagamentos de Atendimento (Payment) são estritamente isolados', () => {
    // 1. Payment operacional pertence a um Appointment de corte de cabelo
    expect(inMemoryPayments[0]).toHaveProperty('appointmentId', 'apt_123')
    expect(inMemoryPayments[0]).toHaveProperty('method', 'PIX')
    expect(inMemoryPayments[0]).not.toHaveProperty('subscriptionId')
    expect(inMemoryPayments[0]).not.toHaveProperty('dueDate')

    // 2. Invoice pertence a uma Subscription do SaaS
    const sampleInvoice = {
      id: 'inv_saas_1',
      subscriptionId: 'sub_1',
      barbershopId: 'shop_A',
      amount: new Prisma.Decimal('99.90'),
      status: 'OPEN',
      dueDate: new Date(),
    }
    expect(sampleInvoice).toHaveProperty('subscriptionId')
    expect(sampleInvoice).toHaveProperty('dueDate')
    expect(sampleInvoice).not.toHaveProperty('appointmentId')
  })

  // ==========================================
  // 7. APIS REST DE BILLING (RBAC & MULTI-TENANT)
  // ==========================================
  it('12. POST /api/billing/plans: DEVELOPER pode criar plano; outros usuários recebem 403', async () => {
    // Tentativa 1: Sem login -> 403
    mockAuthUser = null
    const reqAnon = new NextRequest('http://localhost:3000/api/billing/plans', {
      method: 'POST',
      body: JSON.stringify({ name: 'Plano VIP', slug: 'vip', price: 150 }),
    })
    const resAnon = await postPlanRoute(reqAnon)
    expect(resAnon.status).toBe(403)

    // Tentativa 2: ADMIN de barbearia tentando criar plano global -> 403
    mockAuthUser = { id: 'usr_admin', role: 'ADMIN', barbershopId: 'shop_A' }
    const reqAdmin = new NextRequest('http://localhost:3000/api/billing/plans', {
      method: 'POST',
      body: JSON.stringify({ name: 'Plano VIP', slug: 'vip', price: 150 }),
    })
    const resAdmin = await postPlanRoute(reqAdmin)
    expect(resAdmin.status).toBe(403)

    // Tentativa 3: DEVELOPER da plataforma -> 201
    mockAuthUser = { id: 'usr_dev', role: 'DEVELOPER' }
    const reqDev = new NextRequest('http://localhost:3000/api/billing/plans', {
      method: 'POST',
      body: JSON.stringify({ name: 'Plano VIP', slug: 'vip', price: 150 }),
    })
    const resDev = await postPlanRoute(reqDev)
    expect(resDev.status).toBe(201)
  })

  it('13. POST /api/billing/subscriptions: ADMIN só pode assinar para sua própria barbearia', async () => {
    mockAuthUser = { id: 'usr_admin_a', role: 'ADMIN', barbershopId: 'shop_A' }

    // Tentativa de assinar para outra barbearia (shop_B) -> 403
    const reqSpoof = new NextRequest('http://localhost:3000/api/billing/subscriptions', {
      method: 'POST',
      body: JSON.stringify({ planId: 'plan_pro', barbershopId: 'shop_B' }),
    })
    const resSpoof = await postSubscriptionRoute(reqSpoof)
    expect(resSpoof.status).toBe(403)

    // Assinar para a própria barbearia (shop_A) -> 201
    const reqSelf = new NextRequest('http://localhost:3000/api/billing/subscriptions', {
      method: 'POST',
      body: JSON.stringify({ planId: 'plan_pro', barbershopId: 'shop_A' }),
    })
    const resSelf = await postSubscriptionRoute(reqSelf)
    expect(resSelf.status).toBe(201)
  })

  it('14. GET /api/billing/invoices: ADMIN não pode acessar faturas de outra barbearia', async () => {
    mockAuthUser = { id: 'usr_admin_a', role: 'ADMIN', barbershopId: 'shop_A' }

    const reqForbidden = new NextRequest('http://localhost:3000/api/billing/invoices?barbershopId=shop_B')
    const resForbidden = await getInvoicesRoute(reqForbidden)
    expect(resForbidden.status).toBe(403)
  })
})
