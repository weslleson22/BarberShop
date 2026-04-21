import { FullConfig } from '@playwright/test'

/**
 * Teardown global para testes E2E
 * Limpa o ambiente após executar os testes
 */
async function globalTeardown(config: FullConfig) {
  console.log('=== TEARDOWN GLOBAL E2E ===')
  console.log('Limpando ambiente após testes end-to-end...')
  
  try {
    // Aqui poderíamos adicionar limpeza de dados de teste
    // como limpar banco de dados de testes, remover arquivos temporários, etc.
    
    // Exemplo: Limpar cookies e localStorage (se necessário)
    // Isso geralmente é feito por cada teste individualmente
    
    // Limpar arquivos de relatório temporários se necessário
    // Isso é gerenciado automaticamente pelo Playwright
    
    console.log('Teardown global concluído com sucesso')
    console.log('Ambiente limpo após testes E2E')
    
  } catch (error) {
    console.error('Erro no teardown global:', error)
    // Não lançar erro para não afetar o resultado dos testes
  }
}

export default globalTeardown
