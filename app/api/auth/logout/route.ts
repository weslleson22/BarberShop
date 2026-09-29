import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/api-auth'
import { createAuditLog, extractRequestContext } from '@/lib/audit-log'
import { AuditAction, AuditEntity } from '@prisma/client'

export const dynamic = 'force-dynamic'
export const revalidate = 0

// POST - Encerrar sessão. O cookie 'auth-token' é httpOnly, então só o
// servidor pode limpá-lo — o frontend não consegue mais fazer isso via
// document.cookie (por isso este endpoint existe).
export async function POST(request: NextRequest) {
  const user = getAuthUser(request)
  const ctx = extractRequestContext(request)

  if (user) {
    const { SessionManager } = await import('@/lib/session-manager')
    SessionManager.invalidateSession(user.id, user.sessionId)

    await createAuditLog({
      userId: user.id,
      barbershopId: user.barbershopId ?? null,
      action: AuditAction.LOGOUT,
      entity: AuditEntity.USER,
      entityId: user.id,
      success: true,
      metadata: { role: user.role },
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    })
  }

  const response = NextResponse.json({ message: 'Logout realizado com sucesso' })
  response.cookies.set('auth-token', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 0,
    path: '/',
  })
  return response
}

