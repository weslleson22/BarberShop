'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import DropdownHeader from '@/components/shared/DropdownHeader'
import { useAuth } from '@/lib/auth-context'
import { getAuthHeaders } from '@/lib/utils'
import {
  CheckCircle2,
  Circle,
  Building,
  Image as ImageIcon,
  Scissors,
  Users,
  Clock,
  Settings,
  Globe,
  CalendarCheck,
  ArrowRight,
  ExternalLink,
  Copy,
  Check,
  Sparkles,
  RefreshCw,
  Upload,
  Camera,
  Trash2,
  X,
  AlertCircle
} from 'lucide-react'

interface OnboardingStep {
  id: number
  title: string
  description: string
  completed: boolean
  actionText: string
  actionUrl: string
  onClick?: () => void
  icon: any
}

export default function OnboardingPage() {
  const { user, updateUser, loading: authLoading } = useAuth()
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [barbershop, setBarbershop] = useState<any>(null)
  const [servicesCount, setServicesCount] = useState(0)
  const [barbersCount, setBarbersCount] = useState(0)
  const [appointmentsCount, setAppointmentsCount] = useState(0)

  // Estados do Modal de Upload de Logo
  const [isLogoModalOpen, setIsLogoModalOpen] = useState(false)
  const [logoPreview, setLogoPreview] = useState('')
  const [isSavingLogo, setIsSavingLogo] = useState(false)
  const [logoError, setLogoError] = useState('')
  const [logoSuccess, setLogoSuccess] = useState('')

  useEffect(() => {
    if (!authLoading && user?.role === 'DEVELOPER') {
      router.replace('/developer/onboarding')
    }
  }, [user, authLoading, router])

  const loadOnboardingData = async () => {
    setLoading(true)
    try {
      const headers = getAuthHeaders()

      const [shopRes, servicesRes, barbersRes, appRes] = await Promise.all([
        fetch('/api/barbershop', { credentials: 'include', headers }).catch(() => null),
        fetch('/api/services', { credentials: 'include', headers }).catch(() => null),
        fetch('/api/users?role=BARBER', { credentials: 'include', headers }).catch(() => null),
        fetch('/api/appointments', { credentials: 'include', headers }).catch(() => null),
      ])

      if (shopRes && shopRes.ok) {
        const shop = await shopRes.json()
        setBarbershop(shop)
      }

      if (servicesRes && servicesRes.ok) {
        const serv = await servicesRes.json()
        setServicesCount(Array.isArray(serv) ? serv.length : 0)
      }

      if (barbersRes && barbersRes.ok) {
        const barb = await barbersRes.json()
        setBarbersCount(Array.isArray(barb) ? barb.length : 0)
      }

      if (appRes && appRes.ok) {
        const apps = await appRes.json()
        setAppointmentsCount(Array.isArray(apps) ? apps.length : 0)
      }
    } catch (err) {
      console.error('Erro ao carregar dados do onboarding:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (user && user.role !== 'DEVELOPER') {
      loadOnboardingData()
    }
  }, [user])

  const copyPublicUrl = () => {
    if (!barbershop?.slug) return
    const url = `${window.location.origin}/b/${barbershop.slug}`
    navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  const handleOpenLogoModal = () => {
    setLogoPreview(barbershop?.logo || '')
    setLogoError('')
    setLogoSuccess('')
    setIsLogoModalOpen(true)
  }

  const handleLogoFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setLogoError('')
    setLogoSuccess('')

    if (!file.type.startsWith('image/')) {
      setLogoError('Por favor, selecione um arquivo de imagem válido (PNG, JPG, WebP ou SVG).')
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      setLogoError('O tamanho da imagem não pode ultrapassar 5MB.')
      return
    }

    const reader = new FileReader()
    reader.onloadend = () => {
      setLogoPreview(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  const handleSaveLogo = async () => {
    if (!logoPreview) {
      setLogoError('Por favor, selecione uma imagem para a logo.')
      return
    }

    setIsSavingLogo(true)
    setLogoError('')
    setLogoSuccess('')

    try {
      const response = await fetch('/api/barbershop', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify({
          logo: logoPreview,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao enviar a logo.')
      }

      setBarbershop((prev: any) => ({
        ...prev,
        logo: data.logo,
      }))

      if (user && updateUser) {
        updateUser({
          barbershop: {
            ...(user.barbershop || { id: data.id, name: data.name }),
            id: data.id,
            name: data.name,
            slug: data.slug,
            logo: data.logo,
          },
        })
      }

      setLogoSuccess('Logo enviada e apresentada no sistema com sucesso!')
      setTimeout(() => {
        setIsLogoModalOpen(false)
        setLogoSuccess('')
      }, 1000)
    } catch (err: any) {
      setLogoError(err.message || 'Erro ao salvar a logo da barbearia.')
    } finally {
      setIsSavingLogo(false)
    }
  }

  const handleRemoveLogo = async () => {
    setIsSavingLogo(true)
    setLogoError('')
    setLogoSuccess('')

    try {
      const response = await fetch('/api/barbershop', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify({
          logo: null,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Erro ao remover a logo.')
      }

      setLogoPreview('')
      setBarbershop((prev: any) => ({
        ...prev,
        logo: null,
      }))

      if (user && updateUser) {
        updateUser({
          barbershop: {
            ...(user.barbershop || {}),
            logo: null,
          },
        })
      }

      setLogoSuccess('Logo removida com sucesso.')
      setTimeout(() => {
        setIsLogoModalOpen(false)
        setLogoSuccess('')
      }, 1000)
    } catch (err: any) {
      setLogoError(err.message || 'Erro ao remover a logo.')
    } finally {
      setIsSavingLogo(false)
    }
  }

  // Evaluate 8 core setup steps
  const hasBasicInfo = Boolean(barbershop?.name && barbershop?.phone)
  const hasLogo = Boolean(barbershop?.logo)
  const hasServices = servicesCount > 0
  const hasBarbers = barbersCount > 0
  const hasHours = Boolean(barbershop?.operatingHours || barbershop?.address)
  const hasSettings = Boolean(barbershop?.description || barbershop?.email)
  const hasPublicUrl = Boolean(barbershop?.slug)
  const hasFirstAppointment = appointmentsCount > 0

  const steps: OnboardingStep[] = [
    {
      id: 1,
      title: 'Dados da Barbearia',
      description: 'Nome fantasia, telefone de contato e endereço para localização.',
      completed: hasBasicInfo,
      actionText: hasBasicInfo ? 'Editar dados' : 'Preencher dados',
      actionUrl: '/configuracoes',
      icon: Building,
    },
    {
      id: 2,
      title: 'Logo e Identidade',
      description: 'Adicione a identidade visual da sua marca na página pública e no painel.',
      completed: hasLogo,
      actionText: hasLogo ? 'Alterar logo' : 'Enviar logo',
      actionUrl: '#',
      onClick: handleOpenLogoModal,
      icon: ImageIcon,
    },
    {
      id: 3,
      title: 'Serviços & Preços',
      description: 'Cadastre os cortes, barba e procedimentos com preços e tempos de duração.',
      completed: hasServices,
      actionText: hasServices ? `${servicesCount} cadastrados` : 'Cadastrar serviços',
      actionUrl: '/servicos',
      icon: Scissors,
    },
    {
      id: 4,
      title: 'Equipe de Barbeiros',
      description: 'Convide seus profissionais para gerenciar suas agendas e comissões.',
      completed: hasBarbers,
      actionText: hasBarbers ? `${barbersCount} profissionais` : 'Cadastrar equipe',
      actionUrl: '/usuarios',
      icon: Users,
    },
    {
      id: 5,
      title: 'Horários de Atendimento',
      description: 'Configure os turnos de funcionamento e intervalos de atendimento.',
      completed: hasHours,
      actionText: hasHours ? 'Ver horários' : 'Definir horários',
      actionUrl: '/configuracoes',
      icon: Clock,
    },
    {
      id: 6,
      title: 'Configurações do Estabelecimento',
      description: 'Notificações, regras de cancelamento e descrição institucional.',
      completed: hasSettings,
      actionText: 'Acessar configurações',
      actionUrl: '/configuracoes',
      icon: Settings,
    },
    {
      id: 7,
      title: 'URL Pública Exclusiva',
      description: 'O link que seus clientes utilizarão para agendar horários online.',
      completed: hasPublicUrl,
      actionText: 'Testar link público',
      actionUrl: barbershop?.slug ? `/b/${barbershop.slug}` : '/configuracoes',
      icon: Globe,
    },
    {
      id: 8,
      title: 'Primeiro Agendamento',
      description: 'Faça um agendamento de teste ou receba seu primeiro cliente.',
      completed: hasFirstAppointment,
      actionText: hasFirstAppointment ? `${appointmentsCount} agendamento(s)` : 'Criar agendamento',
      actionUrl: '/agenda',
      icon: CalendarCheck,
    },
  ]

  const completedCount = steps.filter((s) => s.completed).length
  const totalCount = steps.length
  const progressPercentage = Math.round((completedCount / totalCount) * 100)

  return (
    <div className="min-h-screen bg-background text-foreground pb-20 pt-20">
      <DropdownHeader />

      <main className="w-full px-4 md:px-8 max-w-5xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            {barbershop?.logo && (
              <div className="w-14 h-14 rounded-2xl overflow-hidden border border-primary/30 shadow-md shrink-0 bg-muted/40 hidden sm:block">
                <img
                  src={barbershop.logo}
                  alt={barbershop.name || 'Logo'}
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            <div>
              <div className="flex items-center gap-2 text-primary font-semibold text-xs tracking-wider uppercase mb-1">
                <Sparkles className="w-4 h-4" />
                <span>{barbershop?.name ? `Guia de Implantação • ${barbershop.name}` : 'Guia de Implantação'}</span>
              </div>
              <h1 className="text-2xl md:text-3xl font-bold text-foreground">Onboarding da Sua Barbearia</h1>
              <p className="text-muted-foreground text-sm md:text-base mt-1">
                Complete as etapas essenciais para começar a receber agendamentos online hoje mesmo.
              </p>
            </div>
          </div>

          <button
            onClick={loadOnboardingData}
            disabled={loading}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs md:text-sm font-medium rounded-xl border border-border bg-card hover:bg-accent hover:text-accent-foreground transition-all shrink-0 self-start sm:self-auto"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Atualizar checklist
          </button>
        </div>

        {/* Progress Card */}
        <div className="bg-card border border-border rounded-2xl p-6 md:p-8 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
            <div>
              <span className="text-xs font-semibold text-primary uppercase tracking-wider">
                Etapa {completedCount} de {totalCount} concluídas
              </span>
              <h2 className="text-xl font-bold text-foreground mt-0.5">
                {progressPercentage === 100
                  ? 'Tudo pronto! Sua barbearia está 100% operacional 🎉'
                  : `Seu estabelecimento está ${progressPercentage}% configurado`}
              </h2>
            </div>
            <div className="text-right">
              <span className="text-3xl font-extrabold text-foreground">{progressPercentage}%</span>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-muted/60 h-2.5 rounded-full overflow-hidden">
            <div
              className="bg-primary h-full rounded-full transition-all duration-700 ease-out"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>

          {/* Public Link Quick Access */}
          {barbershop?.slug && (
            <div className="mt-6 pt-6 border-t border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Globe className="w-4 h-4 text-primary shrink-0" />
                <span className="text-xs md:text-sm">Link público:</span>
                <span className="font-mono text-xs text-foreground font-medium truncate max-w-xs md:max-w-md">
                  {typeof window !== 'undefined' ? `${window.location.origin}/b/${barbershop.slug}` : `/b/${barbershop.slug}`}
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={copyPublicUrl}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-border bg-muted/40 hover:bg-muted text-foreground transition-all"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copiado!' : 'Copiar link'}</span>
                </button>
                <Link
                  href={`/b/${barbershop.slug}`}
                  target="_blank"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground transition-all"
                >
                  <span>Abrir</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Steps Checklist List */}
        <div className="space-y-3.5">
          {steps.map((step) => {
            const Icon = step.icon
            return (
              <div
                key={step.id}
                className={`bg-card border rounded-2xl p-4 md:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all ${
                  step.completed ? 'border-border/60 bg-card/60' : 'border-primary/30 ring-1 ring-primary/20 shadow-sm'
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className="mt-1">
                    {step.completed ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                    ) : (
                      <Circle className="w-5 h-5 text-muted-foreground/60 shrink-0" />
                    )}
                  </div>
                  <div className="p-2.5 rounded-xl bg-muted/50 text-foreground border border-border shrink-0 hidden sm:block">
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-semibold text-muted-foreground">Etapa {step.id}</span>
                      <h3 className="font-semibold text-base text-foreground">{step.title}</h3>
                      {step.completed && (
                        <span className="px-2 py-0.5 text-[10px] uppercase font-bold rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                          Concluído
                        </span>
                      )}
                    </div>
                    <p className="text-xs md:text-sm text-muted-foreground mt-0.5">{step.description}</p>
                  </div>
                </div>

                {/* Thumbnail da logo no step 2 se cadastrada */}
                {step.id === 2 && barbershop?.logo && (
                  <div className="relative w-10 h-10 rounded-xl overflow-hidden border border-primary/40 shadow-sm shrink-0 hidden sm:block bg-muted">
                    <img
                      src={barbershop.logo}
                      alt="Logo da barbearia"
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}

                <div className="flex items-center justify-end shrink-0 sm:pl-4">
                  {step.onClick ? (
                    <button
                      type="button"
                      onClick={step.onClick}
                      className={`inline-flex items-center gap-1.5 px-4 py-2 text-xs md:text-sm font-semibold rounded-xl transition-all shadow-sm cursor-pointer ${
                        step.completed
                          ? 'border border-border bg-muted/40 hover:bg-muted text-foreground'
                          : 'bg-primary hover:bg-primary/90 text-primary-foreground'
                      }`}
                    >
                      <span>{step.actionText}</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  ) : (
                    <Link
                      href={step.actionUrl}
                      className={`inline-flex items-center gap-1.5 px-4 py-2 text-xs md:text-sm font-semibold rounded-xl transition-all shadow-sm ${
                        step.completed
                          ? 'border border-border bg-muted/40 hover:bg-muted text-foreground'
                          : 'bg-primary hover:bg-primary/90 text-primary-foreground'
                      }`}
                    >
                      <span>{step.actionText}</span>
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* Modal de Upload de Logo da Barbearia */}
        {isLogoModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-card border border-border rounded-2xl w-full max-w-md p-6 space-y-5 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
              {/* Header do Modal */}
              <div className="flex items-center justify-between border-b border-border pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-primary/10 text-primary border border-primary/20">
                    <ImageIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-foreground">Logo da Barbearia</h3>
                    <p className="text-xs text-muted-foreground">Identidade visual do seu estabelecimento</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsLogoModalOpen(false)}
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Mensagens de Feedback */}
              {logoError && (
                <div className="p-3 bg-red-950/40 border border-red-800/60 rounded-xl text-red-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                  <span>{logoError}</span>
                </div>
              )}
              {logoSuccess && (
                <div className="p-3 bg-emerald-950/40 border border-emerald-800/60 rounded-xl text-emerald-300 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{logoSuccess}</span>
                </div>
              )}

              {/* Área de Preview e Upload */}
              <div className="flex flex-col items-center justify-center gap-4 py-2">
                <div className="relative group w-32 h-32 rounded-2xl bg-muted/40 border-2 border-dashed border-border group-hover:border-primary flex items-center justify-center overflow-hidden shadow-lg transition-all">
                  {logoPreview ? (
                    <img
                      src={logoPreview}
                      alt="Preview da Logo"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground text-center p-3">
                      <Upload className="w-7 h-7 text-muted-foreground/60" />
                      <span className="text-[11px]">Nenhuma logo selecionada</span>
                    </div>
                  )}

                  <label className="absolute bottom-2 right-2 p-2 rounded-xl bg-primary text-primary-foreground shadow-md hover:opacity-90 transition cursor-pointer">
                    <Camera className="w-4 h-4" />
                    <input
                      type="file"
                      className="hidden"
                      accept="image/png,image/jpeg,image/webp,image/svg+xml"
                      onChange={handleLogoFileSelect}
                    />
                  </label>
                </div>

                <div className="flex items-center gap-2">
                  <label className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg border border-border bg-muted/50 hover:bg-muted text-foreground text-xs font-medium cursor-pointer transition">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Selecionar imagem</span>
                    <input
                      type="file"
                      className="hidden"
                      accept="image/png,image/jpeg,image/webp,image/svg+xml"
                      onChange={handleLogoFileSelect}
                    />
                  </label>

                  {logoPreview && (
                    <button
                      type="button"
                      onClick={handleRemoveLogo}
                      disabled={isSavingLogo}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-destructive/30 hover:bg-destructive/10 text-destructive text-xs font-medium transition cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Remover</span>
                    </button>
                  )}
                </div>

                <p className="text-[11px] text-muted-foreground text-center max-w-xs">
                  Formatos aceitos: PNG, JPG, WebP ou SVG (máx. 5MB). Aparecerá no seu link público /b/{barbershop?.slug || 'slug'}, na barra lateral e em todo o sistema.
                </p>
              </div>

              {/* Rodapé do Modal */}
              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsLogoModalOpen(false)}
                  disabled={isSavingLogo}
                  className="px-4 py-2 rounded-xl border border-border text-xs font-medium hover:bg-muted transition text-foreground cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSaveLogo}
                  disabled={isSavingLogo || !logoPreview}
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition shadow-sm disabled:opacity-50 cursor-pointer"
                >
                  {isSavingLogo ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Salvando...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Salvar Logo</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
