import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET - Listar todos os clientes (público)
export async function GET(request: NextRequest) {
  try {
    console.log('Buscando todos os clientes do Prisma...')
    
    // Primeiro, verificar se há alguma barbearia
    const barbershops = await prisma.barbershop.findMany()
    console.log('Barbearias encontradas:', barbershops.length)
    
    if (barbershops.length === 0) {
      console.log('Nenhuma barbearia encontrada. Criando dados de exemplo...')
      // Criar dados de exemplo se não existir
      await createSeedData()
    }
    
    // Usar a primeira barbearia ou criar uma nova
    let barbershopId = barbershops[0]?.id
    
    if (!barbershopId) {
      console.log('Criando nova barbearia...')
      const barbershop = await prisma.barbershop.create({
        data: {
          name: 'Barbearia Central',
          phone: '(11) 99999-8888',
          address: 'Rua das Barbas, 123 - São Paulo, SP',
          email: 'contato@barberiacentral.com',
        }
      })
      barbershopId = barbershop.id
      console.log('Barbearia criada:', barbershopId)
    }
    
    // Verificar se há clientes
    const clientCount = await prisma.client.count({
      where: { barbershopId }
    })
    
    if (clientCount === 0) {
      console.log('Nenhum cliente encontrado. Criando clientes de exemplo...')
      await createSampleClients(barbershopId)
    }
    
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

async function createSampleClients(barbershopId: string) {
  const clients = [
    {
      name: 'Carlos Silva',
      phone: '(11) 44444-4444',
      email: 'carlos@email.com',
      barbershopId: barbershopId,
    },
    {
      name: 'Maria Santos',
      phone: '(11) 55555-5555',
      email: 'maria@email.com',
      barbershopId: barbershopId,
    },
    {
      name: 'José Oliveira',
      phone: '(11) 66666-6666',
      email: 'jose@email.com',
      barbershopId: barbershopId,
    },
    {
      name: 'Ana Costa',
      phone: '(11) 77777-7777',
      email: 'ana@email.com',
      barbershopId: barbershopId,
    },
    {
      name: 'Pedro Santos',
      phone: '(11) 88888-8888',
      email: 'pedro@email.com',
      barbershopId: barbershopId,
    }
  ]
  
  await prisma.client.createMany({
    data: clients
  })
  
  console.log('Clientes de exemplo criados:', clients.length)
}

async function createSeedData() {
  // Implementação básica do seed
  console.log('Criando dados básicos...')
  
  const barbershop = await prisma.barbershop.create({
    data: {
      name: 'Barbearia Central',
      phone: '(11) 99999-8888',
      address: 'Rua das Barbas, 123 - São Paulo, SP',
      email: 'contato@barberiacentral.com',
    }
  })
  
  await createSampleClients(barbershop.id)
  console.log('Seed básico concluído')
}
