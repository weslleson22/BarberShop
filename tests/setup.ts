import { vi } from 'vitest'

// Setup global para TODOS os testes (unit + integration). Não deve conter
// nenhum código que toque um banco de dados real — testes de integração que
// precisam de banco importam '../integration-setup' explicitamente, que tem
// sua própria trava de segurança (DATABASE_URL_TEST obrigatória e diferente
// de DATABASE_URL) antes de rodar qualquer operação destrutiva.

// Mocks globais
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    forward: vi.fn()
  }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/'
}))

// Mock de autenticação
vi.mock('@/lib/auth-context', () => ({
  useAuth: () => ({
    user: null,
    login: vi.fn(),
    logout: vi.fn(),
    loading: false
  })
}))
