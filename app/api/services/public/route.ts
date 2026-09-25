import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthUser } from '@/lib/api-auth'

export const dynamic = 'force-dynamic'
export const revalidate = 0

// GET - Listar serviços públicos (ou da barbearia do usuário autenticado)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    let barbershopId = searchParams.get('barbershopId')

    if (!barbershopId) {
      const authUser = getAuthUser(request)
      if (authUser?.barbershopId) {
        barbershopId = authUser.barbershopId
      }
    }

    if (!barbershopId) {
      return NextResponse.json({ error: 'Barbearia não especificada' }, { status: 400 })
    }
    
    // Público só pode visualizar serviços que estejam ativos
    const where: any = {
      barbershopId,
      isActive: true,
    }

    const services = await prisma.service.findMany({
      where,
      orderBy: {
        name: 'asc',
      },
    })

    console.log('Serviços encontrados no Prisma:', services.length)
    console.log('IDs dos serviços:', services.map(s => ({ id: s.id, name: s.name, isActive: s.isActive })))

    return NextResponse.json(services)
  } catch (error) {
    console.error('Get services error:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar serviços' },
      { status: 500 }
    )
  }
}
