import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET - Buscar estatísticas reais do dashboard
export async function GET(request: NextRequest) {
  try {
    console.log('=== BUSCANDO ESTATÍSTICAS REAIS DO DASHBOARD ===')
    
    // Buscar todos os agendamentos
    const appointments = await prisma.appointment.findMany({
      include: {
        client: true,
        service: true,
        barber: true,
      },
    })

    console.log('Total de agendamentos encontrados:', appointments.length)

    // Buscar todos os clientes
    const clients = await prisma.client.findMany()
    console.log('Total de clientes encontrados:', clients.length)

    // Buscar todos os serviços
    const services = await prisma.service.findMany()
    console.log('Total de serviços encontrados:', services.length)

    // Buscar todos os usuários barbeiros
    const barbers = await prisma.user.findMany({
      where: {
        role: 'BARBER'
      }
    })
    console.log('Total de barbeiros encontrados:', barbers.length)

    // Calcular estatísticas
    const totalAppointments = appointments.length
    const completedAppointments = appointments.filter(apt => apt.status === 'COMPLETED').length
    const pendingAppointments = appointments.filter(apt => apt.status === 'PENDING').length
    const cancelledAppointments = appointments.filter(apt => apt.status === 'CANCELLED').length
    
    // Faturamento total (apenas concluídos)
    const totalRevenue = appointments
      .filter(apt => apt.status === 'COMPLETED')
      .reduce((sum, apt) => sum + Number(apt.totalAmount), 0)
    
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
      .reduce((sum, apt) => sum + Number(apt.totalAmount), 0)
    
    const previousMonthRevenue = appointments
      .filter(apt => {
        const aptDate = new Date(apt.startTime)
        const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1
        const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear
        return aptDate.getMonth() === prevMonth && 
               aptDate.getFullYear() === prevYear &&
               apt.status === 'COMPLETED'
      })
      .reduce((sum, apt) => sum + Number(apt.totalAmount), 0)
    
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
