import { prisma } from '@/lib/prisma'
import {
  BillingInterval,
  SubscriptionStatus,
  InvoiceStatus,
  SubscriptionEventType,
  Plan,
  Subscription,
  Invoice,
  SubscriptionEvent,
  Prisma,
  PlanType,
  CycleType,
  PlanStatus,
} from '@prisma/client'

export interface CreatePlanInput {
  name: string
  slug: string
  description?: string
  planType?: PlanType
  cycleType?: CycleType
  durationDays?: number
  price: number | string | Prisma.Decimal
  currency?: string
  billingInterval?: BillingInterval
  trialDays?: number
  features?: Record<string, any>
  status?: PlanStatus
  isActive?: boolean
  provider?: string
  providerProductId?: string
}

export interface UpdatePlanInput {
  name?: string
  slug?: string
  description?: string
  planType?: PlanType
  cycleType?: CycleType
  durationDays?: number
  price?: number | string | Prisma.Decimal
  currency?: string
  billingInterval?: BillingInterval
  trialDays?: number
  features?: Record<string, any>
  status?: PlanStatus
  isActive?: boolean
  provider?: string
  providerProductId?: string
}

export interface CreateSubscriptionInput {
  barbershopId: string
  planId: string
  provider?: string
  providerSubscriptionId?: string
  notes?: string
  grantedBy?: string
}

export interface GrantCourtesyInput {
  barbershopId: string
  planId?: string
  durationDays?: number
  name?: string
  notes?: string
  grantedByUserId: string
  grantedByRole: string
}

export interface CreateInvoiceInput {
  subscriptionId: string
  barbershopId: string
  amount: number | string | Prisma.Decimal
  currency?: string
  dueDate: Date
  provider?: string
  providerInvoiceId?: string
}

/**
 * Máquina de Estados Finita para Assinaturas SaaS
 * Transições estritas permitidas:
 * TRIALING -> ACTIVE, EXPIRED, CANCELED
 * ACTIVE -> PAST_DUE, CANCELED, SUSPENDED, EXPIRED
 * PAST_DUE -> ACTIVE, SUSPENDED, CANCELED
 * SUSPENDED -> ACTIVE, CANCELED
 * EXPIRED -> ACTIVE
 * CANCELED -> ACTIVE
 */
export const ALLOWED_STATUS_TRANSITIONS: Record<SubscriptionStatus, SubscriptionStatus[]> = {
  TRIALING: ['ACTIVE', 'EXPIRED', 'CANCELED'],
  ACTIVE: ['PAST_DUE', 'CANCELED', 'SUSPENDED', 'EXPIRED'],
  PAST_DUE: ['ACTIVE', 'SUSPENDED', 'CANCELED'],
  SUSPENDED: ['ACTIVE', 'CANCELED'],
  EXPIRED: ['ACTIVE'],
  CANCELED: ['ACTIVE'],
}

export function isValidStatusTransition(current: SubscriptionStatus, next: SubscriptionStatus): boolean {
  if (current === next) return true
  const allowed = ALLOWED_STATUS_TRANSITIONS[current] || []
  return allowed.includes(next)
}

/**
 * Transiciona o status de uma assinatura validando as regras estritas da máquina de estados
 */
export async function transitionSubscriptionStatus(
  subscriptionId: string,
  newStatus: SubscriptionStatus,
  reason?: string,
  txClient: any = prisma
): Promise<Subscription> {
  const current = await txClient.subscription.findUnique({
    where: { id: subscriptionId },
  })

  if (!current) {
    throw new Error(`Assinatura com ID "${subscriptionId}" não encontrada`)
  }

  if (current.status === newStatus) {
    return current
  }

  if (!isValidStatusTransition(current.status, newStatus)) {
    throw new Error(
      `Transição de status inválida: não é permitido transicionar de "${current.status}" para "${newStatus}"`
    )
  }

  const updateData: any = {
    status: newStatus,
    updatedAt: new Date(),
  }

  if (newStatus === 'CANCELED') {
    updateData.canceledAt = new Date()
  }

  const updated = await txClient.subscription.update({
    where: { id: subscriptionId },
    data: updateData,
  })

  const eventMap: Partial<Record<SubscriptionStatus, SubscriptionEventType>> = {
    ACTIVE: current.status === 'TRIALING' ? 'SUBSCRIPTION_ACTIVATED' : 'SUBSCRIPTION_RENEWED',
    PAST_DUE: 'PAYMENT_FAILED',
    SUSPENDED: 'SUBSCRIPTION_SUSPENDED',
    CANCELED: 'SUBSCRIPTION_CANCELED',
    EXPIRED: 'TRIAL_EXPIRED',
  }

  const eventType = eventMap[newStatus]
  if (eventType) {
    await txClient.subscriptionEvent.create({
      data: {
        subscriptionId,
        type: eventType,
        payload: {
          previousStatus: current.status,
          newStatus,
          reason: reason || `Transição de status (${current.status} -> ${newStatus})`,
          transitionedAt: new Date().toISOString(),
        } as Prisma.InputJsonValue,
      },
    })
  }

  return updated
}

/**
 * Calcula o fim do período baseado no ciclo de cobrança ou duração em dias
 */
export function calculatePeriodEnd(
  startDate: Date,
  interval: BillingInterval = 'MONTHLY',
  cycleType?: CycleType,
  durationDays?: number
): Date {
  const endDate = new Date(startDate)

  // 1. Ciclo Personalizado (CUSTOM) com duração em dias explícita
  if (cycleType === 'CUSTOM' && durationDays && durationDays > 0) {
    endDate.setDate(endDate.getDate() + durationDays)
    return endDate
  }

  // 2. Anual
  if (cycleType === 'YEARLY' || interval === 'YEARLY') {
    endDate.setFullYear(endDate.getFullYear() + 1)
    return endDate
  }

  // 3. Mensal
  if (cycleType === 'MONTHLY' || interval === 'MONTHLY') {
    endDate.setMonth(endDate.getMonth() + 1)
    return endDate
  }

  // 4. Outros intervalos legados
  switch (interval) {
    case 'QUARTERLY':
      endDate.setMonth(endDate.getMonth() + 3)
      break
    case 'SEMIANNUAL':
      endDate.setMonth(endDate.getMonth() + 6)
      break
    default:
      if (durationDays && durationDays > 0) {
        endDate.setDate(endDate.getDate() + durationDays)
      } else {
        endDate.setMonth(endDate.getMonth() + 1)
      }
  }
  return endDate
}

