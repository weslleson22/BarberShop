import { describe, it, expect, vi } from 'vitest'
import {
  evaluateOnboardingSteps,
  calculateCompletionPercentage,
  resolveTenantLifecycleStatus,
  calculateOnboardingMetrics,
} from '@/lib/onboarding'
import { NextRequest } from 'next/server'
import { POST as feedbackPost, GET as feedbackGet } from '@/app/api/feedback/route'

vi.mock('@/lib/prisma', () => ({
  prisma: {
    tenantFeedback: {
      create: vi.fn().mockImplementation(async ({ data }) => ({
        id: 'fb_123',
        ...data,
        createdAt: new Date(),
      })),
      findMany: vi.fn().mockResolvedValue([
        {
          id: 'fb_1',
          barbershopId: 'shop_1',
          userName: 'Carlos Barbeiro',
          easeScore: 5,
          satisfactionScore: 4,
          mostUsedFeature: 'Agenda diária',
          missingFeature: 'Lembrete WhatsApp',
          continueIntent: 'YES',
          createdAt: new Date(),
          barbershop: { id: 'shop_1', name: 'Barbearia Premium', slug: 'barbearia-premium' },
        },
        {
          id: 'fb_2',
          barbershopId: 'shop_2',
          userName: 'João Dono',
          easeScore: 4,
          satisfactionScore: 5,
          mostUsedFeature: 'Link público',
          missingFeature: null,
          continueIntent: 'YES',
          createdAt: new Date(),
          barbershop: { id: 'shop_2', name: 'Barbearia do João', slug: 'barbearia-do-joao' },
        },
      ]),
    },
  },
}))

vi.mock('@/lib/api-auth', () => ({
  getAuthUser: vi.fn().mockReturnValue({
    id: 'usr_dev_1',
    name: 'Dev Admin',
    email: 'dev@barbershop.com',
    role: 'DEVELOPER',
  }),
  requireRole: vi.fn().mockImplementation((user, roles) => roles.includes(user.role)),
}))

