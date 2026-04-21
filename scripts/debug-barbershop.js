// Script para debug do problema de barbershopId
// Execute com: node scripts/debug-barbershop.js

const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');

const prisma = new PrismaClient();

async function debugBarbershopId() {
  console.log('=== DEBUG BARBERSHOP ID ===');
  
  try {
    // 1. Verificar todas as barbearias no banco
    console.log('\n1. VERIFICANDO BARBEARIAS NO BANCO:');
    const barbershops = await prisma.barbershop.findMany({
      select: {
        id: true,
        name: true,
        createdAt: true
      }
    });
    
    console.log('Barbearias encontradas:', barbershops.length);
    barbershops.forEach(shop => {
      console.log(`- ID: ${shop.id}, Nome: ${shop.name}`);
    });
    
    if (barbershops.length === 0) {
      console.log('ERRO: Nenhuma barbearia encontrada no banco!');
      return;
    }
    
    // 2. Verificar usuários existentes e seus barbershopIds
    console.log('\n2. VERIFICANDO USUÁRIOS EXISTENTES:');
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        barbershopId: true
      },
      take: 5
    });
    
    console.log('Usuários encontrados:', users.length);
    users.forEach(user => {
      console.log(`- ${user.name} (${user.role}): barbershopId = ${user.barbershopId}`);
    });
    
    // 3. Testar decodificação de token (simulação)
    console.log('\n3. TESTANDO TOKEN DE EXEMPLO:');
    if (users.length > 0) {
      const adminUser = users.find(u => u.role === 'ADMIN');
      if (adminUser) {
        // Criar token de exemplo
        const tokenPayload = {
          id: adminUser.id,
          email: adminUser.email,
          role: adminUser.role,
          barbershopId: adminUser.barbershopId
        };
        
        console.log('Payload do token:', tokenPayload);
        
        // Verificar se barbershopId do usuário existe
        const barbershopExists = barbershops.some(shop => shop.id === adminUser.barbershopId);
        console.log(`BarbershopId ${adminUser.barbershopId} existe: ${barbershopExists}`);
        
        if (!barbershopExists) {
          console.log('ERRO: O barbershopId do usuário não existe na tabela barbershops!');
          console.log('Solução: Atualizar barbershopId do usuário para um ID válido');
          
          // Sugerir primeiro barbershopId válido
          if (barbershops.length > 0) {
            console.log(`BarbershopId válido para usar: ${barbershops[0].id}`);
          }
        }
      }
    }
    
    // 4. Recomendações
    console.log('\n4. RECOMENDAÇÕES:');
    if (barbershops.length > 0) {
      console.log('Barbearias disponíveis:');
      barbershops.forEach(shop => {
        console.log(`- ${shop.id}: ${shop.name}`);
      });
    }
    
  } catch (error) {
    console.error('Erro no debug:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugBarbershopId();
