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
        return NextResponse.json({ error: 'Usuário não vinculado a uma barbearia' }, { status: 403 })
      }
      if (targetShopIdParam && targetShopIdParam !== targetShopId) {
        return NextResponse.json({ error: 'Acesso negado a dados de outra barbearia' }, { status: 403 })
      }
    } else {
      return NextResponse.json({ error: 'Acesso restrito à gestão administrativa' }, { status: 403 })
    }

    const history = await getSubscriptionHistory(targetShopId)
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

    if (!targetShopId) {
      return NextResponse.json({ error: 'barbershopId é obrigatório' }, { status: 400 })
    }

    const subscription = await createSubscription({
      barbershopId: targetShopId,
      planId,
      provider,
      providerSubscriptionId,
    })

    return NextResponse.json(subscription, { status: 201 })
  } catch (error) {
    console.error('Erro ao criar assinatura:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao criar assinatura' },
      { status: 400 }
    )
  }
}
