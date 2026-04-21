import { NextRequest, NextResponse } from 'next/server'
import { authenticateUser } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    console.log('=== API DE LOGIN - INICIANDO ===')
    const { email, password } = await request.json()
    
    console.log('Email recebido:', email)
    console.log('Password recebido:', password ? '***' : 'vazio')

    if (!email || !password) {
      console.log('ERRO: Email ou senha vazios')
      return NextResponse.json(
        { error: 'Email e senha são obrigatórios' },
        { status: 400 }
      )
    }

    console.log('Chamando authenticateUser...')
    const result = await authenticateUser(email, password)
    console.log('Resultado authenticateUser:', result ? 'SUCESSO' : 'FALHA')

    if (!result) {
      console.log('ERRO: authenticateUser retornou null/undefined')
      return NextResponse.json(
        { error: 'Credenciais inválidas' },
        { status: 401 }
      )
    }

    console.log('Usuário autenticado:', result.user?.name, '-', result.user?.role)
    console.log('Token gerado:', result.token ? result.token.substring(0, 20) + '...' : 'NÃO')

    const response = NextResponse.json(result)
    response.cookies.set('auth-token', result.token, {
      httpOnly: false, // Mudar para false para debug
      secure: false, // Mudar para false para desenvolvimento local
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: '/', // CRÍTICO: garantir cookie disponível em todo o site
    })

    console.log('=== LOGIN SUCCESS ===')
    console.log('Usuário:', result.user.name)
    console.log('Role:', result.user.role)
    console.log('Token:', result.token.substring(0, 20) + '...')
    console.log('Cookie setado com path: /')
    console.log('Token completo:', result.token)
    console.log('Headers da resposta:', Object.fromEntries(response.headers.entries()))
    console.log('Cookies da resposta:', response.cookies.getAll())
    console.log('Redirecionamento sugerido por role:', {
      'ADMIN': '/dashboard',
      'BARBER': '/dashboard', 
      'CLIENT': '/dashboard'
    }[result.user.role])
    
    return response
  } catch (error) {
    console.error('Login error:', error)
    console.error('Stack trace:', error instanceof Error ? error.stack : 'No stack trace')
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao fazer login' },
      { status: 401 }
    )
  }
}
