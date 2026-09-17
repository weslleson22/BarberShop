import { describe, it, expect } from 'vitest'

interface MockAppointment {
  id: string
  barbershopId: string
  startTime: string
  endTime: string
  status: 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED'
  totalAmount: number
  notes?: string
  client: {
    id: string
    name: string
    phone: string
  }
  barber: {
    id: string
    name: string
  }
  service: {
    id: string
    name: string
    price: number
    duration: number
  }
}

// Funções de negócio espelhando as implementadas no frontend e backend
export function calculateAppointmentStats(appointments: MockAppointment[]) {
  const total = appointments.length
  const pending = appointments.filter(a => a.status === 'PENDING' || a.status === 'CONFIRMED').length
  const completed = appointments.filter(a => a.status === 'COMPLETED').length
  const cancelled = appointments.filter(a => a.status === 'CANCELLED').length

  return {
    total,
    pending,
    completed,
    cancelled,
    isConsistent: pending + completed + cancelled === total,
  }
}

export function filterAppointmentsBySearch(appointments: MockAppointment[], query: string) {
  if (!query || !query.trim()) return appointments
  const term = query.trim().toLowerCase()
  return appointments.filter(a => {
    const clientMatch = a.client.name.toLowerCase().includes(term) || a.client.phone.includes(term)
    const barberMatch = a.barber.name.toLowerCase().includes(term)
    const serviceMatch = a.service.name.toLowerCase().includes(term)
    const notesMatch = a.notes?.toLowerCase().includes(term) || false
    return clientMatch || barberMatch || serviceMatch || notesMatch
  })
}

export function isSameLocalDate(dateA: Date | string, dateB: Date | string): boolean {
  const da = new Date(dateA)
  const db = new Date(dateB)
  return (
    da.getFullYear() === db.getFullYear() &&
    da.getMonth() === db.getMonth() &&
    da.getDate() === db.getDate()
  )
}

export function getAvailableActions(status: string, userRole: 'ADMIN' | 'BARBER') {
  return {
    canViewDetails: true, // Sempre disponível
    canComplete: status === 'PENDING' || status === 'CONFIRMED',
    canEdit: status !== 'CANCELLED',
    canCancel: status !== 'CANCELLED',
  }
}

