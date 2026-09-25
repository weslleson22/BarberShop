import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthUser, requireRole } from '@/lib/api-auth'

const EMAIL_PATTERN = /^[a-z0-9._%+\-]+@[a-z0-9.-]+\.[a-z]{2,}$/

export const dynamic = 'force-dynamic'
export const revalidate = 0

// GET - Obter cliente específico (restrito ao tenant)
export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const decoded = getAuthUser(request)
    if (!requireRole(decoded, ['DEVELOPER', 'ADMIN', 'BARBER', 'RECEPTIONIST'])) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { id } = await context.params

    const clientWhere: any = { id }
    if (decoded.role !== 'DEVELOPER') {
      if (!decoded.barbershopId) {
        return NextResponse.json({ error: 'Usuário não vinculado a uma barbearia' }, { status: 403 })
      }
      clientWhere.barbershopId = decoded.barbershopId
      // Barbeiro só vê cliente com quem já teve atendimento
      if (decoded.role === 'BARBER') {
        clientWhere.appointments = { some: { barberId: decoded.id } }
      }
    }

    const client = await prisma.client.findFirst({
      where: clientWhere,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        notes: true,
        isActive: true,
        isVip: true,
        createdAt: true,
        updatedAt: true,
        barbershopId: true,
        userId: true,
      },
    })

    if (!client) {
      return NextResponse.json({ error: 'Cliente não encontrado' }, { status: 404 })
    }

    return NextResponse.json(client)
  } catch (error) {
    console.error('Get client error:', error)
    return NextResponse.json({ error: 'Erro ao buscar cliente' }, { status: 500 })
  }
}

// DELETE - Excluir cliente específico por ID (restrito ao tenant)
export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const decoded = getAuthUser(request)
    if (!requireRole(decoded, ['DEVELOPER', 'ADMIN', 'RECEPTIONIST'])) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { id } = await context.params

    const clientWhere: any = { id }
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

    await prisma.client.delete({
      where: { id },
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

// PUT - Atualizar cliente (ADMIN/RECEPTIONIST/DEVELOPER; BARBER só visualiza)
export async function PUT(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const decoded = getAuthUser(request)
    if (!requireRole(decoded, ['DEVELOPER', 'ADMIN', 'RECEPTIONIST'])) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { id } = await context.params

    const clientWhere: any = { id }
    if (decoded.role !== 'DEVELOPER') {
      if (!decoded.barbershopId) {
        return NextResponse.json({ error: 'Usuário não vinculado a uma barbearia' }, { status: 403 })
      }
      clientWhere.barbershopId = decoded.barbershopId
    }

    const existingClient = await prisma.client.findFirst({
      where: clientWhere,
    })

    if (!existingClient) {
      return NextResponse.json({ error: 'Cliente não encontrado' }, { status: 404 })
    }

    const { name, email, phone, notes, isActive, isVip } = await request.json()

    const trimmedName = typeof name === 'string' ? name.trim() : existingClient.name
    if (!trimmedName) {
      return NextResponse.json({ error: 'Nome é obrigatório' }, { status: 400 })
    }

    const phoneDigits = typeof phone === 'string' ? phone.replace(/\D/g, '') : null
    if (phone !== undefined) {
      if (!phoneDigits || phoneDigits.length < 10 || phoneDigits.length > 11) {
        return NextResponse.json(
          { error: 'Telefone inválido. Informe um telefone com DDD, no formato (00) 00000-0000' },
          { status: 400 }
        )
      }
    }

    if (email && !EMAIL_PATTERN.test(email)) {
      return NextResponse.json(
        { error: 'Informe um e-mail válido no formato nome@dominio.com' },
        { status: 400 }
      )
    }

    // Verificar se o email já está em uso por outro cliente da mesma barbearia
    if (email && email !== existingClient.email) {
      const emailExists = await prisma.client.findFirst({
        where: { email, barbershopId: existingClient.barbershopId, id: { not: id } },
      })

      if (emailExists) {
        return NextResponse.json(
          { error: 'Já existe um cliente com este email' },
          { status: 400 }
        )
      }
    }

    const updateData: any = { name: trimmedName }
    if (phone !== undefined) updateData.phone = phone
    if (email !== undefined) updateData.email = email || null
    if (notes !== undefined) updateData.notes = notes
    if (isActive !== undefined) updateData.isActive = isActive
    if (isVip !== undefined) updateData.isVip = Boolean(isVip)

    const client = await prisma.client.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json(client)
  } catch (error) {
    console.error('Update client error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao atualizar cliente' },
      { status: 500 }
    )
  }
}
