import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthUser, requireRole } from '@/lib/api-auth'
import { parseBarbershopMetadata } from '@/lib/operating-hours'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const EXPENSE_CATEGORY_LABELS: Record<string, string> = {
  FIXED: 'Custos Fixos (Aluguel, Luz, Água)',
  SUPPLIES: 'Insumos & Estoque',
  MAINTENANCE: 'Manutenção & Equipamentos',
  MARKETING: 'Marketing & Divulgação',
  TAXES: 'Impostos & Tarifas',
  OTHER: 'Outras Despesas',
}

// GET - Métricas Consolidadas para Relatórios Estratégicos
export async function GET(request: NextRequest) {
  try {
    const user = getAuthUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    if (user.role === 'DEVELOPER') {
      const { searchParams } = new URL(request.url)
      const requestedShopId = searchParams.get('barbershopId')
      if (!requestedShopId) {
        // Se for developer sem shop especificada, pega a primeira barbearia ativa
        const firstShop = await prisma.barbershop.findFirst({ select: { id: true } })
        if (!firstShop) {
          return NextResponse.json({ error: 'Nenhuma barbearia cadastrada' }, { status: 404 })
        }
        user.barbershopId = firstShop.id
      } else {
        user.barbershopId = requestedShopId
      }
    }

    if (!requireRole(user, ['ADMIN', 'BARBER', 'RECEPTIONIST', 'DEVELOPER'])) {
      return NextResponse.json({ error: 'Acesso restrito' }, { status: 403 })
    }

    const barbershopId = user.barbershopId
    if (!barbershopId) {
      return NextResponse.json({ error: 'Barbearia não identificada' }, { status: 400 })
    }

    const currentYear = new Date().getFullYear()
    const currentMonth = new Date().getMonth()
    const currentMonthPrefix = new Date().toISOString().slice(0, 7) // YYYY-MM

    // 1. Carrega dados do estabelecimento (metadados com despesas e inventário)
    const barbershop = await prisma.barbershop.findUnique({
      where: { id: barbershopId },
      select: { description: true, name: true },
    })

    const metadata = parseBarbershopMetadata(barbershop?.description)
    const expensesList = metadata.expenses || []
    const inventoryList = metadata.inventory || []

    // 2. Carrega todos os agendamentos da barbearia
    const appointments = await prisma.appointment.findMany({
      where: { barbershopId },
      select: {
        id: true,
        status: true,
        startTime: true,
        totalAmount: true,
        barberId: true,
        barber: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            avatar: true,
          },
        },
        clientId: true,
        client: {
          select: {
            id: true,
            name: true,
            phone: true,
            email: true,
            createdAt: true,
          },
        },
        serviceId: true,
        service: {
          select: {
            id: true,
            name: true,
            price: true,
            duration: true,
          },
        },
      },
      orderBy: { startTime: 'desc' },
    })

    // 3. Carrega todos os barbeiros e serviços cadastrados para garantir integridade do catálogo
    const allBarbers = await prisma.user.findMany({
      where: { barbershopId, role: 'BARBER' },
      select: { id: true, name: true, email: true, phone: true, avatar: true },
    })

    const allServices = await prisma.service.findMany({
      where: { barbershopId, isActive: true },
      select: { id: true, name: true, price: true, duration: true },
    })

    const allClients = await prisma.client.findMany({
      where: { barbershopId },
      select: { id: true, name: true, phone: true, email: true, createdAt: true },
    })

    // -------------------------------------------------------------
    // CÁLCULO GERAL & FINANCEIRO (RECEITA)
    // -------------------------------------------------------------
    const totalAppointments = appointments.length
    const completedAppointments = appointments.filter((a) => a.status === 'COMPLETED')
    const completedCount = completedAppointments.length
    const cancelledCount = appointments.filter((a) => a.status === 'CANCELLED').length
    const completionRate = totalAppointments > 0 ? Math.round((completedCount / totalAppointments) * 100) : 100

    const totalRevenue = completedAppointments.reduce((sum, a) => sum + (Number(a.totalAmount) || 0), 0)

    const monthCompletedAppointments = completedAppointments.filter((a) => {
      const d = new Date(a.startTime)
      return d.getFullYear() === currentYear && d.getMonth() === currentMonth
    })
    const monthRevenue = monthCompletedAppointments.reduce((sum, a) => sum + (Number(a.totalAmount) || 0), 0)
    const averageTicket = completedCount > 0 ? totalRevenue / completedCount : 0

    // -------------------------------------------------------------
    // SUBITEM 1: MÉTRICAS DE GASTOS DO ESTABELECIMENTO
    // -------------------------------------------------------------
    const totalExpensesAmount = expensesList.reduce((sum, e) => sum + (Number(e.amount) || 0), 0)
    const monthExpensesList = expensesList.filter((e) => e.dueDate.startsWith(currentMonthPrefix))
    const monthExpensesAmount = monthExpensesList.reduce((sum, e) => sum + (Number(e.amount) || 0), 0)

    const paidExpensesAmount = expensesList
      .filter((e) => e.status === 'PAID')
      .reduce((sum, e) => sum + (Number(e.amount) || 0), 0)
    const pendingExpensesList = expensesList.filter((e) => e.status === 'PENDING')
    const pendingExpensesAmount = pendingExpensesList.reduce((sum, e) => sum + (Number(e.amount) || 0), 0)

    // Lucro Líquido Real do Mês (Faturamento - Gastos)
    const netProfitMonth = monthRevenue - monthExpensesAmount
    const netMarginMonth = monthRevenue > 0 ? Math.round((netProfitMonth / monthRevenue) * 100) : 0

    // Distribuição de Gastos por Categoria
    const categoryTotals: Record<string, number> = {}
    expensesList.forEach((e) => {
      const cat = e.category || 'OTHER'
      categoryTotals[cat] = (categoryTotals[cat] || 0) + (Number(e.amount) || 0)
    })

    const expensesByCategory = Object.entries(categoryTotals).map(([cat, amount]) => ({
      category: cat,
      label: EXPENSE_CATEGORY_LABELS[cat] || cat,
      amount,
      percent: totalExpensesAmount > 0 ? Math.round((amount / totalExpensesAmount) * 100) : 0,
    })).sort((a, b) => b.amount - a.amount)

    // Capital investido no estoque
    const inventoryTotalCost = inventoryList.reduce((sum, p) => sum + (Number(p.currentStock) || 0) * (Number(p.costPrice) || 0), 0)

    // -------------------------------------------------------------
    // SUBITEM 2: DESEMPENHO DOS BARBEIROS (QUEM MAIS ATENDEU)
    // -------------------------------------------------------------
    const barberMap: Record<
      string,
      {
        id: string
        name: string
        email: string
        phone: string | null
        avatar: string | null
        completedCount: number
        totalCount: number
        cancelledCount: number
        revenue: number
      }
    > = {}

    // Inicializa todos os barbeiros cadastrados
    allBarbers.forEach((b) => {
      barberMap[b.id] = {
        id: b.id,
        name: b.name,
        email: b.email,
        phone: b.phone,
        avatar: b.avatar,
        completedCount: 0,
        totalCount: 0,
        cancelledCount: 0,
        revenue: 0,
      }
    })

    // Processa agendamentos de cada barbeiro
    appointments.forEach((apt) => {
      if (!apt.barberId) return
      if (!barberMap[apt.barberId]) {
        barberMap[apt.barberId] = {
          id: apt.barberId,
          name: apt.barber?.name || 'Profissional',
          email: apt.barber?.email || '',
          phone: apt.barber?.phone || null,
          avatar: apt.barber?.avatar || null,
          completedCount: 0,
          totalCount: 0,
          cancelledCount: 0,
          revenue: 0,
        }
      }

      barberMap[apt.barberId].totalCount++
      if (apt.status === 'COMPLETED') {
        barberMap[apt.barberId].completedCount++
        barberMap[apt.barberId].revenue += Number(apt.totalAmount) || 0
      } else if (apt.status === 'CANCELLED') {
        barberMap[apt.barberId].cancelledCount++
      }
    })

    const barberRanking = Object.values(barberMap)
      .map((b) => ({
        ...b,
        averageTicket: b.completedCount > 0 ? b.revenue / b.completedCount : 0,
        completionRate: b.totalCount > 0 ? Math.round((b.completedCount / b.totalCount) * 100) : 100,
      }))
      .sort((a, b) => b.completedCount - a.completedCount || b.revenue - a.revenue)

    const topBarber = barberRanking.length > 0 && barberRanking[0].completedCount > 0 ? barberRanking[0] : null

    // -------------------------------------------------------------
    // SUBITEM 3: MÉTRICAS DOS CLIENTES
    // -------------------------------------------------------------
    const clientMap: Record<
      string,
      {
        id: string
        name: string
        phone: string
        email: string | null
        totalVisits: number
        totalSpent: number
        lastVisitDate: string | null
      }
    > = {}

    // Inicializa clientes existentes
    allClients.forEach((c) => {
      clientMap[c.id] = {
        id: c.id,
        name: c.name,
        phone: c.phone,
        email: c.email,
        totalVisits: 0,
        totalSpent: 0,
        lastVisitDate: null,
      }
    })

    const sixtyDaysAgo = new Date()
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60)

    appointments.forEach((apt) => {
      if (!apt.clientId) return
      if (!clientMap[apt.clientId]) {
        clientMap[apt.clientId] = {
          id: apt.clientId,
          name: apt.client?.name || 'Cliente',
          phone: apt.client?.phone || '',
          email: apt.client?.email || null,
          totalVisits: 0,
          totalSpent: 0,
          lastVisitDate: null,
        }
      }

      if (apt.status === 'COMPLETED') {
        clientMap[apt.clientId].totalVisits++
        clientMap[apt.clientId].totalSpent += Number(apt.totalAmount) || 0

        const aptDateStr = new Date(apt.startTime).toISOString()
        if (!clientMap[apt.clientId].lastVisitDate || aptDateStr > clientMap[apt.clientId].lastVisitDate!) {
          clientMap[apt.clientId].lastVisitDate = aptDateStr
        }
      }
    })

    const clientRanking = Object.values(clientMap)
      .sort((a, b) => b.totalVisits - a.totalVisits || b.totalSpent - a.totalSpent)

    const newClientsThisMonth = allClients.filter((c) => {
      const d = new Date(c.createdAt)
      return d.getFullYear() === currentYear && d.getMonth() === currentMonth
    }).length

    const activeClients = clientRanking.filter((c) => {
      if (!c.lastVisitDate) return false
      return new Date(c.lastVisitDate) >= sixtyDaysAgo
    }).length

    const retentionRate = allClients.length > 0 ? Math.round((activeClients / allClients.length) * 100) : 0
    const averageSpendPerClient = allClients.length > 0 ? totalRevenue / allClients.length : 0

    // -------------------------------------------------------------
    // SUBITEM 4: MÉTRICAS DOS SERVIÇOS E PREÇOS
    // -------------------------------------------------------------
    const serviceMap: Record<
      string,
      {
        id: string
        name: string
        price: number
        duration: number
        appointmentCount: number
        totalRevenue: number
      }
    > = {}

    allServices.forEach((s) => {
      serviceMap[s.id] = {
        id: s.id,
        name: s.name,
        price: Number(s.price) || 0,
        duration: s.duration || 30,
        appointmentCount: 0,
        totalRevenue: 0,
      }
    })

    completedAppointments.forEach((apt) => {
      if (!apt.serviceId) return
      if (!serviceMap[apt.serviceId]) {
        serviceMap[apt.serviceId] = {
          id: apt.serviceId,
          name: apt.service?.name || 'Serviço',
          price: Number(apt.service?.price) || Number(apt.totalAmount) || 0,
          duration: apt.service?.duration || 30,
          appointmentCount: 0,
          totalRevenue: 0,
        }
      }

      serviceMap[apt.serviceId].appointmentCount++
      serviceMap[apt.serviceId].totalRevenue += Number(apt.totalAmount) || 0
    })

    const totalServiceRevenue = Object.values(serviceMap).reduce((sum, s) => sum + s.totalRevenue, 0)

    const serviceRanking = Object.values(serviceMap)
      .map((s) => ({
        ...s,
        sharePercent: totalServiceRevenue > 0 ? Math.round((s.totalRevenue / totalServiceRevenue) * 100) : 0,
      }))
      .sort((a, b) => b.appointmentCount - a.appointmentCount || b.totalRevenue - a.totalRevenue)

    const topService = serviceRanking.length > 0 && serviceRanking[0].appointmentCount > 0 ? serviceRanking[0] : null
    const highestRevenueService = [...serviceRanking].sort((a, b) => b.totalRevenue - a.totalRevenue)[0] || null
    const averageServicePrice = allServices.length > 0
      ? allServices.reduce((sum, s) => sum + (Number(s.price) || 0), 0) / allServices.length
      : 0

    // -------------------------------------------------------------
    // EVOLUÇÃO TEMPORAL DOS ÚLTIMOS 7 DIAS
    // -------------------------------------------------------------
    const last7Days: Array<{ date: string; name: string; revenue: number; appointments: number }> = []
    const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

    for (let i = 6; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const dateStr = d.toISOString().split('T')[0]
      const name = `${dayNames[d.getDay()]} (${d.getDate()}/${d.getMonth() + 1})`

      const dayApts = completedAppointments.filter((a) => {
        return new Date(a.startTime).toISOString().startsWith(dateStr)
      })

      const dayRev = dayApts.reduce((sum, a) => sum + (Number(a.totalAmount) || 0), 0)

      last7Days.push({
        date: dateStr,
        name,
        revenue: dayRev,
        appointments: dayApts.length,
      })
    }

    return NextResponse.json({
      summary: {
        totalRevenue,
        monthRevenue,
        totalAppointments,
        completedAppointments: completedCount,
        cancelledAppointments: cancelledCount,
        completionRate,
        averageTicket,
        totalClients: allClients.length,
        totalServices: allServices.length,
        totalBarbers: allBarbers.length,
      },
      expenses: {
        totalAmount: totalExpensesAmount,
        monthAmount: monthExpensesAmount,
        paidAmount: paidExpensesAmount,
        pendingAmount: pendingExpensesAmount,
        pendingCount: pendingExpensesList.length,
        netProfitMonth,
        netMarginMonth,
        byCategory: expensesByCategory,
        inventoryCost: inventoryTotalCost,
        recentExpenses: expensesList.slice(0, 8),
      },
      barbers: {
        ranking: barberRanking,
        topBarber,
        totalBarbers: allBarbers.length,
      },
      clients: {
        totalClients: allClients.length,
        newThisMonth: newClientsThisMonth,
        activeClientsCount: activeClients,
        inactiveClientsCount: Math.max(0, allClients.length - activeClients),
        retentionRate,
        averageSpendPerClient,
        topClients: clientRanking.slice(0, 15),
      },
      services: {
        ranking: serviceRanking,
        topService,
        highestRevenueService,
        totalCatalogServices: allServices.length,
        averageServicePrice,
      },
      revenueEvolution: last7Days,
    })
  } catch (error: any) {
    console.error('Reports API error:', error)
    return NextResponse.json({ error: 'Erro ao processar relatórios estratégicos' }, { status: 500 })
  }
}
