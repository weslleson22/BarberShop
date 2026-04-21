// Script de debug para agendamento
// Execute com: node scripts/debug-booking.js

async function debugBooking() {
  console.log('=== DEBUG DE AGENDAMENTO ===');
  
  try {
    // 1. Verificar dados existentes
    console.log('\n1. VERIFICANDO DADOS EXISTENTES');
    
    const [servicesRes, barbersRes, clientsRes] = await Promise.all([
      fetch('http://localhost:3000/api/services/public'),
      fetch('http://localhost:3000/api/users?role=BARBER'),
      fetch('http://localhost:3000/api/clients/public')
    ]);
    
    if (!servicesRes.ok || !barbersRes.ok || !clientsRes.ok) {
      console.error('Erro ao buscar dados básicos');
      return;
    }
    
    const services = await servicesRes.json();
    const barbers = await barbersRes.json();
    const clients = await clientsRes.json();
    
    console.log(`Serviços: ${services.length}`);
    console.log(`Barbeiros: ${barbers.length}`);
    console.log(`Clientes: ${clients.length}`);
    
    if (services.length === 0 || barbers.length === 0 || clients.length === 0) {
      console.error('Dados insuficientes para criar agendamento');
      return;
    }
    
    // 2. Tentar criar agendamento com dados reais
    console.log('\n2. TENTANDO CRIAR AGENDAMENTO');
    
    const appointmentData = {
      clientId: clients[0].id,
      barberId: barbers[0].id,
      serviceId: services[0].id,
      startTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      notes: 'Teste de debug'
    };
    
    console.log('Dados do agendamento:', {
      clientId: appointmentData.clientId,
      barberId: appointmentData.barberId,
      serviceId: appointmentData.serviceId,
      startTime: appointmentData.startTime
    });
    
    const response = await fetch('http://localhost:3000/api/appointments/public', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(appointmentData),
    });
    
    if (response.ok) {
      const appointment = await response.json();
      console.log('\n=== SUCESSO ===');
      console.log('Agendamento criado:', {
        id: appointment.id,
        client: appointment.client?.name,
        service: appointment.service?.name,
        barber: appointment.barber?.name,
        startTime: appointment.startTime,
        totalAmount: appointment.totalAmount
      });
    } else {
      const error = await response.text();
      console.error('\n=== ERRO ===');
      console.error('Status:', response.status);
      console.error('Response:', error);
      
      // Tentar diagnóstico
      if (error.includes('Foreign key constraint')) {
        console.log('\n=== DIAGNÓSTICO ===');
        console.log('Erro de chave estrangeira. Verificando IDs...');
        
        // Verificar se os IDs existem
        console.log('Verificando cliente ID:', clients[0].id);
        console.log('Verificando barbeiro ID:', barbers[0].id);
        console.log('Verificando serviço ID:', services[0].id);
        
        // Tentar criar cliente novo
        console.log('\nTentando criar cliente novo...');
        const newClientData = {
          name: 'Cliente Teste Debug',
          phone: '(11) 99999-9999',
          email: 'teste@debug.com'
        };
        
        const clientResponse = await fetch('http://localhost:3000/api/clients/public', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(newClientData),
        });
        
        if (clientResponse.ok) {
          const newClient = await clientResponse.json();
          console.log('Novo cliente criado:', newClient.id);
          
          // Tentar agendamento com novo cliente
          const newAppointmentData = {
            ...appointmentData,
            clientId: newClient.id
          };
          
          const newResponse = await fetch('http://localhost:3000/api/appointments/public', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(newAppointmentData),
          });
          
          if (newResponse.ok) {
            const newAppointment = await newResponse.json();
            console.log('\n=== SUCESSO COM NOVO CLIENTE ===');
            console.log('Agendamento criado:', newAppointment.id);
          } else {
            const newError = await newResponse.text();
            console.error('Ainda falhou com novo cliente:', newError);
          }
        } else {
          console.error('Falha ao criar cliente:', await clientResponse.text());
        }
      }
    }
    
  } catch (error) {
    console.error('Erro no debug:', error.message);
  }
}

debugBooking();
