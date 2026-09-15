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
    user: { findMany: vi.fn(), create: vi.fn(), findFirst: vi.fn() },
    client: { findMany: vi.fn(), findUnique: vi.fn(), findFirst: vi.fn(), create: vi.fn(), delete: vi.fn() },
    appointment: { findUnique: vi.fn(), update: vi.fn() },
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
