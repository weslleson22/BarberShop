import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkBarbers() {
  try {
    const barbers = await prisma.user.findMany({
      where: { role: 'BARBER' }
    })
    console.log('Barbeiros encontrados:')
    barbers.forEach((barber, index) => {
      console.log(`${index + 1}. ID: ${barber.id}, Nome: ${barber.name}, Email: ${barber.email}`)
    })
    
    await prisma.$disconnect()
  } catch (error) {
    console.error('Erro:', error)
    await prisma.$disconnect()
  }
}

checkBarbers()
