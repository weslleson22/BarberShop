# Suíte de Testes Automatizados - Barbershop Scheduler

## Overview

Este documento descreve a suíte completa de testes automatizados implementada para garantir a qualidade, segurança e confiabilidade do sistema SaaS de gestão de barbearias.

## Stack de Testes

- **Unitários**: Vitest + TypeScript
- **Integração**: Vitest + Prisma + PostgreSQL
- **E2E**: Playwright + Navegadores Reais
- **Coverage**: v8 (integrado ao Vitest)

## Estrutura de Testes

```
tests/
unit/                    # Testes unitários
  appointment-utils.test.ts
  rbac.test.ts
  validation.test.ts
integration/             # Testes de integração
  appointments.test.ts
  multi-tenant.test.ts
  auth.test.ts
e2e/                     # Testes end-to-end
  customer-journey.spec.ts
  admin-workflow.spec.ts
  security.spec.ts
fixtures/                # Dados de teste
  users.ts
  services.ts
  appointments.ts
mocks/                   # Mocks e stubs
  api.mock.ts
  auth.mock.ts
```

## Tipos de Testes

### 1. Testes Unitários

Funções puras e regras de negócio críticas:

#### Agendamento (CRÍTICO)
- Permitir horário livre
- Bloquear conflito direto
- Bloquear sobreposição parcial
- Bloquear agendamento dentro de outro
- Permitir horários antes e depois

#### Duração do Serviço
- Validar cálculo correto de intervalos
- Respeitar duração configurada

#### RBAC (Controle de Acesso)
- CLIENT não acessa rotas de admin
- BARBER acesso limitado
- ADMIN acesso total

### 2. Testes de Integração

Validação com banco de dados real:

#### Multi-tenant (OBRIGATÓRIO)
- Um usuário não pode acessar dados de outra barbearia
- Queries sempre filtram por barbershopId
- Isolamento completo entre tenants

#### Persistência de Dados
- Criar agendamento válido no banco
- Bloquear agendamento com conflito
- Relacionamentos completos
- Integridade referencial

### 3. Testes E2E (End-to-End)

Simulação de fluxos reais com usuários:

#### Cliente
- Acessar sistema
- Agendar horário completo
- Confirmar agendamento
- Visualizar histórico
- Cancelar agendamento

#### Barbeiro/Admin
- Login e autenticação
- Visualizar agenda completa
- Criar agendamento manual
- Atualizar status
- Visualizar métricas

#### Cenários de Erro
- Tentar agendar horário ocupado
- Acesso não autorizado
- Validação de formulários

### 4. Testes de Segurança

- Bloquear acesso a rotas sem autenticação
- Garantir isolamento entre tenants
- Validar inputs e prevenir XSS
- Testar rate limiting

### 5. Testes de Regressão

- Garantir que alterações não quebrem:
  - Regras de agendamento
  - Controle de acesso
  - Consultas principais
  - Multi-tenant

## Configuração do Ambiente

### Pré-requisitos

```bash
# Instalar dependências de desenvolvimento
npm install --save-dev vitest @vitest/ui playwright @playwright/test

# Instalar browsers para E2E
npx playwright install
```

### Variáveis de Ambiente

```bash
# .env.test
DATABASE_URL="postgresql://user:password@localhost:5432/barbershop_test"
NODE_ENV="test"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="test-secret"
```

### Banco de Testes

```bash
# Criar banco de testes separado
createdb barbershop_test

# Aplicar migrations
npx prisma migrate deploy

# Gerar client
npx prisma generate
```

## Execução dos Testes

### Testes Unitários

```bash
# Executar todos os testes unitários
npm run test:unit

# Executar em modo watch
npm run test:watch

# Executar com coverage
npm run test:coverage
```

### Testes de Integração

```bash
# Executar todos os testes de integração
npm run test:integration

# Executar testes específicos
npx vitest run tests/integration/appointments.test.ts
```

### Testes E2E

```bash
# Executar todos os testes E2E
npm run test:e2e

# Executar com interface visual
npm run test:e2e:ui

# Executar em modo debug
npm run test:e2e:debug

# Executar com navegador visível
npm run test:e2e:headed
```

### Todos os Testes

```bash
# Executar suíte completa
npm run test:all
```

## Métricas e Coverage

### Metas de Coverage

- **Branches**: 80%
- **Funções**: 80%
- **Lines**: 80%
- **Statements**: 80%

### Relatórios

