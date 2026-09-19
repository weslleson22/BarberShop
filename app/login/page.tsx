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
  Sparkles, 
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

  // Carregar e-mail salvo anteriormente, se houver
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.title = 'Entrar na Conta | Agendamentos Online'
    }
    try {
      const savedEmail = localStorage.getItem('last_login_email')
      if (savedEmail) {
        setEmail(savedEmail)
      }
    } catch {
      // Ignora erro de acesso a localStorage
    }
  }, [])

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
    <div className="min-h-screen bg-[#090D16] text-white flex flex-col justify-between relative overflow-hidden font-sans selection:bg-blue-500 selection:text-white">
      {/* Luzes de ambientação de fundo */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-blue-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 -right-40 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 left-1/3 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Barra superior de navegação rápida */}
      <header className="relative z-20 w-full px-6 py-4 flex items-center justify-between border-b border-white/5 bg-slate-950/40 backdrop-blur-md">
        <div className="flex items-center space-x-2">
          <button
            onClick={() => router.back()}
            className="flex items-center space-x-2 text-slate-400 hover:text-white px-3 py-1.5 rounded-lg hover:bg-white/5 border border-transparent hover:border-white/10 transition-all text-sm"
            title="Voltar à página anterior"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Voltar</span>
          </button>
          <Link
            href="/"
            className="flex items-center space-x-2 text-slate-400 hover:text-white px-3 py-1.5 rounded-lg hover:bg-white/5 border border-transparent hover:border-white/10 transition-all text-sm"
            title="Página Inicial"
          >
            <Home className="w-4 h-4" />
            <span>Início</span>
          </Link>
        </div>

        <div className="flex items-center space-x-2 text-xs text-slate-400">
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>Sistema Operacional & Online</span>
        </div>
      </header>

      {/* Conteúdo Principal Dividido (Split Layout) */}
      <main className="relative z-10 flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <div className="w-full max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          
          {/* Coluna Esquerda: Apresentação da Plataforma de Agendamentos (Visível em lg+) */}
          <section className="hidden lg:flex lg:col-span-6 xl:col-span-7 flex-col justify-between space-y-8 pr-4">
            <div className="space-y-6">
              {/* Badge de Plataforma */}
              <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold tracking-wide uppercase">
                <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                <span>Agendamentos Online</span>
              </div>

              {/* Título de impacto universal */}
              <div className="space-y-3">
                <h1 className="text-4xl xl:text-5xl font-black tracking-tight text-white leading-tight">
                  Seus agendamentos com rapidez,{' '}
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-cyan-300 to-indigo-400">
                    pontualidade e praticidade.
                  </span>
                </h1>
                <p className="text-slate-400 text-base xl:text-lg leading-relaxed max-w-xl">
                  Acesse para agendar novos horários, acompanhar seus serviços marcados e receber notificações em tempo real com total comodidade.
                </p>
              </div>

              {/* Vitrine Visual: Preview da Plataforma de Agendamento */}
              <div className="relative rounded-2xl border border-white/10 bg-gradient-to-b from-slate-900/80 to-slate-950/90 p-4 shadow-2xl shadow-blue-950/40 backdrop-blur-xl overflow-hidden group">
                <div className="relative h-64 xl:h-72 w-full rounded-xl overflow-hidden">
                  <Image
                    src="/images/scheduling-hero.jpg"
                    alt="Interface da Plataforma de Agendamentos"
                    fill
                    className="object-cover object-center group-hover:scale-105 transition-transform duration-700"
                    priority
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/30 to-transparent" />
                  
                  {/* Card Flutuante Superior: Confirmação de Horário */}
                  <div className="absolute top-3 left-3 right-3 flex items-center justify-between bg-slate-900/90 border border-white/15 backdrop-blur-md rounded-xl p-3 shadow-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-9 h-9 rounded-lg bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-400">
                        <Calendar className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-white">Horário Confirmado</div>
                        <div className="text-[11px] text-slate-400">Lembretes automáticos e atualizações</div>
                      </div>
                    </div>
                    <span className="flex items-center text-[11px] font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                      <CheckCircle2 className="w-3 h-3 mr-1" /> Confirmado
                    </span>
                  </div>

                  {/* Card Flutuante Inferior: Próximo Atendimento */}
                  <div className="absolute bottom-3 left-3 right-3 bg-slate-900/90 border border-white/15 backdrop-blur-md rounded-xl p-3 shadow-lg flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-9 h-9 rounded-lg bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-400">
                        <Clock className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-white">Próximo Agendamento</div>
                        <div className="text-[11px] text-slate-400">Tudo pronto para o seu atendimento</div>
                      </div>
                    </div>
                    <span className="text-xs font-bold text-blue-300 bg-blue-500/20 border border-blue-500/30 px-2.5 py-1 rounded-lg">
                      14:30
                    </span>
                  </div>
                </div>
              </div>

              {/* Métricas e Benefícios em Pílulas */}
              <div className="grid grid-cols-3 gap-3 pt-2">
                <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3 backdrop-blur-sm">
                  <div className="flex items-center space-x-1.5 text-blue-400 text-xs font-medium mb-1">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Em poucos cliques</span>
                  </div>
                  <div className="text-sm font-semibold text-white">Agendamento Fácil</div>
                </div>

                <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3 backdrop-blur-sm">
                  <div className="flex items-center space-x-1.5 text-cyan-400 text-xs font-medium mb-1">
                    <Clock className="w-3.5 h-3.5" />
                    <span>Notificações</span>
                  </div>
                  <div className="text-sm font-semibold text-white">Lembretes de Horário</div>
                </div>

                <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3 backdrop-blur-sm">
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
            <div className="w-full max-w-md bg-slate-900/70 border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-black/60 backdrop-blur-2xl relative">
              
              {/* Cabeçalho do Card */}
              <div className="text-center mb-6 sm:mb-8">
                {/* Logo da Plataforma */}
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 via-blue-500 to-cyan-400 p-0.5 shadow-lg shadow-blue-500/25 mb-4">
                  <div className="w-full h-full bg-[#0B1120] rounded-[14px] flex items-center justify-center">
                    <Calendar className="w-7 h-7 text-blue-400" />
                  </div>
                </div>

                <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
                  Acesse sua conta
                </h2>
                <p className="mt-2 text-sm text-slate-400">
                  Informe seu e-mail e senha para acessar seus agendamentos
                </p>
              </div>

              {/* Mensagem de Erro (Alerta Customizado) */}
              {error && (
                <div 
                  role="alert"
                  className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-200 text-sm flex items-start space-x-3 animate-in fade-in duration-300"
                >
                  <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1 font-medium">{error}</div>
                </div>
              )}

              {/* Formulário */}
              <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
                {/* Campo de E-mail */}
                <div>
                  <label htmlFor="email" className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                    E-mail
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
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
                      className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-950/60 border border-slate-700/80 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
                    />
                  </div>
                </div>

                {/* Campo de Senha */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label htmlFor="password" className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                      Senha
                    </label>
                  </div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
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
                      className="w-full pl-10 pr-11 py-3 rounded-xl bg-slate-950/60 border border-slate-700/80 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-white transition-colors"
                      title={showPassword ? 'Ocultar senha' : 'Ver senha'}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Opção Lembrar E-mail */}
                <div className="flex items-center justify-between pt-1 text-xs">
                  <label className="flex items-center space-x-2 text-slate-400 cursor-pointer select-none hover:text-slate-300">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="w-4 h-4 rounded border-slate-700 bg-slate-950 text-blue-600 focus:ring-blue-500/40 focus:ring-offset-0 focus:ring-offset-transparent cursor-pointer"
                    />
                    <span>Lembrar meu e-mail</span>
                  </label>

                  <span className="text-slate-500 hover:text-slate-400 cursor-help" title="Entre em contato com o suporte ou gestor se esqueceu sua senha">
                    Ajuda com acesso?
                  </span>
                </div>

                {/* Botão de Envio (Entrar) */}
                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-semibold text-sm shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 focus:outline-none focus:ring-2 focus:ring-blue-400/50 transition-all duration-200 flex items-center justify-center space-x-2 disabled:opacity-60 disabled:cursor-not-allowed group"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        <span>Acessando...</span>
                      </>
                    ) : (
                      <>
                        <span>Entrar na Conta</span>
                        <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                      </>
                    )}
                  </button>
                </div>
              </form>

              {/* Rodapé do Card: Criar Conta */}
              <div className="mt-8 pt-6 border-t border-white/10 text-center space-y-3">
                <p className="text-sm text-slate-400">
                  Novo por aqui?{' '}
                  <Link 
                    href="/register" 
                    className="font-semibold text-blue-400 hover:text-blue-300 underline-offset-4 hover:underline transition-colors"
                  >
                    Criar uma conta
                  </Link>
                </p>

                <div className="flex items-center justify-center space-x-1.5 text-[11px] text-slate-500">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400/80" />
                  <span>Ambiente seguro e protegido</span>
                </div>
              </div>
            </div>
          </section>

        </div>
      </main>

      {/* Rodapé Simples */}
      <footer className="relative z-10 w-full py-4 text-center text-xs text-slate-500 border-t border-white/5 bg-slate-950/40">
        Plataforma de Agendamentos &bull; Acesso para Clientes e Profissionais
      </footer>
    </div>
  )
}
