import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/api-auth'
import { createPlan, getPlans } from '@/lib/billing/saas-billing'

export const dynamic = 'force-dynamic'
export const revalidate = 0

// GET - Listar planos disponíveis do SaaS
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const all = searchParams.get('all') === 'true'
    
    // Se solicitar inativos também, exige ser DEVELOPER
    if (all) {
      const user = getAuthUser(request)
      if (!user || user.role !== 'DEVELOPER') {
        return NextResponse.json({ error: 'Acesso restrito ao perfil DEVELOPER' }, { status: 403 })
      }
    }

    const plans = await getPlans(!all)
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
    const { name, slug, description, price, currency, billingInterval, trialDays, features, isActive } = body

    if (!name || !slug || price === undefined) {
      return NextResponse.json(
        { error: 'Nome, slug e preço são obrigatórios' },
        { status: 400 }
      )
    }

    const plan = await createPlan({
      name,
      slug,
      description,
      price,
      currency,
      billingInterval,
      trialDays,
      features,
      isActive,
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
