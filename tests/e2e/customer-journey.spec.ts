import { test, expect } from '@playwright/test'

// Dados de teste
const testCustomer = {
  name: 'Cliente Teste E2E',
  email: 'cliente.e2e@test.com',
  phone: '(11) 99999-9999'
}

const testAppointment = {
  service: 'Corte Masculino',
  date: '2026-04-25',
  time: '10:00'
}

test.describe('Fluxo Completo do Cliente', () => {
  test.beforeEach(async ({ page }) => {
    // Limpar estado e acessar página inicial
    await page.goto('/')
  })

  test('cliente deve conseguir agendar horário completo', async ({ page }) => {
    // 1. Acessar página de agendamento
    await page.click('text=Agendar Agora')
    await expect(page).toHaveURL('/agendar')
    
    // 2. Passo 1: Selecionar serviço
    await page.waitForSelector('[data-testid="service-step"]')
    await page.click(`text=${testAppointment.service}`)
    await page.click('button:has-text("Próximo")')
    
    // 3. Passo 2: Selecionar barbeiro
    await page.waitForSelector('[data-testid="barber-step"]')
    await page.click('text=Carlos Barbeiro') // Assumindo que existe
    await page.click('button:has-text("Próximo")')
    
    // 4. Passo 3: Selecionar data e horário
    await page.waitForSelector('[data-testid="datetime-step"]')
    await page.fill('input[type="date"]', testAppointment.date)
    await page.click(`text=${testAppointment.time}`)
    await page.click('button:has-text("Próximo")')
    
    // 5. Passo 4: Preencher dados do cliente
    await page.waitForSelector('[data-testid="client-step"]')
    await page.fill('input[name="name"]', testCustomer.name)
    await page.fill('input[name="email"]', testCustomer.email)
    await page.fill('input[name="phone"]', testCustomer.phone)
    
    // 6. Confirmar agendamento
    await page.click('button:has-text("Confirmar Agendamento")')
    
    // 7. Validar sucesso
    await page.waitForSelector('[data-testid="success-message"]')
    await expect(page.locator('text=Agendamento confirmado com sucesso!')).toBeVisible()
    
    // 8. Verificar se foi redirecionado para página de sucesso
    await expect(page).toHaveURL('/agendamento-sucesso')
  })

  test('cliente deve visualizar histórico de agendamentos', async ({ page }) => {
    // Criar agendamento de teste via API (simulação)
    await page.goto('/minhas-reservas') // Assumindo que esta rota existe
    
    // Validar página de reservas
    await expect(page.locator('h1:has-text("Minhas Reservas")')).toBeVisible()
    
    // Verificar se há lista de agendamentos
    const appointmentsList = page.locator('[data-testid="appointments-list"]')
    
    if (await appointmentsList.isVisible()) {
      // Validar estrutura do agendamento
      const appointmentCard = appointmentsList.locator('[data-testid="appointment-card"]').first()
      await expect(appointmentCard.locator('[data-testid="service-name"]')).toBeVisible()
      await expect(appointmentCard.locator('[data-testid="appointment-date"]')).toBeVisible()
      await expect(appointmentCard.locator('[data-testid="appointment-status"]')).toBeVisible()
    }
  })

  test('sistema deve bloquear horários indisponíveis', async ({ page }) => {
    await page.goto('/agendar')
    
    // Navegar até seleção de horário
    await page.click(`text=${testAppointment.service}`)
    await page.click('button:has-text("Próximo")')
    await page.click('text=Carlos Barbeiro')
    await page.click('button:has-text("Próximo")')
    
    // Preencher data
    await page.fill('input[type="date"]', testAppointment.date)
    
    // Aguardar carregamento dos horários
    await page.waitForSelector('[data-testid="time-slots"]')
    
    // Verificar se horários ocupados estão desabilitados
    const occupiedSlots = page.locator('[data-testid="time-slot"]:disabled')
    
    if (await occupiedSlots.count() > 0) {
      // Tentar clicar em horário ocupado
      const firstOccupied = occupiedSlots.first()
      await expect(firstOccupied).toBeDisabled()
      
      // Verificar mensagem de indisponibilidade
      await expect(firstOccupied.locator('text=Indisponível')).toBeVisible()
    }
    
    // Verificar se horários disponíveis estão habilitados
    const availableSlots = page.locator('[data-testid="time-slot"]:not(:disabled)')
    if (await availableSlots.count() > 0) {
      await expect(availableSlots.first()).toBeEnabled()
    }
  })

  test('cliente deve conseguir cancelar agendamento', async ({ page }) => {
    // Acessar página de reservas
    await page.goto('/minhas-reservas')
    
    // Encontrar agendamento pendente
    const pendingAppointment = page.locator('[data-testid="appointment-card"][data-status="PENDING"]').first()
    
    if (await pendingAppointment.isVisible()) {
      // Clicar em cancelar
      await pendingAppointment.locator('button:has-text("Cancelar")').click()
      
      // Confirmar cancelamento
      await page.click('button:has-text("Confirmar Cancelamento")')
      
      // Validar sucesso
      await expect(page.locator('text=Agendamento cancelado com sucesso')).toBeVisible()
      
      // Verificar se status foi atualizado
      await expect(pendingAppointment.locator('[data-status="CANCELLED"]')).toBeVisible()
    }
  })
})

