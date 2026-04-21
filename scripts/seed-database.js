// Script para popular o banco de dados com dados iniciais
// Execute com: node scripts/seed-database.js

async function seedDatabase() {
  try {
    console.log('=== ENVIANDO REQUISIÇÃO PARA SEED ===');
    
    const response = await fetch('http://localhost:3006/api/seed', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('=== SEED REALIZADO COM SUCESSO ===');
      console.log('\nDados criados:');
      console.log('Barbearia:', data.data.barbershop);
      console.log('\nUsuários para teste:');
      console.log('ADMIN:', data.data.users.admin);
      console.log('BARBER:', data.data.users.barber);
      console.log('CLIENT:', data.data.users.client);
      console.log('\nQuantidades:');
      console.log('Clientes:', data.data.clients);
      console.log('Serviços:', data.data.services);
      console.log('Agendamentos:', data.data.appointments);
      
      console.log('\n=== USE ESSES DADOS PARA LOGIN ===');
      console.log('1. Admin: admin@barberiacentral.com / admin123');
      console.log('2. Barbeiro: joao@barberiacentral.com / barber123');
      console.log('3. Cliente: cliente@barberiacentral.com / client123');
      
    } else {
      const error = await response.json();
      console.error('ERRO NO SEED:', error);
    }
  } catch (error) {
    console.error('ERRO DE CONEXÃO:', error.message);
    console.log('Certifique-se de que o servidor está rodando em http://localhost:3000');
  }
}

// Verificar dados atuais
async function checkData() {
  try {
    console.log('=== VERIFICANDO DADOS ATUAIS ===');
    
    const response = await fetch('http://localhost:3006/api/seed', {
      method: 'GET',
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('Estatísticas atuais:');
      console.log('Barbearias:', data.data.barbershops);
      console.log('Usuários:', data.data.users);
      console.log('Clientes:', data.data.clients);
      console.log('Serviços:', data.data.services);
      console.log('Agendamentos:', data.data.appointments);
    } else {
      console.error('ERRO AO VERIFICAR DADOS');
    }
  } catch (error) {
    console.error('ERRO DE CONEXÃO:', error.message);
  }
}

// Menu interativo
const args = process.argv.slice(2);
const command = args[0];

if (command === 'check') {
  checkData();
} else if (command === 'seed' || !command) {
  seedDatabase();
} else {
  console.log('Uso: node scripts/seed-database.js [seed|check]');
  console.log('seed: Popula o banco com dados iniciais (padrão)');
  console.log('check: Verifica dados existentes');
}
