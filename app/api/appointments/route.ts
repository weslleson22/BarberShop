import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { criarAgendamento, getHorariosDisponiveis } from '@/lib/appointment-scheduler'

import { getAuthUser } from '@/lib/api-auth'

// GET - Listar agendamentos
export async function GET(request: NextRequest) {
  try {
    const decoded = getAuthUser(request)
    if (!decoded) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }
    const { searchParams } = new URL(request.url)
    
    const date = searchParams.get('date')
    const startDateParam = searchParams.get('startDate')
    const endDateParam = searchParams.get('endDate')
    const barberId = searchParams.get('barberId')
    const status = searchParams.get('status')
    const search = searchParams.get('search')

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

    if (startDateParam && endDateParam) {
      const gteDate = new Date(new Date(startDateParam).getTime() - 4 * 60 * 60 * 1000)
      const lteDate = new Date(new Date(endDateParam).getTime() + 4 * 60 * 60 * 1000)
      where.startTime = {
        gte: gteDate,
        lte: lteDate,
      }
    } else if (date) {
      // Cria o intervalo de início e fim do dia considerando possíveis diferenças de fuso
      // (buffer de UTC-4 a UTC+2 para garantir que agendamentos noturnos ou matutinos
      // não sejam omitidos pelo timezone do servidor).
      const [year, month, day] = date.split('-').map(Number)
      if (year && month && day) {
        // Início: 00:00:00 do dia em UTC menos 4 horas de margem
        const startDayUtc = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0))
        const endDayUtc = new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999))
        
        // Abrange início com 4 horas antes (UTC-4) e fim com 4 horas depois (UTC+4)
        const gteDate = new Date(startDayUtc.getTime() - 4 * 60 * 60 * 1000)
        const lteDate = new Date(endDayUtc.getTime() + 4 * 60 * 60 * 1000)

        where.startTime = {
          gte: gteDate,
          lte: lteDate,
        }
      }
    }

    // BARBER só enxerga a própria agenda — nunca confiar num barberId vindo
    // da query string para essa role, senão um barbeiro poderia consultar a
    // agenda de outro só trocando o parâmetro.
    if (decoded.role === 'BARBER') {
      where.barberId = decoded.id
    } else if (barberId && barberId !== 'all') {
      where.barberId = barberId
    }

    if (status && status !== 'all') {
      if (status === 'PENDING_OR_CONFIRMED') {
        where.status = { in: ['PENDING', 'CONFIRMED'] }
      } else {
        where.status = status
      }
    }

    if (search && search.trim()) {
      const term = search.trim()
      where.OR = [
        { client: { name: { contains: term, mode: 'insensitive' } } },
        { client: { phone: { contains: term, mode: 'insensitive' } } },
        { barber: { name: { contains: term, mode: 'insensitive' } } },
        { service: { name: { contains: term, mode: 'insensitive' } } },
        { notes: { contains: term, mode: 'insensitive' } },
      ]
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
            avatar: true,
            phone: true,
            bio: true,
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
    const decoded = getAuthUser(request)
    if (!decoded) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }
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
