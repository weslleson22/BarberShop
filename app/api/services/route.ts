import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthUser } from '@/lib/api-auth'

export const dynamic = 'force-dynamic'
export const revalidate = 0

// GET - Listar serviços
export async function GET(request: NextRequest) {
  try {
    const decoded = getAuthUser(request)
    if (!decoded) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const active = searchParams.get('active')
    const requestedShopId = searchParams.get('barbershopId')

    let barbershopId: string | null = null
    if (decoded.role === 'DEVELOPER') {
      barbershopId = requestedShopId || decoded.barbershopId || null
    } else {
      barbershopId = decoded.barbershopId || null
      if (!barbershopId) {
        return NextResponse.json({ error: 'Usuário não vinculado a uma barbearia' }, { status: 403 })
      }
    }

    const where: any = {}
    if (barbershopId) {
      where.barbershopId = barbershopId
    }

    if (active !== null) {
      where.isActive = active === 'true'
    } else if (decoded.role === 'CLIENT') {
      where.isActive = true
    }

    const services = await prisma.service.findMany({
      where,
      orderBy: {
        name: 'asc',
      },
    })

    return NextResponse.json(services)
  } catch (error) {
    console.error('Get services error:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar serviços' },
      { status: 500 }
    )
  }
}

// POST - Criar serviço
export async function POST(request: NextRequest) {
  try {
    const decoded = getAuthUser(request)
    if (!decoded || (decoded.role !== 'ADMIN' && decoded.role !== 'DEVELOPER')) {
      return NextResponse.json({ error: 'Apenas administradores podem criar serviços' }, { status: 403 })
    }

    const data = await request.json()
    const { name, description, price, duration, barbershopId: bodyShopId } = data

    let targetBarbershopId: string | null = null
    if (decoded.role === 'DEVELOPER') {
      targetBarbershopId = bodyShopId || decoded.barbershopId || null
    } else {
      targetBarbershopId = decoded.barbershopId || null
    }

    if (!targetBarbershopId) {
      return NextResponse.json({ error: 'Barbearia obrigatória' }, { status: 400 })
    }

    if (!name || !price || !duration) {
      return NextResponse.json(
        { error: 'Nome, preço e duração são obrigatórios' },
        { status: 400 }
      )
    }

    const service = await prisma.service.create({
      data: {
        name,
        description,
        price: parseFloat(price),
        duration: parseInt(duration),
        barbershopId: targetBarbershopId,
      },
    })

    return NextResponse.json(service, { status: 201 })
  } catch (error) {
    console.error('Create service error:', error)
    return NextResponse.json(
      { error: 'Erro ao criar serviço' },
      { status: 500 }
    )
  }
}

// PUT - Atualizar serviço
export async function PUT(request: NextRequest) {
  try {
    const decoded = getAuthUser(request)
    if (!decoded || (decoded.role !== 'ADMIN' && decoded.role !== 'DEVELOPER')) {
      return NextResponse.json({ error: 'Apenas administradores podem atualizar serviços' }, { status: 403 })
    }

    const data = await request.json()
    const { id, name, description, price, duration, isActive } = data

    if (!id) {
      return NextResponse.json(
        { error: 'ID do serviço é obrigatório' },
        { status: 400 }
      )
    }

    if (!name || !price || !duration) {
      return NextResponse.json(
        { error: 'Nome, preço e duração são obrigatórios' },
        { status: 400 }
      )
    }

    const serviceWhere: any = { id }
    if (decoded.role !== 'DEVELOPER') {
      if (!decoded.barbershopId) {
        return NextResponse.json({ error: 'Usuário não vinculado a uma barbearia' }, { status: 403 })
      }
      serviceWhere.barbershopId = decoded.barbershopId
    }

    // Verificar se serviço existe e pertence à barbearia do usuário
    const existingService = await prisma.service.findFirst({
      where: serviceWhere,
    })

    if (!existingService) {
      return NextResponse.json(
        { error: 'Serviço não encontrado' },
        { status: 404 }
      )
    }

    // Atualizar serviço
    const service = await prisma.service.update({
      where: { id: id },
      data: {
        name,
        description,
        price: parseFloat(price),
        duration: parseInt(duration),
        isActive: isActive !== undefined ? isActive : existingService.isActive,
      },
    })

    return NextResponse.json(service)
  } catch (error) {
    console.error('Update service error:', error)
    return NextResponse.json(
      { error: 'Erro ao atualizar serviço' },
      { status: 500 }
    )
  }
}
