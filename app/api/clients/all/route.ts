import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET - Listar todos os clientes (público)
export async function GET(request: NextRequest) {
  try {
    console.log('Buscando todos os clientes do Prisma...')
    
    // Usando o ID real da barbearia para buscar clientes
    const barbershopId = 'cmo6dajse0000tlnihesqqda8'
    
    const clients = await prisma.client.findMany({
      where: {
        barbershopId: barbershopId
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    console.log('Clientes encontrados no Prisma:', clients.length)
    console.log('IDs dos clientes:', clients.map(c => ({ id: c.id, name: c.name, phone: c.phone })))

    return NextResponse.json(clients)
  } catch (error) {
    console.error('Get all clients error:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar clientes' },
      { status: 500 }
    )
  }
}