describe('OPERATIONAL ONBOARDING & FEEDBACK ENGINE (5–10 Clientes Reais)', () => {
  describe('1. Checklist de Onboarding Assistido (12 Passos)', () => {
    it('gera exatamente os 12 passos na ordem correta', () => {
      const steps = evaluateOnboardingSteps({
        hasBarbershop: true,
        hasAdminUser: true,
        hasProfileConfigured: false,
        servicesCount: 0,
        barbersCount: 0,
        slug: null,
        clientsCount: 0,
        appointmentsCount: 0,
      })

      expect(steps).toHaveLength(12)
      expect(steps[0].number).toBe(1)
      expect(steps[0].title).toBe('Criar Barbearia')
      expect(steps[11].number).toBe(12)
      expect(steps[11].title).toBe('Instalar PWA')
    })

    it('marca passos automáticos como concluídos baseado nos dados reais da barbearia', () => {
      const steps = evaluateOnboardingSteps({
        hasBarbershop: true,
        hasAdminUser: true,
        hasProfileConfigured: true,
        servicesCount: 3,
        barbersCount: 2,
        slug: 'barbearia-central',
        clientsCount: 5,
        appointmentsCount: 2,
        testedCancellation: true,
        testedLogin: true,
        installedPwa: true,
      })

      const allCompleted = steps.every((s) => s.completed)
      expect(allCompleted).toBe(true)

      const percentage = calculateCompletionPercentage(steps)
      expect(percentage).toBe(100)
    })

    it('calcula porcentagem intermediária de onboarding corretamente', () => {
      const steps = evaluateOnboardingSteps({
        hasBarbershop: true,
        hasAdminUser: true,
        hasProfileConfigured: true,
        servicesCount: 2,
        barbersCount: 1,
        slug: 'barbearia-teste',
        clientsCount: 0,
        appointmentsCount: 0,
        testedCancellation: false,
        testedLogin: false,
        installedPwa: false,
      })

      // 7 passos concluídos (passos 1 a 7) de 12
      const completedCount = steps.filter((s) => s.completed).length
      expect(completedCount).toBe(7)

      const percentage = calculateCompletionPercentage(steps)
      expect(percentage).toBe(58) // 7/12 = 58.33%
    })
  })

  describe('2. Máquina de Estados do Ciclo de Vida do Tenant', () => {
    it('reconhece status explícito LEAD', () => {
      const status = resolveTenantLifecycleStatus({
        status: 'LEAD',
        isActive: true,
        createdAt: new Date(),
      })
      expect(status).toBe('LEAD')
    })

    it('reconhece status explícito PENDING', () => {
      const status = resolveTenantLifecycleStatus({
        status: 'PENDING',
        isActive: true,
        createdAt: new Date(),
      })
      expect(status).toBe('PENDING')
    })

    it('reconhece barbearia desativada como SUSPENDED', () => {
      const status = resolveTenantLifecycleStatus({
        status: 'APPROVED',
        isActive: false,
        createdAt: new Date(),
      })
      expect(status).toBe('SUSPENDED')
    })

    it('reconhece assinatura TRIALING dentro do prazo de 30 dias como TRIAL', () => {
      const future = new Date(Date.now() + 20 * 24 * 60 * 60 * 1000)
      const status = resolveTenantLifecycleStatus({
        status: 'APPROVED',
        isActive: true,
        createdAt: new Date(),
        subscriptions: [
          {
            status: 'TRIALING',
            trialStart: new Date(),
            trialEnd: future,
          },
        ],
      })
      expect(status).toBe('TRIAL')
    })

    it('reconhece assinatura TRIALING com prazo expirado como CANCELED', () => {
      const past = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000)
      const status = resolveTenantLifecycleStatus({
        status: 'APPROVED',
        isActive: true,
        createdAt: new Date(),
        subscriptions: [
          {
            status: 'TRIALING',
            trialStart: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000),
            trialEnd: past,
          },
        ],
      })
      expect(status).toBe('CANCELED')
    })

    it('reconhece assinatura paga como ACTIVE', () => {
      const status = resolveTenantLifecycleStatus({
        status: 'APPROVED',
        isActive: true,
        createdAt: new Date(),
        subscriptions: [
          {
            status: 'ACTIVE',
            currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          },
        ],
      })
      expect(status).toBe('ACTIVE')
    })

    it('reconhece inadimplência como PAST_DUE', () => {
      const status = resolveTenantLifecycleStatus({
        status: 'APPROVED',
        isActive: true,
        createdAt: new Date(),
        subscriptions: [
          {
            status: 'PAST_DUE',
            currentPeriodEnd: new Date(),
          },
        ],
      })
      expect(status).toBe('PAST_DUE')
    })
  })

  describe('3. Métricas Agregadas do Funil e Ativação', () => {
    it('calcula taxa de ativação e Time to First Appointment com precisão', () => {
      const tenants: any[] = [
        {
          lifecycleStatus: 'TRIAL',
          isActivated: true,
          timeToFirstAppointmentHours: 4.5,
          appointmentsCount: 8,
          lastActivityDate: new Date(),
        },
        {
          lifecycleStatus: 'TRIAL',
          isActivated: true,
          timeToFirstAppointmentHours: 12.0,
          appointmentsCount: 3,
          lastActivityDate: new Date(),
        },
        {
          lifecycleStatus: 'TRIAL',
          isActivated: false,
          timeToFirstAppointmentHours: null,
          appointmentsCount: 0,
          lastActivityDate: new Date(),
        },
        {
          lifecycleStatus: 'ACTIVE',
          isActivated: true,
          timeToFirstAppointmentHours: 1.5,
          appointmentsCount: 25,
          lastActivityDate: new Date(),
        },
      ]

      const feedbacks: any[] = [
        { easeScore: 5, satisfactionScore: 5, continueIntent: 'YES' },
        { easeScore: 4, satisfactionScore: 4, continueIntent: 'YES' },
        { easeScore: 3, satisfactionScore: 4, continueIntent: 'MAYBE' },
      ]

      const metrics = calculateOnboardingMetrics(tenants, feedbacks)

      // 3 de 4 ativados = 75%
      expect(metrics.totalTenants).toBe(4)
      expect(metrics.totalActivated).toBe(3)
      expect(metrics.activationRate).toBe(75)

      // Total de agendamentos = 8 + 3 + 0 + 25 = 36
      expect(metrics.totalAppointments).toBe(36)

      // TTFA médio: (4.5 + 12.0 + 1.5) / 3 = 6.0h
      expect(metrics.avgTimeToFirstAppointmentHours).toBe(6)

      // TTFA mediana: [1.5, 4.5, 12.0] -> 4.5h
      expect(metrics.medianTimeToFirstAppointmentHours).toBe(4.5)

      // Satisfação: (5 + 4 + 4) / 3 = 4.33 -> 4.3
      expect(metrics.feedbackStats.avgSatisfactionScore).toBe(4.3)
      expect(metrics.feedbackStats.continueIntentRatio.yes).toBe(2)
      expect(metrics.feedbackStats.continueIntentRatio.maybe).toBe(1)
    })
  })

  describe('4. API de Feedback (/api/feedback)', () => {
    it('rejeita submissão com easeScore fora da faixa de 1 a 5', async () => {
      const req = new NextRequest('http://localhost:3000/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          easeScore: 6,
          satisfactionScore: 5,
          continueIntent: 'YES',
        }),
      })

      const res = await feedbackPost(req)
      expect(res.status).toBe(400)
      const data = await res.json()
      expect(data.error).toContain('easeScore')
    })

    it('rejeita submissão com continueIntent inválido', async () => {
      const req = new NextRequest('http://localhost:3000/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          easeScore: 5,
          satisfactionScore: 5,
          continueIntent: 'INVALID_INTENT',
        }),
      })

      const res = await feedbackPost(req)
      expect(res.status).toBe(400)
      const data = await res.json()
      expect(data.error).toContain('continueIntent')
    })

    it('aceita feedback válido e salva com sucesso', async () => {
      const req = new NextRequest('http://localhost:3000/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          easeScore: 5,
          satisfactionScore: 5,
          mostUsedFeature: 'Agendamento pela bio do Instagram',
          missingFeature: 'Notificação automática no WhatsApp',
          continueIntent: 'YES',
          notes: 'Os clientes acharam muito simples agendar!',
        }),
      })

      const res = await feedbackPost(req)
      expect(res.status).toBe(201)
      const data = await res.json()
      expect(data.success).toBe(true)
      expect(data.feedback.easeScore).toBe(5)
      expect(data.feedback.continueIntent).toBe('YES')
    })

    it('GET /api/feedback: retorna lista de avaliações e métricas calculadas', async () => {
      const req = new NextRequest('http://localhost:3000/api/feedback')
      const res = await feedbackGet(req)
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.feedbacks).toHaveLength(2)
      expect(data.metrics.total).toBe(2)
      expect(data.metrics.avgEaseScore).toBe(4.5)
      expect(data.metrics.intentCounts.YES).toBe(2)
    })
  })
})
