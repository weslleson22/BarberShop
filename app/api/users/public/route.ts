// API pública para listar barbeiros (usada pelo agendamento)
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthUser } from '@/lib/api-auth'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(request: NextRequest) {
  try {
    console.log('=== API PÚBLICA DE BARBEIROS - INICIANDO BUSCA ===')
    
    const { searchParams } = new URL(request.url)
    const role = searchParams.get('role')
    let barbershopId = searchParams.get('barbershopId')
    
    // Apenas permitir BARBER para uso público
    if (role && role !== 'BARBER') {
      return NextResponse.json(
        { error: 'Acesso não permitido para este papel' },
        { status: 403 }
      )
    }

    if (!barbershopId) {
      const authUser = getAuthUser(request)
      if (authUser?.barbershopId) {
        barbershopId = authUser.barbershopId
      }
    }

    if (!barbershopId) {
      const activeShop = await prisma.barbershop.findFirst({
        where: { isActive: true },
        select: { id: true },
      })
      barbershopId = activeShop?.id || null
    }

    if (!barbershopId) {
      return NextResponse.json([])
    }
    
    const where: any = {
      role: 'BARBER',
      isActive: true,
      barbershopId,
    }
    
    console.log('Buscando barbeiros públicos com filtro:', where)
    
    const barbers = await prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        avatar: true,
        bio: true,
        phone: true,
      },
      orderBy: {
        name: 'asc',
      },
    })

    console.log('Barbeiros encontrados:', barbers.length)
    console.log('Barbeiros:', barbers.map(b => ({ id: b.id, name: b.name, email: b.email })))

    return NextResponse.json(barbers)
  } catch (error) {
    console.error('Get public barbers error:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar barbeiros' },
      { status: 500 }
    )
  }
}
