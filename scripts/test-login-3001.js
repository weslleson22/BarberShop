// Script para testar login na porta 3001
// Execute com: node scripts/test-login-3001.js

async function testLogin3001() {
  console.log('=== TESTANDO LOGIN NA PORTA 3001 ===');
  
  try {
    // 1. Testar login ADMIN
    console.log('\n1. Testando login ADMIN...');
    const adminResponse = await fetch('http://localhost:3001/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@barberiacentral.com',
        password: 'admin123'
      }),
      credentials: 'include'
    });
    
    console.log('Status ADMIN:', adminResponse.status);
    
    if (adminResponse.ok) {
      const adminData = await adminResponse.json();
      console.log('SUCCESS: ADMIN Login OK');
      console.log('Nome:', adminData.user?.name);
      console.log('Role:', adminData.user?.role);
      
      // Extrair token
      const adminCookie = adminResponse.headers.get('set-cookie');
      const adminTokenMatch = adminCookie?.match(/auth-token=([^;]+)/);
      const adminToken = adminTokenMatch ? adminTokenMatch[1] : null;
      
      if (adminToken) {
        // Testar dashboard
        console.log('\n2. Testando dashboard ADMIN...');
        const dashboardResponse = await fetch('http://localhost:3001/dashboard/dashboard', {
          headers: {
            'Cookie': `auth-token=${adminToken}`
          },
          redirect: 'manual'
        });
        
        console.log('Status dashboard ADMIN:', dashboardResponse.status);
        if (dashboardResponse.status === 302 || dashboardResponse.status === 307) {
          const location = dashboardResponse.headers.get('location');
          console.log('Redirecionado para:', location);
          
          if (location?.includes('/login')) {
            console.log('PROBLEMA: ADMIN sendo redirecionado para login');
          } else {
            console.log('OK: ADMIN não redirecionado para login');
          }
        } else {
          console.log('OK: Dashboard acessível (status:', dashboardResponse.status, ')');
        }
      }
    } else {
      const error = await adminResponse.text();
      console.log('ERRO ADMIN:', error);
    }
    
    // 2. Testar login CLIENT
    console.log('\n3. Testando login CLIENT...');
    const clientResponse = await fetch('http://localhost:3001/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'maria@barberiacentral.com',
        password: 'admin123'
      }),
      credentials: 'include'
    });
    
    console.log('Status CLIENT:', clientResponse.status);
    
    if (clientResponse.ok) {
      const clientData = await clientResponse.json();
      console.log('SUCCESS: CLIENT Login OK');
      console.log('Nome:', clientData.user?.name);
      console.log('Role:', clientData.user?.role);
      
      // Extrair token
      const clientCookie = clientResponse.headers.get('set-cookie');
      const clientTokenMatch = clientCookie?.match(/auth-token=([^;]+)/);
      const clientToken = clientTokenMatch ? clientTokenMatch[1] : null;
      
      if (clientToken) {
        // Testar APIs
        console.log('\n4. Testando APIs CLIENT...');
        const endpoints = [
          { path: '/api/appointments', name: 'Agendamentos' },
          { path: '/api/users', name: 'Usuários' },
          { path: '/api/services', name: 'Serviços' },
          { path: '/api/clients', name: 'Clientes' }
        ];
        
        for (const endpoint of endpoints) {
          try {
            const endpointResponse = await fetch(`http://localhost:3001${endpoint.path}`, {
              headers: {
                'Cookie': `auth-token=${clientToken}`
              }
            });
            
            if (endpointResponse.ok) {
              const data = await endpointResponse.json();
              console.log(`CLIENT - ${endpoint.name}:`, 
                Array.isArray(data) ? `${data.length} itens` : 
                typeof data === 'object' ? Object.keys(data).length + ' propriedades' : 
                'Dados recebidos'
              );
              
              // Verificar se CLIENT está vendo apenas seus dados
              if (Array.isArray(data) && endpoint.name === 'Agendamentos') {
                const clientAppointments = data.filter(item => 
                  item.clientId === clientData.user.id || 
                  item.client?.id === clientData.user.id
                );
                
                console.log(`  - Agendamentos do CLIENT: ${clientAppointments.length}/${data.length}`);
                
                if (clientAppointments.length === data.length && data.length > 0) {
                  console.log('  OK: CLIENT vê apenas seus agendamentos');
                } else if (data.length === 0) {
                  console.log('  OK: CLIENT não vê agendamentos de outros');
                } else {
                  console.log('  WARNING: CLIENT está vendo agendamentos de outros usuários');
                }
              }
            } else {
              console.log(`CLIENT - ${endpoint.name}:`, `Acesso negado (${endpointResponse.status})`);
            }
          } catch (error) {
            console.log(`CLIENT - ${endpoint.name}:`, `Erro: ${error.message}`);
          }
        }
      }
    } else {
      const error = await clientResponse.text();
      console.log('ERRO CLIENT:', error);
    }
    
  } catch (error) {
    console.error('Erro:', error.message);
  }
}

testLogin3001();
