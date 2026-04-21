// Script para criar usuário CLIENT usando Prisma sem bcrypt
// Execute com: node scripts/create-client-prisma.js

const { PrismaClient } = require('@prisma/client');

async function createClientPrisma() {
  console.log('=== CRIANDO USUÁRIO CLIENT COM PRISMA ===');
  
  const prisma = new PrismaClient();
  
  try {
    // 1. Verificar se usuário já existe
    console.log('1. Verificando se usuário já existe...');
    const existingUser = await prisma.user.findUnique({
      where: { email: 'maria@barberiacentral.com' }
    });
    
    if (existingUser) {
      console.log('Usuário CLIENT já existe:');
      console.log('Nome:', existingUser.name);
      console.log('Email:', existingUser.email);
      console.log('Role:', existingUser.role);
      return;
    }
    
    // 2. Obter barbershop existente
    console.log('2. Obtendo barbershop existente...');
    const barbershop = await prisma.barbershop.findFirst();
    
    if (!barbershop) {
      console.log('ERRO: Nenhuma barbearia encontrada');
      return;
    }
    
    console.log('Barbearia encontrada:', barbershop.name);
    console.log('Barbearia ID:', barbershop.id);
    
    // 3. Obter hash de senha de usuário existente para reutilizar
    console.log('3. Obtendo hash de senha existente...');
    const existingHashedUser = await prisma.user.findFirst({
      where: { role: 'ADMIN' }
    });
    
    if (!existingHashedUser) {
      console.log('ERRO: Nenhum usuário existente para obter hash');
      return;
    }
    
    console.log('Usando hash do usuário:', existingHashedUser.name);
    
    // 4. Criar usuário CLIENT
    console.log('4. Criando usuário CLIENT...');
    const client = await prisma.user.create({
      data: {
        name: 'Maria Cliente',
        email: 'maria@barberiacentral.com',
        password: existingHashedUser.password, // Reutilizar hash existente
        role: 'CLIENT',
        phone: '11987654321',
        isActive: true,
        barbershopId: barbershop.id
      }
    });
    
    console.log('SUCCESS: Usuário CLIENT criado');
    console.log('ID:', client.id);
    console.log('Nome:', client.name);
    console.log('Email:', client.email);
    console.log('Role:', client.role);
    console.log('Barbershop ID:', client.barbershopId);
    
    // 5. Criar alguns agendamentos para o cliente
    console.log('5. Criando agendamentos de teste...');
    
    // Obter serviços e barbeiros
    const services = await prisma.service.findMany({
      take: 2
    });
    
    const barbers = await prisma.user.findMany({
      where: { role: 'BARBER' },
      take: 1
    });
    
    if (services.length > 0 && barbers.length > 0) {
      // Criar agendamento para hoje
      const today = new Date();
      today.setHours(14, 0, 0, 0);
      
      const appointment = await prisma.appointment.create({
        data: {
          clientId: client.id,
          barberId: barbers[0].id,
          serviceId: services[0].id,
          startTime: today,
          endTime: new Date(today.getTime() + services[0].duration * 60000),
          status: 'CONFIRMED',
          totalAmount: services[0].price,
          barbershopId: barbershop.id
        }
      });
      
      console.log('Agendamento criado:', appointment.id);
      console.log('Serviço:', services[0].name);
      console.log('Barbeiro:', barbers[0].name);
      console.log('Horário:', today.toLocaleString('pt-BR'));
      console.log('Valor:', services[0].price);
    }
    
    // 6. Testar login do cliente
    console.log('\n6. Testando login do CLIENT...');
    const loginResponse = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'maria@barberiacentral.com',
        password: 'admin123' // Usando senha do admin já que reutilizamos o hash
      }),
      credentials: 'include'
    });
    
    console.log('Status login CLIENT:', loginResponse.status);
    
    if (loginResponse.ok) {
      const loginData = await loginResponse.json();
      console.log('Login CLIENT OK:');
      console.log('Nome:', loginData.user?.name);
      console.log('Role:', loginData.user?.role);
      console.log('Token:', loginData.token ? loginData.token.substring(0, 20) + '...' : 'NÃO');
    } else {
      const error = await loginResponse.text();
      console.log('Login CLIENT ERRO:', error);
    }
    
  } catch (error) {
    console.error('Erro:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

createClientPrisma();
