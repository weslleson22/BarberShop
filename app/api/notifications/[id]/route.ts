import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthUser } from '@/lib/api-auth'

// PATCH - Marcar uma notificação específica como lida
export async function PATCH(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const { id } = await props.params
  try {
    const user = getAuthUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    // Garante que a notificação pertence a quem está chamando
    const notification = await prisma.notification.findFirst({
      where: { id, userId: user.id },
    })

    if (!notification) {
      return NextResponse.json({ error: 'Notificação não encontrada' }, { status: 404 })
    }

    const updated = await prisma.notification.update({
      where: { id },
      data: { read: true },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Mark notification read error:', error)
    return NextResponse.json({ error: 'Erro ao atualizar notificação' }, { status: 500 })
  }
}
