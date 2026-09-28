import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/api-auth'
import {
  grantCourtesySubscription,
  cancelCourtesySubscription,
  reactivateCourtesySubscription,
} from '@/lib/billing/saas-billing'
import { createAuditLog } from '@/lib/audit-log'
import { AuditAction, AuditEntity } from '@prisma/client'

export const dynamic = 'force-dynamic'
export const revalidate = 0

// POST - Conceder plano cortesia para uma barbearia (Exclusivo DEVELOPER)
export async function POST(request: NextRequest) {
  try {
    const user = getAuthUser(request)
    if (!user || user.role !== 'DEVELOPER') {
      return NextResponse.json(
        { error: 'Apenas desenvolvedores da plataforma podem conceder planos de cortesia' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { barbershopId, planId, durationDays, name, notes } = body

    if (!barbershopId) {
      return NextResponse.json(
        { error: 'barbershopId é obrigatório' },
        { status: 400 }
      )
    }

    const subscription = await grantCourtesySubscription({
      barbershopId,
      planId,
      durationDays: durationDays ? Number(durationDays) : undefined,
      name,
      notes,
      grantedByUserId: user.id,
      grantedByRole: user.role,
    })

    // Auditoria obrigatória (Seção 20)
    await createAuditLog({
      userId: user.id,
      barbershopId,
      action: AuditAction.COURTESY_GRANTED,
      entity: AuditEntity.SUBSCRIPTION,
      entityId: subscription.id,
      metadata: {
        actionType: 'GRANT_COURTESY',
        planId: subscription.planId,
        planName: subscription.planName,
        durationDays: subscription.durationDays,
        currentPeriodEnd: subscription.currentPeriodEnd.toISOString(),
        notes,
      },
      success: true,
    })

    return NextResponse.json(subscription, { status: 201 })
  } catch (error) {
    console.error('Erro ao conceder cortesia:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao conceder plano cortesia' },
      { status: 400 }
    )
  }
}

// DELETE - Cancelar plano cortesia concedido (Exclusivo DEVELOPER)
export async function DELETE(request: NextRequest) {
  try {
    const user = getAuthUser(request)
    if (!user || user.role !== 'DEVELOPER') {
      return NextResponse.json(
        { error: 'Apenas desenvolvedores da plataforma podem cancelar cortesias' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const subscriptionId = searchParams.get('subscriptionId')
    const reason = searchParams.get('reason') || 'Cancelado pelo desenvolvedor'

    if (!subscriptionId) {
      return NextResponse.json(
        { error: 'subscriptionId é obrigatório' },
        { status: 400 }
      )
    }

    const canceled = await cancelCourtesySubscription(subscriptionId, user.role, reason)

    // Auditoria
    await createAuditLog({
      userId: user.id,
      barbershopId: canceled.barbershopId,
      action: AuditAction.COURTESY_CANCELLED,
      entity: AuditEntity.SUBSCRIPTION,
      entityId: subscriptionId,
      metadata: {
        actionType: 'CANCEL_COURTESY',
        reason,
      },
      success: true,
    })

    return NextResponse.json({
      message: 'Cortesia cancelada com sucesso',
      subscription: canceled,
    })
  } catch (error) {
    console.error('Erro ao cancelar cortesia:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao cancelar cortesia' },
      { status: 400 }
    )
  }
}

// PATCH - Reativar plano cortesia (Exclusivo DEVELOPER)
export async function PATCH(request: NextRequest) {
  try {
    const user = getAuthUser(request)
    if (!user || user.role !== 'DEVELOPER') {
      return NextResponse.json(
        { error: 'Apenas desenvolvedores da plataforma podem reativar cortesias' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { subscriptionId, durationDays } = body

    if (!subscriptionId) {
      return NextResponse.json(
        { error: 'subscriptionId é obrigatório' },
        { status: 400 }
      )
    }

    const reactivated = await reactivateCourtesySubscription(
      subscriptionId,
      user.role,
      durationDays ? Number(durationDays) : undefined
    )

    // Auditoria
    await createAuditLog({
      userId: user.id,
      barbershopId: reactivated.barbershopId,
      action: AuditAction.COURTESY_REACTIVATED,
      entity: AuditEntity.SUBSCRIPTION,
      entityId: subscriptionId,
      metadata: {
        actionType: 'REACTIVATE_COURTESY',
        durationDays: reactivated.durationDays,
        newPeriodEnd: reactivated.currentPeriodEnd.toISOString(),
      },
      success: true,
    })

    return NextResponse.json({
      message: 'Cortesia reativada com sucesso',
      subscription: reactivated,
    })
  } catch (error) {
    console.error('Erro ao reativar cortesia:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao reativar cortesia' },
      { status: 400 }
    )
  }
}
