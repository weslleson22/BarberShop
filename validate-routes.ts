// Script para validar todas as rotas e APIs do sistema

interface RouteValidation {
  path: string
  description: string
  hasPage: boolean
  apis: {
    get: boolean
    post: boolean
    put: boolean
    delete: boolean
  }
  status: 'OK' | 'MISSING' | 'PARTIAL'
  notes: string[]
}

async function validateRoute(route: string, description: string): Promise<RouteValidation> {
  const validation: RouteValidation = {
    path: route,
    description,
    hasPage: false,
    apis: { get: false, post: false, put: false, delete: false },
    status: 'MISSING',
    notes: []
  }

  try {
    // Verificar se a página existe
    const pageResponse = await fetch(`http://localhost:3001${route}`)
    validation.hasPage = pageResponse.ok
    if (!pageResponse.ok) {
      validation.notes.push(`Página não encontrada: ${pageResponse.status}`)
    }

    // Verificar APIs correspondentes
    const apiMap: { [key: string]: string } = {
      '/': '/api/services/public',
      '/agendar': '/api/appointments/public',
      '/dashboard': '/api/appointments/public',
      '/agenda': '/api/appointments/public',
      '/clientes': '/api/clients/all',
      '/servicos': '/api/services/public',
      '/financeiro': '/api/appointments/public',
      '/configuracoes': '/api/users'
    }

    const apiPath = apiMap[route]
    if (apiPath) {
      // Testar GET
      try {
        const getResponse = await fetch(`http://localhost:3001${apiPath}`)
        validation.apis.get = getResponse.ok
        if (getResponse.ok) {
          const data = await getResponse.json()
          validation.notes.push(`GET OK: ${Array.isArray(data) ? data.length : 'object'} itens`)
        } else {
          validation.notes.push(`GET falhou: ${getResponse.status}`)
        }
      } catch (error) {
        validation.notes.push(`GET erro: ${error}`)
      }

      // Testar POST (se aplicável)
      if (route === '/agendar') {
        try {
          const postResponse = await fetch(`http://localhost:3001${apiPath}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ test: true })
          })
          validation.apis.post = postResponse.status !== 404
          validation.notes.push(`POST: ${postResponse.status}`)
        } catch (error) {
          validation.notes.push(`POST erro: ${error}`)
        }
      }

      if (route === '/clientes' || route === '/servicos') {
        try {
          const postResponse = await fetch(`http://localhost:3001${apiPath.replace('/all', '')}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ test: true })
          })
          validation.apis.post = postResponse.status !== 404
          validation.notes.push(`POST: ${postResponse.status}`)
        } catch (error) {
          validation.notes.push(`POST erro: ${error}`)
        }
      }

      if (route === '/dashboard' || route === '/configuracoes') {
        try {
          const usersResponse = await fetch('http://localhost:3001/api/users', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ test: true })
          })
          validation.apis.post = usersResponse.status !== 404
          validation.notes.push(`POST users: ${usersResponse.status}`)
        } catch (error) {
          validation.notes.push(`POST users erro: ${error}`)
        }
      }
    }

    // Determinar status
    const hasWorkingAPI = validation.apis.get || validation.apis.post
    if (validation.hasPage && hasWorkingAPI) {
      validation.status = 'OK'
    } else if (validation.hasPage || hasWorkingAPI) {
      validation.status = 'PARTIAL'
    } else {
      validation.status = 'MISSING'
    }

  } catch (error) {
    validation.notes.push(`Erro geral: ${error}`)
  }

  return validation
}

async function validateAllRoutes() {
  console.log('=== VALIDAÇÃO COMPLETA DE ROTAS E APIs ===\n')

  const routes = [
    { path: '/', description: 'Home (serviços)' },
    { path: '/agendar', description: 'Agendamento' },
    { path: '/minhas-reservas', description: 'Minhas Reservas' },
    { path: '/dashboard', description: 'Dashboard' },
    { path: '/agenda', description: 'Agenda' },
    { path: '/clientes', description: 'Clientes' },
    { path: '/servicos', description: 'Serviços' },
    { path: '/financeiro', description: 'Financeiro' },
    { path: '/configuracoes', description: 'Configurações' }
  ]

  const results: RouteValidation[] = []

  for (const route of routes) {
    console.log(`Validando: ${route.path} - ${route.description}`)
    const validation = await validateRoute(route.path, route.description)
    results.push(validation)
    
    console.log(`  Status: ${validation.status}`)
    console.log(`  Página: ${validation.hasPage ? 'OK' : 'FALTANDO'}`)
    console.log(`  APIs: GET:${validation.apis.get ? 'OK' : 'NO'} POST:${validation.apis.post ? 'OK' : 'NO'}`)
    if (validation.notes.length > 0) {
      console.log(`  Notas: ${validation.notes.join(', ')}`)
    }
    console.log('')
  }

  // Resumo final
  console.log('=== RESUMO DA VALIDAÇÃO ===')
  const ok = results.filter(r => r.status === 'OK').length
  const partial = results.filter(r => r.status === 'PARTIAL').length
  const missing = results.filter(r => r.status === 'MISSING').length

  console.log(`Rotas OK: ${ok}`)
  console.log(`Rotas Parciais: ${partial}`)
  console.log(`Rotas Faltando: ${missing}`)

  console.log('\n=== DETALHES DAS ROTAS COM PROBLEMAS ===')
  results.filter(r => r.status !== 'OK').forEach(route => {
    console.log(`${route.path} - ${route.description}: ${route.status}`)
    route.notes.forEach(note => console.log(`  - ${note}`))
  })

  return results
}

// Executar validação
validateAllRoutes().catch(console.error)