/**
 * Criação de um novo Plano de Assinatura do SaaS
 */
export async function createPlan(data: CreatePlanInput): Promise<Plan> {
  const planType: PlanType = data.planType || 'PAID'
  const cycleType: CycleType = data.cycleType || (data.billingInterval === 'YEARLY' ? 'YEARLY' : 'MONTHLY')
  const durationDays: number = data.durationDays ?? (cycleType === 'YEARLY' ? 365 : 30)

  // Validação: ciclo personalizado exige durationDays > 0
  if (cycleType === 'CUSTOM') {
    if (!durationDays || durationDays <= 0) {
      throw new Error('Planos com ciclo personalizado devem possuir durationDays maior que zero')
    }
  }

  let priceDecimal = new Prisma.Decimal(data.price ?? 0)

  // Validação: Plano cortesia deve ter price = 0
  if (planType === 'COURTESY') {
    priceDecimal = new Prisma.Decimal(0)
    if (!durationDays || durationDays <= 0) {
      throw new Error('Plano cortesia deve possuir duração definida maior que zero')
    }
  } else {
    // Plano pago: price > 0
    if (priceDecimal.isNegative()) {
      throw new Error('O preço do plano não pode ser negativo')
    }
    if (priceDecimal.isZero()) {
      throw new Error('Planos pagos devem possuir valor maior que zero')
    }
  }

  // Sincroniza status e isActive
  const status: PlanStatus = data.status || (data.isActive === false ? 'INACTIVE' : 'ACTIVE')
  const isActive = status === 'ACTIVE' && (data.isActive ?? true)

  const billingInterval: BillingInterval =
    data.billingInterval || (cycleType === 'YEARLY' ? 'YEARLY' : 'MONTHLY')

  return await prisma.plan.create({
    data: {
      name: data.name,
      slug: data.slug.toLowerCase().trim(),
      description: data.description,
      planType,
      cycleType,
      durationDays,
      price: priceDecimal,
      currency: data.currency || 'BRL',
      billingInterval,
      trialDays: data.trialDays ?? 0,
      status,
      isActive,
      provider: planType === 'COURTESY' ? 'NONE' : (data.provider || 'ABACATEPAY'),
      providerProductId: data.providerProductId,
      features: (data.features as Prisma.InputJsonValue) || {},
    },
  })
}

/**
 * Atualiza um plano existente (sem alterar dados de assinaturas antigas já contratadas)
 */
export async function updatePlan(planId: string, data: UpdatePlanInput): Promise<Plan> {
  const existing = await prisma.plan.findUnique({
    where: { id: planId },
  })

  if (!existing) {
    throw new Error('Plano não encontrado')
  }

  const updateData: Prisma.PlanUpdateInput = {}

  if (data.name !== undefined) updateData.name = data.name
  if (data.slug !== undefined) updateData.slug = data.slug.toLowerCase().trim()
  if (data.description !== undefined) updateData.description = data.description
  if (data.features !== undefined) updateData.features = data.features as Prisma.InputJsonValue

  const planType: PlanType = data.planType || existing.planType
  if (data.planType !== undefined) updateData.planType = data.planType

  const cycleType: CycleType = data.cycleType || existing.cycleType
  if (data.cycleType !== undefined) updateData.cycleType = data.cycleType

  let durationDays = data.durationDays ?? existing.durationDays
  if (cycleType === 'CUSTOM' && durationDays <= 0) {
    throw new Error('Planos com ciclo personalizado devem possuir durationDays maior que zero')
  }
  if (data.durationDays !== undefined) updateData.durationDays = data.durationDays

  if (data.price !== undefined) {
    const priceDecimal = new Prisma.Decimal(data.price)
    if (planType === 'COURTESY') {
      updateData.price = new Prisma.Decimal(0)
    } else {
      if (priceDecimal.isNegative()) {
        throw new Error('O preço do plano não pode ser negativo')
      }
      if (priceDecimal.isZero()) {
        throw new Error('Planos pagos devem possuir valor maior que zero')
      }
      updateData.price = priceDecimal
    }
  }

  if (data.status !== undefined) {
    updateData.status = data.status
    updateData.isActive = data.status === 'ACTIVE'
  } else if (data.isActive !== undefined) {
    updateData.isActive = data.isActive
    updateData.status = data.isActive ? 'ACTIVE' : 'INACTIVE'
  }

  if (data.provider !== undefined) updateData.provider = data.provider
  if (data.providerProductId !== undefined) updateData.providerProductId = data.providerProductId
  if (data.billingInterval !== undefined) updateData.billingInterval = data.billingInterval

  return await prisma.plan.update({
    where: { id: planId },
    data: updateData,
  })
}

/**
 * Exclusão / Descontinuação inteligente de Plano (Regras 7, 8, 9)
 * - Se sem assinaturas: remoção física segura
 * - Se possui assinaturas: descontinuação segura (status = INACTIVE, isActive = false)
 * - NUNCA cancela assinaturas existentes!
 */
export async function deleteOrDeactivatePlan(
  planId: string,
  userId?: string
): Promise<{
  action: 'DELETED' | 'DEACTIVATED'
  activeSubscriptionsCount: number
  totalSubscriptionsCount: number
  plan: Plan
}> {
  const plan = await prisma.plan.findUnique({
    where: { id: planId },
    include: {
      subscriptions: true,
    },
  })

  if (!plan) {
    throw new Error('Plano não encontrado')
  }

  const totalSubscriptionsCount = plan.subscriptions.length
  const activeSubscriptionsCount = plan.subscriptions.filter(
    (s) => s.status === 'ACTIVE' || s.status === 'TRIALING'
  ).length

  // Cenário 1: Plano sem assinaturas ou histórico -> Remoção física
  if (totalSubscriptionsCount === 0) {
    const deletedPlan = await prisma.plan.delete({
      where: { id: planId },
    })
    return {
      action: 'DELETED',
      activeSubscriptionsCount: 0,
      totalSubscriptionsCount: 0,
      plan: deletedPlan,
    }
  }

  // Cenário 2: Plano possui assinaturas -> Soft-delete / Descontinuação segura
  // Assinaturas ativas NÃO são canceladas e mantêm vigência até o endDate
  const deactivatedPlan = await prisma.plan.update({
    where: { id: planId },
    data: {
      status: 'INACTIVE',
      isActive: false,
      deletedAt: new Date(),
    },
  })

  return {
    action: 'DEACTIVATED',
    activeSubscriptionsCount,
    totalSubscriptionsCount,
    plan: deactivatedPlan,
  }
}

