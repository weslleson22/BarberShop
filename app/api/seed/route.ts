import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hashPassword } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    console.log('=== INICIANDO SEED DO BANCO DE DADOS ===')
    
    // Limpar dados existentes (opcional - comentar se quiser preservar)
    console.log('Limpando dados existentes...')
    await prisma.appointment.deleteMany()
    await prisma.service.deleteMany()
    await prisma.client.deleteMany()
    await prisma.user.deleteMany()
    await prisma.barbershop.deleteMany()
    
    // Criar barbearia
    console.log('Criando barbearia...')
    const barbershop = await prisma.barbershop.create({
      data: {
        name: 'Barbearia Central',
        phone: '(11) 99999-8888',
        address: 'Rua das Barbas, 123 - São Paulo, SP',
        email: 'contato@barberiacentral.com',
      }
    })
    console.log('Barbearia criada:', barbershop.id)
    
    // Criar usuários
    console.log('Criando usuários...')
    
    // Admin
    const adminPassword = await hashPassword('admin123')
    const admin = await prisma.user.create({
      data: {
        name: 'Administrador',
        email: 'admin@barberiacentral.com',
        password: adminPassword,
        role: 'ADMIN',
        barbershopId: barbershop.id,
      }
    })
    console.log('Admin criado:', admin.email)
    
    // Barbeiro
    const barberPassword = await hashPassword('barber123')
    const barber = await prisma.user.create({
      data: {
        name: 'João Barbeiro',
        email: 'joao@barberiacentral.com',
        password: barberPassword,
        role: 'BARBER',
        barbershopId: barbershop.id,
      }
    })
    console.log('Barbeiro criado:', barber.email)
    
    // Cliente
    const clientPassword = await hashPassword('client123')
    const client = await prisma.user.create({
      data: {
        name: 'Cliente Teste',
        email: 'cliente@barberiacentral.com',
        password: clientPassword,
        role: 'CLIENT',
        barbershopId: barbershop.id,
      }
    })
    console.log('Cliente criado:', client.email)
    
    // Criar clientes (separado dos usuários)
    console.log('Criando clientes...')
    const client1 = await prisma.client.create({
      data: {
        name: 'Carlos Silva',
        phone: '(11) 44444-4444',
        email: 'carlos@email.com',
        barbershopId: barbershop.id,
      }
    })
    
    const client2 = await prisma.client.create({
      data: {
        name: 'Maria Santos',
        phone: '(11) 55555-5555',
        email: 'maria@email.com',
        barbershopId: barbershop.id,
      }
    })
    
    const client3 = await prisma.client.create({
      data: {
        name: 'José Oliveira',
        phone: '(11) 66666-6666',
        email: 'jose@email.com',
        barbershopId: barbershop.id,
      }
    })
    console.log('Clientes criados:', 3)
    
    // Criar serviços
    console.log('Criando serviços...')
    const services = await prisma.service.createMany({
      data: [
        {
          name: 'Corte Masculino Simples',
          description: 'Corte de cabelo tradicional',
          price: 30.00,
          duration: 30,
          isActive: true,
          barbershopId: barbershop.id,
        },
        {
          name: 'Corte Masculino Completo',
          description: 'Corte + lavagem + finalização',
          price: 50.00,
          duration: 45,
          isActive: true,
          barbershopId: barbershop.id,
        },
        {
          name: 'Barba',
          description: 'Aparar e modelar barba',
          price: 25.00,
          duration: 20,
          isActive: true,
          barbershopId: barbershop.id,
        },
        {
          name: 'Corte + Barba',
          description: 'Pacote completo de cabelo e barba',
          price: 70.00,
          duration: 60,
          isActive: true,
          barbershopId: barbershop.id,
        },
        {
          name: 'Progressiva',
          description: 'Alisamento progressivo masculino',
          price: 80.00,
          duration: 90,
          isActive: true,
          barbershopId: barbershop.id,
        },
      ]
    })
    console.log('Serviços criados:', services.count)
    
    // Criar agendamentos de exemplo
    console.log('Criando agendamentos...')
    const createdServices = await prisma.service.findMany({
      where: { barbershopId: barbershop.id }
    })
    
    const today = new Date()
    const appointments = [
      {
        clientId: client1.id,
        barberId: barber.id,
        serviceId: createdServices[0].id,
        startTime: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 9, 0),
        endTime: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 9, 30),
        status: 'PENDING' as const,
        totalAmount: createdServices[0].price,
        notes: 'Cliente preferencial',
        barbershopId: barbershop.id,
      },
      {
        clientId: client2.id,
        barberId: barber.id,
        serviceId: createdServices[1].id,
        startTime: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 10, 0),
        endTime: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 10, 45),
        status: 'PENDING' as const,
        totalAmount: createdServices[1].price,
        notes: 'Cliente recorrente',
        barbershopId: barbershop.id,
      },
      {
        clientId: client3.id,
        barberId: barber.id,
        serviceId: createdServices[2].id,
        startTime: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 11, 0),
        endTime: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 11, 20),
        status: 'COMPLETED' as const,
        totalAmount: createdServices[2].price,
        notes: 'Atendido ontem',
        barbershopId: barbershop.id,
      },
    ]
    
    await prisma.appointment.createMany({
      data: appointments
    })
    console.log('Agendamentos criados:', appointments.length)
    
    console.log('=== SEED CONCLUÍDO COM SUCESSO ===')
    
    return NextResponse.json({
      message: 'Dados de exemplo criados com sucesso!',
      data: {
        barbershop: barbershop.name,
        users: {
          admin: { email: admin.email, password: 'admin123' },
          barber: { email: barber.email, password: 'barber123' },
          client: { email: client.email, password: 'client123' }
        },
        clients: 3,
        services: 5,
        appointments: 3
      }
    })
    
  } catch (error) {
    console.error('Erro no seed:', error)
    return NextResponse.json(
      { error: 'Erro ao criar dados de exemplo' },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}

// Método GET para verificar dados existentes
export async function GET() {
  try {
    const stats = await prisma.$transaction([
      prisma.barbershop.count(),
      prisma.user.count(),
      prisma.client.count(),
      prisma.service.count(),
      prisma.appointment.count(),
    ])
    
    const [barbershops, users, clients, services, appointments] = stats
    
    return NextResponse.json({
      message: 'Estatísticas atuais do banco',
      data: {
        barbershops,
        users,
        clients,
        services,
        appointments
      }
    })
    
  } catch (error) {
    console.error('Erro ao verificar dados:', error)
    return NextResponse.json(
      { error: 'Erro ao verificar dados' },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}
