// Funções de negócio para agendamento - serão testadas unitariamente

export interface TimeSlot {
  startTime: Date
  endTime: Date
  isAvailable: boolean
}

export interface Appointment {
  id: string
  startTime: Date
  endTime: Date
  service: {
    duration: number
    price: number
    name: string
  }
  client: {
    name: string
  }
  barber: {
    name: string
  }
}

/**
 * Verifica se um novo agendamento conflita com agendamentos existentes
 */
export function hasAppointmentConflict(
  newStartTime: Date,
  newEndTime: Date,
  existingAppointments: Appointment[]
): boolean {
  return existingAppointments.some(existing => {
    // Verificar sobreposição de horários
    const startsDuringExisting = newStartTime >= existing.startTime && newStartTime < existing.endTime
    const endsDuringExisting = newEndTime > existing.startTime && newEndTime <= existing.endTime
    const completelyOverlaps = newStartTime <= existing.startTime && newEndTime >= existing.endTime
    
    return startsDuringExisting || endsDuringExisting || completelyOverlaps
  })
}

/**
 * Calcula horários disponíveis baseado em agendamentos existentes
 */
export function calculateAvailableSlots(
  date: Date,
  serviceDuration: number,
  existingAppointments: Appointment[],
  workingHours = { start: 8, end: 18 }
): TimeSlot[] {
  const slots: TimeSlot[] = []
  const currentDate = new Date(date)
  currentDate.setHours(0, 0, 0, 0)
  
  // Gerar slots de 30 minutos durante o horário de trabalho
  for (let hour = workingHours.start; hour < workingHours.end; hour++) {
    for (let minute = 0; minute < 60; minute += 30) {
      const startTime = new Date(currentDate)
      startTime.setHours(hour, minute, 0, 0)
      
      const endTime = new Date(startTime.getTime() + serviceDuration * 60000)
      
      // Verificar se o slot está dentro do horário de trabalho
      if (endTime.getHours() > workingHours.end || 
          (endTime.getHours() === workingHours.end && endTime.getMinutes() > 0)) {
        continue
      }
      
      // Verificar se há conflito com agendamentos existentes
      const isAvailable = !hasAppointmentConflict(startTime, endTime, existingAppointments)
      
      slots.push({
        startTime,
        endTime,
        isAvailable
      })
    }
  }
  
  return slots
}

/**
 * Valida se um horário é válido para agendamento
 */
export function validateAppointmentTime(
  startTime: Date,
  serviceDuration: number,
  workingHours = { start: 8, end: 18 }
): { isValid: boolean; error?: string } {
  const now = new Date()
  const endTime = new Date(startTime.getTime() + serviceDuration * 60000)
  
  // Não permitir agendamentos no passado
  if (startTime < now) {
    return { isValid: false, error: 'Não é possível agendar no passado' }
  }
  
  // Verificar se está dentro do horário de trabalho
  if (startTime.getHours() < workingHours.start || startTime.getHours() >= workingHours.end) {
    return { isValid: false, error: 'Fora do horário de funcionamento' }
  }
  
  if (endTime.getHours() > workingHours.end || 
      (endTime.getHours() === workingHours.end && endTime.getMinutes() > 0)) {
    return { isValid: false, error: 'Serviço ultrapassa o horário de funcionamento' }
  }
  
  return { isValid: true }
}

/**
 * Verifica permissão de acesso baseada no papel do usuário (RBAC)
 */
export function checkPermission(
  userRole: 'ADMIN' | 'BARBER' | 'CLIENT',
  resource: string,
  action: 'create' | 'read' | 'update' | 'delete'
): boolean {
  const permissions: Record<string, Record<string, string[]>> = {
    ADMIN: {
      appointments: ['create', 'read', 'update', 'delete'],
      clients: ['create', 'read', 'update', 'delete'],
      services: ['create', 'read', 'update', 'delete'],
      users: ['create', 'read', 'update', 'delete'],
      reports: ['read']
    },
    BARBER: {
      appointments: ['create', 'read', 'update'],
      clients: ['read'],
      services: ['read'],
      users: ['read'],
      reports: ['read']
    },
    CLIENT: {
      appointments: ['create', 'read'],
      clients: ['read'],
      services: ['read'],
      users: [],
      reports: []
    }
  }
  
  return permissions[userRole]?.[resource]?.includes(action) || false
}

/**
 * Filtra dados por barbershopId (multi-tenant)
 */
export function filterByBarbershop<T extends { barbershopId?: string }>(
  data: T[],
  barbershopId: string
): T[] {
  return data.filter(item => item.barbershopId === barbershopId)
}

/**
 * Valida isolamento multi-tenant
 */
export function validateMultiTenantIsolation(
  userId: string,
  userBarbershopId: string,
  requestedBarbershopId: string
): boolean {
  return userBarbershopId === requestedBarbershopId
}
