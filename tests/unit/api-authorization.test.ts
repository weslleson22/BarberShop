import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// Testes de autorização das rotas de API: role, tenant e ownership.
// Tudo mockado (sem banco real) — o objetivo aqui é garantir que a lógica de
// autorização em si está correta, não testar o Prisma.

vi.mock('@/lib/api-auth', () => ({
  getAuthUser: vi.fn(),
  requireRole: (user: any, roles: string[]) => !!user && roles.includes(user.role),
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: { findMany: vi.fn(), create: vi.fn(), findFirst: vi.fn(), findUnique: vi.fn() },
    client: { findMany: vi.fn(), findUnique: vi.fn(), findFirst: vi.fn(), create: vi.fn(), delete: vi.fn(), update: vi.fn() },
    appointment: { findMany: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
    service: { findMany: vi.fn() },
  },
}))

vi.mock('@/lib/auth', () => ({
  hashPassword: vi.fn().mockResolvedValue('hashed'),
}))

vi.mock('@/lib/client-sync', () => ({
  ensureClientForUser: vi.fn(),
}))

import { getAuthUser } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'

const mockedGetAuthUser = getAuthUser as unknown as ReturnType<typeof vi.fn>

function makeUser(overrides: Record<string, any> = {}) {
  return {
    id: 'user_1',
    name: 'Test User',
    email: 'test@test.com',
    role: 'ADMIN',
    barbershopId: 'barbershop_A',
    ...overrides,
  }
}

function makeRequest(url = 'http://localhost/api/users') {
  return new NextRequest(url)
}

describe('GET /api/users — role e tenant', () => {
  beforeEach(() => {
    mockedGetAuthUser.mockReset()
    ;(prisma.user.findMany as any).mockReset()
  })

  it('rejeita requisição sem autenticação', async () => {
    mockedGetAuthUser.mockReturnValue(null)
    const { GET } = await import('@/app/api/users/route')

    const res = await GET(makeRequest())
    expect(res.status).toBe(401)
  })

  it('rejeita CLIENT (fora do escopo de "equipe")', async () => {
    mockedGetAuthUser.mockReturnValue(makeUser({ role: 'CLIENT' }))
    const { GET } = await import('@/app/api/users/route')

    const res = await GET(makeRequest())
    expect(res.status).toBe(401)
  })

  it('ADMIN autenticado só busca usuários da própria barbearia', async () => {
    mockedGetAuthUser.mockReturnValue(makeUser({ role: 'ADMIN', barbershopId: 'barbershop_A' }))
    ;(prisma.user.findMany as any).mockResolvedValue([])
    const { GET } = await import('@/app/api/users/route')

    const res = await GET(makeRequest())
    expect(res.status).toBe(200)
    expect(prisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ barbershopId: 'barbershop_A' }),
      })
    )
  })
})

