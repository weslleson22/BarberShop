import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// Mocks
vi.mock('@/lib/api-auth', () => ({
  getAuthUser: vi.fn(),
  requireRole: vi.fn(),
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    barbershop: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
    service: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
    },
    user: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
    },
    client: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    appointment: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
    },
  },
}))

vi.mock('@/lib/appointment-scheduler', () => ({
  criarAgendamento: vi.fn().mockImplementation(async (data) => ({
    id: 'created_apt_public_id',
    ...data,
  })),
}))

import { prisma } from '@/lib/prisma'
import { getAuthUser } from '@/lib/api-auth'
import { resolvePublicTenant } from '@/lib/tenant'

const mockAuth = getAuthUser as unknown as ReturnType<typeof vi.fn>

// Barbearias de teste
const shopA = {
  id: 'shop_A',
  name: 'Barbearia Vintage Alfa',
  slug: 'barbearia-a',
  isActive: true,
  status: 'APPROVED',
  phone: '11999990001',
  address: 'Rua A, 100',
  logo: null,
  description: 'Unidade Alfa de Excelência',
}

const shopB = {
  id: 'shop_B',
  name: 'Barbearia Beta Prime',
  slug: 'barbearia-b',
  isActive: true,
  status: 'APPROVED',
  phone: '11999990002',
  address: 'Avenida B, 200',
  logo: null,
  description: 'Unidade Beta Prime',
}

const shopInactive = {
  id: 'shop_Inactive',
  name: 'Barbearia Suspensa',
  slug: 'barbearia-inativa',
  isActive: false,
  status: 'SUSPENDED',
  phone: '11999990003',
  address: 'Rua Inativa, 300',
  logo: null,
  description: 'Unidade desativada',
}

