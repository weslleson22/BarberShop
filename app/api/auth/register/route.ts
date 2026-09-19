import { NextRequest, NextResponse } from 'next/server'
import { createUser, createBarbershop } from '@/lib/auth'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function POST(request: NextRequest) {
  try {
    const { type, ...data } = await request.json()

    if (type === 'barbershop') {
      // Criar nova barbearia com admin
      const result = await createBarbershop(data)

      const response = NextResponse.json(result)
      response.cookies.set('auth-token', result.adminUser.token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60,
      })

      return response
    } else {
      // Criar cliente regular — NUNCA permitir escalada de privilégios via payload público
      if (!data.name || !data.email || !data.password) {
        return NextResponse.json(
          { error: 'Nome, email e senha são obrigatórios' },
          { status: 400 }
        )
      }

      const result = await createUser({
        name: data.name,
        email: data.email,
        password: data.password,
        phone: data.phone,
        barbershopId: data.barbershopId || null,
        role: 'CLIENT',
      })

      const response = NextResponse.json(result)
      response.cookies.set('auth-token', result.token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60,
      })

      return response
    }
  } catch (error) {
    console.error('Register error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao criar conta' },
      { status: 400 }
    )
  }
}
