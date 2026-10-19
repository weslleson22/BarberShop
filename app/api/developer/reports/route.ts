import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser, requireRole } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(request: NextRequest) {
  try {
    const user = getAuthUser(request)
    if (!requireRole(user, ['DEVELOPER', 'ADMIN'])) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const daysParam = Math.min(180, Math.max(1, Number(searchParams.get('days') || 30)))

    const now = new Date()
    const startDate = new Date(now.getTime() - daysParam * 24 * 60 * 60 * 1000)

    const barbershopFilter = user.role === 'DEVELOPER'
      ? {}
      : { barbershopId: user.barbershopId || undefined }

    // 1. Contagens Globais
    const [
      totalUsers,
      totalClients,
      totalBarbershops,
      totalAppointments,
      periodAppointments,
      periodLogs,
    ] = await Promise.all([
      prisma.user.count({ where: barbershopFilter }),
      prisma.client.count({ where: barbershopFilter }),
      user.role === 'DEVELOPER' ? prisma.barbershop.count() : 1,
      prisma.appointment.count({ where: barbershopFilter }),
      prisma.appointment.findMany({
        where: {
          ...barbershopFilter,
          createdAt: { gte: startDate },
        },
        select: {
          id: true,
          status: true,
          startTime: true,
          createdAt: true,
          barbershopId: true,
          barbershop: { select: { name: true, slug: true } },
          service: { select: { price: true, duration: true } },
        },
      }),
      prisma.auditLog.findMany({
        where: {
          ...barbershopFilter,
          createdAt: { gte: startDate },
        },
        select: {
          id: true,
          action: true,
          entity: true,
          createdAt: true,
          userId: true,
          success: true,
        },
      }),
    ])

    // 2. Agrupamento Diário de Atividade
    const dailyMap: Record<string, { date: string; appointments: number; completed: number; cancelled: number; actions: number }> = {}

    for (let i = 0; i <= daysParam; i++) {
      const d = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000)
      const key = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`
      dailyMap[key] = { date: key, appointments: 0, completed: 0, cancelled: 0, actions: 0 }
    }

    periodAppointments.forEach((apt) => {
      const d = new Date(apt.createdAt)
      const key = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`
      if (dailyMap[key]) {
        dailyMap[key].appointments++
        if (apt.status === 'COMPLETED') dailyMap[key].completed++
        if (apt.status === 'CANCELLED' || apt.status === 'NO_SHOW') dailyMap[key].cancelled++
      }
    })

    periodLogs.forEach((log) => {
      const d = new Date(log.createdAt)
      const key = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`
      if (dailyMap[key]) {
        dailyMap[key].actions++
      }
    })

    const dailyActivity = Object.values(dailyMap)

    // 3. Distribuição por Horário do Dia (Horários de Pico 00h - 23h)
    const hourlyCounts = Array.from({ length: 24 }, (_, i) => ({
      hour: `${String(i).padStart(2, '0')}:00`,
      hourNumber: i,
      appointments: 0,
      logins: 0,
    }))

    periodAppointments.forEach((apt) => {
      const h = new Date(apt.startTime).getHours()
      if (hourlyCounts[h]) hourlyCounts[h].appointments++
    })

    periodLogs.forEach((log) => {
      if (log.action === 'LOGIN' || log.action === 'CREATE') {
        const h = new Date(log.createdAt).getHours()
        if (hourlyCounts[h]) hourlyCounts[h].logins++
      }
    })

    // 4. Status de Agendamentos (Funil / Conversão)
    const statusCounts = {
      COMPLETED: periodAppointments.filter((a) => a.status === 'COMPLETED').length,
      CONFIRMED: periodAppointments.filter((a) => a.status === 'CONFIRMED').length,
      PENDING: periodAppointments.filter((a) => a.status === 'PENDING').length,
      CANCELLED: periodAppointments.filter((a) => a.status === 'CANCELLED').length,
      NO_SHOW: periodAppointments.filter((a) => a.status === 'NO_SHOW').length,
    }

    const completionRate = periodAppointments.length > 0
      ? Math.round((statusCounts.COMPLETED / periodAppointments.length) * 100)
      : 0

    // 5. Categorias de Ações no Sistema
    const actionCategories = {
      Agendamentos: periodLogs.filter((l) => l.entity === 'APPOINTMENT').length,
      Clientes: periodLogs.filter((l) => l.entity === 'CLIENT').length,
      Autenticacao: periodLogs.filter((l) => l.action.includes('LOGIN') || l.action.includes('PASSWORD')).length,
      Servicos: periodLogs.filter((l) => l.entity === 'SERVICE').length,
      Assinaturas: periodLogs.filter((l) => l.entity === 'SUBSCRIPTION' || l.entity === 'PLAN').length,
      Outros: periodLogs.filter((l) => !['APPOINTMENT', 'CLIENT', 'SERVICE', 'SUBSCRIPTION', 'PLAN'].includes(l.entity)).length,
    }

    // 6. Top Barbearias mais ativas
    const tenantActivityMap: Record<string, { name: string; slug: string | null; appointments: number; completed: number }> = {}

    periodAppointments.forEach((apt) => {
      const shopId = apt.barbershopId || 'global'
      const shopName = apt.barbershop?.name || 'Unidade'
      const slug = apt.barbershop?.slug || null

      if (!tenantActivityMap[shopId]) {
        tenantActivityMap[shopId] = { name: shopName, slug, appointments: 0, completed: 0 }
      }
      tenantActivityMap[shopId].appointments++
      if (apt.status === 'COMPLETED') tenantActivityMap[shopId].completed++
    })

    const topBarbershops = Object.values(tenantActivityMap)
      .sort((a, b) => b.appointments - a.appointments)
      .slice(0, 8)

    return NextResponse.json({
      periodDays: daysParam,
      totals: {
        totalUsers,
        totalClients,
        totalBarbershops,
        totalAppointments,
        periodAppointmentsCount: periodAppointments.length,
        periodLogsCount: periodLogs.length,
        completionRate,
      },
      statusCounts,
      dailyActivity,
      hourlyCounts: hourlyCounts.filter((h) => h.hourNumber >= 7 && h.hourNumber <= 22),
      actionCategories,
      topBarbershops,
    })
  } catch (error) {
    console.error('Error computing reports:', error)
    return NextResponse.json({ error: 'Erro ao gerar relatórios de uso' }, { status: 500 })
  }
}
