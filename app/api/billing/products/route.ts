import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser, requireRole } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'
import {
  listAbacateProducts,
  createAbacateProduct,
  syncAbacateProduct,
} from '@/lib/billing/abacatepay-provider'

export const dynamic = 'force-dynamic'
export const revalidate = 0

// GET - Listar produtos da AbacatePay e planos cadastrados pelo developer
export async function GET(request: NextRequest) {
  try {
    const user = getAuthUser(request)
    if (!requireRole(user, ['DEVELOPER', 'ADMIN'])) {
      return NextResponse.json(
        { error: 'Acesso restrito ao painel administrativo' },
        { status: 403 }
      )
    }

    // 1. Busca produtos na API da AbacatePay e planos locais em paralelo
    const [abacateProducts, localPlans] = await Promise.all([
      listAbacateProducts(),
      prisma.plan.findMany({
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: { subscriptions: true },
          },
        },
      }),
    ])

    // 2. Cruza os planos locais com os produtos da AbacatePay para verificar sincronização
    const enrichedPlans = localPlans.map((plan) => {
      const matchingProduct = abacateProducts.find(
        (ap) =>
          ap.id === plan.providerProductId ||
          ap.externalId === plan.id ||
          ap.name?.toLowerCase() === plan.name.toLowerCase()
      )

      return {
        ...plan,
        abacateProductId: matchingProduct?.id || plan.providerProductId || null,
        isSyncedWithAbacate: Boolean(matchingProduct || plan.providerProductId),
        abacatePriceCents: matchingProduct?.price || Math.round(Number(plan.price) * 100),
      }
    })

    return NextResponse.json({
      success: true,
      abacateProducts,
      localPlans: enrichedPlans,
      counts: {
        totalAbacateProducts: abacateProducts.length,
        totalLocalPlans: localPlans.length,
        syncedCount: enrichedPlans.filter((p) => p.isSyncedWithAbacate).length,
      },
    })
  } catch (error: any) {
    console.error('Erro ao buscar produtos:', error)
    return NextResponse.json(
      { error: error.message || 'Erro ao carregar produtos' },
      { status: 500 }
    )
  }
}

// POST - Sincronizar plano com a AbacatePay ou cadastrar novo produto
export async function POST(request: NextRequest) {
  try {
    const user = getAuthUser(request)
    if (!requireRole(user, ['DEVELOPER'])) {
      return NextResponse.json(
        { error: 'Apenas desenvolvedores podem gerenciar produtos na AbacatePay' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { planId, name, price, description, syncAll } = body

    // Opção A: Sincronizar todos os planos pendentes de uma só vez
    if (syncAll) {
      const unsyncedPlans = await prisma.plan.findMany({
        where: {
          providerProductId: null,
          isActive: true,
        },
      })

      const results = []
      for (const p of unsyncedPlans) {
        try {
          const prodId = await syncAbacateProduct(p)
          results.push({ planId: p.id, name: p.name, success: true, prodId })
        } catch (err: any) {
          results.push({ planId: p.id, name: p.name, success: false, error: err.message })
        }
      }

      return NextResponse.json({
        success: true,
        message: `${results.filter((r) => r.success).length} planos sincronizados com a AbacatePay`,
        results,
      })
    }

    // Opção B: Sincronizar um plano específico
    if (planId) {
      const plan = await prisma.plan.findUnique({
        where: { id: planId },
      })

      if (!plan) {
        return NextResponse.json({ error: 'Plano não encontrado' }, { status: 404 })
      }

      const providerProductId = await syncAbacateProduct(plan)
      return NextResponse.json({
        success: true,
        message: `Plano "${plan.name}" sincronizado com sucesso na AbacatePay!`,
        providerProductId,
      })
    }

    // Opção C: Criar um produto avulso direto na AbacatePay
    if (!name || price === undefined) {
      return NextResponse.json(
        { error: 'Nome e preço do produto são obrigatórios' },
        { status: 400 }
      )
    }

    const priceInCents = Math.round(Number(price) * 100)
    const newProduct = await createAbacateProduct({
      name,
      price: priceInCents,
      description,
    })

    return NextResponse.json({
      success: true,
      message: `Produto "${name}" criado com sucesso na AbacatePay!`,
      product: newProduct,
    })
  } catch (error: any) {
    console.error('Erro ao sincronizar/criar produto:', error)
    return NextResponse.json(
      { error: error.message || 'Erro ao gerenciar produto na AbacatePay' },
      { status: 500 }
    )
  }
}
