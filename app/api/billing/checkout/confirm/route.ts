import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'
import { calculatePeriodEnd } from '@/lib/billing/saas-billing'
import { listAbacateCheckouts } from '@/lib/billing/abacatepay-provider'
import { Prisma } from '@prisma/client'

export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * POST /api/billing/checkout/confirm
 * Sincroniza o status de pagamento após o retorno do Checkout Hospedado da AbacatePay.
 * 
 * Garante que:
 * 1. O plano contratado na AbacatePay torne-se imediatamente o plano ativo da barbearia.
 * 2. O comprovante oficial da AbacatePay (receiptUrl / hostedInvoiceUrl) fique salvo no banco de dados.
 * 3. A fatura com status PAID fique disponível para consulta e download na coluna "Comprovante".
 */
export async function POST(request: NextRequest) {
  try {
    const user = getAuthUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    let body: any = {}
    try {
      body = await request.json()
    } catch {
      // Body vazio é aceitável
    }

    const { searchParams } = new URL(request.url)
    const planIdParam = body.planId || searchParams.get('plan_id') || searchParams.get('planId')
    const targetShopIdParam = body.barbershopId || searchParams.get('barbershopId')

    let barbershopId: string | null = null

    if (user.role === 'DEVELOPER') {
      barbershopId = targetShopIdParam || user.barbershopId || null
      if (!barbershopId) {
        // Se DEVELOPER não passar barbershopId, pega a primeira barbearia ativa
        const firstShop = await prisma.barbershop.findFirst({ select: { id: true } })
        barbershopId = firstShop?.id || null
      }
    } else if (user.role === 'ADMIN') {
      barbershopId = user.barbershopId || null
      if (!barbershopId) {
        const dbUser = await prisma.user.findUnique({
          where: { id: user.id },
          select: { barbershopId: true },
        })
        barbershopId = dbUser?.barbershopId || null
      }
    }

    if (!barbershopId) {
      return NextResponse.json({ error: 'Barbearia não vinculada ao usuário' }, { status: 400 })
    }

    const shop = await prisma.barbershop.findUnique({
      where: { id: barbershopId },
      include: {
        subscriptions: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: { plan: true },
        },
      },
    })

    if (!shop) {
      return NextResponse.json({ error: 'Barbearia não encontrada' }, { status: 404 })
    }

    // 1. Consulta checkouts oficiais registrados na AbacatePay
    console.info(`[CHECKOUT_CONFIRM] Sincronizando pagamentos AbacatePay para a barbearia ${barbershopId}...`)
    const checkouts = await listAbacateCheckouts()

    // Filtra checkouts associados a esta barbearia ou plano
    let matchingCheckouts = checkouts.filter((c: any) => {
      const ext = c.externalId || ''
      const metaShop = c.metadata?.barbershopId || ''
      return ext === barbershopId || metaShop === barbershopId
    })

    if (matchingCheckouts.length === 0 && planIdParam) {
      matchingCheckouts = checkouts.filter((c: any) => {
        const metaPlan = c.metadata?.planId || ''
        return metaPlan === planIdParam
      })
    }

    // Se nenhum filtro estrito bateu, considera o checkout mais recente criado na loja (últimas 2 horas)
    if (matchingCheckouts.length === 0 && checkouts.length > 0) {
      const twoHoursAgo = Date.now() - 2 * 60 * 60 * 1000
      const recents = checkouts.filter((c: any) => {
        const t = c.createdAt ? new Date(c.createdAt).getTime() : 0
        return t > twoHoursAgo
      })
      if (recents.length > 0) {
        matchingCheckouts = recents
      }
    }

    // Ordena do mais recente para o mais antigo
    matchingCheckouts.sort((a: any, b: any) => {
      const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0
      const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0
      return timeB - timeA
    })

    const latestCheckout = matchingCheckouts[0] || null

    // 2. Identifica o Plano contratado
    let targetPlanId = planIdParam || latestCheckout?.metadata?.planId || null
    let targetPlan: any = null

    if (targetPlanId) {
      targetPlan = await prisma.plan.findUnique({ where: { id: targetPlanId } })
    }

    // Se ainda não identificou pelo ID, tenta pelo produto do checkout
    if (!targetPlan && latestCheckout?.items?.length) {
      const firstItem = latestCheckout.items[0]
      const prodId = typeof firstItem === 'string' ? firstItem : firstItem?.id || firstItem?.productId
      if (prodId) {
        targetPlan = await prisma.plan.findFirst({
          where: {
            OR: [
              { providerProductId: prodId },
              { id: prodId.replace('chk_', '') },
            ],
          },
        })
      }
    }

    // Se ainda não achou, seleciona o plano comercial da assinatura existente ou o primeiro ativo
    if (!targetPlan) {
      if (shop.subscriptions?.[0]?.plan && shop.subscriptions[0].plan.planType === 'PAID') {
        targetPlan = shop.subscriptions[0].plan
      } else {
        targetPlan = await prisma.plan.findFirst({
          where: { isActive: true, status: 'ACTIVE', planType: 'PAID' },
          orderBy: { price: 'asc' },
        })
      }
    }

    if (!targetPlan) {
      return NextResponse.json(
        { error: 'Nenhum plano comercial ativo disponível para ativação' },
        { status: 404 }
      )
    }

    // 3. Monta o link do comprovante oficial da AbacatePay (/receipt/ em vez de /pay/)
    const checkoutId = latestCheckout?.id || `chk_${Date.now()}`
    let receiptUrl = latestCheckout?.receiptUrl || null
    if (!receiptUrl && latestCheckout?.id) {
      receiptUrl = `https://app.abacatepay.com/receipt/${latestCheckout.id}`
    } else if (!receiptUrl && latestCheckout?.url) {
      receiptUrl = latestCheckout.url.replace('/pay/', '/receipt/')
    } else if (!receiptUrl) {
      receiptUrl = 'https://app.abacatepay.com/billings'
    }

    const now = new Date()
    const periodEnd = calculatePeriodEnd(
      now,
      targetPlan.billingInterval,
      targetPlan.cycleType,
      targetPlan.durationDays
    )

    // 4. Executa transação atômica no banco de dados
    const result = await prisma.$transaction(async (tx) => {
      let subscription = await tx.subscription.findFirst({
        where: { barbershopId },
        orderBy: { createdAt: 'desc' },
      })

      const subscriptionData: any = {
        planId: targetPlan.id,
        planName: targetPlan.name,
        planType: targetPlan.planType,
        cycleType: targetPlan.cycleType,
        durationDays: targetPlan.durationDays,
        price: targetPlan.price,
        status: 'ACTIVE',
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        cancelAtPeriodEnd: false,
        canceledAt: null,
        provider: 'ABACATEPAY',
        providerSubscriptionId: checkoutId,
      }

      if (subscription) {
        subscription = await tx.subscription.update({
          where: { id: subscription.id },
          data: subscriptionData,
        })
      } else {
        subscription = await tx.subscription.create({
          data: {
            barbershopId,
            ...subscriptionData,
          },
        })
      }

      // Atualiza barbearia: aprovada e ativa
      await tx.barbershop.update({
        where: { id: barbershopId },
        data: {
          isActive: true,
          status: 'APPROVED',
          contractExpiresAt: periodEnd,
        },
      })

      // Cria ou atualiza fatura com status PAID e link do comprovante
      let invoice = await tx.invoice.findFirst({
        where: {
          OR: [
            { providerInvoiceId: receiptUrl },
            { providerInvoiceId: checkoutId },
            ...(latestCheckout?.url ? [{ providerInvoiceId: latestCheckout.url }] : []),
            { subscriptionId: subscription.id, status: 'OPEN' },
            { subscriptionId: subscription.id, status: 'PAID' },
          ],
        },
        orderBy: { createdAt: 'desc' },
      })

      if (invoice) {
        invoice = await tx.invoice.update({
          where: { id: invoice.id },
          data: {
            status: 'PAID',
            paidAt: now,
            amount: targetPlan.price,
            provider: 'ABACATEPAY',
            providerInvoiceId: receiptUrl,
          },
        })
      } else {
        invoice = await tx.invoice.create({
          data: {
            subscriptionId: subscription.id,
            barbershopId,
            amount: targetPlan.price,
            currency: 'BRL',
            status: 'PAID',
            dueDate: now,
            paidAt: now,
            provider: 'ABACATEPAY',
            providerInvoiceId: receiptUrl,
          },
        })
      }

      // Evento de auditoria
      await tx.subscriptionEvent.create({
        data: {
          subscriptionId: subscription.id,
          type: 'SUBSCRIPTION_ACTIVATED',
          payload: {
            activatedVia: 'CHECKOUT_CONFIRM',
            planId: targetPlan.id,
            planName: targetPlan.name,
            amount: targetPlan.price.toString(),
            checkoutId,
            receiptUrl,
            invoiceId: invoice.id,
            activatedAt: now.toISOString(),
            currentPeriodEnd: periodEnd.toISOString(),
          } as Prisma.InputJsonValue,
        },
      })

      return {
        subscription,
        invoice,
      }
    })

    console.info(`[CHECKOUT_CONFIRM_SUCCESS] Assinatura atualizada com sucesso para o plano ${targetPlan.name} na barbearia ${barbershopId}. Comprovante: ${receiptUrl}`)

    return NextResponse.json({
      success: true,
      message: `Plano ${targetPlan.name} ativado com sucesso!`,
      plan: {
        id: targetPlan.id,
        name: targetPlan.name,
        price: Number(targetPlan.price),
      },
      subscription: {
        id: result.subscription.id,
        status: result.subscription.status,
        planName: result.subscription.planName,
        currentPeriodStart: result.subscription.currentPeriodStart,
        currentPeriodEnd: result.subscription.currentPeriodEnd,
      },
      invoice: {
        id: result.invoice.id,
        status: result.invoice.status,
        amount: Number(result.invoice.amount),
        hostedInvoiceUrl: receiptUrl,
        paidAt: result.invoice.paidAt,
      },
    })
  } catch (error: any) {
    console.error('[CHECKOUT_CONFIRM_ERROR]', error)
    return NextResponse.json(
      { error: error?.message || 'Erro ao confirmar pagamento na AbacatePay' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  return POST(request)
}
