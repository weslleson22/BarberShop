import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'
import { updatePlan, deleteOrDeactivatePlan } from '@/lib/billing/saas-billing'
import { createAuditLog } from '@/lib/audit-log'
import { AuditAction, AuditEntity } from '@prisma/client'

export const dynamic = 'force-dynamic'
export const revalidate = 0

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET - Detalhes do plano, contagem de assinaturas e histórico de uso
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const user = getAuthUser(request)

    const plan = (await prisma.plan.findUnique({
      where: { id },
      include: {
        subscriptions: {
          select: {
            id: true,
            barbershopId: true,
            status: true,
            currentPeriodStart: true,
            currentPeriodEnd: true,
            price: true,
            createdAt: true,
            barbershop: {
              select: {
                id: true,
                name: true,
                slug: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    })) as any

    if (!plan) {
      return NextResponse.json({ error: 'Plano não encontrado' }, { status: 404 })
    }

    // Se o plano estiver inativo, apenas DEVELOPER pode consultar detalhes completos
    if (plan.status === 'INACTIVE' && (!user || user.role !== 'DEVELOPER')) {
      return NextResponse.json({ error: 'Acesso restrito' }, { status: 403 })
    }

    const activeCount = (plan.subscriptions || []).filter(
      (s: any) => s.status === 'ACTIVE' || s.status === 'TRIALING'
    ).length

    return NextResponse.json({
      ...plan,
      totalSubscriptionsCount: (plan.subscriptions || []).length,
      activeSubscriptionsCount: activeCount,
    })
  } catch (error) {
    console.error('Erro ao buscar plano:', error)
    return NextResponse.json({ error: 'Erro ao buscar detalhes do plano' }, { status: 500 })
  }
}

// PATCH - Atualizar dados do plano (Exclusivo DEVELOPER)
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const user = getAuthUser(request)
    if (!user || user.role !== 'DEVELOPER') {
      return NextResponse.json(
        { error: 'Apenas desenvolvedores da plataforma podem editar planos' },
        { status: 403 }
      )
    }

    const { id } = await params
    const body = await request.json()

    // Validações de negócio (Seção 5)
    if (body.planType === 'COURTESY' && body.price !== undefined && Number(body.price) !== 0) {
      return NextResponse.json(
        { error: 'Plano cortesia não pode possuir valor diferente de zero' },
        { status: 400 }
      )
    }

    if (body.planType === 'PAID' && body.price !== undefined && Number(body.price) <= 0) {
      return NextResponse.json(
        { error: 'Plano comercial pago deve possuir valor maior que zero' },
        { status: 400 }
      )
    }

    if (body.cycleType === 'CUSTOM' && body.durationDays !== undefined && Number(body.durationDays) <= 0) {
      return NextResponse.json(
        { error: 'Ciclo personalizado exige duração em dias maior que zero' },
        { status: 400 }
      )
    }

    const updatedPlan = await updatePlan(id, body)

    // Auditoria (Seção 20)
    await createAuditLog({
      userId: user.id,
      barbershopId: user.barbershopId || null,
      action: AuditAction.PLAN_UPDATED,
      entity: AuditEntity.PLAN,
      entityId: updatedPlan.id,
      metadata: {
        actionType: updatedPlan.planType === 'COURTESY' ? 'UPDATE_COURTESY' : 'UPDATE_PLAN',
        name: updatedPlan.name,
        planType: updatedPlan.planType,
        cycleType: updatedPlan.cycleType,
        durationDays: updatedPlan.durationDays,
        price: updatedPlan.price.toString(),
        status: updatedPlan.status,
      },
      success: true,
    })

    return NextResponse.json(updatedPlan)
  } catch (error) {
    console.error('Erro ao editar plano:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao editar plano' },
      { status: 400 }
    )
  }
}

// DELETE - Exclusão / Descontinuação Segura do Plano (Regras 7, 8, 9, 14, 15)
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const user = getAuthUser(request)
    if (!user || user.role !== 'DEVELOPER') {
      return NextResponse.json(
        { error: 'Apenas desenvolvedores da plataforma podem excluir ou descontinuar planos' },
        { status: 403 }
      )
    }

    const { id } = await params
    const result = await deleteOrDeactivatePlan(id, user.id)

    // Auditoria obrigatória (Seção 20)
    await createAuditLog({
      userId: user.id,
      barbershopId: user.barbershopId || null,
      action: result.action === 'DELETED' ? AuditAction.PLAN_DELETED : AuditAction.PLAN_DEACTIVATED,
      entity: AuditEntity.PLAN,
      entityId: id,
      metadata: {
        actionType: result.action === 'DELETED' ? 'DELETE_PLAN' : 'DEACTIVATE_PLAN',
        planName: result.plan.name,
        action: result.action,
        activeSubscriptionsCount: result.activeSubscriptionsCount,
        totalSubscriptionsCount: result.totalSubscriptionsCount,
        reason:
          result.action === 'DEACTIVATED'
            ? 'Plano descontinuado com preservação de assinaturas ativas até o término contratado'
            : 'Plano excluído definitivamente pois não possuía assinaturas vinculadas',
      },
      success: true,
    })

    return NextResponse.json({
      action: result.action,
      activeSubscriptionsCount: result.activeSubscriptionsCount,
      totalSubscriptionsCount: result.totalSubscriptionsCount,
      plan: result.plan,
      message:
        result.action === 'DELETED'
          ? 'Plano excluído com sucesso.'
          : 'Plano descontinuado com sucesso. Assinaturas existentes continuam ativas até o término do período.',
    })
  } catch (error) {
    console.error('Erro ao processar exclusão/descontinuação do plano:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao processar plano' },
      { status: 400 }
    )
  }
}
