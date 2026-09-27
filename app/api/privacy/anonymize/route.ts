import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/api-auth'
import { anonymizeUserAccount } from '@/lib/privacy/lgpd-service'

export const dynamic = 'force-dynamic'
export const revalidate = 0

// POST - Executar anonimização da própria conta (Titular autenticado)
export async function POST(request: NextRequest) {
  try {
    const user = getAuthUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const { confirmation } = body

    if (confirmation !== 'CONFIRMO_EXCLUSAO') {
      return NextResponse.json(
        { error: 'Para confirmar a anonimização e exclusão da conta, envie confirmation: "CONFIRMO_EXCLUSAO".' },
        { status: 400 }
      )
    }

    const result = await anonymizeUserAccount(user.id, user.id)

    // Limpar cookie de autenticação na resposta
    const response = NextResponse.json(result)
    response.cookies.set('auth-token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 0,
    })

    return response
  } catch (error) {
    console.error('Erro ao anonimizar conta:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao processar anonimização da conta' },
      { status: 400 }
    )
  }
}
