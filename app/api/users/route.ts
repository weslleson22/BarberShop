import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hashPassword } from '@/lib/auth'
import { ensureClientForUser } from '@/lib/client-sync'
import { getAuthUser, requireRole } from '@/lib/api-auth'

export const dynamic = 'force-dynamic'
export const revalidate = 0

// GET - Listar usuários da própria barbearia
export async function GET(request: NextRequest) {
  try {
    const user = getAuthUser(request)
    if (!requireRole(user, ['DEVELOPER', 'ADMIN', 'BARBER', 'RECEPTIONIST'])) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const role = searchParams.get('role')
    const requestedShopId = searchParams.get('barbershopId')

    let barbershopId: string | null = null
    if (user.role === 'DEVELOPER') {
      if (requestedShopId && requestedShopId !== 'all' && requestedShopId.trim() !== '') {
        barbershopId = requestedShopId
      } else {
        barbershopId = null
      }
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
    if (role && role !== 'all') {
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
        barbershop: {
          select: {
            id: true,
            name: true,
          },
        },
        isActive: true,
        createdAt: true,
        avatar: true,
        phone: true,
        bio: true,
        specialties: true,
      },
      orderBy: {
        name: 'asc',
      },
    })

    return NextResponse.json(users, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      },
    })
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
    if (!requireRole(admin, ['DEVELOPER', 'ADMIN'])) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const data = await request.json()
    const { name, email, password, role, isActive, avatar, phone, bio, specialties, barbershopId: bodyShopId } = data

    if (!name || !email || !role || !password) {
      return NextResponse.json(
        { error: 'Nome, email, papel e senha são obrigatórios' },
        { status: 400 }
      )
    }

    // Apenas DEVELOPER pode criar outro DEVELOPER
    if (role === 'DEVELOPER' && admin.role !== 'DEVELOPER') {
      return NextResponse.json(
        { error: 'Apenas desenvolvedores podem criar usuários com papel DEVELOPER' },
        { status: 403 }
      )
    }

    let targetBarbershopId: string | null = null
    if (role === 'DEVELOPER') {
      targetBarbershopId = null
    } else if (admin.role === 'DEVELOPER') {
      targetBarbershopId = bodyShopId || null
    } else {
      targetBarbershopId = admin.barbershopId || null
    }

    // Usuários com papel diferente de DEVELOPER precisam estar vinculados a uma barbearia
    if (role !== 'DEVELOPER' && !targetBarbershopId) {
      return NextResponse.json({ error: 'Barbearia obrigatória para este papel' }, { status: 400 })
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
        barbershopId: targetBarbershopId,
        avatar,
        phone,
        bio: bio || null,
        specialties: Array.isArray(specialties) ? specialties : [],
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
        bio: true,
        specialties: true,
      }
    })

    // Se o novo usuário é um cliente, garantir que ele apareça na Lista de Clientes
    if (user.role === 'CLIENT' && user.barbershopId) {
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
