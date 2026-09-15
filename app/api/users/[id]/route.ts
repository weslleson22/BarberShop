import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hashPassword, verifyToken } from '@/lib/auth'
import { ensureClientForUser } from '@/lib/client-sync'

function getAdmin(request: NextRequest) {
  const token = request.cookies.get('auth-token')?.value
  if (!token) return null

  try {
    const decoded = verifyToken(token)
    return decoded.role === 'ADMIN' ? decoded : null
  } catch {
    return null
  }
}

// PUT - Atualizar usuário (dados completos ou apenas um campo, ex: isActive)
export async function PUT(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const admin = getAdmin(request)
    if (!admin) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { id } = await context.params

    const existingUser = await prisma.user.findFirst({
      where: { id, barbershopId: admin.barbershopId },
    })

    if (!existingUser) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })
    }

    const data = await request.json()
    const { name, email, role, password, isActive, avatar, phone } = data

    // Verificar se o email já está em uso por outro usuário
    if (email && email !== existingUser.email) {
      const emailExists = await prisma.user.findFirst({
        where: { email, id: { not: id } },
      })

      if (emailExists) {
        return NextResponse.json(
          { error: 'Email já está em uso por outro usuário' },
          { status: 400 }
        )
      }
    }

    const updateData: any = {}
    if (name !== undefined) updateData.name = name
    if (email !== undefined) updateData.email = email
    if (role !== undefined) updateData.role = role
    if (isActive !== undefined) updateData.isActive = isActive
    if (avatar !== undefined) updateData.avatar = avatar
    if (phone !== undefined) updateData.phone = phone

    // Só altera a senha se uma nova senha (não vazia) for enviada
    if (password) {
      updateData.password = await hashPassword(password)
    }

    const user = await prisma.user.update({
      where: { id },
      data: updateData,
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
      },
    })

    // Se o usuário é (ou passou a ser) cliente, garantir que apareça na Lista de Clientes
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
        console.error('Erro ao vincular Client ao usuário atualizado:', syncError)
      }
    }

    return NextResponse.json(user)
  } catch (error) {
    console.error('Update user error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao atualizar usuário' },
      { status: 500 }
    )
  }
}

// DELETE - Excluir usuário
export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const admin = getAdmin(request)
    if (!admin) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { id } = await context.params

    const existingUser = await prisma.user.findFirst({
      where: { id, barbershopId: admin.barbershopId },
    })

    if (!existingUser) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })
    }

    const totalAppointments = await prisma.appointment.count({
      where: { OR: [{ barberId: id }, { clientId: id }] },
    })

    if (totalAppointments > 0) {
      return NextResponse.json(
        {
          error: 'Não é possível excluir usuário com agendamentos existentes',
          details: `Usuário possui ${totalAppointments} agendamento(s) associado(s)`,
        },
        { status: 400 }
      )
    }

    await prisma.user.delete({ where: { id } })

    return NextResponse.json({
      message: 'Usuário excluído com sucesso',
      deletedUser: { id: existingUser.id, name: existingUser.name, email: existingUser.email },
    })
  } catch (error) {
    console.error('Delete user error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao excluir usuário' },
      { status: 500 }
    )
  }
}