describe('POST /api/users — só ADMIN cria', () => {
  beforeEach(() => {
    mockedGetAuthUser.mockReset()
  })

  it('rejeita BARBER tentando criar usuário', async () => {
    mockedGetAuthUser.mockReturnValue(makeUser({ role: 'BARBER' }))
    const { POST } = await import('@/app/api/users/route')

    const req = new NextRequest('http://localhost/api/users', {
      method: 'POST',
      body: JSON.stringify({ name: 'X', email: 'x@x.com', role: 'BARBER', password: '123456' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(401)
  })
})

describe('POST/DELETE /api/clients — BARBER é view-only', () => {
  beforeEach(() => {
    mockedGetAuthUser.mockReset()
  })

  it('rejeita BARBER tentando criar cliente', async () => {
    mockedGetAuthUser.mockReturnValue(makeUser({ role: 'BARBER' }))
    const { POST } = await import('@/app/api/clients/route')

    const req = new NextRequest('http://localhost/api/clients', {
      method: 'POST',
      body: JSON.stringify({ name: 'Cliente X', phone: '11999999999' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(401)
  })

  it('permite RECEPTIONIST criar cliente', async () => {
    mockedGetAuthUser.mockReturnValue(makeUser({ role: 'RECEPTIONIST', barbershopId: 'barbershop_A' }))
    ;(prisma.client.create as any).mockResolvedValue({ id: 'c1', name: 'Cliente X' })
    const { POST } = await import('@/app/api/clients/route')

    const req = new NextRequest('http://localhost/api/clients', {
      method: 'POST',
      body: JSON.stringify({ name: 'Cliente X', phone: '11999999999' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(201)
  })
})

describe('GET/PUT/DELETE /api/appointments/[id] — ownership e tenant', () => {
  const paramsFor = (id: string) => ({ params: Promise.resolve({ id }) })

  beforeEach(() => {
    mockedGetAuthUser.mockReset()
    ;(prisma.appointment.findUnique as any).mockReset()
  })

  it('rejeita acesso a agendamento de outro tenant (404, não vaza existência)', async () => {
    mockedGetAuthUser.mockReturnValue(makeUser({ role: 'ADMIN', barbershopId: 'barbershop_A' }))
    ;(prisma.appointment.findUnique as any).mockResolvedValue({
      id: 'apt_1',
      barbershopId: 'barbershop_B', // tenant diferente
      barberId: 'barber_1',
      client: { userId: 'client_user_1' },
    })
    const { GET } = await import('@/app/api/appointments/[id]/route')

    const res = await GET(makeRequest('http://localhost/api/appointments/apt_1'), paramsFor('apt_1'))
    expect(res.status).toBe(404)
  })

  it('BARBER não acessa agendamento de outro barbeiro (mesmo tenant)', async () => {
    mockedGetAuthUser.mockReturnValue(makeUser({ id: 'barber_A', role: 'BARBER', barbershopId: 'barbershop_A' }))
    ;(prisma.appointment.findUnique as any).mockResolvedValue({
      id: 'apt_1',
      barbershopId: 'barbershop_A',
      barberId: 'barber_B', // outro barbeiro
      client: { userId: 'client_user_1' },
    })
    const { GET } = await import('@/app/api/appointments/[id]/route')

    const res = await GET(makeRequest('http://localhost/api/appointments/apt_1'), paramsFor('apt_1'))
    expect(res.status).toBe(404)
  })

  it('CLIENT não acessa agendamento de outro cliente', async () => {
    mockedGetAuthUser.mockReturnValue(makeUser({ id: 'client_user_A', role: 'CLIENT', barbershopId: 'barbershop_A' }))
    ;(prisma.appointment.findUnique as any).mockResolvedValue({
      id: 'apt_1',
      barbershopId: 'barbershop_A',
      barberId: 'barber_1',
      client: { userId: 'client_user_B' }, // outro cliente
    })
    const { GET } = await import('@/app/api/appointments/[id]/route')

    const res = await GET(makeRequest('http://localhost/api/appointments/apt_1'), paramsFor('apt_1'))
    expect(res.status).toBe(404)
  })

  it('CLIENT não consegue marcar o próprio agendamento como COMPLETED via PATCH', async () => {
    mockedGetAuthUser.mockReturnValue(makeUser({ id: 'client_user_A', role: 'CLIENT', barbershopId: 'barbershop_A' }))
    ;(prisma.appointment.findUnique as any).mockResolvedValue({
      id: 'apt_1',
      barbershopId: 'barbershop_A',
      barberId: 'barber_1',
      client: { userId: 'client_user_A' }, // é o dono
    })
    const { PATCH } = await import('@/app/api/appointments/[id]/route')

    const req = new NextRequest('http://localhost/api/appointments/apt_1', {
      method: 'PATCH',
      body: JSON.stringify({ status: 'COMPLETED' }),
    })
    const res = await PATCH(req, paramsFor('apt_1'))
    expect(res.status).toBe(403)
  })

  it('CLIENT consegue cancelar o próprio agendamento via PATCH', async () => {
    mockedGetAuthUser.mockReturnValue(makeUser({ id: 'client_user_A', role: 'CLIENT', barbershopId: 'barbershop_A' }))
    ;(prisma.appointment.findUnique as any).mockResolvedValue({
      id: 'apt_1',
      barbershopId: 'barbershop_A',
      barberId: 'barber_1',
      client: { userId: 'client_user_A' },
    })
    ;(prisma.appointment.update as any).mockResolvedValue({ id: 'apt_1', status: 'CANCELLED' })
    const { PATCH } = await import('@/app/api/appointments/[id]/route')

    const req = new NextRequest('http://localhost/api/appointments/apt_1', {
      method: 'PATCH',
      body: JSON.stringify({ status: 'CANCELLED' }),
    })
    const res = await PATCH(req, paramsFor('apt_1'))
    expect(res.status).toBe(200)
  })
})

describe('GET /api/appointments — filtro abrangente para CLIENT', () => {
  beforeEach(() => {
    mockedGetAuthUser.mockReset()
    ;(prisma.appointment.findMany as any).mockReset()
    ;(prisma.client.findUnique as any).mockReset()
  })

  it('CLIENT busca agendamentos por clientId, createdBy e email', async () => {
    mockedGetAuthUser.mockReturnValue(makeUser({
      id: 'client_user_1',
      role: 'CLIENT',
      email: 'client@test.com',
      barbershopId: 'barbershop_A'
    }))
    ;(prisma.client.findUnique as any).mockResolvedValue({ id: 'client_rec_1', userId: 'client_user_1' })
    ;(prisma.appointment.findMany as any).mockResolvedValue([])

    const { GET } = await import('@/app/api/appointments/route')
    const res = await GET(makeRequest('http://localhost/api/appointments'))

    expect(res.status).toBe(200)
    expect(prisma.appointment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          barbershopId: 'barbershop_A',
          AND: expect.arrayContaining([
            expect.objectContaining({
              OR: expect.arrayContaining([
                { createdBy: 'client_user_1' },
                { client: { userId: 'client_user_1' } },
                { clientId: 'client_rec_1' },
                { client: { email: 'client@test.com' } },
              ])
            })
          ])
        })
      })
    )
  })
})

describe('GET /api/dashboard/stats — autorização e resiliência', () => {
  beforeEach(() => {
    mockedGetAuthUser.mockReset()
    ;(prisma.appointment.findMany as any).mockReset()
    ;(prisma.client.findMany as any).mockReset()
    ;(prisma.service.findMany as any).mockReset()
    ;(prisma.user.findMany as any).mockReset()
  })

  it('permite CLIENT buscar estatísticas sem erro 401', async () => {
    mockedGetAuthUser.mockReturnValue(makeUser({
      id: 'client_user_1',
      role: 'CLIENT',
      email: 'client@test.com',
      barbershopId: 'barbershop_A'
    }))
    ;(prisma.appointment.findMany as any).mockResolvedValue([])
    ;(prisma.client.findMany as any).mockResolvedValue([])
    ;(prisma.service.findMany as any).mockResolvedValue([])
    ;(prisma.user.findMany as any).mockResolvedValue([])

    const { GET } = await import('@/app/api/dashboard/stats/route')
    const res = await GET(makeRequest('http://localhost/api/dashboard/stats'))

    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.appointments).toBeDefined()
  })
})
