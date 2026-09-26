import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthUser, requireRole } from '@/lib/api-auth'
import { generateUniqueSlug, slugify } from '@/lib/tenant'

export const dynamic = 'force-dynamic'
export const revalidate = 0

// GET - Obter informações da barbearia do usuário autenticado (com auto-geração de slug se ausente)
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
      return NextResponse.json(updated)
    }

    return NextResponse.json(shop)
  } catch (error) {
    console.error('Erro ao buscar dados da barbearia:', error)
    return NextResponse.json({ error: 'Erro ao buscar dados da barbearia' }, { status: 500 })
  }
}

// PATCH - Atualizar dados da barbearia e configurar slug exclusivo (ADMIN ou DEVELOPER)
export async function PATCH(request: NextRequest) {
  try {
    const user = getAuthUser(request)
    if (!user || !requireRole(user, ['ADMIN', 'DEVELOPER'])) {
      return NextResponse.json({ error: 'Acesso restrito a administradores da barbearia' }, { status: 403 })
    }

    const body = await request.json()
    const { name, phone, address, description, logo, slug, barbershopId: requestedShopId } = body

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
    if (description !== undefined) updateData.description = description ? description.trim() : null
    if (logo !== undefined) updateData.logo = logo ? logo.trim() : null

    // Atualização e validação estrita de Slug
    if (slug !== undefined) {
      const cleanSlug = slugify(slug)

      if (!cleanSlug || cleanSlug.length < 2) {
        return NextResponse.json(
          { error: 'O slug deve conter no mínimo 2 caracteres alfanuméricos válidos.' },
          { status: 400 }
        )
      }

      if (cleanSlug.length > 50) {
        return NextResponse.json(
          { error: 'O slug deve conter no máximo 50 caracteres.' },
          { status: 400 }
        )
      }

      // Verificar unicidade do slug no banco de dados
      const existing = await prisma.barbershop.findFirst({
        where: {
          slug: cleanSlug,
          id: { not: targetShopId },
        },
        select: { id: true, name: true },
      })

      if (existing) {
        return NextResponse.json(
          { error: `O slug "${cleanSlug}" já está em uso por outro estabelecimento. Por favor, escolha outro.` },
          { status: 400 }
        )
      }

      updateData.slug = cleanSlug
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

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Erro ao atualizar barbearia:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao atualizar dados da barbearia' },
      { status: 500 }
    )
  }
}
