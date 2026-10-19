'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { 
  ArrowLeft, 
  Home, 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  ShieldCheck, 
  AlertCircle,
  ArrowRight,
  Loader2
} from 'lucide-react'
import { useAuth } from '@/lib/auth-context'

export default function LoginPage() {
  const router = useRouter()
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [resetSuccess, setResetSuccess] = useState(false)

  // Estados do Modal "Esqueci minha senha"
  const [showForgotModal, setShowForgotModal] = useState(false)
  const [forgotEmail, setForgotEmail] = useState('')
  const [forgotLoading, setForgotLoading] = useState(false)
  const [forgotSuccess, setForgotSuccess] = useState('')
  const [forgotError, setForgotError] = useState('')

  // Carregar e-mail salvo anteriormente e checar reset bem-sucedido
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.title = 'Entrar na Conta | Agendamentos Online'
    }
    try {
      const savedEmail = localStorage.getItem('last_login_email')
      if (savedEmail) {
        setEmail(savedEmail)
      }
      const params = new URLSearchParams(window.location.search)
      if (params.get('reset') === 'success') {
        setResetSuccess(true)
      }
    } catch {
      // Ignora erro de acesso a localStorage
    }
  }, [])

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setForgotLoading(true)
    setForgotError('')
    setForgotSuccess('')

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail }),
      })

      const data = await res.json()

      if (res.ok && data.success) {
        setForgotSuccess(data.message || 'E-mail de recuperação enviado com sucesso!')
      } else {
        setForgotError(data.error || 'Erro ao enviar e-mail de recuperação.')
      }
    } catch {
      setForgotError('Erro de conexão ao solicitar recuperação de senha.')
    } finally {
      setForgotLoading(false)
    }
  }

  // Obter redirecionamento padrão baseado na role
  const getRedirectUrl = (userRole: string) => {
    const roleRedirect: Record<string, string> = {
      DEVELOPER: '/developer',
      ADMIN: '/dashboard',
      BARBER: '/dashboard',
      RECEPTIONIST: '/dashboard',
      CLIENT: '/meus-agendamentos',
    }
    
    return roleRedirect[userRole] || '/dashboard'
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      if (rememberMe && email) {
        try {
          localStorage.setItem('last_login_email', email)
        } catch {}
      } else {
        try {
          localStorage.removeItem('last_login_email')
        } catch {}
      }

      const result = await login(email, password)
      
      if (result.success) {
        const storedUserData = localStorage.getItem('user_data')
        let userRole = ''
        if (storedUserData) {
          try {
            userRole = JSON.parse(storedUserData)?.role || ''
          } catch {}
        }

        const urlParams = new URLSearchParams(window.location.search)
        const redirect = urlParams.get('redirect')
        
        const isBlockedDeveloperRoute =
          userRole === 'DEVELOPER' &&
          (redirect?.startsWith('/dashboard') ||
            redirect?.startsWith('/agenda') ||
            redirect?.startsWith('/clientes'))

        if (redirect && !isBlockedDeveloperRoute) {
          router.push(redirect)
        } else {
          router.push(getRedirectUrl(userRole))
        }
      } else {
        setError(result.error || 'Email ou senha incorretos')
      }
    } catch (err: any) {
      console.error('Erro no handleSubmit:', err)
      setError(err?.message || 'Erro de conexão com o servidor')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col justify-between relative font-sans selection:bg-blue-600 selection:text-white">
      {/* Barra superior de navegação rápida */}
      <header className="relative z-20 w-full px-6 py-4 flex items-center justify-between border-b border-gray-800 bg-gray-900">
        <div className="flex items-center space-x-2">
          <button
            onClick={() => router.back()}
            className="flex items-center space-x-2 text-gray-400 hover:text-white px-3 py-1.5 rounded-lg hover:bg-gray-800 border border-gray-800 transition-colors text-sm"
            title="Voltar à página anterior"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Voltar</span>
          </button>
          <Link
            href="/"
            className="flex items-center space-x-2 text-gray-400 hover:text-white px-3 py-1.5 rounded-lg hover:bg-gray-800 border border-gray-800 transition-colors text-sm"
            title="Página Inicial"
          >
            <Home className="w-4 h-4" />
            <span>Início</span>
          </Link>
        </div>
      </header>

      {/* Conteúdo Principal Dividido (Split Layout) */}
      <main className="relative z-10 flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <div className="w-full max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          
          {/* Coluna Esquerda: Apresentação da Plataforma de Agendamentos (Visível em lg+) */}
          <section className="hidden lg:flex lg:col-span-6 xl:col-span-7 flex-col justify-between space-y-8 pr-4">
            <div className="space-y-6">
              {/* Badge de Plataforma */}
              <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-md bg-gray-900 border border-gray-800 text-blue-400 text-xs font-semibold tracking-wide uppercase">
                <Calendar className="w-3.5 h-3.5 text-blue-400" />
                <span>Agendamentos Online</span>
              </div>

              {/* Título universal sólido */}
              <div className="space-y-3">
                <h1 className="text-4xl xl:text-5xl font-bold tracking-tight text-white leading-tight">
                  Seus agendamentos com rapidez,{' '}
                  <span className="text-blue-400">
                    pontualidade e praticidade.
                  </span>
                </h1>
                <p className="text-gray-400 text-base xl:text-lg leading-relaxed max-w-xl">
                  Acesse para agendar novos horários, acompanhar seus serviços marcados e receber notificações em tempo real com total comodidade.
                </p>
              </div>

              {/* Vitrine Visual: Preview da Plataforma de Agendamento */}
              <div className="relative rounded-xl border border-gray-800 bg-gray-900 p-4 shadow-sm overflow-hidden group">
                <div className="relative h-64 xl:h-72 w-full rounded-lg overflow-hidden bg-gray-950">
                  <Image
                    src="/images/scheduling-hero.jpg"
                    alt="Interface da Plataforma de Agendamentos"
                    fill
                    sizes="(max-width: 1024px) 100vw, 480px"
                    className="object-cover object-center"
                    priority
                  />
                  <div className="absolute inset-0 bg-black/40" />
                  
                  {/* Card Sólido Superior: Confirmação de Horário */}
                  <div className="absolute top-3 left-3 right-3 flex items-center justify-between bg-gray-900 border border-gray-800 rounded-lg p-3 shadow-md">
                    <div className="flex items-center space-x-3">
                      <div className="w-9 h-9 rounded-md bg-gray-800 border border-gray-700 flex items-center justify-center text-blue-400">
                        <Calendar className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-white">Horário Confirmado</div>
                        <div className="text-[11px] text-gray-400">Lembretes automáticos e atualizações</div>
                      </div>
                    </div>
                    <span className="flex items-center text-[11px] font-medium text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-2 py-0.5 rounded">
                      <CheckCircle2 className="w-3 h-3 mr-1" /> Confirmado
                    </span>
                  </div>

                  {/* Card Sólido Inferior: Próximo Atendimento */}
                  <div className="absolute bottom-3 left-3 right-3 bg-gray-900 border border-gray-800 rounded-lg p-3 shadow-md flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-9 h-9 rounded-md bg-gray-800 border border-gray-700 flex items-center justify-center text-indigo-400">
                        <Clock className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-white">Próximo Agendamento</div>
                        <div className="text-[11px] text-gray-400">Tudo pronto para o seu atendimento</div>
                      </div>
                    </div>
                    <span className="text-xs font-semibold text-blue-400 bg-gray-800 border border-gray-700 px-2.5 py-1 rounded">
                      14:30
                    </span>
                  </div>
                </div>
              </div>

              {/* Métricas e Benefícios em Pílulas Sólidas */}
              <div className="grid grid-cols-3 gap-3 pt-2">
                <div className="rounded-lg border border-gray-800 bg-gray-900 p-3">
                  <div className="flex items-center space-x-1.5 text-blue-400 text-xs font-medium mb-1">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Em poucos cliques</span>
                  </div>
                  <div className="text-sm font-semibold text-white">Agendamento Fácil</div>
                </div>

                <div className="rounded-lg border border-gray-800 bg-gray-900 p-3">
                  <div className="flex items-center space-x-1.5 text-cyan-400 text-xs font-medium mb-1">
                    <Clock className="w-3.5 h-3.5" />
                    <span>Notificações</span>
                  </div>
                  <div className="text-sm font-semibold text-white">Lembretes de Horário</div>
                </div>

                <div className="rounded-lg border border-gray-800 bg-gray-900 p-3">
                  <div className="flex items-center space-x-1.5 text-indigo-400 text-xs font-medium mb-1">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Acesso Seguro</span>
                  </div>
                  <div className="text-sm font-semibold text-white">Dados Protegidos</div>
                </div>
              </div>
            </div>
          </section>

          {/* Coluna Direita: Formulário de Autenticação */}
          <section className="col-span-12 lg:col-span-6 xl:col-span-5 flex justify-center">
            <div className="w-full max-w-md bg-gray-900 border border-gray-800 rounded-2xl p-6 sm:p-8 shadow-md">
              
              {/* Cabeçalho do Card */}
              <div className="text-center mb-6 sm:mb-8">
                {/* Logo da Plataforma */}
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-blue-600 text-white mb-4">
                  <Calendar className="w-6 h-6 text-white" />
                </div>

                <h2 className="text-2xl font-bold tracking-tight text-white">
                  Acesse sua conta
                </h2>
                <p className="mt-1.5 text-sm text-gray-400">
                  Informe seu e-mail e senha para acessar seus agendamentos
                </p>
              </div>

              {/* Banner de Sucesso pós-reset de senha */}
              {resetSuccess && (
                <div 
                  role="alert"
                  className="mb-6 p-3.5 rounded-lg bg-emerald-950/60 border border-emerald-700 text-emerald-200 text-sm flex items-start space-x-3 animate-in fade-in"
                >
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1 font-medium">
                    Senha redefinida com sucesso! Você já pode entrar com sua nova senha.
                  </div>
                </div>
              )}

              {/* Mensagem de Erro (Alerta Customizado) */}
              {error && (
                <div 
                  role="alert"
                  className="mb-6 p-3.5 rounded-lg bg-red-950/60 border border-red-800 text-red-200 text-sm flex items-start space-x-3"
                >
                  <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1 font-medium">{error}</div>
                </div>
              )}

              {/* Formulário */}
              <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
                {/* Campo de E-mail */}
                <div>
                  <label htmlFor="email" className="block text-xs font-semibold uppercase tracking-wider text-gray-300 mb-1.5">
                    E-mail
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                      <Mail className="w-4 h-4" />
                    </div>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="seu.email@exemplo.com"
                      className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-gray-950 border border-gray-800 text-white placeholder-gray-500 text-sm focus:outline-none focus:border-blue-500 transition-colors"
                    />
                  </div>
                </div>

                {/* Campo de Senha */}
                <div>
                  <label htmlFor="password" className="block text-xs font-semibold uppercase tracking-wider text-gray-300 mb-1.5">
                    Senha
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      id="password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-10 pr-11 py-2.5 rounded-lg bg-gray-950 border border-gray-800 text-white placeholder-gray-500 text-sm focus:outline-none focus:border-blue-500 transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-white transition-colors"
                      title={showPassword ? 'Ocultar senha' : 'Ver senha'}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Opção Lembrar E-mail */}
                <div className="flex items-center justify-between pt-1 text-xs">
                  <label className="flex items-center space-x-2 text-gray-400 cursor-pointer select-none hover:text-gray-300">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="w-4 h-4 rounded border-gray-700 bg-gray-950 text-blue-600 focus:ring-0 cursor-pointer"
                    />
                    <span>Lembrar meu e-mail</span>
                  </label>

                  <button
                    type="button"
                    onClick={() => {
                      setForgotEmail(email || '')
                      setForgotError('')
                      setForgotSuccess('')
                      setShowForgotModal(true)
                    }}
                    className="text-blue-400 hover:text-blue-300 font-medium transition-colors cursor-pointer"
                  >
                    Esqueceu a senha?
                  </button>
                </div>

                {/* Botão de Envio (Entrar) */}
                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 px-4 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium text-sm transition-colors flex items-center justify-center space-x-2 disabled:opacity-60 disabled:cursor-not-allowed group"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        <span>Acessando...</span>
                      </>
                    ) : (
                      <>
                        <span>Entrar na Conta</span>
                        <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-0.5 transition-transform" />
                      </>
                    )}
                  </button>
                </div>
              </form>

              {/* Rodapé do Card: Criar Conta */}
              <div className="mt-8 pt-6 border-t border-gray-800 text-center space-y-3">
                <p className="text-sm text-gray-400">
                  Novo por aqui?{' '}
                  <Link 
                    href="/register" 
                    className="font-medium text-blue-400 hover:text-blue-300 underline-offset-4 hover:underline transition-colors"
                  >
                    Criar uma conta
                  </Link>
                </p>

                <div className="flex items-center justify-center space-x-1.5 text-[11px] text-gray-500">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Ambiente seguro e protegido</span>
                </div>
              </div>
            </div>
          </section>

        </div>

        {/* Modal de Recuperação de Senha via Resend */}
        {showForgotModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
            <div className="w-full max-w-md bg-gray-900 border border-gray-800 rounded-2xl p-6 sm:p-7 shadow-2xl space-y-5 animate-in zoom-in-95">
              <div className="flex items-center justify-between border-b border-gray-800 pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-blue-600/20 text-blue-400 flex items-center justify-center border border-blue-500/30">
                    <Lock className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-base">Redefinir Senha</h3>
                    <p className="text-xs text-gray-400">Recuperação segura via e-mail</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowForgotModal(false)}
                  className="text-gray-400 hover:text-white text-sm px-2 py-1 rounded-lg hover:bg-gray-800 transition"
                >
                  ✕
                </button>
              </div>

              {forgotSuccess ? (
                <div className="space-y-4 py-2">
                  <div className="p-4 rounded-xl bg-emerald-950/60 border border-emerald-700/50 text-emerald-200 text-xs sm:text-sm space-y-2">
                    <div className="flex items-center gap-2 font-bold text-emerald-400">
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                      <span>E-mail Enviado!</span>
                    </div>
                    <p className="leading-relaxed">
                      {forgotSuccess}
                    </p>
                    <p className="text-[11px] text-emerald-300/80">
                      O link expira em 1 hora por segurança. Verifique também sua caixa de spam ou lixo eletrônico.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowForgotModal(false)}
                    className="w-full py-2.5 px-4 rounded-xl bg-gray-800 hover:bg-gray-700 text-white text-xs font-bold transition"
                  >
                    Entendido, voltar ao login
                  </button>
                </div>
              ) : (
                <form onSubmit={handleForgotSubmit} className="space-y-4">
                  <p className="text-xs text-gray-300 leading-relaxed">
                    Informe o e-mail cadastrado na sua conta. Enviaremos um link de acesso seguro para você cadastrar uma nova senha.
                  </p>

                  {forgotError && (
                    <div className="p-3 rounded-xl bg-red-950/60 border border-red-800 text-red-300 text-xs flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span className="leading-relaxed">{forgotError}</span>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-semibold text-gray-300 mb-1.5 uppercase tracking-wider">
                      Seu E-mail Cadastrado:
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                        <Mail className="w-4 h-4" />
                      </div>
                      <input
                        type="email"
                        required
                        autoFocus
                        value={forgotEmail}
                        onChange={(e) => setForgotEmail(e.target.value)}
                        placeholder="seu.email@exemplo.com"
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-gray-950 border border-gray-800 text-white placeholder-gray-500 text-sm focus:outline-none focus:border-blue-500 font-sans"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowForgotModal(false)}
                      className="w-1/2 py-2.5 px-4 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-semibold transition"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={forgotLoading || !forgotEmail}
                      className="w-1/2 py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {forgotLoading ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Enviando...</span>
                        </>
                      ) : (
                        <span>Enviar Link</span>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Rodapé Simples */}
      <footer className="relative z-10 w-full py-4 text-center text-xs text-gray-500 border-t border-gray-800 bg-gray-900">
        Plataforma de Agendamentos &bull; Acesso para Clientes e Profissionais
      </footer>
    </div>
  )
}
