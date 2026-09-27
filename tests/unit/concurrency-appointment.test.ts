import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import {
  criarAgendamento,
  verificarDisponibilidade,
  reagendarAgendamento,
  ConcurrencyConflictError,
  BLOCKING_APPOINTMENT_STATUSES,
} from '@/lib/appointment-scheduler'
import { POST as publicPostAppointment } from '@/app/api/appointments/public/route'
import { prisma } from '@/lib/prisma'

// Mock de notificações para não disparar emails/push reais
vi.mock('@/lib/notifications', () => ({
  notifyBarberNewAppointment: vi.fn().mockResolvedValue(true),
  notifyAdminsNewAppointment: vi.fn().mockResolvedValue(true),
  notifyClientNewAppointment: vi.fn().mockResolvedValue(true),
}))

// Mock de tenant resolution para rota pública
vi.mock('@/lib/tenant', () => ({
  resolvePublicTenant: vi.fn().mockImplementation(async (identifier: string | null) => {
    if (identifier === 'barbearia-a' || identifier === 'shop_A') {
      return { success: true, tenant: { id: 'shop_A', name: 'Barbearia A', slug: 'barbearia-a', isActive: true, status: 'APPROVED' } }
    }
    if (identifier === 'barbearia-b' || identifier === 'shop_B') {
      return { success: true, tenant: { id: 'shop_B', name: 'Barbearia B', slug: 'barbearia-b', isActive: true, status: 'APPROVED' } }
    }
    return { success: false, error: 'Barbearia não encontrada', status: 404 }
  }),
}))

