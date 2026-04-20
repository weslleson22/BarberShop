import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET - Listar serviços públicos (sem autenticação)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const active = searchParams.get('active')

    // Usando o ID real da barbearia para buscar serviços
    const barbershopId = 'cmo6dajse0000tlnihesqqda8'
    
    const where: any = {
      barbershopId,
    }

    if (active !== null) {
      where.isActive = active === 'true'
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
