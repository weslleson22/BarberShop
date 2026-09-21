import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthUser } from '@/lib/api-auth'
import { notifyClientStatusChange, notifyAdminsLastMinuteCancellation } from '@/lib/notifications'

// Dispara as notificações de mudança de status — nunca deixa uma falha aqui
// derrubar a resposta da API, por isso é sempre chamado dentro de try/catch.
async function handleStatusChangeNotifications(appointment: any, previousStatus: string) {
  if (appointment.status === previousStatus) return

  try {
    await notifyClientStatusChange(appointment, appointment.status)
    if (appointment.status === 'CANCELLED') {
      await notifyAdminsLastMinuteCancellation(appointment)
    }
  } catch (error) {
    console.error('Erro ao criar notificação de mudança de status:', error)
  }
}

export const dynamic = 'force-dynamic'
export const revalidate = 0

// Carrega o agendamento e valida que quem está chamando tem permissão sobre
// ele: mesmo tenant sempre, e para BARBER/CLIENT também precisa ser "dono"
// do agendamento (o próprio barbeiro ou o próprio cliente).
async function loadAuthorizedAppointment(id: string, user: NonNullable<ReturnType<typeof getAuthUser>>) {
  const appointment = await prisma.appointment.findUnique({
    where: { id },
    include: { client: true },
  })

  if (!appointment) {
    return { appointment: null, allowed: false }
  }

  // Se for DEVELOPER, tem permissão global
  if (user.role === 'DEVELOPER') {
    return { appointment, allowed: true }
  }

  // Usuários comuns devem obrigatoriamente pertencer à mesma barbearia do agendamento
  if (!user.barbershopId || appointment.barbershopId !== user.barbershopId) {
    return { appointment: null, allowed: false }
  }

  if (user.role === 'ADMIN' || user.role === 'RECEPTIONIST') {
    return { appointment, allowed: true }
  }

  if (user.role === 'BARBER') {
    return { appointment, allowed: appointment.barberId === user.id }
  }

  // CLIENT: próprio agendamento (userId, createdBy, ou email coincidente)
  const isClientOwner =
    appointment.client?.userId === user.id ||
    appointment.createdBy === user.id ||
    (user.email && appointment.client?.email?.trim().toLowerCase() === user.email.trim().toLowerCase())

  return { appointment, allowed: !!isClientOwner }
}

// GET - Obter agendamento específico
export async function GET(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params
  try {
    const user = getAuthUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { appointment, allowed } = await loadAuthorizedAppointment(params.id, user)
    if (!appointment || !allowed) {
      return NextResponse.json({ error: 'Agendamento não encontrado' }, { status: 404 })
    }

    const full = await prisma.appointment.findUnique({
      where: { id: params.id },
      include: {
        client: true,
        barber: { select: { id: true, name: true, email: true, avatar: true, phone: true, bio: true } },
        service: true,
      },
    })

    return NextResponse.json(full)
  } catch (error) {
    console.error('Get appointment error:', error)
    return NextResponse.json({ error: 'Erro ao buscar agendamento' }, { status: 500 })
  }
}

