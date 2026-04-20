import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkServices() {
  try {
    const services = await prisma.service.findMany()
    console.log('Serviços encontrados:')
    services.forEach((service, index) => {
      console.log(`${index + 1}. ID: ${service.id}, Nome: ${service.name}, Preço: ${service.price}, Duração: ${service.duration}min`)
    })
    
    await prisma.$disconnect()
  } catch (error) {
    console.error('Erro:', error)
    await prisma.$disconnect()
  }
}

checkServices()
