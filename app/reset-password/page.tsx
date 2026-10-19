'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { 
  Lock, 
  KeyRound, 
  Eye, 
  EyeOff, 
  CheckCircle2, 
  AlertCircle, 
  ArrowLeft, 
  Loader2, 
  ShieldCheck,
  Calendar
} from 'lucide-react'

function ResetPasswordContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token')

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  // Token ausente na URL
  if (!token) {
    return (
      <div className="w-full max-w-md bg-gray-900 border border-gray-800 rounded-2xl p-6 sm:p-8 shadow-xl text-center space-y-6">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
          <AlertCircle className="w-7 h-7" />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-bold text-white">Link Inválido ou Ausente</h2>
          <p className="text-sm text-gray-400 leading-relaxed">
            O token de recuperação não foi encontrado na URL. Verifique se copiou o link completo enviado para o seu e-mail.
          </p>
        </div>
        <div className="pt-2">
          <Link
            href="/login"
            className="inline-flex items-center justify-center space-x-2 w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Voltar para o Login</span>
          </Link>
        </div>
      </div>
    )
  }

  // Sucesso na redefinição
  if (success) {
    return (
      <div className="w-full max-w-md bg-gray-900 border border-gray-800 rounded-2xl p-6 sm:p-8 shadow-xl text-center space-y-6 animate-in fade-in zoom-in-95">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
          <CheckCircle2 className="w-7 h-7" />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-bold text-white">Senha Redefinida!</h2>
          <p className="text-sm text-gray-400 leading-relaxed">
            Sua nova senha foi cadastrada com sucesso e todas as sessões anteriores foram encerradas com segurança.
          </p>
        </div>
        <div className="pt-2">
          <button
            onClick={() => router.push('/login?reset=success')}
            className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm transition-colors flex items-center justify-center space-x-2"
          >
            <span>Ir para o Login</span>
          </button>
        </div>
      </div>
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (password.length < 6) {
      setError('A nova senha deve ter no mínimo 6 caracteres.')
      return
    }

    if (password !== confirmPassword) {
      setError('As senhas digitadas não coincidem.')
      return
    }

    setLoading(true)

    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          password,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Erro ao redefinir a senha.')
        setLoading(false)
        return
      }

      setSuccess(true)
      // Redireciona suavemente após 2.5 segundos se o usuário não clicar
      setTimeout(() => {
        router.push('/login?reset=success')
      }, 2500)
    } catch (err: any) {
      setError(err?.message || 'Erro de conexão ao processar redefinição.')
      setLoading(false)
    }
  }

  return (
    <div className="w-full max-w-md bg-gray-900 border border-gray-800 rounded-2xl p-6 sm:p-8 shadow-xl">
      {/* Cabeçalho */}
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30 mb-3">
          <KeyRound className="w-6 h-6" />
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-white">
          Criar Nova Senha
        </h2>
        <p className="mt-1.5 text-xs sm:text-sm text-gray-400">
          Defina uma nova senha forte para acessar sua conta
        </p>
      </div>

      {/* Alerta de Erro */}
      {error && (
        <div 
          role="alert"
          className="mb-5 p-3.5 rounded-xl bg-red-950/60 border border-red-800 text-red-200 text-xs sm:text-sm flex items-start space-x-2.5 animate-in fade-in"
        >
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
          <div className="flex-1 leading-snug">{error}</div>
        </div>
      )}

      {/* Formulário */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Nova Senha */}
        <div>
          <label 
            htmlFor="password" 
            className="block text-xs font-semibold uppercase tracking-wider text-gray-300 mb-1.5"
          >
            Nova Senha
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
              <Lock className="w-4 h-4" />
            </div>
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              required
              autoFocus
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mínimo 6 caracteres"
              className="w-full pl-10 pr-11 py-2.5 rounded-xl bg-gray-950 border border-gray-800 text-white placeholder-gray-500 text-sm focus:outline-none focus:border-blue-500 transition-colors"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-white transition-colors"
              title={showPassword ? 'Ocultar' : 'Exibir'}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Confirmar Nova Senha */}
        <div>
          <label 
            htmlFor="confirmPassword" 
            className="block text-xs font-semibold uppercase tracking-wider text-gray-300 mb-1.5"
          >
            Confirmar Nova Senha
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
              <Lock className="w-4 h-4" />
            </div>
            <input
              id="confirmPassword"
              type={showConfirmPassword ? 'text' : 'password'}
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Digite a mesma senha"
              className="w-full pl-10 pr-11 py-2.5 rounded-xl bg-gray-950 border border-gray-800 text-white placeholder-gray-500 text-sm focus:outline-none focus:border-blue-500 transition-colors"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-white transition-colors"
              title={showConfirmPassword ? 'Ocultar' : 'Exibir'}
            >
              {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Indicadores de Requisito */}
        <div className="p-3 rounded-lg bg-gray-950/60 border border-gray-800/80 space-y-1 text-[11px] text-gray-400">
          <div className={`flex items-center space-x-1.5 ${password.length >= 6 ? 'text-emerald-400 font-medium' : ''}`}>
            <span>{password.length >= 6 ? '✓' : '•'}</span>
            <span>Mínimo de 6 caracteres</span>
          </div>
          <div className={`flex items-center space-x-1.5 ${confirmPassword && password === confirmPassword ? 'text-emerald-400 font-medium' : ''}`}>
            <span>{confirmPassword && password === confirmPassword ? '✓' : '•'}</span>
            <span>Senhas são iguais</span>
          </div>
        </div>

        {/* Botão de Envio */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={loading || password.length < 6 || password !== confirmPassword}
            className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm transition-colors flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed group shadow-lg shadow-blue-600/20"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                <span>Atualizando Senha...</span>
              </>
            ) : (
              <span>Atualizar Senha</span>
            )}
          </button>
        </div>
      </form>

      {/* Voltar ao Login */}
      <div className="mt-6 pt-5 border-t border-gray-800 text-center">
        <Link
          href="/login"
          className="inline-flex items-center space-x-1.5 text-xs text-gray-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Voltar para a página de login</span>
        </Link>
      </div>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col justify-between relative selection:bg-blue-600 selection:text-white">
      {/* Background Decorativo Sutil */}
      <div className="absolute inset-0 z-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(37,99,235,0.15),rgba(255,255,255,0))]" />

      {/* Header */}
      <header className="relative z-10 w-full p-4 sm:p-6 flex items-center justify-between border-b border-gray-800/80 bg-gray-950/70 backdrop-blur-md">
        <Link href="/" className="flex items-center space-x-3 group">
          <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-600/30 group-hover:scale-105 transition-transform">
            <Calendar className="w-5 h-5" />
          </div>
          <span className="font-bold text-base sm:text-lg tracking-tight text-white">
            Barber<span className="text-blue-500">Shop</span>
          </span>
        </Link>

        <Link
          href="/login"
          className="flex items-center space-x-1.5 text-xs sm:text-sm text-gray-400 hover:text-white px-3 py-1.5 rounded-lg hover:bg-gray-800/80 border border-gray-800 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Login</span>
        </Link>
      </header>

      {/* Conteúdo Central */}
      <main className="relative z-10 flex-1 flex items-center justify-center p-4 sm:p-6">
        <Suspense
          fallback={
            <div className="flex flex-col items-center justify-center space-y-3 text-gray-400">
              <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
              <p className="text-sm">Carregando...</p>
            </div>
          }
        >
          <ResetPasswordContent />
        </Suspense>
      </main>

      {/* Footer */}
      <footer className="relative z-10 w-full py-4 text-center text-xs text-gray-500 border-t border-gray-800/80 bg-gray-950/70">
        <div className="flex items-center justify-center space-x-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>Redefinição de senha criptografada e segura</span>
        </div>
      </footer>
    </div>
  )
}
