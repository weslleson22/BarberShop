// Script para restaurar dados de teste após execução dos testes
// Execute com: node scripts/restore-test-data.js

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function restoreTestData() {
  console.log('=== RESTAURANDO DADOS DE TESTE ===');
  
  try {
    // 1. Limpar banco de dados
    console.log('1. Limpando banco de dados...');
    
    // Excluir em ordem correta para respeitar foreign keys
    await prisma.appointment.deleteMany();
    await prisma.client.deleteMany();
    await prisma.service.deleteMany();
    await prisma.user.deleteMany();
    await prisma.barbershop.deleteMany();
    
    console.log('Banco de dados limpo com sucesso');
    
    // 2. Criar barbearia de teste
    console.log('2. Criando barbearia de teste...');
    const barbershop = await prisma.barbershop.create({
      data: {
        name: 'Barbearia Central',
        email: 'contato@barberiacentral.com',
        phone: '(11) 1234-5678',
        address: 'Rua das Barbas, 123',
        city: 'São Paulo',
        state: 'SP',
        zipCode: '01234-567',
        operatingHours: {
          monday: { open: '08:00', close: '18:00' },
          tuesday: { open: '08:00', close: '18:00' },
          wednesday: { open: '08:00', close: '18:00' },
          thursday: { open: '08:00', close: '18:00' },
          friday: { open: '08:00', close: '18:00' },
          saturday: { open: '08:00', close: '14:00' },
          sunday: null
        },
        isActive: true
      }
    });
    
    console.log(`Barbearia criada: ${barbershop.name} (${barbershop.id})`);
    
    // 3. Criar usuários de teste
    console.log('3. Criando usuários de teste...');
    
    // Admin
    const adminPassword = await bcrypt.hash('admin123', 10);
    const admin = await prisma.user.create({
      data: {
        name: 'Administrador',
        email: 'admin@barberiacentral.com',
        password: adminPassword,
        role: 'ADMIN',
        isActive: true,
        barbershopId: barbershop.id
      }
    });
    
    console.log(`Admin criado: ${admin.name} (${admin.email})`);
    
    // Barber
    const barberPassword = await bcrypt.hash('barber123', 10);
    const barber = await prisma.user.create({
      data: {
        name: 'João Barbeiro',
        email: 'joao@barberiacentral.com',
        password: barberPassword,
        role: 'BARBER',
        isActive: true,
        barbershopId: barbershop.id
      }
    });
    
    console.log(`Barber criado: ${barber.name} (${barber.email})`);
    
    // Client
    const clientPassword = await bcrypt.hash('client123', 10);
    const client = await prisma.user.create({
      data: {
        name: 'Maria Cliente',
        email: 'maria@barberiacentral.com',
        password: clientPassword,
        role: 'CLIENT',
        isActive: true,
        barbershopId: barbershop.id
      }
    });
    
    console.log(`Client criado: ${client.name} (${client.email})`);
    
    // 4. Criar serviços de teste
    console.log('4. Criando serviços de teste...');
    
    const services = [
      {
        name: 'Corte de Cabelo',
        description: 'Corte masculino tradicional',
        duration: 30,
        price: 35.0,
        category: 'CABELO',
        isActive: true,
        barbershopId: barbershop.id
      },
      {
        name: 'Barba',
        description: 'Aparar e modelar barba',
        duration: 20,
        price: 25.0,
        category: 'BARBA',
        isActive: true,
        barbershopId: barbershop.id
      },
      {
        name: 'Corte + Barba',
        description: 'Pacote completo',
        duration: 50,
        price: 55.0,
        category: 'COMPLETO',
        isActive: true,
        barbershopId: barbershop.id
      }
    ];
    
    for (const serviceData of services) {
      const service = await prisma.service.create({ data: serviceData });
      console.log(`Serviço criado: ${service.name} (R$ ${service.price})`);
    }
    
    // 5. Criar clientes de teste
    console.log('5. Criando clientes de teste...');
    
    const clients = [
      {
        name: 'Carlos Silva',
        email: 'carlos@email.com',
        phone: '(11) 98765-4321',
        isActive: true,
        barbershopId: barbershop.id
      },
      {
        name: 'Ana Santos',
        email: 'ana@email.com',
        phone: '(11) 91234-5678',
        isActive: true,
        barbershopId: barbershop.id
      }
    ];
    
    for (const clientData of clients) {
      const createdClient = await prisma.client.create({ data: clientData });
      console.log(`Cliente criado: ${createdClient.name} (${createdClient.email})`);
    }
    
    console.log('\n=== DADOS DE TESTE RESTAURADOS COM SUCESSO ===');
    console.log('\nCredenciais para teste:');
    console.log('Admin: admin@barberiacentral.com / admin123');
    console.log('Barber: joao@barberiacentral.com / barber123');
    console.log('Client: maria@barberiacentral.com / client123');
    console.log('\nBarbearia: Barbearia Central');
    console.log('Serviços: 3 serviços criados');
    console.log('Clientes: 2 clientes criados');
    
  } catch (error) {
    console.error('ERRO AO RESTAURAR DADOS:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Executar restauração
restoreTestData().catch(console.error);
