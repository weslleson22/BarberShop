import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/api-auth'
import { createPlan, getPlans } from '@/lib/billing/saas-billing'
import { createAuditLog } from '@/lib/audit-log'
import { AuditAction, AuditEntity } from '@prisma/client'

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
    }

    const plans = await getPlans({
      onlyActive: !all && (!status || status === 'ACTIVE'),
      status: status && status !== 'ALL' ? (status as any) : undefined,
      planType: planType && planType !== 'ALL' ? (planType as any) : undefined,
      cycleType: cycleType && cycleType !== 'ALL' ? (cycleType as any) : undefined,
    })

    return NextResponse.json(plans)
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
