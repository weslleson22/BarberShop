const { PrismaClient } = require('@prisma/client')

async function fixClientAppointments() {
  const prisma = new PrismaClient()
  try {
    console.log('=== VERIFICANDO AGENDAMENTOS DE CLIENTES ===')

    // 1. Buscar todos os usuários CLIENT
    const clientUsers = await prisma.user.findMany({
      where: { role: 'CLIENT' },
      include: { client: true }
    })

    console.log(`Encontrados ${clientUsers.length} usuários com role CLIENT`)

    for (const u of clientUsers) {
      if (!u.client) {
        console.log(`Usuário ${u.name} (${u.id}) não tem registro Client vinculado. Criando...`)
        const newClient = await prisma.client.create({
          data: {
            name: u.name,
            email: u.email,
            phone: u.phone || '',
            barbershopId: u.barbershopId,
            userId: u.id,
          }
        })
        u.client = newClient
      }

      console.log(`\nVerificando agendamentos para ${u.name} (userId=${u.id}, correct clientId=${u.client.id})`)

      // Buscar agendamentos criados por este usuário cujo clientId difere do seu client.id
      const mismatchedApts = await prisma.appointment.findMany({
        where: {
          createdBy: u.id,
          clientId: { not: u.client.id }
        },
        select: {
          id: true,
          startTime: true,
          clientId: true,
          notes: true
        }
      })

      console.log(`- Agendamentos com clientId divergente: ${mismatchedApts.length}`)

      if (mismatchedApts.length > 0) {
        for (const apt of mismatchedApts) {
          console.log(`  Atualizando agendamento ${apt.id} (${apt.notes}) de clientId=${apt.clientId} para ${u.client.id}`)
          await prisma.appointment.update({
            where: { id: apt.id },
            data: { clientId: u.client.id }
          })
        }
        console.log(`  -> ${mismatchedApts.length} agendamentos corrigidos com sucesso!`)
      }
    }

    console.log('\n=== CORREÇÃO CONCLUÍDA ===')
  } catch (error) {
    console.error('Erro ao corrigir agendamentos:', error)
  } finally {
    await prisma.$disconnect()
  }
}

fixClientAppointments()
