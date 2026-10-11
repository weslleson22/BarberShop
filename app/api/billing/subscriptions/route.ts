import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/api-auth'
import { createSubscription, getSubscriptionHistory } from '@/lib/billing/saas-billing'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'
export const revalidate = 0

// GET - Listar assinaturas da barbearia (histórico financeiro completo)
export async function GET(request: NextRequest) {
  try {
    const user = getAuthUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const targetShopIdParam = searchParams.get('barbershopId')

    let targetShopId: string | null = null

    if (user.role === 'DEVELOPER') {
      targetShopId = targetShopIdParam || null
      if (!targetShopId) {
        // Se DEVELOPER não passar barbershopId específico, lista todas as assinaturas do SaaS
        const allSubscriptions = await prisma.subscription.findMany({
          include: {
            barbershop: { select: { id: true, name: true, slug: true } },
            plan: true,
            invoices: { orderBy: { createdAt: 'desc' }, take: 5 },
            events: { orderBy: { createdAt: 'desc' }, take: 5 },
          },
          orderBy: { createdAt: 'desc' },
        })
        return NextResponse.json(allSubscriptions)
      }
    } else if (user.role === 'ADMIN') {
      targetShopId = user.barbershopId || null
      if (!targetShopId) {
        const dbUser = await prisma.user.findUnique({
          where: { id: user.id },
          select: { barbershopId: true },
        })
        targetShopId = dbUser?.barbershopId || null
      }
      if (!targetShopId) {
        return NextResponse.json({ error: 'Usuário não vinculado a uma barbearia' }, { status: 403 })
      }
      if (targetShopIdParam && targetShopIdParam !== targetShopId) {
        return NextResponse.json({ error: 'Acesso negado a dados de outra barbearia' }, { status: 403 })
      }
    } else {
      return NextResponse.json({ error: 'Acesso restrito à gestão administrativa' }, { status: 403 })
    }

    let history = await getSubscriptionHistory(targetShopId)

    // Se o histórico estiver vazio para este tenant comercial, garante a criação do Trial automaticamente
    if ((!history || history.length === 0) && targetShopId) {
      try {
        const { createTrialSubscriptionForBarbershop } = await import('@/lib/billing/saas-billing')
        await createTrialSubscriptionForBarbershop(targetShopId)
        history = await getSubscriptionHistory(targetShopId)
      } catch (trialErr) {
        console.warn('Não foi possível gerar trial inicial automaticamente:', trialErr)
      }
    }

    return NextResponse.json(history)
  } catch (error) {
    console.error('Erro ao buscar assinaturas:', error)
    return NextResponse.json({ error: 'Erro ao buscar assinaturas' }, { status: 500 })
  }
}

// POST - Criar ou aderir a uma assinatura do SaaS para a barbearia
export async function POST(request: NextRequest) {
  try {
    const user = getAuthUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const { planId, barbershopId: bodyShopId, provider, providerSubscriptionId } = body

    if (!planId) {
      return NextResponse.json({ error: 'planId é obrigatório' }, { status: 400 })
    }

    let targetShopId: string | null = null
    if (user.role === 'DEVELOPER') {
      targetShopId = bodyShopId || user.barbershopId || null
    } else if (user.role === 'ADMIN') {
      targetShopId = user.barbershopId || null
      if (bodyShopId && bodyShopId !== targetShopId) {
        return NextResponse.json({ error: 'Não é permitido criar assinatura para outro tenant' }, { status: 403 })
      }
    } else {
      return NextResponse.json({ error: 'Acesso restrito à gestão administrativa' }, { status: 403 })
    }

    // Valida se o plano é cortesia: somente DEVELOPER pode atribuir
    const planToSubscribe = await prisma.plan.findUnique({
      where: { id: planId },
    })

    if (!planToSubscribe) {
      return NextResponse.json({ error: 'Plano não encontrado' }, { status: 404 })
    }

    if (planToSubscribe.status === 'INACTIVE' || !planToSubscribe.isActive) {
      return NextResponse.json(
        { error: 'Não é possível assinar um plano inativo ou descontinuado' },
        { status: 400 }
      )
    }

    if (planToSubscribe.planType === 'COURTESY' && user.role !== 'DEVELOPER') {
      return NextResponse.json(
        { error: 'Planos de cortesia só podem ser concedidos exclusivamente pelo DEVELOPER' },
        { status: 403 }
      )
    }

    if (!targetShopId) {
      return NextResponse.json({ error: 'barbershopId é obrigatório' }, { status: 400 })
    }

    const subscription = await createSubscription({
      barbershopId: targetShopId,
      planId,
      provider: planToSubscribe.planType === 'COURTESY' ? 'NONE' : provider,
      providerSubscriptionId,
      grantedBy: user.id,
      notes: body.notes,
    })

    // Atualiza status operacional da Barbearia para APPROVED e estende contrato
    try {
      await prisma.barbershop.update({
        where: { id: targetShopId },
        data: {
          isActive: true,
          status: 'APPROVED',
          contractExpiresAt: subscription.currentPeriodEnd,
        },
      })
    } catch {}

    return NextResponse.json(subscription, { status: 201 })
  } catch (error) {
    console.error('Erro ao criar assinatura:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao criar assinatura' },
      { status: 400 }
    )
  }
}

