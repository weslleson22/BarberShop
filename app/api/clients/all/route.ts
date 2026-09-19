import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthUser, requireRole } from '@/lib/api-auth'

export const dynamic = 'force-dynamic'
export const revalidate = 0

// GET - Listar todos os clientes da barbearia do usuário autenticado,
// enriquecidos com o último atendimento
export async function GET(request: NextRequest) {
  try {
    const user = getAuthUser(request)
    if (!requireRole(user, ['DEVELOPER', 'ADMIN', 'BARBER', 'RECEPTIONIST'])) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const requestedShopId = searchParams.get('barbershopId')

    let barbershopId: string | null = null
    if (user.role === 'DEVELOPER') {
      barbershopId = requestedShopId || user.barbershopId || null
    } else {
      barbershopId = user.barbershopId || null
      if (!barbershopId) {
        return NextResponse.json({ error: 'Usuário não vinculado a uma barbearia' }, { status: 403 })
      }
    }

    const where: any = {}
    if (barbershopId) {
      where.barbershopId = barbershopId
    }

    // Barbeiro só vê os clientes que já têm/tiveram agendamento com ele —
    // não a base de clientes inteira da barbearia.
    if (user.role === 'BARBER') {
      where.appointments = { some: { barberId: user.id } }
    }

    const clients = await prisma.client.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        notes: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        barbershopId: true,
        userId: true,
        _count: {
          select: {
            appointments: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    // Enrich client data with last appointment info (more efficient)
    const enrichedClients = await Promise.all(
      clients.map(async (client) => {
        const lastAppointment = await prisma.appointment.findFirst({
          where: {
            clientId: client.id
          },
          orderBy: {
            startTime: 'desc'
          },
          take: 1,
          select: {
            startTime: true,
            totalAmount: true,
            service: {
              select: {
                name: true,
                price: true
              }
            }
          }
        })

        return {
          ...client,
          lastAppointment: lastAppointment ? {
            service: lastAppointment.service.name,
            startTime: lastAppointment.startTime,
            totalAmount: Number(lastAppointment.totalAmount || lastAppointment.service.price)
          } : undefined
        }
      })
    )

    return NextResponse.json(enrichedClients)
  } catch (error) {
    console.error('Get all clients error:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar clientes' },
      { status: 500 }
    )
  }
}
