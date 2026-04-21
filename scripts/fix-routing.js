// Script para diagnosticar e corrigir problemas de roteamento
// Execute com: node scripts/fix-routing.js

const fs = require('fs');
const path = require('path');

function fixRouting() {
  console.log('=== DIAGNÓSTICO E CORREÇÃO DE ROTEAMENTO ===');
  
  const appDir = path.join(__dirname, '..', 'app');
  
  // 1. Verificar estrutura de pastas
  console.log('\n1. Verificando estrutura de pastas...');
  
  const loginPagePath = path.join(appDir, 'login', 'page.tsx');
  const authLoginPath = path.join(appDir, 'auth', 'login');
  
  console.log('Página login existe:', fs.existsSync(loginPagePath) ? 'SIM' : 'NÃO');
  console.log('Pasta auth/login existe:', fs.existsSync(authLoginPath) ? 'SIM' : 'NÃO');
  
  // 2. Verificar se há conflito de rotas
  if (fs.existsSync(authLoginPath)) {
    console.log('\n2. Conflito detectado: app/auth/login/ existe');
    console.log('Isso pode causar conflito com app/login/page.tsx');
    
    try {
      // Listar conteúdo da pasta auth/login
      const authLoginContent = fs.readdirSync(authLoginPath);
      console.log('Conteúdo de auth/login:', authLoginContent);
      
      if (authLoginContent.length === 0) {
        console.log('Pasta auth/login está vazia - removendo...');
        fs.rmSync(authLoginPath, { recursive: true, force: true });
        console.log('Pasta auth/login removida com sucesso');
      }
    } catch (error) {
      console.error('Erro ao verificar pasta auth/login:', error.message);
    }
  }
  
  // 3. Verificar outras pastas vazias em auth
  console.log('\n3. Verificando outras pastas em auth...');
  const authDir = path.join(appDir, 'auth');
  
  if (fs.existsSync(authDir)) {
    try {
      const authContent = fs.readdirSync(authDir);
      console.log('Conteúdo de auth:', authContent);
      
      authContent.forEach(item => {
        const itemPath = path.join(authDir, item);
        const stat = fs.statSync(itemPath);
        
        if (stat.isDirectory()) {
          try {
            const subContent = fs.readdirSync(itemPath);
            if (subContent.length === 0) {
              console.log(`Removendo pasta vazia: auth/${item}`);
              fs.rmSync(itemPath, { recursive: true, force: true });
            }
          } catch (error) {
            console.error(`Erro ao verificar auth/${item}:`, error.message);
          }
        }
      });
    } catch (error) {
      console.error('Erro ao verificar pasta auth:', error.message);
    }
  }
  
  // 4. Verificar página de login
  console.log('\n4. Verificando página de login...');
  if (fs.existsSync(loginPagePath)) {
    try {
      const loginContent = fs.readFileSync(loginPagePath, 'utf8');
      console.log('Página login tem conteúdo:', loginContent.length > 0 ? 'SIM' : 'NÃO');
      console.log('Primeiras linhas:', loginContent.split('\n').slice(0, 3).join('\n'));
    } catch (error) {
      console.error('Erro ao ler página login:', error.message);
    }
  }
  
  // 5. Verificar se há .next (cache)
  console.log('\n5. Verificando cache do Next.js...');
  const nextDir = path.join(__dirname, '..', '.next');
  if (fs.existsSync(nextDir)) {
    console.log('Pasta .next encontrada - pode conter cache corrompido');
    console.log('Recomendação: Execute "npm run dev" para reconstruir');
  }
  
  console.log('\n=== DIAGNÓSTICO CONCLUÍDO ===');
  console.log('\nPróximos passos recomendados:');
  console.log('1. Reinicie o servidor Next.js (Ctrl+C + npm run dev)');
  console.log('2. Se persistir, delete a pasta .next e reinicie');
  console.log('3. Acesse http://localhost:3000/login para testar');
}

fixRouting();
