import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { criarAgendamento, getHorariosDisponiveis } from '@/lib/appointment-scheduler'

// GET - Listar agendamentos
export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value
    if (!token) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const decoded = verifyToken(token)
    const { searchParams } = new URL(request.url)
    
    const date = searchParams.get('date')
    const barberId = searchParams.get('barberId')
    const status = searchParams.get('status')

    const where: any = {
      barbershopId: decoded.barbershopId,
    }

    // CLIENT só pode ver seus próprios agendamentos. Appointment.clientId
    // referencia Client.id, não User.id — é preciso resolver o Client
    // vinculado a este usuário antes de filtrar (antes disso a comparação
    // era contra o id errado e sempre voltava vazio).
    if (decoded.role === 'CLIENT') {
      const client = await prisma.client.findUnique({ where: { userId: decoded.id } })
      if (!client) {
        return NextResponse.json([])
      }
      where.clientId = client.id
    }

    if (date) {
      const startDate = new Date(date)
      startDate.setHours(0, 0, 0, 0)
      const endDate = new Date(date)
      endDate.setHours(23, 59, 59, 999)
      
      where.startTime = {
        gte: startDate,
        lte: endDate,
      }
    }

    if (barberId) {
      where.barberId = barberId
    }

    if (status) {
      where.status = status
    }

    const appointments = await prisma.appointment.findMany({
      where,
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

    return NextResponse.json(appointments)
  } catch (error) {
    console.error('Get appointments error:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar agendamentos' },
      { status: 500 }
    )
  }
}

// POST - Criar agendamento
export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value
    if (!token) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const decoded = verifyToken(token)
    const data = await request.json()

    // Nunca confiar no clientId enviado pelo corpo da requisição quando quem
    // está criando o agendamento é o próprio cliente — força o vínculo com o
    // Client já associado à conta autenticada (impede um cliente agendar em
    // nome de outro cliente alterando o clientId na requisição).
    let clientId = data.clientId
    if (decoded.role === 'CLIENT') {
      const client = await prisma.client.findUnique({ where: { userId: decoded.id } })
      if (!client) {
        return NextResponse.json(
          { error: 'Nenhum cadastro de cliente vinculado a esta conta' },
          { status: 400 }
        )
      }
      clientId = client.id
    }

    const appointment = await criarAgendamento({
      ...data,
      clientId,
      barbershopId: decoded.barbershopId,
      createdBy: decoded.id,
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
