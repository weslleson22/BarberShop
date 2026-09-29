import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/api-auth'
import { SessionManager } from '@/lib/session-manager'

export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * GET /api/auth/session
 *
 * Valida se a sessão atual do usuário ainda é a sessão ativa autorizada.
 * Se outro login foi realizado nesta mesma conta, retorna 401 SESSION_SUPERSEDED.
 */
export async function GET(request: NextRequest) {
  const user = getAuthUser(request)

  if (!user) {
    return NextResponse.json(
      { valid: false, reason: 'UNAUTHENTICATED' },
      { status: 401 }
    )
  }

  // Verifica se a sessão do token ainda é a mais recente
  const isActive = SessionManager.isSessionActive(user.id, user.sessionId)

  if (!isActive) {
    return NextResponse.json(
      {
        valid: false,
        reason: 'SESSION_SUPERSEDED',
        error: 'SESSION_SUPERSEDED',
        message: 'Sua conta foi conectada em outro dispositivo/navegador. Apenas a sessão mais recente permanece ativa.',
      },
      { status: 401 }
    )
  }

  return NextResponse.json({
    valid: true,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      barbershopId: user.barbershopId,
      sessionId: user.sessionId,
    },
  })
}
