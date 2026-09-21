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
        status: true,
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

// PATCH - Ativar/Desativar, aprovar/rejeitar ou editar barbearia (exclusivo DEVELOPER)
export async function PATCH(request: NextRequest) {
  try {
    const user = getAuthUser(request)
    if (!requireRole(user, ['DEVELOPER'])) {
      return NextResponse.json({ error: 'Acesso restrito ao desenvolvedor da plataforma' }, { status: 403 })
    }

    const body = await request.json()
    const {
      id,
      status,
      isActive,
      name,
      email,
      phone,
      address,
      contractExpiresAt,
      adminName,
      adminEmail,
      adminPhone,
    } = body

    if (!id) {
      return NextResponse.json({ error: 'ID da barbearia é obrigatório' }, { status: 400 })
    }

    const barbershop = await prisma.barbershop.findUnique({
      where: { id },
      include: {
        users: {
          where: { role: 'ADMIN' },
          take: 1,
        },
      },
    })

    if (!barbershop) {
      return NextResponse.json({ error: 'Barbearia não encontrada' }, { status: 404 })
    }

    const updateData: any = {}

    // Tratamento de Status (Aprovação / Rejeição)
    if (status) {
      updateData.status = status
      if (status === 'APPROVED') {
        updateData.isActive = true
        // Ativar o administrador da barbearia
        if (typeof (prisma.user as any)?.updateMany === 'function') {
          await prisma.user.updateMany({
            where: { barbershopId: id, role: 'ADMIN' },
            data: { isActive: true },
          })
        }
      } else if (status === 'REJECTED') {
        updateData.isActive = false
        // Desativar o administrador da barbearia
        if (typeof (prisma.user as any)?.updateMany === 'function') {
          await prisma.user.updateMany({
            where: { barbershopId: id, role: 'ADMIN' },
            data: { isActive: false },
          })
        }
      }
    }

    // Ativação / Desativação manual direta
    if (typeof isActive === 'boolean') {
      updateData.isActive = isActive
      // Se desativar ou ativar a barbearia, sincroniza com o admin principal
      if (typeof (prisma.user as any)?.updateMany === 'function') {
        await prisma.user.updateMany({
          where: { barbershopId: id, role: 'ADMIN' },
          data: { isActive },
        })
      }
    }

    // Complementação / Edição de dados do estabelecimento
    if (name) updateData.name = name.trim()
    if (email) updateData.email = email.trim()
    if (phone !== undefined) updateData.phone = phone ? phone.trim() : null
    if (address !== undefined) updateData.address = address ? address.trim() : null
    if (contractExpiresAt !== undefined) {
      updateData.contractExpiresAt = contractExpiresAt ? new Date(contractExpiresAt) : null
    }

    // Se o desenvolvedor editar dados do administrador responsável
    if (adminName || adminEmail || adminPhone !== undefined) {
      const adminUser = barbershop.users?.[0]
      if (adminUser && typeof (prisma.user as any)?.update === 'function') {
        const adminUpdateData: any = {}
        if (adminName) adminUpdateData.name = adminName.trim()
        if (adminEmail) adminUpdateData.email = adminEmail.trim()
        if (adminPhone !== undefined) adminUpdateData.phone = adminPhone ? adminPhone.trim() : null
        await prisma.user.update({
          where: { id: adminUser.id },
          data: adminUpdateData,
        })
      }
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
      status: 'APPROVED',
      isActive: true,
      contractExpiresAt: contractExpiresAt ? new Date(contractExpiresAt) : null,
      createdById: user.id,
      adminUser: {
        name: adminName,
        email: adminEmail,
        password: adminPassword,
        phone: adminPhone || phone,
        isActive: true,
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
