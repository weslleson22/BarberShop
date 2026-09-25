import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthUser } from '@/lib/api-auth'

export const dynamic = 'force-dynamic'
export const revalidate = 0

// PATCH - Marcar uma notificação específica como lida
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = getAuthUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { id } = await context.params

    if (!id) {
      return NextResponse.json({ error: 'ID da notificação não fornecido' }, { status: 400 })
    }

    // Busca a notificação pelo ID garantindo isolamento por usuário (exceto DEVELOPER)
    const notificationWhere: any = { id }
    if (user.role !== 'DEVELOPER') {
      notificationWhere.userId = user.id
    }

    const notification = await prisma.notification.findFirst({
      where: notificationWhere,
    })

    if (!notification) {
      return NextResponse.json({ error: 'Notificação não encontrada' }, { status: 404 })
    }

    let readState = true
    try {
      const body = await request.json()
      if (typeof body?.read === 'boolean') {
        readState = body.read
      }
    } catch {
      // Nenhum corpo enviado; padrão é true
    }

    const updated = await prisma.notification.update({
      where: { id },
      data: { read: readState },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Mark notification read error:', error)
    return NextResponse.json({ error: 'Erro ao atualizar notificação' }, { status: 500 })
  }
}

// DELETE - Excluir uma notificação específica
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = getAuthUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { id } = await context.params

    if (!id) {
      return NextResponse.json({ error: 'ID da notificação não fornecido' }, { status: 400 })
    }

    const notificationWhere: any = { id }
    if (user.role !== 'DEVELOPER') {
      notificationWhere.userId = user.id
    }

    const notification = await prisma.notification.findFirst({
      where: notificationWhere,
    })

    if (!notification) {
      return NextResponse.json({ error: 'Notificação não encontrada' }, { status: 404 })
    }

    await prisma.notification.delete({
      where: { id },
    })

    return NextResponse.json({ message: 'Notificação excluída com sucesso' })
  } catch (error) {
    console.error('Delete notification error:', error)
    return NextResponse.json({ error: 'Erro ao excluir notificação' }, { status: 500 })
  }
}