export interface GetPlansFilters {
  onlyActive?: boolean
  planType?: PlanType
  cycleType?: CycleType
  status?: PlanStatus
}

/**
 * Lista planos do SaaS com suporte a filtros
 */
export async function getPlans(options: boolean | GetPlansFilters = true): Promise<Plan[]> {
  const where: Prisma.PlanWhereInput = {}

  if (typeof options === 'boolean') {
    if (options) {
      where.status = 'ACTIVE'
      where.isActive = true
    }
  } else if (options) {
    if (options.onlyActive) {
      where.status = 'ACTIVE'
      where.isActive = true
    } else if (options.status) {
      where.status = options.status
    }
    if (options.planType) {
      where.planType = options.planType
    }
    if (options.cycleType) {
      where.cycleType = options.cycleType
    }
  }

  return await prisma.plan.findMany({
    where,
    include: {
      _count: {
        select: { subscriptions: true },
      },
    },
    orderBy: { price: 'asc' },
  })
}

/**
 * Cria uma nova assinatura de SaaS para uma barbearia
 */
export async function createSubscription(data: CreateSubscriptionInput): Promise<Subscription> {
  // 1. Validar barbearia
  const barbershop = await prisma.barbershop.findUnique({
    where: { id: data.barbershopId },
  })
  if (!barbershop) {
    throw new Error('Barbearia não encontrada')
  }

  // 2. Validar plano
  const plan = await prisma.plan.findUnique({
    where: { id: data.planId },
  })
  if (!plan) {
    throw new Error('Plano não encontrado')
  }

  // Regra 10: Bloqueio estrito de novas assinaturas em planos descontinuados
  if (plan.status === 'INACTIVE' || !plan.isActive) {
    throw new Error('Não é possível criar nova assinatura em um plano descontinuado ou inativo')
  }

  const now = new Date()
  const isCourtesy = plan.planType === 'COURTESY'
  const hasTrial = !isCourtesy && plan.trialDays > 0

  let status: SubscriptionStatus = 'ACTIVE'
  let trialStart: Date | null = null
  let trialEnd: Date | null = null
  let currentPeriodStart: Date = now
  let currentPeriodEnd: Date

  if (hasTrial) {
    trialStart = now
    trialEnd = new Date(now.getTime() + plan.trialDays * 24 * 60 * 60 * 1000)
    currentPeriodEnd = trialEnd
    status = 'TRIALING'
  } else {
    currentPeriodEnd = calculatePeriodEnd(now, plan.billingInterval, plan.cycleType, plan.durationDays)
    status = 'ACTIVE'
  }

  // Executa criação da assinatura com SNAPSHOT contratual (Regra 18)
  return await prisma.$transaction(async (tx) => {
    const subscription = await tx.subscription.create({
      data: {
        barbershopId: data.barbershopId,
        planId: data.planId,
        status,
        trialStart,
        trialEnd,
        currentPeriodStart,
        currentPeriodEnd,
        // Snapshot imutável contratado
        price: plan.price,
        durationDays: plan.durationDays,
        planName: plan.name,
        cycleType: plan.cycleType,
        planType: plan.planType,
        notes: data.notes,
        grantedBy: data.grantedBy,
        provider: isCourtesy ? 'NONE' : (data.provider || plan.provider || 'ABACATEPAY'),
        providerSubscriptionId: isCourtesy ? null : data.providerSubscriptionId,
      },
      include: {
        plan: true,
      },
    })

    // Evento de auditoria: Assinatura criada
    await tx.subscriptionEvent.create({
      data: {
        subscriptionId: subscription.id,
        type: 'SUBSCRIPTION_CREATED',
        payload: {
          planId: plan.id,
          planSlug: plan.slug,
          planName: plan.name,
          planType: plan.planType,
          cycleType: plan.cycleType,
          durationDays: plan.durationDays,
          price: plan.price.toString(),
          billingInterval: plan.billingInterval,
          trialDays: plan.trialDays,
          initialStatus: status,
        } as Prisma.InputJsonValue,
      },
    })

    if (hasTrial) {
      // Evento: Trial iniciado
      await tx.subscriptionEvent.create({
        data: {
          subscriptionId: subscription.id,
          type: 'TRIAL_STARTED',
          payload: {
            trialDays: plan.trialDays,
            trialStart: trialStart?.toISOString(),
            trialEnd: trialEnd?.toISOString(),
          } as Prisma.InputJsonValue,
        },
      })
    } else if (!isCourtesy) {
      // Cria fatura inicial em aberto apenas para planos comerciais pagos
      await tx.invoice.create({
        data: {
          subscriptionId: subscription.id,
          barbershopId: data.barbershopId,
          amount: plan.price,
          currency: plan.currency,
          status: 'OPEN',
          dueDate: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000), // 3 dias de vencimento padrão
          provider: data.provider || plan.provider,
        },
      })
    }

    return subscription
  })
}

/**
 * Concessão de Plano Cortesia exclusiva para perfil DEVELOPER (Regras 2 e 3)
 */
