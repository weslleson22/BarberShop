import { defineConfig, devices } from '@playwright/test'

/**
 * Configuração do Playwright para testes E2E
 * Ambiente: SaaS Multi-tenant de Barbearias
 */
export default defineConfig({
  testDir: './tests/e2e',
  
  // Timeout global para testes
  timeout: 30000,
  
  // Timeout para expectativas
  expect: {
    timeout: 5000
  },
  
  // Configurações de retry para testes instáveis
  retries: process.env.CI ? 2 : 0,
  
  // Paralelização
  workers: process.env.CI ? 1 : undefined,
  
  // Reporter para resultados
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['json', { outputFile: 'test-results.json' }],
    ['junit', { outputFile: 'test-results.xml' }]
  ],
  
  // Configurações globais
  use: {
    // Base URL para testes
    baseURL: 'http://localhost:3000',
    
    // Coletar traces quando o teste falha
    trace: 'on-first-retry',
    
    // Capturar screenshots em caso de falha
    screenshot: 'only-on-failure',
    
    // Gravar vídeo em caso de falha
    video: 'retain-on-failure',
    
    // Navegador padrão
    browserName: 'chromium',
    
    // Viewport padrão
    viewport: { width: 1280, height: 720 },
    
    // Ignorar erros de HTTPS em desenvolvimento
    ignoreHTTPSErrors: true
  },
  
  // Projetos para diferentes ambientes
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    
    // Testes Mobile
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
    },
    
    // Testes Tablet
    {
      name: 'iPad',
      use: { ...devices['iPad Pro'] },
    }
  ],
  
  // Servidor web para testes
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
  
  // Configurações de output
  outputDir: 'test-results/',
  
  // Configurações de setup global
  globalSetup: './tests/e2e/global-setup.ts',
  
  // Configurações de teardown global
  globalTeardown: './tests/e2e/global-teardown.ts',
})
