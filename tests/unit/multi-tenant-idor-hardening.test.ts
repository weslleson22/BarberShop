import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// Mocks do Prisma e autenticação para validação rigorosa de isolamento e IDOR
vi.mock('@/lib/api-auth', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api-auth')>()
  return {
    ...actual,
    getAuthUser: vi.fn(),
  }
})

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
      count: vi.fn(),
    },
    appointment: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    notification: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
      count: vi.fn(),
    },
  },
}))

vi.mock('@/lib/auth', () => ({
  hashPassword: vi.fn().mockResolvedValue('hashed_pwd'),
  verifyPassword: vi.fn().mockResolvedValue(true),
  generateToken: vi.fn().mockReturnValue('mock_token'),
  verifyToken: vi.fn(),
  createUser: vi.fn().mockImplementation(async (data) => ({
    user: { id: 'created_user_id', ...data },
    token: 'mock_token',
  })),
  createBarbershop: vi.fn(),
}))

vi.mock('@/lib/appointment-scheduler', () => ({
  criarAgendamento: vi.fn().mockImplementation(async (data) => ({
    id: 'created_apt_id',
    ...data,
  })),
  getHorariosDisponiveis: vi.fn(),
}))

vi.mock('@/lib/notifications', () => ({
  notifyClientStatusChange: vi.fn(),
  notifyAdminsLastMinuteCancellation: vi.fn(),
  notifyAdminsNewClient: vi.fn(),
  notifyBarberNewAppointment: vi.fn(),
  notifyAdminsNewAppointment: vi.fn(),
  notifyClientNewAppointment: vi.fn(),
}))

import { getAuthUser } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'

const mockAuth = getAuthUser as unknown as ReturnType<typeof vi.fn>

// Helpers de criação de usuários por Role e Barbearia
const adminA = { id: 'admin_a_id', name: 'Admin Shop A', email: 'admin@a.com', role: 'ADMIN' as const, barbershopId: 'shop_A' }
const adminB = { id: 'admin_b_id', name: 'Admin Shop B', email: 'admin@b.com', role: 'ADMIN' as const, barbershopId: 'shop_B' }
const barberA = { id: 'barber_a_id', name: 'Barber Shop A', email: 'barber@a.com', role: 'BARBER' as const, barbershopId: 'shop_A' }
const receptionistA = { id: 'rec_a_id', name: 'Rec Shop A', email: 'rec@a.com', role: 'RECEPTIONIST' as const, barbershopId: 'shop_A' }
const clientA = { id: 'client_user_a_id', name: 'Client Shop A', email: 'client@a.com', role: 'CLIENT' as const, barbershopId: 'shop_A' }
const devUser = { id: 'dev_user_id', name: 'Global Dev', email: 'dev@platform.com', role: 'DEVELOPER' as const, barbershopId: null }

