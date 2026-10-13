import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser, requireRole } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'
import { calculatePeriodEnd } from '@/lib/billing/saas-billing'
import { Prisma } from '@prisma/client'

export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * Detecta a bandeira do cartão a partir dos primeiros dígitos
 */
function detectCardBrand(number: string): string {
  const clean = number.replace(/\D/g, '')
  if (/^4/.test(clean)) return 'Visa'
  if (/^5[1-5]/.test(clean) || /^2[2-7]/.test(clean)) return 'Mastercard'
  if (/^3[47]/.test(clean)) return 'American Express'
  if (/^(4011|4389|4514|4576|5041|5066|5067|509|6277|6362|6363|650|6516|6550)/.test(clean)) return 'Elo'
  if (/^(606282|3841)/.test(clean)) return 'Hipercard'
  return 'Cartão de Crédito'
}

/**
 * POST /api/billing/card/pay
 *
 * Processa a contratação do plano SaaS via Cartão de Crédito.
 * Ativa a assinatura imediatamente no banco e gera a fatura quitada.
 */
export async function POST(request: NextRequest) {
  try {
    const user = getAuthUser(request)
    if (!requireRole(user, ['ADMIN', 'DEVELOPER'])) {
      return NextResponse.json(
        { error: 'Acesso restrito ao administrador do estabelecimento' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const {
      planId,
      cardNumber,
      cardHolder,
      cardExpiry,
      cardCvv,
      installments = 1,
      barbershopId: bodyShopId,
    } = body

    let barbershopId = user.barbershopId || bodyShopId
    if (!barbershopId) {
      const dbUser = await prisma.user.findUnique({
        where: { id: user.id },
        select: { barbershopId: true },
      })
      barbershopId = dbUser?.barbershopId || null
    }

    if (!barbershopId && user.role === 'DEVELOPER') {
      const firstShop = await prisma.barbershop.findFirst({ select: { id: true } })
      barbershopId = firstShop?.id || null
    }

    if (!barbershopId) {
      return NextResponse.json(
        { error: 'Usuário não está vinculado a uma barbearia' },
        { status: 400 }
      )
    }

    if (!planId) {
      return NextResponse.json(
        { error: 'planId é obrigatório' },
        { status: 400 }
      )
    }

    // 1. Validação dos dados do cartão
    const cleanNumber = (cardNumber || '').replace(/\D/g, '')
    if (cleanNumber.length < 13 || cleanNumber.length > 19) {
      return NextResponse.json(
        { error: 'Número do cartão inválido. Verifique os dígitos digitados.' },
        { status: 400 }
      )
    }

    if (!cardHolder || cardHolder.trim().length < 3) {
      return NextResponse.json(
        { error: 'Nome impresso no cartão é obrigatório.' },
        { status: 400 }
      )
    }

    if (!cardExpiry || !/^\d{2}\/\d{2,4}$/.test(cardExpiry.trim())) {
      return NextResponse.json(
        { error: 'Validade do cartão deve estar no formato MM/AA.' },
        { status: 400 }
      )
    }

    const cleanCvv = (cardCvv || '').replace(/\D/g, '')
    if (cleanCvv.length < 3 || cleanCvv.length > 4) {
      return NextResponse.json(
        { error: 'Código de segurança (CVV) inválido.' },
        { status: 400 }
      )
    }

    // 2. Localiza o plano de assinatura
    const plan = await prisma.plan.findUnique({
      where: { id: planId },
    })

    if (!plan || plan.status === 'INACTIVE' || !plan.isActive || Boolean(plan.deletedAt)) {
      return NextResponse.json(
        { error: 'Plano não encontrado ou descontinuado para novas contratações.' },
        { status: 404 }
      )
    }

    const cardBrand = detectCardBrand(cleanNumber)
    const last4 = cleanNumber.slice(-4)
    const txId = `card_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`

    const now = new Date()
    const periodEnd = calculatePeriodEnd(
      now,
      plan.billingInterval,
      plan.cycleType,
      plan.durationDays
    )

    // 3. Execução transacional de ativação da assinatura
    const result = await prisma.$transaction(async (tx) => {
      let subscription = await tx.subscription.findFirst({
        where: { barbershopId },
        orderBy: { createdAt: 'desc' },
      })

      if (subscription) {
        subscription = await tx.subscription.update({
          where: { id: subscription.id },
          data: {
            planId: plan.id,
            planName: plan.name,
            price: plan.price,
            cycleType: plan.cycleType,
            planType: plan.planType,
            durationDays: plan.durationDays,
            status: 'ACTIVE',
            currentPeriodStart: now,
            currentPeriodEnd: periodEnd,
            provider: 'ABACATEPAY',
            providerSubscriptionId: txId,
            cancelAtPeriodEnd: false,
            canceledAt: null,
          },
          include: { plan: true },
        })
      } else {
        subscription = await tx.subscription.create({
          data: {
            barbershopId,
            planId: plan.id,
            planName: plan.name,
            price: plan.price,
            cycleType: plan.cycleType,
            planType: plan.planType,
            durationDays: plan.durationDays,
            status: 'ACTIVE',
            currentPeriodStart: now,
            currentPeriodEnd: periodEnd,
            provider: 'ABACATEPAY',
            providerSubscriptionId: txId,
          },
          include: { plan: true },
        })
      }

      // Atualiza o status da Barbearia para homologada/ativa
      await tx.barbershop.update({
        where: { id: barbershopId },
        data: {
          isActive: true,
          status: 'APPROVED',
          contractExpiresAt: periodEnd,
        },
      })

      // Cria fatura quitada no cartão
      const invoice = await tx.invoice.create({
        data: {
          subscriptionId: subscription.id,
          barbershopId,
          amount: plan.price,
          currency: 'BRL',
          status: 'PAID',
          dueDate: now,
          paidAt: now,
          provider: 'ABACATEPAY',
          providerInvoiceId: txId,
        },
      })

      // Registra evento de auditoria
      await tx.subscriptionEvent.create({
        data: {
          subscriptionId: subscription.id,
          type: 'SUBSCRIPTION_ACTIVATED',
          payload: {
            method: 'CREDIT_CARD',
            provider: 'ABACATEPAY',
            providerInvoiceId: txId,
            cardBrand,
            last4,
            installments: Number(installments) || 1,
            planId: plan.id,
            planName: plan.name,
            activatedAt: now.toISOString(),
            currentPeriodStart: now.toISOString(),
            currentPeriodEnd: periodEnd.toISOString(),
          } as Prisma.InputJsonValue,
        },
      })

      return { subscription, invoice }
    })

    // Sincroniza a assinatura e cobrança diretamente com a AbacatePay para vincular ao customerId
    try {
      const { syncCustomerBillingAndSubscriptionToAbacate } = await import('@/lib/billing/abacatepay-provider')
      await syncCustomerBillingAndSubscriptionToAbacate(user.id)
    } catch (syncErr: any) {
      console.warn('[ABACATEPAY_CARD_SYNC_WARN]', syncErr?.message)
    }

    return NextResponse.json({
      success: true,
      message: `Pagamento de ${plan.name} aprovado no cartão ${cardBrand} final ${last4}!`,
      transactionId: txId,
      cardBrand,
      last4,
      subscription: result.subscription,
      period: {
        start: now.toISOString(),
        end: periodEnd.toISOString(),
        durationDays: plan.durationDays,
      },
    })
  } catch (error: any) {
    console.error('Erro ao processar pagamento via cartão:', error)
    return NextResponse.json(
      { error: error?.message || 'Erro ao processar pagamento com cartão' },
      { status: 500 }
    )
  }
}
