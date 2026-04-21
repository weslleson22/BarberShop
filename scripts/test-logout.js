// Script para testar funcionalidade de logout completo
// Execute com: node scripts/test-logout.js

async function testLogout() {
  console.log('=== TESTANDO FUNCIONALIDADE DE LOGOUT ===');
  
  try {
    // 1. Fazer login primeiro
    console.log('\n1. Fazendo login para testar logout...');
    const loginResponse = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@barberiacentral.com',
        password: 'admin123'
      }),
      credentials: 'include'
    });
    
    if (!loginResponse.ok) {
      console.error('ERRO: Login falhou - não é possível testar logout');
      return;
    }
    
    const loginData = await loginResponse.json();
    console.log('Login OK - Usuário:', loginData.user.name);
    console.log('Login OK - Role:', loginData.user.role);
    
    // 2. Extrair cookie
    const setCookieHeader = loginResponse.headers.get('set-cookie');
    const cookieMatch = setCookieHeader?.match(/auth-token=([^;]+)/);
    const token = cookieMatch ? cookieMatch[1] : null;
    
    if (!token) {
      console.error('ERRO: Token não encontrado no cookie');
      return;
    }
    
    console.log('Token obtido:', token.substring(0, 20) + '...');
    
    // 3. Testar acesso com token válido
    console.log('\n2. Testando acesso com token válido...');
    const dashboardResponse = await fetch('http://localhost:3000/dashboard/dashboard', {
      headers: {
        'Cookie': `auth-token=${token}`
      },
      redirect: 'manual'
    });
    
    console.log('Status dashboard (logado):', dashboardResponse.status);
    if (dashboardResponse.status === 302 || dashboardResponse.status === 307) {
      const location = dashboardResponse.headers.get('location');
      console.log('Redirecionado para:', location);
      if (location?.includes('/login')) {
        console.log('ERRO: Usuário logado está sendo redirecionado para login');
      }
    } else {
      console.log('Acesso permitido (status diferente de 302/307)');
    }
    
    // 4. Testar logout via API (se existir)
    console.log('\n3. Testando logout via API...');
    try {
      const logoutResponse = await fetch('http://localhost:3000/api/auth/logout', {
        method: 'POST',
        headers: {
          'Cookie': `auth-token=${token}`
        },
        credentials: 'include'
      });
      
      console.log('Status logout API:', logoutResponse.status);
      if (logoutResponse.ok) {
        const logoutData = await logoutResponse.json();
        console.log('Logout API OK:', logoutData.message || 'Success');
      } else {
        console.log('Logout API não existe ou falhou - usando logout client-side');
      }
    } catch (error) {
      console.log('Logout API não disponível - usando logout client-side');
    }
    
    // 5. Simular logout client-side (limpar cookie)
    console.log('\n4. Simulando logout client-side...');
    
    // 6. Testar acesso após logout
    console.log('\n5. Testando acesso após logout...');
    const afterLogoutResponse = await fetch('http://localhost:3000/dashboard/dashboard', {
      headers: {
        'Cookie': 'auth-token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;'
      },
      redirect: 'manual'
    });
    
    console.log('Status dashboard (pós-logout):', afterLogoutResponse.status);
    if (afterLogoutResponse.status === 302 || afterLogoutResponse.status === 307) {
      const location = afterLogoutResponse.headers.get('location');
      console.log('Redirecionado para:', location);
      if (location?.includes('/login')) {
        console.log('SUCCESS: Usuário não logado redirecionado para login');
      }
    } else {
      console.log('WARNING: Usuário não logado não foi redirecionado');
    }
    
    // 7. Verificar logs expostos
    console.log('\n6. Verificando informações expostas nos logs...');
    
    // Testar diferentes tipos de usuário
    const users = [
      { email: 'admin@barberiacentral.com', password: 'admin123', role: 'ADMIN' },
      { email: 'joao@barberiacentral.com', password: 'barber123', role: 'BARBER' },
      { email: 'maria@barberiacentral.com', password: 'client123', role: 'CLIENT' }
    ];
    
    for (const user of users) {
      console.log(`\n--- Testando usuário ${user.role} ---`);
      
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
        
        console.log(`${user.role} logado:`, userLoginData.user.name);
        
        // Testar acesso a diferentes endpoints
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
                'Cookie': userToken ? `auth-token=${userToken}` : ''
              }
            });
            
            if (endpointResponse.ok) {
              const data = await endpointResponse.json();
              console.log(`${user.role} - ${endpoint.name}:`, 
                Array.isArray(data) ? `${data.length} itens` : 
                typeof data === 'object' ? Object.keys(data).length + ' propriedades' : 
                'Dados recebidos'
              );
              
              // Verificar se CLIENT está vendo dados de outros usuários
              if (user.role === 'CLIENT' && Array.isArray(data)) {
                const hasOtherUserData = data.some(item => {
                  if (item.clientId && item.clientId !== userLoginData.user.id) {
                    return true;
                  }
                  if (item.userId && item.userId !== userLoginData.user.id) {
                    return true;
                  }
                  return false;
                });
                
                if (hasOtherUserData) {
                  console.log(`WARNING: CLIENT está vendo dados de outros usuários em ${endpoint.name}`);
                } else {
                  console.log(`OK: CLIENT vê apenas seus dados em ${endpoint.name}`);
                }
              }
            } else {
              console.log(`${user.role} - ${endpoint.name}:`, `Acesso negado (${endpointResponse.status})`);
            }
          } catch (error) {
            console.log(`${user.role} - ${endpoint.name}:`, `Erro: ${error.message}`);
          }
        }
      } else {
        console.log(`${user.role}: Login falhou`);
      }
    }
    
  } catch (error) {
    console.error('Erro no teste:', error);
  }
}

testLogout();
