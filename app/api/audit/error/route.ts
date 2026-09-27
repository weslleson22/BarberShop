import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/api-auth'
import { createAuditLog, extractRequestContext } from '@/lib/audit-log'
import { AuditAction, AuditEntity } from '@prisma/client'

export const dynamic = 'force-dynamic'

/**
 * POST /api/audit/error
 *
 * Registra erros de cliente e falhas de requisição para auditoria centralizada.
 */
export async function POST(request: NextRequest) {
  try {
    const user = getAuthUser(request)
    const body = await request.json().catch(() => ({}))
    const path = typeof body.path === 'string' ? body.path : '/'
    const message = typeof body.message === 'string' ? body.message : 'Erro na aplicação'
    const stack = typeof body.stack === 'string' ? body.stack.slice(0, 500) : null
    const statusCode = typeof body.statusCode === 'number' ? body.statusCode : 500

    const ctx = extractRequestContext(request)

    await createAuditLog({
      userId: user?.id ?? null,
      barbershopId: user?.barbershopId ?? null,
      action: AuditAction.VIEW,
      entity: AuditEntity.SYSTEM,
      entityId: path,
      metadata: {
        method: 'ERROR',
        path,
        statusCode,
        message,
        stack,
        type: 'client_error',
      },
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
      success: false,
      errorMessage: message,
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    return NextResponse.json({ ok: true })
  }
}
