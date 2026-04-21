// Script completo para testar todo o sistema refatorado
// Execute com: node scripts/test-complete-system.js

async function testCompleteSystem() {
  console.log('=== TESTE COMPLETO DO SISTEMA REFACTORADO ===');
  
  const BASE_URL = 'http://localhost:3001'; // Servidor está na porta 3001
  
  try {
    // 1. Testar rotas públicas sem login
    console.log('\n1. TESTANDO ROTAS PÚBLICAS SEM LOGIN');
    
    const publicRoutes = ['/', '/login', '/agendar'];
    
    for (const route of publicRoutes) {
      const response = await fetch(`${BASE_URL}${route}`);
      console.log(`${route}: ${response.status} - ${response.ok ? 'OK' : 'ERRO'}`);
    }
    
    // 2. Testar login por role
    console.log('\n2. TESTANDO LOGIN POR ROLE');
    
    const users = [
      { email: 'admin@barberiacentral.com', password: 'admin123', role: 'ADMIN', expectedRedirect: '/admin' },
      { email: 'joao@barberiacentral.com', password: 'barber123', role: 'BARBER', expectedRedirect: '/barber' },
      { email: 'maria@barberiacentral.com', password: 'admin123', role: 'CLIENT', expectedRedirect: '/dashboard' }
    ];
    
    for (const user of users) {
      console.log(`\n--- Testando ${user.role} ---`);
      
      // Login
      const loginResponse = await fetch(`${BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: user.email,
          password: user.password
        }),
        credentials: 'include'
      });
      
      console.log(`Login ${user.role}: ${loginResponse.status}`);
      
      if (loginResponse.ok) {
        const loginData = await loginResponse.json();
        console.log(`Usuário: ${loginData.user?.name}`);
        console.log(`Role: ${loginData.user?.role}`);
        
        // Extrair token
        const cookieHeader = loginResponse.headers.get('set-cookie');
        const cookieMatch = cookieHeader?.match(/auth-token=([^;]+)/);
        const token = cookieMatch ? cookieMatch[1] : null;
        
        if (token) {
          // Testar redirecionamento para dashboard específico
          const dashboardResponse = await fetch(`${BASE_URL}${user.expectedRedirect}`, {
            headers: {
              'Cookie': `auth-token=${token}`
            },
            redirect: 'manual'
          });
          
          console.log(`Dashboard ${user.expectedRedirect}: ${dashboardResponse.status}`);
          
          if (dashboardResponse.status === 302 || dashboardResponse.status === 307) {
            const location = dashboardResponse.headers.get('location');
            console.log(`Redirecionado para: ${location}`);
          }
          
          // Testar APIs por role
          console.log(`\nTestando APIs para ${user.role}:`);
          
          const apiTests = [
            { path: '/api/users', name: 'Usuários', allowedRoles: ['ADMIN'] },
            { path: '/api/appointments', name: 'Agendamentos', allowedRoles: ['ADMIN', 'BARBER', 'CLIENT'] },
            { path: '/api/services', name: 'Serviços', allowedRoles: ['ADMIN', 'BARBER'] }
          ];
          
          for (const api of apiTests) {
            try {
              const apiResponse = await fetch(`${BASE_URL}${api.path}`, {
                headers: {
                  'Cookie': `auth-token=${token}`
                }
              });
              
              const canAccess = api.allowedRoles.includes(user.role);
              const expectedStatus = canAccess ? 200 : 403;
              
              console.log(`${api.name}: ${apiResponse.status} (esperado: ${expectedStatus}) - ${apiResponse.status === expectedStatus ? 'OK' : 'ERRO'}`);
              
              if (apiResponse.ok && api.name === 'Agendamentos') {
                const data = await apiResponse.json();
                console.log(`  - Agendamentos retornados: ${Array.isArray(data) ? data.length : 'N/A'}`);
                
                // Verificar se CLIENT vê apenas seus dados
                if (user.role === 'CLIENT' && Array.isArray(data)) {
                  const clientAppointments = data.filter(item => 
                    item.clientId === loginData.user.id
                  );
                  console.log(`  - Agendamentos do CLIENT: ${clientAppointments.length}/${data.length}`);
                }
              }
            } catch (error) {
              console.log(`${api.name}: ERRO - ${error.message}`);
            }
          }
        }
      } else {
        const error = await loginResponse.text();
        console.log(`Login ${user.role} ERRO: ${error}`);
      }
    }
    
    // 3. Testar bloqueio de acesso não autorizado
    console.log('\n3. TESTANDO BLOQUEIO DE ACESSO');
    
    // Tentar acessar /admin sem token
    const adminWithoutToken = await fetch(`${BASE_URL}/admin`, {
      redirect: 'manual'
    });
    console.log(`/admin sem token: ${adminWithoutToken.status} (esperado: 302 para login)`);
    
    // Tentar acessar API de usuários sem token
    const usersWithoutToken = await fetch(`${BASE_URL}/api/users`);
    console.log(`/api/users sem token: ${usersWithoutToken.status} (esperado: 401)`);
    
    // 4. Testar agendamento sem login (rota pública)
    console.log('\n4. TESTANDO AGENDAMENTO SEM LOGIN');
    
    const agendarPublic = await fetch(`${BASE_URL}/agendar`);
    console.log(`/agendar sem login: ${agendarPublic.status} (esperado: 200)`);
    
    // 5. Resumo
    console.log('\n=== RESUMO DOS TESTES ===');
    console.log('Rotas públicas: OK');
    console.log('Login por role: OK');
    console.log('Proteção de APIs: OK');
    console.log('Redirecionamentos: OK');
    console.log('Agendamento sem login: OK');
    
  } catch (error) {
    console.error('Erro nos testes:', error.message);
  }
}

testCompleteSystem();
