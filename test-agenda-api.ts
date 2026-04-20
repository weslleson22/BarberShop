// Teste para validar que a agenda mostra apenas dados do banco via GET

async function testAgendaAPI() {
  try {
    console.log('=== TESTANDO MÉTODO GET DA API DE AGENDAMENTOS ===')
    
    // Testar método GET da API
    const response = await fetch('http://localhost:3001/api/appointments/public')
    
    if (!response.ok) {
      console.error('ERRO: API não respondeu corretamente:', response.status, response.statusText)
      return
    }
    
    const data = await response.json()
    console.log('=== DADOS RECEBIDOS VIA GET ===')
    console.log('Total de agendamentos:', data.length)
    
    if (data.length === 0) {
      console.log('NENHUM agendamento encontrado via GET')
      return
    }
    
    // Validar estrutura dos dados
    console.log('\n=== VALIDANDO ESTRUTURA DOS DADOS ===')
    data.forEach((apt: any, index: number) => {
      console.log(`\nAgendamento ${index + 1}:`)
      console.log(`  ID: ${apt.id || 'N/A'}`)
      console.log(`  Cliente: ${apt.client?.name || 'N/A'} (ID: ${apt.client?.id || 'N/A'})`)
      console.log(`  Barbeiro: ${apt.barber?.name || 'N/A'} (ID: ${apt.barber?.id || 'N/A'})`)
      console.log(`  Serviço: ${apt.service?.name || 'N/A'} (ID: ${apt.service?.id || 'N/A'})`)
      console.log(`  Início: ${apt.startTime || 'N/A'}`)
      console.log(`  Status: ${apt.status || 'N/A'}`)
      console.log(`  Valor: R$${apt.service?.price || 'N/A'}`)
      
      // Validar se todos os campos obrigatórios existem
      const hasRequiredFields = apt.id && apt.client?.name && apt.barber?.name && 
                               apt.service?.name && apt.startTime && apt.status
      console.log(`  Campos obrigatórios OK: ${hasRequiredFields ? 'SIM' : 'NÃO'}`)
    })
    
    // Validar datas dos agendamentos
    console.log('\n=== VALIDANDO DATAS ===')
    const today = new Date().toISOString().split('T')[0]
    const todayAppointments = data.filter((apt: any) => {
      const aptDate = new Date(apt.startTime).toISOString().split('T')[0]
      return aptDate === today
    })
    
    console.log(`Data de hoje: ${today}`)
    console.log(`Agendamentos de hoje: ${todayAppointments.length}`)
    
    if (todayAppointments.length > 0) {
      console.log('\nAgendamentos de hoje:')
      todayAppointments.forEach((apt: any, index: number) => {
        console.log(`  ${index + 1}. ${apt.client?.name} - ${apt.service?.name} - ${new Date(apt.startTime).toLocaleTimeString('pt-BR')}`)
      })
    }
    
    // Validar que não há dados mockados
    console.log('\n=== VALIDANDO SE SÃO DADOS REAIS DO PRISMA ===')
    const hasRealIds = data.every((apt: any) => 
      apt.id && apt.id.length > 10 && // IDs do Prisma são longos
      apt.client?.id && apt.client?.id.length > 10 &&
      apt.barber?.id && apt.barber?.id.length > 10 &&
      apt.service?.id && apt.service?.id.length > 10
    )
    
    console.log(`IDs reais do Prisma: ${hasRealIds ? 'SIM' : 'NÃO'}`)
    console.log(`Todos os dados parecem ser do banco: ${hasRealIds && data.length > 0 ? 'SIM' : 'NÃO'}`)
    
    console.log('\n=== RESUMO ===')
    console.log(`Total de agendamentos: ${data.length}`)
    console.log(`Agendamentos de hoje: ${todayAppointments.length}`)
    console.log(`Dados do Prisma validados: ${hasRealIds ? 'SIM' : 'NÃO'}`)
    console.log(`API GET funcionando: SIM`)
    
  } catch (error) {
    console.error('ERRO ao testar API:', error)
  }
}

// Executar teste
testAgendaAPI()
