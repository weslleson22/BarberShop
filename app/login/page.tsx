'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Home } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'

export default function LoginPage() {
  const router = useRouter()
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  
  // Obter redirecionamento baseado em role ou parâmetro URL
  const getRedirectUrl = (userRole: string) => {
    // Priorizar parâmetro redirect da URL
    const urlParams = new URLSearchParams(window.location.search)
    const redirect = urlParams.get('redirect')
    
    if (redirect) {
      console.log('Usando redirect da URL:', redirect)
      return redirect
    }
    
    // Se não tiver redirect, usar rota baseada no role
    const roleRedirect = {
      'ADMIN': '/dashboard',
      'BARBER': '/dashboard', 
      'CLIENT': '/dashboard'
    }[userRole] || '/dashboard'
    
    console.log('Usando redirect por role:', userRole, '->', roleRedirect)
    return roleRedirect
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      console.log('=== PÁGINA DE LOGIN - ENVIANDO ===')
      console.log('Email:', email)
      console.log('Password:', password ? '***' : 'vazio')
      
      const success = await login(email, password)
      
      console.log('Resultado do login:', success)
      
      if (success) {
        console.log('Login bem-sucedido, aguardando dados do usuário...')
        
        // Aguardar um pouco para o usuário ser atualizado no contexto
        setTimeout(() => {
          const urlParams = new URLSearchParams(window.location.search)
          const redirect = urlParams.get('redirect')
          
          if (redirect) {
            console.log('Usando redirect da URL:', redirect)
            router.push(redirect)
          } else {
            console.log('Redirecionando para dashboard padrão')
            router.push('/dashboard')
          }
        }, 100)
      } else {
        console.log('Login falhou, mostrando erro')
        setError('Email ou senha incorretos')
      }
    } catch (error) {
      console.error('Erro no handleSubmit:', error)
      setError('Erro de conexão')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      {/* Botões de navegação */}
      <div className="absolute top-4 left-4 flex space-x-2">
        <button
          onClick={() => router.back()}
          className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors"
          title="Voltar"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Voltar</span>
        </button>
        <Link
          href="/"
          className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors"
          title="Página Inicial"
        >
          <Home className="w-4 h-4" />
          <span>Home</span>
        </Link>
      </div>
      
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Entrar na sua Barbearia
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Ou{' '}
            <Link href="/register" className="font-medium text-blue-600 hover:text-blue-500">
              crie uma nova conta
            </Link>
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="email" className="sr-only">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">
                Senha
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="Senha"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
          </div>

          <div className="text-center">
            <Link href="/" className="text-sm text-gray-600 hover:text-gray-900">
              Voltar para página inicial
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}
