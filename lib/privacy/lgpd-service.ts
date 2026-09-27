import crypto from 'crypto'
import { prisma } from '../prisma'

export interface UserExportData {
  exportMetadata: {
    requestedAt: string
    legalNotice: string
    protocol: string
  }
  user: {
    id: string
    name: string
    email: string
    role: string
    phone: string | null
    address: string | null
    birthDate: string | null
    bio: string | null
    specialties: string[]
    createdAt: string
    updatedAt: string
  }
  clientProfile?: {
    id: string
    name: string
    email: string | null
    phone: string
    isVip: boolean
    createdAt: string
  } | null
  appointments: Array<{
    id: string
    startTime: string
    endTime: string
    status: string
    notes: string | null
    serviceName: string
    barberName: string
    price: number
  }>
  payments: Array<{
    id: string
    amount: number
    status: string
    method: string
    createdAt: string
  }>
  notifications: Array<{
    id: string
    title: string
    message: string
    read: boolean
    createdAt: string
  }>
}

/**
 * Exporta todos os dados pessoais do titular em formato estruturado e interoperável (Art. 18, II e V da LGPD).
 * NUNCA inclui credenciais ou hashes de segurança.
 */
export async function exportUserData(userId: string): Promise<UserExportData> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      phone: true,
      address: true,
      birthDate: true,
      bio: true,
      specialties: true,
      createdAt: true,
      updatedAt: true,
    },
  })

  if (!user) {
    throw new Error('Usuário não encontrado para exportação.')
  }

  // Buscar perfil de cliente vinculado
  const client = await prisma.client.findFirst({
    where: { userId },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      isVip: true,
      createdAt: true,
    },
  })

  // Buscar agendamentos históricos e futuros do titular
  const appointments = await prisma.appointment.findMany({
    where: {
      OR: [
        { clientId: client?.id || '__none__' },
        { barberId: user.id },
      ],
    },
    include: {
      service: { select: { name: true, price: true } },
      barber: { select: { name: true } },
    },
    orderBy: { startTime: 'desc' },
  })

  // Buscar pagamentos realizados
  const appointmentIds = appointments.map((a) => a.id)
  const payments = appointmentIds.length > 0
    ? await prisma.payment.findMany({
        where: { appointmentId: { in: appointmentIds } },
        select: {
          id: true,
          amount: true,
          status: true,
          method: true,
          createdAt: true,
        },
      })
    : []

  // Buscar notificações
  const notifications = await prisma.notification.findMany({
    where: { userId },
    select: {
      id: true,
      title: true,
      message: true,
      read: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
  })

  return {
    exportMetadata: {
      requestedAt: new Date().toISOString(),
      legalNotice:
        'Relatório gerado nos termos dos Artigos 18 e 19 da Lei Geral de Proteção de Dados (Lei nº 13.709/2018). As credenciais de acesso foram omitidas por razões de segurança da informação.',
      protocol: `DSR-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`,
    },
    user: {
      ...user,
      birthDate: user.birthDate ? new Date(user.birthDate).toISOString().split('T')[0] : null,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    },
    clientProfile: client
      ? {
          ...client,
          createdAt: client.createdAt.toISOString(),
        }
      : null,
    appointments: appointments.map((a) => ({
      id: a.id,
      startTime: a.startTime.toISOString(),
      endTime: a.endTime.toISOString(),
      status: a.status,
      notes: a.notes,
      serviceName: a.service?.name || 'Serviço Personalizado',
      barberName: a.barber?.name || 'Profissional',
      price: Number(a.service?.price || 0),
    })),
    payments: payments.map((p) => ({
      id: p.id,
      amount: Number(p.amount),
      status: p.status,
      method: p.method,
      createdAt: p.createdAt.toISOString(),
    })),
    notifications: notifications.map((n) => ({
      id: n.id,
      title: n.title,
      message: n.message,
      read: n.read,
      createdAt: n.createdAt.toISOString(),
    })),
  }
}

/**
 * Registra formalmente uma solicitação de direito do titular (DSR - Data Subject Request).
 */
export async function createDataSubjectRequest(data: {
  userId?: string | null
  barbershopId?: string | null
  type: 'ACCESS' | 'EXPORT' | 'RECTIFICATION' | 'ANONYMIZATION' | 'DELETION' | 'REVOCATION'
  applicantEmail: string
  applicantName: string
  details?: string
}) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(data.applicantEmail)) {
    throw new Error('E-mail do titular inválido.')
  }

  if (!data.applicantName || data.applicantName.trim().length < 2) {
    throw new Error('Nome do solicitante é obrigatório.')
  }

  return await (prisma as any).privacyRequest.create({
    data: {
      userId: data.userId || null,
      barbershopId: data.barbershopId || null,
      type: data.type,
      status: 'PENDING',
      applicantEmail: data.applicantEmail.toLowerCase().trim(),
      applicantName: data.applicantName.trim(),
      details: data.details ? data.details.trim() : null,
    },
  })
}

/**
 * Executa a anonimização irreversível dos dados cadastrais do titular (Art. 16, IV e Art. 18, IV e VI da LGPD).
 * Mantém registros contábeis e fiscais descaracterizados conforme Art. 16, I da LGPD.
 */
export async function anonymizeUserAccount(userId: string, performedById?: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { client: true },
  })

  if (!user) {
    throw new Error('Usuário não encontrado.')
  }

  // Validação de segurança: Não permitir anonimizar se houver agendamentos futuros pendentes
  const futureAppointments = await prisma.appointment.findFirst({
    where: {
      OR: [
        { barberId: userId },
        { clientId: user.client?.id || '__none__' },
      ],
      status: { in: ['CONFIRMED', 'PENDING'] },
      startTime: { gte: new Date() },
    },
  })

  if (futureAppointments) {
    throw new Error(
      'Não é possível excluir/anonimizar a conta pois existem agendamentos ativos futuros. Cancele-os antes de prosseguir.'
    )
  }

  const anonymizedHash = crypto.randomBytes(32).toString('hex')
  const opaqueId = user.id.slice(-6)

  await prisma.$transaction(async (tx) => {
    // 1. Anonimizar dados diretos do usuário
    await tx.user.update({
      where: { id: userId },
      data: {
        name: `Usuário Anonimizado [LGPD-${opaqueId}]`,
        email: `anonymized_${opaqueId}_${Date.now()}@lgpd.invalid`,
        password: `$2a$12$anonymized.invalid.hash.${anonymizedHash}`,
        phone: null,
        address: null,
        birthDate: null,
        bio: null,
        avatar: null,
        specialties: [],
        isActive: false,
      },
    })

    // 2. Se houver registro correspondente na tabela Client, anonimizar também
    if (user.client) {
      await tx.client.update({
        where: { id: user.client.id },
        data: {
          name: `Cliente Anonimizado [LGPD-${opaqueId}]`,
          email: null,
          phone: `00000000000`,
        },
      })
    }

    // 3. Concluir solicitações de privacidade pendentes para este usuário
    if ((tx as any).privacyRequest) {
      await (tx as any).privacyRequest.updateMany({
        where: {
          userId,
          status: { in: ['PENDING', 'IN_REVIEW'] },
        },
        data: {
          status: 'COMPLETED',
          processedAt: new Date(),
          processedById: performedById || null,
        },
      })
    }
  })

  return {
    success: true,
    message: 'Conta anonimizada com sucesso em conformidade com a LGPD.',
    anonymizedId: opaqueId,
  }
}
