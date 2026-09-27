import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import {
  createTrialSubscriptionForBarbershop,
  getSubscriptionAccess,
  canUseSaaS,
  checkTrialMilestones,
  DEFAULT_TRIAL_DAYS,
} from '@/lib/billing/saas-billing'
import { GET as getDeveloperBarbershops } from '@/app/api/developer/barbershops/route'
import { POST as postPublicAppointment } from '@/app/api/appointments/public/route'
import { POST as postAuthAppointment } from '@/app/api/appointments/route'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'

let mockAuthUser: any = null
vi.mock('@/lib/api-auth', () => ({
  getAuthUser: () => mockAuthUser,
  requireRole: (user: any, roles: string[]) => user && roles.includes(user.role),
}))

// Mock de tenant resolution para rotas públicas
vi.mock('@/lib/tenant', () => ({
  resolvePublicTenant: vi.fn().mockImplementation(async (identifier: string | null) => {
    if (identifier === 'barbearia-trial' || identifier === 'shop_trial') {
      return { success: true, tenant: { id: 'shop_trial', name: 'Barbearia Trial', slug: 'barbearia-trial', isActive: true, status: 'APPROVED' } }
    }
    return { success: false, error: 'Barbearia não encontrada', status: 404 }
  }),
  generateUniqueSlug: vi.fn().mockImplementation(async (name: string) => name.toLowerCase().replace(/\s+/g, '-')),
  backfillMissingSlugs: vi.fn().mockResolvedValue(0),
}))

vi.mock('@/lib/notifications', () => ({
  notifyBarberNewAppointment: vi.fn().mockResolvedValue(true),
  notifyAdminsNewAppointment: vi.fn().mockResolvedValue(true),
  notifyClientNewAppointment: vi.fn().mockResolvedValue(true),
}))

