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
    if (!requireRole(decoded, ['DEVELOPER', 'ADMIN', 'BARBER', 'RECEPTIONIST'])) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')
    const requestedShopId = searchParams.get('barbershopId')

    let barbershopId: string | null = null
    if (decoded.role === 'DEVELOPER') {
      barbershopId = requestedShopId || decoded.barbershopId || null
    } else {
      barbershopId = decoded.barbershopId || null
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
    if (!requireRole(decoded, ['DEVELOPER', 'ADMIN', 'RECEPTIONIST'])) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { name, email, phone, notes, barbershopId: bodyShopId } = await request.json()

    if (!name || !phone) {
      return NextResponse.json(
        { error: 'Nome e telefone são obrigatórios' },
        { status: 400 }
      )
    }

    let targetBarbershopId: string | null = null
    if (decoded.role === 'DEVELOPER') {
      targetBarbershopId = bodyShopId || decoded.barbershopId || null
    } else {
      targetBarbershopId = decoded.barbershopId || null
    }

    if (!targetBarbershopId) {
      return NextResponse.json({ error: 'Barbearia obrigatória' }, { status: 400 })
    }

    const client = await prisma.client.create({
      data: {
        name,
        email,
        phone,
        notes,
        barbershopId: targetBarbershopId,
      },
    })

    try {
      await notifyAdminsNewClient(client.name, targetBarbershopId, decoded.id)
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

// DELETE - Excluir cliente (ADMIN/RECEPTIONIST/DEVELOPER)
export async function DELETE(request: NextRequest) {
  try {
    const decoded = getAuthUser(request)
    if (!requireRole(decoded, ['DEVELOPER', 'ADMIN', 'RECEPTIONIST'])) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const clientId = searchParams.get('id')

    if (!clientId) {
      return NextResponse.json({ error: 'ID do cliente não fornecido' }, { status: 400 })
    }

    // Verificar se o cliente pertence à barbearia do usuário (DEVELOPER pode excluir qualquer um)
    const clientWhere: any = { id: clientId }
    if (decoded.role !== 'DEVELOPER') {
      if (!decoded.barbershopId) {
        return NextResponse.json({ error: 'Usuário não vinculado a uma barbearia' }, { status: 403 })
      }
      clientWhere.barbershopId = decoded.barbershopId
    }

    const client = await prisma.client.findFirst({
      where: clientWhere,
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
