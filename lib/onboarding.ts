/**
 * BarberShop SaaS - Onboarding & Customer Success Operations Engine
 * 
 * Regras de ciclo de vida do tenant, checklists de onboarding assistido (15-30m),
 * cálculo de métricas de ativação e tempo até o primeiro agendamento.
 */

export type TenantLifecycleStatus =
  | 'LEAD'
  | 'PENDING'
  | 'TRIAL'
  | 'ACTIVE'
  | 'PAST_DUE'
  | 'SUSPENDED'
  | 'CANCELED'

export interface OnboardingStep {
  id: string
  number: number
  title: string
  description: string
  completed: boolean
  isAutomated: boolean
  category: 'SETUP' | 'CONFIG' | 'VALIDATION' | 'ADOPTION'
}

export interface TenantChecklistInput {
  hasBarbershop: boolean
  hasAdminUser: boolean
  hasProfileConfigured: boolean
  servicesCount: number
  barbersCount: number
  hasScheduleConfigured?: boolean
  slug?: string | null
  clientsCount: number
  appointmentsCount: number
  testedCancellation?: boolean
  testedLogin?: boolean
  installedPwa?: boolean
}

/**
 * Avalia o progresso dos 12 passos da sessão assistida de onboarding (15–30 min)
 */
export function evaluateOnboardingSteps(input: TenantChecklistInput): OnboardingStep[] {
  const steps: OnboardingStep[] = [
    {
      id: 'step-1-create-shop',
      number: 1,
      title: 'Criar Barbearia',
      description: 'Estabelecimento cadastrado e registrado na plataforma',
      completed: !!input.hasBarbershop,
      isAutomated: true,
      category: 'SETUP',
    },
    {
      id: 'step-2-create-admin',
      number: 2,
      title: 'Criar ADMIN',
      description: 'Conta de administrador responsável com acesso configurado',
      completed: !!input.hasAdminUser,
      isAutomated: true,
      category: 'SETUP',
    },
    {
      id: 'step-3-config-profile',
      number: 3,
      title: 'Configurar Perfil',
      description: 'Nome comercial, telefone/WhatsApp e endereço preenchidos',
      completed: !!input.hasProfileConfigured,
      isAutomated: true,
      category: 'CONFIG',
    },
    {
      id: 'step-4-config-services',
      number: 4,
      title: 'Configurar Serviços',
      description: 'Serviços cadastrados com preços e tempos de duração',
      completed: input.servicesCount > 0,
      isAutomated: true,
      category: 'CONFIG',
    },
    {
      id: 'step-5-register-barbers',
      number: 5,
      title: 'Cadastrar Barbeiros',
      description: 'Equipe de barbeiros e profissionais vinculados à barbearia',
      completed: input.barbersCount > 0,
      isAutomated: true,
      category: 'CONFIG',
    },
    {
      id: 'step-6-config-schedule',
      number: 6,
      title: 'Configurar Horários',
      description: 'Dias de atendimento e faixa de horários de funcionamento definidos',
      completed: input.hasScheduleConfigured !== false,
      isAutomated: true,
      category: 'CONFIG',
    },
    {
      id: 'step-7-verify-public-url',
      number: 7,
      title: 'Verificar URL Pública',
      description: 'Slug URL-safe gerado e página pública /b/{slug} acessível',
      completed: !!input.slug && input.slug.trim().length > 0,
      isAutomated: true,
      category: 'VALIDATION',
    },
    {
      id: 'step-8-create-first-client',
      number: 8,
      title: 'Criar Primeiro Cliente',
      description: 'Primeiro cliente real cadastrado no sistema',
      completed: input.clientsCount > 0,
      isAutomated: true,
      category: 'VALIDATION',
    },
    {
      id: 'step-9-create-first-appointment',
      number: 9,
      title: 'Criar Primeiro Agendamento',
      description: 'Primeira reserva confirmada (AHA Moment da barbearia)',
      completed: input.appointmentsCount > 0,
      isAutomated: true,
      category: 'VALIDATION',
    },
    {
      id: 'step-10-test-cancellation',
      number: 10,
      title: 'Testar Cancelamento',
      description: 'Fluxo de cancelamento/reagendamento testado com sucesso',
      completed: !!input.testedCancellation,
      isAutomated: false,
      category: 'VALIDATION',
    },
    {
      id: 'step-11-test-login',
      number: 11,
      title: 'Testar Login',
      description: 'Acesso testado nos dispositivos móveis e desktop do proprietário',
      completed: input.testedLogin !== undefined ? input.testedLogin : !!input.hasAdminUser,
      isAutomated: false,
      category: 'ADOPTION',
    },
    {
      id: 'step-12-install-pwa',
      number: 12,
      title: 'Instalar PWA',
      description: 'Atalho do sistema instalado na tela inicial do celular da barbearia',
      completed: !!input.installedPwa,
      isAutomated: false,
      category: 'ADOPTION',
    },
  ]

  return steps
}