test.describe('Fluxo do Barbeiro/Admin', () => {
  const testAdmin = {
    email: 'admin@barberiacentral.com',
    password: 'senha123'
  }

  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('barbeiro deve conseguir visualizar agenda completa', async ({ page }) => {
    // 1. Fazer login
    await page.click('text=Login')
    await page.fill('input[name="email"]', testAdmin.email)
    await page.fill('input[name="password"]', testAdmin.password)
    await page.click('button:has-text("Entrar")')
    
    // 2. Acessar agenda
    await page.click('text=Agenda')
    await expect(page).toHaveURL('/agenda')
    
    // 3. Validar visualização da agenda
    await expect(page.locator('h1:has-text("Agenda")')).toBeVisible()
    
    // 4. Verificar filtro de data
    const dateFilter = page.locator('input[type="date"]')
    await expect(dateFilter).toBeVisible()
    
    // 5. Verificar lista de agendamentos
    const appointmentsList = page.locator('[data-testid="appointments-list"]')
    if (await appointmentsList.isVisible()) {
      const appointmentCards = appointmentsList.locator('[data-testid="appointment-card"]')
      const count = await appointmentCards.count()
      
      // Validar estrutura dos cards
      for (let i = 0; i < count; i++) {
        const card = appointmentCards.nth(i)
        await expect(card.locator('[data-testid="client-name"]')).toBeVisible()
        await expect(card.locator('[data-testid="service-name"]')).toBeVisible()
        await expect(card.locator('[data-testid="appointment-time"]')).toBeVisible()
        await expect(card.locator('[data-testid="appointment-status"]')).toBeVisible()
      }
    }
  })

  test('barbeiro deve conseguir criar agendamento manual', async ({ page }) => {
    // Login
    await page.click('text=Login')
    await page.fill('input[name="email"]', testAdmin.email)
    await page.fill('input[name="password"]', testAdmin.password)
    await page.click('button:has-text("Entrar")')
    
    // Acessar agenda
    await page.click('text=Agenda')
    
    // Clicar em novo agendamento
    await page.click('button:has-text("Novo Agendamento")')
    
    // Preencher formulário
    await page.fill('input[name="clientName"]', 'Cliente Manual')
    await page.fill('input[name="clientPhone"]', '(11) 99999-8888')
    await page.selectOption('select[name="service"]', testAppointment.service)
    await page.fill('input[name="date"]', testAppointment.date)
    await page.selectOption('select[name="time"]', testAppointment.time)
    
    // Salvar
    await page.click('button:has-text("Salvar Agendamento")')
    
    // Validar sucesso
    await expect(page.locator('text=Agendamento criado com sucesso')).toBeVisible()
  })

  test('barbeiro deve conseguir atualizar status de agendamento', async ({ page }) => {
    // Login
    await page.click('text=Login')
    await page.fill('input[name="email"]', testAdmin.email)
    await page.fill('input[name="password"]', testAdmin.password)
    await page.click('button:has-text("Entrar")')
    
    // Acessar agenda
    await page.click('text=Agenda')
    
    // Encontrar agendamento pendente
    const pendingAppointment = page.locator('[data-testid="appointment-card"][data-status="PENDING"]').first()
    
    if (await pendingAppointment.isVisible()) {
      // Clicar em atualizar status
      await pendingAppointment.locator('button:has-text("Atualizar Status")').click()
      
      // Selecionar novo status
      await page.selectOption('select[name="status"]', 'COMPLETED')
      
      // Confirmar
      await page.click('button:has-text("Confirmar")')
      
      // Validar atualização
      await expect(pendingAppointment.locator('[data-status="COMPLETED"]')).toBeVisible()
      await expect(page.locator('text=Status atualizado com sucesso')).toBeVisible()
    }
  })

  test('barbeiro deve conseguir visualizar métricas do dashboard', async ({ page }) => {
    // Login
    await page.click('text=Login')
    await page.fill('input[name="email"]', testAdmin.email)
    await page.fill('input[name="password"]', testAdmin.password)
    await page.click('button:has-text("Entrar")')
    
    // Acessar dashboard
    await page.click('text=Dashboard')
    await expect(page).toHaveURL('/dashboard')
    
    // Validar métricas
    await expect(page.locator('[data-testid="today-appointments"]')).toBeVisible()
    await expect(page.locator('[data-testid="today-revenue"]')).toBeVisible()
    await expect(page.locator('[data-testid="total-clients"]')).toBeVisible()
    await expect(page.locator('[data-testid="total-services"]')).toBeVisible()
    
    // Validar próximos agendamentos
    const upcomingAppointments = page.locator('[data-testid="upcoming-appointments"]')
    if (await upcomingAppointments.isVisible()) {
      await expect(upcomingAppointments.locator('[data-testid="appointment-item"]').first()).toBeVisible()
    }
  })
})

