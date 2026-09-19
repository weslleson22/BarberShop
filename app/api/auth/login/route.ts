import { NextRequest, NextResponse } from 'next/server'
import { authenticateUser } from '@/lib/auth'
import { ensureClientForUser } from '@/lib/client-sync'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email e senha são obrigatórios' },
        { status: 400 }
      )
    }

    const result = await authenticateUser(email, password)

    if (!result) {
      return NextResponse.json(
        { error: 'Email ou senha incorretos' },
        { status: 401 }
      )
    }

    // Se for um usuário CLIENT, garante que ele possua o registro correspondente em Client
    if (result.user.role === 'CLIENT' && result.user.barbershopId) {
      try {
        await ensureClientForUser({
          userId: result.user.id,
          name: result.user.name,
          email: result.user.email,
          phone: result.user.phone,
          barbershopId: result.user.barbershopId,
        })
      } catch (syncErr) {
        console.error('Erro ao sincronizar Client no login:', syncErr)
      }
    }

    const response = NextResponse.json(result)
    response.cookies.set('auth-token', result.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: '/',
    })

    return response
  } catch (error) {
    console.error('Login error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Erro ao fazer login'
    const status = errorMessage.toLowerCase().includes('suspensa') ? 403 : 401
    return NextResponse.json(
      { error: errorMessage },
      { status }
    )
  }
}
