import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthUser, requireRole } from '@/lib/api-auth'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const maxDuration = 30 // Limite de 30s da função serverless Vercel

/**
 * GET /api/developer/audit-logs/stream
 *
 * Server-Sent Events (SSE) endpoint para streaming em tempo real.
 * Compatível com Vercel serverless — ciclo de vida controlado (< 25s)
 * com keepalive e reconexão graciosa sem timeouts 504.
 *
 * Headers anti-buffering para garantir push imediato no edge.
 */
export async function GET(request: NextRequest) {
  const user = getAuthUser(request)
  if (!requireRole(user, ['DEVELOPER'])) {
    return NextResponse.json({ error: 'Acesso restrito ao desenvolvedor' }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const sinceParam = searchParams.get('since')
  let sinceDate: Date | null = sinceParam ? new Date(sinceParam) : null
  if (sinceDate && isNaN(sinceDate.getTime())) sinceDate = null

  const encoder = new TextEncoder()

  function encode(event: string, data: unknown) {
    return encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
  }

  let isClosed = false

  const stream = new ReadableStream({
    async start(controller) {
      // 1. Confirmação imediata de conexão
      controller.enqueue(encode('connected', { ok: true, ts: new Date().toISOString() }))

      const sentIds = new Set<string>()
      let lastCreatedAt: Date | null = sinceDate

      // 2. Enviar logs iniciais
      try {
        const whereClause = sinceDate
          ? { createdAt: { gt: sinceDate } }
          : {}

        const initial = await prisma.auditLog.findMany({
          where: whereClause,
          orderBy: { createdAt: 'desc' },
          take: sinceDate ? 50 : 40,
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
          // Ordena em ordem decrescente (mais recente primeiro)
          initial.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          lastCreatedAt = initial[0].createdAt
          controller.enqueue(encode('logs', initial))
        }
      } catch (err) {
        console.error('[SSE] initial fetch error:', err)
      }

      // 3. Polling a cada 2s para novos registros
      // Vercel serverless maxDuration = 30s.
      // Fechamos graciosamente aos ~20s para o cliente reconectar sem estourar 504.
      let pollCount = 0
      const maxPolls = 10 // 10 * 2000ms = 20 segundos

      const poll = async () => {
        if (isClosed) return

        if (pollCount >= maxPolls) {
          try {
            controller.enqueue(encode('reconnect', { reason: 'refresh', lastTimestamp: lastCreatedAt?.toISOString() }))
            controller.close()
          } catch {
            // Stream já encerrada
          }
          isClosed = true
          return
        }
        pollCount++

        // Heartbeat keepalive a cada 8s
        if (pollCount % 4 === 0) {
          try {
            controller.enqueue(encode('heartbeat', { ts: new Date().toISOString() }))
          } catch {
            isClosed = true
            return
          }
        }

        try {
          const whereClause = lastCreatedAt
            ? { createdAt: { gt: lastCreatedAt } }
            : {}

          const fresh = await prisma.auditLog.findMany({
            where: whereClause,
            orderBy: { createdAt: 'desc' },
            take: 30,
            select: {
              id: true, action: true, entity: true, entityId: true,
              success: true, errorMessage: true, ipAddress: true,
              userAgent: true, metadata: true, createdAt: true,
              userId: true, barbershopId: true,
              user: { select: { id: true, name: true, email: true, role: true, avatar: true } },
              barbershop: { select: { id: true, name: true, slug: true } },
            },
          })

          const unseen = fresh.filter(l => !sentIds.has(l.id))
          if (unseen.length > 0) {
            unseen.forEach(l => {
              sentIds.add(l.id)
              if (sentIds.size > 1000) {
                const first = sentIds.values().next().value
                if (first) sentIds.delete(first)
              }
            })
            // O mais recente
            lastCreatedAt = unseen[0].createdAt
            controller.enqueue(encode('logs', unseen))
          }
        } catch (err) {
          console.error('[SSE] poll error:', err)
        }

        if (!isClosed) {
          setTimeout(poll, 2000)
        }
      }

      setTimeout(poll, 2000)
    },
    cancel() {
      isClosed = true
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform, no-store, must-revalidate',
      'Connection': 'keep-alive',
      'Content-Encoding': 'none',
      'X-Accel-Buffering': 'no',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Credentials': 'true',
    },
  })
}
