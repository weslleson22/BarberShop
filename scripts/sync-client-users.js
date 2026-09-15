// Garante que todo usuário com role CLIENT tenha um registro correspondente
// na tabela Client (a que alimenta a "Lista de Clientes" em /clientes).
//
// Útil para corrigir usuários CLIENT criados antes do vínculo User<->Client
// existir, ou como manutenção periódica caso algum caso escape a sincronização
// automática feita em app/api/users/route.ts e app/api/users/[id]/route.ts.
//
// Execute com: node scripts/sync-client-users.js
const { PrismaClient } = require('@prisma/client')

async function ensureClientForUser(prisma, { userId, name, email, phone, barbershopId }) {
  const alreadyLinked = await prisma.client.findUnique({ where: { userId } })
  if (alreadyLinked) return { client: alreadyLinked, action: 'já vinculado' }

  const normalizedEmail = email?.trim().toLowerCase() || undefined
  const normalizedPhone = phone?.trim() || undefined

  let existing = null
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
    const client = await prisma.client.update({
      where: { id: existing.id },
      data: { userId },
    })
    return { client, action: 'vinculado a Client existente' }
  }

  const client = await prisma.client.create({
    data: {
      name,
      email: normalizedEmail || null,
      phone: normalizedPhone || '',
      barbershopId,
      userId,
    },
  })
  return { client, action: 'Client criado' }
}

async function main() {
  const prisma = new PrismaClient()
  try {
    const clientUsers = await prisma.user.findMany({
      where: { role: 'CLIENT' },
      select: { id: true, name: true, email: true, phone: true, barbershopId: true },
    })

    console.log(`Usuários com role CLIENT: ${clientUsers.length}`)

    for (const user of clientUsers) {
      const { client, action } = await ensureClientForUser(prisma, {
        userId: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        barbershopId: user.barbershopId,
      })
      console.log(`- ${user.name} (${user.email}) -> ${action} (clientId=${client.id})`)
    }

    console.log('Sincronização concluída.')
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
