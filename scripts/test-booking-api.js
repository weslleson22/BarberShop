// Script para testar APIs de agendamento
// Execute com: node scripts/test-booking-api.js

async function testBookingAPIs() {
  console.log('=== TESTANDO APIs DE AGENDAMENTO ===');
  
  try {
    // Testar API de serviços públicos
    console.log('\n1. Testando /api/services/public');
    const servicesResponse = await fetch('http://localhost:3000/api/services/public');
    
    if (servicesResponse.ok) {
      const services = await servicesResponse.json();
      console.log('SERVIÇOS:', services.length, 'encontrados');
      services.forEach((service, index) => {
        console.log(`  ${index + 1}. ${service.name} - R$${service.price} (${service.duration}min)`);
      });
    } else {
      console.error('ERRO EM SERVIÇOS:', servicesResponse.status, servicesResponse.statusText);
      const error = await servicesResponse.text();
      console.error('Detalhes:', error);
    }
    
    // Testar API de barbeiros
    console.log('\n2. Testando /api/users?role=BARBER');
    const barbersResponse = await fetch('http://localhost:3000/api/users?role=BARBER');
    
    if (barbersResponse.ok) {
      const barbers = await barbersResponse.json();
      console.log('BARBEIROS:', barbers.length, 'encontrados');
      barbers.forEach((barber, index) => {
        console.log(`  ${index + 1}. ${barber.name} - ${barber.email}`);
      });
    } else {
      console.error('ERRO EM BARBEIROS:', barbersResponse.status, barbersResponse.statusText);
      const error = await barbersResponse.text();
      console.error('Detalhes:', error);
    }
    
    // Testar API de agendamentos públicos
    console.log('\n3. Testando /api/appointments/public');
    const appointmentsResponse = await fetch('http://localhost:3000/api/appointments/public');
    
    if (appointmentsResponse.ok) {
      const appointments = await appointmentsResponse.json();
      console.log('AGENDAMENTOS:', appointments.length, 'encontrados');
      appointments.forEach((apt, index) => {
        console.log(`  ${index + 1}. ${apt.client?.name} - ${apt.service?.name} - ${new Date(apt.startTime).toLocaleString('pt-BR')}`);
      });
    } else {
      console.error('ERRO EM AGENDAMENTOS:', appointmentsResponse.status, appointmentsResponse.statusText);
      const error = await appointmentsResponse.text();
      console.error('Detalhes:', error);
    }
    
    // Testar API de clientes públicos
    console.log('\n4. Testando /api/clients/public');
    const clientsResponse = await fetch('http://localhost:3000/api/clients/public');
    
    if (clientsResponse.ok) {
      const clients = await clientsResponse.json();
      console.log('CLIENTES:', clients.length, 'encontrados');
      clients.forEach((client, index) => {
        console.log(`  ${index + 1}. ${client.name} - ${client.phone}`);
      });
    } else {
      console.error('ERRO EM CLIENTES:', clientsResponse.status, clientsResponse.statusText);
      const error = await clientsResponse.text();
      console.error('Detalhes:', error);
    }
    
    console.log('\n=== TESTE CONCLUÍDO ===');
    
  } catch (error) {
    console.error('ERRO DE CONEXÃO:', error.message);
    console.log('Certifique-se de que o servidor está rodando em http://localhost:3000');
  }
}

// Testar criação de agendamento
async function testCreateAppointment() {
  console.log('\n=== TESTANDO CRIAÇÃO DE AGENDAMENTO ===');
  
  try {
    // Primeiro buscar dados necessários
    const servicesResponse = await fetch('http://localhost:3000/api/services/public');
    const barbersResponse = await fetch('http://localhost:3000/api/users?role=BARBER');
    
    if (!servicesResponse.ok || !barbersResponse.ok) {
      console.error('Não foi possível buscar dados para teste');
      return;
    }
    
    const services = await servicesResponse.json();
    const barbers = await barbersResponse.json();
    
    if (services.length === 0 || barbers.length === 0) {
      console.error('Não há serviços ou barbeiros disponíveis');
      return;
    }
    
    // Primeiro buscar um cliente existente
    const clientsResponse = await fetch('http://localhost:3000/api/clients/public');
    let clientId = 'test-client-id';
    
    if (clientsResponse.ok) {
      const clients = await clientsResponse.json();
      if (clients.length > 0) {
        clientId = clients[0].id; // Usar o primeiro cliente existente
        console.log('Usando cliente existente:', clients[0].name, clientId);
      }
    }
    
    // Criar agendamento de teste
    const appointmentData = {
      clientId: clientId,
      barberId: barbers[0].id,
      serviceId: services[0].id,
      startTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Amanhã
      notes: 'Agendamento de teste via API'
    };
    
    console.log('Dados do agendamento:', appointmentData);
    
    const response = await fetch('http://localhost:3000/api/appointments/public', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(appointmentData),
    });
    
    if (response.ok) {
      const appointment = await response.json();
      console.log('AGENDAMENTO CRIADO COM SUCESSO:');
      console.log('ID:', appointment.id);
      console.log('Cliente:', appointment.client?.name);
      console.log('Serviço:', appointment.service?.name);
      console.log('Barbeiro:', appointment.barber?.name);
      console.log('Horário:', new Date(appointment.startTime).toLocaleString('pt-BR'));
    } else {
      const error = await response.text();
      console.error('ERRO AO CRIAR AGENDAMENTO:', response.status, response.statusText);
      console.error('Detalhes:', error);
    }
    
  } catch (error) {
    console.error('ERRO NO TESTE DE CRIAÇÃO:', error.message);
  }
}

// Menu interativo
const args = process.argv.slice(2);
const command = args[0];

if (command === 'create') {
  testCreateAppointment();
} else if (command === 'test' || !command) {
  testBookingAPIs();
} else {
  console.log('Uso: node scripts/test-booking-api.js [test|create]');
  console.log('test: Testa APIs de busca (padrão)');
  console.log('create: Testa criação de agendamento');
}