export async function grantCourtesySubscription(data: GrantCourtesyInput): Promise<Subscription> {
  if (data.grantedByRole !== 'DEVELOPER') {
    throw new Error('Apenas usuários com papel DEVELOPER podem conceder planos cortesia')
  }

  const barbershop = await prisma.barbershop.findUnique({
    where: { id: data.barbershopId },
  })
  if (!barbershop) {
    throw new Error('Barbearia não encontrada')
  }

  let plan: Plan | null = null

  if (data.planId) {
    plan = await prisma.plan.findUnique({
      where: { id: data.planId },
    })
    if (!plan) {
      throw new Error('Plano cortesia não encontrado')
    }
    if (plan.planType !== 'COURTESY') {
      throw new Error('O plano selecionado não é do tipo cortesia')
    }
    if (plan.status === 'INACTIVE' || !plan.isActive) {
      throw new Error('O plano cortesia selecionado está inativo ou descontinuado')
    }
  } else {
    const durationDays = data.durationDays || 30
    plan = await prisma.plan.findFirst({
      where: {
        planType: 'COURTESY',
        durationDays,
        status: 'ACTIVE',
      },
    })

    if (!plan) {
      const slug = `cortesia-${durationDays}d-${Date.now().toString(36)}`
      plan = await createPlan({
        name: data.name || `Cortesia ${durationDays} Dias`,
        slug,
        description: `Plano cortesia concedido pelo desenvolvedor (${durationDays} dias)`,
        planType: 'COURTESY',
        cycleType: 'CUSTOM',
        durationDays,
        price: 0,
        provider: 'NONE',
        status: 'ACTIVE',
        isActive: true,
      })
    }
  }

  const duration = data.durationDays || plan.durationDays || 30
  const now = new Date()
  const currentPeriodEnd = new Date(now.getTime() + duration * 24 * 60 * 60 * 1000)

  return await prisma.$transaction(async (tx) => {
    const subscription = await tx.subscription.create({
      data: {
        barbershopId: data.barbershopId,
        planId: plan!.id,
        status: 'ACTIVE',
        currentPeriodStart: now,
        currentPeriodEnd,
        price: new Prisma.Decimal('0.00'),
        durationDays: duration,
        planName: plan!.name,
        cycleType: plan!.cycleType,
        planType: 'COURTESY',
        provider: 'NONE',
        grantedBy: data.grantedByUserId,
        notes: data.notes || 'Cortesia concedida pelo DEVELOPER',
      },
      include: {
        plan: true,
      },
    })

    await tx.subscriptionEvent.create({
      data: {
        subscriptionId: subscription.id,
        type: 'SUBSCRIPTION_CREATED',
        payload: {
          planId: plan!.id,
          planName: plan!.name,
          planType: 'COURTESY',
          durationDays: duration,
          grantedBy: data.grantedByUserId,
          reason: data.notes || 'Cortesia concedida por DEVELOPER',
        } as Prisma.InputJsonValue,
      },
    })

    return subscription
  })
}

/**
 * Cancelamento de Cortesia exclusivo para DEVELOPER
 */
export async function cancelCourtesySubscription(
  subscriptionId: string,
  callerRole: string,
  reason?: string
): Promise<Subscription> {
  if (callerRole !== 'DEVELOPER') {
    throw new Error('Apenas DEVELOPER pode cancelar uma cortesia')
  }

  return await prisma.$transaction(async (tx) => {
    const sub = await tx.subscription.findUnique({
      where: { id: subscriptionId },
    })

    if (!sub) {
      throw new Error('Assinatura não encontrada')
    }

    if (sub.planType !== 'COURTESY') {
      throw new Error('A assinatura indicada não é uma cortesia')
    }

    const updated = await tx.subscription.update({
      where: { id: subscriptionId },
      data: {
        status: 'CANCELED',
        canceledAt: new Date(),
        notes: reason ? `${sub.notes || ''} | Cancelada: ${reason}` : sub.notes,
      },
    })

    await tx.subscriptionEvent.create({
      data: {
        subscriptionId,
        type: 'SUBSCRIPTION_CANCELED',
        payload: {
          reason: reason || 'Cortesia cancelada pelo DEVELOPER',
          canceledAt: new Date().toISOString(),
        } as Prisma.InputJsonValue,
      },
    })

    return updated
  })
}

/**
 * Reativação de Cortesia exclusivo para DEVELOPER
 */
export async function reactivateCourtesySubscription(
  subscriptionId: string,
  callerRole: string,
  durationDays?: number
): Promise<Subscription> {
  if (callerRole !== 'DEVELOPER') {
    throw new Error('Apenas DEVELOPER pode reativar uma cortesia')
  }

  return await prisma.$transaction(async (tx) => {
    const sub = await tx.subscription.findUnique({
      where: { id: subscriptionId },
      include: { plan: true },
    })

    if (!sub) {
      throw new Error('Assinatura não encontrada')
    }

    if (sub.planType !== 'COURTESY') {
      throw new Error('A assinatura indicada não é uma cortesia')
    }

    const duration = durationDays || sub.durationDays || sub.plan.durationDays || 30
    const now = new Date()
    const currentPeriodEnd = new Date(now.getTime() + duration * 24 * 60 * 60 * 1000)

    const updated = await tx.subscription.update({
      where: { id: subscriptionId },
      data: {
        status: 'ACTIVE',
        canceledAt: null,
        currentPeriodStart: now,
        currentPeriodEnd,
        durationDays: duration,
      },
    })

    await tx.subscriptionEvent.create({
      data: {
        subscriptionId,
        type: 'SUBSCRIPTION_ACTIVATED',
        payload: {
          reason: 'Cortesia reativada pelo DEVELOPER',
          reactivatedAt: now.toISOString(),
          durationDays: duration,
        } as Prisma.InputJsonValue,
      },
    })

    return updated
  })
}

/**
 * Registra um evento de auditoria no ciclo de vida da assinatura
 */
export async function logSubscriptionEvent(
  subscriptionId: string,
  type: SubscriptionEventType,
  payload: Record<string, any> = {}
): Promise<SubscriptionEvent> {
  return await prisma.subscriptionEvent.create({
    data: {
      subscriptionId,
      type,
      payload: payload as Prisma.InputJsonValue,
    },
  })
}

/**
 * Criação manual ou recorrente de Invoice (Fatura de SaaS)
 */
export async function createInvoice(data: CreateInvoiceInput): Promise<Invoice> {
  return await prisma.invoice.create({
    data: {
      subscriptionId: data.subscriptionId,
      barbershopId: data.barbershopId,
      amount: new Prisma.Decimal(data.amount),
      currency: data.currency || 'BRL',
      dueDate: data.dueDate,
      provider: data.provider,
      providerInvoiceId: data.providerInvoiceId,
      status: 'OPEN',
    },
  })
}

/**
 * Confirmação de pagamento de uma fatura de SaaS (Invoice)
 * Atualiza status da fatura para PAID e da assinatura para ACTIVE se aplicável
 */
