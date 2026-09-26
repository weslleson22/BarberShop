import { defineConfig } from 'vitest/config'
import { resolve } from 'path'

export default defineConfig({
  test: {
    // Configurações gerais
    globals: true,
    environment: 'node',
    
    // Configurações de cobertura
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'tests/',
        '**/*.d.ts',
        '**/*.config.*',
        'coverage/**'
      ],
      thresholds: {
        global: {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80
        }
      }
    },
    
    // Configurações de execução
    testTimeout: 30000,
    hookTimeout: 30000,
    
    // Arquivos de teste
    include: process.env.DATABASE_URL_TEST
      ? ['tests/unit/**/*.{test.ts,test.tsx}', 'tests/integration/**/*.{test.ts,test.tsx}']
      : ['tests/unit/**/*.{test.ts,test.tsx}'],
    
    // Setup files
    setupFiles: ['tests/setup.ts']
  },
  
  // Resolve de módulos
  resolve: {
    alias: {
      '@': resolve(__dirname, '.'),
      '@/lib': resolve(__dirname, 'lib'),
      '@/app': resolve(__dirname, 'app'),
      '@/components': resolve(__dirname, 'components')
    }
  }
})