describe('AUDITORIA DE SEGURANÇA E ENDURECIMENTO MULTI-TENANT (IDOR & RBAC)', () => {
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

  describe('1. Defesa IDOR em Clientes (/api/clients/[id] e /api/clients)', () => {
    it('Admin da Barbearia A NUNCA consegue ler cliente da Barbearia B (Retorna 404)', async () => {
      mockAuth.mockReturnValue(adminA)
      ;(prisma.client.findFirst as any).mockResolvedValue(null)

      const { GET } = await import('@/app/api/clients/[id]/route')
      const req = new NextRequest('http://localhost/api/clients/client_b')
      const res = await GET(req, { params: Promise.resolve({ id: 'client_b' }) })

      expect(res.status).toBe(404)
      expect(prisma.client.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ id: 'client_b', barbershopId: 'shop_A' }),
        })
      )
    })

    it('Admin da Barbearia A NUNCA consegue editar cliente da Barbearia B (Retorna 404)', async () => {
      mockAuth.mockReturnValue(adminA)
      ;(prisma.client.findFirst as any).mockResolvedValue(null)

      const { PUT } = await import('@/app/api/clients/[id]/route')
      const req = new NextRequest('http://localhost/api/clients/client_b', {
        method: 'PUT',
        body: JSON.stringify({ name: 'Hacked Name', phone: '11999998888' }),
      })
      const res = await PUT(req, { params: Promise.resolve({ id: 'client_b' }) })

      expect(res.status).toBe(404)
      expect(prisma.client.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ id: 'client_b', barbershopId: 'shop_A' }),
        })
      )
      expect(prisma.client.update).not.toHaveBeenCalled()
    })

    it('Admin da Barbearia A NUNCA consegue excluir cliente da Barbearia B via rota /api/clients/[id] (Retorna 404)', async () => {
      mockAuth.mockReturnValue(adminA)
      ;(prisma.client.findFirst as any).mockResolvedValue(null)

      const { DELETE } = await import('@/app/api/clients/[id]/route')
      const req = new NextRequest('http://localhost/api/clients/client_b', { method: 'DELETE' })
      const res = await DELETE(req, { params: Promise.resolve({ id: 'client_b' }) })

      expect(res.status).toBe(404)
      expect(prisma.client.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ id: 'client_b', barbershopId: 'shop_A' }),
        })
      )
      expect(prisma.client.delete).not.toHaveBeenCalled()
    })

    it('Admin da Barbearia A NUNCA lista clientes da Barbearia B mesmo se enviar barbershopId=shop_B na query', async () => {
      mockAuth.mockReturnValue(adminA)
      ;(prisma.client.findMany as any).mockResolvedValue([])

      const { GET } = await import('@/app/api/clients/route')
      const req = new NextRequest('http://localhost/api/clients?barbershopId=shop_B')
      const res = await GET(req)

      expect(res.status).toBe(200)
      expect(prisma.client.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ barbershopId: 'shop_A' }),
        })
      )
    })
  })

  describe('2. Defesa IDOR em Serviços (/api/services e /api/services/[id])', () => {
    it('Admin da Barbearia A recebe 404 ao tentar consultar serviço da Barbearia B', async () => {
      mockAuth.mockReturnValue(adminA)
      ;(prisma.service.findFirst as any).mockResolvedValue(null)

      const { GET } = await import('@/app/api/services/[id]/route')
      const req = new NextRequest('http://localhost/api/services/service_b')
      const res = await GET(req, { params: Promise.resolve({ id: 'service_b' }) })

      expect(res.status).toBe(404)
      expect(prisma.service.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ id: 'service_b', barbershopId: 'shop_A' }),
        })
      )
    })

    it('Admin da Barbearia A recebe 404 ao tentar atualizar serviço da Barbearia B via PUT /api/services', async () => {
      mockAuth.mockReturnValue(adminA)
      ;(prisma.service.findFirst as any).mockResolvedValue(null)

      const { PUT } = await import('@/app/api/services/route')
      const req = new NextRequest('http://localhost/api/services', {
        method: 'PUT',
        body: JSON.stringify({ id: 'service_b', name: 'Novo Nome', price: 50, duration: 30 }),
      })
      const res = await PUT(req)

      expect(res.status).toBe(404)
      expect(prisma.service.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ id: 'service_b', barbershopId: 'shop_A' }),
        })
      )
      expect(prisma.service.update).not.toHaveBeenCalled()
    })

    it('Admin da Barbearia A tem tentativa de criação de serviço forçada para o seu próprio tenant', async () => {
      mockAuth.mockReturnValue(adminA)
      ;(prisma.service.create as any).mockResolvedValue({ id: 'new_srv', name: 'Corte', barbershopId: 'shop_A' })

      const { POST } = await import('@/app/api/services/route')
      const req = new NextRequest('http://localhost/api/services', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Corte Tentativa B',
          price: 45,
          duration: 30,
          barbershopId: 'shop_B', // Tentativa maliciosa
        }),
      })
      const res = await POST(req)

      expect(res.status).toBe(201)
      expect(prisma.service.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ barbershopId: 'shop_A' }),
        })
      )
    })
  })

  describe('3. Defesa IDOR em Agendamentos (/api/appointments/[id] e /api/appointments)', () => {
    it('Admin da Barbearia A recebe 404 ao tentar manipular agendamento da Barbearia B via PUT', async () => {
      mockAuth.mockReturnValue(adminA)
      // Agendamento pertence a shop_B
      ;(prisma.appointment.findUnique as any).mockResolvedValue({
        id: 'apt_b_1',
        barbershopId: 'shop_B',
        clientId: 'client_b_1',
      })

      const { PUT } = await import('@/app/api/appointments/[id]/route')
      const req = new NextRequest('http://localhost/api/appointments/apt_b_1', {
        method: 'PUT',
        body: JSON.stringify({
          serviceId: 'srv_1',
          barberId: 'barber_1',
          startTime: '2026-10-10T10:00:00Z',
          endTime: '2026-10-10T10:30:00Z',
        }),
      })

      const res = await PUT(req, { params: Promise.resolve({ id: 'apt_b_1' }) })
      expect(res.status).toBe(404)
      expect(prisma.appointment.update).not.toHaveBeenCalled()
    })

    it('Admin da Barbearia A recebe 404 ao tentar cancelar agendamento da Barbearia B via DELETE', async () => {
      mockAuth.mockReturnValue(adminA)
      ;(prisma.appointment.findUnique as any).mockResolvedValue({
        id: 'apt_b_1',
        barbershopId: 'shop_B',
        clientId: 'client_b_1',
      })

      const { DELETE } = await import('@/app/api/appointments/[id]/route')
      const req = new NextRequest('http://localhost/api/appointments/apt_b_1', { method: 'DELETE' })
      const res = await DELETE(req, { params: Promise.resolve({ id: 'apt_b_1' }) })

      expect(res.status).toBe(404)
      expect(prisma.appointment.update).not.toHaveBeenCalled()
    })

    it('CLIENT não consegue alterar valor (totalAmount) ou status VIP em seu próprio agendamento via PUT', async () => {
      mockAuth.mockReturnValue(clientA)
      ;(prisma.appointment.findUnique as any).mockResolvedValue({
        id: 'apt_a_1',
        barbershopId: 'shop_A',
        clientId: 'client_a_1',
        totalAmount: 50,
        isVip: false,
        status: 'PENDING',
        client: { userId: clientA.id },
      })

      const { PUT } = await import('@/app/api/appointments/[id]/route')
      // Tentativa de fraude de preço pelo cliente
      const req = new NextRequest('http://localhost/api/appointments/apt_a_1', {
        method: 'PUT',
        body: JSON.stringify({
          serviceId: 'srv_1',
          barberId: 'barber_1',
          startTime: '2026-10-10T10:00:00Z',
          endTime: '2026-10-10T10:30:00Z',
          totalAmount: 1.00, // Preço adulterado
        }),
      })

      const res = await PUT(req, { params: Promise.resolve({ id: 'apt_a_1' }) })
      expect(res.status).toBe(403)
      expect(prisma.appointment.update).not.toHaveBeenCalled()
    })

    it('Admin da Barbearia A não consegue vincular barbeiro de outro tenant ao atualizar agendamento', async () => {
      mockAuth.mockReturnValue(adminA)
      ;(prisma.appointment.findUnique as any).mockResolvedValue({
        id: 'apt_a_1',
        barbershopId: 'shop_A',
        clientId: 'client_a_1',
        totalAmount: 50,
        isVip: false,
        status: 'PENDING',
      })
      ;(prisma.service.findFirst as any).mockResolvedValue({ id: 'srv_1', price: 50, barbershopId: 'shop_A' })
      // Barbeiro pertence à Barbearia B
      ;(prisma.user.findFirst as any).mockResolvedValue(null)

      const { PUT } = await import('@/app/api/appointments/[id]/route')
      const req = new NextRequest('http://localhost/api/appointments/apt_a_1', {
        method: 'PUT',
        body: JSON.stringify({
          serviceId: 'srv_1',
          barberId: 'barber_from_shop_b',
          startTime: '2026-10-10T10:00:00Z',
          endTime: '2026-10-10T10:30:00Z',
        }),
      })

      const res = await PUT(req, { params: Promise.resolve({ id: 'apt_a_1' }) })
      expect(res.status).toBe(404)
      const data = await res.json()
      expect(data.error).toContain('Barbeiro não encontrado')
    })
  })

  describe('4. Defesa IDOR em Notificações (/api/notifications/[id])', () => {
    it('Admin da Barbearia A NUNCA consegue marcar como lida notificação de outro usuário (Retorna 404)', async () => {
      mockAuth.mockReturnValue(adminA)
      // A notificação pertence a um usuário da Barbearia B
      ;(prisma.notification.findFirst as any).mockResolvedValue(null)

      const { PATCH } = await import('@/app/api/notifications/[id]/route')
      const req = new NextRequest('http://localhost/api/notifications/notif_b_1', {
        method: 'PATCH',
        body: JSON.stringify({ read: true }),
      })
      const res = await PATCH(req, { params: Promise.resolve({ id: 'notif_b_1' }) })

      expect(res.status).toBe(404)
      expect(prisma.notification.findFirst).toHaveBeenCalledWith({
        where: { id: 'notif_b_1', userId: adminA.id },
      })
      expect(prisma.notification.update).not.toHaveBeenCalled()
    })

    it('Admin da Barbearia A NUNCA consegue excluir notificação de outro usuário (Retorna 404)', async () => {
      mockAuth.mockReturnValue(adminA)
      ;(prisma.notification.findFirst as any).mockResolvedValue(null)

      const { DELETE } = await import('@/app/api/notifications/[id]/route')
      const req = new NextRequest('http://localhost/api/notifications/notif_b_1', { method: 'DELETE' })
      const res = await DELETE(req, { params: Promise.resolve({ id: 'notif_b_1' }) })

      expect(res.status).toBe(404)
      expect(prisma.notification.findFirst).toHaveBeenCalledWith({
        where: { id: 'notif_b_1', userId: adminA.id },
      })
      expect(prisma.notification.delete).not.toHaveBeenCalled()
    })
  })

  describe('5. Defesa em Rotas Públicas contra Ausência de Tenant e Spoofing', () => {
    it('GET /api/services/public rejeita requisição pública sem parâmetro de barbearia (Retorna 400)', async () => {
      mockAuth.mockReturnValue(null) // Visitante anônimo

      const { GET } = await import('@/app/api/services/public/route')
      const req = new NextRequest('http://localhost/api/services/public')
      const res = await GET(req)

      expect(res.status).toBe(400)
      const data = await res.json()
      expect(data.error).toContain('Barbearia não especificada')
    })

    it('GET /api/users/public rejeita requisição pública sem parâmetro de barbearia (Retorna 400)', async () => {
      mockAuth.mockReturnValue(null)

      const { GET } = await import('@/app/api/users/public/route')
      const req = new NextRequest('http://localhost/api/users/public?role=BARBER')
      const res = await GET(req)

      expect(res.status).toBe(400)
      const data = await res.json()
      expect(data.error).toContain('Barbearia não especificada')
    })

    it('GET /api/appointments/public rejeita requisição pública sem parâmetro de barbearia (Retorna 400)', async () => {
      mockAuth.mockReturnValue(null)

      const { GET } = await import('@/app/api/appointments/public/route')
      const req = new NextRequest('http://localhost/api/appointments/public?barberId=barber_1')
      const res = await GET(req)

      expect(res.status).toBe(400)
      const data = await res.json()
      expect(data.error).toContain('Barbearia não especificada')
    })

    it('POST /api/clients/public ignora userId injetado por atacante anônimo', async () => {
      mockAuth.mockReturnValue(null) // Chamada não autenticada
      ;(prisma.client.create as any).mockImplementation(async ({ data }: any) => ({ id: 'new_client_id', ...data }))

      const { POST } = await import('@/app/api/clients/public/route')
      const req = new NextRequest('http://localhost/api/clients/public', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Anonymous Attacker',
          phone: '11988887777',
          email: 'attacker@evil.com',
          barbershopId: 'shop_A',
          userId: 'victim_user_123', // Tentativa maliciosa de takeover
        }),
      })

      const res = await POST(req)
      expect(res.status).toBe(201)
      expect(prisma.client.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: null, // O backend deve ignorar e gravar null
          }),
        })
      )
    })

    it('POST /api/appointments/public rejeita agendamento quando o cliente pertence a outra barbearia', async () => {
      mockAuth.mockReturnValue(null)
      // Cliente não existe em shop_A
      ;(prisma.client.findFirst as any).mockResolvedValue(null)

      const { POST } = await import('@/app/api/appointments/public/route')
      const req = new NextRequest('http://localhost/api/appointments/public', {
        method: 'POST',
        body: JSON.stringify({
          clientId: 'client_from_shop_b',
          barbershopId: 'shop_A',
          barberId: 'barber_1',
          serviceId: 'srv_1',
          startTime: '2026-10-10T10:00:00Z',
        }),
      })

      const res = await POST(req)
      expect(res.status).toBe(404)
      const data = await res.json()
      expect(data.error).toContain('Cliente não encontrado nesta barbearia')
    })
  })

  describe('6. Isolamento e Blindagem do Perfil DEVELOPER e Diagnóstico', () => {
    it('Bloqueia acesso a GET /api/diagnostic para usuários não-DEVELOPER (Retorna 403)', async () => {
      mockAuth.mockReturnValue(adminA)

      const { GET } = await import('@/app/api/diagnostic/route')
      const res = await GET(new NextRequest('http://localhost/api/diagnostic'))

      expect(res.status).toBe(403)
      const data = await res.json()
      expect(data.error).toContain('Acesso restrito ao desenvolvedor')
    })

    it('DEVELOPER tem acesso autorizado a GET /api/diagnostic', async () => {
      mockAuth.mockReturnValue(devUser)

      const { GET } = await import('@/app/api/diagnostic/route')
      const res = await GET(new NextRequest('http://localhost/api/diagnostic'))

      expect(res.status).toBe(200)
    })

    it('DEVELOPER pode consultar usuário de qualquer barbearia via GET /api/users/[id]', async () => {
      mockAuth.mockReturnValue(devUser)
      ;(prisma.user.findFirst as any).mockResolvedValue({
        id: 'admin_b_id',
        name: 'Admin Shop B',
        email: 'admin@b.com',
        role: 'ADMIN',
        barbershopId: 'shop_B',
      })

      const { GET } = await import('@/app/api/users/[id]/route')
      const res = await GET(new NextRequest('http://localhost/api/users/admin_b_id'), {
        params: Promise.resolve({ id: 'admin_b_id' }),
      })

      expect(res.status).toBe(200)
      expect(prisma.user.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'admin_b_id' },
        })
      )
    })
  })
})
