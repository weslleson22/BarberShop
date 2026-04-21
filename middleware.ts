import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret'


export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Rotas que não precisam de autenticação
  const publicPaths = ['/', '/login', '/register', '/agendar', '/servicos']
  
  // Rotas que precisam de autenticação (mas não necessariamente bloqueio por role)
  const authRequiredPaths = ['/dashboard', '/agenda', '/clientes', '/usuarios']

  // Definir rotas por role
  const roleBasedRoutes = {
    '/admin': ['ADMIN'],
    '/financeiro': ['ADMIN'],
    '/barber': ['ADMIN', 'BARBER'],
    '/dashboard': ['ADMIN', 'BARBER', 'CLIENT'],
    '/agenda': ['ADMIN', 'BARBER'],
    '/clientes': ['ADMIN', 'BARBER'],
    '/usuarios': ['ADMIN']
  }

  // Verificar se é uma rota pública
  const isPublicPath = publicPaths.some(path => pathname.startsWith(path))
  
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
    console.log('Middleware: Rota pública permitida:', pathname)
    return NextResponse.next()
  }

  // Se for rota que requer autenticação, verificar apenas se está logado
  if (isAuthRequiredPath) {
    const token = request.cookies.get('auth-token')?.value
    
    console.log('=== MIDDLEWARE DEBUG ===')
    console.log('Pathname:', pathname)
    console.log('Todos os cookies:', request.cookies.getAll())
    console.log('Token encontrado:', token ? 'SIM' : 'NÃO')
    console.log('Token length:', token ? token.length : 0)
    console.log('Token prefix:', token ? token.substring(0, 20) + '...' : 'N/A')
    console.log('JWT_SECRET:', JWT_SECRET ? 'CONFIGURADO' : 'NÃO CONFIGURADO')
    console.log('Headers da requisição:', Object.fromEntries(request.headers.entries()))
    
    if (!token) {
      console.log('Middleware: Token não encontrado, redirecionando para login')
      // Redirecionar para login se não tiver token
      const loginUrl = new URL('/login', request.url)
      loginUrl.searchParams.set('redirect', pathname)
      return NextResponse.redirect(loginUrl)
    }

    // Validar o token JWT (método compatível com Edge Runtime)
    try {
      console.log('Middleware: Tentando verificar token JWT...')
      
      // Verificação manual do token JWT (compatível com Edge Runtime)
      const parts = token.split('.')
      if (parts.length !== 3) {
        throw new Error('Token format inválido')
      }
      
      // Decodificar payload (base64)
      const payload = JSON.parse(atob(parts[1]))
      console.log('Middleware: Token decodificado:', payload)
      console.log('User role:', payload.role)
      console.log('Token expira em:', new Date(payload.exp * 1000))
      
      // Verificar se o token não expirou
      if (payload.exp && payload.exp < Date.now() / 1000) {
        throw new Error('Token expirado')
      }
      
      // Verificar se o usuário tem permissão para acessar esta rota
      if (allowedRoles.length > 0 && !allowedRoles.includes(payload.role)) {
        console.log('Middleware: Usuário não tem permissão para', pathname)
        console.log('Role do usuário:', payload.role, 'Roles permitidos:', allowedRoles)
        const loginUrl = new URL('/login', request.url)
        loginUrl.searchParams.set('redirect', pathname)
        return NextResponse.redirect(loginUrl)
      }
      
    } catch (error) {
      console.log('Middleware: Token inválido, redirecionando para login')
      console.log('Erro JWT:', error instanceof Error ? error.message : String(error))
      console.log('Erro name:', error instanceof Error ? error.name : 'Unknown')
      console.log('Token completo:', token)
      
      // Token inválido, redirecionar para login
      const loginUrl = new URL('/login', request.url)
      loginUrl.searchParams.set('redirect', pathname)
      
      // Limpar cookie inválido
      const response = NextResponse.redirect(loginUrl)
      response.cookies.delete('auth-token')
      return response
    }
  }

  // Adicionar headers para debug
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-middleware-debug', 'true')

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  })
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
