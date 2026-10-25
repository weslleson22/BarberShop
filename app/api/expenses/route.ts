import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthUser, requireRole } from '@/lib/api-auth'
import { parseBarbershopMetadata, serializeBarbershopMetadata, type ExpenseRecord } from '@/lib/operating-hours'

export const dynamic = 'force-dynamic'
export const revalidate = 0

// GET - Listar despesas / gastos da barbearia
export async function GET(request: NextRequest) {
  try {
    const user = getAuthUser(request)
    if (!user || !requireRole(user, ['ADMIN', 'DEVELOPER'])) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const requestedShopId = searchParams.get('barbershopId')

    let barbershopId = user.barbershopId
    if (user.role === 'DEVELOPER' && requestedShopId) {
      barbershopId = requestedShopId
    }

    if (!barbershopId) {
      return NextResponse.json({ error: 'Barbearia não especificada' }, { status: 400 })
    }

    const shop = await prisma.barbershop.findUnique({
      where: { id: barbershopId },
      select: { description: true },
    })

    if (!shop) {
      return NextResponse.json({ error: 'Barbearia não encontrada' }, { status: 404 })
    }

    const parsed = parseBarbershopMetadata(shop.description)
    return NextResponse.json(parsed.expenses || [])
  } catch (error) {
    console.error('Erro ao listar despesas:', error)
    return NextResponse.json({ error: 'Erro ao carregar despesas' }, { status: 500 })
  }
}

// POST - Criar novo gasto / despesa
export async function POST(request: NextRequest) {
  try {
    const user = getAuthUser(request)
    if (!user || !requireRole(user, ['ADMIN', 'DEVELOPER'])) {
      return NextResponse.json({ error: 'Acesso restrito a administradores' }, { status: 403 })
    }

    const body = await request.json()
    const { title, amount, category, dueDate, status, notes, barbershopId: requestedShopId } = body

    if (!title || !title.trim()) {
      return NextResponse.json({ error: 'O título ou descrição do gasto é obrigatório.' }, { status: 400 })
    }

    const numericAmount = Number(amount)
    if (isNaN(numericAmount) || numericAmount <= 0) {
      return NextResponse.json({ error: 'O valor do gasto deve ser maior que zero.' }, { status: 400 })
    }

    let targetShopId = user.barbershopId
    if (user.role === 'DEVELOPER' && requestedShopId) {
      targetShopId = requestedShopId
    }

    if (!targetShopId) {
      return NextResponse.json({ error: 'Barbearia não especificada' }, { status: 400 })
    }

    const shop = await prisma.barbershop.findUnique({
      where: { id: targetShopId },
      select: { description: true },
    })

    if (!shop) {
      return NextResponse.json({ error: 'Barbearia não encontrada' }, { status: 404 })
    }

    const parsed = parseBarbershopMetadata(shop.description)

    const newExpense: ExpenseRecord = {
      id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `exp_${Date.now()}`,
      title: title.trim(),
      amount: numericAmount,
      category: category || 'OTHER',
      dueDate: dueDate || new Date().toISOString().split('T')[0],
      status: status === 'PAID' ? 'PAID' : 'PENDING',
      paymentDate: status === 'PAID' ? new Date().toISOString().split('T')[0] : null,
      notes: notes ? notes.trim() : null,
      createdAt: new Date().toISOString(),
    }

    const updatedExpenses = [newExpense, ...(parsed.expenses || [])]

    await prisma.barbershop.update({
      where: { id: targetShopId },
      data: {
        description: serializeBarbershopMetadata(
          parsed.description,
          parsed.operatingHours,
          parsed.barberWorkDays,
          updatedExpenses,
          parsed.inventory,
          parsed.stockMovements
        ),
      },
    })

    return NextResponse.json(newExpense, { status: 201 })
  } catch (error) {
    console.error('Erro ao cadastrar despesa:', error)
    return NextResponse.json({ error: 'Erro ao cadastrar despesa' }, { status: 500 })
  }
}

