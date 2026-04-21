import { PrismaClient } from '@prisma/client'
import { hashPassword } from '../lib/auth'

const prisma = new PrismaClient()

async function main() {
  console.log('Iniciando seed do banco de dados...')

  // Limpar dados existentes
  await prisma.payment.deleteMany()
  await prisma.appointment.deleteMany()
  await prisma.service.deleteMany()
  await prisma.client.deleteMany()
  await prisma.user.deleteMany()
  await prisma.barbershop.deleteMany()

  // 1. Criar barbearia
  const barbershop = await prisma.barbershop.create({
    data: {
      name: 'Barbearia Central',
      email: 'contato@barberiacentral.com',
      phone: '(11) 99999-9999',
      address: 'Rua Principal, 123 - São Paulo, SP',
      description: 'A melhor barbearia da região com profissionais experientes',
    },
  })

  console.log('✅ Barbearia criada:', barbershop.name)

  // 2. Criar usuários
  const adminPassword = await hashPassword('admin123')
  const barberPassword = await hashPassword('barber123')

  const adminUser = await prisma.user.create({
    data: {
      name: 'João Administrador',
      email: 'admin@barberiacentral.com',
      password: adminPassword,
      role: 'ADMIN',
      barbershopId: barbershop.id,
    },
  })

  const barber1 = await prisma.user.create({
    data: {
      name: 'Carlos Barbeiro',
      email: 'carlos@barberiacentral.com',
      password: barberPassword,
      role: 'BARBER',
      barbershopId: barbershop.id,
    },
  })

  const barber2 = await prisma.user.create({
    data: {
      name: 'Pedro Barbeiro',
      email: 'pedro@barberiacentral.com',
      password: barberPassword,
      role: 'BARBER',
      barbershopId: barbershop.id,
    },
  })

  console.log('✅ Usuários criados')

  // 3. Criar serviços
  const services = await Promise.all([
    prisma.service.create({
      data: {
        name: 'Corte Masculino',
        description: 'Corte tradicional com máquina e tesoura',
        price: 35.00,
        duration: 30,
        barbershopId: barbershop.id,
      },
    }),
    prisma.service.create({
      data: {
        name: 'Barba',
        description: 'Aparação e modelagem de barba',
        price: 25.00,
        duration: 20,
        barbershopId: barbershop.id,
      },
    }),
    prisma.service.create({
      data: {
        name: 'Corte + Barba',
        description: 'Pacote completo com corte e barba',
        price: 50.00,
        duration: 45,
        barbershopId: barbershop.id,
      },
    }),
    prisma.service.create({
      data: {
        name: 'Tratamento Capilar',
        description: 'Hidratação profunda e tratamento',
        price: 40.00,
        duration: 40,
        barbershopId: barbershop.id,
      },
    }),
    prisma.service.create({
      data: {
        name: 'Pigmentação de Barba',
        description: 'Coloração e pigmentação de barba',
        price: 30.00,
        duration: 25,
        barbershopId: barbershop.id,
      },
    }),
  ])

  console.log('✅ Serviços criados')

  // 4. Criar clientes
  const clients = await Promise.all([
    prisma.client.create({
      data: {
        name: 'Maria Santos',
        email: 'maria.santos@email.com',
        phone: '(11) 55555-5555',
        barbershopId: barbershop.id,
        notes: 'Cliente preferencial, sempre vem aos sábados',
      },
    }),
    prisma.client.create({
      data: {
        name: 'João Oliveira',
        email: 'joao.oliveira@email.com',
        phone: '(11) 44444-4444',
        barbershopId: barbershop.id,
        notes: 'Prefere corte curto',
      },
    }),
    prisma.client.create({
      data: {
        name: 'Pedro Costa',
        phone: '(11) 33333-3333',
        barbershopId: barbershop.id,
        notes: 'Cliente novo',
      },
    }),
    prisma.client.create({
      data: {
        name: 'Ana Silva',
        email: 'ana.silva@email.com',
        phone: '(11) 22222-2222',
        barbershopId: barbershop.id,
        notes: 'Alérgica a produtos químicos',
      },
    }),
    prisma.client.create({
      data: {
        name: 'Carlos Mendes',
        phone: '(11) 11111-1111',
        barbershopId: barbershop.id,
        notes: 'Sempre paga com cartão',
      },
    }),
  ])

  console.log('✅ Clientes criados')

  // 5. Criar agendamentos para hoje e próximos dias
  const today = new Date()
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
  const dayAfterTomorrow = new Date(today)
  dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2)

  const appointments = await Promise.all([
    // Hoje
    prisma.appointment.create({
      data: {
        barbershopId: barbershop.id,
        clientId: clients[0].id,
        barberId: barber1.id,
        serviceId: services[0].id, // Corte Masculino
        startTime: new Date(today.setHours(9, 0, 0, 0)),
        endTime: new Date(today.setHours(9, 30, 0, 0)),
        status: 'CONFIRMED',
        totalAmount: 35.00,
        notes: 'Cliente preferencial',
        createdBy: adminUser.id,
      },
    }),
    prisma.appointment.create({
      data: {
        barbershopId: barbershop.id,
        clientId: clients[1].id,
        barberId: barber2.id,
        serviceId: services[2].id, // Corte + Barba
        startTime: new Date(today.setHours(10, 0, 0, 0)),
        endTime: new Date(today.setHours(10, 45, 0, 0)),
        status: 'PENDING',
        totalAmount: 50.00,
        notes: 'Primeira vez',
        createdBy: adminUser.id,
      },
    }),
    prisma.appointment.create({
      data: {
        barbershopId: barbershop.id,
        clientId: clients[2].id,
        barberId: barber1.id,
        serviceId: services[1].id, // Barba
        startTime: new Date(today.setHours(11, 0, 0, 0)),
        endTime: new Date(today.setHours(11, 20, 0, 0)),
        status: 'COMPLETED',
        totalAmount: 25.00,
        notes: 'Cliente fiel',
        createdBy: adminUser.id,
      },
    }),
    // Amanhã
    prisma.appointment.create({
      data: {
        barbershopId: barbershop.id,
        clientId: clients[3].id,
        barberId: barber2.id,
        serviceId: services[3].id, // Tratamento Capilar
        startTime: new Date(tomorrow.setHours(14, 0, 0, 0)),
        endTime: new Date(tomorrow.setHours(14, 40, 0, 0)),
        status: 'CONFIRMED',
        totalAmount: 40.00,
        notes: 'Alérgica a produtos químicos',
        createdBy: adminUser.id,
      },
    }),
    prisma.appointment.create({
      data: {
        barbershopId: barbershop.id,
        clientId: clients[4].id,
        barberId: barber1.id,
        serviceId: services[4].id, // Pigmentação de Barba
        startTime: new Date(tomorrow.setHours(15, 0, 0, 0)),
        endTime: new Date(tomorrow.setHours(15, 25, 0, 0)),
        status: 'PENDING',
        totalAmount: 30.00,
        notes: 'Sempre paga com cartão',
        createdBy: adminUser.id,
      },
    }),
    // Depois de amanhã
    prisma.appointment.create({
      data: {
        barbershopId: barbershop.id,
        clientId: clients[0].id,
        barberId: barber2.id,
        serviceId: services[2].id, // Corte + Barba
        startTime: new Date(dayAfterTomorrow.setHours(10, 0, 0, 0)),
        endTime: new Date(dayAfterTomorrow.setHours(10, 45, 0, 0)),
        status: 'CONFIRMED',
        totalAmount: 50.00,
        notes: 'Agendamento recorrente',
        createdBy: adminUser.id,
      },
    }),
  ])

  console.log('✅ Agendamentos criados')

  // 6. Criar pagamentos
  const payments = await Promise.all([
    prisma.payment.create({
      data: {
        barbershopId: barbershop.id,
        appointmentId: appointments[2].id, // Agendamento concluído
        amount: 25.00,
        method: 'CASH',
        status: 'PAID',
        paidAt: new Date(today.setHours(11, 30, 0, 0)),
      },
    }),
    prisma.payment.create({
      data: {
        barbershopId: barbershop.id,
        appointmentId: appointments[0].id, // Agendamento confirmado
        amount: 35.00,
        method: 'CREDIT_CARD',
        status: 'PAID',
        paidAt: new Date(today.setHours(9, 30, 0, 0)),
      },
    }),
    prisma.payment.create({
      data: {
        barbershopId: barbershop.id,
        appointmentId: appointments[1].id, // Agendamento pendente
        amount: 50.00,
        method: 'PIX',
        status: 'PENDING',
      },
    }),
  ])

  console.log('✅ Pagamentos criados')

  // Resumo dos dados criados
  console.log('\n🎉 Seed concluído com sucesso!')
  console.log('\n📊 Resumo dos dados criados:')
  console.log(`🏪 Barbearia: ${barbershop.name}`)
  console.log(`👥 Usuários: 3 (1 Admin, 2 Barbeiros)`)
  console.log(`✂️ Serviços: ${services.length}`)
  console.log(`👤 Clientes: ${clients.length}`)
  console.log(`📅 Agendamentos: ${appointments.length}`)
  console.log(`💰 Pagamentos: ${payments.length}`)

  console.log('\n🔐 Credenciais para teste:')
  console.log('Admin: admin@barberiacentral.com / admin123')
  console.log('Barbeiro 1: carlos@barberiacentral.com / barber123')
  console.log('Barbeiro 2: pedro@barberiacentral.com / barber123')

  console.log('\n🌐 Acesse: http://localhost:3000')
}

main()
  .catch((e) => {
    console.error('❌ Erro no seed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
