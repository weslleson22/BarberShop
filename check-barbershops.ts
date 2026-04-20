import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkBarbershops() {
  try {
    const barbershops = await prisma.barbershop.findMany()
    console.log('Barbearias encontradas:', barbershops)
    
    if (barbershops.length === 0) {
      console.log('Nenhuma barbearia encontrada. Executando seed...')
      // Executar seed se não houver barbearias
    }
    
    const firstBarbershop = barbershops[0]
    console.log('Primeira barbearia ID:', firstBarbershop.id)
    
    await prisma.$disconnect()
  } catch (error) {
    console.error('Erro:', error)
    await prisma.$disconnect()
  }
}

checkBarbershops()
