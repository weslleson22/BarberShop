import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthUser, requireRole } from '@/lib/api-auth'

const EMAIL_PATTERN = /^[a-z0-9._%+\-]+@[a-z0-9.-]+\.[a-z]{2,}$/

// PUT - Atualizar cliente (ADMIN/RECEPTIONIST; BARBER só visualiza)
export async function PUT(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const decoded = getAuthUser(request)
    if (!requireRole(decoded, ['ADMIN', 'RECEPTIONIST']) || !decoded.barbershopId) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { id } = await context.params

    const existingClient = await prisma.client.findFirst({
      where: { id, barbershopId: decoded.barbershopId },
    })

    if (!existingClient) {
      return NextResponse.json({ error: 'Cliente não encontrado' }, { status: 404 })
    }

    const { name, email, phone, notes, isActive } = await request.json()

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
        where: { email, barbershopId: decoded.barbershopId, id: { not: id } },
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
