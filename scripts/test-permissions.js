// Script para testar permissões de acesso por perfil
// Execute com: node scripts/test-permissions.js

async function testPermissions() {
  console.log('=== TESTANDO PERMISSÕES DE ACESSO ===');
  
  const users = [
    { email: 'admin@barberiacentral.com', password: 'admin123', role: 'ADMIN' },
    { email: 'joao@barberiacentral.com', password: 'barber123', role: 'BARBER' },
    { email: 'cliente@barberiacentral.com', password: 'client123', role: 'CLIENT' }
  ];
  
  const pages = [
    { path: '/dashboard', name: 'Dashboard', expected: ['ADMIN', 'BARBER', 'CLIENT'] },
    { path: '/agenda', name: 'Agenda', expected: ['ADMIN', 'BARBER'] },
    { path: '/clientes', name: 'Clientes', expected: ['ADMIN', 'BARBER'] },
    { path: '/servicos', name: 'Serviços', expected: ['ADMIN', 'BARBER'] },
    { path: '/usuarios', name: 'Usuários', expected: ['ADMIN'] },
    { path: '/agendar', name: 'Agendar', expected: ['ADMIN', 'BARBER', 'CLIENT'] }
  ];
  
  for (const user of users) {
    console.log(`\n=== TESTANDO USUÁRIO: ${user.role} (${user.email}) ===`);
    
    // Fazer login
    const loginResponse = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: user.email, password: user.password }),
    });
    
    if (!loginResponse.ok) {
      console.log(`ERRO NO LOGIN: ${user.email}`);
      continue;
    }
    
    const loginData = await loginResponse.json();
    const setCookie = loginResponse.headers.get('set-cookie');
    
    console.log(`Login bem-sucedido: ${loginData.user.name}`);
    
    // Testar acesso a cada página
    for (const page of pages) {
      try {
        const response = await fetch(`http://localhost:3000${page.path}`, {
          headers: { 'Cookie': setCookie || '' },
          redirect: 'manual'
        });
        
        const hasAccess = response.ok || response.status === 200;
        const expectedAccess = page.expected.includes(user.role);
        
        console.log(`  ${page.name}: ${hasAccess ? 'ACESSO' : 'BLOQUEADO'} ${expectedAccess ? '(OK)' : '(ERRO)'}`);
        
        if (hasAccess !== expectedAccess) {
          console.log(`    ERRO: Esperado ${expectedAccess ? 'ACESSO' : 'BLOQUEADO'}, mas obteve ${hasAccess ? 'ACESSO' : 'BLOQUEADO'}`);
        }
        
      } catch (error) {
        console.log(`  ${page.name}: ERRO DE CONEXÃO`);
      }
    }
  }
}

// Testar middleware diretamente
async function testMiddlewarePaths() {
  console.log('\n=== TESTANDO MIDDLEWARE DIRETAMENTE ===');
  
  const paths = [
    '/dashboard',
    '/agenda', 
    '/clientes',
    '/servicos',
    '/usuarios',
    '/agendar'
  ];
  
  for (const path of paths) {
    console.log(`\nTestando rota: ${path}`);
    
    try {
      const response = await fetch(`http://localhost:3000${path}`, {
        redirect: 'manual'
      });
      
      if (response.status === 302 || response.status === 307) {
        const location = response.headers.get('location');
        console.log(`  Redirecionado para: ${location}`);
      } else if (response.ok) {
        console.log(`  Acesso permitido (status: ${response.status})`);
      } else {
        console.log(`  Status inesperado: ${response.status}`);
      }
    } catch (error) {
      console.log(`  Erro de conexão: ${error.message}`);
    }
  }
}

// Menu interativo
const args = process.argv.slice(2);
const command = args[0];

if (command === 'middleware') {
  testMiddlewarePaths();
} else if (command === 'permissions' || !command) {
  testPermissions();
} else {
  console.log('Uso: node scripts/test-permissions.js [permissions|middleware]');
  console.log('permissions: Testa permissões por usuário (padrão)');
  console.log('middleware: Testa apenas middleware');
}