describe('PROVA DE CONCEITO E SEGURANÇA: Resolução de Tenant Público por Slug', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAuth.mockReturnValue(null) // Visitante anônimo padrão

    // Mock do prisma.barbershop.findFirst para resolver pelo slug, id ou nome
    ;(prisma.barbershop.findFirst as any).mockImplementation((args: any) => {
      const orClauses = args?.where?.OR || []
      const idSearch = orClauses.find((c: any) => c.id)?.id || args?.where?.id
      const slugSearch = orClauses.find((c: any) => c.slug)?.slug || args?.where?.slug
      const nameSearch = orClauses.find((c: any) => c.name?.equals)?.name?.equals || args?.where?.name

      const identifier = slugSearch || idSearch || nameSearch

      if (!identifier) return Promise.resolve(null)

      if (identifier === 'barbearia-a' || identifier === 'shop_A') {
        return Promise.resolve(shopA)
      }
      if (identifier === 'barbearia-b' || identifier === 'shop_B') {
        return Promise.resolve(shopB)
      }
      if (identifier === 'barbearia-inativa' || identifier === 'shop_Inactive') {
        return Promise.resolve(shopInactive)
      }

      return Promise.resolve(null)
    })
  })

  describe('1. Serviço Core resolvePublicTenant (lib/tenant.ts)', () => {
    it('retorna os dados da Barbearia A quando consultado pelo slug "barbearia-a"', async () => {
      const result = await resolvePublicTenant('barbearia-a')
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.tenant.id).toBe('shop_A')
        expect(result.tenant.slug).toBe('barbearia-a')
        expect(result.tenant.name).toBe('Barbearia Vintage Alfa')
      }
    })

    it('retorna os dados da Barbearia B quando consultado pelo slug "barbearia-b"', async () => {
      const result = await resolvePublicTenant('barbearia-b')
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.tenant.id).toBe('shop_B')
        expect(result.tenant.slug).toBe('barbearia-b')
        expect(result.tenant.name).toBe('Barbearia Beta Prime')
      }
    })

    it('retorna 400 se nenhum identificador/slug for informado (NUNCA fallback para primeira ativa)', async () => {
      const result = await resolvePublicTenant('')
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.status).toBe(400)
        expect(result.error).toContain('Barbearia não especificada')
      }
    })

    it('retorna 404 se o slug não existir', async () => {
      const result = await resolvePublicTenant('slug-inexistente')
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.status).toBe(404)
        expect(result.error).toContain('Barbearia não encontrada')
      }
    })

    it('retorna 404 se a barbearia existir mas estiver inativa (isActive = false)', async () => {
      const result = await resolvePublicTenant('barbearia-inativa')
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.status).toBe(404)
        expect(result.error).toContain('inativa ou suspensa')
      }
    })
  })

  describe('2. Rota de Identidade do Tenant (/api/public/tenant)', () => {
    it('GET /api/public/tenant?slug=barbearia-a retorna estritamente a Barbearia A', async () => {
      const { GET } = await import('@/app/api/public/tenant/route')
      const req = new NextRequest('http://localhost/api/public/tenant?slug=barbearia-a')
      const res = await GET(req)

      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.id).toBe('shop_A')
      expect(data.slug).toBe('barbearia-a')
      expect(data.name).toBe('Barbearia Vintage Alfa')
    })

    it('GET /api/public/tenant?slug=barbearia-b retorna estritamente a Barbearia B', async () => {
      const { GET } = await import('@/app/api/public/tenant/route')
      const req = new NextRequest('http://localhost/api/public/tenant?slug=barbearia-b')
      const res = await GET(req)

      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.id).toBe('shop_B')
      expect(data.slug).toBe('barbearia-b')
      expect(data.name).toBe('Barbearia Beta Prime')
    })

    it('GET /api/public/tenant sem parâmetro retorna 400', async () => {
      const { GET } = await import('@/app/api/public/tenant/route')
      const req = new NextRequest('http://localhost/api/public/tenant')
      const res = await GET(req)

      expect(res.status).toBe(400)
      const data = await res.json()
      expect(data.error).toContain('Barbearia não especificada')
    })

    it('GET /api/public/tenant?slug=inexistente retorna 404', async () => {
      const { GET } = await import('@/app/api/public/tenant/route')
      const req = new NextRequest('http://localhost/api/public/tenant?slug=inexistente')
      const res = await GET(req)

      expect(res.status).toBe(404)
    })

    it('GET /api/public/tenant?slug=barbearia-inativa retorna 404', async () => {
      const { GET } = await import('@/app/api/public/tenant/route')
      const req = new NextRequest('http://localhost/api/public/tenant?slug=barbearia-inativa')
      const res = await GET(req)

      expect(res.status).toBe(404)
    })
  })

  describe('3. Isolamento Multi-Tenant em Serviços (/api/services/public)', () => {
    it('/b/barbearia-a: retorna somente serviços vinculados à Barbearia A', async () => {
      ;(prisma.service.findMany as any).mockResolvedValue([
        { id: 'srv_a1', name: 'Corte Tradicional', barbershopId: 'shop_A', isActive: true },
      ])

      const { GET } = await import('@/app/api/services/public/route')
      const req = new NextRequest('http://localhost/api/services/public?slug=barbearia-a')
      const res = await GET(req)

      expect(res.status).toBe(200)
      expect(prisma.service.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            barbershopId: 'shop_A',
            isActive: true,
          }),
        })
      )
    })

    it('/b/barbearia-b: retorna somente serviços vinculados à Barbearia B', async () => {
      ;(prisma.service.findMany as any).mockResolvedValue([
        { id: 'srv_b1', name: 'Barba Terapia', barbershopId: 'shop_B', isActive: true },
      ])

      const { GET } = await import('@/app/api/services/public/route')
      const req = new NextRequest('http://localhost/api/services/public?slug=barbearia-b')
      const res = await GET(req)

      expect(res.status).toBe(200)
      expect(prisma.service.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            barbershopId: 'shop_B',
            isActive: true,
          }),
        })
      )
    })

    it('rejeita com 400 se nenhum slug/barbershopId for enviado', async () => {
      const { GET } = await import('@/app/api/services/public/route')
      const req = new NextRequest('http://localhost/api/services/public')
      const res = await GET(req)

      expect(res.status).toBe(400)
      expect(prisma.service.findMany).not.toHaveBeenCalled()
    })

    it('retorna 404 se a barbearia estiver inativa', async () => {
      const { GET } = await import('@/app/api/services/public/route')
      const req = new NextRequest('http://localhost/api/services/public?slug=barbearia-inativa')
      const res = await GET(req)

      expect(res.status).toBe(404)
      expect(prisma.service.findMany).not.toHaveBeenCalled()
    })
  })

  describe('4. Isolamento Multi-Tenant em Barbeiros (/api/users/public)', () => {
    it('/b/barbearia-a: retorna somente profissionais vinculados à Barbearia A', async () => {
      ;(prisma.user.findMany as any).mockResolvedValue([
        { id: 'barber_a1', name: 'Barbeiro Alfa', barbershopId: 'shop_A', role: 'BARBER' },
      ])

      const { GET } = await import('@/app/api/users/public/route')
      const req = new NextRequest('http://localhost/api/users/public?slug=barbearia-a&role=BARBER')
      const res = await GET(req)

      expect(res.status).toBe(200)
      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            barbershopId: 'shop_A',
            role: 'BARBER',
            isActive: true,
          }),
        })
      )
    })

    it('/b/barbearia-b: retorna somente profissionais vinculados à Barbearia B', async () => {
      ;(prisma.user.findMany as any).mockResolvedValue([
        { id: 'barber_b1', name: 'Barbeiro Beta', barbershopId: 'shop_B', role: 'BARBER' },
      ])

      const { GET } = await import('@/app/api/users/public/route')
      const req = new NextRequest('http://localhost/api/users/public?slug=barbearia-b&role=BARBER')
      const res = await GET(req)

      expect(res.status).toBe(200)
      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            barbershopId: 'shop_B',
            role: 'BARBER',
            isActive: true,
          }),
        })
      )
    })

    it('rejeita com 400 se nenhum slug/barbershopId for enviado', async () => {
      const { GET } = await import('@/app/api/users/public/route')
      const req = new NextRequest('http://localhost/api/users/public?role=BARBER')
      const res = await GET(req)

      expect(res.status).toBe(400)
      expect(prisma.user.findMany).not.toHaveBeenCalled()
    })
  })

  describe('5. Isolamento e Validação Cruzada em Agendamentos (/api/appointments/public)', () => {
    it('GET disponibilidade: filtra agendamentos estritamente do tenant resolvido pelo slug', async () => {
      ;(prisma.appointment.findMany as any).mockResolvedValue([])

      const { GET } = await import('@/app/api/appointments/public/route')
      const req = new NextRequest('http://localhost/api/appointments/public?slug=barbearia-a')
      const res = await GET(req)

      expect(res.status).toBe(200)
      expect(prisma.appointment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            barbershopId: 'shop_A',
          }),
        })
      )
    })

    it('POST agendamento: rejeita quando o cliente pertence à Barbearia B tentando agendar na Barbearia A', async () => {
      // Cliente existe apenas em B
      ;(prisma.client.findFirst as any).mockResolvedValue(null)

      const { POST } = await import('@/app/api/appointments/public/route')
      const req = new NextRequest('http://localhost/api/appointments/public', {
        method: 'POST',
        body: JSON.stringify({
          slug: 'barbearia-a',
          clientId: 'client_from_shop_b',
          barberId: 'barber_a1',
          serviceId: 'srv_a1',
          startTime: '2026-10-10T14:00:00Z',
        }),
      })

      const res = await POST(req)
      expect(res.status).toBe(404)
      const data = await res.json()
      expect(data.error).toContain('Cliente não encontrado nesta barbearia')
    })

    it('POST agendamento: rejeita quando o serviço pertence à Barbearia B tentando agendar na Barbearia A', async () => {
      ;(prisma.client.findFirst as any).mockResolvedValue({ id: 'client_a' })
      // Serviço pertence a B (não encontrado em A)
      ;(prisma.service.findFirst as any).mockResolvedValue(null)

      const { POST } = await import('@/app/api/appointments/public/route')
      const req = new NextRequest('http://localhost/api/appointments/public', {
        method: 'POST',
        body: JSON.stringify({
          slug: 'barbearia-a',
          clientId: 'client_a',
          barberId: 'barber_a1',
          serviceId: 'srv_from_b',
          startTime: '2026-10-10T14:00:00Z',
        }),
      })

      const res = await POST(req)
      expect(res.status).toBe(404)
      const data = await res.json()
      expect(data.error).toContain('Serviço não encontrado')
    })

    it('POST agendamento: rejeita quando o barbeiro pertence à Barbearia B tentando agendar na Barbearia A', async () => {
      ;(prisma.client.findFirst as any).mockResolvedValue({ id: 'client_a' })
      ;(prisma.service.findFirst as any).mockResolvedValue({ id: 'srv_a1' })
      // Barbeiro pertence a B
      ;(prisma.user.findFirst as any).mockResolvedValue(null)

      const { POST } = await import('@/app/api/appointments/public/route')
      const req = new NextRequest('http://localhost/api/appointments/public', {
        method: 'POST',
        body: JSON.stringify({
          slug: 'barbearia-a',
          clientId: 'client_a',
          barberId: 'barber_from_b',
          serviceId: 'srv_a1',
          startTime: '2026-10-10T14:00:00Z',
        }),
      })

      const res = await POST(req)
      expect(res.status).toBe(404)
      const data = await res.json()
      expect(data.error).toContain('Barbeiro não encontrado')
    })

    it('POST agendamento: cria agendamento com sucesso quando todos os recursos pertencem legitimamente ao tenant do slug', async () => {
      ;(prisma.client.findFirst as any).mockResolvedValue({ id: 'client_a' })
      ;(prisma.service.findFirst as any).mockResolvedValue({ id: 'srv_a1' })
      ;(prisma.user.findFirst as any).mockResolvedValue({ id: 'barber_a1' })

      const { POST } = await import('@/app/api/appointments/public/route')
      const req = new NextRequest('http://localhost/api/appointments/public', {
        method: 'POST',
        body: JSON.stringify({
          slug: 'barbearia-a',
          clientId: 'client_a',
          barberId: 'barber_a1',
          serviceId: 'srv_a1',
          startTime: '2026-10-10T14:00:00Z',
        }),
      })

      const res = await POST(req)
      expect(res.status).toBe(201)
      const data = await res.json()
      expect(data.id).toBe('created_apt_public_id')
      expect(data.barbershopId).toBe('shop_A')
    })
  })
})
