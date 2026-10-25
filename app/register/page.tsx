'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import {
  Scissors,
  Building2,
  Mail,
  Phone,
  Lock,
  Eye,
  EyeOff,
  User,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowLeft,
  ShieldCheck,
  Check
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { ThemeToggle } from '@/components/theme-toggle'
import { maskPhone } from '@/lib/utils'
import AddressAutocomplete from '@/components/developer/AddressAutocomplete'

export default function RegisterPage() {
  const router = useRouter()

  const [formData, setFormData] = useState({
    establishmentName: '',
    establishmentEmail: '',
    establishmentPhone: '',
    establishmentAddress: '',
    adminName: '',
    adminEmail: '',
    adminPhone: '',
    password: '',
    confirmPassword: '',
  })

  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [acceptedTerms, setAcceptedTerms] = useState(false)
  const [acceptedPrivacy, setAcceptedPrivacy] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [isSuccess, setIsSuccess] = useState(false)
  const [registeredData, setRegisteredData] = useState<{
    establishmentName: string
    establishmentEmail: string
    adminName: string
    adminEmail: string
  } | null>(null)

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.title = 'Cadastre sua Empresa | BarberShop Cloud'
    }
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    if (name === 'establishmentPhone' || name === 'adminPhone') {
      setFormData((prev) => ({ ...prev, [name]: maskPhone(value) }))
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }))
    }
  }

  const handleAddressChange = (addressValue: string) => {
    setFormData((prev) => ({ ...prev, establishmentAddress: addressValue }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (
      !formData.establishmentName.trim() ||
      !formData.establishmentEmail.trim() ||
      !formData.establishmentPhone.trim() ||
      !formData.establishmentAddress.trim() ||
      !formData.adminName.trim() ||
      !formData.adminEmail.trim() ||
      !formData.adminPhone.trim() ||
      !formData.password.trim() ||
      !formData.confirmPassword.trim()
    ) {
      setError('Preencha todos os campos obrigatórios.')
      return
    }

    if (formData.password.length < 6) {
      setError('A senha deve ter no mínimo 6 caracteres.')
      return
    }

    if (formData.password !== formData.confirmPassword) {
      setError('A confirmação de senha não coincide.')
      return
    }

    if (!acceptedTerms || !acceptedPrivacy) {
      setError('É necessário aceitar os Termos de Serviço e a Política de Privacidade.')
      return
    }

    setLoading(true)

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'barbershop',
          name: formData.establishmentName.trim(),
          email: formData.establishmentEmail.trim(),
          phone: formData.establishmentPhone.trim(),
          address: formData.establishmentAddress.trim(),
          adminName: formData.adminName.trim(),
          adminEmail: formData.adminEmail.trim(),
          adminPhone: formData.adminPhone.trim(),
          password: formData.password,
        }),
      })

      const data = await res.json()

      if (!res.ok) throw new Error(data.error || 'Erro ao registrar.')

      if (data.token && data.user) {
        localStorage.setItem('auth_token', data.token)
        localStorage.setItem('user_data', JSON.stringify(data.user))
      }

      setRegisteredData({
        establishmentName: formData.establishmentName.trim(),
        establishmentEmail: formData.establishmentEmail.trim(),
        adminName: formData.adminName.trim(),
        adminEmail: formData.adminEmail.trim(),
      })
      setIsSuccess(true)
    } catch (err: any) {
      setError(err?.message || 'Falha ao enviar cadastro.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="grid min-h-svh lg:grid-cols-2 bg-background text-foreground selection:bg-primary selection:text-primary-foreground">
      {/* 1. COLUNA ESQUERDA: Formulário shadcn no mesmo padrão e layout do Login */}
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
            <ThemeToggle
              variant="outline"
              className="h-9 w-9 rounded-xl border border-border bg-card/80 text-foreground hover:bg-accent shadow-xs flex items-center justify-center cursor-pointer"
            />
          </div>
        </div>

        {/* Centro: Formulário Centralizado */}
        <div className="flex flex-1 items-center justify-center py-6 sm:py-8">
          <div className="w-full max-w-xl space-y-6">

            {isSuccess && registeredData ? (
              <Card className="border-border bg-card text-card-foreground shadow-sm animate-in fade-in zoom-in-95">
                <CardHeader className="text-center pb-4">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500 mb-2">
                    <CheckCircle2 className="h-7 w-7" />
                  </div>
                  <CardTitle className="text-2xl font-bold tracking-tight">Empresa cadastrada com sucesso!</CardTitle>
                  <CardDescription className="text-balance text-sm">
                    Seu estabelecimento foi configurado e seu período de avaliação gratuita está ativo.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="rounded-lg border border-border bg-muted/40 p-4 text-xs space-y-2.5">
                    <div className="flex justify-between items-center pb-2 border-b border-border">
                      <span className="text-muted-foreground">Estabelecimento:</span>
                      <strong className="text-foreground">{registeredData.establishmentName}</strong>
                    </div>
                    <div className="flex justify-between items-center pb-2 border-b border-border">
                      <span className="text-muted-foreground">E-mail:</span>
                      <span className="text-foreground">{registeredData.establishmentEmail}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Responsável Administrador:</span>
                      <span className="text-foreground font-medium">{registeredData.adminName}</span>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3 pt-2">
                    <Button
                      onClick={() => (window.location.href = '/dashboard')}
                      className="w-full h-10 font-semibold cursor-pointer"
                    >
                      Acessar Painel de Gestão
                    </Button>
                    <Button
                      variant="outline"
                      asChild
                      className="w-full h-10 cursor-pointer"
                    >
                      <Link href="/onboarding">Guia de Primeiros Passos</Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <>
                {/* Cabeçalho do Formulário */}
                <div className="flex flex-col items-center gap-2 text-center">
                  <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                    <Building2 className="h-3.5 w-3.5" />
                    <span>Novo Estabelecimento</span>
                  </div>
                  <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                    Cadastre sua Empresa
                  </h1>
                  <p className="text-balance text-sm text-muted-foreground max-w-md">
                    Crie a conta da sua barbearia e do usuário administrador para ter controle operacional completo.
                  </p>
                </div>

                {/* Alerta de Erro */}
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

                  {/* Seção 1: Estabelecimento */}
                  <div className="space-y-3.5">
                    <div className="flex items-center gap-2 border-b border-border pb-2">
                      <Building2 className="h-4 w-4 text-primary" />
                      <h2 className="text-sm font-semibold tracking-tight text-foreground">
                        Dados do Estabelecimento
                      </h2>
                    </div>

                    <div className="grid gap-3.5 sm:grid-cols-2">
                      <div className="grid gap-1.5 sm:col-span-2">
                        <Label htmlFor="establishmentName" className="text-sm font-medium">
                          Nome da Barbearia *
                        </Label>
                        <div className="relative">
                          <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="establishmentName"
                            name="establishmentName"
                            required
                            placeholder="Ex: Barbearia Vip Retrô"
                            value={formData.establishmentName}
                            onChange={handleChange}
                            className="pl-9 h-10"
                          />
                        </div>
                      </div>

                      <div className="grid gap-1.5">
                        <Label htmlFor="establishmentEmail" className="text-sm font-medium">
                          E-mail Comercial *
                        </Label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="establishmentEmail"
                            name="establishmentEmail"
                            type="email"
                            required
                            placeholder="contato@barbearia.com"
                            value={formData.establishmentEmail}
                            onChange={handleChange}
                            className="pl-9 h-10"
                          />
                        </div>
                      </div>

                      <div className="grid gap-1.5">
                        <Label htmlFor="establishmentPhone" className="text-sm font-medium">
                          Telefone / WhatsApp *
                        </Label>
                        <div className="relative">
                          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="establishmentPhone"
                            name="establishmentPhone"
                            required
                            placeholder="(DD) 99999-9999"
                            value={formData.establishmentPhone}
                            onChange={handleChange}
                            className="pl-9 h-10"
                          />
                        </div>
                      </div>

                      <div className="grid gap-1.5 sm:col-span-2">
                        <Label htmlFor="establishmentAddress" className="text-sm font-medium">
                          Endereço Completo (com Cidade e UF) *
                        </Label>
                        <AddressAutocomplete
                          id="establishmentAddress"
                          value={formData.establishmentAddress}
                          onChange={handleAddressChange}
                          placeholder="Ex: Av. Paulista, 1000 - Bela Vista, São Paulo, SP (ou digite sua cidade)"
                          required
                          className="h-10"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Seção 2: Administrador */}
                  <div className="space-y-3.5 pt-2">
                    <div className="flex items-center gap-2 border-b border-border pb-2">
                      <ShieldCheck className="h-4 w-4 text-primary" />
                      <h2 className="text-sm font-semibold tracking-tight text-foreground">
                        Dados do Administrador Responsável
                      </h2>
                    </div>

                    <div className="grid gap-3.5 sm:grid-cols-2">
                      <div className="grid gap-1.5 sm:col-span-2">
                        <Label htmlFor="adminName" className="text-sm font-medium">
                          Nome Completo *
                        </Label>
                        <div className="relative">
                          <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="adminName"
                            name="adminName"
                            required
                            placeholder="Nome do gestor ou proprietário"
                            value={formData.adminName}
                            onChange={handleChange}
                            className="pl-9 h-10"
                          />
                        </div>
                      </div>

                      <div className="grid gap-1.5">
                        <Label htmlFor="adminEmail" className="text-sm font-medium">
                          E-mail de Acesso *
                        </Label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="adminEmail"
                            name="adminEmail"
                            type="email"
                            required
                            placeholder="admin@barbearia.com"
                            value={formData.adminEmail}
                            onChange={handleChange}
                            className="pl-9 h-10"
                          />
                        </div>
                      </div>

                      <div className="grid gap-1.5">
                        <Label htmlFor="adminPhone" className="text-sm font-medium">
                          Telefone Pessoal *
                        </Label>
                        <div className="relative">
                          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="adminPhone"
                            name="adminPhone"
                            required
                            placeholder="(DD) 99999-9999"
                            value={formData.adminPhone}
                            onChange={handleChange}
                            className="pl-9 h-10"
                          />
                        </div>
                      </div>

                      <div className="grid gap-1.5">
                        <Label htmlFor="password" className="text-sm font-medium">
                          Senha *
                        </Label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="password"
                            name="password"
                            type={showPassword ? 'text' : 'password'}
                            required
                            placeholder="Mínimo 6 caracteres"
                            value={formData.password}
                            onChange={handleChange}
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

                      <div className="grid gap-1.5">
                        <Label htmlFor="confirmPassword" className="text-sm font-medium">
                          Confirmar Senha *
                        </Label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="confirmPassword"
                            name="confirmPassword"
                            type={showConfirmPassword ? 'text' : 'password'}
                            required
                            placeholder="Repita a senha"
                            value={formData.confirmPassword}
                            onChange={handleChange}
                            className="pl-9 pr-10 h-10"
                          />
                          <button
                            type="button"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                            title={showConfirmPassword ? 'Ocultar senha' : 'Exibir senha'}
                          >
                            {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Termos e Consentimento */}
                  <div className="rounded-lg border border-border bg-muted/30 p-3.5 space-y-2.5 text-xs text-muted-foreground mt-1">
                    <label className="flex items-start gap-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={acceptedTerms}
                        onChange={(e) => setAcceptedTerms(e.target.checked)}
                        className="mt-0.5 h-4 w-4 rounded border-input text-primary focus:ring-ring cursor-pointer accent-primary"
                        required
                      />
                      <span>
                        Li e aceito os{' '}
                        <Link href="/termos" target="_blank" className="font-semibold text-foreground underline underline-offset-4 hover:text-primary">
                          Termos de Serviço
                        </Link>{' '}
                        da plataforma <span className="text-destructive">*</span>
                      </span>
                    </label>

                    <label className="flex items-start gap-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={acceptedPrivacy}
                        onChange={(e) => setAcceptedPrivacy(e.target.checked)}
                        className="mt-0.5 h-4 w-4 rounded border-input text-primary focus:ring-ring cursor-pointer accent-primary"
                        required
                      />
                      <span>
                        Li e concordo com a{' '}
                        <Link href="/privacidade" target="_blank" className="font-semibold text-foreground underline underline-offset-4 hover:text-primary">
                          Política de Privacidade
                        </Link>{' '}
                        e tratamento de dados LGPD <span className="text-destructive">*</span>
                      </span>
                    </label>
                  </div>

                  {/* Botão de Envio */}
                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full h-10 font-semibold cursor-pointer mt-1"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        <span>Criando sua empresa...</span>
                      </>
                    ) : (
                      <span>Cadastrar Empresa e Iniciar Trial</span>
                    )}
                  </Button>
                </form>

                {/* Link para Login */}
                <div className="text-center text-sm text-muted-foreground pt-1">
                  Já possui uma empresa cadastrada?{' '}
                  <Link
                    href="/login"
                    className="font-semibold text-foreground underline underline-offset-4 hover:text-primary transition-colors"
                  >
                    Acesse sua conta
                  </Link>
                </div>
              </>
            )}

          </div>
        </div>
      </div>

      {/* 2. COLUNA DIREITA: Painel Visual Idêntico ao /login com Imagem Hero */}
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
        <div className="relative z-10 flex h-full flex-col justify-end p-10 text-white">

          {/* Destaques e Prova de Valor */}
          <div className="space-y-4 max-w-lg">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-semibold text-white">
                <Check className="h-4 w-4 text-emerald-400" />
                <span>7 dias de avaliação gratuita sem compromisso</span>
              </div>
              <div className="flex items-center gap-2 text-sm font-semibold text-white">
                <Check className="h-4 w-4 text-emerald-400" />
                <span>Página pública personalizada de agendamento online</span>
              </div>
              <div className="flex items-center gap-2 text-sm font-semibold text-white">
                <Check className="h-4 w-4 text-emerald-400" />
                <span>Gestão financeira, controle de barbeiros e comissões</span>
              </div>
            </div>

            <blockquote className="text-base font-medium leading-relaxed border-t border-white/15 pt-4 text-white/90">
              &ldquo;Modernize a operação da sua barbearia hoje mesmo com agenda inteligente, notificações automáticas e métricas em tempo real.&rdquo;
            </blockquote>
          </div>
        </div>
      </div>
    </div>
  )
}
