import crypto from 'crypto'
import { prisma } from '@/lib/prisma'

export interface CreateCheckoutParams {
  barbershopId: string
  planId: string
  successUrl: string
  cancelUrl: string
  customerEmail?: string
}

export interface CheckoutSessionResult {
  sessionId: string
  checkoutUrl: string
  provider: 'STRIPE'
}

/**
 * Validação criptográfica de assinatura de webhook do Stripe usando HMAC-SHA256
 * com janela de tolerância de timestamp (proteção nativa contra Replay Attacks).
 */
export function verifyStripeWebhookSignature({
  payload,
  signatureHeader,
  secret,
  toleranceInSeconds = 300, // 5 minutos padrão
}: {
  payload: string
  signatureHeader: string
  secret: string
  toleranceInSeconds?: number
}): { valid: boolean; reason?: string } {
  if (!signatureHeader || typeof signatureHeader !== 'string') {
    return { valid: false, reason: 'Cabeçalho stripe-signature ausente ou inválido' }
  }
  if (!secret) {
    return { valid: false, reason: 'STRIPE_WEBHOOK_SECRET não configurado' }
  }
  if (!payload) {
    return { valid: false, reason: 'Payload vazio' }
  }

  // O cabeçalho Stripe possui o formato: t=timestamp,v1=hash1,v1=hash2...
  const parts = signatureHeader.split(',')
  let timestamp: number | null = null
  const signatures: string[] = []

  for (const part of parts) {
    const [key, value] = part.trim().split('=')
    if (key === 't') {
      timestamp = parseInt(value, 10)
    } else if (key === 'v1' && value) {
      signatures.push(value)
    }
  }

  if (!timestamp || isNaN(timestamp) || signatures.length === 0) {
    return { valid: false, reason: 'Formato do cabeçalho stripe-signature inválido' }
  }

  // 1. Proteção contra Replay Attacks (tolerância de timestamp)
  const now = Math.floor(Date.now() / 1000)
  if (Math.abs(now - timestamp) > toleranceInSeconds) {
    return {
      valid: false,
      reason: `Assinatura expirada ou suspeita de replay attack (diferença: ${Math.abs(now - timestamp)}s > tolerância: ${toleranceInSeconds}s)`,
    }
  }

  // 2. Recalcula o hash esperado: HMAC-SHA256(`${timestamp}.${payload}`, secret)
  const signedPayload = `${timestamp}.${payload}`
  const expectedHash = crypto
    .createHmac('sha256', secret)
    .update(signedPayload, 'utf8')
    .digest('hex')

  const expectedBuffer = Buffer.from(expectedHash, 'hex')

  // 3. Comparação em tempo constante (timingSafeEqual) para prevenir Timing Attacks
  for (const sig of signatures) {
    try {
      const sigBuffer = Buffer.from(sig, 'hex')
      if (sigBuffer.length === expectedBuffer.length && crypto.timingSafeEqual(sigBuffer, expectedBuffer)) {
        return { valid: true }
      }
    } catch {}
  }

  return { valid: false, reason: 'Assinatura criptográfica não confere com o segredo do webhook' }
}

/**
 * Utilitário para gerar assinaturas válidas em testes unitários e de integração
 */
export function generateTestStripeSignature(
  payload: string,
  secret: string,
  timestamp: number = Math.floor(Date.now() / 1000)
): string {
  const signedPayload = `${timestamp}.${payload}`
  const hash = crypto
    .createHmac('sha256', secret)
    .update(signedPayload, 'utf8')
    .digest('hex')
  return `t=${timestamp},v1=${hash}`
}

/**
 * Criação da sessão de checkout no Stripe (Hosted Checkout)
 * Redireciona o usuário para o ambiente seguro do Stripe PCI-DSS nível 1.
 */
export async function createStripeCheckoutSession(
  params: CreateCheckoutParams
): Promise<CheckoutSessionResult> {
  const { barbershopId, planId, successUrl, cancelUrl, customerEmail } = params

  const plan = await prisma.plan.findUnique({
    where: { id: planId },
  })

  if (!plan || !plan.isActive) {
    throw new Error('Plano de assinatura não encontrado ou inativo')
  }

  const barbershop = await prisma.barbershop.findUnique({
    where: { id: barbershopId },
  })

  if (!barbershop) {
    throw new Error('Barbearia não encontrada')
  }

  const stripeSecretKey = process.env.STRIPE_SECRET_KEY

  // Se chave configurada em produção/sandbox, efetua chamada HTTP oficial à API da Stripe
  if (stripeSecretKey && !stripeSecretKey.startsWith('mock_')) {
    try {
      const body = new URLSearchParams()
      body.append('mode', 'subscription')
      body.append('success_url', successUrl)
      body.append('cancel_url', cancelUrl)
      body.append('client_reference_id', barbershopId)
      if (customerEmail) {
        body.append('customer_email', customerEmail)
      }
      body.append('metadata[barbershopId]', barbershopId)
      body.append('metadata[planId]', planId)
      body.append('line_items[0][price_data][currency]', plan.currency.toLowerCase())
      body.append('line_items[0][price_data][product_data][name]', `Assinatura BarberShop - Plano ${plan.name}`)
      body.append(
        'line_items[0][price_data][unit_amount]',
        Math.round(Number(plan.price) * 100).toString()
      )
      body.append('line_items[0][price_data][recurring][interval]', 'month')
      body.append('line_items[0][quantity]', '1')

      const res = await fetch('https://api.stripe.com/v1/checkout/sessions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${stripeSecretKey}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: body.toString(),
      })

      if (!res.ok) {
        const errJson = await res.json()
        throw new Error(errJson.error?.message || 'Falha ao criar sessão de checkout no Stripe')
      }

      const session = await res.json()
      return {
        sessionId: session.id,
        checkoutUrl: session.url,
        provider: 'STRIPE',
      }
    } catch (err: any) {
      console.error('Erro na integração Stripe Checkout API:', err)
      throw new Error(`Erro ao iniciar pagamento no gateway: ${err.message}`)
    }
  }

  // Modo sandbox/teste controlado quando rodando em CI/ambiente local sem chaves ativas
  const mockSessionId = `cs_test_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`
  const mockCheckoutUrl = `https://checkout.stripe.com/c/pay/${mockSessionId}`

  return {
    sessionId: mockSessionId,
    checkoutUrl: mockCheckoutUrl,
    provider: 'STRIPE',
  }
}
