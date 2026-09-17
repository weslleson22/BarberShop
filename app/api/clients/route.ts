import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthUser, requireRole } from '@/lib/api-auth'
import { notifyAdminsNewClient } from '@/lib/notifications'

export const dynamic = 'force-dynamic'
export const revalidate = 0

// GET - Listar clientes (equipe da barbearia; ADMIN/BARBER/RECEPTIONIST)
export async function GET(request: NextRequest) {
  try {
    const decoded = getAuthUser(request)
    if (!requireRole(decoded, ['ADMIN', 'BARBER', 'RECEPTIONIST'])) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')

    let barbershopId = decoded.barbershopId
    if (!barbershopId && decoded.id) {
      const dbUser = await prisma.user.findUnique({
        where: { id: decoded.id },
        select: { barbershopId: true }
      })
      barbershopId = dbUser?.barbershopId
    }

    // Se o usuário é ADMIN ou RECEPTIONIST, sincronizar com a barbearia ativa
    if (decoded.role === 'ADMIN' || decoded.role === 'RECEPTIONIST') {
      const latestAppt = await prisma.appointment.findFirst({
        select: { barbershopId: true },
        orderBy: { createdAt: 'desc' }
      })
      if (latestAppt?.barbershopId && latestAppt.barbershopId !== barbershopId) {
        barbershopId = latestAppt.barbershopId
        try {
          await prisma.user.update({
            where: { id: decoded.id },
            data: { barbershopId }
          })
        } catch {}
      }
    }

    // Se o usuário é BARBER, sincronizar com a barbearia onde os agendamentos do barbeiro estão
    if (decoded.role === 'BARBER') {
      const barberAppt = await prisma.appointment.findFirst({
        where: { barberId: decoded.id },
        select: { barbershopId: true },
        orderBy: { createdAt: 'desc' }
      })
      if (barberAppt?.barbershopId && barberAppt.barbershopId !== barbershopId) {
        barbershopId = barberAppt.barbershopId
        try {
          await prisma.user.update({
            where: { id: decoded.id },
            data: { barbershopId }
          })
        } catch {}
      }
    }

    if (!barbershopId) {
      const firstShop = await prisma.barbershop.findFirst({ select: { id: true } })
      barbershopId = firstShop?.id
    }

    if (!barbershopId) {
      return NextResponse.json({ error: 'Barbearia não identificada' }, { status: 400 })
    }

    const where: any = {
      barbershopId,
    }

    // Barbeiro só vê os clientes que já têm/tiveram agendamento com ele —
    // não a base de clientes inteira da barbearia.
    if (decoded.role === 'BARBER') {
      where.appointments = { some: { barberId: decoded.id } }
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
      ]
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
            appointments: true,
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    })

    return NextResponse.json(clients)
  } catch (error) {
    console.error('Get clients error:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar clientes' },
      { status: 500 }
    )
  }
}

// POST - Criar cliente (ADMIN/RECEPTIONIST; BARBER só visualiza)
export async function POST(request: NextRequest) {
  try {
    const decoded = getAuthUser(request)
    if (!requireRole(decoded, ['ADMIN', 'RECEPTIONIST']) || !decoded.barbershopId) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { name, email, phone, notes } = await request.json()

    if (!name || !phone) {
      return NextResponse.json(
        { error: 'Nome e telefone são obrigatórios' },
        { status: 400 }
      )
    }

    const client = await prisma.client.create({
      data: {
        name,
        email,
        phone,
        notes,
        barbershopId: decoded.barbershopId,
      },
    })

    try {
      await notifyAdminsNewClient(client.name, decoded.barbershopId, decoded.id)
    } catch (notificationError) {
      console.error('Erro ao notificar admins sobre novo cliente:', notificationError)
    }

    return NextResponse.json(client, { status: 201 })
  } catch (error) {
    console.error('Create client error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao criar cliente' },
      { status: 500 }
    )
  }
}

// DELETE - Excluir cliente (ADMIN/RECEPTIONIST; BARBER só visualiza)
export async function DELETE(request: NextRequest) {
  try {
    const decoded = getAuthUser(request)
    if (!requireRole(decoded, ['ADMIN', 'RECEPTIONIST']) || !decoded.barbershopId) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const clientId = searchParams.get('id')

    if (!clientId) {
      return NextResponse.json({ error: 'ID do cliente não fornecido' }, { status: 400 })
    }

    // Verificar se o cliente pertence à barbearia do usuário
    const client = await prisma.client.findFirst({
      where: {
        id: clientId,
        barbershopId: decoded.barbershopId,
      },
    })

    if (!client) {
      return NextResponse.json({ error: 'Cliente não encontrado' }, { status: 404 })
    }

    // Excluir o cliente
    await prisma.client.delete({
      where: { id: clientId },
    })

    return NextResponse.json({ message: 'Cliente excluído com sucesso' })
  } catch (error) {
    console.error('Delete client error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao excluir cliente' },
      { status: 500 }
    )
  }
}
