import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hashPassword } from '@/lib/auth'
import { ensureClientForUser } from '@/lib/client-sync'
import { getAuthUser, requireRole } from '@/lib/api-auth'

export const dynamic = 'force-dynamic'
export const revalidate = 0

// GET - Listar usuários da própria barbearia
// ADMIN e BARBER podem listar (ex.: escolher o profissional ao criar um
// agendamento); criar/editar/excluir usuário continua restrito ao ADMIN.
export async function GET(request: NextRequest) {
  try {
    const user = getAuthUser(request)
    if (!requireRole(user, ['ADMIN', 'BARBER', 'RECEPTIONIST'])) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const role = searchParams.get('role')

    let barbershopId = user.barbershopId
    if (!barbershopId && user.id) {
      const dbUser = await prisma.user.findUnique({
        where: { id: user.id },
        select: { barbershopId: true }
      })
      barbershopId = dbUser?.barbershopId
    }

    if (!barbershopId) {
      const firstShop = await prisma.barbershop.findFirst({ select: { id: true } })
      barbershopId = firstShop?.id
    }

    const where: any = barbershopId ? { barbershopId } : {}
    if (role) {
      where.role = role
    }

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        barbershopId: true,
        isActive: true,
        createdAt: true,
        avatar: true,
        phone: true,
      },
      orderBy: {
        name: 'asc',
      },
    })

    return NextResponse.json(users)
  } catch (error) {
    console.error('Get users error:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar usuários' },
      { status: 500 }
    )
  }
}

// POST - Criar usuário na barbearia do administrador autenticado
export async function POST(request: NextRequest) {
  try {
    const admin = getAuthUser(request)
    if (!requireRole(admin, ['ADMIN']) || !admin.barbershopId) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const data = await request.json()
    const { name, email, password, role, isActive, avatar, phone } = data

    if (!name || !email || !role || !password) {
      return NextResponse.json(
        { error: 'Nome, email, papel e senha são obrigatórios' },
        { status: 400 }
      )
    }

    const existingUser = await prisma.user.findFirst({
      where: { email },
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'Já existe um usuário com este email' },
        { status: 400 }
      )
    }

    const hashedPassword = await hashPassword(password)

    const user = await prisma.user.create({
      data: {
        name,
        email,
        role,
        password: hashedPassword,
        isActive: isActive !== undefined ? isActive : true,
        barbershopId: admin.barbershopId,
        avatar,
        phone,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
        barbershopId: true,
        avatar: true,
        phone: true,
      }
    })

    // Se o novo usuário é um cliente, garantir que ele apareça na Lista de Clientes
    if (user.role === 'CLIENT') {
      try {
        await ensureClientForUser({
          userId: user.id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          barbershopId: user.barbershopId,
        })
      } catch (syncError) {
        console.error('Erro ao vincular Client ao usuário criado:', syncError)
      }
    }

    return NextResponse.json(user, { status: 201 })
  } catch (error) {
    console.error('Create user error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao criar usuário' },
      { status: 500 }
    )
  }
}