// PATCH - Atualizar status, estender período ou alterar notas da assinatura
export async function PATCH(request: NextRequest) {
  try {
    const user = getAuthUser(request)
    if (!user || user.role !== 'DEVELOPER') {
      return NextResponse.json({ error: 'Acesso restrito ao DEVELOPER' }, { status: 403 })
    }

    const body = await request.json()
    const { subscriptionId, status, extendDays, notes, planId } = body

    if (!subscriptionId) {
      return NextResponse.json({ error: 'subscriptionId é obrigatório' }, { status: 400 })
    }

    const currentSub = await prisma.subscription.findUnique({
      where: { id: subscriptionId },
      include: { barbershop: true, plan: true },
    })

    if (!currentSub) {
      return NextResponse.json({ error: 'Assinatura não encontrada' }, { status: 404 })
    }

    const updateData: any = { updatedAt: new Date() }

    if (notes !== undefined) {
      updateData.notes = notes
    }

    if (planId && planId !== currentSub.planId) {
      const newPlan = await prisma.plan.findUnique({ where: { id: planId } })
      if (newPlan) {
        updateData.planId = planId
        updateData.planName = newPlan.name
        updateData.price = newPlan.price
        updateData.cycleType = newPlan.cycleType
      }
    }

    if (typeof extendDays === 'number' && extendDays > 0) {
      const baseEnd = currentSub.currentPeriodEnd ? new Date(currentSub.currentPeriodEnd) : new Date()
      const newEnd = new Date(Math.max(baseEnd.getTime(), Date.now()) + extendDays * 24 * 60 * 60 * 1000)
      updateData.currentPeriodEnd = newEnd
      
      if (currentSub.trialEnd) {
        const newTrialEnd = new Date(Math.max(new Date(currentSub.trialEnd).getTime(), Date.now()) + extendDays * 24 * 60 * 60 * 1000)
        updateData.trialEnd = newTrialEnd
      }

      // Se estava vencida ou suspensa, reativa
      if (currentSub.status === 'PAST_DUE' || currentSub.status === 'EXPIRED') {
        updateData.status = 'ACTIVE'
      }

      // Atualiza expiração no registro da barbearia
      await prisma.barbershop.update({
        where: { id: currentSub.barbershopId },
        data: {
          contractExpiresAt: newEnd,
          isActive: true,
          status: 'APPROVED',
        },
      })
    }

    if (status && status !== currentSub.status) {
      updateData.status = status
      if (status === 'CANCELED') {
        updateData.canceledAt = new Date()
      } else if (status === 'ACTIVE') {
        // Se ativou, garante que barbearia está ativa
        await prisma.barbershop.update({
          where: { id: currentSub.barbershopId },
          data: { isActive: true, status: 'APPROVED' },
        })
      } else if (status === 'SUSPENDED') {
        await prisma.barbershop.update({
          where: { id: currentSub.barbershopId },
          data: { status: 'SUSPENDED' },
        })
      }
    }

    const updated = await prisma.subscription.update({
      where: { id: subscriptionId },
      data: updateData,
      include: {
        barbershop: { select: { id: true, name: true, slug: true } },
        plan: true,
        invoices: { orderBy: { createdAt: 'desc' }, take: 5 },
      },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Erro ao atualizar assinatura:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao atualizar assinatura' },
      { status: 500 }
    )
  }
}

// DELETE - Cancelar assinatura
export async function DELETE(request: NextRequest) {
  try {
    const user = getAuthUser(request)
    if (!user || user.role !== 'DEVELOPER') {
      return NextResponse.json({ error: 'Acesso restrito ao DEVELOPER' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const subscriptionId = searchParams.get('id')

    if (!subscriptionId) {
      return NextResponse.json({ error: 'ID da assinatura é obrigatório' }, { status: 400 })
    }

    const updated = await prisma.subscription.update({
      where: { id: subscriptionId },
      data: {
        status: 'CANCELED',
        canceledAt: new Date(),
        updatedAt: new Date(),
      },
    })

    return NextResponse.json({ success: true, subscription: updated })
  } catch (error) {
    console.error('Erro ao cancelar assinatura:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao cancelar assinatura' },
      { status: 500 }
    )
  }
}
