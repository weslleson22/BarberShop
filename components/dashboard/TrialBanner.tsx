'use client'

import { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import { ShieldCheck, AlertTriangle, Clock, ArrowRight, ShieldAlert } from 'lucide-react'
import { getAuthHeaders } from '@/lib/utils'
import { useAuth } from '@/lib/auth-context'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'

interface SubscriptionAccessState {
  allowed: boolean
  canAccessOperations: boolean
  canAccessBillingOnly: boolean
  status: 'TRIALING' | 'ACTIVE' | 'PAST_DUE' | 'SUSPENDED' | 'CANCELED' | 'EXPIRED' | 'NO_SUBSCRIPTION' | string
  reason?: string
  isTrial?: boolean
  isContracted?: boolean
  daysRemaining?: number
  trialStart?: string | Date
  trialEnd?: string | Date
  currentPeriodEnd?: string | Date
  message?: string
  plan?: {
    id: string
    name: string
    slug: string
    price?: number
  }
}

export default function TrialBanner() {
  const { user } = useAuth()
  const [access, setAccess] = useState<SubscriptionAccessState | null>(null)
  const [loading, setLoading] = useState(true)

  // Data de expiração imediata a partir do auth context (evita piscar/sumir na carga inicial)
  const userTrialEnd = user?.barbershop?.trialEndsAt ? new Date(user.barbershop.trialEndsAt) : null

  useEffect(() => {
    // Apenas para membros da equipe/administradores com barbearia vinculada
    if (!user || user.role === 'CLIENT' || user.role === 'DEVELOPER' || !user.barbershopId) {
      setLoading(false)
      return
    }

    let isMounted = true
    fetch('/api/billing/access', {
      headers: getAuthHeaders(),
      credentials: 'include',
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (isMounted && data) {
          setAccess(data)
        }
      })
      .catch((err) => {
        console.warn('Erro ao carregar status de acesso da barbearia:', err)
      })
      .finally(() => {
        if (isMounted) setLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [user?.id, user?.barbershopId, user?.role])

  // Se o usuário não pertence a uma barbearia ou é desenvolvedor/cliente final, não renderiza
  if (!user || user.role === 'CLIENT' || user.role === 'DEVELOPER' || !user.barbershopId) {
    return null
  }

  // Identifica se já houve contratação definitiva de um plano pago
  const isPaidContracted =
    access?.isContracted === true ||
    access?.reason === 'SUBSCRIPTION_ACTIVE' ||
    (access?.status === 'ACTIVE' && !access?.isTrial) ||
    Boolean(
      access?.status === 'ACTIVE' &&
      access?.plan &&
      !access.plan.slug?.startsWith('trial') &&
      (Number(access.plan.price || 0) > 0 || access.isContracted)
    )

  // Se o cliente já contratou um plano pago definitivo e ativo, o banner de trial NUNCA deve aparecer
  if (isPaidContracted) {
    return null
  }

  // Determinar data final do trial (prioriza API, fallback para user.barbershop.trialEndsAt)
  const effectiveTrialEnd = access?.trialEnd ? new Date(access.trialEnd) : userTrialEnd
  const now = new Date()

  // Cálculo preciso de dias e horas restantes
  const { daysRemaining, hoursRemaining, isExpired } = (() => {
    if (!effectiveTrialEnd || isNaN(effectiveTrialEnd.getTime())) {
      // Se não há data final de trial mas status é EXPIRED ou NO_SUBSCRIPTION
      const expired = access?.status === 'EXPIRED' || access?.status === 'NO_SUBSCRIPTION'
      return { daysRemaining: 0, hoursRemaining: 0, isExpired: expired }
    }

    const diffMs = effectiveTrialEnd.getTime() - now.getTime()
    if (diffMs <= 0) {
      return { daysRemaining: 0, hoursRemaining: 0, isExpired: true }
    }

    const totalHours = Math.floor(diffMs / (1000 * 60 * 60))
    const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24))
    const hours = totalHours % 24

    return {
      daysRemaining: access?.daysRemaining !== undefined ? access.daysRemaining : days,
      hoursRemaining: hours,
      isExpired: false,
    }
  })()

  const formatEndDate = (d?: Date | null) => {
    if (!d || isNaN(d.getTime())) return ''
    try {
      return d.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })
    } catch {
      return d.toLocaleDateString('pt-BR')
    }
  }

  const trialEndDateStr = formatEndDate(effectiveTrialEnd)
  const totalTrialDays = 7
  const isExpiringSoon = daysRemaining <= 2 || isExpired
  const elapsedPercent = Math.min(
    100,
    Math.max(0, Math.round(((totalTrialDays - Math.min(daysRemaining, totalTrialDays)) / totalTrialDays) * 100))
  )

  // 1. CASO DE PAGAMENTO PENDENTE (PAST_DUE)
  if (access?.status === 'PAST_DUE') {
    return (
      <div className="mb-6 rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4 md:p-5 text-amber-200">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-400 shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-base text-amber-300">Pagamento Pendente</h3>
              <p className="text-sm text-amber-200/90 mt-0.5">
                Não conseguimos processar a renovação da sua assinatura. Regularize para evitar o bloqueio dos agendamentos.
              </p>
            </div>
          </div>
          <Link
            href="/dashboard/assinatura"
            className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-semibold text-sm transition-all shrink-0"
          >
            Regularizar Pagamento
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    )
  }

  // 2. CASO DE TRIAL EXPIRADO OU SEM PLANO CONTRATADO
  if (isExpired || access?.status === 'EXPIRED' || access?.status === 'NO_SUBSCRIPTION') {
    return (
      <div className="mb-6 rounded-2xl border border-destructive/50 bg-destructive/10 p-4 md:p-5 text-destructive-foreground shadow-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="p-2.5 rounded-xl bg-destructive/20 text-destructive shrink-0">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-semibold text-base text-destructive">
                  Período de Testes Expirado (7 Dias)
                </h3>
                <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-destructive/20 text-destructive border border-destructive/30">
                  Ação necessária
                </span>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                Seus 7 dias de avaliação gratuita terminaram. Contrate um plano com desconto para reativar seus agendamentos online e continuar utilizando o sistema.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <Link
              href="/dashboard/assinatura"
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-sm transition-all shadow-md"
            >
              <span>Contratar com Desconto</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // 3. CASO PADRÃO: CLIENTE EM PERÍODO DE TRIAL DE 7 DIAS ATIVO (ENQUANTO NÃO CONTRATAR PLANO)
  return (
    <div
      className={`mb-6 rounded-xl border p-4 md:p-5 transition-all shadow-sm ${isExpiringSoon
          ? 'bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400'
          : 'bg-card border-border text-card-foreground'
        }`}
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div
            className={`p-2.5 rounded-xl shrink-0 ${isExpiringSoon ? 'bg-amber-500/20 text-amber-500' : 'bg-primary/10 text-primary'
              }`}
          >
            {isExpiringSoon ? (
              <Clock className="w-5 h-5 animate-pulse" />
            ) : (
              <ShieldCheck className="w-5 h-5 text-emerald-500" />
            )}
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold text-base text-foreground">
                Período de Avaliação Gratuita (7 Dias)
              </h3>
              <Badge
                variant="outline"
                className={`text-xs px-2.5 py-0.5 font-bold ${isExpiringSoon
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                    : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                  }`}
              >
                {daysRemaining > 1
                  ? `${daysRemaining} dias restantes`
                  : daysRemaining === 1
                    ? `1 dia restante`
                    : `Último dia de teste!`}
              </Badge>
            </div>

            <p className="text-sm text-muted-foreground">
              Aproveite todos os recursos completos durante o seu teste gratuito de 7 dias.{' '}
              {trialEndDateStr && (
                <span>
                  Trial encerra em <strong className="text-foreground">{trialEndDateStr}</strong>.
                </span>
              )}
            </p>

            {/* Barra de Progresso visual dos 7 dias com divisão clara dos dias decorridos vs restantes */}
            <div className="w-full max-w-md mt-2.5 flex items-center gap-2.5">
              <div className="flex items-center gap-1.5 p-1 rounded-md bg-muted/80 dark:bg-neutral-900 border border-border/80">
                {Array.from({ length: 7 }).map((_, index) => {
                  const isPassed = index < (7 - daysRemaining)
                  return (
                    <div
                      key={index}
                      className={`h-2.5 w-4 rounded-xs transition-all duration-300 ${isPassed
                          ? 'bg-primary shadow-xs'
                          : 'bg-muted-foreground/20 dark:bg-neutral-800 border border-border/70'
                        }`}
                      title={`Dia ${index + 1} de 7: ${isPassed ? 'Completado' : 'Restante'}`}
                    />
                  )
                })}
              </div>
              <span className="text-xs font-mono font-medium text-muted-foreground whitespace-nowrap">
                <strong className="text-primary font-bold">{7 - daysRemaining}</strong>/7d
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <Link
            href="/dashboard/assinatura"
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg font-semibold text-sm transition-all shadow-sm bg-primary hover:bg-primary/90 text-primary-foreground hover:scale-[1.02] active:scale-[0.98] animate-pulse"
          >
            <span>Contratar Plano</span>
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>
      </div>
    </div>
  )
}

