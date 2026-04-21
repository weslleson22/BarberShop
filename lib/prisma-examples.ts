import { prisma } from './prisma'

// Exemplos de queries Prisma para o sistema de barbearia

export async function exampleQueries() {
  try {
    // 1. Criar nova barbearia
    const newBarbershop = await prisma.barbershop.create({
      data: {
        name: 'Barbearia Central',
        email: 'contato@barberiacentral.com',
        phone: '(11) 99999-9999',
        address: 'Rua Principal, 123 - São Paulo, SP',
        description: 'A melhor barbearia da região',
      },
    })

    console.log('Nova barbearia criada:', newBarbershop)

    // 2. Criar usuário administrador
    const adminUser = await prisma.user.create({
      data: {
        name: 'João Silva',
        email: 'joao@barberiacentral.com',
        password: 'hashed_password_here',
        role: 'ADMIN',
        barbershopId: newBarbershop.id,
      },
    })

    console.log('Usuário admin criado:', adminUser)

    // 3. Criar barbeiros
    const barber1 = await prisma.user.create({
      data: {
        name: 'Carlos Oliveira',
        email: 'carlos@barberiacentral.com',
        password: 'hashed_password_here',
        role: 'BARBER',
        barbershopId: newBarbershop.id,
      },
    })

    const barber2 = await prisma.user.create({
      data: {
        name: 'Pedro Santos',
        email: 'pedro@barberiacentral.com',
        password: 'hashed_password_here',
        role: 'BARBER',
        barbershopId: newBarbershop.id,
      },
    })

    console.log('Barbeiros criados:', { barber1, barber2 })

    // 4. Criar serviços
    const services = await Promise.all([
      prisma.service.create({
        data: {
          name: 'Corte Masculino',
          description: 'Corte tradicional com máquina e tesoura',
          price: 35.00,
          duration: 30,
          barbershopId: newBarbershop.id,
        },
      }),
      prisma.service.create({
        data: {
          name: 'Barba',
          description: 'Aparação e modelagem de barba',
          price: 25.00,
          duration: 20,
          barbershopId: newBarbershop.id,
        },
      }),
      prisma.service.create({
        data: {
          name: 'Corte + Barba',
          description: 'Pacote completo com corte e barba',
          price: 50.00,
          duration: 45,
          barbershopId: newBarbershop.id,
        },
      }),
      prisma.service.create({
        data: {
          name: 'Tratamento Capilar',
          description: 'Hidratação profunda e tratamento',
          price: 40.00,
          duration: 40,
          barbershopId: newBarbershop.id,
        },
      }),
    ])

    console.log('Serviços criados:', services)

    // 5. Criar clientes
    const clients = await Promise.all([
      prisma.client.create({
        data: {
          name: 'Maria Santos',
          email: 'maria.santos@email.com',
          phone: '(11) 55555-5555',
          barbershopId: newBarbershop.id,
          notes: 'Cliente preferencial, sempre vem aos sábados',
        },
      }),
      prisma.client.create({
        data: {
          name: 'João Oliveira',
          email: 'joao.oliveira@email.com',
          phone: '(11) 44444-4444',
          barbershopId: newBarbershop.id,
          notes: 'Prefere corte curto',
        },
      }),
      prisma.client.create({
        data: {
          name: 'Pedro Costa',
          phone: '(11) 33333-3333',
          barbershopId: newBarbershop.id,
          notes: 'Cliente novo',
        },
      }),
    ])

    console.log('Clientes criados:', clients)

    // 6. Criar agendamentos
    const today = new Date()
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const appointments = await Promise.all([
      prisma.appointment.create({
        data: {
          barbershopId: newBarbershop.id,
          clientId: clients[0].id,
          barberId: barber1.id,
          serviceId: services[0].id, // Corte Masculino
          startTime: new Date(tomorrow.setHours(9, 0, 0, 0)),
          endTime: new Date(tomorrow.setHours(9, 30, 0, 0)),
          status: 'CONFIRMED',
          totalAmount: 35.00,
          notes: 'Cliente preferencial',
          createdBy: adminUser.id,
        },
      }),
      prisma.appointment.create({
        data: {
          barbershopId: newBarbershop.id,
          clientId: clients[1].id,
          barberId: barber2.id,
          serviceId: services[2].id, // Corte + Barba
          startTime: new Date(tomorrow.setHours(10, 0, 0, 0)),
          endTime: new Date(tomorrow.setHours(10, 45, 0, 0)),
          status: 'PENDING',
          totalAmount: 50.00,
          notes: 'Primeira vez',
          createdBy: adminUser.id,
        },
      }),
    ])

    console.log('Agendamentos criados:', appointments)

    // 7. Criar pagamentos
    const payments = await Promise.all([
      prisma.payment.create({
        data: {
          barbershopId: newBarbershop.id,
          appointmentId: appointments[0].id,
          amount: 35.00,
          method: 'CASH',
          status: 'PAID',
          paidAt: new Date(),
        },
      }),
      prisma.payment.create({
        data: {
          barbershopId: newBarbershop.id,
          appointmentId: appointments[1].id,
          amount: 50.00,
          method: 'CREDIT_CARD',
          status: 'PENDING',
        },
      }),
    ])

    console.log('Pagamentos criados:', payments)

    // === QUERIES DE CONSULTA ===

    // 8. Buscar todos os agendamentos de hoje
    const todayAppointments = await prisma.appointment.findMany({
      where: {
        barbershopId: newBarbershop.id,
        startTime: {
          gte: new Date(new Date().setHours(0, 0, 0, 0)),
          lt: new Date(new Date().setHours(23, 59, 59, 999)),
        },
      },
      include: {
        client: true,
        barber: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        service: true,
        payments: true,
      },
      orderBy: {
        startTime: 'asc',
      },
    })

    console.log('Agendamentos de hoje:', todayAppointments)

    // 9. Buscar agenda de um barbeiro específico
    const barberSchedule = await prisma.appointment.findMany({
      where: {
        barberId: barber1.id,
        barbershopId: newBarbershop.id,
        startTime: {
          gte: new Date(new Date().setHours(0, 0, 0, 0)),
        },
      },
      include: {
        client: true,
        service: true,
      },
      orderBy: {
        startTime: 'asc',
      },
    })

    console.log('Agenda do barbeiro:', barberSchedule)

    // 10. Buscar histórico de um cliente
    const clientHistory = await prisma.appointment.findMany({
      where: {
        clientId: clients[0].id,
        barbershopId: newBarbershop.id,
      },
      include: {
        barber: {
          select: {
            name: true,
          },
        },
        service: true,
        payments: true,
      },
      orderBy: {
        startTime: 'desc',
      },
    })

    console.log('Histórico do cliente:', clientHistory)

    // 11. Calcular faturamento do dia
    const todayRevenue = await prisma.payment.aggregate({
      where: {
        barbershopId: newBarbershop.id,
        status: 'PAID',
        paidAt: {
          gte: new Date(new Date().setHours(0, 0, 0, 0)),
          lt: new Date(new Date().setHours(23, 59, 59, 999)),
        },
      },
      _sum: {
        amount: true,
      },
      _count: {
        id: true,
      },
    })

    console.log('Faturamento do dia:', todayRevenue)

    // 12. Buscar serviços mais populares
    const popularServices = await prisma.appointment.groupBy({
      by: ['serviceId'],
      where: {
        barbershopId: newBarbershop.id,
        status: 'COMPLETED',
      },
      _count: {
        serviceId: true,
      },
      orderBy: {
        _count: {
          serviceId: 'desc',
        },
      },
      take: 5,
    })

    // Buscar detalhes dos serviços mais populares
    const serviceDetails = await prisma.service.findMany({
      where: {
        id: {
          in: popularServices.map(s => s.serviceId),
        },
        barbershopId: newBarbershop.id,
      },
    })

    console.log('Serviços populares:', { popularServices, serviceDetails })

    // 13. Buscar clientes fiéis (mais agendamentos)
    const loyalClients = await prisma.appointment.groupBy({
      by: ['clientId'],
      where: {
        barbershopId: newBarbershop.id,
        status: 'COMPLETED',
      },
      _count: {
        clientId: true,
      },
      orderBy: {
        _count: {
          clientId: 'desc',
        },
      },
      take: 10,
    })

    // Buscar detalhes dos clientes fiéis
    const loyalClientsDetails = await prisma.client.findMany({
      where: {
        id: {
          in: loyalClients.map(c => c.clientId),
        },
        barbershopId: newBarbershop.id,
      },
    })

    console.log('Clientes fiéis:', { loyalClients, loyalClientsDetails })

    // 14. Verificar disponibilidade de horário
    const checkAvailability = async (barberId: string, startTime: Date, duration: number) => {
      const endTime = new Date(startTime.getTime() + duration * 60000)
      
      const conflictingAppointments = await prisma.appointment.findMany({
        where: {
          barberId,
          barbershopId: newBarbershop.id,
          status: {
            in: ['PENDING', 'CONFIRMED'],
          },
          OR: [
            {
              startTime: {
                lt: endTime,
                gte: startTime,
              },
            },
            {
              endTime: {
                gt: startTime,
                lte: endTime,
              },
            },
            {
              startTime: {
                lte: startTime,
              },
              endTime: {
                gte: endTime,
              },
            },
          ],
        },
      })

      return conflictingAppointments.length === 0
    }

    const isAvailable = await checkAvailability(
      barber1.id,
      new Date(tomorrow.setHours(11, 0, 0, 0)),
      30 // 30 minutos
    )

    console.log('Horário disponível:', isAvailable)

    // 15. Relatório mensal
    const monthlyReport = await prisma.payment.aggregate({
      where: {
        barbershopId: newBarbershop.id,
        status: 'PAID',
        paidAt: {
          gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
          lt: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1),
        },
      },
      _sum: {
        amount: true,
      },
      _count: {
        id: true,
      },
    })

    console.log('Relatório mensal:', monthlyReport)

    return {
      barbershop: newBarbershop,
      users: { adminUser, barber1, barber2 },
      services,
      clients,
      appointments,
      payments,
      reports: {
        todayAppointments,
        todayRevenue,
        popularServices,
        loyalClients,
        monthlyReport,
      },
    }
  } catch (error) {
    console.error('Erro nos exemplos de queries:', error)
    throw error
  }
}

