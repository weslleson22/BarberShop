import { NextRequest, NextResponse } from 'next/server'

interface RateLimitRecord {
  count: number
  resetTime: number
}

// Armazenamento em memória (globalThis para persistir em hot-reloading de desenvolvimento)
const globalRateLimit = globalThis as unknown as {
  __rateLimitStore__?: Map<string, RateLimitRecord>
}

if (!globalRateLimit.__rateLimitStore__) {
  globalRateLimit.__rateLimitStore__ = new Map<string, RateLimitRecord>()
}

const rateLimitStore = globalRateLimit.__rateLimitStore__

/**
 * Limpa periodicamente chaves expiradas para evitar consumo excessivo de memória
 */
function cleanupExpiredRecords(now: number) {
  if (rateLimitStore.size > 10000) {
    for (const [key, record] of rateLimitStore.entries()) {
      if (now > record.resetTime) {
        rateLimitStore.delete(key)
      }
    }
  }
}

export interface RateLimitOptions {
  limit: number // Número máximo de requisições permitidas na janela
  windowMs: number // Tamanho da janela em milissegundos
  prefix?: string
}

export interface RateLimitResult {
  success: boolean
  limit: number
  remaining: number
  resetTime: number
}

/**
 * Rate Limiter com algoritmo Fixed Window + Sliding Expiration
 * Protege rotas críticas contra Força Bruta, Credential Stuffing e DoS.
 */
export function checkRateLimit(
  identifier: string,
  options: RateLimitOptions
): RateLimitResult {
  const { limit, windowMs, prefix = 'rl' } = options
  const now = Date.now()
  cleanupExpiredRecords(now)

  const key = `${prefix}:${identifier}`
  const record = rateLimitStore.get(key)

  if (!record || now > record.resetTime) {
    const newRecord: RateLimitRecord = {
      count: 1,
      resetTime: now + windowMs,
    }
    rateLimitStore.set(key, newRecord)
    return {
      success: true,
      limit,
      remaining: limit - 1,
      resetTime: newRecord.resetTime,
    }
  }

  if (record.count >= limit) {
    return {
      success: false,
      limit,
      remaining: 0,
      resetTime: record.resetTime,
    }
  }

  record.count += 1
  return {
    success: true,
    limit,
    remaining: limit - record.count,
    resetTime: record.resetTime,
  }
}

/**
 * Helper para extrair IP do cliente a partir de headers de proxy confiáveis
 */
export function getClientIp(request: NextRequest): string {
  const forwardedFor = request.headers.get('x-forwarded-for')
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim()
  }
  const realIp = request.headers.get('x-real-ip')
  if (realIp) {
    return realIp.trim()
  }
  return '127.0.0.1'
}

/**
 * Retorna uma resposta HTTP 429 Too Many Requests formatada
 */
export function rateLimitExceededResponse(resetTime: number): NextResponse {
  const retryAfterSeconds = Math.max(1, Math.ceil((resetTime - Date.now()) / 1000))
  return NextResponse.json(
    {
      error: 'Muitas requisições. Por segurança, aguarde alguns instantes antes de tentar novamente.',
      retryAfterSeconds,
    },
    {
      status: 429,
      headers: {
        'Retry-After': String(retryAfterSeconds),
      },
    }
  )
}
