import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// Mocks para isolamento estrito sem dependência de banco de dados
vi.mock('@/lib/api-auth', () => ({
  getAuthUser: vi.fn(),
  requireRole: (user: any, roles: string[]) => !!user && roles.includes(user.role),
  getSafeTenantId: (user: any, overrideId?: string | null) => {
    if (user.role === 'DEVELOPER') return overrideId || user.barbershopId || null
    return user.barbershopId || null
  },
  isDeveloper: (user: any) => !!user && user.role === 'DEVELOPER',
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    $disconnect: vi.fn(),
    $transaction: vi.fn(),
    user: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
      groupBy: vi.fn(),
    },
    barbershop: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
    client: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    service: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    appointment: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
      aggregate: vi.fn(),
      groupBy: vi.fn(),
    },
  },
}))

vi.mock('@/lib/auth', () => ({
  hashPassword: vi.fn().mockResolvedValue('hashed_password'),
  verifyPassword: vi.fn().mockResolvedValue(true),
  generateToken: vi.fn().mockReturnValue('mocked_jwt_token'),
  verifyToken: vi.fn(),
  createUser: vi.fn().mockImplementation(async (data) => ({
    user: { id: 'created_user_id', ...data },
    token: 'mocked_jwt_token',
  })),
  createBarbershop: vi.fn(),
}))

import { getAuthUser } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'
import { createUser } from '@/lib/auth'

const mockAuth = getAuthUser as unknown as ReturnType<typeof vi.fn>