export async function payInvoice(
  invoiceId: string,
  details?: { provider?: string; providerInvoiceId?: string }
): Promise<Invoice> {
  return await prisma.$transaction(async (tx) => {
    const invoice = await tx.invoice.findUnique({
      where: { id: invoiceId },
      include: { subscription: true },
    })

    if (!invoice) {
      throw new Error('Fatura não encontrada')
    }

    if (invoice.status === 'PAID') {
      return invoice
    }

    const updatedInvoice = await tx.invoice.update({
      where: { id: invoiceId },
      data: {
        status: 'PAID',
        paidAt: new Date(),
        provider: details?.provider || invoice.provider,
        providerInvoiceId: details?.providerInvoiceId || invoice.providerInvoiceId,
      },
    })

    // Atualiza a assinatura para ACTIVE se estava em TRIALING ou PAST_DUE
    if (invoice.subscription && (invoice.subscription.status === 'TRIALING' || invoice.subscription.status === 'PAST_DUE')) {
      await tx.subscription.update({
        where: { id: invoice.subscriptionId },
        data: { status: 'ACTIVE' },
      })

      await tx.subscriptionEvent.create({
        data: {
          subscriptionId: invoice.subscriptionId,
          type: 'SUBSCRIPTION_ACTIVATED',
          payload: {
            invoiceId: invoice.id,
            amount: invoice.amount.toString(),
            paidAt: new Date().toISOString(),
          } as Prisma.InputJsonValue,
        },
      })
    }

    // Registra evento de pagamento com sucesso
    await tx.subscriptionEvent.create({
      data: {
        subscriptionId: invoice.subscriptionId,
        type: 'PAYMENT_SUCCEEDED',
        payload: {
          invoiceId: invoice.id,
          amount: invoice.amount.toString(),
          provider: details?.provider || invoice.provider,
          providerInvoiceId: details?.providerInvoiceId || invoice.providerInvoiceId,
        } as Prisma.InputJsonValue,
      },
    })

    return updatedInvoice
  })
}

/**
 * Notificação de falha de pagamento de uma fatura de SaaS
 */
export async function failInvoice(invoiceId: string, reason?: string): Promise<Invoice> {
  return await prisma.$transaction(async (tx) => {
    const invoice = await tx.invoice.findUnique({
      where: { id: invoiceId },
      include: { subscription: true },
    })

    if (!invoice) {
      throw new Error('Fatura não encontrada')
    }

    const updatedInvoice = await tx.invoice.update({
      where: { id: invoiceId },
      data: {
        status: 'FAILED',
      },
    })

    // Se a assinatura estava ativa, entra em PAST_DUE (período de tolerância para nova tentativa)
    if (invoice.subscription && invoice.subscription.status === 'ACTIVE') {
      await tx.subscription.update({
        where: { id: invoice.subscriptionId },
        data: { status: 'PAST_DUE' },
      })
    }

    await tx.subscriptionEvent.create({
      data: {
        subscriptionId: invoice.subscriptionId,
        type: 'PAYMENT_FAILED',
        payload: {
          invoiceId: invoice.id,
          amount: invoice.amount.toString(),
          reason: reason || 'Falha na cobrança automática',
        } as Prisma.InputJsonValue,
      },
    })

    return updatedInvoice
  })
}

/**
 * Cancelamento de assinatura
 */
export async function cancelSubscription(
  subscriptionId: string,
  options: { immediately?: boolean; reason?: string } = {}
): Promise<Subscription> {
  return await prisma.$transaction(async (tx) => {
    const subscription = await tx.subscription.findUnique({
      where: { id: subscriptionId },
    })

    if (!subscription) {
      throw new Error('Assinatura não encontrada')
    }

    const dataToUpdate: any = {}
    if (options.immediately) {
      dataToUpdate.status = 'CANCELED'
      dataToUpdate.canceledAt = new Date()
    } else {
      dataToUpdate.cancelAtPeriodEnd = true
    }

    const updated = await tx.subscription.update({
      where: { id: subscriptionId },
      data: dataToUpdate,
    })

    await tx.subscriptionEvent.create({
      data: {
        subscriptionId,
        type: 'SUBSCRIPTION_CANCELED',
        payload: {
          immediately: Boolean(options.immediately),
          reason: options.reason || 'Cancelamento solicitado',
          canceledAt: new Date().toISOString(),
        } as Prisma.InputJsonValue,
      },
    })

    return updated
  })
}

/**
 * Suspensão de assinatura (após esgotamento do período de tolerância ou violação)
 */
export async function suspendSubscription(subscriptionId: string, reason?: string): Promise<Subscription> {
  return await prisma.$transaction(async (tx) => {
    const subscription = await tx.subscription.update({
      where: { id: subscriptionId },
      data: { status: 'SUSPENDED' },
    })

    await tx.subscriptionEvent.create({
      data: {
        subscriptionId,
        type: 'SUBSCRIPTION_SUSPENDED',
        payload: {
          reason: reason || 'Inadimplência ou suspensão administrativa',
          suspendedAt: new Date().toISOString(),
        } as Prisma.InputJsonValue,
      },
    })

    return subscription
  })
}

/**
 * Renovação de assinatura para o próximo período
 */
