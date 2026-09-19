import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { criarAgendamento } from '@/lib/appointment-scheduler'
import { getAuthUser } from '@/lib/api-auth'

export const dynamic = 'force-dynamic'
export const revalidate = 0

// GET - Disponibilidade de horários para o fluxo de agendamento sem login.
// Esta rota é pública de propósito (o visitante ainda não tem conta), então
// só pode devolver o mínimo necessário para calcular conflitos de horário —
// nunca nome/telefone/e-mail de clientes ou outros dados sensíveis. Também
// não deve ser usada por telas autenticadas (essas usam /api/appointments,
// que já filtra pela barbearia do usuário logado).
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    let barbershopId = searchParams.get('barbershopId')
    const barberId = searchParams.get('barberId')

    if (!barbershopId) {
      const authUser = getAuthUser(request)
      if (authUser?.barbershopId) {
        barbershopId = authUser.barbershopId
      }
    }

    if (!barbershopId) {
      const activeShop = await prisma.barbershop.findFirst({
        where: { isActive: true },
        select: { id: true },
      })
      barbershopId = activeShop?.id || null
    }

    if (!barbershopId) {
      return NextResponse.json([])
    }

    const where: any = {
      barbershopId,
      status: { not: 'CANCELLED' },
    }
    if (barberId) {
      where.barberId = barberId
    }

    const appointments = await prisma.appointment.findMany({
      where,
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
    const { clientId, barberId, serviceId, startTime, notes, barbershopId: bodyShopId } = data

    let barbershopId = bodyShopId || null
    if (!barbershopId) {
      const authUser = getAuthUser(request)
      if (authUser?.barbershopId) {
        barbershopId = authUser.barbershopId
      }
    }

    if (!barbershopId && serviceId) {
      const svc = await prisma.service.findUnique({
        where: { id: serviceId },
        select: { barbershopId: true },
      })
      if (svc?.barbershopId) {
        barbershopId = svc.barbershopId
      }
    }

    if (!barbershopId) {
      const barbershop = await prisma.barbershop.findFirst({
        where: { isActive: true },
        select: { id: true }
      })
      barbershopId = barbershop?.id || null
    }

    if (!barbershopId) {
      return NextResponse.json(
        { error: 'Nenhuma barbearia ativa disponível' },
        { status: 400 }
      )
    }

    // Serviço e barbeiro precisam pertencer a essa mesma barbearia — não
    // confiar que o serviceId/barberId enviados já são consistentes entre si
    const service = await prisma.service.findFirst({
      where: { id: serviceId, barbershopId },
      select: { id: true },
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

    const startTimeDate = new Date(startTime)

    if (isNaN(startTimeDate.getTime())) {
      return NextResponse.json(
        { error: 'Data/hora inválida' },
        { status: 400 }
      )
    }

    // Delega criação (valida horário de funcionamento 08:00-20:00, conflito
    // de agenda e dispara as notificações) para a mesma função usada pelo
    // fluxo autenticado — evita duas implementações divergentes da mesma regra.
    const authUser = getAuthUser(request)
    const appointment = await criarAgendamento({
      barbershopId,
      clientId,
      barberId,
      serviceId,
      startTime: startTimeDate,
      notes: notes || '',
      createdBy: authUser?.id,
    })

    return NextResponse.json(appointment, { status: 201 })
  } catch (error) {
    console.error('Create appointment error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao criar agendamento' },
      { status: 400 }
    )
  }
}