describe('Isolamento Multi-Tenant e RBAC — Auditoria de Segurança', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(prisma.barbershop.findFirst as any).mockImplementation((args: any) => {
      const id = args?.where?.id || args?.where?.OR?.[0]?.id || 'shop_A'
      return Promise.resolve({
        id,
        name: 'Mock Barbershop',
        slug: 'mock-barbershop',
        isActive: true,
        status: 'APPROVED',
      })
    })
  })

  describe('1. Isolamento de Agendamentos (/api/appointments)', () => {
    it('Usuário da Barbearia A NUNCA consulta agendamentos da Barbearia B', async () => {
      mockAuth.mockReturnValue({
        id: 'user_a',
        name: 'Admin A',
        email: 'admin@a.com',
        role: 'ADMIN',
        barbershopId: 'shop_A',
      })
      ;(prisma.appointment.findMany as any).mockResolvedValue([])

      const { GET } = await import('@/app/api/appointments/route')
      // Tentativa de spoofing via query param
      const req = new NextRequest('http://localhost/api/appointments?barbershopId=shop_B')
      const res = await GET(req)

      expect(res.status).toBe(200)
      // O filtro do Prisma DEVE ser estritamente shop_A, ignorando shop_B
      expect(prisma.appointment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ barbershopId: 'shop_A' }),
        })
      )
    })

    it('Usuário DEVELOPER tem acesso restrito e não consulta agendamentos operacionais', async () => {
      mockAuth.mockReturnValue({
        id: 'dev_user',
        name: 'Global Developer',
        email: 'dev@platform.com',
        role: 'DEVELOPER',
        barbershopId: null,
      })

      const { GET } = await import('@/app/api/appointments/route')
      const req = new NextRequest('http://localhost/api/appointments?barbershopId=shop_B')
      const res = await GET(req)

      expect(res.status).toBe(403)
    })
  })

  describe('2. Isolamento de Serviços e Proteção de Operações (/api/services/[id])', () => {
    it('Admin da Barbearia A lista apenas serviços pertencentes a shop_A', async () => {
      mockAuth.mockReturnValue({
        id: 'admin_a',
        name: 'Admin A',
        email: 'admin@a.com',
        role: 'ADMIN',
        barbershopId: 'shop_A',
      })
      ;(prisma.service.findMany as any).mockResolvedValue([
        { id: 'srv_1', name: 'Corte', barbershopId: 'shop_A', isActive: true },
      ])

      const { GET } = await import('@/app/api/services/route')
      const req = new NextRequest('http://localhost/api/services?active=true')
      const res = await GET(req)

      expect(res.status).toBe(200)
      expect(prisma.service.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ barbershopId: 'shop_A', isActive: true }),
        })
      )
    })

    it('GET /api/services/public infere barbershopId da sessão se parâmetro de query não for informado', async () => {
      mockAuth.mockReturnValue({
        id: 'client_cris',
        name: 'Cliente Cris',
        email: 'cliente@cris.com',
        role: 'CLIENT',
        barbershopId: 'shop_Cris',
      })
      ;(prisma.service.findMany as any).mockResolvedValue([
        { id: 'srv_cris_1', name: 'Cabelo', barbershopId: 'shop_Cris', isActive: true },
      ])

      const { GET } = await import('@/app/api/services/public/route')
      const req = new NextRequest('http://localhost/api/services/public')
      const res = await GET(req)

      expect(res.status).toBe(200)
      expect(prisma.service.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ barbershopId: 'shop_Cris', isActive: true }),
        })
      )
    })

    it('GET /api/services/public respeita parâmetro barbershopId explícito quando informado', async () => {
      mockAuth.mockReturnValue(null)
      ;(prisma.service.findMany as any).mockResolvedValue([
        { id: 'srv_b_1', name: 'Barba', barbershopId: 'shop_B', isActive: true },
      ])

      const { GET } = await import('@/app/api/services/public/route')
      const req = new NextRequest('http://localhost/api/services/public?barbershopId=shop_B')
      const res = await GET(req)

      expect(res.status).toBe(200)
      expect(prisma.service.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ barbershopId: 'shop_B', isActive: true }),
        })
      )
    })

    it('Admin da Barbearia A não consegue alterar serviço da Barbearia B', async () => {
      mockAuth.mockReturnValue({
        id: 'admin_a',
        name: 'Admin A',
        email: 'admin@a.com',
        role: 'ADMIN',
        barbershopId: 'shop_A',
      })

      // O serviço pertence a shop_B
      ;(prisma.service.findFirst as any).mockResolvedValue(null)

      const { PUT } = await import('@/app/api/services/[id]/route')
      const req = new NextRequest('http://localhost/api/services/srv_b', {
        method: 'PUT',
        body: JSON.stringify({ name: 'Hacked Service', price: 999 }),
      })

      const res = await PUT(req, { params: Promise.resolve({ id: 'srv_b' }) })
      expect(res.status).toBe(404)
      expect(prisma.service.findFirst).toHaveBeenCalledWith({
        where: { id: 'srv_b', barbershopId: 'shop_A' },
      })
    })

    it('CLIENT não possui autorização para excluir serviços', async () => {
      mockAuth.mockReturnValue({
        id: 'client_1',
        name: 'Client User',
        email: 'client@email.com',
        role: 'CLIENT',
        barbershopId: 'shop_A',
      })

      const { DELETE } = await import('@/app/api/services/[id]/route')
      const req = new NextRequest('http://localhost/api/services/srv_1', { method: 'DELETE' })

      const res = await DELETE(req, { params: Promise.resolve({ id: 'srv_1' }) })
      expect(res.status).toBe(403)
      expect(prisma.service.delete).not.toHaveBeenCalled()
    })
  })

  describe('3. Isolamento de Clientes e Proteção de Dados Pessoais (/api/clients)', () => {
    it('GET público /api/clients/public bloqueia requisição sem parâmetro de telefone', async () => {
      const { GET } = await import('@/app/api/clients/public/route')
      const req = new NextRequest('http://localhost/api/clients/public') // Sem phone

      const res = await GET(req)
      expect(res.status).toBe(400)
      const data = await res.json()
      expect(data.error).toContain('Telefone é obrigatório')
      expect(prisma.client.findMany).not.toHaveBeenCalled()
    })

    it('Admin da Barbearia A não consegue excluir cliente da Barbearia B', async () => {
      mockAuth.mockReturnValue({
        id: 'admin_a',
        role: 'ADMIN',
        barbershopId: 'shop_A',
      })

      // Cliente de shop_B não será encontrado com barbershopId: shop_A
      ;(prisma.client.findFirst as any).mockResolvedValue(null)

      const { DELETE } = await import('@/app/api/clients/route')
      const req = new NextRequest('http://localhost/api/clients?id=client_b', { method: 'DELETE' })

      const res = await DELETE(req)
      expect(res.status).toBe(404)
      expect(prisma.client.delete).not.toHaveBeenCalled()
    })
  })

  describe('4. Proteção Contra Escalada de Privilégios no Registro (/api/auth/register)', () => {
    it('Registro público rejeita ou força role CLIENT mesmo se atacante passar ADMIN ou DEVELOPER', async () => {
      const { POST } = await import('@/app/api/auth/register/route')
      const req = new NextRequest('http://localhost/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Attacker',
          email: 'attacker@test.com',
          password: 'password123',
          role: 'ADMIN', // Tentativa maliciosa
        }),
      })

      const res = await POST(req)
      expect(res.status).toBe(200)
      expect(createUser).toHaveBeenCalledWith(
        expect.objectContaining({
          role: 'CLIENT', // Forçado no backend
        })
      )
    })
  })

  describe('5. Controle do Módulo DEVELOPER (/api/developer/*)', () => {
    it('Usuário ADMIN de barbearia tem acesso bloqueado ao painel do DEVELOPER', async () => {
      mockAuth.mockReturnValue({
        id: 'admin_1',
        name: 'Barbershop Admin',
        email: 'admin@shop.com',
        role: 'ADMIN',
        barbershopId: 'shop_A',
      })

      const { GET } = await import('@/app/api/developer/barbershops/route')
      const res = await GET(new NextRequest('http://localhost/api/developer/barbershops'))

      expect(res.status).toBe(403)
      const data = await res.json()
      expect(data.error).toContain('Acesso restrito ao desenvolvedor')
      expect(prisma.barbershop.findMany).not.toHaveBeenCalled()
    })

    it('Usuário DEVELOPER tem acesso autorizado às métricas e lista de tenants', async () => {
      mockAuth.mockReturnValue({
        id: 'dev_1',
        name: 'Developer',
        email: 'dev@platform.com',
        role: 'DEVELOPER',
        barbershopId: null,
      })

      ;(prisma.barbershop.findMany as any).mockResolvedValue([
        { id: 'shop_A', name: 'Barbearia A', isActive: true, _count: { users: 2, clients: 10, services: 5, appointments: 20 } },
      ])

      const { GET } = await import('@/app/api/developer/barbershops/route')
      const res = await GET(new NextRequest('http://localhost/api/developer/barbershops'))

      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.length).toBe(1)
      expect(data[0].id).toBe('shop_A')
    })

    it('DEVELOPER pode ativar/desativar status de um tenant', async () => {
      mockAuth.mockReturnValue({
        id: 'dev_1',
        role: 'DEVELOPER',
      })

      ;(prisma.barbershop.findUnique as any).mockResolvedValue({ id: 'shop_A', isActive: true })
      ;(prisma.barbershop.update as any).mockResolvedValue({ id: 'shop_A', isActive: false })

      const { PATCH } = await import('@/app/api/developer/barbershops/route')
      const req = new NextRequest('http://localhost/api/developer/barbershops', {
        method: 'PATCH',
        body: JSON.stringify({ id: 'shop_A', isActive: false }),
      })

      const res = await PATCH(req)
      expect(res.status).toBe(200)
      expect(prisma.barbershop.update).toHaveBeenCalledWith({
        where: { id: 'shop_A' },
        data: { isActive: false },
      })
    })
  })

  describe('6. Blindagem da Rota de Seed (/api/seed)', () => {
    it('Bloqueia execução de seed sem autenticação', async () => {
      mockAuth.mockReturnValue(null)

      const { POST } = await import('@/app/api/seed/route')
      const req = new NextRequest('http://localhost/api/seed', { method: 'POST' })

      const res = await POST(req)
      expect(res.status).toBe(403)
      expect(prisma.barbershop.deleteMany as any).toBeUndefined() // Não executado
    })
  })
})