// PUT - Atualizar despesa existente (ex: marcar como paga, editar valor)
export async function PUT(request: NextRequest) {
  try {
    const user = getAuthUser(request)
    if (!user || !requireRole(user, ['ADMIN', 'DEVELOPER'])) {
      return NextResponse.json({ error: 'Acesso restrito a administradores' }, { status: 403 })
    }

    const body = await request.json()
    const { id, title, amount, category, dueDate, status, notes, barbershopId: requestedShopId } = body

    if (!id) {
      return NextResponse.json({ error: 'ID do gasto não informado' }, { status: 400 })
    }

    let targetShopId = user.barbershopId
    if (user.role === 'DEVELOPER' && requestedShopId) {
      targetShopId = requestedShopId
    }

    if (!targetShopId) {
      return NextResponse.json({ error: 'Barbearia não especificada' }, { status: 400 })
    }

    const shop = await prisma.barbershop.findUnique({
      where: { id: targetShopId },
      select: { description: true },
    })

    if (!shop) {
      return NextResponse.json({ error: 'Barbearia não encontrada' }, { status: 404 })
    }

    const parsed = parseBarbershopMetadata(shop.description)
    const existing = parsed.expenses || []

    const index = existing.findIndex((e) => e.id === id)
    if (index === -1) {
      return NextResponse.json({ error: 'Despesa não encontrada' }, { status: 404 })
    }

    const currentItem = existing[index]
    const updatedItem: ExpenseRecord = {
      ...currentItem,
      title: title !== undefined ? title.trim() : currentItem.title,
      amount: amount !== undefined ? Number(amount) : currentItem.amount,
      category: category !== undefined ? category : currentItem.category,
      dueDate: dueDate !== undefined ? dueDate : currentItem.dueDate,
      status: status !== undefined ? status : currentItem.status,
      paymentDate:
        status === 'PAID'
          ? currentItem.paymentDate || new Date().toISOString().split('T')[0]
          : status === 'PENDING'
          ? null
          : currentItem.paymentDate,
      notes: notes !== undefined ? notes : currentItem.notes,
    }

    existing[index] = updatedItem

    await prisma.barbershop.update({
      where: { id: targetShopId },
      data: {
        description: serializeBarbershopMetadata(
          parsed.description,
          parsed.operatingHours,
          parsed.barberWorkDays,
          existing,
          parsed.inventory,
          parsed.stockMovements
        ),
      },
    })

    return NextResponse.json(updatedItem)
  } catch (error) {
    console.error('Erro ao atualizar despesa:', error)
    return NextResponse.json({ error: 'Erro ao atualizar despesa' }, { status: 500 })
  }
}

// DELETE - Remover despesa
export async function DELETE(request: NextRequest) {
  try {
    const user = getAuthUser(request)
    if (!user || !requireRole(user, ['ADMIN', 'DEVELOPER'])) {
      return NextResponse.json({ error: 'Acesso restrito a administradores' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const requestedShopId = searchParams.get('barbershopId')

    if (!id) {
      return NextResponse.json({ error: 'ID da despesa não informado' }, { status: 400 })
    }

    let targetShopId = user.barbershopId
    if (user.role === 'DEVELOPER' && requestedShopId) {
      targetShopId = requestedShopId
    }

    if (!targetShopId) {
      return NextResponse.json({ error: 'Barbearia não especificada' }, { status: 400 })
    }

    const shop = await prisma.barbershop.findUnique({
      where: { id: targetShopId },
      select: { description: true },
    })

    if (!shop) {
      return NextResponse.json({ error: 'Barbearia não encontrada' }, { status: 404 })
    }

    const parsed = parseBarbershopMetadata(shop.description)
    const filteredExpenses = (parsed.expenses || []).filter((e) => e.id !== id)

    await prisma.barbershop.update({
      where: { id: targetShopId },
      data: {
        description: serializeBarbershopMetadata(
          parsed.description,
          parsed.operatingHours,
          parsed.barberWorkDays,
          filteredExpenses,
          parsed.inventory,
          parsed.stockMovements
        ),
      },
    })

    return NextResponse.json({ success: true, message: 'Despesa excluída com sucesso' })
  } catch (error) {
    console.error('Erro ao excluir despesa:', error)
    return NextResponse.json({ error: 'Erro ao excluir despesa' }, { status: 500 })
  }
}