// Query específica para dashboard
export async function getDashboardStats(barbershopId: string) {
  const today = new Date()
  const startOfDay = new Date(today.setHours(0, 0, 0, 0))
  const endOfDay = new Date(today.setHours(23, 59, 59, 999))

  const [
    todayAppointments,
    todayRevenue,
    totalClients,
    nextAppointment,
  ] = await Promise.all([
    // Agendamentos de hoje
    prisma.appointment.count({
      where: {
        barbershopId,
        startTime: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
    }),
    
    // Faturamento de hoje
    prisma.payment.aggregate({
      where: {
        barbershopId,
        status: 'PAID',
        paidAt: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      _sum: {
        amount: true,
      },
    }),
    
    // Total de clientes
    prisma.client.count({
      where: {
        barbershopId,
      },
    }),
    
    // Próximo agendamento
    prisma.appointment.findFirst({
      where: {
        barbershopId,
        status: {
          in: ['PENDING', 'CONFIRMED'],
        },
        startTime: {
          gte: new Date(),
        },
      },
      include: {
        client: true,
        service: true,
      },
      orderBy: {
        startTime: 'asc',
      },
    }),
  ])

  return {
    todayAppointments,
    todayRevenue: todayRevenue._sum.amount || 0,
    totalClients,
    nextAppointment,
  }
}

// Query para verificar conflitos de agendamento
export async function checkAppointmentConflict(
  barbershopId: string,
  barberId: string,
  startTime: Date,
  endTime: Date,
  excludeAppointmentId?: string
) {
  const conflictingAppointments = await prisma.appointment.findMany({
    where: {
      barbershopId,
      barberId,
      status: {
        in: ['PENDING', 'CONFIRMED'],
      },
      ...(excludeAppointmentId && {
        id: {
          not: excludeAppointmentId,
        },
      }),
      OR: [
        {
          startTime: {
            lt: endTime,
            gte: startTime,
          },
        },
        {
          endTime: {
            gt: startTime,
            lte: endTime,
          },
        },
        {
          startTime: {
            lte: startTime,
          },
          endTime: {
            gte: endTime,
          },
        },
      ],
    },
  })

  return conflictingAppointments
}
