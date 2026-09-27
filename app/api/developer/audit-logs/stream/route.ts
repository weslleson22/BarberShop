import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthUser, requireRole } from '@/lib/api-auth'

export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * GET /api/developer/audit-logs/stream
 *
 * Server-Sent Events (SSE) endpoint para streaming em tempo real.
 * Compatível com Vercel serverless — usa polling curto no banco
 * com keepalive e reconexão automática pelo cliente.
 *
 * Protocolo:
 *   event: connected   → confirmação de conexão
 *   event: logs        → array de novos logs (JSON)
 *   event: heartbeat   → keepalive a cada 15s
 */
export async function GET(request: NextRequest) {
  const user = getAuthUser(request)
  if (!requireRole(user, ['DEVELOPER'])) {
    return NextResponse.json({ error: 'Acesso restrito ao desenvolvedor' }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const sinceParam = searchParams.get('since')
  // cursor = ID do log mais recente que o cliente já tem
  let cursorId = sinceParam ?? null

  const encoder = new TextEncoder()

  function encode(event: string, data: unknown) {
    return encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
  }

  const stream = new ReadableStream({
    async start(controller) {
      // 1. Confirmação de conexão
      controller.enqueue(encode('connected', { ok: true, ts: new Date().toISOString() }))

      const sentIds = new Set<string>()
      let lastCreatedAt: Date | null = null

      // 2. Enviar logs recentes imediatamente (últimos 40 logs)
      try {
        const initial = await prisma.auditLog.findMany({
          orderBy: { createdAt: 'desc' },
          take: 40,
          select: {
            id: true, action: true, entity: true, entityId: true,
            success: true, errorMessage: true, ipAddress: true,
            userAgent: true, metadata: true, createdAt: true,
            userId: true, barbershopId: true,
            user: { select: { id: true, name: true, email: true, role: true, avatar: true } },
            barbershop: { select: { id: true, name: true, slug: true } },
          },
        })
        if (initial.length > 0) {
          initial.forEach(l => sentIds.add(l.id))
          lastCreatedAt = initial[0].createdAt
          controller.enqueue(encode('logs', initial))
        }
      } catch (err) {
        console.error('[SSE] initial fetch error:', err)
      }

      // 3. Polling a cada 2.5s para novos registros
      let pollCount = 0
      const maxPolls = 70 // ~3min — limite de timeout serverless

      const poll = async () => {
        if (pollCount >= maxPolls) {
          controller.enqueue(encode('reconnect', { reason: 'timeout' }))
          controller.close()
          return
        }
        pollCount++

        // Heartbeat a cada 15s (a cada 6 polls de 2.5s)
        if (pollCount % 6 === 0) {
          controller.enqueue(encode('heartbeat', { ts: new Date().toISOString() }))
        }

        try {
          const whereClause = lastCreatedAt
            ? { createdAt: { gte: lastCreatedAt } }
            : {}

          const candidates = await prisma.auditLog.findMany({
            where: whereClause,
            orderBy: { createdAt: 'asc' },
            take: 50,
            select: {
              id: true, action: true, entity: true, entityId: true,
              success: true, errorMessage: true, ipAddress: true,
              userAgent: true, metadata: true, createdAt: true,
              userId: true, barbershopId: true,
              user: { select: { id: true, name: true, email: true, role: true, avatar: true } },
              barbershop: { select: { id: true, name: true, slug: true } },
            },
          })

          const fresh = candidates.filter(l => !sentIds.has(l.id))
          if (fresh.length > 0) {
            fresh.forEach(l => {
              sentIds.add(l.id)
              if (sentIds.size > 1000) {
                const first = sentIds.values().next().value
                if (first) sentIds.delete(first)
              }
            })
            lastCreatedAt = fresh[fresh.length - 1].createdAt
            controller.enqueue(encode('logs', fresh))
          }
        } catch (err) {
          console.error('[SSE] poll error:', err)
        }

        setTimeout(poll, 2500)
      }

      setTimeout(poll, 2500)
    },
    cancel() {
      // Cliente desconectou — nada a fazer (sem state externo)
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no', // Desabilita buffering no nginx/Vercel
      'Access-Control-Allow-Origin': '*',
    },
  })
}
