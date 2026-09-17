import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthUser } from '@/lib/api-auth'

export const dynamic = 'force-dynamic'
export const revalidate = 0

// GET - Notificações do usuário autenticado (mais recentes primeiro)
export async function GET(request: NextRequest) {
  try {
    const user = getAuthUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const notifications = await prisma.notification.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 30,
    })

    const unreadCount = await prisma.notification.count({
      where: { userId: user.id, read: false },
    })

    return NextResponse.json({ notifications, unreadCount })
  } catch (error) {
    console.error('Get notifications error:', error)
    return NextResponse.json({ error: 'Erro ao buscar notificações' }, { status: 500 })
  }
}

// PATCH - Marcar todas as notificações do usuário autenticado como lidas
export async function PATCH(request: NextRequest) {
  try {
    const user = getAuthUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    await prisma.notification.updateMany({
      where: { userId: user.id, read: false },
      data: { read: true },
    })

    return NextResponse.json({ message: 'Notificações marcadas como lidas' })
  } catch (error) {
    console.error('Mark all notifications read error:', error)
    return NextResponse.json({ error: 'Erro ao atualizar notificações' }, { status: 500 })
  }
}

// DELETE - Limpar notificações lidas do usuário
export async function DELETE(request: NextRequest) {
  try {
    const user = getAuthUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    await prisma.notification.deleteMany({
      where: { userId: user.id, read: true },
    })

    return NextResponse.json({ message: 'Notificações lidas removidas' })
  } catch (error) {
    console.error('Delete notifications error:', error)
    return NextResponse.json({ error: 'Erro ao remover notificações' }, { status: 500 })
  }
}

