import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET - Listar todos os agendamentos (público para agenda)
export async function GET(request: NextRequest) {
  try {
    console.log('=== LISTANDO AGENDAMENTOS DO PRISMA (API PÚBLICA) ===')
    
    // Buscar todos os agendamentos com dados relacionados
    const appointments = await prisma.appointment.findMany({
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
      orderBy: {
        startTime: 'asc',
      },
    })

    console.log('Total de agendamentos encontrados:', appointments.length)
    console.log('Agendamentos:', appointments.map(apt => ({
      id: apt.id,
      client: apt.client?.name,
      barber: apt.barber?.name,
      service: apt.service?.name,
      startTime: apt.startTime,
      status: apt.status
    })))

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

    console.log('Dados recebidos:', { clientId, barberId, serviceId, startTime, notes })

    // Buscar a primeira barbearia disponível
    let barbershopId = 'cmo6dajse0000tlnihesqqda8' // fallback
    
    try {
      const barbershop = await prisma.barbershop.findFirst({
        select: { id: true }
      })
      if (barbershop) {
        barbershopId = barbershop.id
        console.log('Usando barbearia encontrada:', barbershopId)
      }
    } catch (error) {
      console.log('Usando barbearia fallback:', barbershopId)
    }

    // Buscar dados do serviço para obter duração e preço reais
    const service = await prisma.service.findUnique({
      where: { id: serviceId },
      select: { duration: true, price: true }
    })

    if (!service) {
      return NextResponse.json(
        { error: 'Serviço não encontrado' },
        { status: 404 }
      )
    }

    console.log('Serviço encontrado:', { duration: service.duration, price: service.price })

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
