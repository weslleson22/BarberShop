import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/api-auth'
import { createPlan, getPlans, enrichPlanWithDiscount } from '@/lib/billing/saas-billing'
import { createAuditLog } from '@/lib/audit-log'
import { AuditAction, AuditEntity, Prisma } from '@prisma/client'
import { listAbacateProducts } from '@/lib/billing/abacatepay-provider'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'
export const revalidate = 0

// GET - Listar planos disponíveis do SaaS
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const all = searchParams.get('all') === 'true'
    const status = searchParams.get('status')
    const planType = searchParams.get('planType')
    const cycleType = searchParams.get('cycleType')

    // Se solicitar inativos ou todos os status, exige ser DEVELOPER
    if (all || status === 'INACTIVE' || status === 'ALL') {
      const user = getAuthUser(request)
      if (!user || user.role !== 'DEVELOPER') {
        return NextResponse.json({ error: 'Acesso restrito ao perfil DEVELOPER' }, { status: 403 })
      }

      // Painel de desenvolvedor: lista todos os planos do banco enriquecidos com status AbacatePay
      const [abacateProducts, allPlans] = await Promise.all([
        listAbacateProducts().catch(() => []),
        getPlans({
          onlyActive: false,
          status: status && status !== 'ALL' ? (status as any) : undefined,
          planType: planType && planType !== 'ALL' ? (planType as any) : undefined,
          cycleType: cycleType && cycleType !== 'ALL' ? (cycleType as any) : undefined,
        }),
      ])

      const enriched = allPlans.map((p) => {
        const matchingProduct = abacateProducts.find(
          (ap: any) =>
            ap.id === p.providerProductId ||
            ap.externalId === p.id ||
            ap.name?.toLowerCase() === p.name.toLowerCase()
        )
        return enrichPlanWithDiscount({
          ...p,
          isSyncedWithAbacate: Boolean(matchingProduct || p.providerProductId),
          abacateProductId: matchingProduct?.id || p.providerProductId || null,
        })
      })

      return NextResponse.json(enriched)
    }

    // Visão comercial / Landing Page / Dashboard do cliente:
    // Sempre retornar os planos reais salvos no banco de dados (fonte da verdade do sistema)
    const allLocalPlans = await prisma.plan.findMany({
      include: {
        _count: {
          select: { subscriptions: true },
        },
      },
      orderBy: { price: 'asc' },
    })

    // Planos não deletados
    const nonDeletedPlans = allLocalPlans.filter((p) => !p.deletedAt)

    // Filtra ativos (status diferente de INACTIVE e isActive não falso)
    const activeLocalPlans = nonDeletedPlans.filter(
      (p) => p.status !== 'INACTIVE' && p.isActive !== false
    )

    // Se houver ativos explícitos, exibe-os; se não, exibe os planos criados no banco
    const plansToReturn = activeLocalPlans.length > 0 ? activeLocalPlans : nonDeletedPlans

    const verifiedPlans = plansToReturn
      .map(enrichPlanWithDiscount)
      .sort((a, b) => Number(a.price) - Number(b.price))

    return NextResponse.json(verifiedPlans, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        Pragma: 'no-cache',
        Expires: '0',
      },
    })
  } catch (error) {
    console.error('Erro ao buscar planos:', error)
    return NextResponse.json({ error: 'Erro ao buscar planos' }, { status: 500 })
  }
}

// POST - Criar novo plano do SaaS (Exclusivo DEVELOPER da plataforma)
export async function POST(request: NextRequest) {
  try {
    const user = getAuthUser(request)
    if (!user || user.role !== 'DEVELOPER') {
      return NextResponse.json(
        { error: 'Apenas desenvolvedores da plataforma podem criar planos' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const {
      name,
      slug,
      description,
      planType = 'PAID',
      cycleType = 'MONTHLY',
      durationDays,
      price,
      originalPrice,
      discountBadge,
      currency = 'BRL',
      billingInterval,
      trialDays,
      features,
      status = 'ACTIVE',
      isActive = true,
      provider,
      providerProductId,
    } = body

    if (!name || !slug) {
      return NextResponse.json(
        { error: 'Nome e slug são obrigatórios' },
        { status: 400 }
      )
    }

    // Regras de validação (Seção 5)
    if (planType === 'COURTESY') {
      if (price !== undefined && Number(price) !== 0) {
        return NextResponse.json(
          { error: 'Plano cortesia deve possuir preço igual a zero (R$ 0,00)' },
          { status: 400 }
        )
      }
      if (!durationDays || Number(durationDays) <= 0) {
        return NextResponse.json(
          { error: 'Plano cortesia deve possuir uma duração (durationDays) maior que zero' },
          { status: 400 }
        )
      }
    } else {
      if (price === undefined || Number(price) <= 0) {
        return NextResponse.json(
          { error: 'Plano pago deve possuir preço maior que zero' },
          { status: 400 }
        )
      }
    }

    if (cycleType === 'CUSTOM') {
      if (!durationDays || Number(durationDays) <= 0) {
        return NextResponse.json(
          { error: 'Plano com ciclo personalizado deve possuir durationDays maior que zero' },
          { status: 400 }
        )
      }
    }

    const plan = await createPlan({
      name,
      slug,
      description,
      planType,
      cycleType,
      durationDays: durationDays ? Number(durationDays) : undefined,
      price: planType === 'COURTESY' ? 0 : price,
      originalPrice,
      discountBadge,
      currency,
      billingInterval,
      trialDays: trialDays !== undefined ? Number(trialDays) : undefined,
      features,
      status,
      isActive,
      provider: planType === 'COURTESY' ? 'NONE' : provider,
      providerProductId,
    })

    // Auditoria (Seção 20)
    await createAuditLog({
      userId: user.id,
      barbershopId: user.barbershopId || null,
      action: AuditAction.PLAN_CREATED,
      entity: AuditEntity.PLAN,
      entityId: plan.id,
      metadata: {
        actionType: planType === 'COURTESY' ? 'CREATE_COURTESY' : 'CREATE_PLAN',
        name: plan.name,
        slug: plan.slug,
        planType: plan.planType,
        cycleType: plan.cycleType,
        durationDays: plan.durationDays,
        price: plan.price.toString(),
        status: plan.status,
      },
      success: true,
    })

    return NextResponse.json(plan, { status: 201 })
  } catch (error) {
    console.error('Erro ao criar plano:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao criar plano' },
      { status: 400 }
    )
  }
}
