import { beforeAll, afterAll, afterEach } from 'vitest'
import { PrismaClient } from '@prisma/client'

// Este setup APAGA todas as tabelas antes/depois de cada teste. Só pode
// rodar contra um banco de testes dedicado — nunca contra o DATABASE_URL
// compartilhado com dev/produção. Exigimos DATABASE_URL_TEST explicitamente
// (sem fallback) para impedir repetir o incidente em que a suíte de testes
// apagou os dados reais da aplicação.
//
// Só importe este arquivo em testes de INTEGRAÇÃO que realmente precisam de
// um banco. Testes unitários não devem importá-lo.
const TEST_DATABASE_URL = process.env.DATABASE_URL_TEST

if (!TEST_DATABASE_URL) {
  throw new Error(
    'DATABASE_URL_TEST não está definida. Os testes de integração apagam ' +
    'todas as tabelas do banco configurado, então NUNCA devem usar o ' +
    'DATABASE_URL de dev/produção. Configure uma DATABASE_URL_TEST apontando ' +
    'para um banco de testes dedicado antes de rodar esta suíte.'
  )
}

if (TEST_DATABASE_URL === process.env.DATABASE_URL) {
  throw new Error(
    'DATABASE_URL_TEST está igual a DATABASE_URL. Os testes apagam todas as ' +
    'tabelas do banco — aponte DATABASE_URL_TEST para um banco de testes ' +
    'separado do banco de dev/produção.'
  )
}

// Cliente Prisma para testes
export const prisma = new PrismaClient({
  datasources: {
    db: {
      url: TEST_DATABASE_URL
    }
  }
})

// Limpar banco antes de todos os testes
beforeAll(async () => {
  console.log('Configurando ambiente de testes...')

  // Limpar todas as tabelas em ordem correta (respeitando foreign keys)
  await prisma.appointment.deleteMany()
  await prisma.client.deleteMany()
  await prisma.service.deleteMany()
  await prisma.user.deleteMany()
  await prisma.barbershop.deleteMany()

  console.log('Banco de dados limpo para testes')
})

// Limpar após cada teste para garantir isolamento
afterEach(async () => {
  await prisma.appointment.deleteMany()
  await prisma.client.deleteMany()
  await prisma.service.deleteMany()
  await prisma.user.deleteMany()
  await prisma.barbershop.deleteMany()
})

// Fechar conexão após todos os testes
afterAll(async () => {
  await prisma.$disconnect()
  console.log('Conexão com banco de testes encerrada')
})

// Funções utilitárias para testes
export const createTestBarbershop = async (overrides = {}) => {
  return await prisma.barbershop.create({
    data: {
      name: 'Barbearia Teste',
      email: 'teste@barberiacentral.com',
      phone: '(11) 99999-9999',
      address: 'Rua Teste, 123',
      ...overrides
    }
  })
}

export const createTestUser = async (barbershopId: string, role: 'ADMIN' | 'BARBER' | 'RECEPTIONIST' | 'CLIENT' = 'BARBER', overrides = {}) => {
  return await prisma.user.create({
    data: {
      name: 'Usuário Teste',
      email: `teste-${Date.now()}@email.com`,
      role,
      password: '$2a$12$hashedpassword',
      isActive: true,
      barbershopId,
      ...overrides
    }
  })
}

export const createTestService = async (barbershopId: string, overrides = {}) => {
  return await prisma.service.create({
    data: {
      name: 'Serviço Teste',
      description: 'Descrição do serviço teste',
      price: 35.0,
      duration: 30,
      isActive: true,
      barbershopId,
      ...overrides
    }
  })
}

export const createTestClient = async (barbershopId: string, overrides = {}) => {
  return await prisma.client.create({
    data: {
      name: 'Cliente Teste',
      email: `cliente-${Date.now()}@email.com`,
      phone: '(11) 99999-9999',
      isActive: true,
      barbershopId,
      ...overrides
    }
  })
}

export const createTestAppointment = async (barbershopId: string, clientId: string, barberId: string, serviceId: string, startTime: Date, overrides = {}) => {
  const service = await prisma.service.findUnique({ where: { id: serviceId } })
  const endTime = new Date(startTime.getTime() + (service?.duration || 30) * 60000)

  return await prisma.appointment.create({
    data: {
      clientId,
      barberId,
      serviceId,
      startTime,
      endTime,
      status: 'PENDING',
      notes: 'Agendamento teste',
      totalAmount: service?.price || 35.0,
      barbershopId,
      ...overrides
    },
    include: {
      client: true,
      barber: true,
      service: true
    }
  })
}
