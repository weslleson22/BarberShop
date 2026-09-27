'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Sparkles, AlertTriangle, Clock, ArrowRight, ShieldAlert, CheckCircle2 } from 'lucide-react'
import { getAuthHeaders } from '@/lib/utils'
import { useAuth } from '@/lib/auth-context'

interface SubscriptionAccessState {
  allowed: boolean
  canAccessOperations: boolean
  canAccessBillingOnly: boolean
  status: 'TRIALING' | 'ACTIVE' | 'PAST_DUE' | 'SUSPENDED' | 'CANCELED' | 'EXPIRED' | 'NO_SUBSCRIPTION' | string
  reason?: string
  isTrial?: boolean
  daysRemaining?: number
  trialEnd?: string | Date
  currentPeriodEnd?: string | Date
  message?: string
  plan?: {
    id: string
    name: string
    slug: string
  }
}

export default function TrialBanner() {
  const { user } = useAuth()
  const [access, setAccess] = useState<SubscriptionAccessState | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Only query for staff/admin with a barbershop
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
      .catch(() => {})
      .finally(() => {
        if (isMounted) setLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [user])

  if (loading || !access) return null

  const daysRemaining = access.daysRemaining ?? 0
  const isExpiringSoon = daysRemaining <= 7

  const formatEndDate = (dateInput?: string | Date) => {
    if (!dateInput) return ''
    try {
      const d = new Date(dateInput)
      return !isNaN(d.getTime()) ? d.toLocaleDateString('pt-BR') : ''
    } catch {
      return ''
    }
  }

  // 1. TRIALING
  if (access.status === 'TRIALING') {
    const trialEndDate = formatEndDate(access.trialEnd)
    const elapsedPercent = Math.min(100, Math.max(0, Math.round(((30 - daysRemaining) / 30) * 100)))

    return (
      <div className={`mb-6 rounded-2xl border p-4 md:p-5 transition-all ${
        isExpiringSoon
          ? 'bg-amber-500/10 border-amber-500/40 text-amber-200'
          : 'bg-gradient-to-r from-amber-500/10 via-yellow-500/5 to-transparent border-amber-500/20 text-white'
      }`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className={`p-2.5 rounded-xl shrink-0 ${
              isExpiringSoon ? 'bg-amber-500/20 text-amber-400' : 'bg-primary/20 text-primary'
            }`}>
              {isExpiringSoon ? <Clock className="w-5 h-5 animate-pulse" /> : <Sparkles className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-semibold text-base text-foreground">Período de Avaliação Gratuita</h3>
                <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${
                  isExpiringSoon
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    : 'bg-primary/10 text-primary border border-primary/20'
                }`}>
                  {daysRemaining} {daysRemaining === 1 ? 'dia restante' : 'dias restantes'}
                </span>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                Aproveite todos os recursos do plano Pro durante o seu teste.{' '}
                {trialEndDate && <span>Trial termina em <strong className="text-foreground">{trialEndDate}</strong>.</span>}
              </p>

              {/* Progress bar */}
              <div className="w-full max-w-md bg-muted/60 h-1.5 rounded-full mt-2.5 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    isExpiringSoon ? 'bg-amber-500' : 'bg-primary'
                  }`}
                  style={{ width: `${elapsedPercent}%` }}
                />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <Link
              href="/dashboard/assinatura"
              className={`inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm transition-all shadow-sm ${
                isExpiringSoon
                  ? 'bg-amber-500 hover:bg-amber-400 text-black font-semibold'
                  : 'bg-primary hover:bg-primary/90 text-primary-foreground font-semibold'
              }`}
            >
              Escolher plano
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // 2. PAST_DUE
  if (access.status === 'PAST_DUE') {
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
                Não conseguimos processar a renovação da sua assinatura. Regularize para evitar o bloqueio de agendamentos.
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

  // 3. SUSPENDED or EXPIRED
  if (access.status === 'SUSPENDED' || access.status === 'EXPIRED' || access.status === 'NO_SUBSCRIPTION') {
    return (
      <div className="mb-6 rounded-2xl border border-destructive/40 bg-destructive/10 p-4 md:p-5 text-destructive-foreground">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="p-2.5 rounded-xl bg-destructive/20 text-destructive shrink-0">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-base text-destructive">
                {access.status === 'EXPIRED' ? 'Período de Testes Expirado' : 'Assinatura Inativa'}
              </h3>
              <p className="text-sm text-muted-foreground mt-0.5">
                {access.message || 'Selecione um plano para reativar o agendamento online e os recursos da sua barbearia.'}
              </p>
            </div>
          </div>
          <Link
            href="/dashboard/assinatura"
            className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-sm transition-all shrink-0"
          >
            Ativar Assinatura
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    )
  }

  return null
}
