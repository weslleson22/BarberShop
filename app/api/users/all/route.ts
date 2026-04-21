import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET - Listar TODOS os usuários (sem filtro de barbershop)
export async function GET(request: NextRequest) {
  try {
    console.log('Buscando TODOS os usuários do Prisma (sem filtro)...')
    
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        barbershopId: true,
        isActive: true,
        createdAt: true,
      },
      orderBy: {
        name: 'asc',
      },
    })

    console.log('TOTAL de usuários encontrados no Prisma:', users.length)
    console.log('Todos os usuários:', users.map(u => ({ 
      id: u.id, 
      name: u.name, 
      email: u.email, 
      role: u.role, 
      barbershopId: u.barbershopId,
      isActive: u.isActive 
    })))

    // Agrupar por barbershopId para análise
    const usersByBarbershop = users.reduce((acc, user) => {
      const barbershopId = user.barbershopId || 'NULL'
      if (!acc[barbershopId]) {
        acc[barbershopId] = []
      }
      acc[barbershopId].push(user)
      return acc
    }, {} as Record<string, any[]>)

    console.log('Usuários agrupados por barbershopId:')
    Object.keys(usersByBarbershop).forEach(barbershopId => {
      console.log(`  Barbershop ${barbershopId}: ${usersByBarbershop[barbershopId].length} usuários`)
    })

    return NextResponse.json({
      total: users.length,
      usersByBarbershop,
      allUsers: users
    })
  } catch (error) {
    console.error('Get all users error:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar usuários' },
      { status: 500 }
    )
  }
}
