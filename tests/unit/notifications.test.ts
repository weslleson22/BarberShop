import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/prisma', () => ({
  prisma: {
    notification: { create: vi.fn() },
    user: { findMany: vi.fn() },
    client: { findUnique: vi.fn() },
  },
}))

import { prisma } from '@/lib/prisma'
import {
  notifyBarberNewAppointment,
  notifyAdminsNewAppointment,
  notifyClientStatusChange,
  notifyAdminsLastMinuteCancellation,
  notifyAdminsNewClient,
} from '@/lib/notifications'

const createMock = prisma.notification.create as unknown as ReturnType<typeof vi.fn>
const findManyMock = prisma.user.findMany as unknown as ReturnType<typeof vi.fn>
const clientFindUniqueMock = prisma.client.findUnique as unknown as ReturnType<typeof vi.fn>

function futureAppointment(hoursFromNow: number) {
  return {
    id: 'apt_1',
    startTime: new Date(Date.now() + hoursFromNow * 60 * 60 * 1000),
    barberId: 'barber_1',
    barbershopId: 'shop_1',
    clientId: 'client_1',
    client: { name: 'Maria' },
  }
}

describe('lib/notifications', () => {
  beforeEach(() => {
    createMock.mockReset()
    findManyMock.mockReset()
    clientFindUniqueMock.mockReset()
  })

  it('notifica o barbeiro do agendamento com nome do cliente e horário', async () => {
    const appointment = futureAppointment(24)
    await notifyBarberNewAppointment(appointment)

    expect(createMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: 'barber_1',
          message: expect.stringContaining('Maria'),
        }),
      })
    )
  })

  it('notifica todos os admins ativos da barbearia sobre novo agendamento', async () => {
    findManyMock.mockResolvedValue([{ id: 'admin_1' }, { id: 'admin_2' }])
    await notifyAdminsNewAppointment(futureAppointment(24))

    expect(findManyMock).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ barbershopId: 'shop_1', role: 'ADMIN' }) })
    )
    expect(createMock).toHaveBeenCalledTimes(2)
  })

  it('notifica o cliente vinculado quando o status muda', async () => {
    clientFindUniqueMock.mockResolvedValue({ userId: 'user_client_1' })
    await notifyClientStatusChange(futureAppointment(24), 'CONFIRMED')

    expect(createMock).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ userId: 'user_client_1' }) })
    )
  })

  it('não notifica cliente sem conta vinculada (Client.userId nulo)', async () => {
    clientFindUniqueMock.mockResolvedValue({ userId: null })
    await notifyClientStatusChange(futureAppointment(24), 'CONFIRMED')

    expect(createMock).not.toHaveBeenCalled()
  })

  it('notifica admins em cancelamento de última hora (dentro de 2h)', async () => {
    findManyMock.mockResolvedValue([{ id: 'admin_1' }])
    await notifyAdminsLastMinuteCancellation(futureAppointment(1))

    expect(createMock).toHaveBeenCalledTimes(1)
  })

  it('não notifica admins em cancelamento com mais de 2h de antecedência', async () => {
    findManyMock.mockResolvedValue([{ id: 'admin_1' }])
    await notifyAdminsLastMinuteCancellation(futureAppointment(5))

    expect(findManyMock).not.toHaveBeenCalled()
    expect(createMock).not.toHaveBeenCalled()
  })

  it('notifica admins sobre novo cliente, excluindo quem cadastrou', async () => {
    findManyMock.mockResolvedValue([{ id: 'admin_2' }])
    await notifyAdminsNewClient('João', 'shop_1', 'admin_1')

    expect(findManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: { not: 'admin_1' } }),
      })
    )
  })
})