describe('SISTEMA SAAS: TRIAL GRATUITO DE 30 DIAS & CONTROLE DE ACESSO', () => {
  let inMemoryBarbershops: any[] = []
  let inMemoryPlans: any[] = []
  let inMemorySubscriptions: any[] = []
  let inMemoryEvents: any[] = []
  let inMemoryNotifications: any[] = []
  let inMemoryUsers: any[] = []
  let inMemoryClients: any[] = []
  let inMemoryServices: any[] = []
  let inMemoryAppointments: any[] = []

  beforeEach(() => {
    vi.clearAllMocks()
    mockAuthUser = null

    inMemoryBarbershops = [
      {
        id: 'shop_trial',
        name: 'Barbearia Trial',
        slug: 'barbearia-trial',
        email: 'trial@barber.com',
        phone: '11988887777',
        isActive: true,
        status: 'APPROVED',
        contractExpiresAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]

    inMemoryPlans = [
      {
        id: 'plan_trial_default',
        name: 'Plano Trial Gratuito (30 dias)',
        slug: 'trial-30-days',
        price: new Prisma.Decimal('0.00'),
        currency: 'BRL',
        billingInterval: 'MONTHLY',
        trialDays: 30,
        isActive: true,
        features: { maxBarbers: 5, dashboard: true },
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'plan_pro',
        name: 'Plano Pro Mensal',
        slug: 'pro',
        price: new Prisma.Decimal('99.90'),
        currency: 'BRL',
        billingInterval: 'MONTHLY',
        trialDays: 0,
        isActive: true,
        features: { maxBarbers: 15, dashboard: true },
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]

    inMemoryUsers = [
      { id: 'usr_admin', name: 'Admin', email: 'admin@trial.com', role: 'ADMIN', barbershopId: 'shop_trial', isActive: true },
      { id: 'usr_barber', name: 'Barbeiro 1', email: 'barber@trial.com', role: 'BARBER', barbershopId: 'shop_trial', isActive: true },
    ]

    inMemoryClients = [
      { id: 'cli_1', name: 'Cliente Teste', phone: '11999998888', barbershopId: 'shop_trial', isVip: false },
    ]

    inMemoryServices = [
      { id: 'srv_1', name: 'Corte Tradicional', price: new Prisma.Decimal('50.00'), duration: 30, barbershopId: 'shop_trial', isActive: true },
    ]

    inMemorySubscriptions = []
    inMemoryEvents = []
    inMemoryNotifications = []
    inMemoryAppointments = []

    // Mocks do Prisma
    vi.spyOn(prisma, '$transaction').mockImplementation(async (callback: any) => {
      return await callback(prisma)
    })

    ;(vi.spyOn(prisma.barbershop, 'findUnique') as any).mockImplementation(async ({ where }: any) => {
      return inMemoryBarbershops.find(b => b.id === where.id) || null
    })

    ;(vi.spyOn(prisma.barbershop, 'update') as any).mockImplementation(async ({ where, data }: any) => {
      const idx = inMemoryBarbershops.findIndex(b => b.id === where.id)
      if (idx !== -1) {
        inMemoryBarbershops[idx] = { ...inMemoryBarbershops[idx], ...data }
        return inMemoryBarbershops[idx]
      }
      throw new Error('Barbershop not found')
    })

    ;(vi.spyOn(prisma.barbershop, 'findMany') as any).mockImplementation(async ({ select }: any) => {
      return inMemoryBarbershops.map(b => {
        const res: any = { ...b }
        if (select?.subscriptions) {
          res.subscriptions = inMemorySubscriptions
            .filter(s => s.barbershopId === b.id)
            .map(s => ({ ...s, plan: inMemoryPlans.find(p => p.id === s.planId) }))
        }
        if (select?.users) {
          res.users = inMemoryUsers.filter(u => u.barbershopId === b.id && u.role === 'ADMIN')
        }
        if (select?._count) {
          res._count = { users: 2, clients: 1, services: 1 }
        }
        return res
      })
    })

    ;(vi.spyOn(prisma.plan, 'findFirst') as any).mockImplementation(async ({ where }: any) => {
      return inMemoryPlans.find(p => {
        if (where?.slug && p.slug !== where.slug) return false
        if (where?.isActive !== undefined && p.isActive !== where.isActive) return false
        return true
      }) || null
    })

    ;(vi.spyOn(prisma.subscription, 'create') as any).mockImplementation(async ({ data }: any) => {
      const sub = {
        id: `sub_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
        plan: inMemoryPlans.find(p => p.id === data.planId),
      }
      inMemorySubscriptions.push(sub)
      return sub
    })

    ;(vi.spyOn(prisma.subscription, 'findFirst') as any).mockImplementation(async ({ where }: any) => {
      const sub = inMemorySubscriptions.find(s => {
        if (where?.barbershopId && s.barbershopId !== where.barbershopId) return false
        return true
      })
      if (!sub) return null
      return { ...sub, plan: inMemoryPlans.find(p => p.id === sub.planId) }
    })

    ;(vi.spyOn(prisma.subscription, 'findUnique') as any).mockImplementation(async ({ where }: any) => {
      const sub = inMemorySubscriptions.find(s => s.id === where.id)
      if (!sub) return null
      return { ...sub, plan: inMemoryPlans.find(p => p.id === sub.planId) }
    })

    ;(vi.spyOn(prisma.subscription, 'update') as any).mockImplementation(async ({ where, data }: any) => {
      const idx = inMemorySubscriptions.findIndex(s => s.id === where.id)
      if (idx !== -1) {
        inMemorySubscriptions[idx] = { ...inMemorySubscriptions[idx], ...data, updatedAt: new Date() }
        return inMemorySubscriptions[idx]
      }
      throw new Error('Subscription not found')
    })

    ;(vi.spyOn(prisma.subscriptionEvent, 'create') as any).mockImplementation(async ({ data }: any) => {
      const event = { id: `evt_${Date.now()}`, ...data, createdAt: new Date() }
      inMemoryEvents.push(event)
      return event
    })

    ;(vi.spyOn(prisma.subscriptionEvent, 'findFirst') as any).mockImplementation(async ({ where }: any) => {
      return inMemoryEvents.find(e => e.subscriptionId === where.subscriptionId && e.type === where.type) || null
    })

    ;(vi.spyOn(prisma.notification, 'createMany') as any).mockImplementation(async ({ data }: any) => {
      inMemoryNotifications.push(...data)
      return { count: data.length }
    })

    ;(vi.spyOn(prisma.user, 'findMany') as any).mockImplementation(async ({ where }: any) => {
      return inMemoryUsers.filter(u => u.barbershopId === where.barbershopId && u.role === where.role)
    })

    ;(vi.spyOn(prisma.user, 'findFirst') as any).mockImplementation(async ({ where }: any) => {
      return inMemoryUsers.find(u => u.id === where.id && u.barbershopId === where.barbershopId && u.isActive) || null
    })

    ;(vi.spyOn(prisma.client, 'findFirst') as any).mockImplementation(async ({ where }: any) => {
      return inMemoryClients.find(c => c.id === where.id && c.barbershopId === where.barbershopId) || null
    })

    ;(vi.spyOn(prisma.service, 'findFirst') as any).mockImplementation(async ({ where }: any) => {
      return inMemoryServices.find(s => s.id === where.id && s.barbershopId === where.barbershopId) || null
    })

    ;(vi.spyOn(prisma.appointment, 'create') as any).mockImplementation(async ({ data }: any) => {
      const apt = { id: `apt_${Date.now()}`, ...data, createdAt: new Date() }
      inMemoryAppointments.push(apt)
      return apt
    })
    ;(vi.spyOn(prisma.appointment, 'findFirst') as any).mockImplementation(async () => null)
  })

  // ==========================================
  // 1. NOVO TENANT & INÍCIO DO TRIAL DE 30 DIAS
  // ==========================================
  it('1. Novo tenant recebe automaticamente status TRIALING com 30 dias de trial', async () => {
    const sub = await createTrialSubscriptionForBarbershop('shop_trial')

    expect(sub.id).toBeDefined()
    expect(sub.status).toBe('TRIALING')
    expect(sub.trialStart).toBeInstanceOf(Date)
    expect(sub.trialEnd).toBeInstanceOf(Date)

    // Duração exata de 30 dias (em milissegundos)
    const diffDays = Math.round((sub.trialEnd!.getTime() - sub.trialStart!.getTime()) / (1000 * 60 * 60 * 24))
    expect(diffDays).toBe(DEFAULT_TRIAL_DAYS)
    expect(diffDays).toBe(30)

    // Auditoria deve conter criação e início do trial
    const events = inMemoryEvents.filter(e => e.subscriptionId === sub.id)
    expect(events.map(e => e.type)).toContain('SUBSCRIPTION_CREATED')
    expect(events.map(e => e.type)).toContain('TRIAL_STARTED')

    // Compatibilidade com campo legado contractExpiresAt
    const shop = inMemoryBarbershops.find(b => b.id === 'shop_trial')
    expect(shop.contractExpiresAt).toEqual(sub.trialEnd)
  })

  // ==========================================
  // 2. DIAS RESTANTES DO TRIAL (30, 29, 7, 1 DIA)
  // ==========================================
  it('2. getSubscriptionAccess calcula corretamente os dias restantes (30, 29, 7 e 1 dia)', async () => {
    const sub = await createTrialSubscriptionForBarbershop('shop_trial')
    const trialStart = new Date(sub.trialStart!)

    // Momento da criação (30 dias restantes)
    const accessDay0 = await getSubscriptionAccess('shop_trial', trialStart)
    expect(accessDay0.allowed).toBe(true)
    expect(accessDay0.canAccessOperations).toBe(true)
    expect(accessDay0.isTrial).toBe(true)
    expect(accessDay0.status).toBe('TRIALING')
    expect(accessDay0.daysRemaining).toBe(30)

    // 1 dia após a criação (29 dias restantes)
    const day1 = new Date(trialStart.getTime() + 1 * 24 * 60 * 60 * 1000)
    const accessDay1 = await getSubscriptionAccess('shop_trial', day1)
    expect(accessDay1.daysRemaining).toBe(29)
    expect(accessDay1.allowed).toBe(true)

    // 23 dias após a criação (7 dias restantes)
    const day23 = new Date(trialStart.getTime() + 23 * 24 * 60 * 60 * 1000)
    const accessDay23 = await getSubscriptionAccess('shop_trial', day23)
    expect(accessDay23.daysRemaining).toBe(7)
    expect(accessDay23.allowed).toBe(true)

    // 29 dias após a criação (1 dia restante)
    const day29 = new Date(trialStart.getTime() + 29 * 24 * 60 * 60 * 1000)
    const accessDay29 = await getSubscriptionAccess('shop_trial', day29)
    expect(accessDay29.daysRemaining).toBe(1)
    expect(accessDay29.allowed).toBe(true)
  })

  // ==========================================
  // 3. EXPIRAÇÃO DO TRIAL (TRIALING -> EXPIRED)
  // ==========================================
  it('3. Quando trial expira (now > trialEnd), transiciona para EXPIRED e bloqueia operações sem apagar dados', async () => {
    const sub = await createTrialSubscriptionForBarbershop('shop_trial')
    const afterTrialEnd = new Date(sub.trialEnd!.getTime() + 1000) // 1 segundo após término

    const accessExpired = await getSubscriptionAccess('shop_trial', afterTrialEnd)

    // Bloqueia operações operacionais
    expect(accessExpired.allowed).toBe(false)
    expect(accessExpired.canAccessOperations).toBe(false)
    // Permite painel de billing / contratação
    expect(accessExpired.canAccessBillingOnly).toBe(true)
    expect(accessExpired.status).toBe('EXPIRED')
    expect(accessExpired.reason).toBe('TRIAL_EXPIRED')
    expect(accessExpired.daysRemaining).toBe(0)
    expect(accessExpired.message).toContain('expirou')

    // Transição persistida no banco
    const updatedSub = inMemorySubscriptions.find(s => s.id === sub.id)
    expect(updatedSub.status).toBe('EXPIRED')

    // Auditoria registra TRIAL_EXPIRED
    const expiredEvent = inMemoryEvents.find(e => e.subscriptionId === sub.id && e.type === 'TRIAL_EXPIRED')
    expect(expiredEvent).toBeDefined()

    // canUseSaaS deve retornar false
    const canOperate = await canUseSaaS('shop_trial', afterTrialEnd)
    expect(canOperate).toBe(false)

    // Dados NUNCA são apagados
    expect(inMemoryBarbershops).toHaveLength(1)
    expect(inMemoryUsers).toHaveLength(2)
    expect(inMemoryClients).toHaveLength(1)
    expect(inMemoryServices).toHaveLength(1)
  })

  // ==========================================
  // 4. CONVERSÃO PARA ACTIVE (CONTRATAÇÃO)
  // ==========================================
  it('4. Conversão para assinatura paga altera status para ACTIVE e reativa operações', async () => {
    const sub = await createTrialSubscriptionForBarbershop('shop_trial')
    
    // Simula contratação de plano pago
    sub.status = 'ACTIVE'
    sub.planId = 'plan_pro'
    sub.currentPeriodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)

    const accessActive = await getSubscriptionAccess('shop_trial')
    expect(accessActive.allowed).toBe(true)
    expect(accessActive.canAccessOperations).toBe(true)
    expect(accessActive.isTrial).toBe(false)
    expect(accessActive.status).toBe('ACTIVE')
    expect(accessActive.reason).toBe('SUBSCRIPTION_ACTIVE')
  })

  // ==========================================
  // 5. TENANT SEM ASSINATURA E TENANT SUSPENSO
  // ==========================================
  it('5. Tenant sem assinatura é bloqueado com status NO_SUBSCRIPTION', async () => {
    // Barbearia sem assinatura registrada
    const accessNone = await getSubscriptionAccess('shop_sem_nada')
    expect(accessNone.allowed).toBe(false)
    expect(accessNone.canAccessOperations).toBe(false)
    expect(accessNone.canAccessBillingOnly).toBe(true)
    expect(accessNone.status).toBe('NO_SUBSCRIPTION')
  })

  it('6. Tenant suspenso (SUSPENDED) tem operações bloqueadas', async () => {
    const sub = await createTrialSubscriptionForBarbershop('shop_trial')
    sub.status = 'SUSPENDED'

    const accessSuspended = await getSubscriptionAccess('shop_trial')
    expect(accessSuspended.allowed).toBe(false)
    expect(accessSuspended.canAccessOperations).toBe(false)
    expect(accessSuspended.canAccessBillingOnly).toBe(true)
    expect(accessSuspended.status).toBe('SUSPENDED')
    expect(accessSuspended.reason).toBe('SUBSCRIPTION_SUSPENDED')
  })

  // ==========================================
  // 6. AVISOS E MARCOS DO TRIAL (NOTIFICATIONS)
  // ==========================================
  it('7. Dispara eventos de aviso de trial (7 dias, 3 dias, 1 dia, expirado) e notifica administradores', async () => {
    const sub = await createTrialSubscriptionForBarbershop('shop_trial')
    const trialStart = new Date(sub.trialStart!)

    // Dia 23: faltam 7 dias
    const day23 = new Date(trialStart.getTime() + 23 * 24 * 60 * 60 * 1000)
    const m7 = await checkTrialMilestones(sub.id, day23)
    expect(m7).toBe('TRIAL_7_DAYS_REMAINING')

    // Segunda checagem no mesmo dia não duplica evento
    const m7Dup = await checkTrialMilestones(sub.id, day23)
    expect(m7Dup).toBeNull()

    // Dia 27: faltam 3 dias
    const day27 = new Date(trialStart.getTime() + 27 * 24 * 60 * 60 * 1000)
    const m3 = await checkTrialMilestones(sub.id, day27)
    expect(m3).toBe('TRIAL_3_DAYS_REMAINING')

    // Dia 29: falta 1 dia
    const day29 = new Date(trialStart.getTime() + 29 * 24 * 60 * 60 * 1000)
    const m1 = await checkTrialMilestones(sub.id, day29)
    expect(m1).toBe('TRIAL_1_DAY_REMAINING')

    // Notificações em memória para o ADMIN da barbearia
    expect(inMemoryNotifications.length).toBeGreaterThanOrEqual(3)
    expect(inMemoryNotifications.some(n => n.title.includes('7 dias'))).toBe(true)
    expect(inMemoryNotifications.some(n => n.title.includes('3 dias'))).toBe(true)
    expect(inMemoryNotifications.some(n => n.title.includes('Último dia'))).toBe(true)
  })

  // ==========================================
  // 7. PAINEL DEVELOPER (TRIAL, DIAS RESTANTES & FILTROS)
  // ==========================================
  it('8. GET /api/developer/barbershops exibe detalhes do trial e suporta filtros TRIALING, EXPIRED, ACTIVE', async () => {
    mockAuthUser = { id: 'usr_dev', role: 'DEVELOPER' }

    // Cria barbearia 1 em trial ativo
    await createTrialSubscriptionForBarbershop('shop_trial')

    // Cria barbearia 2 com trial expirado
    const expiredShop = {
      id: 'shop_expired',
      name: 'Barbearia Vencida',
      slug: 'barbearia-vencida',
      email: 'expired@barber.com',
      isActive: true,
      status: 'APPROVED',
      createdAt: new Date(),
    }
    inMemoryBarbershops.push(expiredShop)
    const subExpired = await createTrialSubscriptionForBarbershop('shop_expired')
    subExpired.status = 'EXPIRED'
    subExpired.trialEnd = new Date(Date.now() - 1000)

    // Requisição 1: Listagem completa com metadata de trial
    const reqAll = new NextRequest('http://localhost:3000/api/developer/barbershops')
    const resAll = await getDeveloperBarbershops(reqAll)
    expect(resAll.status).toBe(200)
    const dataAll = await resAll.json()

    expect(dataAll).toHaveLength(2)
    const trialShopData = dataAll.find((s: any) => s.id === 'shop_trial')
    expect(trialShopData.trial.isTrial).toBe(true)
    expect(trialShopData.trial.daysRemaining).toBe(30)
    expect(trialShopData.trial.status).toBe('TRIALING')

    // Requisição 2: Filtro ?status=TRIALING
    const reqTrial = new NextRequest('http://localhost:3000/api/developer/barbershops?status=TRIALING')
    const resTrial = await getDeveloperBarbershops(reqTrial)
    const dataTrial = await resTrial.json()
    expect(dataTrial).toHaveLength(1)
    expect(dataTrial[0].id).toBe('shop_trial')

    // Requisição 3: Filtro ?status=EXPIRED
    const reqExp = new NextRequest('http://localhost:3000/api/developer/barbershops?status=EXPIRED')
    const resExp = await getDeveloperBarbershops(reqExp)
    const dataExp = await resExp.json()
    expect(dataExp).toHaveLength(1)
    expect(dataExp[0].id).toBe('shop_expired')
  })

  // ==========================================
  // 8. BLOQUEIO DE OPERAÇÕES VIA API QUANDO EXPIRADO
  // ==========================================
  it('9. POST /api/appointments/public: bloqueia agendamento com HTTP 402 se o trial da barbearia estiver expirado', async () => {
    const sub = await createTrialSubscriptionForBarbershop('shop_trial')
    // Força expiração do trial
    sub.status = 'EXPIRED'
    sub.trialEnd = new Date(Date.now() - 1000)

    const futureDate = new Date()
    futureDate.setDate(futureDate.getDate() + 2)
    futureDate.setUTCHours(14, 0, 0, 0)

    const req = new NextRequest('http://localhost:3000/api/appointments/public', {
      method: 'POST',
      body: JSON.stringify({
        slug: 'barbearia-trial',
        clientId: 'cli_1',
        barberId: 'usr_barber',
        serviceId: 'srv_1',
        startTime: futureDate.toISOString(),
      }),
    })

    const res = await postPublicAppointment(req)
    // Deve retornar 402 Payment Required
    expect(res.status).toBe(402)
    const json = await res.json()
    expect(json.code).toBe('SUBSCRIPTION_EXPIRED')
  })

  it('10. POST /api/appointments (autenticado): bloqueia criação de agendamento com HTTP 402 se o trial estiver expirado', async () => {
    mockAuthUser = { id: 'usr_admin', role: 'ADMIN', barbershopId: 'shop_trial' }

    const sub = await createTrialSubscriptionForBarbershop('shop_trial')
    sub.status = 'EXPIRED'
    sub.trialEnd = new Date(Date.now() - 1000)

    const futureDate = new Date()
    futureDate.setDate(futureDate.getDate() + 2)
    futureDate.setUTCHours(14, 0, 0, 0)

    const req = new NextRequest('http://localhost:3000/api/appointments', {
      method: 'POST',
      body: JSON.stringify({
        barbershopId: 'shop_trial',
        clientId: 'cli_1',
        barberId: 'usr_barber',
        serviceId: 'srv_1',
        startTime: futureDate.toISOString(),
      }),
    })

    const res = await postAuthAppointment(req)
    expect(res.status).toBe(402)
    const json = await res.json()
    expect(json.code).toBe('SUBSCRIPTION_EXPIRED')
    expect(json.canAccessBillingOnly).toBe(true)
  })
})
