import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthUser, requireRole } from '@/lib/api-auth'
import {
  resolveTenantLifecycleStatus,
  evaluateOnboardingSteps,
  calculateCompletionPercentage,
  calculateOnboardingMetrics,
} from '@/lib/onboarding'

export const dynamic = 'force-dynamic'
export const revalidate = 0

// GET - Cockpit Operacional de Onboarding (exclusivo DEVELOPER)
export async function GET(request: NextRequest) {
  try {
    const user = getAuthUser(request)
    if (!requireRole(user, ['DEVELOPER'])) {
      return NextResponse.json({ error: 'Acesso restrito ao desenvolvedor da plataforma' }, { status: 403 })
    }

    const [barbershops, feedbacks] = await Promise.all([
      prisma.barbershop.findMany({
        select: {
          id: true,
          name: true,
          slug: true,
          email: true,
          phone: true,
          address: true,
          logo: true,
          isActive: true,
          status: true,
          contractExpiresAt: true,
          createdAt: true,
          updatedAt: true,
          users: {
            where: { role: 'ADMIN' },
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
              updatedAt: true,
            },
            take: 1,
          },
          subscriptions: {
            orderBy: { createdAt: 'desc' },
            take: 1,
            include: { plan: true },
          },
          appointments: {
            orderBy: { createdAt: 'asc' },
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
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.tenantFeedback.findMany({
        orderBy: { createdAt: 'desc' },
        take: 50,
        include: {
          barbershop: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
        },
      }),
    ])

    const now = new Date()

    const enrichedTenants = barbershops.map((shop: any) => {
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

      const lifecycleStatus = resolveTenantLifecycleStatus(shop)

      const apptsList = shop.appointments || []
      const firstAppt = apptsList[0] || null
      const latestAppt = apptsList[apptsList.length - 1] || null

      const safeIso = (d: any): string | null => {
        if (!d) return null
        const dateObj = new Date(d)
        return isNaN(dateObj.getTime()) ? null : dateObj.toISOString()
      }

      const firstAppointmentAt = firstAppt ? safeIso(firstAppt.createdAt) : null

      let timeToFirstAppointmentHours: number | null = null
      if (firstAppt?.createdAt && shop.createdAt) {
        const t1 = new Date(firstAppt.createdAt).getTime()
        const t0 = new Date(shop.createdAt).getTime()
        if (!isNaN(t1) && !isNaN(t0)) {
          timeToFirstAppointmentHours = Math.max(0, Math.round(((t1 - t0) / (1000 * 60 * 60)) * 10) / 10)
        }
      }

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

      const completionPercentage = calculateCompletionPercentage(onboardingSteps)

      return {
        id: shop.id,
        name: shop.name,
        slug: shop.slug,
        email: shop.email,
        phone: shop.phone,
        address: shop.address,
        isActive: shop.isActive,
        createdAt: shop.createdAt,
        trial,
        lifecycleStatus,
        lastAccess,
        lastActivity,
        adminUser,
        usersCount: shop._count?.users || 0,
        clientsCount: shop._count?.clients || 0,
        servicesCount: shop._count?.services || 0,
        appointmentsCount: shop._count?.appointments || 0,
        isActivated: (shop._count?.appointments || 0) > 0,
        firstAppointmentAt,
        timeToFirstAppointmentHours,
        onboardingSteps,
        completionPercentage,
      }
    })

    const metricsInput = enrichedTenants.map((t) => ({
      lifecycleStatus: t.lifecycleStatus,
      isActivated: t.isActivated,
      timeToFirstAppointmentHours: t.timeToFirstAppointmentHours,
      appointmentsCount: t.appointmentsCount,
      lastActivityDate: t.lastActivity,
    }))

    const funnelMetrics = calculateOnboardingMetrics(metricsInput, feedbacks)

    return NextResponse.json({
      tenants: enrichedTenants,
      funnelMetrics,
      feedbacks,
    })
  } catch (error: any) {
    console.error('Developer Onboarding GET error:', error)
    return NextResponse.json(
      { error: 'Erro ao carregar cockpit de onboarding' },
      { status: 500 }
    )
  }
}