export async function renewSubscription(subscriptionId: string): Promise<{ subscription: Subscription; invoice: Invoice }> {
  return await prisma.$transaction(async (tx) => {
    const subscription = await tx.subscription.findUnique({
      where: { id: subscriptionId },
      include: { plan: true },
    })

    if (!subscription) {
      throw new Error('Assinatura não encontrada')
    }

    if (subscription.status === 'CANCELED' || subscription.status === 'EXPIRED') {
      throw new Error('Assinaturas canceladas ou expiradas não podem ser renovadas automaticamente')
    }

    // Regra 13: Bloquear renovação se o plano estiver descontinuado ou inativo
    if (subscription.plan.status === 'INACTIVE' || !subscription.plan.isActive) {
      throw new Error('O plano desta assinatura foi descontinuado e não permite renovação. Escolha um novo plano ativo.')
    }

    const nextPeriodStart = new Date(subscription.currentPeriodEnd)
    const nextPeriodEnd = calculatePeriodEnd(
      nextPeriodStart,
      subscription.plan.billingInterval,
      subscription.plan.cycleType,
      subscription.durationDays || subscription.plan.durationDays
    )

    const updatedSubscription = await tx.subscription.update({
      where: { id: subscriptionId },
      data: {
        currentPeriodStart: nextPeriodStart,
        currentPeriodEnd: nextPeriodEnd,
        status: 'ACTIVE',
      },
    })

    const invoice = await tx.invoice.create({
      data: {
        subscriptionId: subscription.id,
        barbershopId: subscription.barbershopId,
        amount: subscription.price ?? subscription.plan.price,
        currency: subscription.plan.currency,
        status: 'OPEN',
        dueDate: new Date(nextPeriodStart.getTime() + 3 * 24 * 60 * 60 * 1000),
        provider: subscription.provider,
      },
    })

    await tx.subscriptionEvent.create({
      data: {
        subscriptionId,
        type: 'SUBSCRIPTION_RENEWED',
        payload: {
          previousPeriodEnd: subscription.currentPeriodEnd.toISOString(),
          newPeriodStart: nextPeriodStart.toISOString(),
          newPeriodEnd: nextPeriodEnd.toISOString(),
          invoiceId: invoice.id,
        } as Prisma.InputJsonValue,
      },
    })

    return { subscription: updatedSubscription, invoice }
  })
}

/**
 * Busca a assinatura ativa atual de uma barbearia
 */
export async function getActiveSubscription(barbershopId: string): Promise<Subscription | null> {
  return await prisma.subscription.findFirst({
    where: {
      barbershopId,
      status: {
        in: ['TRIALING', 'ACTIVE', 'PAST_DUE'],
      },
    },
    include: {
      plan: true,
      invoices: {
        orderBy: { createdAt: 'desc' },
        take: 5,
      },
    },
    orderBy: { createdAt: 'desc' },
  })
}

/**
 * Retorna todo o histórico de assinaturas de uma barbearia
 */
export async function getSubscriptionHistory(barbershopId: string): Promise<Subscription[]> {
  return await prisma.subscription.findMany({
    where: { barbershopId },
    include: {
      plan: true,
      invoices: {
        orderBy: { createdAt: 'desc' },
      },
      events: {
        orderBy: { createdAt: 'desc' },
      },
    },
    orderBy: { createdAt: 'desc' },
  })
}

// ==========================================
// CONTROLE DE ACESSO, TRIAL DE 30 DIAS E AVISOS
// ==========================================

export const DEFAULT_TRIAL_DAYS = 30

export interface SubscriptionAccess {
  allowed: boolean
  canAccessOperations: boolean
  canAccessBillingOnly: boolean
  status: SubscriptionStatus | 'NO_SUBSCRIPTION'
  reason:
    | 'TRIAL_ACTIVE'
    | 'SUBSCRIPTION_ACTIVE'
    | 'TRIAL_EXPIRED'
    | 'PAST_DUE_GRACE_PERIOD'
    | 'SUBSCRIPTION_SUSPENDED'
    | 'SUBSCRIPTION_CANCELED'
    | 'NO_SUBSCRIPTION'
  isTrial: boolean
  daysRemaining: number
  trialStart?: Date | null
  trialEnd?: Date | null
  currentPeriodStart?: Date | null
  currentPeriodEnd?: Date | null
  message: string
  plan?: {
    id: string
    name: string
    slug: string
  } | null
}

/**
 * Cria ou garante o Trial Gratuito de 7 dias para uma nova barbearia comercial
 */
export async function createTrialSubscriptionForBarbershop(
  barbershopId: string,
  txClient: any = prisma,
  trialDays: number = DEFAULT_TRIAL_DAYS
): Promise<Subscription> {
  const now = new Date()
  const trialEnd = new Date(now.getTime() + trialDays * 24 * 60 * 60 * 1000)
  const planSlug = `trial-${trialDays}-days`

  // 1. Localiza ou cria o plano base de Trial gratuito
  let trialPlan = await txClient.plan.findFirst({
    where: { slug: planSlug },
  })

  if (!trialPlan) {
    trialPlan = await txClient.plan.findFirst({
      where: { isActive: true },
      orderBy: { price: 'asc' },
    })
  }

  if (!trialPlan) {
    trialPlan = await txClient.plan.create({
      data: {
        name: `Plano Trial Gratuito (${trialDays} dias)`,
        slug: planSlug,
        description: `Período de avaliação completa de ${trialDays} dias para novas barbearias`,
        price: new Prisma.Decimal('0.00'),
        currency: 'BRL',
        billingInterval: 'MONTHLY',
        trialDays: trialDays,
        isActive: true,
        features: {
          maxBarbers: 5,
          appointments: true,
          dashboard: true,
          publicPage: true,
          financialReports: true,
        },
      },
    })
  }

  // 2. Cria a assinatura com status TRIALING
  const subscription = await txClient.subscription.create({
    data: {
      barbershopId,
      planId: trialPlan.id,
      status: 'TRIALING',
      trialStart: now,
      trialEnd,
      currentPeriodStart: now,
      currentPeriodEnd: trialEnd,
      provider: 'INTERNAL',
    },
    include: {
      plan: true,
    },
  })

  // 3. Atualiza o vencimento de contrato legado para compatibilidade retroativa
  try {
    await txClient.barbershop.update({
      where: { id: barbershopId },
      data: { contractExpiresAt: trialEnd },
    })
  } catch {}

  // 4. Registra eventos de auditoria do trial
  await txClient.subscriptionEvent.create({
    data: {
      subscriptionId: subscription.id,
      type: 'SUBSCRIPTION_CREATED',
      payload: {
        planId: trialPlan.id,
        planSlug: trialPlan.slug,
        isTrial: true,
        trialDays: DEFAULT_TRIAL_DAYS,
      } as Prisma.InputJsonValue,
    },
  })

  await txClient.subscriptionEvent.create({
    data: {
      subscriptionId: subscription.id,
      type: 'TRIAL_STARTED',
      payload: {
        trialStart: now.toISOString(),
        trialEnd: trialEnd.toISOString(),
        trialDays: DEFAULT_TRIAL_DAYS,
      } as Prisma.InputJsonValue,
    },
  })

  return subscription
}

