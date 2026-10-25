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
    // REGRA DE OURO: Sempre retornar os planos ativos salvos no banco de dados e NUNCA planos descontinuados!
    const allLocalPlans = await prisma.plan.findMany({
      include: {
        _count: {
          select: { subscriptions: true },
        },
      },
      orderBy: { price: 'asc' },
    })

    // Função auxiliar para checar se o plano está descontinuado
    const isPlanDiscontinued = (p: any) =>
      p.status === 'INACTIVE' || !p.isActive || Boolean(p.deletedAt)

    // Registra identificadores de planos que foram descontinuados
    const discontinuedNames = new Set(
      allLocalPlans.filter(isPlanDiscontinued).map((p) => p.name.toLowerCase().trim())
    )
    const discontinuedProductIds = new Set(
      allLocalPlans
        .filter((p) => isPlanDiscontinued(p) && p.providerProductId)
        .map((p) => p.providerProductId!)
    )
    const discontinuedPlanIds = new Set(
      allLocalPlans.filter(isPlanDiscontinued).map((p) => p.id)
    )

    // Filtra todos os planos locais ativos (fonte da verdade do sistema)
    const activeLocalPlans = allLocalPlans.filter(
      (p) =>
        p.status === 'ACTIVE' &&
        p.isActive === true &&
        !p.deletedAt &&
        Number(p.price) > 0
    )

    // Inicializa o mapa com os planos ativos salvos no banco
    const validPlansMap = new Map<string, any>()
    for (const p of activeLocalPlans) {
      validPlansMap.set(p.id, {
        ...p,
        isSyncedWithAbacate: Boolean(p.providerProductId && p.providerProductId.trim() !== ''),
      })
    }

    // Tenta enriquecer/sincronizar com a AbacatePay com timeout seguro para não travar a resposta
    try {
      const abacatePromise = listAbacateProducts()
      const timeoutPromise = new Promise<any[]>((resolve) => setTimeout(() => resolve([]), 2000))
      const abacateProducts = await Promise.race([abacatePromise, timeoutPromise])

      if (Array.isArray(abacateProducts) && abacateProducts.length > 0) {
        for (const ap of abacateProducts) {
          const apName = (ap.name || '').toLowerCase().trim()
          const apId = ap.id || ''
          const apExtId = ap.externalId || ''

          // Se o produto na AbacatePay corresponde a um plano descontinuado por ID, ignora
          if (
            (apId && discontinuedProductIds.has(apId)) ||
            (apExtId && discontinuedPlanIds.has(apExtId))
          ) {
            continue
          }

          // Se o produto corresponde a um plano local ativo
          const matching = activeLocalPlans.find(
            (p) =>
              p.providerProductId === ap.id ||
              p.id === ap.externalId ||
              p.name?.toLowerCase().trim() === apName
          )

          if (matching) {
            validPlansMap.set(matching.id, {
              ...matching,
              isSyncedWithAbacate: true,
              providerProductId: ap.id,
              provider: 'ABACATEPAY',
            })

            // Sincroniza o providerProductId no banco caso ainda não estivesse preenchido
            if (matching.providerProductId !== ap.id) {
              prisma.plan
                .update({
                  where: { id: matching.id },
                  data: { providerProductId: ap.id, provider: 'ABACATEPAY' },
                })
                .catch(() => {})
            }
          }
        }
      }
    } catch (abacateErr) {
      console.warn('[ABACATEPAY_SYNC_NOTICE] Sincronia AbacatePay ignorada temporariamente:', abacateErr)
    }

    const verifiedPlans = Array.from(validPlansMap.values())
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
