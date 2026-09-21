'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  Home,
  Building2,
  ShieldCheck,
  Mail,
  Phone,
  MapPin,
  Lock,
  Eye,
  EyeOff,
  User,
  CheckCircle2,
  Clock,
  Sparkles,
  AlertCircle,
  Loader2,
  ArrowRight,
} from 'lucide-react'
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
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [isSuccess, setIsSuccess] = useState(false)
  const [registeredData, setRegisteredData] = useState<{
    establishmentName: string
    establishmentEmail: string
    adminName: string
    adminEmail: string
  } | null>(null)

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

    // Validação estrita de todos os campos obrigatórios
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
      setError('Por favor, preencha todos os campos obrigatórios antes de continuar.')
      return
    }

    if (formData.password.length < 6) {
      setError('A senha deve possuir pelo menos 6 caracteres.')
      return
    }

    if (formData.password !== formData.confirmPassword) {
      setError('A confirmação de senha não coincide com a senha digitada.')
      return
    }

    setLoading(true)

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
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

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao realizar cadastro.')
      }

      setRegisteredData({
        establishmentName: formData.establishmentName.trim(),
        establishmentEmail: formData.establishmentEmail.trim(),
        adminName: formData.adminName.trim(),
        adminEmail: formData.adminEmail.trim(),
      })
      setIsSuccess(true)
    } catch (err: any) {
      console.error('Registration submit error:', err)
      setError(err?.message || 'Não foi possível enviar sua solicitação. Verifique sua conexão e tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  // TELA DE SUCESSO / CONFIRMAÇÃO DE AGUARDANDO APROVAÇÃO
  if (isSuccess && registeredData) {
    return (
      <div className="min-h-screen bg-[#090D16] text-white flex flex-col justify-between relative overflow-hidden font-sans selection:bg-amber-500 selection:text-black">
        {/* Luzes de ambientação de fundo */}
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-amber-600/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-1/2 -right-40 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-40 left-1/3 w-96 h-96 bg-amber-600/10 rounded-full blur-3xl pointer-events-none" />

        <header className="relative z-20 w-full px-6 py-4 flex items-center justify-between border-b border-white/5 bg-slate-950/40 backdrop-blur-md">
          <div className="flex items-center space-x-2">
            <Link
              href="/"
              className="flex items-center space-x-2 text-slate-400 hover:text-white px-3 py-1.5 rounded-lg hover:bg-white/5 border border-transparent hover:border-white/10 transition-all text-sm"
            >
              <Home className="w-4 h-4" />
              <span>Início</span>
            </Link>
          </div>
          <div className="flex items-center space-x-2 text-xs text-amber-400 font-medium px-3 py-1 bg-amber-500/10 border border-amber-500/20 rounded-full">
            <Clock className="w-3.5 h-3.5 animate-pulse" />
            <span>Solicitação em Análise</span>
          </div>
        </header>

        <main className="relative z-10 flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8">
          <div className="w-full max-w-xl bg-slate-900/70 border border-amber-500/30 rounded-2xl p-6 sm:p-8 backdrop-blur-xl shadow-2xl shadow-amber-500/10 text-center">
            <div className="w-16 h-16 bg-gradient-to-tr from-amber-500/20 to-amber-400/10 border border-amber-500/30 rounded-2xl mx-auto flex items-center justify-center mb-6 shadow-inner">
              <Clock className="w-8 h-8 text-amber-400" />
            </div>

            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20 mb-3">
              Cadastro Aguardando Aprovação
            </span>

            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight mb-3">
              Solicitação Enviada com Sucesso!
            </h1>

            <p className="text-slate-300 text-sm sm:text-base leading-relaxed mb-6 max-w-md mx-auto">
              Sua solicitação de cadastro foi registrada e está aguardando liberação pelo time técnico da plataforma.
            </p>

            <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 text-left mb-6 space-y-2.5 text-xs sm:text-sm">
              <div className="flex justify-between items-center py-1 border-b border-slate-800/80">
                <span className="text-slate-400">Estabelecimento:</span>
                <span className="text-white font-semibold">{registeredData.establishmentName}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-slate-800/80">
                <span className="text-slate-400">E-mail Comercial:</span>
                <span className="text-slate-300 font-mono">{registeredData.establishmentEmail}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-slate-800/80">
                <span className="text-slate-400">Responsável:</span>
                <span className="text-white font-semibold">{registeredData.adminName}</span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-slate-400">E-mail de Acesso:</span>
                <span className="text-amber-400 font-mono font-medium">{registeredData.adminEmail}</span>
              </div>
            </div>

            <div className="p-3.5 bg-amber-950/30 border border-amber-500/20 rounded-xl text-amber-300 text-xs text-left mb-6 flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <strong>Atenção:</strong> Por motivos de governança e segurança, seu login será liberado assim que o desenvolvedor aprovar o contrato e os acessos da sua empresa.
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                href="/login"
                className="flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-black font-semibold rounded-xl text-sm transition-all shadow-lg shadow-amber-500/20 hover:scale-[1.02]"
              >
                <span>Ir para a Página de Login</span>
                <ArrowRight className="w-4 h-4 stroke-[2.5]" />
              </Link>
              <Link
                href="/"
                className="flex items-center justify-center gap-2 px-5 py-3 bg-slate-800/80 hover:bg-slate-700/80 text-slate-200 hover:text-white font-medium rounded-xl text-sm border border-slate-700 transition-all"
              >
                <Home className="w-4 h-4" />
                <span>Página Inicial</span>
              </Link>
            </div>
          </div>
        </main>

        <footer className="relative z-10 w-full py-4 px-6 border-t border-white/5 bg-slate-950/20 text-center text-xs text-slate-500">
          Plataforma de Agendamento Inteligente SaaS &bull; Todos os direitos reservados.
        </footer>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#090D16] text-white flex flex-col justify-between relative overflow-hidden font-sans selection:bg-amber-500 selection:text-black">
      {/* Luzes de ambientação de fundo */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-blue-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/3 -right-40 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 left-1/3 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header com navegação */}
      <header className="relative z-20 w-full px-6 py-4 flex items-center justify-between border-b border-white/5 bg-slate-950/40 backdrop-blur-md">
        <div className="flex items-center space-x-2">
          <button
            onClick={() => router.back()}
            className="flex items-center space-x-2 text-slate-400 hover:text-white px-3 py-1.5 rounded-lg hover:bg-white/5 border border-transparent hover:border-white/10 transition-all text-sm cursor-pointer"
            title="Voltar à página anterior"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Voltar</span>
          </button>
          <Link
            href="/"
            className="flex items-center space-x-2 text-slate-400 hover:text-white px-3 py-1.5 rounded-lg hover:bg-white/5 border border-transparent hover:border-white/10 transition-all text-sm"
            title="Ir para a página inicial"
          >
            <Home className="w-4 h-4" />
            <span>Home</span>
          </Link>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-400 hidden sm:inline">Já tem uma conta?</span>
          <Link
            href="/login"
            className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-white/5 hover:bg-white/10 text-white border border-white/10 transition-all"
          >
            Fazer Login
          </Link>
        </div>
      </header>

      {/* Conteúdo Principal do Cadastro */}
      <main className="relative z-10 flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <div className="w-full max-w-3xl bg-slate-900/60 border border-white/10 rounded-2xl p-6 sm:p-8 backdrop-blur-xl shadow-2xl">
          {/* Título e Apresentação */}
          <div className="text-center max-w-lg mx-auto mb-8">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20 mb-3">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Novo Estabelecimento</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Cadastre sua Empresa
            </h1>
            <p className="text-slate-400 text-sm mt-2">
              Preencha os dados do seu estabelecimento e crie o usuário gestor da unidade. Após o envio, seu cadastro passará pela aprovação do desenvolvedor.
            </p>
          </div>

          {/* Feedback de Erro */}
          {error && (
            <div className="mb-6 p-4 rounded-xl bg-red-950/40 border border-red-500/30 text-red-200 text-sm flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
              <div className="flex-1">{error}</div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* SEÇÃO 1: DADOS DO ESTABELECIMENTO */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
                <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  <Building2 className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-white">1. Informações do Estabelecimento</h2>
                  <p className="text-xs text-slate-400">Dados da empresa e localização para atendimento</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Nome da Empresa / Unidade <span className="text-amber-400">*</span>
                  </label>
                  <div className="relative">
                    <Building2 className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      name="establishmentName"
                      required
                      placeholder="Ex: Barbearia Elegance Premium"
                      value={formData.establishmentName}
                      onChange={handleChange}
                      className="w-full pl-10 pr-3 py-2.5 bg-slate-950/70 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    E-mail Comercial <span className="text-amber-400">*</span>
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      name="establishmentEmail"
                      required
                      placeholder="contato@empresa.com"
                      value={formData.establishmentEmail}
                      onChange={handleChange}
                      className="w-full pl-10 pr-3 py-2.5 bg-slate-950/70 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Telefone Comercial / WhatsApp <span className="text-amber-400">*</span>
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="tel"
                      name="establishmentPhone"
                      required
                      placeholder="(11) 98765-4321"
                      value={formData.establishmentPhone}
                      onChange={handleChange}
                      className="w-full pl-10 pr-3 py-2.5 bg-slate-950/70 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Endereço Completo <span className="text-amber-400">*</span>
                  </label>
                  <AddressAutocomplete
                    id="establishmentAddress"
                    value={formData.establishmentAddress}
                    onChange={handleAddressChange}
                    required
                    placeholder="Rua, número, bairro, cidade - UF"
                    className="w-full pl-10 pr-3 py-2.5 bg-slate-950/70 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition"
                  />
                </div>
              </div>
            </div>

            {/* SEÇÃO 2: DADOS DO ADMINISTRADOR */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
                <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-white">2. Dados do Administrador Responsável</h2>
                  <p className="text-xs text-slate-400">Credenciais para gerenciar a agenda, equipe e atendimentos</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Nome Completo do Responsável <span className="text-amber-400">*</span>
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      name="adminName"
                      required
                      placeholder="Nome do administrador"
                      value={formData.adminName}
                      onChange={handleChange}
                      className="w-full pl-10 pr-3 py-2.5 bg-slate-950/70 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    E-mail de Acesso <span className="text-amber-400">*</span>
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      name="adminEmail"
                      required
                      placeholder="admin@empresa.com"
                      value={formData.adminEmail}
                      onChange={handleChange}
                      className="w-full pl-10 pr-3 py-2.5 bg-slate-950/70 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition"
                    />
                  </div>
                  <span className="text-[11px] text-slate-500 mt-1 block">
                    Este será seu e-mail de login na plataforma.
                  </span>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Telefone Pessoal / WhatsApp <span className="text-amber-400">*</span>
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="tel"
                      name="adminPhone"
                      required
                      placeholder="(11) 98765-4321"
                      value={formData.adminPhone}
                      onChange={handleChange}
                      className="w-full pl-10 pr-3 py-2.5 bg-slate-950/70 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Senha de Acesso <span className="text-amber-400">*</span>
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      name="password"
                      required
                      placeholder="Mínimo de 6 caracteres"
                      value={formData.password}
                      onChange={handleChange}
                      className="w-full pl-10 pr-10 py-2.5 bg-slate-950/70 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Confirmar Senha <span className="text-amber-400">*</span>
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      name="confirmPassword"
                      required
                      placeholder="Repita sua senha"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      className="w-full pl-10 pr-10 py-2.5 bg-slate-950/70 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition"
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* AVISO DE APROVAÇÃO */}
            <div className="p-4 rounded-xl bg-slate-950/80 border border-amber-500/20 text-xs text-slate-300 flex items-start gap-3">
              <Clock className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <strong className="text-amber-400">Processo de Aprovação:</strong> Ao enviar seu cadastro, seus dados serão encaminhados para validação técnica pelo desenvolvedor. Assim que aprovado, seu login será liberado imediatamente.
              </div>
            </div>

            {/* BOTÃO DE SUBMIT */}
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3.5 px-6 rounded-xl text-sm font-semibold text-black bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 shadow-lg shadow-amber-500/20 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Enviando solicitação...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
                  <span>Solicitar Cadastro e Acesso</span>
                </>
              )}
            </button>

            <div className="text-center pt-2">
              <p className="text-xs text-slate-400">
                Já possui uma empresa cadastrada?{' '}
                <Link href="/login" className="text-amber-400 hover:text-amber-300 font-medium transition">
                  Acesse sua conta
                </Link>
              </p>
            </div>
          </form>
        </div>
      </main>

      {/* Rodapé Simples */}
      <footer className="relative z-10 w-full py-4 px-6 border-t border-white/5 bg-slate-950/20 text-center text-xs text-slate-500">
        Plataforma de Agendamento Inteligente SaaS &bull; Gestão profissional e simplificada.
      </footer>
    </div>
  )
}
