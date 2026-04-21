import { chromium, FullConfig } from '@playwright/test'

/**
 * Setup global para testes E2E
 * Prepara o ambiente antes de executar os testes
 */
async function globalSetup(config: FullConfig) {
  console.log('=== SETUP GLOBAL E2E ===')
  console.log('Preparando ambiente para testes end-to-end...')
  
  // Iniciar navegador para setup inicial
  const browser = await chromium.launch()
  const context = await browser.newContext()
  const page = await context.newPage()
  
  try {
    // Verificar se a aplicação está disponível
    console.log('Verificando disponibilidade da aplicação...')
    await page.goto('http://localhost:3000')
    
    // Aguardar a página carregar
    await page.waitForLoadState('networkidle')
    
    // Verificar se a página principal está funcionando
    const title = await page.title()
    console.log(`Página carregada: ${title}`)
    
    // Verificar se não há erros críticos
    const hasErrors = await page.locator('body').textContent().then(text => 
      text?.includes('Application error') || text?.includes('500') || false
    )
    
    if (hasErrors) {
      throw new Error('Aplicação apresenta erros críticos')
    }
    
    console.log('Aplicação está disponível e funcionando')
    
  } catch (error) {
    console.error('Erro no setup global:', error)
    throw error
  } finally {
    // Fechar recursos
    await context.close()
    await browser.close()
  }
  
  console.log('Setup global concluído com sucesso')
  console.log('Ambiente pronto para testes E2E')
}

export default globalSetup
