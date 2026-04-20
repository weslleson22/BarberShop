// Script simples para verificar se os testes podem ser executados
const { execSync } = require('child_process');

try {
  console.log('Testando se vitest está instalado...');
  const result = execSync('npx vitest --version', { encoding: 'utf8' });
  console.log('Vitest version:', result.trim());
  
  console.log('\nExecutando um teste simples...');
  const testResult = execSync('npx vitest run tests/unit/appointment-utils.test.ts --reporter=verbose', { 
    encoding: 'utf8',
    stdio: 'pipe'
  });
  console.log('Testes executados com sucesso!');
  
} catch (error) {
  console.error('Erro ao executar testes:', error.message);
  if (error.stdout) console.log('STDOUT:', error.stdout);
  if (error.stderr) console.log('STDERR:', error.stderr);
}
