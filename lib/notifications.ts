import { prisma } from './prisma'

// Gatilhos de notificação centralizados aqui (em vez de espalhados pelas
// rotas) para manter o conteúdo/regra de cada notificação num só lugar.
// Toda função aqui é "fire-and-forget": falha ao notificar nunca deve
// derrubar a operação principal (criar agendamento, mudar status etc.), por
// isso cada chamada é envolvida em try/catch pelos callers.

function formatDateTime(date: Date): string {
  return date.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

async function createNotification(userId: string, title: string, message: string) {
  await prisma.notification.create({
    data: { userId, title, message },
  })
}

interface AppointmentForNotification {
  id: string
  startTime: Date
  barberId: string
  barbershopId: string
  clientId: string
  client: { name: string }
}

// Barbeiro: novo agendamento recebido de um cliente.
export async function notifyBarberNewAppointment(appointment: AppointmentForNotification) {
  await createNotification(
    appointment.barberId,
    'Novo agendamento recebido',
    `Novo agendamento recebido: ${appointment.client.name} para ${formatDateTime(appointment.startTime)}.`
  )
}

// Admins da barbearia: novo agendamento criado.
export async function notifyAdminsNewAppointment(appointment: AppointmentForNotification) {
  const admins = await prisma.user.findMany({
    where: { barbershopId: appointment.barbershopId, role: 'ADMIN', isActive: true },
    select: { id: true },
  })

  await Promise.all(
    admins.map((admin) =>
      createNotification(
        admin.id,
        'Novo agendamento',
        `Novo agendamento de ${appointment.client.name} para ${formatDateTime(appointment.startTime)}.`
      )
    )
  )
}

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'marcado como pendente',
  CONFIRMED: 'confirmado',
  COMPLETED: 'concluído',
  CANCELLED: 'cancelado',
  NO_SHOW: 'marcado como não comparecido',
}

// Cliente: status do agendamento foi alterado pela equipe.
export async function notifyClientStatusChange(
  appointment: AppointmentForNotification,
  newStatus: string
) {
  const client = await prisma.client.findUnique({
    where: { id: appointment.clientId },
    select: { userId: true },
  })

  if (!client?.userId) return

  const statusLabel = STATUS_LABELS[newStatus] || newStatus.toLowerCase()
  await createNotification(
    client.userId,
    'Agendamento atualizado',
    `Seu agendamento para ${formatDateTime(appointment.startTime)} foi ${statusLabel}.`
  )
}

// Admins da barbearia: cancelamento de última hora (dentro de 2h do horário marcado).
export async function notifyAdminsLastMinuteCancellation(appointment: AppointmentForNotification) {
  const hoursUntilAppointment = (appointment.startTime.getTime() - Date.now()) / (1000 * 60 * 60)
  if (hoursUntilAppointment > 2 || hoursUntilAppointment < 0) return

  const admins = await prisma.user.findMany({
    where: { barbershopId: appointment.barbershopId, role: 'ADMIN', isActive: true },
    select: { id: true },
  })

  await Promise.all(
    admins.map((admin) =>
      createNotification(
        admin.id,
        'Cancelamento de última hora',
        `${appointment.client.name} cancelou o agendamento das ${formatDateTime(appointment.startTime)}.`
      )
    )
  )
}

// Admins da barbearia: novo cliente cadastrado. `excludeUserId` evita
// notificar o próprio admin/recepcionista que fez o cadastro.
export async function notifyAdminsNewClient(
  clientName: string,
  barbershopId: string,
  excludeUserId?: string
) {
  const admins = await prisma.user.findMany({
    where: {
      barbershopId,
      role: 'ADMIN',
      isActive: true,
      ...(excludeUserId ? { id: { not: excludeUserId } } : {}),
    },
    select: { id: true },
  })

  await Promise.all(
    admins.map((admin) =>
      createNotification(admin.id, 'Novo cliente cadastrado', `${clientName} acabou de se cadastrar.`)
    )
  )
}
