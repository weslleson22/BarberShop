// Script rápido para restaurar dados essenciais
// Execute com: node scripts/quick-restore.js

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function quickRestore() {
  console.log('=== RESTAURAÇÃO RÁPIDA DE DADOS ===');
  
  try {
    // 1. Verificar se já existe barbearia
    let barbershop = await prisma.barbershop.findFirst();
    
    if (!barbershop) {
      console.log('Criando barbearia...');
      barbershop = await prisma.barbershop.create({
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
    }
    
    console.log(`Barbearia: ${barbershop.name} (${barbershop.id})`);
    
    // 2. Verificar se admin existe
    let admin = await prisma.user.findFirst({
      where: { email: 'admin@barberiacentral.com' }
    });
    
    if (!admin) {
      console.log('Criando admin...');
      const adminPassword = await bcrypt.hash('admin123', 10);
      admin = await prisma.user.create({
        data: {
          name: 'Administrador',
          email: 'admin@barberiacentral.com',
          password: adminPassword,
          role: 'ADMIN',
          isActive: true,
          barbershopId: barbershop.id
        }
      });
    }
    
    console.log(`Admin: ${admin.name} (${admin.email})`);
    
    // 3. Verificar se barber existe
    let barber = await prisma.user.findFirst({
      where: { email: 'joao@barberiacentral.com' }
    });
    
    if (!barber) {
      console.log('Criando barber...');
      const barberPassword = await bcrypt.hash('barber123', 10);
      barber = await prisma.user.create({
        data: {
          name: 'João Barbeiro',
          email: 'joao@barberiacentral.com',
          password: barberPassword,
          role: 'BARBER',
          isActive: true,
          barbershopId: barbershop.id
        }
      });
    }
    
    console.log(`Barber: ${barber.name} (${barber.email})`);
    
    // 4. Verificar se há serviços
    const servicesCount = await prisma.service.count();
    
    if (servicesCount === 0) {
      console.log('Criando serviços...');
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
        }
      ];
      
      for (const serviceData of services) {
        const service = await prisma.service.create({ data: serviceData });
        console.log(`Serviço: ${service.name} (R$ ${service.price})`);
      }
    }
    
    // 5. Verificar se há clientes
    const clientsCount = await prisma.client.count();
    
    if (clientsCount === 0) {
      console.log('Criando cliente teste...');
      const client = await prisma.client.create({
        data: {
          name: 'Carlos Silva',
          email: 'carlos@email.com',
          phone: '(11) 98765-4321',
          isActive: true,
          barbershopId: barbershop.id
        }
      });
      
      console.log(`Cliente: ${client.name} (${client.email})`);
    }
    
    console.log('\n=== RESTAURAÇÃO CONCLUÍDA ===');
    console.log('\nCredenciais:');
    console.log('Admin: admin@barberiacentral.com / admin123');
    console.log('Barber: joao@barberiacentral.com / barber123');
    console.log('\nAcesse: http://localhost:3000/login');
    
  } catch (error) {
    console.error('ERRO:', error);
  } finally {
    await prisma.$disconnect();
  }
}

quickRestore();
