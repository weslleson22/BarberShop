'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { 
  Scissors,
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  CheckCircle2, 
  AlertCircle,
  Loader2,
  ArrowLeft,
  Calendar,
  Sparkles
} from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ThemeToggle } from '@/components/theme-toggle'

/**
 * LoginPage - Padrão oficial shadcn/ui Login-04
 * Form em coluna dividida com imagem de fundo na lateral (Split Layout com form e imagem)
 * Totalmente integrado ao sistema de autenticação, RBAC e suporte a recuperação de senha.
 */
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

  // Carregar e-mail salvo anteriormente e checar status de reset
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.title = 'Entrar na Conta | BarberShop Cloud'
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
      // Ignora restrições de localStorage em navegação anônima estrita
    }
  }, [])

  // Disparo de recuperação de senha
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

  // Redirecionamento baseado no papel do usuário (RBAC)
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
    <div className="grid min-h-svh lg:grid-cols-2 bg-background text-foreground selection:bg-primary selection:text-primary-foreground">
      {/* 1. COLUNA ESQUERDA: Formulário oficial shadcn Login-04 */}
      <div className="flex flex-col gap-4 p-6 md:p-10">
        {/* Top Header: Logo Brand & Controles */}
        <div className="flex items-center justify-between">
          <Link 
            href="/" 
            className="flex items-center gap-2 font-semibold text-foreground tracking-tight hover:opacity-90 transition-opacity"
            title="BarberShop Cloud - Página Inicial"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
              <Scissors className="h-4 w-4" />
            </div>
            <span className="text-base font-bold">BarberShop<span className="text-primary">.</span></span>
          </Link>

          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors px-2.5 py-1.5 rounded-md hover:bg-muted"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Início</span>
            </Link>
            <ThemeToggle variant="ghost" size="sm" />
          </div>
        </div>

        {/* Centro: Card do Formulário Centralizado */}
        <div className="flex flex-1 items-center justify-center py-6 sm:py-10">
          <div className="w-full max-w-sm space-y-6">
            
            {/* Cabeçalho do Formulário */}
            <div className="flex flex-col items-center gap-2 text-center">
              <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                Acesse sua conta
              </h1>
              <p className="text-balance text-sm text-muted-foreground">
                Informe seu e-mail e senha para acessar o painel
              </p>
            </div>

            {/* Banner de Sucesso pós-redefinição de senha */}
            {resetSuccess && (
              <div 
                role="alert"
                className="p-3.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-sm flex items-start gap-3 animate-in fade-in"
              >
                <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                <div className="font-medium text-xs leading-relaxed">
                  Senha redefinida com sucesso! Você já pode entrar com sua nova senha.
                </div>
              </div>
            )}

            {/* Alerta de Erro de Autenticação */}
            {error && (
              <div 
                role="alert"
                className="p-3.5 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-sm flex items-start gap-3 animate-in fade-in"
              >
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <div className="font-medium text-xs leading-relaxed">{error}</div>
              </div>
            )}

            {/* Formulário Principal */}
            <form onSubmit={handleSubmit} className="grid gap-5">
              {/* Campo E-mail */}
              <div className="grid gap-2">
                <Label htmlFor="email" className="text-sm font-medium">
                  E-mail
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    name="email"
                    autoComplete="email"
                    required
                    placeholder="nome@exemplo.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-9 h-10"
                  />
                </div>
              </div>

              {/* Campo Senha */}
              <div className="grid gap-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-sm font-medium">
                    Senha
                  </Label>
                  <button
                    type="button"
                    onClick={() => {
                      setForgotEmail(email || '')
                      setForgotError('')
                      setForgotSuccess('')
                      setShowForgotModal(true)
                    }}
                    className="text-xs text-muted-foreground hover:text-primary transition-colors underline-offset-4 hover:underline cursor-pointer"
                  >
                    Esqueceu a senha?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-9 pr-10 h-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                    title={showPassword ? 'Ocultar senha' : 'Exibir senha'}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Checkbox Lembrar E-mail */}
              <div className="flex items-center space-x-2 pt-1">
                <input
                  type="checkbox"
                  id="remember"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 rounded border-input text-primary focus:ring-ring cursor-pointer accent-primary"
                />
                <Label htmlFor="remember" className="text-xs text-muted-foreground font-normal cursor-pointer">
                  Lembrar meu e-mail neste dispositivo
                </Label>
              </div>

              {/* Botão de Envio (Entrar) */}
              <Button type="submit" disabled={loading} className="w-full h-10 font-semibold cursor-pointer">
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    <span>Autenticando...</span>
                  </>
                ) : (
                  <span>Entrar na Conta</span>
                )}
              </Button>
            </form>

            {/* Cadastro & Link para Criar Conta */}
            <div className="text-center text-sm text-muted-foreground">
              Não possui uma conta?{' '}
              <Link 
                href="/register" 
                className="font-semibold text-foreground underline underline-offset-4 hover:text-primary transition-colors"
              >
                Cadastre-se
              </Link>
            </div>

            {/* Termos e Privacidade no Rodapé do Form */}
            <div className="text-balance text-center text-xs text-muted-foreground [&_a]:underline [&_a]:underline-offset-4 hover:[&_a]:text-primary pt-2">
              Ao continuar, você concorda com nossos{' '}
              <Link href="/termos">Termos de Serviço</Link> e{' '}
              <Link href="/privacidade">Política de Privacidade</Link>.
            </div>

          </div>
        </div>
      </div>

      {/* 2. COLUNA DIREITA: Painel Visual com Imagem em Alta Definição (shadcn login-04) */}
      <div className="relative hidden bg-muted lg:block overflow-hidden">
        <Image
          src="https://images.unsplash.com/photo-1585747860715-2ba37e788b70?auto=format&fit=crop&w=1200&q=80"
          alt="BarberShop Cloud Ambiance"
          fill
          priority
          sizes="(min-width: 1024px) 50vw, 100vw"
          className="absolute inset-0 h-full w-full object-cover dark:brightness-[0.6] dark:grayscale-0 transition-transform duration-700 hover:scale-105"
        />
        
        {/* Gradiente Escuro Sofisticado */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/20" />

        {/* Conteúdo sobreposto na imagem */}
        <div className="relative z-10 flex h-full flex-col justify-between p-10 text-white">
          {/* Badge Superior */}
          <div className="flex items-center gap-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-black/40 px-3.5 py-1 text-xs font-medium text-white backdrop-blur-md">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              <span>SaaS Multi-Tenant para Barbearias Modernas</span>
            </div>
          </div>

          {/* Citação / Prova Social Inferior */}
          <div className="space-y-4 max-w-lg">
            <blockquote className="text-lg font-medium leading-relaxed">
              &ldquo;Agendamentos em tempo real, automação de caixa e controle total de clientes em uma única plataforma intuitiva e elegante.&rdquo;
            </blockquote>
          </div>
        </div>
      </div>

      {/* 3. MODAL DE RECUPERAÇÃO DE SENHA (shadcn Dialog Design) */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md bg-card text-card-foreground border border-border rounded-xl p-6 shadow-2xl space-y-5 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Lock className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="font-bold text-foreground text-base">Redefinir Senha</h3>
                  <p className="text-xs text-muted-foreground">Recuperação segura via e-mail</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowForgotModal(false)}
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
              >
                ✕
              </Button>
            </div>

            {forgotSuccess ? (
              <div className="space-y-4 py-2">
                <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs sm:text-sm space-y-2">
                  <div className="flex items-center gap-2 font-bold text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                    <span>E-mail Enviado!</span>
                  </div>
                  <p className="leading-relaxed">{forgotSuccess}</p>
                  <p className="text-[11px] text-muted-foreground">
                    O link expira em 1 hora por segurança. Verifique também sua caixa de spam ou lixo eletrônico.
                  </p>
                </div>

                <Button
                  variant="outline"
                  onClick={() => setShowForgotModal(false)}
                  className="w-full"
                >
                  Entendido, voltar ao login
                </Button>
              </div>
            ) : (
              <form onSubmit={handleForgotSubmit} className="space-y-4">
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Informe o e-mail cadastrado na sua conta. Enviaremos um link de acesso seguro para você cadastrar uma nova senha.
                </p>

                {forgotError && (
                  <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-xs flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span className="leading-relaxed">{forgotError}</span>
                  </div>
                )}

                <div className="grid gap-2">
                  <Label htmlFor="forgot-email" className="text-xs font-semibold uppercase tracking-wider">
                    Seu E-mail Cadastrado:
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="forgot-email"
                      type="email"
                      required
                      autoFocus
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      placeholder="seu.email@exemplo.com"
                      className="pl-9 h-10"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2.5 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowForgotModal(false)}
                    className="w-1/2"
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    disabled={forgotLoading || !forgotEmail}
                    className="w-1/2"
                  >
                    {forgotLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        <span>Enviando...</span>
                      </>
                    ) : (
                      <span>Enviar Link</span>
                    )}
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
