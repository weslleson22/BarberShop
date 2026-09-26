import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthUser } from '@/lib/api-auth'

import { resolvePublicTenant } from '@/lib/tenant'

export const dynamic = 'force-dynamic'
export const revalidate = 0

// GET - Listar serviços públicos (ou da barbearia do usuário autenticado)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    let identifier = searchParams.get('slug') || searchParams.get('barbershopId')

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
