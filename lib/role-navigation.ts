// Sistema de navegação baseado em roles
export function getRedirectPathByRole(role: string): string {
  switch (role) {
    case 'ADMIN':
      return '/admin'
    case 'BARBER':
      return '/barber'
    case 'CLIENT':
      return '/dashboard'
    default:
      return '/dashboard'
  }
}

export function getMenuByRole(role: string) {
  switch (role) {
    case 'ADMIN':
      return [
        { label: 'Dashboard', href: '/admin', icon: 'LayoutDashboard' },
        { label: 'Usuários', href: '/usuarios', icon: 'Users' },
        { label: 'Serviços', href: '/servicos', icon: 'Scissors' },
        { label: 'Clientes', href: '/clientes', icon: 'UserCheck' },
        { label: 'Financeiro', href: '/financeiro', icon: 'DollarSign' },
        { label: 'Agenda', href: '/agenda', icon: 'Calendar' }
      ]
    
    case 'BARBER':
      return [
        { label: 'Dashboard', href: '/barber', icon: 'LayoutDashboard' },
        { label: 'Agendamentos', href: '/agenda', icon: 'Calendar' },
        { label: 'Clientes', href: '/clientes', icon: 'UserCheck' },
        { label: 'Serviços', href: '/servicos', icon: 'Scissors' }
      ]
    
    case 'CLIENT':
      return [
        { label: 'Meus Agendamentos', href: '/dashboard', icon: 'Calendar' },
        { label: 'Perfil', href: '/perfil', icon: 'User' },
        { label: 'Agendar', href: '/agendar', icon: 'Plus' }
      ]
    
    default:
      return []
  }
}

export function canAccessRoute(userRole: string, pathname: string): boolean {
  const roleBasedRoutes = {
    '/admin': ['ADMIN'],
    '/financeiro': ['ADMIN'],
    '/barber': ['ADMIN', 'BARBER'],
    '/dashboard': ['ADMIN', 'BARBER', 'CLIENT'],
    '/agenda': ['ADMIN', 'BARBER'],
    '/clientes': ['ADMIN', 'BARBER'],
    '/servicos': ['ADMIN', 'BARBER'],
    '/usuarios': ['ADMIN']
  }

  for (const [route, allowedRoles] of Object.entries(roleBasedRoutes)) {
    if (pathname.startsWith(route)) {
      return allowedRoles.includes(userRole)
    }
  }

  // Rotas públicas
  const publicRoutes = ['/', '/login', '/register', '/agendar']
  return publicRoutes.some(route => pathname.startsWith(route))
}

export function getWelcomeMessage(user: { name: string; role: string }): string {
  switch (user.role) {
    case 'ADMIN':
      return `Bem-vindo(a), ${user.name}! Aqui está o resumo completo da sua barbearia.`
    case 'BARBER':
      return `Bem-vindo(a), ${user.name}! Aqui está sua agenda e informações do dia.`
    case 'CLIENT':
      return `Bem-vindo(a), ${user.name}! Aqui está seu perfil e agendamentos.`
    default:
      return `Bem-vindo(a), ${user.name}!`
  }
}
