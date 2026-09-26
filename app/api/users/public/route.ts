// API pública para listar barbeiros (usada pelo agendamento)
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthUser } from '@/lib/api-auth'

import { resolvePublicTenant } from '@/lib/tenant'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(request: NextRequest) {
  try {
    console.log('=== API PÚBLICA DE BARBEIROS - INICIANDO BUSCA ===')
    
    const { searchParams } = new URL(request.url)
    const role = searchParams.get('role')
    let identifier = searchParams.get('slug') || searchParams.get('barbershopId')
    
    // Apenas permitir BARBER para uso público
    if (role && role !== 'BARBER') {
      return NextResponse.json(
        { error: 'Acesso não permitido para este papel' },
        { status: 403 }
      )
    }

    if (!identifier) {
      const authUser = getAuthUser(request)
      if (authUser?.barbershopId) {
        identifier = authUser.barbershopId
      }
    }

    const tenantResult = await resolvePublicTenant(identifier)
    if (!tenantResult.success) {
      return NextResponse.json({ error: tenantResult.error }, { status: tenantResult.status })
    }

    const barbershopId = tenantResult.tenant.id
    
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
        specialties: true,
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