/**
 * Calcula a porcentagem de conclusão do onboarding
 */
export function calculateCompletionPercentage(steps: OnboardingStep[]): number {
  if (!steps.length) return 0
  const completed = steps.filter((s) => s.completed).length
  return Math.round((completed / steps.length) * 100)
}

/**
 * Determina o status do ciclo de vida da barbearia de forma coerente e unificada.
 */
export function resolveTenantLifecycleStatus(shop: {
  status?: string | null
  isActive: boolean
  contractExpiresAt?: Date | string | null
  createdAt: Date | string
  subscriptions?: Array<{
    status: string
    trialStart?: Date | string | null
    trialEnd?: Date | string | null
    currentPeriodEnd?: Date | string | null
  }>
}): TenantLifecycleStatus {
  const explicitStatus = shop.status?.toUpperCase()

  // Status explícitos de cadastro/funil
  if (explicitStatus === 'LEAD') return 'LEAD'
  if (explicitStatus === 'PENDING') return 'PENDING'
  if (explicitStatus === 'REJECTED' || explicitStatus === 'SUSPENDED') return 'SUSPENDED'
  if (explicitStatus === 'CANCELED' || explicitStatus === 'EXPIRED') return 'CANCELED'
  if (!shop.isActive) return 'SUSPENDED'

  const latestSub = shop.subscriptions?.[0]
  const now = new Date()

  if (latestSub) {
    const subStatus = latestSub.status.toUpperCase()
    if (subStatus === 'TRIALING') {
      if (latestSub.trialEnd && now > new Date(latestSub.trialEnd)) {
        return 'CANCELED'
      }
      return 'TRIAL'
    }
    if (subStatus === 'ACTIVE') return 'ACTIVE'
    if (subStatus === 'PAST_DUE') return 'PAST_DUE'
    if (subStatus === 'SUSPENDED') return 'SUSPENDED'
    if (subStatus === 'CANCELED' || subStatus === 'EXPIRED') return 'CANCELED'
  }

  // Se tem contrato expira e já passou
  if (shop.contractExpiresAt) {
    const expDate = new Date(shop.contractExpiresAt)
    if (now > expDate) return 'CANCELED'
    return 'TRIAL'
  }

  // Fallback baseado nos 30 dias de trial a partir da criação
  if (shop.createdAt) {
    const createdDate = new Date(shop.createdAt)
    const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000
    if (now.getTime() - createdDate.getTime() > thirtyDaysMs) {
      return 'CANCELED'
    }
    return 'TRIAL'
  }

  return 'TRIAL'
}

/**
 * Calcula métricas agregadas do funil de onboarding para o Developer Dashboard
 */
export interface OnboardingFunnelMetrics {
  countsByStatus: Record<TenantLifecycleStatus, number>
  totalTenants: number
  totalActivated: number
  activationRate: number // % (activated / total or trial)
  avgTimeToFirstAppointmentHours: number | null
  medianTimeToFirstAppointmentHours: number | null
  totalAppointments: number
  activeWeeklyTenants: number
  feedbackStats: {
    totalFeedbacks: number
    avgEaseScore: number
    avgSatisfactionScore: number
    continueIntentRatio: {
      yes: number
      no: number
      maybe: number
    }
  }
}

