// Script para testar login diretamente
// Execute com: node scripts/test-login.js

async function testLogin() {
  console.log('=== TESTANDO LOGIN DIRETO ===');
  
  try {
    // 1. Verificar se servidor está rodando
    console.log('\n1. VERIFICANDO SERVIDOR');
    const homeResponse = await fetch('http://localhost:3000');
    if (homeResponse.ok) {
      console.log('Servidor está rodando');
    } else {
      console.log('Servidor não está respondendo');
      return;
    }
    
    // 2. Testar API de login
    console.log('\n2. TESTANDO API DE LOGIN');
    const loginData = {
      email: 'admin@barberiacentral.com',
      password: 'admin123'
    };
    
    console.log('Enviando:', loginData);
    
    const loginResponse = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(loginData),
    });
    
    console.log('Status:', loginResponse.status);
    console.log('Headers:', Object.fromEntries(loginResponse.headers.entries()));
    
    if (loginResponse.ok) {
      const data = await loginResponse.json();
      console.log('\n=== LOGIN BEM-SUCEDIDO ===');
      console.log('Usuário:', data.user.name);
      console.log('Email:', data.user.email);
      console.log('Role:', data.user.role);
      console.log('Token:', data.token.substring(0, 50) + '...');
      
      // Verificar cookie
      const setCookie = loginResponse.headers.get('set-cookie');
      console.log('Cookie definido:', setCookie ? 'SIM' : 'NÃO');
      if (setCookie) {
        console.log('Cookie:', setCookie);
      }
      
    } else {
      const error = await loginResponse.text();
      console.log('\n=== ERRO NO LOGIN ===');
      console.log('Status:', loginResponse.status);
      console.log('Erro:', error);
      
      // Tentar diagnosticar
      if (loginResponse.status === 401) {
        console.log('\nDIAGNÓSTICO: Credenciais inválidas');
        console.log('Verifique se os usuários existem no banco');
        
        // Verificar usuários no banco
        console.log('\n3. VERIFICANDO USUÁRIOS NO BANCO');
        const usersResponse = await fetch('http://localhost:3000/api/users');
        if (usersResponse.ok) {
          const users = await usersResponse.json();
          console.log('Usuários encontrados:', users.length);
          users.forEach(user => {
            console.log(`- ${user.name} (${user.email}) - ${user.role}`);
          });
        }
      } else if (loginResponse.status === 500) {
        console.log('\nDIAGNÓSTICO: Erro interno do servidor');
        console.log('Verifique os logs do servidor');
      }
    }
    
  } catch (error) {
    console.error('ERRO DE CONEXÃO:', error.message);
    console.log('Certifique-se de que o servidor está rodando em http://localhost:3000');
  }
}

// Testar diferentes usuários
async function testAllUsers() {
  console.log('=== TESTANDO TODOS OS USUÁRIOS ===');
  
  const users = [
    { email: 'admin@barberiacentral.com', password: 'admin123', role: 'ADMIN' },
    { email: 'joao@barberiacentral.com', password: 'barber123', role: 'BARBER' },
    { email: 'cliente@barberiacentral.com', password: 'client123', role: 'CLIENT' }
  ];
  
  for (const user of users) {
    console.log(`\nTestando ${user.role}: ${user.email}`);
    
    try {
      const response = await fetch('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: user.email,
          password: user.password
        }),
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log(`  SUCESSO: ${data.user.name}`);
      } else {
        const error = await response.text();
        console.log(`  ERRO (${response.status}): ${error}`);
      }
    } catch (error) {
      console.log(`  ERRO DE CONEXÃO: ${error.message}`);
    }
  }
}

// Menu interativo
const args = process.argv.slice(2);
const command = args[0];

if (command === 'all') {
  testAllUsers();
} else if (command === 'test' || !command) {
  testLogin();
} else {
  console.log('Uso: node scripts/test-login.js [test|all]');
  console.log('test: Testa login com admin (padrão)');
  console.log('all: Testa login com todos os usuários');
}
