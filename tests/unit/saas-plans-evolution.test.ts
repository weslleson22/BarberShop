import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import {
  createPlan,
  updatePlan,
  deleteOrDeactivatePlan,
  getPlans,
  createSubscription,
  grantCourtesySubscription,
  renewSubscription,
  getSubscriptionAccess,
} from '@/lib/billing/saas-billing'
import { GET as getPlansRoute, POST as postPlanRoute } from '@/app/api/billing/plans/route'
import { GET as getPlanByIdRoute, PATCH as patchPlanRoute, DELETE as deletePlanRoute } from '@/app/api/billing/plans/[id]/route'
import { POST as postCourtesyRoute } from '@/app/api/billing/subscriptions/courtesy/route'
import { POST as postSubscriptionRoute } from '@/app/api/billing/subscriptions/route'
import { POST as postCheckoutRoute } from '@/app/api/billing/checkout/route'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'

let mockAuthUser: any = null
vi.mock('@/lib/api-auth', () => ({
  getAuthUser: () => mockAuthUser,
  requireRole: (user: any, roles: string[]) => user && roles.includes(user.role),
}))

vi.mock('@/lib/billing/stripe-provider', () => ({
  createStripeCheckoutSession: vi.fn().mockResolvedValue({
    checkoutUrl: 'https://checkout.stripe.test/session_123',
    sessionId: 'session_123',
    provider: 'STRIPE',
  }),
}))