export function calculateOnboardingMetrics(
  tenants: Array<{
    lifecycleStatus: TenantLifecycleStatus
    isActivated: boolean
    timeToFirstAppointmentHours: number | null
    appointmentsCount: number
    lastActivityDate?: Date | string | null
  }>,
  feedbacks: Array<{
    easeScore: number
    satisfactionScore: number
    continueIntent: string
  }> = []
): OnboardingFunnelMetrics {
  const countsByStatus: Record<TenantLifecycleStatus, number> = {
    LEAD: 0,
    PENDING: 0,
    TRIAL: 0,
    ACTIVE: 0,
    PAST_DUE: 0,
    SUSPENDED: 0,
    CANCELED: 0,
  }

  let totalActivated = 0
  let totalAppointments = 0
  const ttfHoursList: number[] = []
  const now = new Date().getTime()
  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000
  let activeWeeklyTenants = 0

  for (const t of tenants) {
    countsByStatus[t.lifecycleStatus] = (countsByStatus[t.lifecycleStatus] || 0) + 1
    totalAppointments += t.appointmentsCount || 0

    if (t.isActivated) {
      totalActivated++
    }

    if (typeof t.timeToFirstAppointmentHours === 'number' && t.timeToFirstAppointmentHours >= 0) {
      ttfHoursList.push(t.timeToFirstAppointmentHours)
    }

    if (t.lastActivityDate) {
      const actTime = new Date(t.lastActivityDate).getTime()
      if (now - actTime <= sevenDaysMs) {
        activeWeeklyTenants++
      }
    }
  }

  const totalTenants = tenants.length
  const activationDenominator = countsByStatus.TRIAL + countsByStatus.ACTIVE + countsByStatus.PAST_DUE
  const activationRate = activationDenominator > 0
    ? Math.round((totalActivated / activationDenominator) * 100)
    : (totalTenants > 0 ? Math.round((totalActivated / totalTenants) * 100) : 0)

  // Médias de TTFA
  let avgTimeToFirstAppointmentHours: number | null = null
  let medianTimeToFirstAppointmentHours: number | null = null

  if (ttfHoursList.length > 0) {
    const sum = ttfHoursList.reduce((acc, v) => acc + v, 0)
    avgTimeToFirstAppointmentHours = Math.round((sum / ttfHoursList.length) * 10) / 10

    ttfHoursList.sort((a, b) => a - b)
    const mid = Math.floor(ttfHoursList.length / 2)
    medianTimeToFirstAppointmentHours =
      ttfHoursList.length % 2 !== 0
        ? ttfHoursList[mid]
        : Math.round(((ttfHoursList[mid - 1] + ttfHoursList[mid]) / 2) * 10) / 10
  }

  // Estatísticas de feedbacks
  let totalFeedbacks = feedbacks.length
  let sumEase = 0
  let sumSat = 0
  const continueCounts = { yes: 0, no: 0, maybe: 0 }

  for (const f of feedbacks) {
    sumEase += f.easeScore || 0
    sumSat += f.satisfactionScore || 0
    const intent = (f.continueIntent || '').toUpperCase()
    if (intent === 'YES') continueCounts.yes++
    else if (intent === 'NO') continueCounts.no++
    else continueCounts.maybe++
  }

  return {
    countsByStatus,
    totalTenants,
    totalActivated,
    activationRate,
    avgTimeToFirstAppointmentHours,
    medianTimeToFirstAppointmentHours,
    totalAppointments,
    activeWeeklyTenants,
    feedbackStats: {
      totalFeedbacks,
      avgEaseScore: totalFeedbacks > 0 ? Math.round((sumEase / totalFeedbacks) * 10) / 10 : 0,
      avgSatisfactionScore: totalFeedbacks > 0 ? Math.round((sumSat / totalFeedbacks) * 10) / 10 : 0,
      continueIntentRatio: continueCounts,
    },
  }
}