// PUT - Atualizar agendamento
export async function PUT(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params
  try {
    const user = getAuthUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { appointment: existingAppointment, allowed } = await loadAuthorizedAppointment(params.id, user)
    if (!existingAppointment || !allowed) {
      return NextResponse.json({ error: 'Agendamento não encontrado' }, { status: 404 })
    }

    const body = await request.json()
    const { serviceId, barberId, startTime, endTime, totalAmount, notes, status, isVip } = body
    // clientId nunca vem do corpo: mantém o dono original do agendamento
    // (evita que alguém "transfira" um agendamento pra outro cliente)
    const clientId = existingAppointment.clientId

    if (!serviceId || !barberId || !startTime || !endTime) {
      return NextResponse.json(
        { error: 'Campos obrigatórios não preenchidos' },
        { status: 400 }
      )
    }

    const startDateTime = typeof startTime === 'string' ? new Date(startTime) : startTime
    const endDateTime = typeof endTime === 'string' ? new Date(endTime) : endTime

    const service = await prisma.service.findFirst({
      where: { id: serviceId, barbershopId: existingAppointment.barbershopId },
    })

    if (!service) {
      return NextResponse.json({ error: 'Serviço não encontrado nesta barbearia' }, { status: 404 })
    }

    const conflictingAppointment = await prisma.appointment.findFirst({
      where: {
        barbershopId: existingAppointment.barbershopId,
        barberId,
        startTime: { lt: endDateTime },
        endTime: { gt: startDateTime },
        status: { not: 'CANCELLED' },
        id: { not: params.id },
      },
    })

    if (conflictingAppointment) {
      return NextResponse.json(
        { error: 'Horário não disponível. Conflito com outro agendamento.' },
        { status: 409 }
      )
    }

    const updatedAppointment = await prisma.appointment.update({
      where: { id: params.id },
      data: {
        clientId,
        serviceId,
        barberId,
        startTime: startDateTime,
        endTime: endDateTime,
        totalAmount: totalAmount || service.price,
        notes: notes || '',
        status: status || existingAppointment.status,
        isVip: isVip !== undefined ? Boolean(isVip) : existingAppointment.isVip,
      },
      include: {
        client: true,
        barber: { select: { id: true, name: true, email: true, avatar: true, phone: true, bio: true } },
        service: true,
      },
    })

    await handleStatusChangeNotifications(updatedAppointment, existingAppointment.status)

    return NextResponse.json(updatedAppointment)
  } catch (error) {
    console.error('Update appointment error:', error)
    return NextResponse.json({ error: 'Erro ao atualizar agendamento' }, { status: 500 })
  }
}

// DELETE - Cancelar agendamento
export async function DELETE(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params
  try {
    const user = getAuthUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { appointment: existingAppointment, allowed } = await loadAuthorizedAppointment(params.id, user)
    if (!existingAppointment || !allowed) {
      return NextResponse.json({ error: 'Agendamento não encontrado' }, { status: 404 })
    }

    const cancelledAppointment = await prisma.appointment.update({
      where: { id: params.id },
      data: { status: 'CANCELLED' },
      include: {
        client: true,
        barber: { select: { id: true, name: true, email: true, avatar: true, phone: true, bio: true } },
        service: true,
      },
    })

    await handleStatusChangeNotifications(cancelledAppointment, existingAppointment.status)

    return NextResponse.json({
      message: 'Agendamento cancelado com sucesso',
      appointment: cancelledAppointment,
    })
  } catch (error) {
    console.error('Cancel appointment error:', error)
    return NextResponse.json({ error: 'Erro ao cancelar agendamento' }, { status: 500 })
  }
}

// PATCH - Atualizar status do agendamento
export async function PATCH(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params
  try {
    const user = getAuthUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { appointment: existingAppointment, allowed } = await loadAuthorizedAppointment(params.id, user)
    if (!existingAppointment || !allowed) {
      return NextResponse.json({ error: 'Agendamento não encontrado' }, { status: 404 })
    }

    const body = await request.json()
    const { status } = body

    if (!status) {
      return NextResponse.json({ error: 'Status não fornecido' }, { status: 400 })
    }

    // Cliente só pode cancelar o próprio agendamento por aqui, não marcar
    // como confirmado/concluído (isso é operação da equipe da barbearia)
    if (user.role === 'CLIENT' && status !== 'CANCELLED') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
    }

    const updatedAppointment = await prisma.appointment.update({
      where: { id: params.id },
      data: { status },
      include: {
        client: true,
        barber: { select: { id: true, name: true, email: true, avatar: true, phone: true, bio: true } },
        service: true,
      },
    })

    await handleStatusChangeNotifications(updatedAppointment, existingAppointment.status)

    return NextResponse.json(updatedAppointment)
  } catch (error) {
    console.error('Update appointment status error:', error)
    return NextResponse.json({ error: 'Erro ao atualizar status do agendamento' }, { status: 500 })
  }
}