test.describe('Testes de Segurança e Acesso', () => {
  test('usuário não autenticado não deve acessar rotas admin', async ({ page }) => {
    // Tentar acessar dashboard diretamente
    await page.goto('/dashboard')
    
    // Deve ser redirecionado para login
    await expect(page).toHaveURL('/login')
  })

  test('cliente não deve acessar funcionalidades admin', async ({ page }) => {
    // Login como cliente (simulação)
    await page.goto('/login')
    await page.fill('input[name="email"]', 'cliente@test.com')
    await page.fill('input[name="password"]', 'senha123')
    await page.click('button:has-text("Entrar")')
    
    // Tentar acessar configurações
    await page.goto('/configuracoes')
    
    // Deve ser bloqueado ou mostrar acesso negado
    const accessDenied = page.locator('text=Acesso negado')
    const redirect = page.url().includes('/login')
    
    expect(await accessDenied.isVisible() || redirect).toBe(true)
  })

  test('isolamento multi-tenant deve funcionar', async ({ page }) => {
    // Login como admin da barbearia 1
    await page.goto('/login')
    await page.fill('input[name="email"]', 'admin@barberiacentral.com')
    await page.fill('input[name="password"]', 'senha123')
    await page.click('button:has-text("Entrar")')
    
    // Acessar clientes
    await page.click('text=Clientes')
    
    // Validar que só mostra clientes da barbearia correta
    const clientsList = page.locator('[data-testid="clients-list"]')
    if (await clientsList.isVisible()) {
      const clientCards = clientsList.locator('[data-testid="client-card"]')
      
      // Validar que todos os clientes pertencem à mesma barbearia
      const count = await clientCards.count()
      for (let i = 0; i < count; i++) {
        const card = clientCards.nth(i)
        // Validar que não há dados de outras barbearias
        await expect(card.locator('text=Barbearia 2')).not.toBeVisible()
      }
    }
  })
})

test.describe('Testes de Performance e UX', () => {
  test('sistema deve carregar rapidamente', async ({ page }) => {
    const startTime = Date.now()
    
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    
    const loadTime = Date.now() - startTime
    
    // Página deve carregar em menos de 3 segundos
    expect(loadTime).toBeLessThan(3000)
  })

  test('formulários devem ter validação adequada', async ({ page }) => {
    await page.goto('/agendar')
    
    // Tentar avançar sem selecionar serviço
    await page.click('button:has-text("Próximo")')
    
    // Deve mostrar erro de validação
    await expect(page.locator('text=Selecione um serviço')).toBeVisible()
    
    // Tentar preencher formulário com dados inválidos
    await page.click(`text=${testAppointment.service}`)
    await page.click('button:has-text("Próximo")')
    await page.click('text=Carlos Barbeiro')
    await page.click('button:has-text("Próximo")')
    await page.fill('input[type="date"]', '2026-04-20')
    await page.click('button:has-text("Próximo")')
    
    // Preencher com email inválido
    await page.fill('input[name="email"]', 'email-invalido')
    await page.fill('input[name="name"]', testCustomer.name)
    await page.fill('input[name="phone"]', 'telefone-invalido')
    
    await page.click('button:has-text("Confirmar Agendamento")')
    
    // Deve mostrar erros de validação
    await expect(page.locator('text=Email inválido')).toBeVisible()
    await expect(page.locator('text=Telefone inválido')).toBeVisible()
  })

  test('sistema deve ser responsivo', async ({ page }) => {
    // Testar em mobile
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto('/')
    
    // Validar layout mobile
    await expect(page.locator('button[aria-label="Menu"]')).toBeVisible()
    
    // Testar menu mobile
    await page.click('button[aria-label="Menu"]')
    await expect(page.locator('[data-testid="mobile-menu"]')).toBeVisible()
    
    // Testar em tablet
    await page.setViewportSize({ width: 768, height: 1024 })
    await page.goto('/agendar')
    
    // Validar layout tablet
    await expect(page.locator('[data-testid="service-step"]')).toBeVisible()
  })
})
