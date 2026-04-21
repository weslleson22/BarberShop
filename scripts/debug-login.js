// Script de debug detalhado para login
// Execute com: node scripts/debug-login.js

async function debugLogin() {
  console.log('=== DEBUG DETALHADO DE LOGIN ===');
  
  try {
    // 1. Verificar se servidor está rodando
    console.log('\n1. VERIFICANDO SERVIDOR');
    const homeResponse = await fetch('http://localhost:3000');
    if (homeResponse.ok) {
      console.log('Servidor está rodando');
    } else {
      console.log('ERRO: Servidor não está respondendo');
      return;
    }
    
    // 2. Verificar usuários no banco
    console.log('\n2. VERIFICANDO USUÁRIOS NO BANCO');
    const usersResponse = await fetch('http://localhost:3000/api/users');
    if (usersResponse.ok) {
      const users = await usersResponse.json();
      console.log('Usuários encontrados:', users.length);
      users.forEach(user => {
        console.log(`- ${user.name} (${user.email}) - ${user.role} - Ativo: ${user.isActive}`);
      });
    } else {
      console.log('ERRO: Não foi possível buscar usuários');
    }
    
    // 3. Testar login com cada usuário
    console.log('\n3. TESTANDO LOGIN COM CADA USUÁRIO');
    
    const testUsers = [
      { email: 'admin@barberiacentral.com', password: 'admin123', role: 'ADMIN' },
      { email: 'joao@barberiacentral.com', password: 'barber123', role: 'BARBER' },
      { email: 'cliente@barberiacentral.com', password: 'client123', role: 'CLIENT' }
    ];
    
    for (const testUser of testUsers) {
      console.log(`\n--- Testando ${testUser.role}: ${testUser.email} ---`);
      
      try {
        const loginResponse = await fetch('http://localhost:3000/api/auth/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: testUser.email,
            password: testUser.password
          }),
        });
        
        console.log(`Status: ${loginResponse.status}`);
        
        if (loginResponse.ok) {
          const data = await loginResponse.json();
          console.log(`SUCESSO: ${data.user.name}`);
          console.log(`Token: ${data.token.substring(0, 30)}...`);
          
          // Verificar se cookie foi definido
          const setCookie = loginResponse.headers.get('set-cookie');
          console.log(`Cookie: ${setCookie ? 'SIM' : 'NÃO'}`);
          
          // Testar acesso ao dashboard com este token
          const dashboardResponse = await fetch('http://localhost:3000/dashboard/dashboard', {
            headers: {
              'Cookie': setCookie || ''
            },
            redirect: 'manual'
          });
          
          if (dashboardResponse.ok) {
            console.log('Dashboard: ACESSÍVEL');
          } else if (dashboardResponse.status === 302) {
            console.log('Dashboard: REDIRECIONANDO (pode ser normal)');
          } else {
            console.log(`Dashboard: ERRO ${dashboardResponse.status}`);
          }
          
        } else {
          const error = await loginResponse.text();
          console.log(`ERRO: ${error}`);
          
          // Tentar diagnosticar
          if (loginResponse.status === 401) {
            console.log('DIAGNÓSTICO: Credenciais inválidas ou usuário inativo');
          } else if (loginResponse.status === 500) {
            console.log('DIAGNÓSTICO: Erro interno - verifique logs do servidor');
          }
        }
      } catch (error) {
        console.log(`ERRO DE CONEXÃO: ${error.message}`);
      }
    }
    
    // 4. Verificar logs do servidor (se possível)
    console.log('\n4. VERIFICANDO CONFIGURAÇÃO');
    console.log('Para ver logs detalhados:');
    console.log('1. Abra o console do navegador (F12)');
    console.log('2. Vá para a aba Network');
    console.log('3. Tente fazer login na interface');
    console.log('4. Veja os logs no console e na requisição de login');
    
  } catch (error) {
    console.error('ERRO GERAL:', error.message);
  }
}

// Teste rápido de um usuário específico
async function quickTest(email, password) {
  console.log(`\n=== TESTE RÁPIDO: ${email} ===`);
  
  try {
    const response = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('SUCESSO!');
      console.log('Usuário:', data.user.name);
      console.log('Role:', data.user.role);
      return true;
    } else {
      const error = await response.text();
      console.log('ERRO:', error);
      return false;
    }
  } catch (error) {
    console.log('ERRO DE CONEXÃO:', error.message);
    return false;
  }
}

// Menu interativo
const args = process.argv.slice(2);
const command = args[0];

if (command === 'quick' && args[1] && args[2]) {
  quickTest(args[1], args[2]);
} else if (command === 'debug' || !command) {
  debugLogin();
} else {
  console.log('Uso: node scripts/debug-login.js [debug|quick]');
  console.log('debug: Debug completo (padrão)');
  console.log('quick: Teste rápido - node scripts/debug-login.js quick email senha');
}
