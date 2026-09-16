import { prisma } from './prisma'
import { notifyAdminsNewClient } from './notifications'

interface SyncClientParams {
  userId: string
  name: string
  email?: string | null
  phone?: string | null
  barbershopId: string
}

/**
 * Garante que todo usuário com role CLIENT também tenha um registro em
 * `Client` (a tabela usada pela "Lista de Clientes" e pelos agendamentos).
 * Sem isso, contas de cliente criadas via /usuarios ou pelo cadastro
 * ficam "invisíveis" na tela de Clientes e não podem ser agendadas.
 *
 * - Se já existe um Client vinculado a este userId, não faz nada.
 * - Se existe um Client "solto" (sem userId) com o mesmo email ou telefone
 *   na mesma barbearia, vincula esse registro em vez de duplicar.
 * - Caso contrário, cria um novo Client vinculado.
 */
export async function ensureClientForUser({
  userId,
  name,
  email,
  phone,
  barbershopId,
}: SyncClientParams) {
  const alreadyLinked = await prisma.client.findUnique({ where: { userId } })
  if (alreadyLinked) {
    return alreadyLinked
  }

  const normalizedEmail = email?.trim().toLowerCase() || undefined
  const normalizedPhone = phone?.trim() || undefined

  let existing = null as Awaited<ReturnType<typeof prisma.client.findFirst>> | null

  if (normalizedEmail) {
    existing = await prisma.client.findFirst({
      where: { email: normalizedEmail, barbershopId, userId: null },
    })
  }

  if (!existing && normalizedPhone) {
    existing = await prisma.client.findFirst({
      where: { phone: normalizedPhone, barbershopId, userId: null },
    })
  }

  if (existing) {
    return prisma.client.update({
      where: { id: existing.id },
      data: { userId },
    })
  }

  const newClient = await prisma.client.create({
    data: {
      name,
      email: normalizedEmail || null,
      // Client.phone é obrigatório; se o usuário ainda não informou telefone,
      // fica em branco até ser preenchido na tela de Clientes.
      phone: normalizedPhone || '',
      barbershopId,
      userId,
    },
  })

  try {
    await notifyAdminsNewClient(newClient.name, barbershopId)
  } catch (error) {
    console.error('Erro ao notificar admins sobre novo cliente:', error)
  }

  return newClient
}
