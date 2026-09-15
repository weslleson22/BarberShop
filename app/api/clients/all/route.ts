import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthUser, requireRole } from '@/lib/api-auth'

// GET - Listar todos os clientes da barbearia do usuário autenticado,
// enriquecidos com o último atendimento
export async function GET(request: NextRequest) {
  try {
    const user = getAuthUser(request)
    if (!requireRole(user, ['ADMIN', 'BARBER', 'RECEPTIONIST'])) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const clients = await prisma.client.findMany({
      where: {
        barbershopId: user.barbershopId,
      },
      include: {
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
          include: {
            service: true
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
