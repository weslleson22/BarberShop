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
  RefreshCw
} from 'lucide-react'

interface OnboardingStep {
  id: number
  title: string
  description: string
  completed: boolean
  actionText: string
  actionUrl: string
  icon: any
}

export default function OnboardingPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [barbershop, setBarbershop] = useState<any>(null)
  const [servicesCount, setServicesCount] = useState(0)
  const [barbersCount, setBarbersCount] = useState(0)
  const [appointmentsCount, setAppointmentsCount] = useState(0)

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
      actionUrl: '/configuracoes',
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
          <div>
            <div className="flex items-center gap-2 text-primary font-semibold text-xs tracking-wider uppercase mb-1">
              <Sparkles className="w-4 h-4" />
              <span>Guia de Implantação</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">Onboarding da Sua Barbearia</h1>
            <p className="text-muted-foreground text-sm md:text-base mt-1">
              Complete as etapas essenciais para começar a receber agendamentos online hoje mesmo.
            </p>
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

                <div className="flex items-center justify-end shrink-0 sm:pl-4">
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
                </div>
              </div>
            )
          })}
        </div>
      </main>
    </div>
  )
}
