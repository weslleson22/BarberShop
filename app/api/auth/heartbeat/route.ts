import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/api-auth'
import { SessionManager } from '@/lib/session-manager'

export const dynamic = 'force-dynamic'
export const revalidate = 0

// POST - Heartbeat periódico enviado pelo frontend (a cada ~30s ou em mudanças de rota)
export async function POST(request: NextRequest) {
  try {
    const user = getAuthUser(request)
    if (!user) {
      return NextResponse.json({ active: false }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const currentPath = body.currentPath || request.headers.get('referer') || '/'

    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || '127.0.0.1'
    const ua = request.headers.get('user-agent') || undefined

    SessionManager.touchSession(user.id, {
      userName: user.name,
      userEmail: user.email,
      userRole: user.role,
      barbershopId: user.barbershopId,
      currentPath,
      ipAddress: ip,
      userAgent: ua,
    })

    return NextResponse.json({
      active: true,
      timestamp: Date.now(),
      userId: user.id,
    })
  } catch (error) {
    return NextResponse.json({ active: false, error: 'Heartbeat error' }, { status: 500 })
  }
}
