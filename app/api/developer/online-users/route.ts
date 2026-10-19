import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser, requireRole } from '@/lib/api-auth'
import { SessionManager } from '@/lib/session-manager'
import { prisma } from '@/lib/prisma'
import { createAuditLog, extractRequestContext } from '@/lib/audit-log'
import { AuditAction, AuditEntity } from '@prisma/client'

export const dynamic = 'force-dynamic'
export const revalidate = 0

// GET - Listar usuários online em tempo real (exclusivo para DEVELOPER ou ADMIN no seu tenant)
export async function GET(request: NextRequest) {
  try {
    const user = getAuthUser(request)
    if (!requireRole(user, ['DEVELOPER', 'ADMIN'])) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const thresholdMinutes = Math.min(60, Math.max(1, Number(searchParams.get('threshold') || 15)))

    const activeSessions = SessionManager.getAllActiveSessions(thresholdMinutes)

    // Filtragem por Tenant se for ADMIN comum
    const filteredSessions = user.role === 'DEVELOPER'
      ? activeSessions
      : activeSessions.filter((s) => s.barbershopId === user.barbershopId)

    // IDs para enriquecimento de dados a partir do banco de dados se faltar no cache
    const userIds = filteredSessions.map((s) => s.userId)
    const dbUsers = userIds.length > 0
      ? await prisma.user.findMany({
          where: { id: { in: userIds } },
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            avatar: true,
            phone: true,
            barbershopId: true,
            barbershop: {
              select: {
                id: true,
                name: true,
                slug: true,
                logo: true,
              },
            },
          },
        })
      : []

    const dbUserMap = new Map(dbUsers.map((u) => [u.id, u]))

    const now = Date.now()
    const enrichedUsers = filteredSessions.map((session) => {
      const dbUser = dbUserMap.get(session.userId)
      const diffMs = now - session.lastActive
      const diffSecs = Math.max(0, Math.floor(diffMs / 1000))

      // Status: ONLINE (< 3 minutos), IDLE (3 a 15 minutos)
      const status: 'ONLINE' | 'IDLE' = diffSecs <= 180 ? 'ONLINE' : 'IDLE'

      return {
        userId: session.userId,
        sessionId: session.sessionId,
        name: dbUser?.name || session.userName || 'Usuário',
        email: dbUser?.email || session.userEmail || '',
        role: dbUser?.role || session.userRole || 'CLIENT',
        avatar: dbUser?.avatar || session.avatar || null,
        phone: dbUser?.phone || null,
        barbershopId: dbUser?.barbershopId || session.barbershopId || null,
        barbershopName: dbUser?.barbershop?.name || session.barbershopName || 'Plataforma Geral',
        barbershopSlug: dbUser?.barbershop?.slug || session.barbershopSlug || null,
        barbershopLogo: dbUser?.barbershop?.logo || null,
        currentPath: session.currentPath || '/',
        ipAddress: session.ipAddress || '127.0.0.1',
        userAgent: session.userAgent || null,
        deviceType: session.deviceType || 'Desktop',
        connectedAt: session.connectedAt || session.lastActive,
        lastActive: session.lastActive,
        secondsSinceLastActive: diffSecs,
        status,
      }
    })

    // Estatísticas agregadas
    const totalOnline = enrichedUsers.filter((u) => u.status === 'ONLINE').length
    const totalIdle = enrichedUsers.filter((u) => u.status === 'IDLE').length
    const rolesCount = {
      ADMIN: enrichedUsers.filter((u) => u.role === 'ADMIN').length,
      BARBER: enrichedUsers.filter((u) => u.role === 'BARBER').length,
      CLIENT: enrichedUsers.filter((u) => u.role === 'CLIENT').length,
      DEVELOPER: enrichedUsers.filter((u) => u.role === 'DEVELOPER').length,
      RECEPTIONIST: enrichedUsers.filter((u) => u.role === 'RECEPTIONIST').length,
    }

    const uniqueTenants = new Set(
      enrichedUsers.map((u) => u.barbershopId).filter(Boolean)
    ).size

    return NextResponse.json({
      timestamp: now,
      stats: {
        totalOnline,
        totalIdle,
        totalActive: enrichedUsers.length,
        rolesCount,
        uniqueTenants,
      },
      users: enrichedUsers,
    })
  } catch (error) {
    console.error('Error fetching online users:', error)
    return NextResponse.json(
      { error: 'Erro ao carregar telemetria de usuários online' },
      { status: 500 }
    )
  }
}

// DELETE - Desconectar remotamente a sessão de um usuário
export async function DELETE(request: NextRequest) {
  try {
    const admin = getAuthUser(request)
    if (!requireRole(admin, ['DEVELOPER', 'ADMIN'])) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const targetUserId = searchParams.get('userId')

    if (!targetUserId) {
      return NextResponse.json({ error: 'ID do usuário é obrigatório' }, { status: 400 })
    }

    // Se for ADMIN, não pode desconectar DEVELOPER nem usuários de outra barbearia
    if (admin.role !== 'DEVELOPER') {
      const targetUser = await prisma.user.findUnique({
        where: { id: targetUserId },
        select: { id: true, role: true, barbershopId: true },
      })

      if (!targetUser || targetUser.barbershopId !== admin.barbershopId || targetUser.role === 'DEVELOPER') {
        return NextResponse.json({ error: 'Operação não permitida' }, { status: 403 })
      }
    }

    const disconnected = SessionManager.disconnectUser(targetUserId)

    const ctx = extractRequestContext(request)
    await createAuditLog({
      userId: admin.id,
      barbershopId: admin.barbershopId,
      action: AuditAction.LOGOUT,
      entity: AuditEntity.USER,
      entityId: targetUserId,
      success: true,
      metadata: {
        reason: 'Desconexão forçada pelo painel de controle',
        disconnectedBy: admin.email,
        disconnectedRole: admin.role,
      },
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    })

    return NextResponse.json({
      success: true,
      message: 'Sessão encerrada com sucesso',
      disconnected,
    })
  } catch (error) {
    console.error('Error disconnecting user session:', error)
    return NextResponse.json({ error: 'Erro ao encerrar sessão' }, { status: 500 })
  }
}
