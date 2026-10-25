import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthUser, requireRole } from '@/lib/api-auth'
import { generateUniqueSlug } from '@/lib/tenant'
import { parseBarbershopMetadata, serializeBarbershopMetadata } from '@/lib/operating-hours'

export const dynamic = 'force-dynamic'
export const revalidate = 0

// GET - Obter informações da barbearia do usuário autenticado (com auto-geração de slug se ausente e horários)
export async function GET(request: NextRequest) {
  try {
    const user = getAuthUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const requestedShopId = searchParams.get('barbershopId')

    let barbershopId = user.barbershopId
    if (user.role === 'DEVELOPER' && requestedShopId) {
      barbershopId = requestedShopId
    }

    if (!barbershopId) {
      return NextResponse.json({ error: 'Usuário não vinculado a uma barbearia' }, { status: 403 })
    }

    const shop = await prisma.barbershop.findUnique({
      where: { id: barbershopId },
      select: {
        id: true,
        name: true,
        slug: true,
        email: true,
        phone: true,
        address: true,
        logo: true,
        description: true,
        isActive: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    if (!shop) {
      return NextResponse.json({ error: 'Barbearia não encontrada' }, { status: 404 })
    }

    // Auto-backfill: Se a barbearia antiga ainda não possuir slug, gera um exclusivo imediatamente
    if (!shop.slug || !shop.slug.trim()) {
      const generatedSlug = await generateUniqueSlug(shop.name, shop.id)
      const updated = await prisma.barbershop.update({
        where: { id: shop.id },
        data: { slug: generatedSlug },
        select: {
          id: true,
          name: true,
          slug: true,
          email: true,
          phone: true,
          address: true,
          logo: true,
          description: true,
          isActive: true,
          status: true,
          createdAt: true,
          updatedAt: true,
        },
      })
      const parsed = parseBarbershopMetadata(updated.description)
      return NextResponse.json({
        ...updated,
        description: parsed.description,
        operatingHours: parsed.operatingHours,
        barberWorkDays: parsed.barberWorkDays,
        expenses: parsed.expenses,
      })
    }

    const parsed = parseBarbershopMetadata(shop.description)
    return NextResponse.json({
      ...shop,
      description: parsed.description,
      operatingHours: parsed.operatingHours,
      barberWorkDays: parsed.barberWorkDays,
      expenses: parsed.expenses,
    })
  } catch (error) {
    console.error('Erro ao buscar dados da barbearia:', error)
    return NextResponse.json({ error: 'Erro ao buscar dados da barbearia' }, { status: 500 })
  }
}

// PATCH - Atualizar dados da barbearia, horários de atendimento e slug exclusivo (ADMIN ou DEVELOPER)
export async function PATCH(request: NextRequest) {
  try {
    const user = getAuthUser(request)
    if (!user || !requireRole(user, ['ADMIN', 'DEVELOPER'])) {
      return NextResponse.json({ error: 'Acesso restrito a administradores da barbearia' }, { status: 403 })
    }

    const body = await request.json()
    const { name, phone, address, description, logo, slug, operatingHours, barberWorkDays, expenses, barbershopId: requestedShopId } = body

    let targetShopId = user.barbershopId
    if (user.role === 'DEVELOPER' && requestedShopId) {
      targetShopId = requestedShopId
    }

    if (!targetShopId) {
      return NextResponse.json({ error: 'Barbearia não especificada' }, { status: 400 })
    }

    const updateData: any = {}

    if (name !== undefined) updateData.name = name.trim()
    if (phone !== undefined) updateData.phone = phone ? phone.trim() : null
    if (address !== undefined) updateData.address = address ? address.trim() : null
    if (logo !== undefined) updateData.logo = logo ? logo.trim() : null

    // Atualização controlada de descrição e/ou horários de funcionamento e despesas
    if (description !== undefined || operatingHours !== undefined || barberWorkDays !== undefined || expenses !== undefined) {
      const current = await prisma.barbershop.findUnique({
        where: { id: targetShopId },
        select: { description: true },
      })
      const parsedCurrent = parseBarbershopMetadata(current?.description)
      const targetBio = description !== undefined ? (description ? description.trim() : '') : parsedCurrent.description
      const targetHours = operatingHours !== undefined ? operatingHours : parsedCurrent.operatingHours
      const targetBarberDays = barberWorkDays !== undefined ? barberWorkDays : parsedCurrent.barberWorkDays
      const targetExpenses = expenses !== undefined ? expenses : parsedCurrent.expenses

      updateData.description = serializeBarbershopMetadata(
        targetBio,
        targetHours,
        targetBarberDays,
        targetExpenses,
        parsedCurrent.inventory,
        parsedCurrent.stockMovements
      )
    }

    // Atualização e validação estrita de Slug com registro de redirect controlado
    if (slug !== undefined) {
      const { updateBarbershopSlug } = await import('@/lib/tenant')
      await updateBarbershopSlug(targetShopId, slug)
    }

    const updated = await prisma.barbershop.update({
      where: { id: targetShopId },
      data: updateData,
      select: {
        id: true,
        name: true,
        slug: true,
        email: true,
        phone: true,
        address: true,
        logo: true,
        description: true,
        isActive: true,
        status: true,
        updatedAt: true,
      },
    })

    const parsed = parseBarbershopMetadata(updated.description)
    return NextResponse.json({
      ...updated,
      description: parsed.description,
      operatingHours: parsed.operatingHours,
      barberWorkDays: parsed.barberWorkDays,
    })
  } catch (error) {
    console.error('Erro ao atualizar barbearia:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao atualizar dados da barbearia' },
      { status: 500 }
    )
  }
}
