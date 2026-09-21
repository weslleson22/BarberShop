import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthUser, requireRole } from '@/lib/api-auth'

export const dynamic = 'force-dynamic'
export const revalidate = 0

// PUT - Atualizar serviço (completo ou apenas isActive)
export async function PUT(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const user = getAuthUser(request)
    if (!requireRole(user, ['DEVELOPER', 'ADMIN'])) {
      return NextResponse.json({ error: 'Apenas administradores podem atualizar serviços' }, { status: 403 })
    }

    const { id } = await context.params

    const serviceWhere: any = { id }
    if (user.role !== 'DEVELOPER') {
      if (!user.barbershopId) {
        return NextResponse.json({ error: 'Usuário não vinculado a uma barbearia' }, { status: 403 })
      }
      serviceWhere.barbershopId = user.barbershopId
    }

    // Verificar se o serviço existe e pertence à barbearia do usuário
    const existingService = await prisma.service.findFirst({
      where: serviceWhere,
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
        name: name !== undefined ? name : existingService.name,
        description: description !== undefined ? description : existingService.description,
        price: price !== undefined ? parseFloat(price) : existingService.price,
        duration: duration !== undefined ? parseInt(duration) : existingService.duration,
        isActive: isActive !== undefined ? isActive : existingService.isActive,
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
    const user = getAuthUser(request)
    if (!requireRole(user, ['DEVELOPER', 'ADMIN'])) {
      return NextResponse.json({ error: 'Apenas administradores podem excluir serviços' }, { status: 403 })
    }

    const { id } = await context.params

    const serviceWhere: any = { id }
    if (user.role !== 'DEVELOPER') {
      if (!user.barbershopId) {
        return NextResponse.json({ error: 'Usuário não vinculado a uma barbearia' }, { status: 403 })
      }
      serviceWhere.barbershopId = user.barbershopId
    }

    // Verificar se o serviço existe e pertence à barbearia do usuário
    const existingService = await prisma.service.findFirst({
      where: serviceWhere,
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
