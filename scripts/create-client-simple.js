// Script simples para criar usuário CLIENT usando API existente
// Execute com: node scripts/create-client-simple.js

async function createClientUser() {
  console.log('=== CRIANDO USUÁRIO CLIENT ===');
  
  try {
    // Usar a API de registro existente
    const clientData = {
      name: 'Maria Cliente',
      email: 'maria@barberiacentral.com',
      password: 'client123',
      role: 'CLIENT',
      phone: '11987654321'
    };
    
    console.log('Enviando dados para API de registro...');
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