/**
 * Função centralizada de acesso ao SaaS
 * Avalia o status da assinatura, expiração do trial, tolerância e regras de bloqueio
 */
export async function getSubscriptionAccess(
  barbershopId: string,
  currentDate: Date = new Date(),
  txClient: any = prisma
): Promise<SubscriptionAccess> {
  let subscription: any = null
  try {
    if (txClient?.subscription?.findFirst) {
      subscription = await txClient.subscription.findFirst({
        where: { barbershopId },
        include: { plan: true },
        orderBy: { createdAt: 'desc' },
      })
    }
  } catch (err: any) {
    if (err?.code === 'P2021' || err?.message?.includes('does not exist')) {
      subscription = null
    } else {
      throw err
    }
  }

  if (!subscription) {
    // Fallback legado se a barbearia tiver apenas contractExpiresAt ou estiver ativa sem tabela de subscriptions
    let shop: any = null
    try {
      if (txClient?.barbershop?.findUnique) {
        shop = await txClient.barbershop.findUnique({
          where: { id: barbershopId },
          select: { contractExpiresAt: true, isActive: true },
        })
      }
      if (!shop && txClient?.barbershop?.findFirst) {
        shop = await txClient.barbershop.findFirst({
          where: { id: barbershopId },
          select: { contractExpiresAt: true, isActive: true },
        })
      }
    } catch {}

    if (shop?.contractExpiresAt && shop.isActive) {
      const expDate = new Date(shop.contractExpiresAt)
      if (currentDate <= expDate) {
        const daysRemaining = Math.max(0, Math.ceil((expDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24)))
        return {
          allowed: true,
          canAccessOperations: true,
          canAccessBillingOnly: false,
          status: 'ACTIVE',
          reason: 'SUBSCRIPTION_ACTIVE',
          isTrial: false,
          daysRemaining,
          currentPeriodEnd: expDate,
          message: 'Assinatura ativa',
        }
      }
    } else if (shop?.isActive) {
      return {
        allowed: true,
        canAccessOperations: true,
        canAccessBillingOnly: false,
        status: 'ACTIVE',
        reason: 'SUBSCRIPTION_ACTIVE',
        isTrial: false,
        daysRemaining: 30,
        message: 'Assinatura ativa',
      }
    }

    return {
      allowed: false,
      canAccessOperations: false,
      canAccessBillingOnly: true,
      status: 'NO_SUBSCRIPTION',
      reason: 'NO_SUBSCRIPTION',
      isTrial: false,
      daysRemaining: 0,
      message: 'Nenhuma assinatura ativa encontrada. Escolha um plano para começar.',
    }
  }

  const { status, trialStart, trialEnd, currentPeriodStart, currentPeriodEnd, plan } = subscription
  const planInfo = plan ? { id: plan.id, name: plan.name, slug: plan.slug } : null

  // 1. TRIALING
  if (status === 'TRIALING') {
    if (trialEnd && currentDate > trialEnd) {
      // TRIAL EXPIROU: transição automática TRIALING -> EXPIRED
      try {
        await txClient.subscription.update({
          where: { id: subscription.id },
          data: { status: 'EXPIRED' },
        })

        // Registra evento de expiração do trial
        await txClient.subscriptionEvent.create({
          data: {
            subscriptionId: subscription.id,
            type: 'TRIAL_EXPIRED',
            payload: {
              trialEnd: trialEnd.toISOString(),
              expiredAt: currentDate.toISOString(),
            } as Prisma.InputJsonValue,
          },
        })
      } catch {}

      return {
        allowed: false,
        canAccessOperations: false,
        canAccessBillingOnly: true,
        status: 'EXPIRED',
        reason: 'TRIAL_EXPIRED',
        isTrial: false,
        daysRemaining: 0,
        trialStart,
        trialEnd,
        message: 'Seu período de teste gratuito de 30 dias expirou. Escolha um plano para continuar operando.',
        plan: planInfo,
      }
    }

    const daysRemaining = trialEnd
      ? Math.max(0, Math.ceil((trialEnd.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24)))
      : 0

    return {
      allowed: true,
      canAccessOperations: true,
      canAccessBillingOnly: false,
      status: 'TRIALING',
      reason: 'TRIAL_ACTIVE',
      isTrial: true,
      daysRemaining,
      trialStart,
      trialEnd,
      currentPeriodStart,
      currentPeriodEnd,
      message: `Período de teste gratuito ativo (${daysRemaining} dias restantes)`,
      plan: planInfo,
    }
  }

  // 2. ACTIVE
  if (status === 'ACTIVE') {
    if (currentPeriodEnd && currentDate > currentPeriodEnd) {
      // Regra 24: Expiração automática ao atingir término (endDate)
      try {
        await txClient.subscription.update({
          where: { id: subscription.id },
          data: { status: 'EXPIRED' },
        })

        await txClient.subscriptionEvent.create({
          data: {
            subscriptionId: subscription.id,
            type: 'TRIAL_EXPIRED',
            payload: {
              previousStatus: 'ACTIVE',
              newStatus: 'EXPIRED',
              expiredAt: currentDate.toISOString(),
              currentPeriodEnd: currentPeriodEnd.toISOString(),
              reason: 'Período contratado atingiu o término (endDate)',
            } as Prisma.InputJsonValue,
          },
        })
      } catch {}

      return {
        allowed: false,
        canAccessOperations: false,
        canAccessBillingOnly: true,
        status: 'EXPIRED',
        reason: 'TRIAL_EXPIRED',
        isTrial: false,
        daysRemaining: 0,
        currentPeriodStart,
        currentPeriodEnd,
        message: 'Sua assinatura expirou. Escolha um novo plano ativo para continuar utilizando o sistema.',
        plan: planInfo,
      }
    }

    // Regra 8, 9, 27: Mesmo que o plano esteja INACTIVE, enquanto currentDate <= currentPeriodEnd a barbearia continua com acesso normal!
    const daysRemaining = currentPeriodEnd
      ? Math.max(0, Math.ceil((currentPeriodEnd.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24)))
      : 0

    return {
      allowed: true,
      canAccessOperations: true,
      canAccessBillingOnly: false,
      status: 'ACTIVE',
      reason: 'SUBSCRIPTION_ACTIVE',
      isTrial: false,
      daysRemaining,
      currentPeriodStart,
      currentPeriodEnd,
      message: 'Assinatura ativa',
      plan: planInfo,
    }
  }

  // 3. PAST_DUE (Tolerância / Grace Period)
  if (status === 'PAST_DUE') {
    return {
      allowed: true,
      canAccessOperations: true,
      canAccessBillingOnly: false,
      status: 'PAST_DUE',
      reason: 'PAST_DUE_GRACE_PERIOD',
      isTrial: false,
      daysRemaining: 0,
      currentPeriodStart,
      currentPeriodEnd,
      message: 'Pagamento pendente. Por favor, regularize sua fatura.',
      plan: planInfo,
    }
  }

  // 4. SUSPENDED (Suspensão administrativa por inadimplência)
  if (status === 'SUSPENDED') {
    return {
      allowed: false,
      canAccessOperations: false,
      canAccessBillingOnly: true,
      status: 'SUSPENDED',
      reason: 'SUBSCRIPTION_SUSPENDED',
      isTrial: false,
      daysRemaining: 0,
      currentPeriodStart,
      currentPeriodEnd,
      message: 'Acesso suspenso. Regularize seu pagamento para reativar o sistema.',
      plan: planInfo,
    }
  }

  // 5. CANCELED
  if (status === 'CANCELED') {
    if (currentPeriodEnd && currentDate <= currentPeriodEnd) {
      const daysRemaining = Math.max(0, Math.ceil((currentPeriodEnd.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24)))
      return {
        allowed: true,
        canAccessOperations: true,
        canAccessBillingOnly: false,
        status: 'CANCELED',
        reason: 'SUBSCRIPTION_ACTIVE',
        isTrial: false,
        daysRemaining,
        currentPeriodStart,
        currentPeriodEnd,
        message: `Cancelamento agendado para o fim do ciclo (${daysRemaining} dias restantes)`,
        plan: planInfo,
      }
    }

    return {
      allowed: false,
      canAccessOperations: false,
      canAccessBillingOnly: true,
      status: 'CANCELED',
      reason: 'SUBSCRIPTION_CANCELED',
      isTrial: false,
      daysRemaining: 0,
      message: 'Assinatura cancelada. Escolha um plano para reativar.',
      plan: planInfo,
    }
  }

  // 6. EXPIRED
  return {
    allowed: false,
    canAccessOperations: false,
    canAccessBillingOnly: true,
    status: 'EXPIRED',
    reason: 'TRIAL_EXPIRED',
    isTrial: false,
    daysRemaining: 0,
    trialStart,
    trialEnd,
    message: 'Seu período de teste gratuito expirou. Escolha um plano para reativar o sistema.',
    plan: planInfo,
  }
}

