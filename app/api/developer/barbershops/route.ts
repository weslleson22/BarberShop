import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthUser, requireRole } from '@/lib/api-auth'

export const dynamic = 'force-dynamic'
export const revalidate = 0

// GET - Listar todas as barbearias cadastradas na plataforma (exclusivo DEVELOPER)
export async function GET(request: NextRequest) {
  try {
    const user = getAuthUser(request)
    if (!requireRole(user, ['DEVELOPER'])) {
      return NextResponse.json({ error: 'Acesso restrito ao desenvolvedor da plataforma' }, { status: 403 })
    }

    const barbershops = await prisma.barbershop.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        address: true,
        logo: true,
        description: true,
        isActive: true,
        contractExpiresAt: true,
        createdAt: true,
        updatedAt: true,
        createdById: true,
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        users: {
          where: { role: 'ADMIN' },
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            role: true,
            isActive: true,
            createdAt: true,
          },
          take: 1,
        },
        _count: {
          select: {
            users: true,
            clients: true,
            services: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    return NextResponse.json(barbershops)
  } catch (error) {
    console.error('Developer barbershops GET error:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar barbearias' },
      { status: 500 }
    )
  }
}

// PATCH - Ativar/Desativar ou editar barbearia (exclusivo DEVELOPER)
export async function PATCH(request: NextRequest) {
  try {
    const user = getAuthUser(request)
    if (!requireRole(user, ['DEVELOPER'])) {
      return NextResponse.json({ error: 'Acesso restrito ao desenvolvedor da plataforma' }, { status: 403 })
    }

    const body = await request.json()
    const { id, isActive, name, email, phone, address, contractExpiresAt } = body

    if (!id) {
      return NextResponse.json({ error: 'ID da barbearia é obrigatório' }, { status: 400 })
    }

    const barbershop = await prisma.barbershop.findUnique({
      where: { id },
    })

    if (!barbershop) {
      return NextResponse.json({ error: 'Barbearia não encontrada' }, { status: 404 })
    }

    const updateData: any = {}
    if (typeof isActive === 'boolean') updateData.isActive = isActive
    if (name) updateData.name = name
    if (email) updateData.email = email
    if (phone !== undefined) updateData.phone = phone
    if (address !== undefined) updateData.address = address
    if (contractExpiresAt !== undefined) {
      updateData.contractExpiresAt = contractExpiresAt ? new Date(contractExpiresAt) : null
    }

    const updated = await prisma.barbershop.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Developer barbershops PATCH error:', error)
    return NextResponse.json(
      { error: 'Erro ao atualizar barbearia' },
      { status: 500 }
    )
  }
}

// POST - Cadastrar nova barbearia na plataforma (exclusivo DEVELOPER)
export async function POST(request: NextRequest) {
  try {
    const user = getAuthUser(request)
    if (!requireRole(user, ['DEVELOPER'])) {
      return NextResponse.json({ error: 'Acesso restrito ao desenvolvedor da plataforma' }, { status: 403 })
    }

    const body = await request.json()
    const { name, email, phone, address, adminName, adminEmail, adminPassword, adminPhone, contractExpiresAt } = body

    if (!name || !email || !adminName || !adminEmail || !adminPassword) {
      return NextResponse.json(
        { error: 'Nome e email da barbearia, e nome, email e senha do administrador são obrigatórios' },
        { status: 400 }
      )
    }

    const { createBarbershop } = await import('@/lib/auth')
    const result = await createBarbershop({
      name,
      email,
      phone,
      address,
      contractExpiresAt: contractExpiresAt ? new Date(contractExpiresAt) : null,
      createdById: user.id,
      adminUser: {
        name: adminName,
        email: adminEmail,
        password: adminPassword,
        phone: adminPhone || phone,
      },
    })

    return NextResponse.json(result, { status: 201 })
  } catch (error: any) {
    console.error('Developer create barbershop error:', error)
    return NextResponse.json(
      { error: error?.message || 'Erro ao criar barbearia' },
      { status: 400 }
    )
  }
}

