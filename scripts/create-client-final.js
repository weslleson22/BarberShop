// Script final para criar usuário CLIENT usando API com barbershopId
// Execute com: node scripts/create-client-final.js

async function createClientUser() {
  console.log('=== CRIANDO USUÁRIO CLIENT ===');
  
  try {
    // Primeiro, obter a barbershop existente
    console.log('1. Obtendo barbershop existente...');
    const barbershopsResponse = await fetch('http://localhost:3000/api/barbershops');
    
    if (!barbershopsResponse.ok) {
      console.log('ERRO: Não foi possível obter barbearias');
      return;
    }
    
    const barbershops = await barbershopsResponse.json();
    console.log('Barbearias encontradas:', barbershops.length);
    
    if (barbershops.length === 0) {
      console.log('ERRO: Nenhuma barbearia encontrada');
      return;
    }
    
    const barbershopId = barbershops[0].id;
    console.log('Usando barbearia ID:', barbershopId);
    
    // Criar usuário CLIENT com barbershopId
    const clientData = {
      name: 'Maria Cliente',
      email: 'maria@barberiacentral.com',
      password: 'client123',
      role: 'CLIENT',
      phone: '11987654321',
      barbershopId: barbershopId
    };
    
    console.log('2. Enviando dados para API de registro...');
    const response = await fetch('http://localhost:3000/api/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(clientData)
    });
    
    console.log('Status:', response.status);
    
    if (response.ok) {
      const result = await response.json();
      console.log('SUCCESS: Usuário CLIENT criado');
      console.log('Nome:', result.user?.name);
      console.log('Email:', result.user?.email);
      console.log('Role:', result.user?.role);
      console.log('ID:', result.user?.id);
      console.log('Barbershop ID:', result.user?.barbershopId);
    } else {
      const error = await response.text();
      console.log('ERRO:', error);
      
      // Se falhar, verificar se usuário já existe
      if (error.includes('já existe') || error.includes('exists')) {
        console.log('Usuário CLIENT já existe no sistema');
      }
    }
    
  } catch (error) {
    console.error('Erro:', error.message);
  }
}

createClientUser();