/**
 * Atalho booleano para verificar se a barbearia pode realizar operações
 */
export async function canUseSaaS(barbershopId: string, currentDate: Date = new Date()): Promise<boolean> {
  const access = await getSubscriptionAccess(barbershopId, currentDate)
  return access.canAccessOperations
}

/**
 * Validador e disparador de marcos de aviso do trial (7 dias, 3 dias, 1 dia, expirado)
 */
export async function checkTrialMilestones(
  subscriptionId: string,
  currentDate: Date = new Date(),
  txClient: any = prisma
): Promise<SubscriptionEventType | null> {
  const subscription = await txClient.subscription.findUnique({
    where: { id: subscriptionId },
  })

  if (!subscription || subscription.status !== 'TRIALING' || !subscription.trialEnd) {
    return null
  }

  const daysRemaining = Math.ceil(
    (subscription.trialEnd.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24)
  )

  let milestoneType: SubscriptionEventType | null = null

  if (daysRemaining <= 0) {
    milestoneType = 'TRIAL_EXPIRED'
  } else if (daysRemaining <= 1) {
    milestoneType = 'TRIAL_1_DAY_REMAINING'
  } else if (daysRemaining <= 3) {
    milestoneType = 'TRIAL_3_DAYS_REMAINING'
  } else if (daysRemaining <= 7) {
    milestoneType = 'TRIAL_7_DAYS_REMAINING'
  }

  if (!milestoneType) return null

  // Verifica se o evento já foi registrado para evitar duplicidade
  const alreadyLogged = await txClient.subscriptionEvent.findFirst({
    where: {
      subscriptionId,
      type: milestoneType,
    },
  })

  if (alreadyLogged) {
    return null
  }

  // Registra o evento de marco
  await txClient.subscriptionEvent.create({
    data: {
      subscriptionId,
      type: milestoneType,
      payload: {
        daysRemaining,
        checkedAt: currentDate.toISOString(),
        trialEnd: subscription.trialEnd.toISOString(),
      } as Prisma.InputJsonValue,
    },
  })

  // Dispara notificações internas para administradores da barbearia
  try {
    const admins = await txClient.user.findMany({
      where: {
        barbershopId: subscription.barbershopId,
        role: 'ADMIN',
        isActive: true,
      },
      select: { id: true },
    })

    const messages: Record<string, { title: string; message: string }> = {
      TRIAL_7_DAYS_REMAINING: {
        title: 'Seu teste gratuito encerra em 7 dias',
        message: 'Aproveite para configurar sua equipe e agenda. Contrate um plano para continuar sem interrupções.',
      },
      TRIAL_3_DAYS_REMAINING: {
        title: 'Atenção: faltam 3 dias para o fim do seu teste',
        message: 'Evite a paralisação da sua agenda. Escolha um plano para sua barbearia agora.',
      },
      TRIAL_1_DAY_REMAINING: {
        title: 'Último dia de teste gratuito!',
        message: 'Seu período de avaliação termina amanhã. Ative sua assinatura para manter sua barbearia operando.',
      },
      TRIAL_EXPIRED: {
        title: 'Período de teste gratuito expirou',
        message: 'Seus 30 dias de teste gratuito terminaram. Contrate um plano para reativar os agendamentos.',
      },
    }

    const notice = messages[milestoneType]
    if (notice && admins.length > 0) {
      await txClient.notification.createMany({
        data: admins.map((a: { id: string }) => ({
          userId: a.id,
          title: notice.title,
          message: notice.message,
        })),
      })
    }
  } catch {}

  return milestoneType
}
