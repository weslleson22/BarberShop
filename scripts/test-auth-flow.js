// Script para testar fluxo completo de autenticação
// Execute com: node scripts/test-auth-flow.js

async function testAuthFlow() {
  console.log('=== TESTANDO FLUXO COMPLETO DE AUTENTICAÇÃO ===');
  
  try {
    // 1. Testar acesso ao dashboard sem autenticação
    console.log('\n1. TESTANDO ACESSO NÃO AUTENTICADO AO DASHBOARD');
    const dashboardResponse = await fetch('http://localhost:3000/dashboard/dashboard', {
      redirect: 'manual' // Não seguir redirecionamentos
    });
    
    if (dashboardResponse.status === 302 || dashboardResponse.status === 307) {
      console.log('Dashboard redirecionando corretamente para login');
      const location = dashboardResponse.headers.get('location');
      console.log('Redirecionado para:', location);
    } else {
      console.log('ERRO: Dashboard não está redirecionando (status:', dashboardResponse.status, ')');
    }
    
    // 2. Fazer login
    console.log('\n2. FAZENDO LOGIN');
    const loginResponse = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'admin@barberiacentral.com',
        password: 'admin123'
      }),
      redirect: 'manual'
    });
    
    if (loginResponse.ok) {
      const loginData = await loginResponse.json();
      console.log('Login bem-sucedido!');
      console.log('Usuário:', loginData.user.name, '-', loginData.user.role);
      console.log('Token recebido:', loginData.token.substring(0, 20) + '...');
      
      // Extrair cookie de autenticação
      const setCookieHeader = loginResponse.headers.get('set-cookie');
      console.log('Cookie definido:', setCookieHeader ? 'SIM' : 'NÃO');
      
      // 3. Testar acesso ao dashboard com autenticação
      console.log('\n3. TESTANDO ACESSO AUTENTICADO AO DASHBOARD');
      const authDashboardResponse = await fetch('http://localhost:3000/dashboard/dashboard', {
        headers: {
          'Cookie': setCookieHeader || ''
        },
        redirect: 'manual'
      });
      
      if (authDashboardResponse.ok) {
        console.log('Dashboard acessível com autenticação (status:', authDashboardResponse.status, ')');
      } else if (authDashboardResponse.status === 302 || authDashboardResponse.status === 307) {
        console.log('ERRO: Dashboard ainda redirecionando mesmo com login');
      } else {
        console.log('ERRO: Status inesperado:', authDashboardResponse.status);
      }
      
      // 4. Testar logout
      console.log('\n4. TESTANDO LOGOUT');
      // Simular logout limpando cookies
      const logoutResponse = await fetch('http://localhost:3000/api/auth/logout', {
        method: 'POST',
        headers: {
          'Cookie': setCookieHeader || ''
        },
        redirect: 'manual'
      });
      
      // 5. Testar acesso pós-logout
      console.log('\n5. TESTANDO ACESSO PÓS-LOGOUT');
      const postLogoutResponse = await fetch('http://localhost:3000/dashboard/dashboard', {
        redirect: 'manual'
      });
      
      if (postLogoutResponse.status === 302 || postLogoutResponse.status === 307) {
        console.log('Dashboard redirecionando corretamente após logout');
        const location = postLogoutResponse.headers.get('location');
        console.log('Redirecionado para:', location);
      } else {
        console.log('ERRO: Dashboard não está redirecionando após logout (status:', postLogoutResponse.status, ')');
      }
      
    } else {
      const error = await loginResponse.text();
      console.error('ERRO NO LOGIN:', loginResponse.status, error);
    }
    
  } catch (error) {
    console.error('ERRO NO TESTE:', error.message);
  }
}

// Testar middleware diretamente
async function testMiddleware() {
  console.log('\n=== TESTANDO MIDDLEWARE ===');
  
  const protectedPaths = ['/dashboard', '/agenda', '/clientes', '/servicos', '/usuarios'];
  
  for (const path of protectedPaths) {
    console.log(`\nTestando rota: ${path}`);
    
    try {
      const response = await fetch(`http://localhost:3000${path}`, {
        redirect: 'manual'
      });
      
      if (response.status === 302 || response.status === 307) {
        console.log(`  ${path}: Redirecionando corretamente`);
      } else {
        console.log(`  ${path}: ERRO - Status ${response.status}`);
      }
    } catch (error) {
      console.log(`  ${path}: Erro de conexão - ${error.message}`);
    }
  }
}

// Menu interativo
const args = process.argv.slice(2);
const command = args[0];

if (command === 'middleware') {
  testMiddleware();
} else if (command === 'flow' || !command) {
  testAuthFlow();
} else {
  console.log('Uso: node scripts/test-auth-flow.js [flow|middleware]');
  console.log('flow: Testa fluxo completo de autenticação (padrão)');
  console.log('middleware: Testa apenas middleware de proteção');
}
