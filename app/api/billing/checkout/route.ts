import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser, requireRole } from '@/lib/api-auth'
import { createStripeCheckoutSession } from '@/lib/billing/stripe-provider'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * POST /api/billing/checkout
 *
 * Inicia o fluxo de contratação/assinatura para a barbearia do usuário logado.
 *
 * Regras de Segurança:
 * 1. Autenticação obrigatória (somente ADMIN ou DEVELOPER).
 * 2. Barbershop isolado: o ADMIN só pode iniciar checkout para sua própria barbearia.
 * 3. NUNCA ativa a assinatura pelo frontend; retorna a URL segura do gateway (Stripe Checkout).
 *    A ativação ocorrerá exclusivamente através da confirmação por Webhook assinado.
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
    const { planId, successUrl, cancelUrl } = body

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

    if (!plan || !plan.isActive) {
      return NextResponse.json(
        { error: 'Plano não encontrado ou inativo para novas contratações' },
        { status: 404 }
      )
    }

    // 2. URLs de retorno para a interface após pagamento
    const origin = request.nextUrl.origin || 'http://localhost:3000'
    const finalSuccessUrl = successUrl || `${origin}/dashboard?payment=success&session_id={CHECKOUT_SESSION_ID}`
    const finalCancelUrl = cancelUrl || `${origin}/dashboard?payment=canceled`

    // 3. Cria sessão de checkout hospedada no provedor (Stripe)
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
  } catch (error: any) {
    console.error('Erro ao gerar checkout de assinatura SaaS:', error)
    return NextResponse.json(
      { error: error?.message || 'Erro ao iniciar contratação' },
      { status: 500 }
    )
  }
}
