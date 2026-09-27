import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthUser } from '@/lib/api-auth'
import { generateToken } from '@/lib/auth'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(request: NextRequest) {
  try {
    const user = getAuthUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    if (!user.barbershopId) {
      return NextResponse.json({
        status: 'DEVELOPER_GLOBAL',
        isActive: true,
        message: 'Usuário sem barbearia vinculada (acesso de plataforma)',
      })
    }

    const shop = await prisma.barbershop.findUnique({
      where: { id: user.barbershopId },
      select: {
        id: true,
        name: true,
        status: true,
        isActive: true,
        trialEndsAt: true,
        createdAt: true,
      },
    })

    if (!shop) {
      return NextResponse.json({ error: 'Barbearia não encontrada' }, { status: 404 })
    }

    const trialEnd = shop.trialEndsAt
      ? new Date(shop.trialEndsAt).getTime()
      : new Date(shop.createdAt).getTime() + 7 * 24 * 60 * 60 * 1000

    const now = Date.now()
    const isTrialActive = now < trialEnd
    const daysRemaining = Math.max(0, Math.ceil((trialEnd - now) / (1000 * 60 * 60 * 24)))

    // Se o status da barbearia foi atualizado (ex: aprovado pelo desenvolvedor),
    // atualizamos o token do cookie para desbloquear o middleware imediatamente.
    const newToken = generateToken({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      barbershopId: shop.id,
      barbershopStatus: shop.status,
      trialEndsAt: shop.trialEndsAt ? shop.trialEndsAt.toISOString() : new Date(trialEnd).toISOString(),
    })

    const response = NextResponse.json({
      id: shop.id,
      name: shop.name,
      status: shop.status,
      isActive: shop.isActive,
      trialEndsAt: shop.trialEndsAt || new Date(trialEnd),
      daysRemaining,
      isTrialActive,
    })

    response.cookies.set('auth-token', newToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60,
      path: '/',
    })

    return response
  } catch (error) {
    console.error('Erro ao verificar status da barbearia:', error)
    return NextResponse.json({ error: 'Erro interno ao consultar status' }, { status: 500 })
  }
}
