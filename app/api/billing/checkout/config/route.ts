import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser, requireRole } from '@/lib/api-auth'
import { getCheckoutConfig, updateCheckoutConfig } from '@/lib/billing/checkout-config'

export const dynamic = 'force-dynamic'
export const revalidate = 0

// GET - Obter configurações de personalização do checkout
export async function GET() {
  try {
    const config = getCheckoutConfig()
    return NextResponse.json(config)
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Erro ao carregar configurações de checkout' },
      { status: 500 }
    )
  }
}

// POST - Atualizar configurações de personalização do checkout (DEVELOPER ou ADMIN)
export async function POST(request: NextRequest) {
  try {
    const user = getAuthUser(request)
    if (!requireRole(user, ['DEVELOPER', 'ADMIN'])) {
      return NextResponse.json(
        { error: 'Acesso negado: requer permissão de administrador' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const updated = updateCheckoutConfig(body)

    return NextResponse.json({
      success: true,
      message: 'Configurações de checkout atualizadas com sucesso',
      config: updated,
    })
  } catch (error: any) {
    console.error('Erro ao atualizar configurações de checkout:', error)
    return NextResponse.json(
      { error: error?.message || 'Falha ao salvar configurações' },
      { status: 500 }
    )
  }
}
