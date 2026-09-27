import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hashPassword } from '@/lib/auth'
import { ensureClientForUser } from '@/lib/client-sync'
import { getAuthUser, requireRole } from '@/lib/api-auth'
import { createAuditLog, extractRequestContext } from '@/lib/audit-log'
import { AuditAction, AuditEntity } from '@prisma/client'

export const dynamic = 'force-dynamic'
export const revalidate = 0

// GET - Listar usuários (da própria barbearia para administradores ou global para DEVELOPER)
export async function GET(request: NextRequest) {
  try {
    const user = getAuthUser(request)
    if (!requireRole(user, ['DEVELOPER', 'ADMIN', 'BARBER', 'RECEPTIONIST'])) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const roleParam = searchParams.get('role')
    const requestedShopId = searchParams.get('barbershopId')

    let barbershopId: string | null = null
    if (user.role === 'DEVELOPER') {
      if (requestedShopId && requestedShopId !== 'all' && requestedShopId.trim() !== '') {
        barbershopId = requestedShopId.trim()
      } else {
        barbershopId = null // DEVELOPER sem filtro específico lista todos os usuários da plataforma
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

    // Valida enum de UserRole para evitar exceções do Prisma
    const VALID_ROLES = ['DEVELOPER', 'ADMIN', 'BARBER', 'RECEPTIONIST', 'CLIENT']
    if (roleParam && roleParam !== 'all' && VALID_ROLES.includes(roleParam)) {
      where.role = roleParam
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
            slug: true,
          },
        },
        isActive: true,
        createdAt: true,
        avatar: true,
        phone: true,
        bio: true,
        specialties: true,
      },
      orderBy: [
        { name: 'asc' },
        { createdAt: 'desc' },
      ],
    })

    // Sanitização para garantir serialização JSON uniforme sem dados corrompidos
    const serializedUsers = users.map((u) => ({
      id: u.id,
      name: u.name || 'Sem Nome',
      email: u.email,
      role: u.role,
      barbershopId: u.barbershopId,
      barbershop: u.barbershop
        ? {
            id: u.barbershop.id,
            name: u.barbershop.name,
            slug: u.barbershop.slug,
          }
        : null,
      isActive: Boolean(u.isActive),
      createdAt: u.createdAt ? u.createdAt.toISOString() : new Date().toISOString(),
      avatar: u.avatar || null,
      phone: u.phone || null,
      bio: u.bio || null,
      specialties: Array.isArray(u.specialties) ? u.specialties : [],
    }))

    return NextResponse.json(serializedUsers, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      },
    })
  } catch (error) {
    const errorDetails = error instanceof Error ? error.message : String(error)
    console.error('[API /api/users GET] Erro ao buscar usuários no banco de dados:', error)
    return NextResponse.json(
      {
        error: 'Erro ao buscar usuários',
        details: errorDetails,
      },
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

    const ctx = extractRequestContext(request)
    await createAuditLog({
      userId: admin.id,
      barbershopId: user.barbershopId,
      action: AuditAction.CREATE,
      entity: AuditEntity.USER,
      entityId: user.id,
      metadata: {
        name: user.name,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
      },
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    })

    return NextResponse.json(user, { status: 201 })
  } catch (error) {
    console.error('Create user error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao criar usuário' },
      { status: 500 }
    )
  }
}
