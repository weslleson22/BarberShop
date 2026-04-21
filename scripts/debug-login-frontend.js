// Script para debugar login no frontend
// Execute com: node scripts/debug-login-frontend.js

async function debugLoginFrontend() {
  console.log('=== DEBUG LOGIN FRONTEND ===');
  
  try {
    // 1. Teste direto da API (já sabemos que funciona)
    console.log('\n1. Testando API diretamente...');
    const apiResponse = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@barberiacentral.com',
        password: 'admin123'
      }),
    });
    
    console.log('Status API:', apiResponse.status);
    if (apiResponse.ok) {
      const apiData = await apiResponse.json();
      console.log('API OK - Token:', apiData.token ? apiData.token.substring(0, 20) + '...' : 'NÃO');
      console.log('API OK - Usuário:', apiData.user?.name);
    } else {
      const error = await apiResponse.text();
      console.log('API ERRO:', error);
    }
    
    // 2. Testar se a página de login está acessível
    console.log('\n2. Testando página de login...');
    const loginPageResponse = await fetch('http://localhost:3000/login');
    console.log('Status página login:', loginPageResponse.status);
    
    // 3. Verificar se há erros de JavaScript na página
    console.log('\n3. Verificando possíveis problemas...');
    
    // 4. Simular login completo como faria o frontend
    console.log('\n4. Simulando login completo...');
    
    const loginResponse = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@barberiacentral.com',
        password: 'admin123'
      }),
      credentials: 'include' // Importante: incluir cookies
    });
    
    console.log('Status login completo:', loginResponse.status);
    
    if (loginResponse.ok) {
      const loginData = await loginResponse.json();
      console.log('Login OK - Usuário:', loginData.user?.name);
      
      // 5. Testar acesso ao dashboard com o cookie
      console.log('\n5. Testando acesso ao dashboard...');
      
      // Extrair cookies da resposta
      const setCookieHeader = loginResponse.headers.get('set-cookie');
      console.log('Cookie recebido:', setCookieHeader ? 'SIM' : 'NÃO');
      
      // Fazer request para dashboard com o cookie
      const dashboardResponse = await fetch('http://localhost:3000/dashboard/dashboard', {
        headers: {
          'Cookie': setCookieHeader || ''
        },
        redirect: 'manual' // Não seguir redirecionamentos
      });
      
      console.log('Status dashboard:', dashboardResponse.status);
      console.log('Headers dashboard:', Object.fromEntries(dashboardResponse.headers.entries()));
      
      if (dashboardResponse.status === 302 || dashboardResponse.status === 307) {
        const location = dashboardResponse.headers.get('location');
        console.log('Redirecionado para:', location);
      }
      
    } else {
      const error = await loginResponse.text();
      console.log('Login ERRO:', error);
    }
    
  } catch (error) {
    console.error('Erro no debug:', error);
  }
}

debugLoginFrontend();
