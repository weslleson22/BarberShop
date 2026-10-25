import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthUser, requireRole } from '@/lib/api-auth'
import {
  parseBarbershopMetadata,
  serializeBarbershopMetadata,
  type InventoryItem,
  type StockMovement,
  type ExpenseRecord,
} from '@/lib/operating-hours'

export const dynamic = 'force-dynamic'
export const revalidate = 0

// GET - Listar produtos do estoque e histórico de movimentações
export async function GET(request: NextRequest) {
  try {
    const user = getAuthUser(request)
    if (!user || !requireRole(user, ['ADMIN', 'DEVELOPER', 'BARBER'])) {
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

    return NextResponse.json({
      items: parsed.inventory || [],
      movements: parsed.stockMovements || [],
    })
  } catch (error) {
    console.error('Erro ao listar estoque:', error)
    return NextResponse.json({ error: 'Erro ao carregar estoque' }, { status: 500 })
  }
}

// POST - Criar Produto ou Registrar Movimentação de Entrada / Saída
export async function POST(request: NextRequest) {
  try {
    const user = getAuthUser(request)
    if (!user || !requireRole(user, ['ADMIN', 'DEVELOPER'])) {
      return NextResponse.json({ error: 'Acesso restrito a administradores' }, { status: 403 })
    }

    const body = await request.json()
    const { action = 'CREATE_PRODUCT', barbershopId: requestedShopId } = body

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
    const currentInventory = [...(parsed.inventory || [])]
    const currentMovements = [...(parsed.stockMovements || [])]
    const currentExpenses = [...(parsed.expenses || [])]

    // 1. CRIAR NOVO PRODUTO NO ESTOQUE
    if (action === 'CREATE_PRODUCT') {
      const {
        name,
        sku,
        category = 'REVENTA',
        currentStock = 0,
        minStock = 5,
        unit = 'UN',
        costPrice = 0,
        salePrice = 0,
        expirationDate,
        batch,
        notes,
      } = body

      if (!name || !name.trim()) {
        return NextResponse.json({ error: 'Nome do produto é obrigatório' }, { status: 400 })
      }

      const initialStock = Math.max(0, Number(currentStock) || 0)
      const parsedCost = Math.max(0, Number(costPrice) || 0)
      const parsedSale = Math.max(0, Number(salePrice) || 0)
      const parsedMin = Math.max(0, Number(minStock) || 0)

      const productId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `prod_${Date.now()}`

      const newItem: InventoryItem = {
        id: productId,
        name: name.trim(),
        sku: sku ? sku.trim() : null,
        category: category === 'USO_INTERNO' ? 'USO_INTERNO' : category === 'OUTROS' ? 'OUTROS' : 'REVENTA',
        currentStock: initialStock,
        minStock: parsedMin,
        unit: unit ? unit.trim().toUpperCase() : 'UN',
        costPrice: parsedCost,
        salePrice: parsedSale,
        expirationDate: expirationDate ? expirationDate.trim() : null,
        batch: batch ? batch.trim() : null,
        notes: notes ? notes.trim() : null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      const updatedInventory = [newItem, ...currentInventory]

      // Se cadastrou com saldo inicial > 0, registra a movimentação inicial
      let updatedMovements = currentMovements
      if (initialStock > 0) {
        const initialMovement: StockMovement = {
          id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `mov_${Date.now()}`,
          productId: newItem.id,
          productName: newItem.name,
          type: 'ENTRY',
          quantity: initialStock,
          unit: newItem.unit,
          costUnit: newItem.costPrice,
          totalValue: initialStock * newItem.costPrice,
          reason: 'ADJUSTMENT',
          date: new Date().toISOString().split('T')[0],
          notes: 'Saldo inicial cadastrado no inventário',
          createdAt: new Date().toISOString(),
        }
        updatedMovements = [initialMovement, ...currentMovements]
      }

      await prisma.barbershop.update({
        where: { id: targetShopId },
        data: {
          description: serializeBarbershopMetadata(
            parsed.description,
            parsed.operatingHours,
            parsed.barberWorkDays,
            currentExpenses,
            updatedInventory,
            updatedMovements
          ),
        },
      })

      return NextResponse.json({ item: newItem, movements: updatedMovements }, { status: 201 })
    }

    // 2. REGISTRAR MOVIMENTAÇÃO DE ENTRADA OU SAÍDA
    if (action === 'MOVEMENT') {
      const {
        productId,
        type, // 'ENTRY' ou 'EXIT'
        quantity,
        reason = 'PURCHASE',
        costUnit,
        date,
        notes,
        createExpense = false,
      } = body

      if (!productId) {
        return NextResponse.json({ error: 'Produto não informado' }, { status: 400 })
      }

      const productIndex = currentInventory.findIndex((p) => p.id === productId)
      if (productIndex === -1) {
        return NextResponse.json({ error: 'Produto não encontrado no estoque' }, { status: 404 })
      }

      const product = currentInventory[productIndex]
      const qty = Math.max(0, Number(quantity) || 0)
      if (qty <= 0) {
        return NextResponse.json({ error: 'A quantidade deve ser maior que zero' }, { status: 400 })
      }

      if (type !== 'ENTRY' && type !== 'EXIT') {
        return NextResponse.json({ error: 'Tipo de movimentação inválido (deve ser ENTRADA ou SAÍDA)' }, { status: 400 })
      }

      // Validação de estoque para saída
      if (type === 'EXIT' && product.currentStock < qty) {
        return NextResponse.json(
          { error: `Estoque insuficiente! Saldo atual é de apenas ${product.currentStock} ${product.unit}.` },
          { status: 400 }
        )
      }

      const effectiveCost = costUnit !== undefined && costUnit !== null ? Number(costUnit) : product.costPrice
      const totalVal = qty * (type === 'ENTRY' ? effectiveCost : product.salePrice > 0 ? product.salePrice : effectiveCost)

      // Atualiza saldo do produto
      const newStock = type === 'ENTRY' ? product.currentStock + qty : Math.max(0, product.currentStock - qty)
      const updatedProduct: InventoryItem = {
        ...product,
        currentStock: newStock,
        // Se for entrada e teve novo custo informado, atualiza o custo de referência
        costPrice: type === 'ENTRY' && effectiveCost > 0 ? effectiveCost : product.costPrice,
        updatedAt: new Date().toISOString(),
      }

      currentInventory[productIndex] = updatedProduct

      // Registra a movimentação no histórico
      const newMovement: StockMovement = {
        id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `mov_${Date.now()}`,
        productId: product.id,
        productName: product.name,
        type,
        quantity: qty,
        unit: product.unit,
        costUnit: effectiveCost,
        totalValue: totalVal,
        reason,
        date: date || new Date().toISOString().split('T')[0],
        notes: notes ? notes.trim() : null,
        createdAt: new Date().toISOString(),
      }

      const updatedMovements = [newMovement, ...currentMovements]

      // Se solicitado criar despesa automaticamente ao comprar estoque
      let updatedExpenses = currentExpenses
      if (createExpense && type === 'ENTRY' && totalVal > 0) {
        const newExpense: ExpenseRecord = {
          id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `exp_${Date.now()}`,
          title: `Compra Estoque: ${qty}x ${product.name}`,
          amount: totalVal,
          category: 'SUPPLIES',
          dueDate: date || new Date().toISOString().split('T')[0],
          status: 'PAID',
          paymentDate: date || new Date().toISOString().split('T')[0],
          notes: `Lançamento automático de compra de insumos/produtos. ${notes || ''}`.trim(),
          createdAt: new Date().toISOString(),
        }
        updatedExpenses = [newExpense, ...currentExpenses]
      }

      await prisma.barbershop.update({
        where: { id: targetShopId },
        data: {
          description: serializeBarbershopMetadata(
            parsed.description,
            parsed.operatingHours,
            parsed.barberWorkDays,
            updatedExpenses,
            currentInventory,
            updatedMovements
          ),
        },
      })

      return NextResponse.json({
        success: true,
        item: updatedProduct,
        movement: newMovement,
        newStock,
      })
    }

    return NextResponse.json({ error: 'Ação não suportada' }, { status: 400 })
  } catch (error) {
    console.error('Erro na operação de estoque:', error)
    return NextResponse.json({ error: 'Erro ao processar operação de estoque' }, { status: 500 })
  }
}

// PUT - Atualizar dados do Produto no Estoque
export async function PUT(request: NextRequest) {
  try {
    const user = getAuthUser(request)
    if (!user || !requireRole(user, ['ADMIN', 'DEVELOPER'])) {
      return NextResponse.json({ error: 'Acesso restrito a administradores' }, { status: 403 })
    }

    const body = await request.json()
    const {
      id,
      name,
      sku,
      category,
      currentStock,
      minStock,
      unit,
      costPrice,
      salePrice,
      expirationDate,
      batch,
      notes,
      barbershopId: requestedShopId,
    } = body

    if (!id) {
      return NextResponse.json({ error: 'ID do produto não informado' }, { status: 400 })
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
    const currentInventory = [...(parsed.inventory || [])]

    const index = currentInventory.findIndex((p) => p.id === id)
    if (index === -1) {
      return NextResponse.json({ error: 'Produto não encontrado' }, { status: 404 })
    }

    const existing = currentInventory[index]
    const updatedItem: InventoryItem = {
      ...existing,
      name: name !== undefined ? name.trim() : existing.name,
      sku: sku !== undefined ? (sku ? sku.trim() : null) : existing.sku,
      category: category !== undefined ? category : existing.category,
      currentStock: currentStock !== undefined ? Math.max(0, Number(currentStock)) : existing.currentStock,
      minStock: minStock !== undefined ? Math.max(0, Number(minStock)) : existing.minStock,
      unit: unit !== undefined ? unit.trim().toUpperCase() : existing.unit,
      costPrice: costPrice !== undefined ? Math.max(0, Number(costPrice)) : existing.costPrice,
      salePrice: salePrice !== undefined ? Math.max(0, Number(salePrice)) : existing.salePrice,
      expirationDate: expirationDate !== undefined ? (expirationDate ? expirationDate.trim() : null) : existing.expirationDate,
      batch: batch !== undefined ? (batch ? batch.trim() : null) : existing.batch,
      notes: notes !== undefined ? (notes ? notes.trim() : null) : existing.notes,
      updatedAt: new Date().toISOString(),
    }

    currentInventory[index] = updatedItem

    await prisma.barbershop.update({
      where: { id: targetShopId },
      data: {
        description: serializeBarbershopMetadata(
          parsed.description,
          parsed.operatingHours,
          parsed.barberWorkDays,
          parsed.expenses,
          currentInventory,
          parsed.stockMovements
        ),
      },
    })

    return NextResponse.json(updatedItem)
  } catch (error) {
    console.error('Erro ao atualizar produto do estoque:', error)
    return NextResponse.json({ error: 'Erro ao atualizar produto' }, { status: 500 })
  }
}

// DELETE - Remover Produto ou Movimentação
export async function DELETE(request: NextRequest) {
  try {
    const user = getAuthUser(request)
    if (!user || !requireRole(user, ['ADMIN', 'DEVELOPER'])) {
      return NextResponse.json({ error: 'Acesso restrito a administradores' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const productId = searchParams.get('productId')
    const movementId = searchParams.get('movementId')
    const requestedShopId = searchParams.get('barbershopId')

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

    if (productId) {
      const filteredInventory = (parsed.inventory || []).filter((p) => p.id !== productId)
      await prisma.barbershop.update({
        where: { id: targetShopId },
        data: {
          description: serializeBarbershopMetadata(
            parsed.description,
            parsed.operatingHours,
            parsed.barberWorkDays,
            parsed.expenses,
            filteredInventory,
            parsed.stockMovements
          ),
        },
      })
      return NextResponse.json({ success: true, message: 'Produto removido do estoque' })
    }

    if (movementId) {
      const filteredMovements = (parsed.stockMovements || []).filter((m) => m.id !== movementId)
      await prisma.barbershop.update({
        where: { id: targetShopId },
        data: {
          description: serializeBarbershopMetadata(
            parsed.description,
            parsed.operatingHours,
            parsed.barberWorkDays,
            parsed.expenses,
            parsed.inventory,
            filteredMovements
          ),
        },
      })
      return NextResponse.json({ success: true, message: 'Movimentação removida do histórico' })
    }

    return NextResponse.json({ error: 'Nenhum identificador fornecido para exclusão' }, { status: 400 })
  } catch (error) {
    console.error('Erro ao excluir item do estoque:', error)
    return NextResponse.json({ error: 'Erro ao excluir item' }, { status: 500 })
  }
}
