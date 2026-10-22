import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/api-auth'
import { createPlan, getPlans, enrichPlanWithDiscount } from '@/lib/billing/saas-billing'
import { createAuditLog } from '@/lib/audit-log'
import { AuditAction, AuditEntity, Prisma } from '@prisma/client'
import { listAbacateProducts } from '@/lib/billing/abacatepay-provider'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'
export const revalidate = 0

// GET - Listar planos disponíveis do SaaS (Apenas os criados na AbacatePay)
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

    // Visão comercial / Dashboard do cliente (/dashboard/assinatura e /checkout):
    // REGRA DE OURO: Retornar APENAS planos criados/sincronizados na AbacatePay e NUNCA planos descontinuados!
    let abacateProducts: any[] = []
    try {
      abacateProducts = await listAbacateProducts()
    } catch (abacateErr) {
      console.warn('[ABACATEPAY_LIST_WARN] Falha ao consultar API AbacatePay:', abacateErr)
    }

    // Busca todos os planos locais do banco para verificar histórico e descontinuação
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

    // Se temos produtos da AbacatePay retornados da API
    if (Array.isArray(abacateProducts) && abacateProducts.length > 0) {
      const validPlansMap = new Map<string, any>()

      // 1. Cruza produtos da AbacatePay com planos locais
      for (const ap of abacateProducts) {
        const apName = (ap.name || '').toLowerCase().trim()
        const apId = ap.id || ''
        const apExtId = ap.externalId || ''

        // SE O PRODUTO CORRESPONDE A UM PLANO DESCONTINUADO NO SISTEMA:
        // Bloqueia e NÃO exibe para administradores sob hipótese alguma!
        if (
          (apId && discontinuedProductIds.has(apId)) ||
          (apExtId && discontinuedPlanIds.has(apExtId)) ||
          (apName && discontinuedNames.has(apName))
        ) {
          // Desativa por segurança qualquer duplicata ativa remanescente no banco com esse nome/id
          try {
            await prisma.plan.updateMany({
              where: {
                OR: [
                  { providerProductId: apId },
                  ...(apExtId ? [{ id: apExtId }] : []),
                  { name: { equals: ap.name, mode: 'insensitive' } },
                ],
                status: 'ACTIVE',
              },
              data: {
                status: 'INACTIVE',
                isActive: false,
                deletedAt: new Date(),
              },
            })
          } catch {
            // Ignora falha silenciosa
          }
          continue // Pula o produto descontinuado, não exibe para os administradores
        }

        // Encontra se já temos o plano local correspondente
        let matching = allLocalPlans.find(
          (p) =>
            p.providerProductId === ap.id ||
            p.id === ap.externalId ||
            p.name?.toLowerCase() === apName
        )

        // Se encontrou no banco mas ele foi descontinuado, ignora
        if (matching && isPlanDiscontinued(matching)) {
          continue
        }

        // Se encontrou localmente e está ativo, mas ainda não tinha providerProductId salvo, sincroniza no banco
        if (matching && matching.providerProductId !== ap.id) {
          try {
            await prisma.plan.update({
              where: { id: matching.id },
              data: {
                providerProductId: ap.id,
                provider: 'ABACATEPAY',
              },
            })
            matching.providerProductId = ap.id
            matching.provider = 'ABACATEPAY'
          } catch {
            // Ignora falha silenciosa de atualização em testes
          }
        }

        // Se o produto foi criado direto na AbacatePay e não existe registro dele (nem ativo nem descontinuado)
        if (
          !matching &&
          ap.name &&
          ap.price &&
          !discontinuedNames.has(apName) &&
          !discontinuedProductIds.has(apId) &&
          (!apExtId || !discontinuedPlanIds.has(apExtId))
        ) {
          try {
            const rawSlug = ap.name
              .toLowerCase()
              .normalize('NFD')
              .replace(/[\u0300-\u036f]/g, '')
              .replace(/[^a-z0-9]+/g, '-')
              .replace(/(^-|-$)/g, '') || `plano-${Date.now()}`

            const isYearly = ap.cycle === 'ANNUALLY' || ap.frequency === 'ANNUALLY'
            const created = await prisma.plan.create({
              data: {
                name: ap.name,
                slug: `${rawSlug}-${ap.id.slice(-6)}`,
                description: ap.description || `Plano ${ap.name} - BarberShop Pro`,
                price: new Prisma.Decimal((Number(ap.price) || 0) / 100),
                currency: ap.currency || 'BRL',
                billingInterval: isYearly ? 'YEARLY' : 'MONTHLY',
                cycleType: isYearly ? 'YEARLY' : 'MONTHLY',
                durationDays: isYearly ? 365 : 30,
                trialDays: 0,
                status: 'ACTIVE',
                isActive: true,
                provider: 'ABACATEPAY',
                providerProductId: ap.id,
                planType: 'PAID',
                features: [
                  'Agendamento online em tempo real',
                  'Gestão de barbeiros e comissões',
                  'Página pública exclusiva da barbearia',
                  'Relatórios financeiros e histórico',
                ],
              },
            })
            matching = created as any
          } catch (createErr) {
            console.warn('[ABACATE_AUTO_IMPORT_WARN] Não foi possível importar produto localmente:', createErr)
          }
        }

        if (
          matching &&
          matching.isActive === true &&
          matching.status === 'ACTIVE' &&
          !matching.deletedAt &&
          matching.planType === 'PAID' &&
          Number(matching.price) > 0
        ) {
          validPlansMap.set(matching.id, {
            ...matching,
            isSyncedWithAbacate: true,
            providerProductId: ap.id,
            provider: 'ABACATEPAY',
          })
        }
      }

      const verifiedPlans = Array.from(validPlansMap.values())
        .map(enrichPlanWithDiscount)
        .sort((a, b) => Number(a.price) - Number(b.price))

      return NextResponse.json(verifiedPlans, {
        headers: {
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
        },
      })
    }

    // Fallback: Se a API da AbacatePay estiver temporariamente inacessível,
    // retorna APENAS planos ativos, com providerProductId e que NUNCA foram descontinuados
    const fallbackPlans = allLocalPlans
      .filter(
        (p) =>
          p.status === 'ACTIVE' &&
          p.isActive === true &&
          !p.deletedAt &&
          p.planType === 'PAID' &&
          Number(p.price) > 0 &&
          Boolean(p.providerProductId && p.providerProductId.trim() !== '') &&
          !isPlanDiscontinued(p) &&
          !discontinuedNames.has((p.name || '').toLowerCase().trim()) &&
          !discontinuedProductIds.has(p.providerProductId!) &&
          !discontinuedPlanIds.has(p.id)
      )
      .map((p) =>
        enrichPlanWithDiscount({
          ...p,
          isSyncedWithAbacate: true,
        })
      )

    return NextResponse.json(fallbackPlans, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
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
