// Script para testar login do usuário admin especificamente
// Execute com: node scripts/test-admin-login.js

async function testAdminLogin() {
  console.log('=== TESTANDO LOGIN DO USUÁRIO ADMIN ===');
  
  try {
    // 1. Testar login com admin
    console.log('\n1. TESTANDO LOGIN ADMIN');
    const adminResponse = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'admin@barberiacentral.com',
        password: 'admin123'
      }),
    });
    
    console.log('Status:', adminResponse.status);
    
    if (adminResponse.ok) {
      const adminData = await adminResponse.json();
      console.log('Login ADMIN bem-sucedido!');
      console.log('Usuário:', adminData.user.name);
      console.log('Role:', adminData.user.role);
      console.log('Email:', adminData.user.email);
      console.log('Token:', adminData.token.substring(0, 30) + '...');
      
      // Verificar cookie
      const setCookie = adminResponse.headers.get('set-cookie');
      console.log('Cookie definido:', setCookie ? 'SIM' : 'NÃO');
      
      // 2. Testar acesso ao dashboard com admin
      console.log('\n2. TESTANDO ACESSO AO DASHBOARD COM ADMIN');
      const dashboardResponse = await fetch('http://localhost:3000/dashboard/dashboard', {
        headers: {
          'Cookie': setCookie || ''
        },
        redirect: 'manual'
      });
      
      if (dashboardResponse.ok) {
        console.log('Dashboard acessível com ADMIN');
      } else if (dashboardResponse.status === 302) {
        console.log('Dashboard redirecionando (pode ser normal)');
        const location = dashboardResponse.headers.get('location');
        console.log('Redirecionado para:', location);
      } else {
        console.log('ERRO no dashboard:', dashboardResponse.status);
      }
      
      // 3. Testar acesso a serviços com admin
      console.log('\n3. TESTANDO ACESSO A SERVIÇOS COM ADMIN');
      const servicosResponse = await fetch('http://localhost:3000/servicos', {
        headers: {
          'Cookie': setCookie || ''
        },
        redirect: 'manual'
      });
      
      if (servicosResponse.ok) {
        console.log('Serviços acessível com ADMIN');
      } else if (servicosResponse.status === 302) {
        console.log('Serviços redirecionando');
        const location = servicosResponse.headers.get('location');
        console.log('Redirecionado para:', location);
      } else {
        console.log('ERRO em serviços:', servicosResponse.status);
      }
      
      // 4. Testar redirecionamento com parâmetro
      console.log('\n4. TESTANDO REDIRECIONAMENTO COM PARÂMETRO');
      const redirectUrl = 'http://localhost:3000/login?redirect=%2Fservicos';
      console.log('URL de teste:', redirectUrl);
      console.log('Esta URL deve redirecionar para /servicos após login do admin');
      
    } else {
      const error = await adminResponse.text();
      console.log('ERRO NO LOGIN ADMIN:', adminResponse.status);
      console.log('Detalhes:', error);
    }
    
    // 5. Comparar com login barber
    console.log('\n5. COMPARANDO COM LOGIN BARBER');
    const barberResponse = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'joao@barberiacentral.com',
        password: 'barber123'
      }),
    });
    
    if (barberResponse.ok) {
      const barberData = await barberResponse.json();
      console.log('Login BARBER bem-sucedido!');
      console.log('Usuário:', barberData.user.name);
      console.log('Role:', barberData.user.role);
      console.log('Email:', barberData.user.email);
    } else {
      console.log('ERRO NO LOGIN BARBER:', barberResponse.status);
    }
    
  } catch (error) {
    console.error('ERRO DE CONEXÃO:', error.message);
  }
}

// Verificar usuários no banco
async function checkUsers() {
  console.log('\n=== VERIFICANDO USUÁRIOS NO BANCO ===');
  
  try {
    const response = await fetch('http://localhost:3000/api/users');
    
    if (response.ok) {
      const users = await response.json();
      console.log('Usuários encontrados:', users.length);
      
      users.forEach(user => {
        console.log(`- ${user.name} (${user.email})`);
        console.log(`  Role: ${user.role}`);
        console.log(`  Ativo: ${user.isActive}`);
        console.log(`  Barbearia: ${user.barbershopId}`);
        console.log('');
      });
      
      // Verificar se admin existe
      const adminUser = users.find(u => u.email === 'admin@barberiacentral.com');
      if (adminUser) {
        console.log('USUÁRIO ADMIN ENCONTRADO:', adminUser.name);
      } else {
        console.log('USUÁRIO ADMIN NÃO ENCONTRADO NO BANCO!');
      }
      
    } else {
      console.log('ERRO AO BUSCAR USUÁRIOS:', response.status);
    }
  } catch (error) {
    console.error('ERRO DE CONEXÃO:', error.message);
  }
}

// Menu interativo
const args = process.argv.slice(2);
const command = args[0];

if (command === 'users') {
  checkUsers();
} else if (command === 'login' || !command) {
  testAdminLogin();
} else {
  console.log('Uso: node scripts/test-admin-login.js [login|users]');
  console.log('login: Testa login admin (padrão)');
  console.log('users: Verifica usuários no banco');
}
