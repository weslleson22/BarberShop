import { beforeAll, afterAll, beforeEach, afterEach, vi } from 'vitest'
import { PrismaClient } from '@prisma/client'

// Cliente Prisma para testes
export const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL_TEST || process.env.DATABASE_URL
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

// Mocks globais
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    forward: vi.fn()
  }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/'
}))

// Mock de autenticação
vi.mock('@/lib/auth-context', () => ({
  useAuth: () => ({
    user: null,
    login: vi.fn(),
    logout: vi.fn(),
    loading: false
  })
}))

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

export const createTestUser = async (barbershopId: string, role: 'ADMIN' | 'BARBER' | 'CLIENT' = 'BARBER', overrides = {}) => {
  return await prisma.user.create({
    data: {
      name: 'Usuário Teste',
      email: `teste-${Date.now()}@email.com`,
      phone: '(11) 99999-9999',
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
