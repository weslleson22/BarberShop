// API pública para listar barbeiros (usada pelo agendamento sem login)
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    console.log('=== API PÚBLICA DE BARBEIROS - INICIANDO BUSCA ===')
    
    const { searchParams } = new URL(request.url)
    const role = searchParams.get('role')
    
    // Apenas permitir BARBER para uso público
    if (role && role !== 'BARBER') {
      return NextResponse.json(
        { error: 'Acesso não permitido para esta role' },
        { status: 403 }
      )
    }
    
    const where: any = {
      role: 'BARBER',
      isActive: true
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
