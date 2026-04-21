import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET - Buscar clientes (público)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const phone = searchParams.get('phone')

    // Buscar a primeira barbearia disponível
    let barbershopId = 'cmo6dajse0000tlnihesqqda8' // fallback
    
    try {
      const barbershop = await prisma.barbershop.findFirst({
        select: { id: true }
      })
      if (barbershop) {
        barbershopId = barbershop.id
        console.log('Usando barbearia encontrada:', barbershopId)
      }
    } catch (error) {
      console.log('Usando barbearia fallback:', barbershopId)
    }

    // Se phone for fornecido, buscar por telefone
    if (phone) {
      const clients = await prisma.client.findMany({
        where: {
          phone: phone,
          barbershopId
        }
      })
      return NextResponse.json(clients)
    }

    // Se não, listar todos os clientes
    const clients = await prisma.client.findMany({
      where: {
        barbershopId
      },
      orderBy: {
        name: 'asc'
      }
    })

    return NextResponse.json(clients)
  } catch (error) {
    console.error('Get client error:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar cliente' },
      { status: 500 }
    )
  }
}

// POST - Criar cliente (público)
export async function POST(request: NextRequest) {
  try {
    const data = await request.json()
    const { name, phone, email } = data

    console.log('Dados recebidos para criar cliente:', { name, phone, email })

    if (!name || !phone) {
      return NextResponse.json(
        { error: 'Nome e telefone são obrigatórios' },
        { status: 400 }
      )
    }

    // Buscar a primeira barbearia disponível
    let barbershopId = 'cmo6dajse0000tlnihesqqda8' // fallback
    
    try {
      const barbershop = await prisma.barbershop.findFirst({
        select: { id: true }
      })
      if (barbershop) {
        barbershopId = barbershop.id
        console.log('Usando barbearia encontrada:', barbershopId)
      }
    } catch (error) {
      console.log('Usando barbearia fallback:', barbershopId)
    }

    // Verificar se cliente já existe
    console.log('Verificando cliente existente com telefone:', phone)
    const existingClient = await prisma.client.findFirst({
      where: {
        phone: phone,
        barbershopId
      }
    })

    console.log('Cliente existente encontrado:', existingClient)

    if (existingClient) {
      console.log('Retornando cliente existente:', existingClient)
      return NextResponse.json(existingClient)
    }

    // Criar novo cliente
    console.log('Criando novo cliente com dados:', { name, phone, email })
    const client = await prisma.client.create({
      data: {
        name,
        phone,
        email: email || null,
        barbershopId
      }
    })

    console.log('Cliente criado com sucesso:', client)
    return NextResponse.json(client, { status: 201 })
  } catch (error) {
    console.error('Create client error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao criar cliente' },
      { status: 500 }
    )
  }
}
