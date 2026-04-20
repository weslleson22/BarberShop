import { describe, it, expect, beforeEach } from 'vitest'
import {
  hasAppointmentConflict,
  calculateAvailableSlots,
  validateAppointmentTime,
  checkPermission,
  filterByBarbershop,
  validateMultiTenantIsolation
} from '@/lib/appointment-utils'

describe('Appointment Utils - Unit Tests', () => {
  const baseDate = new Date('2026-04-20T10:00:00')
  const serviceDuration = 30
  
  describe('hasAppointmentConflict', () => {
    it('deve permitir horário livre quando não há agendamentos existentes', () => {
      const existingAppointments = []
      const newStartTime = new Date('2026-04-20T10:00:00')
      const newEndTime = new Date('2026-04-20T10:30:00')
      
      expect(hasAppointmentConflict(newStartTime, newEndTime, existingAppointments)).toBe(false)
    })
    
    it('deve bloquear conflito direto (mesmo horário)', () => {
      const existingAppointments = [
        {
          id: '1',
          startTime: new Date('2026-04-20T10:00:00'),
          endTime: new Date('2026-04-20T10:30:00'),
          service: { duration: 30, price: 35, name: 'Corte' },
          client: { name: 'João' },
          barber: { name: 'Carlos' }
        }
      ]
      
      const newStartTime = new Date('2026-04-20T10:00:00')
      const newEndTime = new Date('2026-04-20T10:30:00')
      
      expect(hasAppointmentConflict(newStartTime, newEndTime, existingAppointments)).toBe(true)
    })
    
    it('deve bloquear sobreposição parcial (começa durante existente)', () => {
      const existingAppointments = [
        {
          id: '1',
          startTime: new Date('2026-04-20T10:00:00'),
          endTime: new Date('2026-04-20T10:30:00'),
          service: { duration: 30, price: 35, name: 'Corte' },
          client: { name: 'João' },
          barber: { name: 'Carlos' }
        }
      ]
      
      const newStartTime = new Date('2026-04-20T10:15:00')
      const newEndTime = new Date('2026-04-20T10:45:00')
      
      expect(hasAppointmentConflict(newStartTime, newEndTime, existingAppointments)).toBe(true)
    })
    
    it('deve bloquear sobreposição parcial (termina durante existente)', () => {
      const existingAppointments = [
        {
          id: '1',
          startTime: new Date('2026-04-20T10:00:00'),
          endTime: new Date('2026-04-20T10:30:00'),
          service: { duration: 30, price: 35, name: 'Corte' },
          client: { name: 'João' },
          barber: { name: 'Carlos' }
        }
      ]
      
      const newStartTime = new Date('2026-04-20T09:45:00')
      const newEndTime = new Date('2026-04-20T10:15:00')
      
      expect(hasAppointmentConflict(newStartTime, newEndTime, existingAppointments)).toBe(true)
    })
    
    it('deve bloquear agendamento dentro de outro existente', () => {
      const existingAppointments = [
        {
          id: '1',
          startTime: new Date('2026-04-20T09:00:00'),
          endTime: new Date('2026-04-20T11:00:00'),
          service: { duration: 120, price: 70, name: 'Corte + Barba' },
          client: { name: 'João' },
          barber: { name: 'Carlos' }
        }
      ]
      
      const newStartTime = new Date('2026-04-20T09:30:00')
      const newEndTime = new Date('2026-04-20T10:00:00')
      
      expect(hasAppointmentConflict(newStartTime, newEndTime, existingAppointments)).toBe(true)
    })
    
    it('deve permitir horários antes e depois de agendamentos existentes', () => {
      const existingAppointments = [
        {
          id: '1',
          startTime: new Date('2026-04-20T10:00:00'),
          endTime: new Date('2026-04-20T10:30:00'),
          service: { duration: 30, price: 35, name: 'Corte' },
          client: { name: 'João' },
          barber: { name: 'Carlos' }
        }
      ]
      
      // Antes do agendamento existente
      const beforeStart = new Date('2026-04-20T09:00:00')
      const beforeEnd = new Date('2026-04-20T09:30:00')
      
      // Depois do agendamento existente
      const afterStart = new Date('2026-04-20T11:00:00')
      const afterEnd = new Date('2026-04-20T11:30:00')
      
      expect(hasAppointmentConflict(beforeStart, beforeEnd, existingAppointments)).toBe(false)
      expect(hasAppointmentConflict(afterStart, afterEnd, existingAppointments)).toBe(false)
    })
  })
  
  describe('calculateAvailableSlots', () => {
    it('deve calcular slots disponíveis quando não há agendamentos', () => {
      const existingAppointments = []
      const date = new Date('2026-04-20')
      
      const slots = calculateAvailableSlots(date, 30, existingAppointments)
      
      expect(slots.length).toBeGreaterThan(0)
      expect(slots.every(slot => slot.isAvailable)).toBe(true)
    })
    
    it('deve marcar slots como indisponíveis quando há conflito', () => {
      const existingAppointments = [
        {
          id: '1',
          startTime: new Date('2026-04-20T10:00:00'),
          endTime: new Date('2026-04-20T10:30:00'),
          service: { duration: 30, price: 35, name: 'Corte' },
          client: { name: 'João' },
          barber: { name: 'Carlos' }
        }
      ]
      
      const date = new Date('2026-04-20')
      const slots = calculateAvailableSlots(date, 30, existingAppointments)
      
      // Procurar slot que começa exatamente às 10:00
      const conflictingSlot = slots.find(slot => 
        slot.startTime.getHours() === 10 && slot.startTime.getMinutes() === 0
      )
      
      // Se não encontrar o slot exato, verificar se há algum slot indisponível
      const hasUnavailableSlot = slots.some(slot => !slot.isAvailable)
      
      expect(hasUnavailableSlot).toBe(true)
      
      // Se encontrou o slot exato, verificar que está indisponível
      if (conflictingSlot) {
        expect(conflictingSlot.isAvailable).toBe(false)
      }
    })
    
    it('deve respeitar horário de funcionamento', () => {
      const existingAppointments = []
      const date = new Date('2026-04-20')
      
      const slots = calculateAvailableSlots(date, 30, existingAppointments, { start: 9, end: 17 })
      
      // Todos os slots devem estar dentro do horário de funcionamento
      expect(slots.every(slot => 
        slot.startTime.getHours() >= 9 && slot.startTime.getHours() < 17
      )).toBe(true)
    })
    
    it('deve calcular corretamente duração do serviço', () => {
      const existingAppointments = []
      const date = new Date('2026-04-20')
      
      // Serviço de 60 minutos
      const slots = calculateAvailableSlots(date, 60, existingAppointments)
      
      // Slots devem ter 60 minutos de duração
      expect(slots.every(slot => 
        slot.endTime.getTime() - slot.startTime.getTime() === 60 * 60000
      )).toBe(true)
    })
  })
  
  describe('validateAppointmentTime', () => {
    beforeEach(() => {
      // Mock da data atual para testes consistentes
      vi.setSystemTime(new Date('2026-04-20T09:00:00'))
    })
    
    it('deve validar horário dentro do funcionamento', () => {
      const validTime = new Date('2026-04-20T10:00:00')
      const result = validateAppointmentTime(validTime, 30)
      
      expect(result.isValid).toBe(true)
    })
    
    it('deve rejeitar agendamento no passado', () => {
      const pastTime = new Date('2026-04-20T08:00:00')
      const result = validateAppointmentTime(pastTime, 30)
      
      expect(result.isValid).toBe(false)
      expect(result.error).toBe('Não é possível agendar no passado')
    })
    
    it('deve rejeitar horário antes do funcionamento', () => {
      // Criar data futura antes do horário de funcionamento
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      tomorrow.setHours(7, 0, 0, 0)
      
      const result = validateAppointmentTime(tomorrow, 30)
      
      expect(result.isValid).toBe(false)
      expect(result.error).toBe('Fora do horário de funcionamento')
    })
    
    it('deve rejeitar horário após o funcionamento', () => {
      // Criar data futura após o horário de funcionamento
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      tomorrow.setHours(19, 0, 0, 0)
      
      const result = validateAppointmentTime(tomorrow, 30)
      
      expect(result.isValid).toBe(false)
      expect(result.error).toBe('Fora do horário de funcionamento')
    })
    
    it('deve rejeitar serviço que ultrapassa horário de funcionamento', () => {
      // Criar data futura com serviço que termina após o horário de funcionamento
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      tomorrow.setHours(16, 30, 0, 0) // 16:30
      
      const result = validateAppointmentTime(tomorrow, 90) // 90 minutos = termina às 18:00
      
      expect(result.isValid).toBe(false)
      expect(result.error).toBe('Serviço ultrapassa o horário de funcionamento')
    })
  })
  
  describe('checkPermission - RBAC', () => {
    it('ADMIN deve ter acesso total', () => {
      expect(checkPermission('ADMIN', 'appointments', 'delete')).toBe(true)
      expect(checkPermission('ADMIN', 'users', 'create')).toBe(true)
      expect(checkPermission('ADMIN', 'reports', 'read')).toBe(true)
    })
    
    it('BARBER deve ter acesso limitado', () => {
      expect(checkPermission('BARBER', 'appointments', 'create')).toBe(true)
      expect(checkPermission('BARBER', 'appointments', 'delete')).toBe(false)
      expect(checkPermission('BARBER', 'users', 'create')).toBe(false)
      expect(checkPermission('BARBER', 'clients', 'read')).toBe(true)
    })
    
    it('CLIENT deve ter acesso mínimo', () => {
      expect(checkPermission('CLIENT', 'appointments', 'create')).toBe(true)
      expect(checkPermission('CLIENT', 'appointments', 'delete')).toBe(false)
      expect(checkPermission('CLIENT', 'users', 'create')).toBe(false)
      expect(checkPermission('CLIENT', 'services', 'read')).toBe(true)
    })
    
    it('deve rejeitar permissões inexistentes', () => {
      expect(checkPermission('CLIENT', 'users', 'read')).toBe(false)
      expect(checkPermission('BARBER', 'reports', 'create')).toBe(false)
    })
  })
  
  describe('filterByBarbershop - Multi-tenant', () => {
    it('deve filtrar dados por barbershopId correto', () => {
      const data = [
        { id: '1', name: 'Item 1', barbershopId: 'shop1' },
        { id: '2', name: 'Item 2', barbershopId: 'shop2' },
        { id: '3', name: 'Item 3', barbershopId: 'shop1' }
      ]
      
      const filtered = filterByBarbershop(data, 'shop1')
      
      expect(filtered).toHaveLength(2)
      expect(filtered.every(item => item.barbershopId === 'shop1')).toBe(true)
    })
    
    it('deve retornar vazio quando barbershopId não corresponde', () => {
      const data = [
        { id: '1', name: 'Item 1', barbershopId: 'shop1' },
        { id: '2', name: 'Item 2', barbershopId: 'shop2' }
      ]
      
      const filtered = filterByBarbershop(data, 'shop3')
      
      expect(filtered).toHaveLength(0)
    })
    
    it('deve lidar com dados sem barbershopId', () => {
      const data = [
        { id: '1', name: 'Item 1', barbershopId: 'shop1' },
        { id: '2', name: 'Item 2' }, // sem barbershopId
        { id: '3', name: 'Item 3', barbershopId: 'shop1' }
      ]
      
      const filtered = filterByBarbershop(data, 'shop1')
      
      expect(filtered).toHaveLength(2)
    })
  })
  
  describe('validateMultiTenantIsolation', () => {
    it('deve permitir acesso quando barbershopId corresponde', () => {
      const result = validateMultiTenantIsolation('user1', 'shop1', 'shop1')
      
      expect(result).toBe(true)
    })
    
    it('deve bloquear acesso quando barbershopId não corresponde', () => {
      const result = validateMultiTenantIsolation('user1', 'shop1', 'shop2')
      
      expect(result).toBe(false)
    })
  })
})
