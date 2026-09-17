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

    let barbershopId = decoded.barbershopId
    if (!barbershopId && decoded.id) {
      const dbUser = await prisma.user.findUnique({
        where: { id: decoded.id },
        select: { barbershopId: true }
      })
      barbershopId = dbUser?.barbershopId
    }
    if (!barbershopId) {
      const firstShop = await prisma.barbershop.findFirst({ select: { id: true } })
      barbershopId = firstShop?.id
    }

    const where: any = barbershopId ? { barbershopId } : {}

    if (active !== null) {
      where.isActive = active === 'true'
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
    if (!decoded) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    let barbershopId = decoded.barbershopId
    if (!barbershopId && decoded.id) {
      const dbUser = await prisma.user.findUnique({
        where: { id: decoded.id },
        select: { barbershopId: true }
      })
      barbershopId = dbUser?.barbershopId
    }
    if (!barbershopId) {
      const firstShop = await prisma.barbershop.findFirst({ select: { id: true } })
      barbershopId = firstShop?.id
    }
    
    if (!barbershopId) {
      return NextResponse.json({ error: 'Barbearia não identificada' }, { status: 401 })
    }
    
    if (decoded.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Apenas administradores podem criar serviços' }, { status: 403 })
    }

    const data = await request.json()
    const { name, description, price, duration } = data

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
        barbershopId,
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
    if (!decoded) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    let barbershopId = decoded.barbershopId
    if (!barbershopId && decoded.id) {
      const dbUser = await prisma.user.findUnique({
        where: { id: decoded.id },
        select: { barbershopId: true }
      })
      barbershopId = dbUser?.barbershopId
    }
    if (!barbershopId) {
      const firstShop = await prisma.barbershop.findFirst({ select: { id: true } })
      barbershopId = firstShop?.id
    }
    
    if (!barbershopId) {
      return NextResponse.json({ error: 'Barbearia não identificada' }, { status: 401 })
    }
    
    if (decoded.role !== 'ADMIN') {
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

    // Verificar se serviço existe
    const existingService = await prisma.service.findUnique({
      where: { id: id }
    })

    if (!existingService) {
      return NextResponse.json(
        { error: 'Serviço não encontrado' },
        { status: 404 }
      )
    }

    // Verificar se serviço pertence à barbearia do usuário
    if (existingService.barbershopId !== decoded.barbershopId) {
      return NextResponse.json(
        { error: 'Você não pode atualizar este serviço' },
        { status: 403 }
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
