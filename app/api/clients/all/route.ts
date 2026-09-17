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
    if (!requireRole(user, ['ADMIN', 'BARBER', 'RECEPTIONIST'])) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    let barbershopId = user.barbershopId
    if (!barbershopId && user.id) {
      const dbUser = await prisma.user.findUnique({
        where: { id: user.id },
        select: { barbershopId: true }
      })
      barbershopId = dbUser?.barbershopId
    }

    // Se o usuário é ADMIN ou RECEPTIONIST, sincronizar com a barbearia ativa
    if (user.role === 'ADMIN' || user.role === 'RECEPTIONIST') {
      const latestAppt = await prisma.appointment.findFirst({
        select: { barbershopId: true },
        orderBy: { createdAt: 'desc' }
      })
      if (latestAppt?.barbershopId && latestAppt.barbershopId !== barbershopId) {
        barbershopId = latestAppt.barbershopId
        try {
          await prisma.user.update({
            where: { id: user.id },
            data: { barbershopId }
          })
        } catch {}
      }
    }

    // Se o usuário é BARBER, sincronizar com a barbearia onde os agendamentos do barbeiro estão
    if (user.role === 'BARBER') {
      const barberAppt = await prisma.appointment.findFirst({
        where: { barberId: user.id },
        select: { barbershopId: true },
        orderBy: { createdAt: 'desc' }
      })
      if (barberAppt?.barbershopId && barberAppt.barbershopId !== barbershopId) {
        barbershopId = barberAppt.barbershopId
        try {
          await prisma.user.update({
            where: { id: user.id },
            data: { barbershopId }
          })
        } catch {}
      }
    }

    if (!barbershopId) {
      const firstShop = await prisma.barbershop.findFirst({ select: { id: true } })
      barbershopId = firstShop?.id
    }

    const where: any = barbershopId ? { barbershopId } : {}

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
