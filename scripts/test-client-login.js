// Script para testar login do CLIENT criado
// Execute com: node scripts/test-client-login.js

async function testClientLogin() {
  console.log('=== TESTANDO LOGIN DO CLIENT ===');
  
  try {
    // Testar login com senha correta (reutilizada do admin)
    console.log('1. Testando login com senha admin123...');
    const response = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'maria@barberiacentral.com',
        password: 'admin123'
      }),
      credentials: 'include'
    });
    
    console.log('Status:', response.status);
    
    if (response.ok) {
      const data = await response.json();
      console.log('SUCCESS: Login CLIENT OK');
      console.log('Nome:', data.user?.name);
      console.log('Email:', data.user?.email);
      console.log('Role:', data.user?.role);
      console.log('ID:', data.user?.id);
      console.log('Token:', data.token ? data.token.substring(0, 20) + '...' : 'NÃO');
      
      // Testar acesso ao dashboard
      console.log('\n2. Testando acesso ao dashboard CLIENT...');
      const cookieHeader = response.headers.get('set-cookie');
      const cookieMatch = cookieHeader?.match(/auth-token=([^;]+)/);
      const token = cookieMatch ? cookieMatch[1] : null;
      
      if (token) {
        const dashboardResponse = await fetch('http://localhost:3000/dashboard/dashboard', {
          headers: {
            'Cookie': `auth-token=${token}`
          },
          redirect: 'manual'
        });
        
        console.log('Status dashboard CLIENT:', dashboardResponse.status);
        if (dashboardResponse.status === 302 || dashboardResponse.status === 307) {
          const location = dashboardResponse.headers.get('location');
          console.log('Redirecionado para:', location);
        }
        
        // Testar acesso a APIs como CLIENT
        console.log('\n3. Testando acesso a APIs como CLIENT...');
        const endpoints = [
          { path: '/api/appointments', name: 'Agendamentos' },
          { path: '/api/users', name: 'Usuários' },
          { path: '/api/services', name: 'Serviços' },
          { path: '/api/clients', name: 'Clientes' }
        ];
        
        for (const endpoint of endpoints) {
          try {
            const endpointResponse = await fetch(`http://localhost:3000${endpoint.path}`, {
              headers: {
                'Cookie': `auth-token=${token}`
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
                  item.clientId === data.user?.id || 
                  item.client?.id === data.user?.id
                );
                
                console.log(`  - Agendamentos do CLIENT: ${clientAppointments.length}/${data.length}`);
                
                if (clientAppointments.length === data.length) {
                  console.log('  OK: CLIENT vê apenas seus agendamentos');
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
      const error = await response.text();
      console.log('ERRO no login CLIENT:', error);
      
      // Tentar com senha client123
      console.log('\n4. Tentando com senha client123...');
      const response2 = await fetch('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'maria@barberiacentral.com',
          password: 'client123'
        }),
        credentials: 'include'
      });
      
      console.log('Status com client123:', response2.status);
      if (response2.ok) {
        const data2 = await response2.json();
        console.log('SUCCESS: Login CLIENT com senha client123');
        console.log('Nome:', data2.user?.name);
        console.log('Role:', data2.user?.role);
      } else {
        const error2 = await response2.text();
        console.log('ERRO com client123:', error2);
      }
    }
    
  } catch (error) {
    console.error('Erro:', error.message);
  }
}

testClientLogin();
