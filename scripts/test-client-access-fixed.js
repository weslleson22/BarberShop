// Script para testar se CLIENT agora vê apenas seus dados
// Execute com: node scripts/test-client-access-fixed.js

async function testClientAccessFixed() {
  console.log('=== TESTANDO ACESSO CLIENT APÓS CORREÇÃO ===');
  
  try {
    // Login como CLIENT
    console.log('1. Fazendo login como CLIENT...');
    const response = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'maria@barberiacentral.com',
        password: 'admin123'
      }),
      credentials: 'include'
    });
    
    if (!response.ok) {
      console.log('ERRO: Login CLIENT falhou');
      return;
    }
    
    const loginData = await response.json();
    console.log('Login CLIENT OK:', loginData.user.name);
    
    // Extrair token
    const cookieHeader = response.headers.get('set-cookie');
    const cookieMatch = cookieHeader?.match(/auth-token=([^;]+)/);
    const token = cookieMatch ? cookieMatch[1] : null;
    
    if (!token) {
      console.log('ERRO: Token não encontrado');
      return;
    }
    
    // Testar acesso a agendamentos
    console.log('\n2. Testando acesso a agendamentos como CLIENT...');
    const appointmentsResponse = await fetch('http://localhost:3000/api/appointments', {
      headers: {
        'Cookie': `auth-token=${token}`
      }
    });
    
    console.log('Status agendamentos:', appointmentsResponse.status);
    
    if (appointmentsResponse.ok) {
      const appointments = await appointmentsResponse.json();
      console.log('Agendamentos retornados:', appointments.length);
      
      if (appointments.length === 0) {
        console.log('SUCCESS: CLIENT não vê agendamentos de outros usuários');
      } else {
        console.log('Agendamentos do CLIENT:');
        appointments.forEach((apt, index) => {
          console.log(`  ${index + 1}. ID: ${apt.id}`);
          console.log(`     Cliente: ${apt.client?.name || 'N/A'}`);
          console.log(`     Serviço: ${apt.service?.name || 'N/A'}`);
          console.log(`     Horário: ${apt.startTime ? new Date(apt.startTime).toLocaleString('pt-BR') : 'N/A'}`);
          console.log(`     Status: ${apt.status || 'N/A'}`);
        });
        
        // Verificar se todos os agendamentos são do CLIENT
        const allClientAppointments = appointments.every(apt => 
          apt.clientId === loginData.user.id || 
          apt.client?.id === loginData.user.id
        );
        
        if (allClientAppointments) {
          console.log('SUCCESS: CLIENT vê apenas seus agendamentos');
        } else {
          console.log('WARNING: CLIENT ainda vê agendamentos de outros usuários');
        }
      }
    } else {
      const error = await appointmentsResponse.text();
      console.log('ERRO ao acessar agendamentos:', error);
    }
    
    // Testar logout
    console.log('\n3. Testando logout...');
    
    // Limpar cookie
    console.log('Limpando cookie...');
    
    // Testar acesso após logout
    const afterLogoutResponse = await fetch('http://localhost:3000/api/appointments', {
      headers: {
        'Cookie': 'auth-token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;'
      }
    });
    
    console.log('Status após logout:', afterLogoutResponse.status);
    if (afterLogoutResponse.status === 401) {
      console.log('SUCCESS: Logout bloqueou acesso à API');
    } else {
      console.log('WARNING: API ainda acessível após logout');
    }
    
    // Testar diferentes tipos de usuário para comparação
    console.log('\n4. Comparando acesso entre diferentes usuários...');
    
    const users = [
      { email: 'admin@barberiacentral.com', password: 'admin123', role: 'ADMIN' },
      { email: 'joao@barberiacentral.com', password: 'barber123', role: 'BARBER' },
      { email: 'maria@barberiacentral.com', password: 'admin123', role: 'CLIENT' }
    ];
    
    for (const user of users) {
      console.log(`\n--- Testando ${user.role} ---`);
      
      // Login
      const userLoginResponse = await fetch('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: user.email,
          password: user.password
        }),
        credentials: 'include'
      });
      
      if (userLoginResponse.ok) {
        const userLoginData = await userLoginResponse.json();
        const userCookie = userLoginResponse.headers.get('set-cookie');
        const userTokenMatch = userCookie?.match(/auth-token=([^;]+)/);
        const userToken = userTokenMatch ? userTokenMatch[1] : null;
        
        // Testar agendamentos
        if (userToken) {
          const userAppointmentsResponse = await fetch('http://localhost:3000/api/appointments', {
            headers: {
              'Cookie': `auth-token=${userToken}`
            }
          });
          
          if (userAppointmentsResponse.ok) {
            const userAppointments = await userAppointmentsResponse.json();
            console.log(`${user.role} - Agendamentos: ${userAppointments.length} itens`);
            
            if (user.role === 'CLIENT') {
              const clientOnlyAppointments = userAppointments.filter(apt => 
                apt.clientId === userLoginData.user.id
              );
              console.log(`${user.role} - Agendamentos próprios: ${clientOnlyAppointments.length}/${userAppointments.length}`);
            }
          } else {
            console.log(`${user.role} - Agendamentos: Acesso negado`);
          }
        }
      } else {
        console.log(`${user.role}: Login falhou`);
      }
    }
    
  } catch (error) {
    console.error('Erro:', error.message);
  }
}

testClientAccessFixed();
