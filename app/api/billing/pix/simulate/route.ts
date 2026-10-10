import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser, requireRole } from '@/lib/api-auth'
import { simulateAbacatePayment } from '@/lib/billing/abacatepay-provider'
import { prisma } from '@/lib/prisma'
import { calculatePeriodEnd } from '@/lib/billing/saas-billing'
import { Prisma } from '@prisma/client'

export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * POST /api/billing/pix/simulate
 *
 * Simula o pagamento de uma cobrança PIX no modo Sandbox / DevMode da AbacatePay.
 */
export async function POST(request: NextRequest) {
  try {
    const user = getAuthUser(request)
    if (!requireRole(user, ['ADMIN', 'DEVELOPER'])) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { pixId, planId } = body

    const effectivePixId = pixId || `sim_dev_${Date.now()}`

    // 1. Simula pagamento na API da AbacatePay (com fallback seguro para sandbox)
    const simResult = await simulateAbacatePayment(effectivePixId)

    // 2. Se a simulação tiver sucesso, atualiza ou cria a assinatura correspondente no banco local
    const barbershopId = user.barbershopId
    let updatedSubscription: any = null

    if (barbershopId) {
      await prisma.$transaction(async (tx) => {
        // Localiza o plano contratado (passado explicitamente ou plano atual/padrão)
        let targetPlan: any = null
        if (planId) {
          targetPlan = await tx.plan.findUnique({ where: { id: planId } })
        }

        if (!targetPlan) {
          const currentSub = await tx.subscription.findFirst({
            where: { barbershopId },
            orderBy: { createdAt: 'desc' },
            include: { plan: true },
          })
          if (currentSub?.plan) {
            targetPlan = currentSub.plan
          } else {
            targetPlan = await tx.plan.findFirst({
              where: { isActive: true, status: 'ACTIVE', planType: 'PAID' },
              orderBy: { price: 'asc' },
            })
          }
        }

        if (!targetPlan) {
          throw new Error('Nenhum plano disponível para ativação da assinatura')
        }

        const now = new Date()
        const periodEnd = calculatePeriodEnd(
          now,
          targetPlan.billingInterval,
          targetPlan.cycleType,
          targetPlan.durationDays
        )

        let subscription = await tx.subscription.findFirst({
          where: { barbershopId },
          orderBy: { createdAt: 'desc' },
        })

        if (subscription) {
          subscription = await tx.subscription.update({
            where: { id: subscription.id },
            data: {
              planId: targetPlan.id,
              planName: targetPlan.name,
              price: targetPlan.price,
              cycleType: targetPlan.cycleType,
              planType: targetPlan.planType,
              durationDays: targetPlan.durationDays,
              status: 'ACTIVE',
              currentPeriodStart: now,
              currentPeriodEnd: periodEnd,
              provider: 'ABACATEPAY',
              providerSubscriptionId: effectivePixId,
              cancelAtPeriodEnd: false,
              canceledAt: null,
            },
            include: { plan: true },
          })
        } else {
          subscription = await tx.subscription.create({
            data: {
              barbershopId,
              planId: targetPlan.id,
              planName: targetPlan.name,
              price: targetPlan.price,
              cycleType: targetPlan.cycleType,
              planType: targetPlan.planType,
              durationDays: targetPlan.durationDays,
              status: 'ACTIVE',
              currentPeriodStart: now,
              currentPeriodEnd: periodEnd,
              provider: 'ABACATEPAY',
              providerSubscriptionId: effectivePixId,
            },
            include: { plan: true },
          })
        }

        updatedSubscription = subscription

        await tx.barbershop.update({
          where: { id: barbershopId },
          data: {
            isActive: true,
            status: 'APPROVED',
            contractExpiresAt: periodEnd,
          },
        })

        const existingInvoice = await tx.invoice.findFirst({
          where: { providerInvoiceId: effectivePixId },
        })

        if (!existingInvoice) {
          await tx.invoice.create({
            data: {
              subscriptionId: subscription.id,
              barbershopId,
              amount: targetPlan.price,
              currency: 'BRL',
              status: 'PAID',
              dueDate: now,
              paidAt: now,
              provider: 'ABACATEPAY',
              providerInvoiceId: effectivePixId,
            },
          })
        } else {
          await tx.invoice.update({
            where: { id: existingInvoice.id },
            data: {
              status: 'PAID',
              paidAt: now,
              amount: targetPlan.price,
            },
          })
        }

        await tx.subscriptionEvent.create({
          data: {
            subscriptionId: subscription.id,
            type: 'SUBSCRIPTION_ACTIVATED',
            payload: {
              provider: 'ABACATEPAY',
              providerInvoiceId: effectivePixId,
              planId: targetPlan.id,
              planName: targetPlan.name,
              activatedVia: 'devmode_simulation',
              activatedAt: now.toISOString(),
              periodEnd: periodEnd.toISOString(),
            } as Prisma.InputJsonValue,
          },
        })
      })
    }

    return NextResponse.json({
      success: true,
      message: 'Pagamento PIX simulado e plano contratado com sucesso!',
      data: simResult,
      subscription: updatedSubscription,
    })
  } catch (error: any) {
    console.error('Erro ao simular pagamento PIX:', error)
    return NextResponse.json(
      { error: error?.message || 'Erro ao simular pagamento' },
      { status: 500 }
    )
  }
}
