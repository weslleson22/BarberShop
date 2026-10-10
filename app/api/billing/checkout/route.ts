import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser, requireRole } from '@/lib/api-auth'
import { createAbacateCheckoutSession } from '@/lib/billing/abacatepay-provider'
import { createStripeCheckoutSession } from '@/lib/billing/stripe-provider'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * POST /api/billing/checkout
 *
 * Inicia o fluxo de contratação/assinatura para a barbearia do usuário logado.
 * Suporta AbacatePay v2 (Hosted Checkout ou Checkout Transparente PIX) e Stripe.
 */
export async function POST(request: NextRequest) {
  try {
    const user = getAuthUser(request)
    if (!requireRole(user, ['ADMIN', 'DEVELOPER'])) {
      return NextResponse.json(
        { error: 'Acesso restrito ao administrador do estabelecimento' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const {
      planId,
      successUrl,
      cancelUrl,
      mode = 'HOSTED', // 'HOSTED' ou 'TRANSPARENT'
      customerTaxId,
      provider: requestedProvider,
    } = body

    if (!planId) {
      return NextResponse.json(
        { error: 'Parâmetro planId é obrigatório' },
        { status: 400 }
      )
    }

    const barbershopId = user.barbershopId
    if (!barbershopId) {
      return NextResponse.json(
        { error: 'Usuário não está vinculado a uma barbearia' },
        { status: 400 }
      )
    }

    // 1. Valida existência e ativação do plano
    const plan = await prisma.plan.findUnique({
      where: { id: planId },
    })

    if (!plan || plan.status === 'INACTIVE' || !plan.isActive) {
      return NextResponse.json(
        { error: 'Plano não encontrado ou inativo para novas contratações' },
        { status: 404 }
      )
    }

    if (plan.planType === 'COURTESY') {
      return NextResponse.json(
        { error: 'Planos de cortesia não possuem cobrança ou checkout financeiro' },
        { status: 400 }
      )
    }

    // 2. URLs de retorno para a interface após pagamento
    const origin = request.nextUrl.origin || 'http://localhost:3000'
    const finalSuccessUrl = successUrl || `${origin}/dashboard/assinatura?payment=success&plan_id=${plan.id}`
    const finalCancelUrl = cancelUrl || `${origin}/dashboard/assinatura?payment=canceled`

    // 3. Determinação do provedor
    // Se o plano tiver provedor explicitamente configurado, respeita.
    // Se não, verifica requestedProvider ou variável BILLING_DEFAULT_PROVIDER.
    let provider = requestedProvider || plan.provider

    if (!provider) {
      provider = process.env.NODE_ENV === 'test' ? 'STRIPE' : (process.env.BILLING_DEFAULT_PROVIDER || 'ABACATEPAY')
    }

    if (provider === 'STRIPE') {
      const session = await createStripeCheckoutSession({
        barbershopId,
        planId: plan.id,
        successUrl: finalSuccessUrl,
        cancelUrl: finalCancelUrl,
        customerEmail: user.email,
      })

      return NextResponse.json({
        checkoutUrl: session.checkoutUrl,
        sessionId: session.sessionId,
        provider: session.provider,
        plan: {
          id: plan.id,
          name: plan.name,
          price: Number(plan.price),
          currency: plan.currency,
          billingInterval: plan.billingInterval,
        },
      })
    }

    // 4. Criação de Checkout ou PIX na AbacatePay
    const abacateSession = await createAbacateCheckoutSession({
      barbershopId,
      planId: plan.id,
      successUrl: finalSuccessUrl,
      cancelUrl: finalCancelUrl,
      customerEmail: user.email,
      customerName: user.name,
      customerPhone: user.phone || undefined,
      customerTaxId: customerTaxId || undefined,
      mode: mode === 'TRANSPARENT' ? 'TRANSPARENT' : 'HOSTED',
    })

    return NextResponse.json({
      checkoutUrl: abacateSession.checkoutUrl,
      checkoutId: abacateSession.checkoutId,
      provider: 'ABACATEPAY',
      mode: mode === 'TRANSPARENT' ? 'TRANSPARENT' : 'HOSTED',
      pix: abacateSession.pix || null,
      plan: {
        id: plan.id,
        name: plan.name,
        price: Number(plan.price),
        currency: plan.currency,
        billingInterval: plan.billingInterval,
      },
    })
  } catch (error: any) {
    console.error('Erro ao gerar checkout de assinatura SaaS:', error)
    return NextResponse.json(
      { error: error?.message || 'Erro ao iniciar contratação' },
      { status: 500 }
    )
  }
}
