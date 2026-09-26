import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import jwt from 'jsonwebtoken'
import { ALL_ROLES, type UserRole } from '@/lib/roles'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Rotas que não precisam de autenticação ('/' é caso especial: comparação
  // exata, não prefixo — com startsWith('/') QUALQUER caminho "começa com /",
  // o que tornava toda a proteção de rota abaixo inerte. Esse bug já existia
  // antes desta reestruturação; a única coisa protegendo as páginas até aqui
  // eram os redirects client-side dentro de cada página, que são
  // contornáveis e ainda deixam o conteúdo real piscar na tela.)
  const publicPrefixes = ['/login', '/register', '/agendar', '/servicos', '/b']

  // Rotas que precisam de autenticação (mas não necessariamente bloqueio por role)
  const authRequiredPaths = [
    '/developer',
    '/dashboard',
    '/agenda',
    '/clientes',
    '/usuarios',
    '/configuracoes',
    '/perfil',
    '/meus-agendamentos',
  ]

  // Definir rotas por role
  const roleBasedRoutes: Record<string, UserRole[]> = {
    '/developer': ['DEVELOPER'],
    '/usuarios': ['DEVELOPER', 'ADMIN'],
    '/agenda': ['ADMIN', 'BARBER', 'RECEPTIONIST'],
    '/clientes': ['ADMIN', 'BARBER', 'RECEPTIONIST'],
    '/dashboard': ['ADMIN', 'BARBER', 'RECEPTIONIST', 'CLIENT'],
    '/configuracoes': ALL_ROLES,
    '/perfil': ALL_ROLES,
    '/meus-agendamentos': ['CLIENT'],
  }

  // Verificar se é uma rota pública
  const isPublicPath = pathname === '/' || publicPrefixes.some(path => pathname.startsWith(path))

  // Verificar se é uma rota que requer autenticação
  const isAuthRequiredPath = authRequiredPaths.some(path => pathname.startsWith(path))

  // Verificar se a rota requer role específico
  let allowedRoles: string[] = []
  for (const [route, roles] of Object.entries(roleBasedRoutes)) {
    if (pathname.startsWith(route)) {
      allowedRoles = roles as string[]
      break
    }
  }

  // Se for rota pública, permitir acesso sem autenticação
  if (isPublicPath) {
    return NextResponse.next()
  }

  // Se for rota que requer autenticação, verificar apenas se está logado
  if (isAuthRequiredPath) {
    const token = request.cookies.get('auth-token')?.value

    if (!token) {
      // Redirecionar para login se não tiver token
      const loginUrl = new URL('/login', request.url)
      loginUrl.searchParams.set('redirect', pathname)
      return NextResponse.redirect(loginUrl)
    }

    const jwtSecret = process.env.JWT_SECRET
    if (!jwtSecret) {
      console.error('CRITICAL: JWT_SECRET environment variable is missing!')
      const loginUrl = new URL('/login', request.url)
      loginUrl.searchParams.set('redirect', pathname)
      return NextResponse.redirect(loginUrl)
    }

    try {
      const payload = jwt.verify(token, jwtSecret) as { role: string; exp?: number }

      // Se o usuário é DEVELOPER tentando acessar dashboard ou agenda, redireciona para /developer
      if (payload.role === 'DEVELOPER' && (pathname.startsWith('/dashboard') || pathname.startsWith('/agenda') || pathname.startsWith('/clientes'))) {
        return NextResponse.redirect(new URL('/developer', request.url))
      }

      // Verificar se o usuário tem permissão para acessar esta rota
      if (allowedRoles.length > 0 && !allowedRoles.includes(payload.role)) {
        const redirectPath = payload.role === 'DEVELOPER' ? '/developer' : '/dashboard'
        return NextResponse.redirect(new URL(redirectPath, request.url))
      }

    } catch (error) {
      // Token ausente/expirado/assinatura inválida: limpar cookie e mandar pro login
      const loginUrl = new URL('/login', request.url)
      loginUrl.searchParams.set('redirect', pathname)

      const response = NextResponse.redirect(loginUrl)
      response.cookies.delete('auth-token')
      return response
    }
  }

  return NextResponse.next()
}

export const config = {
  runtime: 'nodejs',
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public (public files)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|public).*)',
  ],
}
