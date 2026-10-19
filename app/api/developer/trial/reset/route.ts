import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser, requireRole } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'
import { createAuditLog, extractRequestContext } from '@/lib/audit-log'
import { AuditAction, AuditEntity } from '@prisma/client'

export const dynamic = 'force-dynamic'
export const revalidate = 0

// POST - Resetar ou prorrogar período de trial para um cliente / barbearia
export async function POST(request: NextRequest) {
  try {
    const admin = getAuthUser(request)
    if (!requireRole(admin, ['DEVELOPER'])) {
      return NextResponse.json({ error: 'Acesso restrito ao desenvolvedor' }, { status: 403 })
    }

    const body = await request.json()
    const { barbershopId, days = 30, reason = 'Reset de cortesia pelo desenvolvedor' } = body

    if (!barbershopId) {
      return NextResponse.json({ error: 'barbershopId é obrigatório' }, { status: 400 })
    }

    const shop = await prisma.barbershop.findUnique({
      where: { id: barbershopId },
      include: {
        users: { where: { role: 'ADMIN' } },
        subscriptions: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
    })

    if (!shop) {
      return NextResponse.json({ error: 'Barbearia não encontrada' }, { status: 404 })
    }

    const now = new Date()
    const trialDays = Math.max(1, Math.min(365, Number(days) || 30))
    const newTrialEnd = new Date(now.getTime() + trialDays * 24 * 60 * 60 * 1000)

    // 1. Atualiza a Barbearia
    const updatedShop = await prisma.barbershop.update({
      where: { id: barbershopId },
      data: {
        status: 'APPROVED',
        isActive: true,
        trialEndsAt: newTrialEnd,
        contractExpiresAt: newTrialEnd,
      },
    })

    // 2. Garante que os administradores da barbearia estejam ativos
    await prisma.user.updateMany({
      where: { barbershopId, role: 'ADMIN' },
      data: { isActive: true },
    })

    // 3. Atualiza ou cria a Subscription no estado TRIALING
    const latestSub = shop.subscriptions?.[0]
    let updatedSubscription = null

    if (latestSub) {
      updatedSubscription = await prisma.subscription.update({
        where: { id: latestSub.id },
        data: {
          status: 'TRIALING',
          trialStart: now,
          trialEnd: newTrialEnd,
          currentPeriodEnd: newTrialEnd,
        },
      })
    } else {
      updatedSubscription = await prisma.subscription.create({
        data: {
          barbershopId,
          status: 'TRIALING',
          trialStart: now,
          trialEnd: newTrialEnd,
          currentPeriodStart: now,
          currentPeriodEnd: newTrialEnd,
        },
      })
    }

    // 4. Registra na Auditoria Completa
    const ctx = extractRequestContext(request)
    await createAuditLog({
      userId: admin.id,
      barbershopId,
      action: AuditAction.TRIAL_STARTED,
      entity: AuditEntity.BARBERSHOP,
      entityId: barbershopId,
      success: true,
      metadata: {
        reason,
        days: trialDays,
        previousTrialEnd: shop.trialEndsAt ? new Date(shop.trialEndsAt).toISOString() : null,
        newTrialEnd: newTrialEnd.toISOString(),
        resetBy: admin.email,
      },
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    })

    // 5. Dispara Notificação Externa (Telegram / Email)
    try {
      const { notifyAccountStatusChange } = await import('@/lib/external-notifications')
      await notifyAccountStatusChange({
        barbershopName: shop.name,
        email: shop.email,
        oldStatus: shop.status || 'EXPIRED',
        newStatus: `TRIAL (${trialDays} dias até ${newTrialEnd.toLocaleDateString('pt-BR')})`,
        reason,
      })
    } catch (e) {
      console.warn('Notification error on trial reset:', e)
    }

    return NextResponse.json({
      success: true,
      message: `Período de trial resetado com sucesso para ${trialDays} dias!`,
      barbershop: {
        id: updatedShop.id,
        name: updatedShop.name,
        status: updatedShop.status,
        isActive: updatedShop.isActive,
        trialEndsAt: updatedShop.trialEndsAt,
        daysRemaining: trialDays,
      },
      subscription: updatedSubscription,
    })
  } catch (error) {
    console.error('Error resetting trial period:', error)
    return NextResponse.json({ error: 'Erro ao resetar período de trial' }, { status: 500 })
  }
}
