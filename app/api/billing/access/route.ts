import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/api-auth'
import { getSubscriptionAccess } from '@/lib/billing/saas-billing'

export const dynamic = 'force-dynamic'
export const revalidate = 0

// GET - Consultar status de acesso e dias restantes de trial/assinatura da barbearia
export async function GET(request: NextRequest) {
  try {
    const user = getAuthUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const targetShopIdParam = searchParams.get('barbershopId')

    let targetShopId: string | null = null

    if (user.role === 'DEVELOPER') {
      targetShopId = targetShopIdParam || user.barbershopId || null
    } else {
      targetShopId = user.barbershopId || null
      if (targetShopIdParam && targetShopIdParam !== targetShopId) {
        return NextResponse.json({ error: 'Acesso negado a dados de outra barbearia' }, { status: 403 })
      }
    }

    if (!targetShopId) {
      return NextResponse.json({ error: 'Nenhuma barbearia vinculada' }, { status: 400 })
    }

    const access = await getSubscriptionAccess(targetShopId)
    return NextResponse.json(access)
  } catch (error) {
    console.error('Erro ao consultar acesso de assinatura:', error)
    return NextResponse.json({ error: 'Erro ao consultar acesso' }, { status: 500 })
  }
}
