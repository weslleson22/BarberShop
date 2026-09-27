import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/api-auth'
import { createAuditLog, extractRequestContext } from '@/lib/audit-log'
import { AuditAction, AuditEntity } from '@prisma/client'

export const dynamic = 'force-dynamic'

/**
 * POST /api/audit/navigation
 *
 * Registra navegação de páginas e rotas consultadas por qualquer usuário.
 */
export async function POST(request: NextRequest) {
  try {
    const user = getAuthUser(request)
    const body = await request.json().catch(() => ({}))
    const path = typeof body.path === 'string' ? body.path : '/'
    const title = typeof body.title === 'string' ? body.title : ''
    const referrer = typeof body.referrer === 'string' ? body.referrer : ''

    // Ignora rotas estáticas ou de telemetria interna
    if (
      !path ||
      path.startsWith('/_next') ||
      path.startsWith('/api/audit') ||
      path.startsWith('/api/developer/audit-logs') ||
      path.includes('.ico') ||
      path.includes('.png') ||
      path.includes('.jpg')
    ) {
      return NextResponse.json({ ok: true })
    }

    const ctx = extractRequestContext(request)

    // Formata mensagem amigável de navegação
    const routeLabel = path === '/' ? 'Página Inicial' : path

    await createAuditLog({
      userId: user?.id ?? null,
      barbershopId: user?.barbershopId ?? null,
      action: AuditAction.VIEW,
      entity: AuditEntity.SYSTEM,
      entityId: path,
      metadata: {
        method: 'GET',
        path,
        title,
        referrer,
        type: 'navigation',
        statusCode: 200,
        message: `Navegou para ${routeLabel}`,
      },
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
      success: true,
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    // Falha silenciosa para não travar navegação
    return NextResponse.json({ ok: true })
  }
}
