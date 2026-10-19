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
  RefreshCw,
  Upload,
  Camera,
  Trash2,
  X,
  AlertCircle,
} from 'lucide-react'
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

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
    <div className="min-h-screen bg-gray-950 text-white pb-20 pt-20">
      <DropdownHeader />

      <TooltipProvider delayDuration={150}>
        <main className="w-full px-4 md:px-8 max-w-5xl mx-auto space-y-8">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Avatar className="w-14 h-14 rounded-2xl border border-[#374151] bg-[#111827] shadow-sm shrink-0 hidden sm:flex">
                {barbershop?.logo ? (
                  <AvatarImage src={barbershop.logo} alt={barbershop.name || 'Logo'} className="object-cover" />
                ) : null}
                <AvatarFallback className="rounded-2xl bg-[#2563eb] text-white font-semibold text-lg border border-[#3b82f6]">
                  {(barbershop?.name || 'BS').slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <div className="flex items-center gap-2 text-white font-medium text-xs tracking-wider uppercase mb-1">
                  <span className="p-1 rounded bg-[#2563eb] text-white border border-[#3b82f6]">
                    <Building className="w-3.5 h-3.5" />
                  </span>
                  <span>{barbershop?.name ? `Guia de Implantação • ${barbershop.name}` : 'Guia de Implantação'}</span>
                </div>
                <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
                  Onboarding da Sua Barbearia
                </h1>
                <p className="text-white text-sm md:text-base mt-1 font-normal">
                  Complete as etapas essenciais para começar a receber agendamentos online hoje mesmo.
                </p>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              onClick={loadOnboardingData}
              disabled={loading}
              className="h-10 px-4 text-xs md:text-sm font-medium rounded-xl border-[#374151] bg-[#030712] hover:bg-[#1f2937] hover:text-white text-white transition-all shrink-0 self-start sm:self-auto cursor-pointer shadow-sm flex items-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 text-white ${loading ? 'animate-spin' : ''}`} />
              <span>Atualizar checklist</span>
            </Button>
          </div>

          {/* Progress Card */}
          <Card className="bg-[#111827] border-[#374151] rounded-2xl p-6 md:p-8 shadow-sm text-white">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
              <div>
                <Badge className="bg-[#2563eb] text-white border-[#3b82f6] text-xs font-medium uppercase tracking-wider mb-2">
                  Etapa {completedCount} de {totalCount} concluídas
                </Badge>
                <CardTitle className="text-xl md:text-2xl font-bold text-white mt-1 tracking-tight">
                  {progressPercentage === 100
                    ? 'Tudo pronto! Sua barbearia está 100% operacional 🎉'
                    : `Seu estabelecimento está ${progressPercentage}% configurado`}
                </CardTitle>
                <CardDescription className="text-xs text-white font-normal mt-1">
                  {progressPercentage === 100
                    ? 'Parabéns! Todas as etapas fundamentais de configuração foram concluídas.'
                    : 'Siga a lista de tarefas abaixo para desbloquear o fluxo completo de agendamentos.'}
                </CardDescription>
              </div>
              <div className="text-right">
                <span className="text-4xl font-bold text-white font-mono">{progressPercentage}%</span>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-[#030712] border border-[#374151] h-3 rounded-full overflow-hidden">
              <div
                className="bg-[#059669] h-full rounded-full transition-all duration-700 ease-out"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>

            {/* Public Link Quick Access */}
            {barbershop?.slug && (
              <>
                <Separator className="bg-[#374151] my-5" />
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-sm">
                  <div className="flex items-center gap-2 text-white">
                    <Globe className="w-4 h-4 text-[#3b82f6] shrink-0" />
                    <span className="text-xs md:text-sm font-normal text-white">Link público:</span>
                    <span className="font-mono text-xs text-white font-normal bg-[#030712] px-2.5 py-1 rounded border border-[#374151] truncate max-w-xs md:max-w-md">
                      {typeof window !== 'undefined' ? `${window.location.origin}/b/${barbershop.slug}` : `/b/${barbershop.slug}`}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={copyPublicUrl}
                          className="h-8 px-3 text-xs font-medium rounded-lg border-[#374151] bg-[#030712] hover:bg-[#1f2937] hover:text-white text-white transition-all cursor-pointer flex items-center gap-1.5 shadow-sm"
                        >
                          {copied ? <Check className="w-3.5 h-3.5 text-white" /> : <Copy className="w-3.5 h-3.5 text-white" />}
                          <span>{copied ? 'Copiado!' : 'Copiar link'}</span>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent className="bg-[#111827] text-white border-[#374151] font-normal text-xs">
                        {copied ? 'Link copiado para a área de transferência!' : 'Copiar URL pública'}
                      </TooltipContent>
                    </Tooltip>

                    <Button
                      asChild
                      size="sm"
                      className="h-8 px-3 text-xs font-medium rounded-lg bg-[#2563eb] hover:bg-[#1d4ed8] text-white border border-[#3b82f6] transition-all cursor-pointer shadow-sm flex items-center gap-1.5"
                    >
                      <Link href={`/b/${barbershop.slug}`} target="_blank">
                        <span>Abrir</span>
                        <ExternalLink className="w-3.5 h-3.5 ml-1 text-white" />
                      </Link>
                    </Button>
                  </div>
                </div>
              </>
            )}
          </Card>

          {/* Steps Checklist List */}
          <div className="space-y-3.5">
            {steps.map((step) => {
              const Icon = step.icon
              return (
                <Card
                  key={step.id}
                  className={`border rounded-2xl p-4 md:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all text-white ${
                    step.completed
                      ? 'border-[#374151] bg-[#111827]'
                      : 'border-[#3b82f6] bg-[#111827] shadow-sm'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div className="mt-1">
                      {step.completed ? (
                        <span className="p-1 rounded-full bg-[#059669] text-white inline-flex items-center justify-center border border-[#10b981]">
                          <CheckCircle2 className="w-4 h-4 text-white" />
                        </span>
                      ) : (
                        <span className="p-1 rounded-full bg-[#030712] text-gray-400 inline-flex items-center justify-center border border-[#374151]">
                          <Circle className="w-4 h-4 text-gray-400" />
                        </span>
                      )}
                    </div>
                    <div className="p-2.5 rounded-xl bg-[#030712] text-white border border-[#374151] shrink-0 hidden sm:block">
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge
                          variant="outline"
                          className="text-[11px] font-normal text-white border-[#374151] bg-[#030712] px-2 py-0.5"
                        >
                          Etapa {step.id}
                        </Badge>
                        <h3 className="font-semibold text-base text-white">{step.title}</h3>
                        {step.completed ? (
                          <Badge className="px-2 py-0.5 text-[10px] uppercase font-medium rounded-full bg-[#059669] text-white border border-[#10b981]">
                            Concluído
                          </Badge>
                        ) : (
                          <Badge className="px-2 py-0.5 text-[10px] uppercase font-medium rounded-full bg-[#d97706] text-white border border-[#f59e0b]">
                            Pendente
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs md:text-sm text-white mt-1 font-normal">{step.description}</p>
                    </div>
                  </div>

                  {/* Thumbnail da logo no step 2 se cadastrada */}
                  {step.id === 2 && barbershop?.logo && (
                    <div className="relative w-10 h-10 rounded-xl overflow-hidden border border-[#374151] shadow-sm shrink-0 hidden sm:block bg-[#030712]">
                      <img
                        src={barbershop.logo}
                        alt="Logo da barbearia"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}

                  <div className="flex items-center justify-end shrink-0 sm:pl-4">
                    {step.onClick ? (
                      <Button
                        type="button"
                        onClick={step.onClick}
                        className={`h-9 px-4 text-xs md:text-sm font-medium rounded-xl transition-all shadow-sm cursor-pointer flex items-center gap-1.5 ${
                          step.completed
                            ? 'border border-[#374151] bg-[#030712] hover:bg-[#1f2937] hover:text-white text-white'
                            : 'bg-[#2563eb] hover:bg-[#1d4ed8] text-white border border-[#3b82f6]'
                        }`}
                      >
                        <span>{step.actionText}</span>
                        <ArrowRight className="w-4 h-4 ml-0.5 text-white" />
                      </Button>
                    ) : (
                      <Button
                        asChild
                        className={`h-9 px-4 text-xs md:text-sm font-medium rounded-xl transition-all shadow-sm cursor-pointer flex items-center gap-1.5 ${
                          step.completed
                            ? 'border border-[#374151] bg-[#030712] hover:bg-[#1f2937] hover:text-white text-white'
                            : 'bg-[#2563eb] hover:bg-[#1d4ed8] text-white border border-[#3b82f6]'
                        }`}
                      >
                        <Link href={step.actionUrl}>
                          <span>{step.actionText}</span>
                          <ArrowRight className="w-4 h-4 ml-0.5 text-white" />
                        </Link>
                      </Button>
                    )}
                  </div>
                </Card>
              )
            })}
          </div>

          {/* Modal de Upload de Logo da Barbearia */}
          {isLogoModalOpen && (
            <div className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4">
              <Card className="bg-[#111827] border border-[#374151] rounded-2xl w-full max-w-md p-6 space-y-5 shadow-2xl relative text-white">
                {/* Header do Modal */}
                <div className="flex items-center justify-between border-b border-[#374151] pb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-[#2563eb] text-white border border-[#3b82f6]">
                      <ImageIcon className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <CardTitle className="font-semibold text-base text-white">Logo da Barbearia</CardTitle>
                      <CardDescription className="text-xs text-white font-normal">Identidade visual do seu estabelecimento</CardDescription>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsLogoModalOpen(false)}
                    className="p-1.5 rounded-lg text-white hover:text-white hover:bg-[#1f2937] transition cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Mensagens de Feedback */}
                {logoError && (
                  <div className="p-3 bg-[#dc2626] border border-[#ef4444] rounded-xl text-white text-xs font-medium flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-white shrink-0" />
                    <span>{logoError}</span>
                  </div>
                )}
                {logoSuccess && (
                  <div className="p-3 bg-[#059669] border border-[#10b981] rounded-xl text-white text-xs font-medium flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-white shrink-0" />
                    <span>{logoSuccess}</span>
                  </div>
                )}

                {/* Área de Preview e Upload */}
                <div className="flex flex-col items-center justify-center gap-4 py-2">
                  <div className="relative group w-32 h-32 rounded-2xl bg-[#030712] border-2 border-dashed border-[#374151] flex items-center justify-center overflow-hidden shadow-lg transition-all">
                    {logoPreview ? (
                      <img
                        src={logoPreview}
                        alt="Preview da Logo"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center gap-2 text-white text-center p-3">
                        <Upload className="w-7 h-7 text-white" />
                        <span className="text-[11px] font-normal text-white">Nenhuma logo selecionada</span>
                      </div>
                    )}

                    <label className="absolute bottom-2 right-2 p-2 rounded-xl bg-[#2563eb] text-white border border-[#3b82f6] shadow-md hover:bg-[#1d4ed8] transition cursor-pointer">
                      <Camera className="w-4 h-4 text-white" />
                      <input
                        type="file"
                        className="hidden"
                        accept="image/png,image/jpeg,image/webp,image/svg+xml"
                        onChange={handleLogoFileSelect}
                      />
                    </label>
                  </div>

                  <div className="flex items-center gap-2">
                    <label className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg border border-[#374151] bg-[#030712] hover:bg-[#1f2937] text-white text-xs font-medium cursor-pointer transition shadow-sm">
                      <Upload className="w-3.5 h-3.5 text-white" />
                      <span>Selecionar imagem</span>
                      <input
                        type="file"
                        className="hidden"
                        accept="image/png,image/jpeg,image/webp,image/svg+xml"
                        onChange={handleLogoFileSelect}
                      />
                    </label>

                    {logoPreview && (
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={handleRemoveLogo}
                        disabled={isSavingLogo}
                        className="h-8 px-3 rounded-lg border border-[#ef4444] bg-[#dc2626] hover:bg-[#b91c1c] text-white text-xs font-medium transition cursor-pointer shadow-sm flex items-center gap-1.5"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-white" />
                        <span>Remover</span>
                      </Button>
                    )}
                  </div>

                  <p className="text-[11px] text-white text-center max-w-xs font-normal">
                    Formatos aceitos: PNG, JPG, WebP ou SVG (máx. 5MB). Aparecerá no seu link público /b/{barbershop?.slug || 'slug'}, na barra lateral e em todo o sistema.
                  </p>
                </div>

                {/* Rodapé do Modal */}
                <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-[#374151]">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsLogoModalOpen(false)}
                    disabled={isSavingLogo}
                    className="px-4 py-2 rounded-xl border border-[#374151] bg-[#030712] text-xs font-medium hover:bg-[#1f2937] hover:text-white transition text-white cursor-pointer"
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="button"
                    onClick={handleSaveLogo}
                    disabled={isSavingLogo || !logoPreview}
                    className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-[#059669] hover:bg-[#047857] text-white border border-[#10b981] text-xs font-medium transition shadow-sm disabled:opacity-50 cursor-pointer"
                  >
                    {isSavingLogo ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin text-white" />
                        <span>Salvando...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-3.5 h-3.5 text-white" />
                        <span>Salvar Logo</span>
                      </>
                    )}
                  </Button>
                </div>
              </Card>
            </div>
          )}
        </main>
      </TooltipProvider>
    </div>
  )
}
