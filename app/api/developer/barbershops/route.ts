import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthUser, requireRole } from '@/lib/api-auth'
import { createAuditLog, extractRequestContext } from '@/lib/audit-log'
import { AuditAction, AuditEntity } from '@prisma/client'

export const dynamic = 'force-dynamic'
export const revalidate = 0

// GET - Listar todas as barbearias cadastradas na plataforma (exclusivo DEVELOPER)
export async function GET(request: NextRequest) {
  try {
    const user = getAuthUser(request)
    if (!requireRole(user, ['DEVELOPER'])) {
      return NextResponse.json({ error: 'Acesso restrito ao desenvolvedor da plataforma' }, { status: 403 })
    }

    const baseSelect = {
      id: true,
      name: true,
      slug: true,
      email: true,
      phone: true,
      address: true,
      logo: true,
      description: true,
      isActive: true,
      status: true,
      contractExpiresAt: true,
      createdAt: true,
      updatedAt: true,
      createdById: true,
      creator: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      users: {
        where: { role: 'ADMIN' as const },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          role: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
        },
        take: 1,
      },
      appointments: {
        orderBy: { createdAt: 'asc' as const },
        select: {
          id: true,
          createdAt: true,
          startTime: true,
          status: true,
        },
        take: 20,
      },
      _count: {
        select: {
          users: true,
          clients: true,
          services: true,
          appointments: true,
        },
      },
    }

    let barbershops: any[] = []
    let hasSubscriptions = true

    try {
      barbershops = await prisma.barbershop.findMany({
        select: {
          ...baseSelect,
          subscriptions: {
            orderBy: { createdAt: 'desc' },
            take: 1,
            include: { plan: true },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      })
    } catch (err: any) {
      if (err?.code === 'P2021' || err?.message?.includes('does not exist') || err?.message?.includes('subscriptions')) {
        console.warn('Tabela subscriptions indisponível no banco. Executando fallback sem relação subscriptions:', err?.message)
        hasSubscriptions = false
        barbershops = await prisma.barbershop.findMany({
          select: baseSelect,
          orderBy: {
            createdAt: 'desc',
          },
        })
      } else {
        throw err
      }
    }

    // Auto-backfill: Se houver barbearia antiga cadastrada sem slug, gera automaticamente
    const hasMissingSlugs = barbershops.some(b => !b.slug || !b.slug.trim())
    if (hasMissingSlugs) {
      const { backfillMissingSlugs } = await import('@/lib/tenant')
      await backfillMissingSlugs()
      // Atualiza os registros para entrega ao frontend
      if (hasSubscriptions) {
        try {
          barbershops = await prisma.barbershop.findMany({
            select: {
              ...baseSelect,
              subscriptions: {
                orderBy: { createdAt: 'desc' },
                take: 1,
                include: { plan: true },
              },
            },
            orderBy: {
              createdAt: 'desc',
            },
          })
        } catch {
          barbershops = await prisma.barbershop.findMany({
            select: baseSelect,
            orderBy: {
              createdAt: 'desc',
            },
          })
        }
      } else {
        barbershops = await prisma.barbershop.findMany({
          select: baseSelect,
          orderBy: {
            createdAt: 'desc',
          },
        })
      }
    }

    const { searchParams } = new URL(request.url)
    const statusFilter = searchParams.get('status')

    const { resolveTenantLifecycleStatus, evaluateOnboardingSteps, calculateCompletionPercentage } = await import('@/lib/onboarding')

    const now = new Date()
    const mapped = barbershops.map((shop: any) => {
      const latestSub = shop.subscriptions?.[0] || null

      let trial = {
        isTrial: false,
        trialStart: null as string | null,
        trialEnd: null as string | null,
        daysRemaining: 0,
        planName: 'Sem plano',
        status: shop.isActive ? 'ACTIVE' : 'SUSPENDED',
      }

      if (latestSub) {
        const isTrialing = latestSub.status === 'TRIALING'
        const isTrialExpired = isTrialing && latestSub.trialEnd && now > new Date(latestSub.trialEnd)
        const effectiveStatus = isTrialExpired ? 'EXPIRED' : latestSub.status

        const targetDate = isTrialing ? latestSub.trialEnd : latestSub.currentPeriodEnd
        const daysRemaining = targetDate
          ? Math.max(0, Math.ceil((new Date(targetDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
          : 0

        trial = {
          isTrial: isTrialing && !isTrialExpired,
          trialStart: latestSub.trialStart ? new Date(latestSub.trialStart).toISOString() : null,
          trialEnd: latestSub.trialEnd ? new Date(latestSub.trialEnd).toISOString() : null,
          daysRemaining: isTrialExpired ? 0 : daysRemaining,
          planName: latestSub.plan?.name || 'Trial Gratuito (30 dias)',
          status: effectiveStatus,
        }
      } else if (shop.contractExpiresAt) {
        const expDate = new Date(shop.contractExpiresAt)
        const isExpired = now > expDate
        const daysRemaining = Math.max(0, Math.ceil((expDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
        trial = {
          isTrial: !isExpired,
          trialStart: shop.createdAt ? new Date(shop.createdAt).toISOString() : null,
          trialEnd: expDate.toISOString(),
          daysRemaining: isExpired ? 0 : daysRemaining,
          planName: 'Trial Gratuito (30 dias)',
          status: isExpired ? 'EXPIRED' : 'TRIALING',
        }
      } else if (shop.createdAt) {
        const createdDate = new Date(shop.createdAt)
        const calculatedEnd = new Date(createdDate.getTime() + 30 * 24 * 60 * 60 * 1000)
        const isExpired = now > calculatedEnd
        const daysRemaining = Math.max(0, Math.ceil((calculatedEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
        trial = {
          isTrial: !isExpired && shop.isActive,
          trialStart: createdDate.toISOString(),
          trialEnd: calculatedEnd.toISOString(),
          daysRemaining: isExpired ? 0 : daysRemaining,
          planName: 'Trial Gratuito (30 dias)',
          status: isExpired ? 'EXPIRED' : (shop.isActive ? 'TRIALING' : 'SUSPENDED'),
        }
      }

      // Lifecycle status unificado (LEAD, PENDING, TRIAL, ACTIVE, PAST_DUE, SUSPENDED, CANCELED)
      const lifecycleStatus = resolveTenantLifecycleStatus(shop)

      // Cálculo de First Appointment e Time to First Appointment (TTFA)
      // Helper para data segura
      const safeIso = (d: any): string | null => {
        if (!d) return null
        const dateObj = new Date(d)
        return isNaN(dateObj.getTime()) ? null : dateObj.toISOString()
      }

      // Cálculo de First Appointment e Time to First Appointment (TTFA)
      const apptsList = shop.appointments || []
      const firstAppt = apptsList[0] || null
      const latestAppt = apptsList[apptsList.length - 1] || null
      const firstAppointmentAt = firstAppt ? safeIso(firstAppt.createdAt) : null

      let timeToFirstAppointmentHours: number | null = null
      if (firstAppt?.createdAt && shop.createdAt) {
        const t1 = new Date(firstAppt.createdAt).getTime()
        const t0 = new Date(shop.createdAt).getTime()
        if (!isNaN(t1) && !isNaN(t0)) {
          timeToFirstAppointmentHours = Math.max(0, Math.round(((t1 - t0) / (1000 * 60 * 60)) * 10) / 10)
        }
      }

      // Último Acesso e Última Atividade
      const adminUser = shop.users?.[0] || null
      const lastAccess = safeIso(adminUser?.updatedAt) || safeIso(shop.updatedAt) || safeIso(shop.createdAt) || new Date().toISOString()

      const lastActivityCandidates: number[] = []
      if (shop.createdAt && !isNaN(new Date(shop.createdAt).getTime())) {
        lastActivityCandidates.push(new Date(shop.createdAt).getTime())
      }
      if (shop.updatedAt && !isNaN(new Date(shop.updatedAt).getTime())) {
        lastActivityCandidates.push(new Date(shop.updatedAt).getTime())
      }
      if (adminUser?.updatedAt && !isNaN(new Date(adminUser.updatedAt).getTime())) {
        lastActivityCandidates.push(new Date(adminUser.updatedAt).getTime())
      }
      if (latestAppt?.createdAt && !isNaN(new Date(latestAppt.createdAt).getTime())) {
        lastActivityCandidates.push(new Date(latestAppt.createdAt).getTime())
      }
      const maxActivityMs = lastActivityCandidates.length > 0 ? Math.max(...lastActivityCandidates) : Date.now()
      const lastActivity = new Date(maxActivityMs).toISOString()

      // Checklist de Onboarding dos 12 passos da sessão assistida (15-30m)
      const onboardingSteps = evaluateOnboardingSteps({
        hasBarbershop: true,
        hasAdminUser: !!adminUser,
        hasProfileConfigured: !!(shop.phone && shop.address),
        servicesCount: shop._count?.services || 0,
        barbersCount: shop._count?.users || 0,
        slug: shop.slug,
        clientsCount: shop._count?.clients || 0,
        appointmentsCount: shop._count?.appointments || 0,
      })
      const onboardingCompletionPercentage = calculateCompletionPercentage(onboardingSteps)

      return {
        ...shop,
        trial,
        subscriptionStatus: trial.status,
        lifecycleStatus,
        lastAccess,
        lastActivity,
        firstAppointmentAt,
        timeToFirstAppointmentHours,
        isActivated: (shop._count?.appointments || 0) > 0,
        onboardingSteps,
        onboardingCompletionPercentage,
      }
    })

    const filtered = statusFilter
      ? mapped.filter(b => 
          b.subscriptionStatus?.toUpperCase() === statusFilter.toUpperCase() ||
          b.lifecycleStatus?.toUpperCase() === statusFilter.toUpperCase()
        )
      : mapped

    return NextResponse.json(filtered)
  } catch (error) {
    console.error('Developer barbershops GET error:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar empresas' },
      { status: 500 }
    )
  }
}

// PATCH - Ativar/Desativar, aprovar/rejeitar ou editar barbearia (exclusivo DEVELOPER)
export async function PATCH(request: NextRequest) {
  try {
    const user = getAuthUser(request)
    if (!requireRole(user, ['DEVELOPER'])) {
      return NextResponse.json({ error: 'Acesso restrito ao desenvolvedor da plataforma' }, { status: 403 })
    }

    const body = await request.json()
    const {
      id,
      status,
      isActive,
      name,
      slug,
      email,
      phone,
      address,
      contractExpiresAt,
      adminName,
      adminEmail,
      adminPhone,
    } = body

    if (!id) {
      return NextResponse.json({ error: 'ID da empresa é obrigatório' }, { status: 400 })
    }

    const barbershop = await prisma.barbershop.findUnique({
      where: { id },
      include: {
        users: {
          where: { role: 'ADMIN' },
          take: 1,
        },
      },
    })

    if (!barbershop) {
      return NextResponse.json({ error: 'Empresa não encontrada' }, { status: 404 })
    }

    const updateData: any = {}

    // Tratamento de Status (Aprovação / Rejeição / Ciclo de vida SaaS)
    if (status) {
      const upperStatus = String(status).toUpperCase()
      updateData.status = upperStatus

      if (['APPROVED', 'ACTIVE', 'TRIAL', 'PENDING', 'LEAD'].includes(upperStatus)) {
        updateData.isActive = true
        // Ativar o administrador da barbearia
        if (typeof (prisma.user as any)?.updateMany === 'function') {
          await prisma.user.updateMany({
            where: { barbershopId: id, role: 'ADMIN' },
            data: { isActive: true },
          })
        }
      } else if (['REJECTED', 'SUSPENDED', 'CANCELED'].includes(upperStatus)) {
        updateData.isActive = false
        // Desativar o administrador da barbearia
        if (typeof (prisma.user as any)?.updateMany === 'function') {
          await prisma.user.updateMany({
            where: { barbershopId: id, role: 'ADMIN' },
            data: { isActive: false },
          })
        }
      }

      // Sincroniza Subscription do SaaS se existir
      try {
        const sub = await prisma.subscription.findFirst({
          where: { barbershopId: id },
          orderBy: { createdAt: 'desc' },
        })
        if (sub) {
          let targetSubStatus: any = null
          if (upperStatus === 'TRIAL') targetSubStatus = 'TRIALING'
          else if (upperStatus === 'ACTIVE') targetSubStatus = 'ACTIVE'
          else if (upperStatus === 'PAST_DUE') targetSubStatus = 'PAST_DUE'
          else if (upperStatus === 'SUSPENDED') targetSubStatus = 'SUSPENDED'
          else if (upperStatus === 'CANCELED') targetSubStatus = 'CANCELED'

          if (targetSubStatus) {
            await prisma.subscription.update({
              where: { id: sub.id },
              data: { status: targetSubStatus },
            })
          }
        }
      } catch (subErr) {
        console.warn('Subscription status sync ignored:', subErr)
      }
    }

    // Ativação / Desativação manual direta
    if (typeof isActive === 'boolean') {
      updateData.isActive = isActive
      // Se desativar ou ativar a barbearia, sincroniza com o admin principal
      if (typeof (prisma.user as any)?.updateMany === 'function') {
        await prisma.user.updateMany({
          where: { barbershopId: id, role: 'ADMIN' },
          data: { isActive },
        })
      }
    }

    // Complementação / Edição de dados do estabelecimento
    if (name) updateData.name = name.trim()
    if (email) updateData.email = email.trim()
    if (phone !== undefined) updateData.phone = phone ? phone.trim() : null
    if (address !== undefined) updateData.address = address ? address.trim() : null
    if (contractExpiresAt !== undefined) {
      updateData.contractExpiresAt = contractExpiresAt ? new Date(contractExpiresAt) : null
    }

    // Validação e atualização de slug pelo desenvolvedor com redirect controlado
    if (slug !== undefined && slug.trim()) {
      const { updateBarbershopSlug } = await import('@/lib/tenant')
      await updateBarbershopSlug(id, slug)
    }

    // Se o desenvolvedor editar dados do administrador responsável
    if (adminName || adminEmail || adminPhone !== undefined) {
      const adminUser = barbershop.users?.[0]
      if (adminUser && typeof (prisma.user as any)?.update === 'function') {
        const adminUpdateData: any = {}
        if (adminName) adminUpdateData.name = adminName.trim()
        if (adminEmail) adminUpdateData.email = adminEmail.trim()
        if (adminPhone !== undefined) adminUpdateData.phone = adminPhone ? adminPhone.trim() : null
        await prisma.user.update({
          where: { id: adminUser.id },
          data: adminUpdateData,
        })
      }
    }

    const updated = await prisma.barbershop.update({
      where: { id },
      data: updateData,
    })

    const ctx = extractRequestContext(request)
    const upperStatus = status ? String(status).toUpperCase() : undefined
    const action = upperStatus === 'APPROVED'
      ? AuditAction.BARBERSHOP_APPROVED
      : upperStatus === 'SUSPENDED' || upperStatus === 'REJECTED'
      ? AuditAction.BARBERSHOP_SUSPENDED
      : AuditAction.UPDATE

    await createAuditLog({
      userId: user.id,
      barbershopId: updated.id,
      action,
      entity: AuditEntity.BARBERSHOP,
      entityId: updated.id,
      metadata: {
        barbershopName: updated.name,
        slug: updated.slug,
        status: updated.status,
        isActive: updated.isActive,
      },
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Developer barbershops PATCH error:', error)
    return NextResponse.json(
      { error: 'Erro ao atualizar empresa' },
      { status: 500 }
    )
  }
}

// POST - Cadastrar nova barbearia na plataforma (exclusivo DEVELOPER)
export async function POST(request: NextRequest) {
  try {
    const user = getAuthUser(request)
    if (!requireRole(user, ['DEVELOPER'])) {
      return NextResponse.json({ error: 'Acesso restrito ao desenvolvedor da plataforma' }, { status: 403 })
    }

    const body = await request.json()
    const { name, email, phone, address, adminName, adminEmail, adminPassword, adminPhone, contractExpiresAt } = body

    if (!name || !email || !adminName || !adminEmail || !adminPassword) {
      return NextResponse.json(
        { error: 'Nome e email da empresa, e nome, email e senha do administrador são obrigatórios' },
        { status: 400 }
      )
    }

    const { createBarbershop } = await import('@/lib/auth')
    const result = await createBarbershop({
      name,
      email,
      phone,
      address,
      status: 'APPROVED',
      isActive: true,
      contractExpiresAt: contractExpiresAt ? new Date(contractExpiresAt) : null,
      createdById: user.id,
      adminUser: {
        name: adminName,
        email: adminEmail,
        password: adminPassword,
        phone: adminPhone || phone,
        isActive: true,
      },
    })

    const ctx = extractRequestContext(request)
    await createAuditLog({
      userId: user.id,
      barbershopId: result.barbershop.id,
      action: AuditAction.BARBERSHOP_CREATED,
      entity: AuditEntity.BARBERSHOP,
      entityId: result.barbershop.id,
      metadata: {
        barbershopName: result.barbershop.name,
        slug: result.barbershop.slug,
        adminEmail,
      },
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    })

    return NextResponse.json(result, { status: 201 })
  } catch (error: any) {
    console.error('Developer create barbershop error:', error)
    return NextResponse.json(
      { error: error?.message || 'Erro ao criar empresa' },
      { status: 400 }
    )
  }
}