- **HTML**: `coverage/index.html`
- **JSON**: `coverage/coverage-final.json`
- **Text**: Console output

## Cenários Críticos Testados

### 1. Conflitos de Agendamento

```typescript
// Testa todos os tipos de conflito
- Mesmo horário exato
- Sobreposição parcial (começa durante)
- Sobreposição parcial (termina durante)
- Agendamento dentro de outro existente
- Horários livres antes e depois
```

### 2. Multi-tenant Isolation

```typescript
// Garante isolamento completo entre barbearias
- Usuários não veem dados de outras barbearias
- Queries sempre filtram por barbershopId
- Validação de acesso cross-tenant
```

### 3. RBAC (Role-Based Access Control)

```typescript
// Controle de acesso por papel
- CLIENT: acesso mínimo (agendar, ver próprios dados)
- BARBER: acesso intermediário (gerenciar agenda, ver clientes)
- ADMIN: acesso total (todas as funcionalidades)
```

### 4. Fluxos de Usuário

```typescript
// Clientes
- Agendamento completo 3 passos
- Visualização e cancelamento
- Histórico de agendamentos

// Administradores
- Login e navegação
- Gestão completa da agenda
- Atualização de status
- Visualização de métricas
```

## Testes de Performance

### Métricas Monitoradas

- Tempo de carregamento das páginas
- Tempo de resposta das APIs
- Performance das queries do Prisma
- Tempo de execução dos testes

### Limites

- Página inicial: < 3 segundos
- APIs: < 500ms
- Queries complexas: < 1 segundo

## Debug e Troubleshooting

### Logs Detalhados

Todos os testes incluem logs detalhados para debug:

```typescript
console.log('=== TESTE DE CONFLITO DE AGENDAMENTO ===')
console.log('Agendamento existente:', existingAppointment)
console.log('Novo agendamento:', newAppointment)
console.log('Conflito detectado:', hasConflict)
```

### Screenshots e Videos

Testes E2E capturam automaticamente:
- Screenshots em caso de falha
- Videos completos dos testes
- Traces detalhadas para debug

## CI/CD Integration

### GitHub Actions

```yaml
name: Test Suite
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run test:unit
      - run: npm run test:integration
      - run: npm run test:e2e
```

### Quality Gates

- Todos os testes devem passar
- Coverage mínimo de 80%
- Zero security vulnerabilities
- Performance dentro dos limites

## Manutenção dos Testes

### Adicionando Novos Testes

1. **Unitários**: Para novas funções de negócio
2. **Integração**: Para novas APIs ou models
3. **E2E**: Para novos fluxos de usuário

### Atualização de Testes

- Atualizar mocks quando APIs mudam
- Adicionar novos cenários de edge case
- Manter coverage acima de 80%

### Boas Práticas

- Testes independentes e isolados
- Dados realistas e relevantes
- Nomes descritivos e claros
- Setup e teardown adequados
- Mocks only quando necessário

## Relatórios e Resultados

### Execução Local

```bash
# Ver resultados detalhados
npm run test:coverage

# Abrir interface do Vitest
npx vitest --ui

# Abrir relatório do Playwright
npx playwright show-report
```

### Resultados Esperados

- **Unitários**: 50+ testes, 100% pass rate
- **Integração**: 30+ testes, 100% pass rate  
- **E2E**: 20+ testes, 100% pass rate
- **Coverage**: >80% em todas as métricas

## Troubleshooting Comum

### Problemas Frequentes

1. **Testes de integração lentos**
   - Verificar conexão com banco
   - Usar transações para rollback

2. **Testes E2E instáveis**
   - Usar waits explícitos
   - Verificar selectors
   - Aumentar timeouts

3. **Coverage baixo**
   - Identificar código não testado
   - Adicionar testes para edge cases
   - Remover código morto

### Debug Tips

```bash
# Executar teste específico com debug
npx vitest run appointment-utils.test.ts --reporter=verbose

# Executar E2E com modo headed
npx playwright test --headed --project=chromium

# Ver traces detalhadas
npx playwright test --trace on
```

## Conclusão

Esta suíte de testes automatizados garante:

- **Qualidade**: Código robusto e sem bugs
- **Segurança**: Isolamento multi-tenant garantido
- **Performance**: Sistema rápido e responsivo
- **Confiabilidade**: Funcionalidades críticas testadas
- **Manutenibilidade**: Código fácil de evoluir

Os testes são parte essencial do desenvolvimento e devem ser mantidos e atualizados continuamente.
