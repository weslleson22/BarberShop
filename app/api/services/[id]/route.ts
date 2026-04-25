import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// PUT - Atualizar serviço (completo ou apenas isActive)
export async function PUT(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const token = request.cookies.get('auth-token')?.value
    if (!token) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const decoded = verifyToken(token)
    const { id } = await context.params

    // Verificar se o serviço existe e pertence à barbearia do usuário
    const existingService = await prisma.service.findFirst({
      where: {
        id,
        barbershopId: decoded.barbershopId,
      },
    })

    if (!existingService) {
      return NextResponse.json({ error: 'Serviço não encontrado' }, { status: 404 })
    }

    const body = await request.json()
    
    // Se apenas isActive for enviado, é um toggle
    if (body.hasOwnProperty('isActive') && Object.keys(body).length === 1) {
      const updatedService = await prisma.service.update({
        where: { id },
        data: { isActive: body.isActive },
      })
      return NextResponse.json(updatedService)
    }
    
    // Atualização completa do serviço
    const { name, description, price, duration, isActive } = body
    const updatedService = await prisma.service.update({
      where: { id },
      data: {
        name,
        description,
        price: parseFloat(price),
        duration: parseInt(duration),
        isActive,
      },
    })

    return NextResponse.json(updatedService)
  } catch (error) {
    console.error('Update service error:', error)
    return NextResponse.json(
      { error: 'Erro ao atualizar serviço' },
      { status: 500 }
    )
  }
}

// DELETE - Excluir serviço
export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const token = request.cookies.get('auth-token')?.value
    if (!token) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const decoded = verifyToken(token)
    const { id } = await context.params

    // Verificar se o serviço existe e pertence à barbearia do usuário
    const existingService = await prisma.service.findFirst({
      where: {
        id,
        barbershopId: decoded.barbershopId,
      },
      include: {
        _count: {
          select: {
            appointments: true,
          },
        },
      },
    })

    if (!existingService) {
      return NextResponse.json({ error: 'Serviço não encontrado' }, { status: 404 })
    }

    // Verificar se há agendamentos associados
    if (existingService._count.appointments > 0) {
      return NextResponse.json(
        { error: 'Não é possível excluir um serviço que possui agendamentos associados' },
        { status: 400 }
      )
    }

    await prisma.service.delete({
      where: { id },
    })

    return NextResponse.json({ message: 'Serviço excluído com sucesso' })
  } catch (error) {
    console.error('Delete service error:', error)
    return NextResponse.json(
      { error: 'Erro ao excluir serviço' },
      { status: 500 }
    )
  }
}
