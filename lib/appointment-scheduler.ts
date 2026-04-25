import { prisma } from './prisma'

export interface TimeSlot {
  startTime: Date
  endTime: Date
  isAvailable: boolean
  appointmentId?: string
}

export interface CreateAppointmentData {
  barbershopId: string
  clientId: string
  barberId: string
  serviceId: string
  startTime: Date
  notes?: string
  createdBy?: string
}

/**
 * Verifica se um horário está disponível para um barbeiro específico
 * Considera a duração do serviço e impede sobreposição de horários
 */
export async function verificarDisponibilidade(
  barberId: string,
  barbershopId: string,
  startTime: Date,
  duration: number
): Promise<{ available: boolean; conflict?: any }> {
  const endTime = new Date(startTime.getTime() + duration * 60000)

  try {
    // Buscar todos os agendamentos confirmados para o barbeiro no mesmo dia
    const dayStart = new Date(startTime)
    dayStart.setHours(0, 0, 0, 0)
    
    const dayEnd = new Date(startTime)
    dayEnd.setHours(23, 59, 59, 999)

    const existingAppointments = await prisma.appointment.findMany({
      where: {
        barberId,
        barbershopId,
        startTime: {
          gte: dayStart,
          lte: dayEnd,
        },
        status: {
          in: ['PENDING', 'CONFIRMED'],
        },
      },
      include: {
        service: true,
      },
    })

    // Verificar conflitos de horário
    for (const appointment of existingAppointments) {
      const appointmentStart = appointment.startTime
      const appointmentEnd = appointment.endTime

      // Verificar sobreposição de horários
      const hasOverlap = 
        (startTime < appointmentEnd && endTime > appointmentStart)

      if (hasOverlap) {
        return {
          available: false,
          conflict: {
            appointmentId: appointment.id,
            startTime: appointmentStart,
            endTime: appointmentEnd,
            clientName: appointment.clientId, // TODO: Include client name
            serviceName: appointment.service.name,
          },
        }
      }
    }

    return { available: true }
  } catch (error) {
    console.error('Error checking availability:', error)
    throw new Error('Erro ao verificar disponibilidade')
  }
}

/**
 * Cria um novo agendamento com validação de conflitos
 */
export async function criarAgendamento(data: CreateAppointmentData): Promise<any> {
  try {
    // Buscar informações do serviço para calcular endTime
    const service = await prisma.service.findUnique({
      where: {
        id: data.serviceId,
        barbershopId: data.barbershopId,
      },
    })

    if (!service) {
      throw new Error('Serviço não encontrado')
    }

    // Converter startTime para Date se for string
    const startTime = typeof data.startTime === 'string' ? new Date(data.startTime) : data.startTime
    const endTime = new Date(startTime.getTime() + service.duration * 60000)

    // Verificar disponibilidade antes de criar
    const availability = await verificarDisponibilidade(
      data.barberId,
      data.barbershopId,
      startTime,
      service.duration
    )

    if (!availability.available) {
      throw new Error('Horário não disponível. Conflito com outro agendamento.')
    }

    // Criar o agendamento
    const appointment = await prisma.appointment.create({
      data: {
        barbershopId: data.barbershopId,
        clientId: data.clientId,
        barberId: data.barberId,
        serviceId: data.serviceId,
        startTime: startTime,
        endTime,
        status: 'PENDING',
        totalAmount: service.price,
        notes: data.notes,
        createdBy: data.createdBy,
      },
      include: {
        client: true,
        barber: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        service: true,
      },
    })

    return appointment
  } catch (error) {
    console.error('Error creating appointment:', error)
    throw error
  }
}

/**
 * Busca horários disponíveis para um barbeiro em uma data específica
 */
