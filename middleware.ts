import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Para demonstração, vamos permitir todas as rotas sem autenticação
// Em produção, implementar verificação JWT aqui

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Permitir todas as rotas para demonstração
  // Em produção, implementar lógica de autenticação aqui
  
  // Apenas adicionar headers para debug
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-middleware-debug', 'true')

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  })
}

export const config = {
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
