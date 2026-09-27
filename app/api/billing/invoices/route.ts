import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'
export const revalidate = 0

// GET - Listar faturas (Invoices) do SaaS
export async function GET(request: NextRequest) {
  try {
    const user = getAuthUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const targetShopIdParam = searchParams.get('barbershopId')
    const statusParam = searchParams.get('status')

    const where: any = {}

    if (user.role === 'DEVELOPER') {
      if (targetShopIdParam) {
        where.barbershopId = targetShopIdParam
      }
    } else if (user.role === 'ADMIN') {
      const userShopId = user.barbershopId
      if (!userShopId) {
        return NextResponse.json({ error: 'Usuário não vinculado a uma barbearia' }, { status: 403 })
      }
      if (targetShopIdParam && targetShopIdParam !== userShopId) {
        return NextResponse.json({ error: 'Acesso negado a dados de outra barbearia' }, { status: 403 })
      }
      where.barbershopId = userShopId
    } else {
      return NextResponse.json({ error: 'Acesso restrito à gestão administrativa' }, { status: 403 })
    }

    if (statusParam) {
      where.status = statusParam
    }

    const invoices = await prisma.invoice.findMany({
      where,
      include: {
        subscription: {
          include: {
            plan: true,
          },
        },
        barbershop: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
      orderBy: { dueDate: 'desc' },
    })

    return NextResponse.json(invoices)
  } catch (error) {
    console.error('Erro ao buscar faturas:', error)
    return NextResponse.json({ error: 'Erro ao buscar faturas' }, { status: 500 })
  }
}
