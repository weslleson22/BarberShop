import { prisma } from './lib/prisma'

async function checkUsers() {
  try {
    console.log('=== VERIFICANDO USUÁRIOS NO PRISMA ===')
    
    // 1. Contar total de usuários
    const totalUsers = await prisma.user.count()
    console.log(`Total de usuários na tabela: ${totalUsers}`)
    
    // 2. Buscar todos os usuários (limitado para não sobrecarregar)
    const allUsers = await prisma.user.findMany({
      take: 10,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        barbershopId: true,
        isActive: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: 'desc'
      }
    })
    
    console.log('\nPrimeiros 10 usuários (ou todos se menos que 10):')
    allUsers.forEach((user, index) => {
      console.log(`${index + 1}. ID: ${user.id}`)
      console.log(`   Nome: ${user.name}`)
      console.log(`   Email: ${user.email}`)
      console.log(`   Role: ${user.role}`)
      console.log(`   BarbershopID: ${user.barbershopId}`)
      console.log(`   Ativo: ${user.isActive}`)
      console.log(`   Criado em: ${user.createdAt}`)
      console.log('---')
    })
    
    // 3. Verificar barbershops
    const totalBarbershops = await prisma.barbershop.count()
    console.log(`\nTotal de barbearias: ${totalBarbershops}`)
    
    if (totalBarbershops > 0) {
      const barbershops = await prisma.barbershop.findMany({
        take: 5,
        select: {
          id: true,
          name: true,
          email: true,
        }
      })
      
      console.log('\nBarbearias encontradas:')
      barbershops.forEach((barbershop, index) => {
        console.log(`${index + 1}. ID: ${barbershop.id}`)
        console.log(`   Nome: ${barbershop.name}`)
        console.log(`   Email: ${barbershop.email}`)
        console.log('---')
      })
    }
    
    // 4. Verificar usuários por barbershop
    if (totalUsers > 0) {
      console.log('\n=== USUÁRIOS AGRUPADOS POR BARBERSHOP ===')
      
      const usersByBarbershop = await prisma.user.groupBy({
        by: ['barbershopId'],
        _count: {
          id: true
        },
        orderBy: {
          barbershopId: 'asc'
        }
      })
      
      usersByBarbershop.forEach(group => {
        console.log(`Barbershop ${group.barbershopId || 'NULL'}: ${group._count.id} usuários`)
      })
    }
    
    console.log('\n=== VERIFICAÇÃO CONCLUÍDA ===')
    
  } catch (error) {
    console.error('Erro ao verificar usuários:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkUsers()
