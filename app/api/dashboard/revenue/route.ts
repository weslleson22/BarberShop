import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthUser, requireRole } from '@/lib/api-auth'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(request: NextRequest) {
  try {
    const user = getAuthUser(request)
    if (!requireRole(user, ['ADMIN', 'BARBER', 'RECEPTIONIST'])) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    let barbershopId = user.barbershopId
    if (!barbershopId && user.id) {
      const dbUser = await prisma.user.findUnique({
        where: { id: user.id },
        select: { barbershopId: true }
      })
      barbershopId = dbUser?.barbershopId
    }

    if (!barbershopId) {
      const firstShop = await prisma.barbershop.findFirst({ select: { id: true } })
      barbershopId = firstShop?.id
    }

    // Get the last 7 days
    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - 6) // 6 days ago to include today (7 days total)
    startDate.setHours(0, 0, 0, 0)
    endDate.setHours(23, 59, 59, 999)

    // Fetch completed appointments in the date range, scoped to the user's barbershop
    const appointments = await prisma.appointment.findMany({
      where: {
        ...(barbershopId ? { barbershopId } : {}),
        status: 'COMPLETED',
        startTime: {
          gte: startDate,
          lte: endDate
        }
      },
      include: {
        service: true
      },
      orderBy: {
        startTime: 'asc'
      }
    })

    console.log('Completed appointments found:', appointments.length)

    // Initialize revenue data for each day
    const revenueData = []
    const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
    
    for (let i = 0; i < 7; i++) {
      const currentDate = new Date(startDate)
      currentDate.setDate(startDate.getDate() + i)
      currentDate.setHours(0, 0, 0, 0)
      
      const nextDate = new Date(currentDate)
      nextDate.setDate(currentDate.getDate() + 1)
      nextDate.setHours(0, 0, 0, 0)

      // Calculate revenue for this day
      const dayRevenue = appointments
        .filter(apt => {
          const aptDate = new Date(apt.startTime)
          return aptDate >= currentDate && aptDate < nextDate
        })
        .reduce((sum, apt) => {
          const totalAmount = apt.totalAmount ? Number(apt.totalAmount) : 0
          const servicePrice = apt.service?.price ? Number(apt.service.price) : 0
          return sum + (totalAmount || servicePrice || 0)
        }, 0)

      revenueData.push({
        name: dayNames[currentDate.getDay()],
        value: dayRevenue,
        date: currentDate.toISOString().split('T')[0]
      })
    }

    console.log('Revenue data calculated:', revenueData)

    return NextResponse.json(revenueData)
  } catch (error) {
    console.error('Revenue data fetch error:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar dados de faturamento' },
      { status: 500 }
    )
  }
}