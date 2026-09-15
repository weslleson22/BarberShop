import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET - Disponibilidade de horários para o fluxo de agendamento sem login.
// Esta rota é pública de propósito (o visitante ainda não tem conta), então
// só pode devolver o mínimo necessário para calcular conflitos de horário —
// nunca nome/telefone/e-mail de clientes ou outros dados sensíveis. Também
// não deve ser usada por telas autenticadas (essas usam /api/appointments,
// que já filtra pela barbearia do usuário logado).
export async function GET(request: NextRequest) {
  try {
    const appointments = await prisma.appointment.findMany({
      where: {
        status: { not: 'CANCELLED' },
      },
      select: {
        id: true,
        barberId: true,
        status: true,
        startTime: true,
        service: {
          select: { duration: true },
        },
      },
      orderBy: {
        startTime: 'asc',
      },
    })

    return NextResponse.json(appointments)
  } catch (error) {
    console.error('Get appointments error:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar agendamentos' },
      { status: 500 }
    )
  }
}

// POST - Criar agendamento público (sem autenticação)
export async function POST(request: NextRequest) {
  try {
    const data = await request.json()
    const { clientId, barberId, serviceId, startTime, notes } = data

    // Buscar a primeira barbearia disponível (o fluxo público ainda não tem
    // seleção de barbearia por tenant)
    const barbershop = await prisma.barbershop.findFirst({ select: { id: true } })
    if (!barbershop) {
      return NextResponse.json(
        { error: 'Nenhuma barbearia disponível' },
        { status: 400 }
      )
    }
    const barbershopId = barbershop.id

    // Serviço e barbeiro precisam pertencer a essa mesma barbearia — não
    // confiar que o serviceId/barberId enviados já são consistentes entre si
    const service = await prisma.service.findFirst({
      where: { id: serviceId, barbershopId },
      select: { duration: true, price: true }
    })

    if (!service) {
      return NextResponse.json(
        { error: 'Serviço não encontrado' },
        { status: 404 }
      )
    }

    const barber = await prisma.user.findFirst({
      where: { id: barberId, barbershopId, role: 'BARBER', isActive: true },
      select: { id: true },
    })

    if (!barber) {
      return NextResponse.json(
        { error: 'Barbeiro não encontrado' },
        { status: 404 }
      )
    }

    // Converter startTime para Date
    const startTimeDate = new Date(startTime)

    if (isNaN(startTimeDate.getTime())) {
      return NextResponse.json(
        { error: 'Data/hora inválida' },
        { status: 400 }
      )
    }

    // Não permitir agendar em horário que já passou
    if (startTimeDate <= new Date()) {
      return NextResponse.json(
        { error: 'Não é possível agendar em um horário que já passou' },
        { status: 400 }
      )
    }

    const endTime = new Date(startTimeDate.getTime() + service.duration * 60 * 1000)

    // Verificar se o barbeiro já possui agendamento que sobreponha esse horário
    const conflictingAppointment = await prisma.appointment.findFirst({
      where: {
        barberId,
        status: { not: 'CANCELLED' },
        startTime: { lt: endTime },
        endTime: { gt: startTimeDate },
      },
      select: { id: true },
    })

    if (conflictingAppointment) {
      return NextResponse.json(
        { error: 'Esse horário já foi reservado para este barbeiro. Escolha outro horário.' },
        { status: 409 }
      )
    }

    // Criar o agendamento
    const appointment = await prisma.appointment.create({
      data: {
        clientId,
        barberId,
        serviceId,
        startTime: startTimeDate,
        endTime,
        status: 'PENDING',
        notes: notes || '',
        barbershopId,
        totalAmount: service.price,
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
      },
    })

    console.log('Agendamento criado com sucesso:', appointment)
    return NextResponse.json(appointment, { status: 201 })
  } catch (error) {
    console.error('Create appointment error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao criar agendamento' },
      { status: 500 }
    )
  }
}