export async function getHorariosDisponiveis(
  barberId: string,
  barbershopId: string,
  date: Date,
  serviceDuration: number
): Promise<TimeSlot[]> {
  const startOfDay = new Date(date)
  startOfDay.setHours(9, 0, 0, 0) // Abertura às 9:00

  const endOfDay = new Date(date)
  endOfDay.setHours(18, 0, 0, 0) // Fechamento às 18:00

  const timeSlots: TimeSlot[] = []
  const slotDuration = 30 // Intervalos de 30 minutos

  // Gerar todos os slots do dia
  for (let time = startOfDay.getTime(); time < endOfDay.getTime(); time += slotDuration * 60000) {
    const slotStart = new Date(time)
    const slotEnd = new Date(time + slotDuration * 60000)

    timeSlots.push({
      startTime: slotStart,
      endTime: slotEnd,
      isAvailable: true,
    })
  }

  // Buscar agendamentos existentes
  const existingAppointments = await prisma.appointment.findMany({
    where: {
      barberId,
      barbershopId,
      startTime: {
        gte: startOfDay,
        lt: endOfDay,
      },
      status: {
        in: ['PENDING', 'CONFIRMED'],
      },
    },
    include: {
      service: true,
    },
  })

  // Marcar slots indisponíveis
  for (const appointment of existingAppointments) {
    const appointmentStart = appointment.startTime
    const appointmentEnd = appointment.endTime

    // Marcar todos os slots que conflitam com o agendamento
    timeSlots.forEach(slot => {
      const hasOverlap = 
        (slot.startTime < appointmentEnd && slot.endTime > appointmentStart)

      if (hasOverlap) {
        slot.isAvailable = false
        slot.appointmentId = appointment.id
      }
    })
  }

  // Filtrar apenas slots que têm tempo suficiente para o serviço
  const availableSlots = timeSlots.filter(slot => {
    if (!slot.isAvailable) return false

    // Verificar se há tempo suficiente até o próximo agendamento ou fim do dia
    const slotEndTime = new Date(slot.startTime.getTime() + serviceDuration * 60000)
    
    // Verificar se não ultrapassa o horário de fechamento
    if (slotEndTime > endOfDay) return false

    // Verificar se não conflita com próximos agendamentos
    for (const appointment of existingAppointments) {
      if (slot.startTime < appointment.endTime && slotEndTime > appointment.startTime) {
        return false
      }
    }

    return true
  })

  return availableSlots
}

/**
 * Cancela um agendamento
 */
export async function cancelarAgendamento(
  appointmentId: string,
  barbershopId: string
): Promise<void> {
  try {
    await prisma.appointment.update({
      where: {
        id: appointmentId,
        barbershopId,
      },
      data: {
        status: 'CANCELLED',
      },
    })
  } catch (error) {
    console.error('Error cancelling appointment:', error)
    throw new Error('Erro ao cancelar agendamento')
  }
}

/**
 * Reagenda um agendamento existente
 */
export async function reagendarAgendamento(
  appointmentId: string,
  barbershopId: string,
  newStartTime: Date
): Promise<any> {
  try {
    const appointment = await prisma.appointment.findUnique({
      where: {
        id: appointmentId,
        barbershopId,
      },
      include: {
        service: true,
      },
    })

    if (!appointment) {
      throw new Error('Agendamento não encontrado')
    }

    // Verificar disponibilidade do novo horário
    const availability = await verificarDisponibilidade(
      appointment.barberId,
      barbershopId,
      newStartTime,
      appointment.service.duration
    )

    if (!availability.available) {
      throw new Error('Novo horário não disponível')
    }

    const newEndTime = new Date(newStartTime.getTime() + appointment.service.duration * 60000)

    // Atualizar o agendamento
    const updatedAppointment = await prisma.appointment.update({
      where: {
        id: appointmentId,
      },
      data: {
        startTime: newStartTime,
        endTime: newEndTime,
        status: 'PENDING',
      },
      include: {
        client: true,
        barber: true,
        service: true,
      },
    })

    return updatedAppointment
  } catch (error) {
    console.error('Error rescheduling appointment:', error)
    throw error
  }
}