describe('SISTEMA DE RESERVAS — CONCORRÊNCIA, ISOLAMENTO E ATOMICIDADE', () => {
  // Banco de dados em memória simulado para testes concorrentes
  let inMemoryAppointments: any[] = []
  const activeAdvisoryLocks = new Set<string>()

  // Tabela simulada de serviços
  const mockServices = [
    { id: 'srv_30m_A', barbershopId: 'shop_A', name: 'Corte Rápido', duration: 30, price: 50, isActive: true },
    { id: 'srv_60m_A', barbershopId: 'shop_A', name: 'Corte Completo + Barba', duration: 60, price: 90, isActive: true },
    { id: 'srv_30m_B', barbershopId: 'shop_B', name: 'Barba Terapia', duration: 30, price: 45, isActive: true },
  ]

  // Tabela simulada de barbeiros (Users)
  const mockBarbers = [
    { id: 'barber_1_A', barbershopId: 'shop_A', name: 'Barbeiro Alfa', role: 'BARBER', isActive: true },
    { id: 'barber_2_A', barbershopId: 'shop_A', name: 'Barbeiro Beta', role: 'BARBER', isActive: true },
    { id: 'barber_1_B', barbershopId: 'shop_B', name: 'Barbeiro Gama', role: 'BARBER', isActive: true },
  ]

  // Tabela simulada de clientes
  const mockClients = [
    { id: 'client_1_A', barbershopId: 'shop_A', name: 'Cliente A1', isVip: false },
    { id: 'client_2_A', barbershopId: 'shop_A', name: 'Cliente A2', isVip: false },
    { id: 'client_1_B', barbershopId: 'shop_B', name: 'Cliente B1', isVip: false },
  ]

  beforeEach(() => {
    inMemoryAppointments = []
    activeAdvisoryLocks.clear()
    vi.clearAllMocks()

    // Configura o mock do Prisma para simular de forma fiel o comportamento transacional do PostgreSQL
    // Criação de uma fila mutex de locks para simular pg_advisory_xact_lock
    const lockQueues = new Map<string, Promise<void>>()

    async function acquireAdvisoryLock(key: string): Promise<() => void> {
      while (lockQueues.has(key)) {
        await lockQueues.get(key)
      }
      let releaseFn: () => void = () => {}
      const lockPromise = new Promise<void>((resolve) => {
        releaseFn = resolve
      })
      lockQueues.set(key, lockPromise)
      activeAdvisoryLocks.add(key)

      return () => {
        activeAdvisoryLocks.delete(key)
        lockQueues.delete(key)
        releaseFn()
      }
    }

    // Mock de prisma.$transaction
    vi.spyOn(prisma, '$transaction').mockImplementation(async (callback: any) => {
      let releaseCurrentLock: (() => void) | null = null

      const txMock: any = {
        $executeRaw: vi.fn().mockImplementation(async (query: any, ...args: any[]) => {
          // Extrai a chave do lock simulado
          const rawQuery = Array.isArray(query) ? query.join('') : String(query)
          const match = rawQuery.match(/barber_lock_([a-zA-Z0-9_]+)/)
          const key = match ? match[0] : 'default_lock'
          releaseCurrentLock = await acquireAdvisoryLock(key)
          return 1
        }),
        service: {
          findFirst: vi.fn().mockImplementation(async ({ where }: any) => {
            return mockServices.find(s => s.id === where.id && s.barbershopId === where.barbershopId) || null
          }),
        },
        client: {
          findFirst: vi.fn().mockImplementation(async ({ where }: any) => {
            return mockClients.find(c => c.id === where.id && c.barbershopId === where.barbershopId) || null
          }),
        },
        user: {
          findFirst: vi.fn().mockImplementation(async ({ where }: any) => {
            return mockBarbers.find(b => b.id === where.id && b.barbershopId === where.barbershopId && b.isActive && b.role === 'BARBER') || null
          }),
        },
        appointment: {
          findFirst: vi.fn().mockImplementation(async ({ where }: any) => {
            return inMemoryAppointments.find(apt => {
              if (apt.barbershopId !== where.barbershopId) return false
              if (apt.barberId !== where.barberId) return false
              if (where.id?.not && apt.id === where.id.not) return false
              
              // Verificação de status bloqueante
              if (where.status?.in && !where.status.in.includes(apt.status)) {
                return false
              }
              if (where.status?.notIn && where.status.notIn.includes(apt.status)) {
                return false
              }

              // Verificação de sobreposição: (novoInicio < existenteFim) E (novoFim > existenteInicio)
              const overlap = where.startTime?.lt > apt.startTime && where.endTime?.gt < apt.endTime ||
                (apt.startTime < where.startTime?.lt && apt.endTime > where.endTime?.gt)
              
              const startOverlap = apt.startTime < where.startTime.lt && apt.endTime > where.endTime.gt
              const hasOverlap = (where.endTime.gt < apt.endTime && where.startTime.lt > apt.startTime) ||
                (apt.startTime < where.startTime.lt && apt.endTime > where.endTime.gt)

              const newStart = where.endTime.gt // Na query tx: startTime.lt = newEndTime, endTime.gt = newStartTime
              const newEnd = where.startTime.lt

              return apt.startTime < newEnd && apt.endTime > newStart
            }) || null
          }),
          create: vi.fn().mockImplementation(async ({ data }: any) => {
            const newAppointment = {
              id: `apt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
              ...data,
              createdAt: new Date(),
              updatedAt: new Date(),
            }
            inMemoryAppointments.push(newAppointment)
            return newAppointment
          }),
          update: vi.fn().mockImplementation(async ({ where, data }: any) => {
            const index = inMemoryAppointments.findIndex(a => a.id === where.id)
            if (index !== -1) {
              inMemoryAppointments[index] = { ...inMemoryAppointments[index], ...data }
              return inMemoryAppointments[index]
            }
            throw new Error('Appointment not found')
          }),
          findUnique: vi.fn().mockImplementation(async ({ where }: any) => {
            const apt = inMemoryAppointments.find(a => a.id === where.id)
            if (!apt) return null
            return {
              ...apt,
              service: mockServices.find(s => s.id === apt.serviceId),
              barber: mockBarbers.find(b => b.id === apt.barberId),
              client: mockClients.find(c => c.id === apt.clientId),
            }
          }),
        },
      }

      try {
        const result = await callback(txMock)
        return result
      } finally {
        if (releaseCurrentLock) {
          (releaseCurrentLock as () => void)()
        }
      }
    })

    // Mock simples do prisma root para leituras normais
    ;(vi.spyOn(prisma.user, 'findFirst') as any).mockImplementation(async ({ where }: any) => {
      return mockBarbers.find(b => b.id === where.id && b.barbershopId === where.barbershopId && b.isActive) || null
    })
    ;(vi.spyOn(prisma.appointment, 'findFirst') as any).mockImplementation(async ({ where }: any) => {
      return inMemoryAppointments.find(apt => {
        if (apt.barbershopId !== where.barbershopId) return false
        if (apt.barberId !== where.barberId) return false
        if (where.id?.not && apt.id === where.id.not) return false
        if (where.status?.in && !where.status.in.includes(apt.status)) return false
        if (where.status?.notIn && where.status.notIn.includes(apt.status)) return false

        const newEnd = where.startTime?.lt
        const newStart = where.endTime?.gt
        if (newEnd && newStart) {
          return apt.startTime < newEnd && apt.endTime > newStart
        }
        return false
      }) || null
    })
    ;(vi.spyOn(prisma.appointment, 'findMany') as any).mockImplementation(async () => inMemoryAppointments)
    ;(vi.spyOn(prisma.client, 'findFirst') as any).mockImplementation(async ({ where }: any) => {
      return mockClients.find(c => c.id === where.id && c.barbershopId === where.barbershopId) || null
    })
    ;(vi.spyOn(prisma.service, 'findFirst') as any).mockImplementation(async ({ where }: any) => {
      return mockServices.find(s => s.id === where.id && s.barbershopId === where.barbershopId) || null
    })
    ;(vi.spyOn(prisma.barbershop, 'findUnique') as any).mockImplementation(async ({ where }: any) => {
      return { id: where.id, name: 'Barbearia A', isActive: true, contractExpiresAt: null }
    })
  })

  // Data futura válida no horário de funcionamento (2 dias à frente, 14:00 UTC = 11:00 BRT)
  const getFutureTime = (hourUtc = 14, minute = 0) => {
    const d = new Date()
    d.setDate(d.getDate() + 2)
    d.setUTCHours(hourUtc, minute, 0, 0)
    return d
  }

  it('1. Cenário de Corrida: dois clientes tentam reservar o mesmo horário, barbeiro e barbearia via Promise.all', async () => {
    const slotTime = getFutureTime(14, 0) // 10:00 - 10:30 (30 min)

    const requestA = criarAgendamento({
      barbershopId: 'shop_A',
      clientId: 'client_1_A',
      barberId: 'barber_1_A',
      serviceId: 'srv_30m_A',
      startTime: slotTime,
      notes: 'Reserva Cliente A',
    })

    const requestB = criarAgendamento({
      barbershopId: 'shop_A',
      clientId: 'client_2_A',
      barberId: 'barber_1_A',
      serviceId: 'srv_30m_A',
      startTime: slotTime,
      notes: 'Reserva Cliente B',
    })

    // Executa ambas as tentativas em concorrência real
    const results = await Promise.allSettled([requestA, requestB])

    const fulfilled = results.filter(r => r.status === 'fulfilled')
    const rejected = results.filter(r => r.status === 'rejected')

    // EXATAMENTE 1 deve ter sucesso
    expect(fulfilled).toHaveLength(1)
    // EXATAMENTE 1 deve falhar por conflito
    expect(rejected).toHaveLength(1)

    // O agendamento vencedor foi salvo com sucesso
    const winner = (fulfilled[0] as PromiseFulfilledResult<any>).value
    expect(winner).toBeDefined()
    expect(winner.status).toBe('PENDING')
    expect(winner.barberId).toBe('barber_1_A')

    // O agendamento perdedor recebe o erro ConcurrencyConflictError com código 409
    const loser = (rejected[0] as PromiseRejectedResult).reason
    expect(loser).toBeInstanceOf(ConcurrencyConflictError)
    expect(loser.statusCode).toBe(409)
    expect(loser.message).toBe('O horário acabou de ser reservado por outro cliente. Escolha outro horário.')

    // O banco de dados só possui 1 agendamento registrado
    expect(inMemoryAppointments).toHaveLength(1)
  })

  it('2. Multi-Tenant: Barbearia A x Barbearia B no mesmo horário e duração não geram conflito', async () => {
    const slotTime = getFutureTime(14, 0)

    const requestTenantA = criarAgendamento({
      barbershopId: 'shop_A',
      clientId: 'client_1_A',
      barberId: 'barber_1_A',
      serviceId: 'srv_30m_A',
      startTime: slotTime,
      notes: 'Reserva Barbearia A',
    })

    const requestTenantB = criarAgendamento({
      barbershopId: 'shop_B',
      clientId: 'client_1_B',
      barberId: 'barber_1_B',
      serviceId: 'srv_30m_B',
      startTime: slotTime,
      notes: 'Reserva Barbearia B',
    })

    // Executa simultaneamente
    const [resA, resB] = await Promise.all([requestTenantA, requestTenantB])

    // AMBOS devem ser criados com sucesso pois são de barbearias distintas!
    expect(resA).toBeDefined()
    expect(resA.barbershopId).toBe('shop_A')
    expect(resB).toBeDefined()
    expect(resB.barbershopId).toBe('shop_B')
    expect(inMemoryAppointments).toHaveLength(2)
  })

  it('3. Barbeiros Distintos na mesma barbearia no mesmo horário não geram conflito', async () => {
    const slotTime = getFutureTime(14, 0)

    const requestBarber1 = criarAgendamento({
      barbershopId: 'shop_A',
      clientId: 'client_1_A',
      barberId: 'barber_1_A',
      serviceId: 'srv_30m_A',
      startTime: slotTime,
    })

    const requestBarber2 = criarAgendamento({
      barbershopId: 'shop_A',
      clientId: 'client_2_A',
      barberId: 'barber_2_A',
      serviceId: 'srv_30m_A',
      startTime: slotTime,
    })

    const [res1, res2] = await Promise.all([requestBarber1, requestBarber2])

    expect(res1.barberId).toBe('barber_1_A')
    expect(res2.barberId).toBe('barber_2_A')
    expect(inMemoryAppointments).toHaveLength(2)
  })

  it('4. Detecção de sobreposição parcial de horários (interval overlap)', async () => {
    const slot1000 = getFutureTime(14, 0) // 10:00 (60 minutos -> 10:00 às 11:00)
    
    // Cria primeiro agendamento das 10:00 às 11:00
    await criarAgendamento({
      barbershopId: 'shop_A',
      clientId: 'client_1_A',
      barberId: 'barber_1_A',
      serviceId: 'srv_60m_A',
      startTime: slot1000,
    })

    // Tentativa 1: tentar agendar das 10:30 às 11:00 (inicia dentro do horário)
    const slot1030 = getFutureTime(14, 30)
    await expect(
      criarAgendamento({
        barbershopId: 'shop_A',
        clientId: 'client_2_A',
        barberId: 'barber_1_A',
        serviceId: 'srv_30m_A',
        startTime: slot1030,
      })
    ).rejects.toThrow(ConcurrencyConflictError)

    // Tentativa 2: agendamento imediatamente subsequente (11:00 às 11:30) DEVE ter sucesso
    const slot1100 = getFutureTime(15, 0)
    const aptAdjacent = await criarAgendamento({
      barbershopId: 'shop_A',
      clientId: 'client_2_A',
      barberId: 'barber_1_A',
      serviceId: 'srv_30m_A',
      startTime: slot1100,
    })
    expect(aptAdjacent).toBeDefined()
    expect(inMemoryAppointments).toHaveLength(2)
  })

  it('5. Status bloqueantes vs status não-bloqueantes (CANCELLED e NO_SHOW liberam o horário)', async () => {
    const slotTime = getFutureTime(14, 0)
    const endTime = new Date(slotTime.getTime() + 30 * 60000)

    // Adiciona um agendamento pré-existente CANCELLED no banco
    inMemoryAppointments.push({
      id: 'apt_cancelled',
      barbershopId: 'shop_A',
      clientId: 'client_1_A',
      barberId: 'barber_1_A',
      serviceId: 'srv_30m_A',
      startTime: slotTime,
      endTime: endTime,
      status: 'CANCELLED',
    })

    // Como o anterior está CANCELLED, o horário deve estar LIVRE
    const newBooking = await criarAgendamento({
      barbershopId: 'shop_A',
      clientId: 'client_2_A',
      barberId: 'barber_1_A',
      serviceId: 'srv_30m_A',
      startTime: slotTime,
    })

    expect(newBooking).toBeDefined()
    expect(newBooking.status).toBe('PENDING')

    // Altera o status para NO_SHOW
    newBooking.status = 'NO_SHOW'

    // Como está NO_SHOW, outro cliente também pode agendar no mesmo horário
    const anotherBooking = await criarAgendamento({
      barbershopId: 'shop_A',
      clientId: 'client_1_A',
      barberId: 'barber_1_A',
      serviceId: 'srv_30m_A',
      startTime: slotTime,
    })

    expect(anotherBooking).toBeDefined()
    expect(anotherBooking.status).toBe('PENDING')
  })

  it('6. Status bloqueantes (PENDING, CONFIRMED, COMPLETED) impedem novas reservas', () => {
    expect(BLOCKING_APPOINTMENT_STATUSES).toContain('PENDING')
    expect(BLOCKING_APPOINTMENT_STATUSES).toContain('CONFIRMED')
    expect(BLOCKING_APPOINTMENT_STATUSES).toContain('COMPLETED')
    expect(BLOCKING_APPOINTMENT_STATUSES).not.toContain('CANCELLED')
    expect(BLOCKING_APPOINTMENT_STATUSES).not.toContain('NO_SHOW')
  })

  it('7. Rota Pública POST /api/appointments/public: devolve status HTTP 409 com mensagem amigável e sem stack trace', async () => {
    const slotTime = getFutureTime(14, 0)

    // 1º Agendamento via API pública
    const req1 = new NextRequest('http://localhost:3000/api/appointments/public', {
      method: 'POST',
      body: JSON.stringify({
        slug: 'barbearia-a',
        clientId: 'client_1_A',
        barberId: 'barber_1_A',
        serviceId: 'srv_30m_A',
        startTime: slotTime.toISOString(),
      }),
    })

    const res1 = await publicPostAppointment(req1)
    expect(res1.status).toBe(201)

    // 2º Agendamento no mesmo horário (conflito)
    const req2 = new NextRequest('http://localhost:3000/api/appointments/public', {
      method: 'POST',
      body: JSON.stringify({
        slug: 'barbearia-a',
        clientId: 'client_2_A',
        barberId: 'barber_1_A',
        serviceId: 'srv_30m_A',
        startTime: slotTime.toISOString(),
      }),
    })

    const res2 = await publicPostAppointment(req2)
    expect(res2.status).toBe(409)

    const json = await res2.json()
    expect(json.error).toBe('O horário acabou de ser reservado por outro cliente. Escolha outro horário.')
    expect(json.code).toBe('SLOT_CONFLICT')
    // Não expõe stack trace
    expect(json.stack).toBeUndefined()
  })

  it('8. Reagendamento atômico detecta conflito e impede duplicação', async () => {
    const slot1 = getFutureTime(14, 0)
    const slot2 = getFutureTime(15, 0)

    // Cliente 1 agenda às 14:00
    const apt1 = await criarAgendamento({
      barbershopId: 'shop_A',
      clientId: 'client_1_A',
      barberId: 'barber_1_A',
      serviceId: 'srv_30m_A',
      startTime: slot1,
    })

    // Cliente 2 agenda às 15:00
    const apt2 = await criarAgendamento({
      barbershopId: 'shop_A',
      clientId: 'client_2_A',
      barberId: 'barber_1_A',
      serviceId: 'srv_30m_A',
      startTime: slot2,
    })

    // Cliente 2 tenta reagendar para o horário do Cliente 1 (slot 1)
    await expect(
      reagendarAgendamento(apt2.id, 'shop_A', slot1)
    ).rejects.toThrow(ConcurrencyConflictError)
  })
})
