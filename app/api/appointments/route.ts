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

    // CLIENT só pode ver seus próprios agendamentos
    if (decoded.role === 'CLIENT') {
      where.clientId = decoded.id
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

    const appointment = await criarAgendamento({
      ...data,
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
