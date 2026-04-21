// Script para popular o banco de dados em ambiente de deploy
// Execute com: node scripts/deploy-seed.js

async function deploySeed() {
  try {
    console.log('=== ENVIANDO REQUISIÇÃO PARA SEED EM PRODUÇÃO ===');
    
    // Detectar ambiente automaticamente
    const baseUrl = process.env.DEPLOY_URL || 'http://localhost:3000';
    console.log('Base URL:', baseUrl);
    
    const response = await fetch(`${baseUrl}/api/seed`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('=== SEED REALIZADO COM SUCESSO ===');
      console.log('\nDados criados:');
      console.log('Barbearia:', data.data.barbershop);
      console.log('\nUsuários para teste:');
      console.log('ADMIN:', data.data.users.admin);
      console.log('BARBER:', data.data.users.barber);
      console.log('CLIENT:', data.data.users.client);
      console.log('\nQuantidades:');
      console.log('Clientes:', data.data.clients);
      console.log('Serviços:', data.data.services);
      console.log('Agendamentos:', data.data.appointments);
      
      console.log('\n=== USE ESSES DADOS PARA LOGIN ===');
      console.log('1. Admin: admin@barberiacentral.com / admin123');
      console.log('2. Barbeiro: joao@barberiacentral.com / barber123');
      console.log('3. Cliente: cliente@barberiacentral.com / client123');
      
    } else {
      const errorText = await response.text();
      console.error('ERRO NO SEED:', response.status, response.statusText);
      console.error('Resposta:', errorText);
      
      // Tentar diagnóstico
      if (response.status === 500) {
        console.log('\n=== DIAGNÓSTICO DE ERRO 500 ===');
        console.log('Possíveis causas:');
        console.log('1. DATABASE_URL não configurada');
        console.log('2. Prisma Client não gerado');
        console.log('3. Permissões no banco de dados');
        console.log('4. Variáveis de ambiente ausentes');
        
        console.log('\n=== SOLUÇÕES ===');
        console.log('1. Verificar .env com DATABASE_URL');
        console.log('2. Executar: npx prisma generate');
        console.log('3. Executar: npx prisma db push');
        console.log('4. Verificar se o banco está acessível');
      }
    }
  } catch (error) {
    console.error('ERRO DE CONEXÃO:', error.message);
    console.log('\n=== SOLUÇÕES DE CONEXÃO ===');
    console.log('1. Verificar se o servidor está rodando');
    console.log('2. Verificar URL de deploy');
    console.log('3. Verificar firewall/rede');
    console.log('4. Usar DEPLOY_URL=http://seu-domínio.com node scripts/deploy-seed.js');
  }
}

// Verificar configurações de ambiente
async function checkEnvironment() {
  console.log('=== VERIFICANDO AMBIENTE ===');
  
  const requiredEnvVars = [
    'DATABASE_URL',
    'JWT_SECRET',
    'NODE_ENV'
  ];
  
  const missing = requiredEnvVars.filter(varName => !process.env[varName]);
  
  if (missing.length > 0) {
    console.log('Variáveis ausentes:', missing);
    console.log('\n=== CONFIGURAÇÃO NECESSÁRIA ===');
    console.log('No arquivo .env:');
    requiredEnvVars.forEach(varName => {
      console.log(`${varName}=seu_valor_aqui`);
    });
    return false;
  }
  
  console.log('Variáveis de ambiente OK');
  return true;
}

// Menu interativo
const args = process.argv.slice(2);
const command = args[0];

if (command === 'check') {
  checkEnvironment();
} else if (command === 'seed' || !command) {
  checkEnvironment().then(isOk => {
    if (isOk) {
      deploySeed();
    } else {
      console.log('Configure as variáveis de ambiente primeiro');
    }
  });
} else {
  console.log('Uso: node scripts/deploy-seed.js [seed|check]');
  console.log('seed: Popula o banco em produção (padrão)');
  console.log('check: Verifica configurações de ambiente');
}
