import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser, requireRole } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'
import {
  listAbacateProducts,
  createAbacateProduct,
  syncAbacateProduct,
  deleteAbacateProduct,
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

    // Opção A: Sincronizar todos os planos com a AbacatePay (garantindo cycle: 'MONTHLY'/'ANNUALLY')
    if (syncAll) {
      const { forceSync } = body
      const plansToSync = await prisma.plan.findMany({
        where: {
          isActive: true,
          ...(forceSync ? {} : { providerProductId: null }),
        },
      })

      const results = []
      for (const p of plansToSync) {
        try {
          const prodId = await syncAbacateProduct(p, Boolean(forceSync))
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

      const providerProductId = await syncAbacateProduct(plan, true)
      return NextResponse.json({
        success: true,
        message: `Plano "${plan.name}" sincronizado com sucesso na AbacatePay com ciclo recorrente!`,
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

// DELETE - Excluir produto na AbacatePay e/ou desvincular do banco local
export async function DELETE(request: NextRequest) {
  try {
    const user = getAuthUser(request)
    if (!requireRole(user, ['DEVELOPER'])) {
      return NextResponse.json(
        { error: 'Apenas desenvolvedores podem excluir produtos na AbacatePay' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const body = await request.json().catch(() => ({}))
    const productId = searchParams.get('productId') || searchParams.get('id') || body.productId || body.id
    const planId = searchParams.get('planId') || body.planId
    const deleteLocalPlan = searchParams.get('deleteLocalPlan') === 'true' || Boolean(body.deleteLocalPlan)

    if (!productId && !planId) {
      return NextResponse.json(
        { error: 'Informe o ID do produto da AbacatePay (productId) ou o ID do plano (planId)' },
        { status: 400 }
      )
    }

    let targetProductId = productId

    if (planId && !targetProductId) {
      const plan = await prisma.plan.findUnique({ where: { id: planId } })
      if (plan?.providerProductId) {
        targetProductId = plan.providerProductId
      }
    }

    let abacateError: string | null = null

    if (targetProductId) {
      const abacateResult = await deleteAbacateProduct(targetProductId)
      if (!abacateResult.success) {
        abacateError = abacateResult.error || 'Erro na API da AbacatePay'
        console.warn(`[ABACATE_DELETE_WARN] Produto ${targetProductId}:`, abacateError)
      }

      // Desvincula o produto dos planos locais que o utilizavam
      await prisma.plan.updateMany({
        where: { providerProductId: targetProductId },
        data: { providerProductId: null },
      })
    }

    // Se solicitado para também excluir o plano local
    if (planId && deleteLocalPlan) {
      try {
        await prisma.plan.delete({ where: { id: planId } })
      } catch {
        await prisma.plan.update({
          where: { id: planId },
          data: { status: 'INACTIVE', isActive: false, deletedAt: new Date() },
        })
      }
    }

    if (abacateError && !targetProductId?.startsWith('prod_dev_')) {
      return NextResponse.json({
        success: false,
        error: abacateError,
      }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      message: `Produto ${targetProductId || planId} excluído com sucesso da AbacatePay!`,
    })
  } catch (error: any) {
    console.error('Erro ao excluir produto:', error)
    return NextResponse.json(
      { error: error.message || 'Erro ao excluir produto' },
      { status: 500 }
    )
  }
}
