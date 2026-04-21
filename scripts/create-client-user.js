// Script para criar usuário CLIENT via API
// Execute com: node scripts/create-client-user.js

const bcrypt = require('bcrypt');

async function createClientUser() {
  console.log('=== CRIANDO USUÁRIO CLIENT ===');
  
  try {
    // Senha hash
    const hashedPassword = await bcrypt.hash('client123', 12);
    console.log('Senha hash criada');
    
    // Criar usuário CLIENT
    const clientData = {
      name: 'Maria Cliente',
      email: 'maria@barberiacentral.com',
      password: hashedPassword,
      role: 'CLIENT',
      phone: '11987654321'
    };
    
    console.log('Enviando dados para API...');
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
    } else {
      const error = await response.text();
      console.log('ERRO:', error);
      
      // Se API não funcionar, criar diretamente no banco
      console.log('\nTentando criar diretamente no banco...');
      await createClientDirectly();
    }
    
  } catch (error) {
    console.error('Erro:', error.message);
    console.log('Tentando criar diretamente no banco...');
    await createClientDirectly();
  }
}

async function createClientDirectly() {
  try {
    // Importar Prisma
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    
    // Verificar se usuário já existe
    const existingUser = await prisma.user.findUnique({
      where: { email: 'maria@barberiacentral.com' }
    });
    
    if (existingUser) {
      console.log('Usuário CLIENT já existe');
      return;
    }
    
    // Hash da senha
    const hashedPassword = await bcrypt.hash('client123', 12);
    
    // Criar usuário
    const client = await prisma.user.create({
      data: {
        name: 'Maria Cliente',
        email: 'maria@barberiacentral.com',
        password: hashedPassword,
        role: 'CLIENT',
        phone: '11987654321',
        isActive: true
      }
    });
    
    console.log('SUCCESS: Usuário CLIENT criado diretamente');
    console.log('ID:', client.id);
    console.log('Nome:', client.name);
    console.log('Email:', client.email);
    console.log('Role:', client.role);
    
    await prisma.$disconnect();
    
  } catch (error) {
    console.error('Erro ao criar diretamente:', error.message);
  }
}

createClientUser();
