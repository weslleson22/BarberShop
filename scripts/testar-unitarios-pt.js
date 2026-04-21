// Script para executar testes unitários e mostrar logs em português
// Execute com: node scripts/testar-unitarios-pt.js

const { spawn } = require('child_process');
const path = require('path');

console.log('=== EXECUTANDO TESTES UNITÁRIOS ===');
console.log('Verificando se as correções resolveram os problemas...\n');

// Executar testes unitários
const testProcess = spawn('npm', ['run', 'test:unit'], {
  cwd: path.resolve(__dirname, '..'),
  stdio: 'inherit',
  shell: true
});

testProcess.on('close', (code) => {
  console.log('\n=== RESULTADO DOS TESTES ===');
  
  if (code === 0) {
    console.log('SUCESSO: Todos os testes passaram!');
    console.log('As correções de timezone e validação funcionaram corretamente.');
  } else {
    console.log('ERRO: Alguns testes ainda estão falhando.');
    console.log('Código de saída:', code);
    console.log('\n=== ANÁLISE DOS PROBLEMAS ===');
    
    if (code === 1) {
      console.log('Possíveis causas:');
      console.log('1. Problema de timezone ainda persiste');
      console.log('2. Validação de horário não foi corrigida completamente');
      console.log('3. Erro de importação ou tipagem nos testes');
      console.log('4. Problema com banco de dados de testes');
    }
    
    console.log('\n=== PRÓXIMOS PASSOS ===');
    console.log('1. Verificar os logs de erro acima');
    console.log('2. Identificar qual teste específico está falhando');
    console.log('3. Analisar a mensagem de erro em detalhes');
    console.log('4. Corrigir a causa raiz do problema');
  }
  
  console.log('\n=== RESUMO DAS CORREÇÕES APLICADAS ===');
  console.log('1. calculateAvailableSlots:');
  console.log('   - Corrigido problema de timezone');
  console.log('   - Datas criadas com new Date(year, month, day, hour, minute, 0, 0)');
  console.log('   - Conflitos agora detectados corretamente');
  
  console.log('\n2. validateAppointmentTime:');
  console.log('   - Adicionada validação para serviços que terminam exatamente no fechamento');
  console.log('   - Serviço das 16:30-18:00 agora é rejeitado');
  console.log('   - Mensagem de erro: "Serviço ultrapassa o horário de funcionamento"');
  
  console.log('\n3. Estrutura dos Testes:');
  console.log('   - Import corrigido para "../../lib/appointment-utils"');
  console.log('   - Tipagem explícita para arrays: Appointment[]');
  console.log('   - Import do vi adicionado');
  
  console.log('\n=== COMO VERIFICAR MANUALMENTE ===');
  console.log('1. Execute: npm run test:unit');
  console.log('2. Procure por "FAIL" ou "×" nos resultados');
  console.log('3. Verifique as mensagens de AssertionError');
  console.log('4. Compare com os valores esperados vs recebidos');
});

testProcess.on('error', (error) => {
  console.error('ERRO AO EXECUTAR TESTES:', error.message);
  console.error('Verifique se o npm está instalado e se você está no diretório correto');
});
