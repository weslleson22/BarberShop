import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthUser, requireRole } from '@/lib/api-auth'

export const dynamic = 'force-dynamic'
export const revalidate = 0

// GET - Buscar estatísticas reais do dashboard, restritas à barbearia do usuário autenticado
export async function GET(request: NextRequest) {
  try {
    const user = getAuthUser(request)
    if (!requireRole(user, ['ADMIN', 'BARBER', 'RECEPTIONIST', 'CLIENT'])) {
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

    // Se o usuário é ADMIN ou RECEPTIONIST, sincronizar com a barbearia ativa
    // (onde os agendamentos mais recentes foram criados)
    if (user.role === 'ADMIN' || user.role === 'RECEPTIONIST') {
      const latestAppt = await prisma.appointment.findFirst({
        select: { barbershopId: true },
        orderBy: { createdAt: 'desc' }
      })
      if (latestAppt?.barbershopId && latestAppt.barbershopId !== barbershopId) {
        barbershopId = latestAppt.barbershopId
        try {
          await prisma.user.update({
            where: { id: user.id },
            data: { barbershopId }
          })
        } catch {}
      }
    }

    // Se o usuário é BARBER, sincronizar com a barbearia onde os agendamentos do barbeiro estão
    if (user.role === 'BARBER') {
      const barberAppt = await prisma.appointment.findFirst({
        where: { barberId: user.id },
        select: { barbershopId: true },
        orderBy: { createdAt: 'desc' }
      })
      if (barberAppt?.barbershopId && barberAppt.barbershopId !== barbershopId) {
        barbershopId = barberAppt.barbershopId
        try {
          await prisma.user.update({
            where: { id: user.id },
            data: { barbershopId }
          })
        } catch {}
      }
    }

    if (!barbershopId) {
      const firstShop = await prisma.barbershop.findFirst({ select: { id: true } })
      barbershopId = firstShop?.id
    }

    if (!barbershopId) {
      return NextResponse.json({ error: 'Barbearia não encontrada' }, { status: 404 })
    }

    // Se for CLIENT, filtra apenas os agendamentos do próprio cliente
    const appointmentWhere: any = { barbershopId }
    if (user.role === 'CLIENT') {
      const client = await prisma.client.findUnique({ where: { userId: user.id } })
      appointmentWhere.OR = [
        ...(client ? [{ clientId: client.id }] : []),
        { createdBy: user.id },
        { client: { userId: user.id } },
        ...(user.email ? [{ client: { email: user.email.trim().toLowerCase() } }] : [])
      ]
    }

    // Buscar todos os agendamentos da barbearia (ou do cliente) com select refinado
    // (evita carregar fotos/avatares em base64 que ultrapassam o limite de 5MB do Prisma)
    const appointments = await prisma.appointment.findMany({
      where: appointmentWhere,
      select: {
        id: true,
        status: true,
        startTime: true,
        totalAmount: true,
      },
    })

    // Buscar clientes apenas com id e createdAt (necessários para contagem e crescimento)
    const clients = await prisma.client.findMany({
      where: { barbershopId },
      select: {
        id: true,
        createdAt: true,
      },
    })

    // Contagem de serviços da barbearia
    const services = await prisma.service.findMany({
      where: { barbershopId },
      select: { id: true },
    })

    // Contagem de barbeiros da barbearia
    const barbers = await prisma.user.findMany({
      where: {
        barbershopId,
        role: 'BARBER'
      },
      select: { id: true },
    })

    // Calcular estatísticas
    const totalAppointments = appointments.length
    const completedAppointments = appointments.filter(apt => apt.status === 'COMPLETED').length
    const pendingAppointments = appointments.filter(apt => apt.status === 'PENDING' || apt.status === 'CONFIRMED').length
    const confirmedAppointments = appointments.filter(apt => apt.status === 'CONFIRMED').length
    const cancelledAppointments = appointments.filter(apt => apt.status === 'CANCELLED').length
    
    // Faturamento total (apenas concluídos)
    const totalRevenue = appointments
      .filter(apt => apt.status === 'COMPLETED')
      .reduce((sum, apt) => sum + (Number(apt.totalAmount) || 0), 0)
    
    // Ticket médio
    const averageTicket = completedAppointments > 0 ? totalRevenue / completedAppointments : 0
    
    // Crescimento (comparação com mês anterior - simplificado)
    const currentMonth = new Date().getMonth()
    const currentYear = new Date().getFullYear()
    
    const currentMonthAppointments = appointments.filter(apt => {
      const aptDate = new Date(apt.startTime)
      return aptDate.getMonth() === currentMonth && aptDate.getFullYear() === currentYear
    }).length
    
    const previousMonthAppointments = appointments.filter(apt => {
      const aptDate = new Date(apt.startTime)
      const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1
      const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear
      return aptDate.getMonth() === prevMonth && aptDate.getFullYear() === prevYear
    }).length
    
    const appointmentsChange = previousMonthAppointments > 0 
      ? ((currentMonthAppointments - previousMonthAppointments) / previousMonthAppointments) * 100
      : 0
    
    // Variação de clientes (novos clientes este mês vs mês anterior)
    const currentMonthClients = clients.filter(client => {
      const clientDate = new Date(client.createdAt)
      return clientDate.getMonth() === currentMonth && clientDate.getFullYear() === currentYear
    }).length
    
    const previousMonthClients = clients.filter(client => {
      const clientDate = new Date(client.createdAt)
      const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1
      const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear
      return clientDate.getMonth() === prevMonth && clientDate.getFullYear() === prevYear
    }).length
    
    const clientsChange = previousMonthClients > 0 
      ? ((currentMonthClients - previousMonthClients) / previousMonthClients) * 100
      : 0
    
    // Variação de faturamento
    const currentMonthRevenue = appointments
      .filter(apt => {
        const aptDate = new Date(apt.startTime)
        return aptDate.getMonth() === currentMonth && 
               aptDate.getFullYear() === currentYear &&
               apt.status === 'COMPLETED'
      })
      .reduce((sum, apt) => sum + (Number(apt.totalAmount) || 0), 0)
    
    const previousMonthRevenue = appointments
      .filter(apt => {
        const aptDate = new Date(apt.startTime)
        const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1
        const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear
        return aptDate.getMonth() === prevMonth && 
               aptDate.getFullYear() === prevYear &&
               apt.status === 'COMPLETED'
      })
      .reduce((sum, apt) => sum + (Number(apt.totalAmount) || 0), 0)
    
    const revenueChange = previousMonthRevenue > 0 
      ? ((currentMonthRevenue - previousMonthRevenue) / previousMonthRevenue) * 100
      : 0
    
    // Variação de ticket médio
    const currentMonthAvgTicket = currentMonthAppointments > 0 ? currentMonthRevenue / currentMonthAppointments : 0
    const previousMonthAvgTicket = previousMonthAppointments > 0 ? previousMonthRevenue / previousMonthAppointments : 0
    
    const avgTicketChange = previousMonthAvgTicket > 0 
      ? ((currentMonthAvgTicket - previousMonthAvgTicket) / previousMonthAvgTicket) * 100
      : 0

    const stats = {
      appointments: {
        total: totalAppointments,
        completed: completedAppointments,
        pending: pendingAppointments,
        confirmed: confirmedAppointments,
        cancelled: cancelledAppointments,
        change: appointmentsChange,
        changeType: appointmentsChange >= 0 ? 'increase' : 'decrease'
      },
      clients: {
        total: clients.length,
        newThisMonth: currentMonthClients,
        change: clientsChange,
        changeType: clientsChange >= 0 ? 'increase' : 'decrease'
      },
      revenue: {
        total: totalRevenue,
        thisMonth: currentMonthRevenue,
        change: revenueChange,
        changeType: revenueChange >= 0 ? 'increase' : 'decrease'
      },
      averageTicket: {
        value: averageTicket,
        thisMonth: currentMonthAvgTicket,
        change: avgTicketChange,
        changeType: avgTicketChange >= 0 ? 'increase' : 'decrease'
      },
      services: {
        total: services.length
      },
      barbers: {
        total: barbers.length
      }
    }

    console.log('Estatísticas calculadas:', stats)

    return NextResponse.json(stats)
  } catch (error) {
    console.error('Get dashboard stats error:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar estatísticas do dashboard' },
      { status: 500 }
    )
  }
}
