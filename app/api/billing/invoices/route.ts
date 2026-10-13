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
      let userShopId = user.barbershopId
      if (!userShopId) {
        const dbUser = await prisma.user.findUnique({
          where: { id: user.id },
          select: { barbershopId: true },
        })
        userShopId = dbUser?.barbershopId || null
      }
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

// DELETE - Excluir ou cancelar fatura (Exclusivo DEVELOPER)
export async function DELETE(request: NextRequest) {
  try {
    const user = getAuthUser(request)
    if (!user || user.role !== 'DEVELOPER') {
      return NextResponse.json({ error: 'Acesso restrito ao perfil DEVELOPER' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const invoiceId = searchParams.get('id')
    if (!invoiceId) {
      return NextResponse.json({ error: 'ID da fatura é obrigatório' }, { status: 400 })
    }

    const existing = await prisma.invoice.findUnique({
      where: { id: invoiceId },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Fatura não encontrada' }, { status: 404 })
    }

    // Se estiver paga, exige force=true para remover
    if (existing.status === 'PAID') {
      const force = searchParams.get('force') === 'true'
      if (!force) {
        return NextResponse.json(
          { error: 'Faturas pagas não podem ser excluídas diretamente (compliance financeiro). Use force=true para confirmar.' },
          { status: 400 }
        )
      }
    }

    await prisma.invoice.delete({
      where: { id: invoiceId },
    })

    return NextResponse.json({ success: true, message: 'Fatura excluída com sucesso!' })
  } catch (error: any) {
    console.error('Erro ao excluir fatura:', error)
    return NextResponse.json({ error: error.message || 'Erro ao excluir fatura' }, { status: 500 })
  }
}
