// Script para criar usuário CLIENT diretamente no banco
// Execute com: node scripts/create-client-direct.js

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

async function createClientDirect() {
  console.log('=== CRIANDO USUÁRIO CLIENT DIRETAMENTE ===');
  
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
    
    // 3. Hash da senha
    console.log('3. Criando hash da senha...');
    const hashedPassword = await bcrypt.hash('client123', 12);
    
    // 4. Criar usuário CLIENT
    console.log('4. Criando usuário CLIENT...');
    const client = await prisma.user.create({
      data: {
        name: 'Maria Cliente',
        email: 'maria@barberiacentral.com',
        password: hashedPassword,
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
      today.setHours(10, 0, 0, 0);
      
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
    }
    
  } catch (error) {
    console.error('Erro:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

createClientDirect();
