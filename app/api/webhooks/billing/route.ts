import { NextRequest, NextResponse } from 'next/server'
import { processBillingWebhook } from '@/lib/billing/webhook-handler'

export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * POST /api/webhooks/billing
 *
 * Endpoint unificado e seguro para recepção de Webhooks do Gateway de Pagamentos (Stripe).
 *
 * Requisitos de Segurança & Idempotência implementados:
 * 1. Não requer autenticação de sessão de usuário (chamada machine-to-machine externa).
 * 2. Validação obrigatória da assinatura criptográfica HMAC SHA-256 (stripe-signature).
 * 3. Tolerância a desvio de relógio/timestamp (300 segundos) para proteção contra Replay Attacks.
 * 4. Deduplicação e Idempotência estrita: se o mesmo eventId chegar 2, 3 ou 10 vezes,
 *    responde HTTP 200 sem duplicar faturas ou eventos de auditoria.
 * 5. NUNCA confia em status vindo de browser ou cliente; apenas webhooks assinados alteram status.
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Obtenção do corpo bruto (raw body) em formato de string para verificação da assinatura HMAC
    const rawBody = await request.text()

    if (!rawBody || rawBody.trim().length === 0) {
      return NextResponse.json(
        { error: 'Corpo da requisição vazio' },
        { status: 400 }
      )
    }

    // 2. Extração do cabeçalho de assinatura do provider
    const signatureHeader =
      request.headers.get('stripe-signature') ||
      request.headers.get('x-signature') ||
      ''

    if (!signatureHeader) {
      console.warn('[BILLING_WEBHOOK_WARNING] Tentativa de acesso sem cabeçalho de assinatura')
      return NextResponse.json(
        { error: 'Cabeçalho de assinatura ausente' },
        { status: 400 }
      )
    }

    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || ''

    // 3. Processamento no motor central de Webhooks com idempotência e transação atômica
    const result = await processBillingWebhook({
      rawBody,
      signatureHeader,
      secret: webhookSecret,
      provider: 'STRIPE',
    })

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: result.statusCode }
      )
    }

    return NextResponse.json(
      {
        received: true,
        eventId: result.eventId,
        eventType: result.eventType,
        action: result.action,
        duplicated: result.duplicated || false,
        message: result.message,
      },
      { status: 200 }
    )
  } catch (error: any) {
    console.error('[BILLING_WEBHOOK_CRITICAL_ERROR] Falha inesperada ao processar webhook:', error)
    // Retorna 500 para instruir o provedor a reenviar o evento via retry seguro
    return NextResponse.json(
      { error: 'Erro interno ao processar evento de faturamento' },
      { status: 500 }
    )
  }
}
