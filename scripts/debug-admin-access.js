// Script para debugar acesso do usuário admin
// Execute com: node scripts/debug-admin-access.js

async function debugAdminAccess() {
  console.log('=== DEBUG DE ACESSO ADMIN ===');
  
  try {
    // 1. Verificar se usuário admin existe no banco
    console.log('\n1. VERIFICANDO USUÁRIO ADMIN NO BANCO');
    const usersResponse = await fetch('http://localhost:3000/api/users');
    
    if (!usersResponse.ok) {
      console.log('ERRO: Não foi possível buscar usuários');
      return;
    }
    
    const users = await usersResponse.json();
    const adminUser = users.find(u => u.email === 'admin@barberiacentral.com');
    
    if (!adminUser) {
      console.log('ERRO: Usuário admin não encontrado no banco!');
      console.log('Usuários encontrados:', users.map(u => `${u.name} (${u.email}) - ${u.role}`));
      return;
    }
    
    console.log('USUÁRIO ADMIN ENCONTRADO:');
    console.log('  Nome:', adminUser.name);
    console.log('  Email:', adminUser.email);
    console.log('  Role:', adminUser.role);
    console.log('  Ativo:', adminUser.isActive);
    console.log('  Barbearia ID:', adminUser.barbershopId);
    
    // 2. Tentar login com admin
    console.log('\n2. TENTANDO LOGIN COM ADMIN');
    const loginResponse = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'admin@barberiacentral.com',
        password: 'admin123'
      }),
    });
    
    console.log('Status do login:', loginResponse.status);
    
    if (!loginResponse.ok) {
      const error = await loginResponse.text();
      console.log('ERRO NO LOGIN:', error);
      return;
    }
    
    const loginData = await loginResponse.json();
    console.log('LOGIN BEM-SUCEDIDO!');
    console.log('  Usuário logado:', loginData.user.name);
    console.log('  Role logado:', loginData.user.role);
    console.log('  Token gerado:', loginData.token.substring(0, 30) + '...');
    
    // Extrair cookie
    const setCookie = loginResponse.headers.get('set-cookie');
    console.log('Cookie definido:', setCookie ? 'SIM' : 'NÃO');
    
    if (!setCookie) {
      console.log('ERRO: Cookie não foi definido!');
      return;
    }
    
    // 3. Testar acesso a serviços
    console.log('\n3. TESTANDO ACESSO A /servicos');
    const servicosResponse = await fetch('http://localhost:3000/servicos', {
      headers: {
        'Cookie': setCookie
      },
      redirect: 'manual'
    });
    
    console.log('Status /servicos:', servicosResponse.status);
    
    if (servicosResponse.ok) {
      console.log('SUCESSO: /servicos acessível');
    } else if (servicosResponse.status === 302) {
      const location = servicosResponse.headers.get('location');
      console.log('REDIRECIONADO para:', location);
      console.log('ISSO PODE INDICAR PROBLEMA DE PERMISSÃO');
    } else {
      console.log('ERRO:', servicosResponse.status);
      const error = await servicosResponse.text();
      console.log('Detalhes:', error);
    }
    
    // 4. Testar acesso a usuários
    console.log('\n4. TESTANDO ACESSO A /usuarios');
    const usuariosResponse = await fetch('http://localhost:3000/usuarios', {
      headers: {
        'Cookie': setCookie
      },
      redirect: 'manual'
    });
    
    console.log('Status /usuarios:', usuariosResponse.status);
    
    if (usuariosResponse.ok) {
      console.log('SUCESSO: /usuarios acessível');
    } else if (usuariosResponse.status === 302) {
      const location = usuariosResponse.headers.get('location');
      console.log('REDIRECIONADO para:', location);
      console.log('ISSO PODE INDICAR PROBLEMA DE PERMISSÃO');
    } else {
      console.log('ERRO:', usuariosResponse.status);
      const error = await usuariosResponse.text();
      console.log('Detalhes:', error);
    }
    
    // 5. Testar acesso direto via URL com redirect
    console.log('\n5. TESTANDO REDIRECIONAMENTO COM PARÂMETRO');
    const redirectUrl = 'http://localhost:3000/login?redirect=%2Fservicos';
    console.log('URL de teste:', redirectUrl);
    console.log('Esta URL deve:');
    console.log('1. Mostrar página de login');
    console.log('2. Após login, redirecionar para /servicos');
    console.log('3. /servicos deve ser acessível para admin');
    
    // 6. Verificar se o problema está na página de serviços
    console.log('\n6. VERIFICANDO SE O PROBLEMA ESTÁ NA PÁGINA');
    console.log('Possíveis causas:');
    console.log('1. Página /servicos tem verificação de permissão incorreta');
    console.log('2. Middleware está bloqueando acesso');
    console.log('3. Contexto de autenticação não está funcionando');
    console.log('4. Cookie não está sendo enviado corretamente');
    
    console.log('\n=== RECOMENDAÇÕES ===');
    console.log('1. Verifique logs no console do navegador (F12)');
    console.log('2. Verifique se o usuário está realmente logado como ADMIN');
    console.log('3. Verifique se a navegação mostra o item "Serviços" no menu');
    console.log('4. Teste acessar /servicos diretamente após login');
    
  } catch (error) {
    console.error('ERRO DE CONEXÃO:', error.message);
    console.log('Certifique-se de que o servidor está rodando em http://localhost:3000');
  }
}

// Testar login de outros usuários para comparação
async function compareUsers() {
  console.log('\n=== COMPARANDO LOGIN DE USUÁRIOS ===');
  
  const testUsers = [
    { email: 'admin@barberiacentral.com', password: 'admin123', role: 'ADMIN' },
    { email: 'joao@barberiacentral.com', password: 'barber123', role: 'BARBER' },
    { email: 'cliente@barberiacentral.com', password: 'client123', role: 'CLIENT' }
  ];
  
  for (const testUser of testUsers) {
    console.log(`\n--- Testando ${testUser.role}: ${testUser.email} ---`);
    
    try {
      const response = await fetch('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: testUser.email,
          password: testUser.password
        }),
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log(`SUCESSO: ${data.user.name} - Role: ${data.user.role}`);
        
        // Testar acesso a serviços
        const setCookie = response.headers.get('set-cookie');
        if (setCookie) {
          const servicosResponse = await fetch('http://localhost:3000/servicos', {
            headers: { 'Cookie': setCookie },
            redirect: 'manual'
          });
          
          console.log(`Acesso /servicos: ${servicosResponse.ok ? 'PERMITIDO' : 'BLOQUEADO'}`);
        }
      } else {
        console.log(`ERRO NO LOGIN: ${response.status}`);
      }
    } catch (error) {
      console.log(`ERRO DE CONEXÃO: ${error.message}`);
    }
  }
}

// Menu interativo
const args = process.argv.slice(2);
const command = args[0];

if (command === 'compare') {
  compareUsers();
} else if (command === 'debug' || !command) {
  debugAdminAccess();
} else {
  console.log('Uso: node scripts/debug-admin-access.js [debug|compare]');
  console.log('debug: Debug completo do admin (padrão)');
  console.log('compare: Compara login de todos os usuários');
}
