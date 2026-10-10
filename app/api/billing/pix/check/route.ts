import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser, requireRole } from '@/lib/api-auth'
import { checkAbacatePixStatus } from '@/lib/billing/abacatepay-provider'
import { prisma } from '@/lib/prisma'
import { calculatePeriodEnd } from '@/lib/billing/saas-billing'
import { Prisma } from '@prisma/client'

export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * GET /api/billing/pix/check?id=pix_char_...
 *
 * Consulta o status do PIX Transparente na AbacatePay e sincroniza a assinatura se aprovado.
 */
export async function GET(request: NextRequest) {
  try {
    const user = getAuthUser(request)
    if (!requireRole(user, ['ADMIN', 'DEVELOPER'])) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const pixId = searchParams.get('id')
    const planId = searchParams.get('planId')

    if (!pixId) {
      return NextResponse.json(
        { error: 'ID da cobrança PIX é obrigatório' },
        { status: 400 }
      )
    }

    const pixData = await checkAbacatePixStatus(pixId)

    // Se o PIX estiver pago, sincroniza a assinatura da barbearia imediatamente
    if (pixData.status === 'PAID' && user.barbershopId) {
      const barbershopId = user.barbershopId

      await prisma.$transaction(async (tx) => {
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
          throw new Error('Nenhum plano disponível para ativação')
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
              providerSubscriptionId: pixId,
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
              providerSubscriptionId: pixId,
            },
            include: { plan: true },
          })
        }

        await tx.barbershop.update({
          where: { id: barbershopId },
          data: {
            isActive: true,
            status: 'APPROVED',
            contractExpiresAt: periodEnd,
          },
        })

        // Idempotência na fatura
        const existingInvoice = await tx.invoice.findFirst({
          where: { providerInvoiceId: pixId },
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
              providerInvoiceId: pixId,
            },
          })
        } else if (existingInvoice.status !== 'PAID') {
          await tx.invoice.update({
            where: { id: existingInvoice.id },
            data: { status: 'PAID', paidAt: now, amount: targetPlan.price },
          })
        }

        // Registra evento de auditoria se ainda não registrado para este pixId
        const existingEvent = await tx.subscriptionEvent.findFirst({
          where: {
            subscriptionId: subscription.id,
            payload: { path: ['providerInvoiceId'], equals: pixId },
          },
        })

        if (!existingEvent) {
          await tx.subscriptionEvent.create({
            data: {
              subscriptionId: subscription.id,
              type: 'SUBSCRIPTION_ACTIVATED',
              payload: {
                provider: 'ABACATEPAY',
                providerInvoiceId: pixId,
                planId: targetPlan.id,
                planName: targetPlan.name,
                activatedVia: 'pix_check_instant',
                activatedAt: now.toISOString(),
                periodEnd: periodEnd.toISOString(),
              } as Prisma.InputJsonValue,
            },
          })
        }
      })
    }

    return NextResponse.json({
      id: pixData.id,
      status: pixData.status,
      expiresAt: pixData.expiresAt,
    })
  } catch (error: any) {
    console.error('Erro ao consultar status PIX:', error)
    return NextResponse.json(
      { error: error?.message || 'Erro ao consultar PIX' },
      { status: 500 }
    )
  }
}
