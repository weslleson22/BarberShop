import { NextRequest, NextResponse } from 'next/server'
import { processBillingWebhook } from '@/lib/billing/webhook-handler'

export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * POST /api/webhooks/billing
 *
 * Endpoint unificado e seguro para recepção de Webhooks da AbacatePay e Stripe.
 */
export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text()

    if (!rawBody || rawBody.trim().length === 0) {
      return NextResponse.json(
        { error: 'Corpo da requisição vazio' },
        { status: 400 }
      )
    }

    const url = request.nextUrl
    const secretQuery = url.searchParams.get('webhookSecret')
    const providerParam = url.searchParams.get('provider')

    const abacateSignature = request.headers.get('x-webhook-signature')
    const stripeSignature = request.headers.get('stripe-signature') || request.headers.get('x-signature')

    // Se nenhuma autenticação presente (nem header nem query secret)
    if (!stripeSignature && !abacateSignature && !secretQuery) {
      console.warn('[BILLING_WEBHOOK_WARNING] Tentativa de acesso sem cabeçalho de assinatura')
      return NextResponse.json(
        { error: 'Cabeçalho de assinatura ausente' },
        { status: 400 }
      )
    }

    const isStripe = Boolean(stripeSignature && !abacateSignature && !secretQuery) || providerParam?.toUpperCase() === 'STRIPE'
    const provider: 'ABACATEPAY' | 'STRIPE' = isStripe ? 'STRIPE' : 'ABACATEPAY'

    const signatureHeader = isStripe ? stripeSignature : (abacateSignature || stripeSignature)
    const webhookSecret = isStripe
      ? (process.env.STRIPE_WEBHOOK_SECRET || '')
      : (process.env.ABACATEPAY_WEBHOOK_SECRET || 'barbershop_abacate_sec_2026')

    const result = await processBillingWebhook({
      rawBody,
      signatureHeader,
      secret: webhookSecret,
      secretQuery,
      provider,
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
    return NextResponse.json(
      { error: 'Erro interno ao processar evento de faturamento' },
      { status: 500 }
    )
  }
}
