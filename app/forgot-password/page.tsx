'use client'

import { useState } from 'react'
import Link from 'next/link'
import { 
  Mail, 
  ArrowLeft, 
  Loader2, 
  CheckCircle2, 
  AlertCircle, 
  Calendar,
  Lock,
  ShieldCheck
} from 'lucide-react'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!email || !email.includes('@')) {
      setError('Por favor, informe um endereço de e-mail válido.')
      return
    }

    setLoading(true)

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Erro ao processar solicitação.')
        setLoading(false)
        return
      }

      setSuccess(
        data.message || 
        'Se o e-mail estiver cadastrado, você receberá instruções com o link para redefinir sua senha em instantes.'
      )
    } catch (err: any) {
      setError(err?.message || 'Falha de comunicação com o servidor.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col justify-between relative selection:bg-blue-600 selection:text-white">
      {/* Background Decorativo */}
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
          <span>Voltar ao Login</span>
        </Link>
      </header>

      {/* Conteúdo Central */}
      <main className="relative z-10 flex-1 flex items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-md bg-gray-900 border border-gray-800 rounded-2xl p-6 sm:p-8 shadow-xl space-y-6">
          <div className="text-center space-y-2">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30 mb-2">
              <Lock className="w-6 h-6" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white">
              Recuperar Acesso
            </h1>
            <p className="text-xs sm:text-sm text-gray-400">
              Digite seu e-mail cadastrado para receber o link de redefinição de senha
            </p>
          </div>

          {success ? (
            <div className="space-y-4 py-2 animate-in fade-in">
              <div className="p-4 rounded-xl bg-emerald-950/60 border border-emerald-700/50 text-emerald-200 text-xs sm:text-sm space-y-2">
                <div className="flex items-center gap-2 font-bold text-emerald-400">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>E-mail Enviado!</span>
                </div>
                <p className="leading-relaxed">
                  {success}
                </p>
                <p className="text-[11px] text-emerald-300/80">
                  Verifique também sua caixa de spam ou lixo eletrônico. O link é válido por 1 hora.
                </p>
              </div>

              <div className="pt-2">
                <Link
                  href="/login"
                  className="w-full py-3 px-4 rounded-xl bg-gray-800 hover:bg-gray-700 text-white text-xs sm:text-sm font-semibold transition flex items-center justify-center space-x-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Voltar para o Login</span>
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div 
                  role="alert"
                  className="p-3.5 rounded-xl bg-red-950/60 border border-red-800 text-red-200 text-xs sm:text-sm flex items-start space-x-2.5 animate-in fade-in"
                >
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  <div className="flex-1 leading-snug">{error}</div>
                </div>
              )}

              <div>
                <label 
                  htmlFor="email" 
                  className="block text-xs font-semibold uppercase tracking-wider text-gray-300 mb-1.5"
                >
                  E-mail Cadastrado
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    id="email"
                    type="email"
                    required
                    autoFocus
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seu.email@exemplo.com"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-gray-950 border border-gray-800 text-white placeholder-gray-500 text-sm focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading || !email}
                  className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm transition-colors flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-600/20"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      <span>Enviando link...</span>
                    </>
                  ) : (
                    <span>Enviar Link de Recuperação</span>
                  )}
                </button>
              </div>

              <div className="text-center pt-2">
                <Link
                  href="/login"
                  className="text-xs text-gray-400 hover:text-white transition-colors inline-flex items-center space-x-1"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Lembrou da senha? Entrar</span>
                </Link>
              </div>
            </form>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 w-full py-4 text-center text-xs text-gray-500 border-t border-gray-800/80 bg-gray-950/70">
        <div className="flex items-center justify-center space-x-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>Serviço seguro e criptografado de recuperação de conta</span>
        </div>
      </footer>
    </div>
  )
}
