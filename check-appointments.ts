import { prisma } from './lib/prisma'

async function checkAppointments() {
  try {
    console.log('=== VERIFICANDO AGENDAMENTOS NO PRISMA ===')
    
    // Verificar todos os agendamentos
    const allAppointments = await prisma.appointment.findMany({
      include: {
        client: true,
        barber: true,
        service: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    })
    
    console.log('Total de agendamentos no Prisma:', allAppointments.length)
    
    if (allAppointments.length > 0) {
      console.log('Agendamentos encontrados:')
      allAppointments.forEach((apt, index) => {
        console.log(`${index + 1}. ID: ${apt.id}`)
        console.log(`   Cliente: ${apt.client?.name || 'N/A'}`)
        console.log(`   Barbeiro: ${apt.barber?.name || 'N/A'}`)
        console.log(`   Serviço: ${apt.service?.name || 'N/A'}`)
        console.log(`   Início: ${apt.startTime}`)
        console.log(`   Status: ${apt.status}`)
        console.log('---')
      })
    } else {
      console.log('NENHUM agendamento encontrado no Prisma')
    }
    
    // Verificar agendamentos de hoje
    const today = new Date().toISOString().split('T')[0]
    const todayAppointments = await prisma.appointment.findMany({
      where: {
        startTime: {
          gte: new Date(today + 'T00:00:00'),
          lt: new Date(today + 'T23:59:59')
        }
      },
      include: {
        client: true,
        barber: true,
        service: true
      }
    })
    
    console.log(`Agendamentos de hoje (${today}):`, todayAppointments.length)
    
  } catch (error) {
    console.error('Erro ao verificar agendamentos:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkAppointments()
