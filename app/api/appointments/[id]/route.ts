import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET - Obter agendamento específico
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const appointment = await prisma.appointment.findUnique({
      where: {
        id: params.id,
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

    if (!appointment) {
      return NextResponse.json(
        { error: 'Agendamento não encontrado' },
        { status: 404 }
      )
    }

    return NextResponse.json(appointment)
  } catch (error) {
    console.error('Get appointment error:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar agendamento' },
      { status: 500 }
    )
  }
}

// PUT - Atualizar agendamento
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const {
      clientId,
      serviceId,
      barberId,
      startTime,
      endTime,
      totalAmount,
      notes,
      status
    } = body

    // Verificar se o agendamento existe
    const existingAppointment = await prisma.appointment.findUnique({
      where: { id: params.id }
    })

    if (!existingAppointment) {
      return NextResponse.json(
        { error: 'Agendamento não encontrado' },
        { status: 404 }
      )
    }

    // Validar campos obrigatórios
    if (!clientId || !serviceId || !barberId || !startTime || !endTime) {
      return NextResponse.json(
        { error: 'Campos obrigatórios não preenchidos' },
        { status: 400 }
      )
    }

    // Converter datas se forem strings
    const startDateTime = typeof startTime === 'string' ? new Date(startTime) : startTime
    const endDateTime = typeof endTime === 'string' ? new Date(endTime) : endTime

    // Verificar se o serviço existe
    const service = await prisma.service.findUnique({
      where: { id: serviceId }
    })

    if (!service) {
      return NextResponse.json(
        { error: 'Serviço não encontrado' },
        { status: 404 }
      )
    }

    // Verificar disponibilidade do horário (excluindo este agendamento)
    const conflictingAppointment = await prisma.appointment.findFirst({
      where: {
        barberId,
        startTime: {
          lt: endDateTime
        },
        endTime: {
          gt: startDateTime
        },
        status: {
          not: 'CANCELLED'
        },
        id: {
          not: params.id // Excluir o agendamento atual da verificação
        }
      }
    })

    if (conflictingAppointment) {
      return NextResponse.json(
        { error: 'Horário não disponível. Conflito com outro agendamento.' },
        { status: 409 }
      )
    }

    // Atualizar o agendamento
    const updatedAppointment = await prisma.appointment.update({
      where: {
        id: params.id,
      },
      data: {
        clientId,
        serviceId,
        barberId,
        startTime: startDateTime,
        endTime: endDateTime,
        totalAmount: totalAmount || service.price,
        notes: notes || '',
        status: status || existingAppointment.status,
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

    console.log('Agendamento atualizado:', updatedAppointment)
    return NextResponse.json(updatedAppointment)
  } catch (error) {
    console.error('Update appointment error:', error)
    return NextResponse.json(
      { error: 'Erro ao atualizar agendamento' },
      { status: 500 }
    )
  }
}

// DELETE - Excluir/Cancelar agendamento
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verificar se o agendamento existe
    const existingAppointment = await prisma.appointment.findUnique({
      where: { id: params.id }
    })

    if (!existingAppointment) {
      return NextResponse.json(
        { error: 'Agendamento não encontrado' },
        { status: 404 }
      )
    }

    // Marcar como cancelado em vez de excluir
    const cancelledAppointment = await prisma.appointment.update({
      where: {
        id: params.id,
      },
      data: {
        status: 'CANCELLED',
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

    console.log('Agendamento cancelado:', cancelledAppointment)
    return NextResponse.json({
      message: 'Agendamento cancelado com sucesso',
      appointment: cancelledAppointment
    })
  } catch (error) {
    console.error('Cancel appointment error:', error)
    return NextResponse.json(
      { error: 'Erro ao cancelar agendamento' },
      { status: 500 }
    )
  }
}

// PATCH - Atualizar status do agendamento
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const { status } = body

    if (!status) {
      return NextResponse.json(
        { error: 'Status não fornecido' },
        { status: 400 }
      )
    }

    // Verificar se o agendamento existe
    const existingAppointment = await prisma.appointment.findUnique({
      where: { id: params.id }
    })

    if (!existingAppointment) {
      return NextResponse.json(
        { error: 'Agendamento não encontrado' },
        { status: 404 }
      )
    }

    // Atualizar apenas o status
    const updatedAppointment = await prisma.appointment.update({
      where: {
        id: params.id,
      },
      data: {
        status,
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

    console.log('Status do agendamento atualizado:', updatedAppointment)
    return NextResponse.json(updatedAppointment)
  } catch (error) {
    console.error('Update appointment status error:', error)
    return NextResponse.json(
      { error: 'Erro ao atualizar status do agendamento' },
      { status: 500 }
    )
  }
}