describe('EVOLUÇÃO DO SISTEMA DE PLANOS E ASSINATURAS SAAS (REQUISITOS 1 A 28)', () => {
  let inMemoryPlans: any[] = []
  let inMemorySubscriptions: any[] = []
  let inMemoryInvoices: any[] = []
  let inMemoryEvents: any[] = []
  let inMemoryBarbershops: any[] = []

  beforeEach(() => {
    vi.clearAllMocks()
    mockAuthUser = null

    inMemoryBarbershops = [
      { id: 'shop_1', name: 'Barbearia Alpha', slug: 'alpha', isActive: true },
      { id: 'shop_2', name: 'Barbearia Beta', slug: 'beta', isActive: true },
    ]

    inMemoryPlans = []
    inMemorySubscriptions = []
    inMemoryInvoices = []
    inMemoryEvents = []

    vi.spyOn(prisma, '$transaction').mockImplementation(async (callback: any) => {
      return await callback(prisma)
    })

    ;(vi.spyOn(prisma.barbershop, 'findUnique') as any).mockImplementation(async ({ where }: any) => {
      return inMemoryBarbershops.find((b) => b.id === where.id) || null
    })

    ;(vi.spyOn(prisma.plan, 'create') as any).mockImplementation(async ({ data }: any) => {
      const plan = {
        id: `plan_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      inMemoryPlans.push(plan)
      return plan
    })

    ;(vi.spyOn(prisma.plan, 'findMany') as any).mockImplementation(async ({ where }: any) => {
      return inMemoryPlans.filter((p) => {
        if (where?.status && p.status !== where.status) return false
        if (where?.isActive !== undefined && p.isActive !== where.isActive) return false
        if (where?.planType && p.planType !== where.planType) return false
        if (where?.cycleType && p.cycleType !== where.cycleType) return false
        return true
      })
    })

    ;(vi.spyOn(prisma.plan, 'findUnique') as any).mockImplementation(async ({ where, include }: any) => {
      const plan = inMemoryPlans.find((p) => p.id === where.id || p.slug === where.slug)
      if (!plan) return null
      if (include?.subscriptions) {
        return {
          ...plan,
          subscriptions: inMemorySubscriptions.filter((s) => s.planId === plan.id),
        }
      }
      return plan
    })

    ;(vi.spyOn(prisma.plan, 'findFirst') as any).mockImplementation(async ({ where }: any) => {
      return inMemoryPlans.find((p) => {
        if (where?.status && p.status !== where.status) return false
        if (where?.planType && p.planType !== where.planType) return false
        if (where?.durationDays && p.durationDays !== where.durationDays) return false
        return true
      }) || null
    })

    ;(vi.spyOn(prisma.plan, 'update') as any).mockImplementation(async ({ where, data }: any) => {
      const idx = inMemoryPlans.findIndex((p) => p.id === where.id)
      if (idx === -1) throw new Error('Plano não encontrado')
      inMemoryPlans[idx] = { ...inMemoryPlans[idx], ...data, updatedAt: new Date() }
      return inMemoryPlans[idx]
    })

    ;(vi.spyOn(prisma.plan, 'delete') as any).mockImplementation(async ({ where }: any) => {
      const idx = inMemoryPlans.findIndex((p) => p.id === where.id)
      if (idx === -1) throw new Error('Plano não encontrado')
      const deleted = inMemoryPlans[idx]
      inMemoryPlans.splice(idx, 1)
      return deleted
    })

    ;(vi.spyOn(prisma.subscription, 'create') as any).mockImplementation(async ({ data, include }: any) => {
      const sub = {
        id: `sub_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      if (include?.plan) {
        sub.plan = inMemoryPlans.find((p) => p.id === sub.planId)
      }
      inMemorySubscriptions.push(sub)
      return sub
    })

    ;(vi.spyOn(prisma.subscription, 'findUnique') as any).mockImplementation(async ({ where, include }: any) => {
      const sub = inMemorySubscriptions.find((s) => s.id === where.id)
      if (!sub) return null
      if (include?.plan) {
        return { ...sub, plan: inMemoryPlans.find((p) => p.id === sub.planId) }
      }
      return sub
    })

    ;(vi.spyOn(prisma.subscription, 'findFirst') as any).mockImplementation(async ({ where, include }: any) => {
      const sub = inMemorySubscriptions.find((s) => s.barbershopId === where.barbershopId)
      if (!sub) return null
      if (include?.plan) {
        return { ...sub, plan: inMemoryPlans.find((p) => p.id === sub.planId) }
      }
      return sub
    })

    ;(vi.spyOn(prisma.subscription, 'findMany') as any).mockImplementation(async ({ where, include }: any) => {
      return inMemorySubscriptions
        .filter((s) => !where?.barbershopId || s.barbershopId === where.barbershopId)
        .map((s) => (include?.plan ? { ...s, plan: inMemoryPlans.find((p) => p.id === s.planId) } : s))
    })

    ;(vi.spyOn(prisma.subscription, 'update') as any).mockImplementation(async ({ where, data }: any) => {
      const idx = inMemorySubscriptions.findIndex((s) => s.id === where.id)
      if (idx === -1) throw new Error('Assinatura não encontrada')
      inMemorySubscriptions[idx] = { ...inMemorySubscriptions[idx], ...data, updatedAt: new Date() }
      return inMemorySubscriptions[idx]
    })

    ;(vi.spyOn(prisma.subscription, 'count') as any).mockImplementation(async ({ where }: any) => {
      return inMemorySubscriptions.filter((s) => !where?.planId || s.planId === where.planId).length
    })

    ;(vi.spyOn(prisma.subscriptionEvent, 'create') as any).mockImplementation(async ({ data }: any) => {
      const ev = { id: `ev_${Date.now()}`, ...data, createdAt: new Date() }
      inMemoryEvents.push(ev)
      return ev
    })

    ;(vi.spyOn(prisma.invoice, 'create') as any).mockImplementation(async ({ data }: any) => {
      const inv = { id: `inv_${Date.now()}`, ...data, createdAt: new Date() }
      inMemoryInvoices.push(inv)
      return inv
    })

    ;(vi.spyOn(prisma.auditLog, 'create') as any).mockImplementation(async ({ data }: any) => {
      return { id: `audit_${Date.now()}`, ...data, createdAt: new Date() }
    })
  })

  // ==========================================
  // GRUPO 1: PLANOS (Testes 1 a 8)
  // ==========================================
  describe('1. Ciclos e Gestão de Planos', () => {
    it('1. Deve criar plano mensal com sucesso', async () => {
      const plan = await createPlan({
        name: 'Plano Básico Mensal',
        slug: 'basico-mensal',
        price: '49.90',
        planType: 'PAID',
        cycleType: 'MONTHLY',
        durationDays: 30,
      })

      expect(plan.id).toBeDefined()
      expect(plan.cycleType).toBe('MONTHLY')
      expect(plan.durationDays).toBe(30)
      expect(plan.planType).toBe('PAID')
      expect(Number(plan.price)).toBe(49.9)
      expect(plan.status).toBe('ACTIVE')
    })

    it('2. Deve criar plano anual com sucesso', async () => {
      const plan = await createPlan({
        name: 'Plano Pro Anual',
        slug: 'pro-anual',
        price: '499.00',
        planType: 'PAID',
        cycleType: 'YEARLY',
        durationDays: 365,
      })

      expect(plan.id).toBeDefined()
      expect(plan.cycleType).toBe('YEARLY')
      expect(plan.durationDays).toBe(365)
      expect(Number(plan.price)).toBe(499.0)
    })

    it('3. Deve criar plano personalizado com quantidade de dias arbitrária > 0', async () => {
      const plan = await createPlan({
        name: 'Plano 45 Dias Especial',
        slug: 'plano-45-dias',
        price: '79.90',
        planType: 'PAID',
        cycleType: 'CUSTOM',
        durationDays: 45,
      })

      expect(plan.id).toBeDefined()
      expect(plan.cycleType).toBe('CUSTOM')
      expect(plan.durationDays).toBe(45)

      // Rejeita durationDays <= 0 para ciclo personalizado
      await expect(
        createPlan({
          name: 'Plano Inválido',
          slug: 'invalido-0-dias',
          price: '50.00',
          cycleType: 'CUSTOM',
          durationDays: 0,
        })
      ).rejects.toThrow('durationDays maior que zero')
    })

    it('4. Deve criar plano cortesia com price = 0 e durationDays definido', async () => {
      const plan = await createPlan({
        name: 'Cortesia 30 Dias',
        slug: 'cortesia-30-dias',
        price: 0,
        planType: 'COURTESY',
        cycleType: 'CUSTOM',
        durationDays: 30,
      })

      expect(plan.planType).toBe('COURTESY')
      expect(Number(plan.price)).toBe(0)
      expect(plan.provider).toBe('NONE')
      expect(plan.durationDays).toBe(30)
    })

    it('5. Deve permitir editar plano ativo', async () => {
      const plan = await createPlan({
        name: 'Plano Inicial',
        slug: 'plano-inicial',
        price: '59.90',
        planType: 'PAID',
      })

      const updated = await updatePlan(plan.id, {
        name: 'Plano Inicial Atualizado',
        price: '69.90',
      })

      expect(updated.name).toBe('Plano Inicial Atualizado')
      expect(Number(updated.price)).toBe(69.9)
    })

    it('6. Deve excluir fisicamente plano sem assinaturas (Cenário 1)', async () => {
      const plan = await createPlan({
        name: 'Plano Teste Vazio',
        slug: 'teste-vazio',
        price: '20.00',
      })

      const result = await deleteOrDeactivatePlan(plan.id)
      expect(result.action).toBe('DELETED')
      expect(result.totalSubscriptionsCount).toBe(0)

      const found = inMemoryPlans.find((p) => p.id === plan.id)
      expect(found).toBeUndefined()
    })

    it('7. Deve descontinuar plano com assinaturas (soft-delete / status = INACTIVE) sem remover registro físico (Cenário 2)', async () => {
      const plan = await createPlan({
        name: 'Plano com Assinantes',
        slug: 'com-assinantes',
        price: '69.90',
      })

      // Assinatura ativa vinculada
      await createSubscription({
        barbershopId: 'shop_1',
        planId: plan.id,
      })

      const result = await deleteOrDeactivatePlan(plan.id)
      expect(result.action).toBe('DEACTIVATED')
      expect(result.totalSubscriptionsCount).toBe(1)
      expect(result.activeSubscriptionsCount).toBe(1)
      expect(result.plan.status).toBe('INACTIVE')
      expect(result.plan.isActive).toBe(false)
      expect(result.plan.deletedAt).toBeDefined()

      // O plano continua existindo no banco de dados!
      const inDb = inMemoryPlans.find((p) => p.id === plan.id)
      expect(inDb).toBeDefined()
      expect(inDb.status).toBe('INACTIVE')
    })

    it('8. Deve impedir novas assinaturas em plano descontinuado/inativo', async () => {
      const plan = await createPlan({
        name: 'Plano Descontinuado',
        slug: 'descontinuado',
        price: '39.90',
        status: 'INACTIVE',
        isActive: false,
      })

      await expect(
        createSubscription({
          barbershopId: 'shop_2',
          planId: plan.id,
        })
      ).rejects.toThrow('Não é possível criar nova assinatura em um plano descontinuado ou inativo')
    })
  })

  // ==========================================
  // GRUPO 2: ASSINATURAS (Testes 9 a 14)
  // ==========================================
  describe('2. Ciclo de Vida e Independência de Estados (PLANO INACTIVE ≠ ASSINATURA INACTIVE)', () => {
    it('9. Assinatura existente continua ACTIVE com acesso normal após o plano ser descontinuado', async () => {
      const plan = await createPlan({
        name: 'Plano Profissional',
        slug: 'profissional',
        price: '69.90',
        durationDays: 30,
      })

      const sub = await createSubscription({
        barbershopId: 'shop_1',
        planId: plan.id,
      })

      expect(sub.status).toBe('ACTIVE')

      // Developer descontinua o plano
      await deleteOrDeactivatePlan(plan.id)
      expect(inMemoryPlans.find((p) => p.id === plan.id).status).toBe('INACTIVE')

      // A assinatura continua ACTIVE
      const currentSub = inMemorySubscriptions.find((s) => s.id === sub.id)
      expect(currentSub.status).toBe('ACTIVE')

      // Acesso ao SaaS continua liberado durante a vigência contratada
      const now = new Date()
      const access = await getSubscriptionAccess('shop_1', now)
      expect(access.allowed).toBe(true)
      expect(access.canAccessOperations).toBe(true)
      expect(access.status).toBe('ACTIVE')
    })

    it('10. Assinatura expira normalmente quando atinge endDate (currentPeriodEnd)', async () => {
      const plan = await createPlan({
        name: 'Plano Temporário',
        slug: 'temp-plan',
        price: '50.00',
        durationDays: 30,
      })

      const sub = await createSubscription({
        barbershopId: 'shop_1',
        planId: plan.id,
      })

      // Simula data após o término do período contratado (endDate + 1 dia)
      const afterEndDate = new Date(new Date(sub.currentPeriodEnd).getTime() + 24 * 60 * 60 * 1000)

      const access = await getSubscriptionAccess('shop_1', afterEndDate)
      expect(access.allowed).toBe(false)
      expect(access.canAccessOperations).toBe(false)
      expect(access.status).toBe('EXPIRED')
    })

    it('11. Assinatura vinculada a plano descontinuado NÃO é cancelada antecipadamente', async () => {
      const plan = await createPlan({
        name: 'Plano Alpha',
        slug: 'alpha-plan',
        price: '80.00',
      })

      const sub = await createSubscription({
        barbershopId: 'shop_1',
        planId: plan.id,
      })

      // Descontinua plano
      await deleteOrDeactivatePlan(plan.id)

      const foundSub = inMemorySubscriptions.find((s) => s.id === sub.id)
      expect(foundSub.status).toBe('ACTIVE')
      expect(foundSub.canceledAt).toBeUndefined()
    })

    it('12. Assinatura não pode renovar utilizando plano descontinuado (INACTIVE)', async () => {
      const plan = await createPlan({
        name: 'Plano a Descontinuar',
        slug: 'descontinuar-renov',
        price: '90.00',
      })

      const sub = await createSubscription({
        barbershopId: 'shop_1',
        planId: plan.id,
      })

      // Descontinua o plano
      await deleteOrDeactivatePlan(plan.id)

      // Tentativa de renovação deve ser estritamente bloqueada
      await expect(renewSubscription(sub.id)).rejects.toThrow(
        'O plano desta assinatura foi descontinuado e não permite renovação'
      )
    })

    it('13. Assinatura mantém snapshot do preço contratado mesmo se o plano for alterado', async () => {
      const plan = await createPlan({
        name: 'Plano 69',
        slug: 'plano-69',
        price: '69.90',
      })

      const sub = await createSubscription({
        barbershopId: 'shop_1',
        planId: plan.id,
      })

      expect(Number(sub.price)).toBe(69.9)

      // Posteriormente o plano é reajustado para R$ 99.90
      await updatePlan(plan.id, { price: '99.90' })

      // A assinatura antiga continua com o preço original de R$ 69.90 contratado!
      const currentSub = inMemorySubscriptions.find((s) => s.id === sub.id)
      expect(Number(currentSub.price)).toBe(69.9)
    })

    it('14. Assinatura mantém snapshot de duração contratada e nome do plano', async () => {
      const plan = await createPlan({
        name: 'Plano Trimestral Custom',
        slug: 'custom-trimestral',
        price: '150.00',
        cycleType: 'CUSTOM',
        durationDays: 90,
      })

      const sub = await createSubscription({
        barbershopId: 'shop_1',
        planId: plan.id,
      })

      expect(sub.durationDays).toBe(90)
      expect(sub.planName).toBe('Plano Trimestral Custom')
      expect(sub.cycleType).toBe('CUSTOM')
    })
  })

  // ==========================================
  // GRUPO 3: SEGURANÇA E AUTORIZAÇÃO (Testes 15 a 20)
  // ==========================================
  describe('3. Segurança, Permissões e Perfil DEVELOPER', () => {
    it('15. ADMIN não pode criar plano cortesia ou conceder cortesia', async () => {
      await expect(
        grantCourtesySubscription({
          barbershopId: 'shop_1',
          durationDays: 30,
          grantedByUserId: 'user_admin',
          grantedByRole: 'ADMIN',
        })
      ).rejects.toThrow('Apenas usuários com papel DEVELOPER')
    })

    it('16. BARBER não pode conceder cortesia', async () => {
      await expect(
        grantCourtesySubscription({
          barbershopId: 'shop_1',
          durationDays: 15,
          grantedByUserId: 'user_barber',
          grantedByRole: 'BARBER',
        })
      ).rejects.toThrow('Apenas usuários com papel DEVELOPER')
    })

    it('17. CLIENT não pode conceder cortesia', async () => {
      await expect(
        grantCourtesySubscription({
          barbershopId: 'shop_1',
          durationDays: 15,
          grantedByUserId: 'user_client',
          grantedByRole: 'CLIENT',
        })
      ).rejects.toThrow('Apenas usuários com papel DEVELOPER')
    })

    it('18. Somente DEVELOPER pode conceder cortesia (com price = 0 e provider = NONE)', async () => {
      const sub = await grantCourtesySubscription({
        barbershopId: 'shop_1',
        durationDays: 45,
        name: 'Cortesia Fidelidade 45d',
        notes: 'Parceria anual',
        grantedByUserId: 'dev_user_1',
        grantedByRole: 'DEVELOPER',
      })

      expect(sub.status).toBe('ACTIVE')
      expect(sub.planType).toBe('COURTESY')
      expect(Number(sub.price)).toBe(0)
      expect(sub.provider).toBe('NONE')
      expect(sub.durationDays).toBe(45)
      expect(sub.grantedBy).toBe('dev_user_1')
      expect(inMemoryInvoices.length).toBe(0) // Não gera faturas nem cobranças
    })

    it('19. Tentativa direta na API de criar plano por não-DEVELOPER deve retornar 403', async () => {
      mockAuthUser = { id: 'admin_1', role: 'ADMIN', barbershopId: 'shop_1' }

      const req = new NextRequest('http://localhost:3000/api/billing/plans', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Plano Hacker',
          slug: 'hacker',
          price: 10,
        }),
      })

      const res = await postPlanRoute(req)
      expect(res.status).toBe(403)
      const data = await res.json()
      expect(data.error).toContain('Apenas desenvolvedores')
    })

    it('20. Tentativa direta na API de conceder cortesia por não-DEVELOPER deve retornar 403', async () => {
      mockAuthUser = { id: 'admin_1', role: 'ADMIN', barbershopId: 'shop_1' }

      const req = new NextRequest('http://localhost:3000/api/billing/subscriptions/courtesy', {
        method: 'POST',
        body: JSON.stringify({
          barbershopId: 'shop_1',
          durationDays: 30,
        }),
      })

      const res = await postCourtesyRoute(req)
      expect(res.status).toBe(403)
      const data = await res.json()
      expect(data.error).toContain('Apenas desenvolvedores')
    })

    it('20b. Tentativa de checkout financeiro para plano cortesia deve ser bloqueada', async () => {
      const courtesyPlan = await createPlan({
        name: 'Cortesia Teste',
        slug: 'cortesia-teste',
        price: 0,
        planType: 'COURTESY',
      })

      mockAuthUser = { id: 'admin_1', role: 'ADMIN', barbershopId: 'shop_1' }

      const req = new NextRequest('http://localhost:3000/api/billing/checkout', {
        method: 'POST',
        body: JSON.stringify({
          planId: courtesyPlan.id,
        }),
      })

      const res = await postCheckoutRoute(req)
      expect(res.status).toBe(400)
      const data = await res.json()
      expect(data.error).toContain('cortesia não possuem cobrança')
    })
  })

  // ==========================================
  // GRUPO 4: HISTÓRICO E AUDITORIA (Testes 21 a 24)
  // ==========================================
  describe('4. Auditoria, Preservação de Histórico e Integridade', () => {
    it('21. Plano descontinuado continua disponível para consulta no histórico', async () => {
      const plan = await createPlan({
        name: 'Plano Histórico Pro',
        slug: 'historico-pro',
        price: '69.90',
      })

      await createSubscription({
        barbershopId: 'shop_1',
        planId: plan.id,
      })

      // Descontinua plano
      await deleteOrDeactivatePlan(plan.id)

      mockAuthUser = { id: 'dev_1', role: 'DEVELOPER' }
      const req = new NextRequest(`http://localhost:3000/api/billing/plans/${plan.id}`)
      const res = await getPlanByIdRoute(req, { params: Promise.resolve({ id: plan.id }) })

      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.id).toBe(plan.id)
      expect(data.status).toBe('INACTIVE')
      expect(data.totalSubscriptionsCount).toBe(1)
    })

    it('22. Faturas e pagamentos antigos continuam vinculados ao plano e assinatura', async () => {
      const plan = await createPlan({
        name: 'Plano com Faturas',
        slug: 'com-faturas',
        price: '55.00',
      })

      const sub = await createSubscription({
        barbershopId: 'shop_1',
        planId: plan.id,
      })

      // Fatura inicial criada
      expect(inMemoryInvoices.length).toBe(1)
      expect(inMemoryInvoices[0].subscriptionId).toBe(sub.id)
      expect(Number(inMemoryInvoices[0].amount)).toBe(55.0)

      // Descontinua plano
      await deleteOrDeactivatePlan(plan.id)

      // Fatura histórica permanece intacta
      expect(inMemoryInvoices.length).toBe(1)
      expect(Number(inMemoryInvoices[0].amount)).toBe(55.0)
    })

    it('23. Assinaturas antigas continuam vinculadas ao ID do plano descontinuado', async () => {
      const plan = await createPlan({
        name: 'Plano Antigo',
        slug: 'plano-antigo',
        price: '40.00',
      })

      const sub = await createSubscription({
        barbershopId: 'shop_1',
        planId: plan.id,
      })

      await deleteOrDeactivatePlan(plan.id)

      const savedSub = inMemorySubscriptions.find((s) => s.id === sub.id)
      expect(savedSub.planId).toBe(plan.id)
    })

    it('24. Dados históricos não são retroativamente alterados', async () => {
      const plan = await createPlan({
        name: 'Original 2026',
        slug: 'original-2026',
        price: '75.00',
        durationDays: 30,
      })

      const sub = await createSubscription({
        barbershopId: 'shop_1',
        planId: plan.id,
      })

      const originalSubPrice = sub.price
      const originalSubDuration = sub.durationDays
      const originalSubPlanName = sub.planName

      // Modificações posteriores no catálogo
      await updatePlan(plan.id, {
        name: 'Original 2026 Modificado',
        price: '120.00',
        durationDays: 60,
      })

      const loadedSub = inMemorySubscriptions.find((s) => s.id === sub.id)
      expect(loadedSub.price).toEqual(originalSubPrice)
      expect(loadedSub.durationDays).toEqual(originalSubDuration)
      expect(loadedSub.planName).toEqual(originalSubPlanName)
    })
  })
})
