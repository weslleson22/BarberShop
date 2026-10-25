'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Clock, ShieldAlert, ArrowRight } from 'lucide-react'
import { getAuthHeaders } from '@/lib/utils'
import { useAuth } from '@/lib/auth-context'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

interface SubscriptionAccessState {
  allowed: boolean
  status: string
  reason?: string
  isTrial?: boolean
  isContracted?: boolean
  daysRemaining?: number
  trialEnd?: string | Date
  currentPeriodEnd?: string | Date
  plan?: {
    id: string
    name: string
    slug: string
    price?: number
  } | null
}

export default function TopBarTrialWidget() {
  const { user } = useAuth()
  const [access, setAccess] = useState<SubscriptionAccessState | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Apenas para membros da barbearia (não para clientes nem desenvolvedores globais)
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
        console.warn('Erro ao carregar acesso no topbar:', err)
      })
      .finally(() => {
        if (isMounted) setLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [user?.id, user?.barbershopId, user?.role])

  // Se o usuário não pertence a uma barbearia ou estiver carregando, não renderiza
  if (!user || user.role === 'CLIENT' || user.role === 'DEVELOPER' || !user.barbershopId || loading) {
    return null
  }

  // REGRA CRÍTICA: Se o cliente JÁ TEM PLANO ATIVO CONTRATADO, NUNCA DEVE SER MOSTRADO
  const hasActivePlan =
    access?.isContracted === true ||
    access?.reason === 'SUBSCRIPTION_ACTIVE' ||
    (access?.status === 'ACTIVE' && !access?.isTrial) ||
    Boolean(
      access?.status === 'ACTIVE' &&
      access?.plan &&
      !access.plan.slug?.startsWith('trial') &&
      (Number(access.plan.price || 0) > 0 || access.isContracted)
    )

  if (hasActivePlan) {
    return null
  }

  // Determina data e dias restantes de trial
  const effectiveTrialEnd = access?.trialEnd
    ? new Date(access.trialEnd)
    : user?.barbershop?.trialEndsAt
      ? new Date(user.barbershop.trialEndsAt)
      : null

  const now = new Date()

  const { daysRemaining, isExpired } = (() => {
    if (!effectiveTrialEnd || isNaN(effectiveTrialEnd.getTime())) {
      const expired = access?.status === 'EXPIRED' || access?.status === 'NO_SUBSCRIPTION'
      return { daysRemaining: 0, isExpired: expired }
    }

    const diffMs = effectiveTrialEnd.getTime() - now.getTime()
    if (diffMs <= 0) {
      return { daysRemaining: 0, isExpired: true }
    }

    const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24))
    const finalDays = access?.daysRemaining !== undefined ? access.daysRemaining : Math.min(7, days)
    return {
      daysRemaining: Math.max(0, Math.min(7, finalDays)),
      isExpired: false,
    }
  })()

  const totalTrialDays = 7
  const daysElapsed = Math.max(0, Math.min(7, totalTrialDays - daysRemaining))
  const elapsedPercent = Math.min(100, Math.max(0, Math.round((daysElapsed / totalTrialDays) * 100)))

  // 1. Caso de Trial Expirado (Padrão shadcn/ui Destructive sóbrio)
  if (isExpired || access?.status === 'EXPIRED' || access?.status === 'NO_SUBSCRIPTION') {
    return (
      <div className="flex items-center gap-2 max-w-full overflow-hidden">
        <Badge
          variant="outline"
          className="hidden sm:inline-flex items-center gap-1.5 py-1 px-2.5 text-xs font-semibold bg-destructive/10 text-destructive border-destructive/30"
        >
          <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
          <span>Período de Avaliação Expirado (7 Dias)</span>
        </Badge>

        <Button
          asChild
          size="sm"
          variant="destructive"
          className="h-8 text-xs font-semibold gap-1.5 shadow-sm transition-all hover:scale-[1.02] active:scale-[0.98] animate-pulse"
        >
          <Link href="/dashboard/assinatura">
            <span>Contratar Plano</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </Button>
      </div>
    )
  }

  // 2. Caso de Trial Ativo de 7 Dias (Design System Oficial shadcn/ui)
  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex items-center gap-2 sm:gap-3 max-w-full overflow-hidden">
        {/* Container Principal Sóbrio Estilo Card Shadcn */}
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-2 sm:gap-3 px-2.5 sm:px-3 py-1 rounded-lg border border-border bg-card/80 hover:bg-card text-card-foreground transition-colors shadow-xs cursor-default">
              {/* Ícone de Relógio com Badge Sutil */}
              <div className="p-1 rounded-md shrink-0 flex items-center justify-center bg-muted text-muted-foreground">
                <Clock className="w-3.5 h-3.5" />
              </div>

              {/* Título Principal */}
              <span className="font-semibold text-xs text-foreground tracking-tight whitespace-nowrap hidden lg:inline">
                Período de Avaliação Gratuita (7 Dias)
              </span>

              {/* Badge com os Dias Restantes e Indicador Animado (Ping Beacon) */}
              <Badge
                variant="outline"
                className="text-[11px] font-semibold px-2 py-0.5 whitespace-nowrap gap-1.5 shrink-0 bg-muted/60 border-border text-foreground"
              >
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
                </span>
                <span>
                  {daysRemaining > 1
                    ? `${daysRemaining} dias restantes`
                    : daysRemaining === 1
                      ? '1 dia restante'
                      : 'Último dia de teste!'}
                </span>
              </Badge>

              {/* Barra de Progresso dos 7 Dias com Divisão Clara dos Dias Decorridos vs Restantes */}
              <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                {/* 7 Segmentos de Dias (1 para cada dia do teste de 7 dias) */}
                <div
                  className="flex items-center gap-1 p-1 rounded-md bg-muted/80 dark:bg-neutral-900 border border-border/80 shadow-2xs"
                  title={`${daysElapsed} de ${totalTrialDays} dias decorridos (${daysRemaining} dias restantes)`}
                >
                  {Array.from({ length: totalTrialDays }).map((_, index) => {
                    const isPassed = index < daysElapsed // Ex: 5 dias passados (0, 1, 2, 3, 4)
                    return (
                      <div
                        key={index}
                        className={`h-2.5 w-2 sm:w-2.5 md:w-3 rounded-xs transition-all duration-300 ${isPassed
                            ? 'bg-primary shadow-xs'
                            : 'bg-muted-foreground/20 dark:bg-neutral-800 border border-border/70'
                          }`}
                        title={`Dia ${index + 1} de ${totalTrialDays}: ${isPassed ? 'Completado' : 'Restante'}`}
                      />
                    )
                  })}
                </div>

                {/* Contador de Dias Decorridos */}
                <span className="text-[11px] font-mono font-medium text-muted-foreground whitespace-nowrap">
                  <strong className="text-primary font-bold">{daysElapsed}</strong>/{totalTrialDays}d
                </span>
              </div>

              {/* Texto Informativo */}
              <span className="text-[11px] text-muted-foreground hidden 2xl:inline truncate max-w-sm">
                • Aproveite todos os recursos completos durante o seu teste gratuito de 7 dias.
              </span>
            </div>
          </TooltipTrigger>

          <TooltipContent side="bottom" className="text-xs max-w-xs p-3">
            <div className="space-y-1">
              <div className="font-semibold text-foreground flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-primary" />
                <span>Período de Teste Gratuito de 7 Dias</span>
              </div>
              <p className="text-muted-foreground text-[11px] leading-relaxed">
                Você utilizou {daysElapsed} de {totalTrialDays} dias ({daysRemaining} dias restantes). Todos os recursos de agendamento, financeiro e equipe estão liberados.
              </p>
            </div>
          </TooltipContent>
        </Tooltip>

        {/* Botão de Contratação Shadcn Animado (Sem Ícone de Estrela, com Animação para Chamar Atenção) */}
        <Button
          asChild
          size="sm"
          className="relative group h-8 px-3.5 text-xs font-semibold gap-1.5 shrink-0 bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm transition-all duration-300 hover:shadow-md hover:scale-[1.02] active:scale-[0.98] ring-2 ring-primary/20 hover:ring-primary/40 animate-pulse"
        >
          <Link href="/dashboard/assinatura">
            <span className="hidden sm:inline">Contratar Plano</span>
            <span className="sm:hidden">Assinar</span>
            <ArrowRight className="w-3.5 h-3.5 transition-transform duration-200 group-hover:translate-x-1" />
          </Link>
        </Button>
      </div>
    </TooltipProvider>
  )
}