describe('Agenda Indicators & Filtering - Unit Tests', () => {
  const mockAppointments: MockAppointment[] = [
    {
      id: 'apt-1',
      barbershopId: 'shop-1',
      startTime: '2026-09-16T14:00:00.000Z',
      endTime: '2026-09-16T14:30:00.000Z',
      status: 'PENDING',
      totalAmount: 35,
      client: { id: 'c1', name: 'Pedro Costa', phone: '11999990001' },
      barber: { id: 'b1', name: 'Carlos Barbeiro' },
      service: { id: 's1', name: 'Corte Degradê', price: 35, duration: 30 },
    },
    {
      id: 'apt-2',
      barbershopId: 'shop-1',
      startTime: '2026-09-16T15:00:00.000Z',
      endTime: '2026-09-16T15:30:00.000Z',
      status: 'CONFIRMED',
      totalAmount: 50,
      client: { id: 'c2', name: 'João Santos', phone: '11999990002' },
      barber: { id: 'b1', name: 'Carlos Barbeiro' },
      service: { id: 's2', name: 'Barba e Cabelo', price: 50, duration: 45 },
    },
    {
      id: 'apt-3',
      barbershopId: 'shop-1',
      startTime: '2026-09-16T16:00:00.000Z',
      endTime: '2026-09-16T16:30:00.000Z',
      status: 'COMPLETED',
      totalAmount: 25,
      client: { id: 'c3', name: 'Marcos Lima', phone: '11999990003' },
      barber: { id: 'b2', name: 'Pedro Barbeiro' },
      service: { id: 's3', name: 'Corte Simples', price: 25, duration: 30 },
    },
    {
      id: 'apt-4',
      barbershopId: 'shop-1',
      startTime: '2026-09-16T17:00:00.000Z',
      endTime: '2026-09-16T17:30:00.000Z',
      status: 'CANCELLED',
      totalAmount: 35,
      notes: 'Desistência do cliente',
      client: { id: 'c4', name: 'Lucas Silva', phone: '11999990004' },
      barber: { id: 'b2', name: 'Pedro Barbeiro' },
      service: { id: 's1', name: 'Corte Degradê', price: 35, duration: 30 },
    },
    {
      id: 'apt-5',
      barbershopId: 'shop-2', // Outra barbearia (multi-tenant)
      startTime: '2026-09-16T18:00:00.000Z',
      endTime: '2026-09-16T18:30:00.000Z',
      status: 'PENDING',
      totalAmount: 40,
      client: { id: 'c5', name: 'Cliente de Outro Tenant', phone: '11999990005' },
      barber: { id: 'b3', name: 'Outro Barbeiro' },
      service: { id: 's4', name: 'Corte e Barba', price: 40, duration: 45 },
    },
  ]

  describe('Cards de Indicadores', () => {
    it('deve calcular corretamente Total, Pendentes (incluindo CONFIRMED), Concluídos e Cancelados', () => {
      const shopAppointments = mockAppointments.filter(a => a.barbershopId === 'shop-1')
      const stats = calculateAppointmentStats(shopAppointments)

      expect(stats.total).toBe(4)
      expect(stats.pending).toBe(2) // 1 PENDING + 1 CONFIRMED
      expect(stats.completed).toBe(1)
      expect(stats.cancelled).toBe(1)
      expect(stats.isConsistent).toBe(true)
    })

    it('deve manter a soma consistente (Pendentes + Concluídos + Cancelados === Total)', () => {
      const stats = calculateAppointmentStats(mockAppointments)
      expect(stats.pending + stats.completed + stats.cancelled).toBe(stats.total)
    })
  })

  describe('Busca e Filtros', () => {
    const shopAppointments = mockAppointments.filter(a => a.barbershopId === 'shop-1')

    it('deve filtrar agendamentos por nome do cliente', () => {
      const results = filterAppointmentsBySearch(shopAppointments, 'pedro costa')
      expect(results.length).toBe(1)
      expect(results[0].id).toBe('apt-1')
    })

    it('deve filtrar agendamentos por telefone do cliente', () => {
      const results = filterAppointmentsBySearch(shopAppointments, '0002')
      expect(results.length).toBe(1)
      expect(results[0].client.name).toBe('João Santos')
    })

    it('deve filtrar agendamentos por nome do serviço', () => {
      const results = filterAppointmentsBySearch(shopAppointments, 'Degradê')
      expect(results.length).toBe(2)
    })

    it('deve filtrar agendamentos por observações', () => {
      const results = filterAppointmentsBySearch(shopAppointments, 'Desistência')
      expect(results.length).toBe(1)
      expect(results[0].id).toBe('apt-4')
    })
  })

  describe('Comparação de Data Local (Prevenção de bug UTC noturno)', () => {
    it('deve comparar datas locais sem distorção por fuso horário', () => {
      const aptTime = new Date('2026-09-16T22:30:00.000Z') // 19:30 em Brasília (UTC-3)
      const sameDayLocal = new Date(2026, 8, 16, 21, 0, 0) // 21:00 no fuso local

      expect(isSameLocalDate(aptTime, sameDayLocal)).toBe(true)
    })

    it('não deve misturar dias diferentes', () => {
      const day1 = new Date(2026, 8, 16)
      const day2 = new Date(2026, 8, 17)
      expect(isSameLocalDate(day1, day2)).toBe(false)
    })
  })

  describe('Ações Disponíveis por Status e Perfil', () => {
    it('deve permitir visualizar detalhes para todos os status, inclusive CANCELLED', () => {
      expect(getAvailableActions('CANCELLED', 'ADMIN').canViewDetails).toBe(true)
      expect(getAvailableActions('COMPLETED', 'ADMIN').canViewDetails).toBe(true)
      expect(getAvailableActions('PENDING', 'BARBER').canViewDetails).toBe(true)
      expect(getAvailableActions('CONFIRMED', 'BARBER').canViewDetails).toBe(true)
    })

    it('deve permitir concluir apenas agendamentos PENDING ou CONFIRMED', () => {
      expect(getAvailableActions('PENDING', 'ADMIN').canComplete).toBe(true)
      expect(getAvailableActions('CONFIRMED', 'ADMIN').canComplete).toBe(true)
      expect(getAvailableActions('COMPLETED', 'ADMIN').canComplete).toBe(false)
      expect(getAvailableActions('CANCELLED', 'ADMIN').canComplete).toBe(false)
    })

    it('deve bloquear edição e cancelamento em agendamentos já cancelados', () => {
      expect(getAvailableActions('CANCELLED', 'ADMIN').canEdit).toBe(false)
      expect(getAvailableActions('CANCELLED', 'ADMIN').canCancel).toBe(false)
    })
  })

  describe('Multi-Tenancy Isolation', () => {
    it('deve isolar agendamentos entre barbearias diferentes', () => {
      const shop1Only = mockAppointments.filter(a => a.barbershopId === 'shop-1')
      const shop2Only = mockAppointments.filter(a => a.barbershopId === 'shop-2')

      expect(shop1Only.length).toBe(4)
      expect(shop2Only.length).toBe(1)
      expect(shop1Only.every(a => a.barbershopId === 'shop-1')).toBe(true)
      expect(shop2Only.every(a => a.barbershopId === 'shop-2')).toBe(true)
    })
  })
})
