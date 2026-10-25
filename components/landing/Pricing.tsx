'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  Check,
  QrCode,
  CreditCard,
  ArrowRight,
  Zap,
  Sparkles,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

export interface PlanOption {
  id: string
  name: string
  slug?: string
  description?: string
  planType?: string
  durationDays?: number
  price: number | string
  originalPrice?: number | string | null
  discountBadge?: string | null
  discountPercent?: number
  savingsAmount?: number
  billingInterval: string
  cycleType?: string
  features?: string[] | any
  providerProductId?: string
  isActive?: boolean
  status?: string
}

export default function Pricing() {
  const [plans, setPlans] = useState<PlanOption[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let isMounted = true

    const loadPlans = async () => {
      try {
        const res = await fetch('/api/billing/plans?t=' + Date.now(), {
          cache: 'no-store',
        })
        if (res.ok) {
          const data = await res.json()
          if (Array.isArray(data) && isMounted) {
            setPlans(data)
          }
        }
      } catch (err) {
        console.warn('Erro ao carregar planos dinâmicos na landing:', err)
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    loadPlans()
    return () => {
      isMounted = false
    }
  }, [])

  const formatPrice = (price: number | string) => {
    const val = Number(price) || 0
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)
  }

  const getFeaturesList = (plan: PlanOption): string[] => {
    if (Array.isArray(plan.features) && plan.features.length > 0) {
      return plan.features
    }
    if (plan.features && typeof plan.features === 'object' && Array.isArray(plan.features.items)) {
      return plan.features.items
    }
    return [
      'Agendamento online em tempo real',
      'Página exclusiva da sua barbearia',
      'Gestão de barbeiros e comissões',
      'Relatórios financeiros e métricas',
      'Suporte para sua barbearia',
    ]
  }

  const getIntervalLabel = (plan: PlanOption) => {
    const interval = (plan.billingInterval || plan.cycleType || '').toUpperCase()
    if (interval === 'YEARLY') return 'ano'
    if (interval === 'SEMIANNUAL') return 'semestre'
    if (interval === 'QUARTERLY') return 'trimestre'
    return 'mês'
  }

  // Define layout de acordo com a quantidade de planos cadastrados
  const getGridClass = () => {
    if (plans.length === 1) return 'max-w-md mx-auto grid grid-cols-1 gap-8'
    if (plans.length === 2) return 'max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch'
    return 'max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 items-stretch'
  }

  return (
    <section id="planos" className="py-24 bg-background relative border-t border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Cabeçalho */}
        <div className="text-center mb-16 space-y-4">
          <Badge variant="outline" className="px-3.5 py-1.5 text-xs font-semibold border-primary/30 text-primary bg-primary/10">
            <Sparkles className="w-3.5 h-3.5 text-primary mr-1" />
            <span>Planos do Sistema</span>
          </Badge>

          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-foreground tracking-tight">
            Tecnologia de ponta com{' '}
            <span className="text-primary">
              preços justos e previsíveis.
            </span>
          </h2>

          <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto">
            Escolha o plano ideal para a sua barbearia. Sem taxas escondidas, com ativação rápida e cobrança segura via PIX ou Cartão de Crédito.
          </p>

          <div className="pt-2">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs sm:text-sm font-semibold">
              <span>Todas as adesões incluem 7 dias de avaliação gratuita</span>
            </div>
          </div>
        </div>

        {/* Estado de Carregamento (Skeleton) */}
        {loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {[1, 2].map((i) => (
              <div key={i} className="bg-card border border-border rounded-2xl p-8 space-y-6 animate-pulse">
                <div className="h-4 bg-muted rounded w-1/3" />
                <div className="h-7 bg-muted rounded w-2/3" />
                <div className="h-10 bg-muted rounded w-1/2" />
                <div className="space-y-3 pt-4 border-t border-border">
                  <div className="h-3 bg-muted rounded w-full" />
                  <div className="h-3 bg-muted rounded w-5/6" />
                  <div className="h-3 bg-muted rounded w-4/6" />
                </div>
                <div className="h-12 bg-muted rounded w-full mt-6" />
              </div>
            ))}
          </div>
        )}

        {/* Nenhum plano cadastrado no sistema */}
        {!loading && plans.length === 0 && (
          <div className="max-w-md mx-auto text-center py-12 px-6 rounded-2xl border border-border bg-card shadow-sm space-y-4">
            <p className="text-sm font-semibold text-foreground">Planos em Atualização</p>
            <p className="text-xs text-muted-foreground">
              Os planos do sistema estão sendo ajustados pela administração. Você pode criar sua conta e iniciar o teste gratuito.
            </p>
            <Button asChild className="h-10 font-bold text-xs gap-2">
              <Link href="/register">
                <span>Criar Conta e Iniciar Teste</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </Button>
          </div>
        )}

        {/* Grid de Planos Reais Cadastrados no Sistema */}
        {!loading && plans.length > 0 && (
          <div className={getGridClass()}>
            {plans.map((plan, index) => {
              const price = Number(plan.price) || 0
              const isCourtesy =
                (plan.planType || '').toUpperCase() === 'COURTESY' ||
                price === 0 ||
                (plan.name || '').toLowerCase().includes('cortesia') ||
                (plan.slug || '').toLowerCase().includes('cortesia')

              const hasSavedOriginalPrice =
                !isCourtesy &&
                plan.originalPrice !== undefined &&
                plan.originalPrice !== null &&
                Number(plan.originalPrice) > price

              const originalPrice = hasSavedOriginalPrice ? Number(plan.originalPrice) : null

              const discountBadge =
                !isCourtesy &&
                (plan.discountBadge ||
                  (originalPrice && originalPrice > price
                    ? `${Math.round(((originalPrice - price) / originalPrice) * 100)}% OFF`
                    : null))

              const savings =
                !isCourtesy && originalPrice && originalPrice > price
                  ? (originalPrice - price).toFixed(2).replace('.', ',')
                  : null

              const features = getFeaturesList(plan)
              const intervalLabel = getIntervalLabel(plan)
              const isFeatured = index === 0 || plans.length === 1

              return (
                <div
                  key={plan.id}
                  className={`bg-card rounded-2xl p-8 flex flex-col justify-between relative transition-all ${
                    isFeatured
                      ? 'border-2 border-primary shadow-2xl scale-[1.02] z-20'
                      : 'border border-border hover:border-primary/50 shadow-sm'
                  }`}
                >
                  {isFeatured && (
                    <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-[11px] font-extrabold uppercase tracking-wider px-4 py-1 rounded-full shadow-md whitespace-nowrap">
                      Mais Escolhido • Oferta Especial
                    </span>
                  )}

                  <div className="space-y-6">
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-primary block mb-1">
                          {plan.name}
                        </span>
                        {discountBadge && (
                          <Badge
                            variant="secondary"
                            className="text-[10px] font-extrabold text-emerald-600 dark:text-emerald-400 bg-emerald-500/15 border-emerald-500/30"
                          >
                            {discountBadge}
                          </Badge>
                        )}
                        {isCourtesy && (
                          <Badge
                            variant="secondary"
                            className="text-[10px] font-extrabold text-amber-600 dark:text-amber-400 bg-amber-500/15 border-amber-500/30"
                          >
                            Plano Cortesia
                          </Badge>
                        )}
                      </div>
                      <h3 className="text-2xl font-bold text-foreground">{plan.name}</h3>
                      {plan.description && (
                        <p
                          className="text-xs text-muted-foreground mt-2 text-justify leading-relaxed"
                          style={{ textAlign: 'justify', textJustify: 'inter-word' }}
                        >
                          {plan.description}
                        </p>
                      )}
                    </div>

                    {/* Bloco de Preço Dinâmico Real Salvo */}
                    <div className="pt-2">
                      {originalPrice && (
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="text-xs text-muted-foreground font-semibold">De:</span>
                          <span className="text-base text-muted-foreground line-through font-bold decoration-rose-500/80 decoration-2">
                            {formatPrice(originalPrice)}
                          </span>
                          {savings && (
                            <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                              Economize R$ {savings}/{intervalLabel}
                            </span>
                          )}
                        </div>
                      )}

                      <div className="flex items-baseline gap-1.5">
                        <span className="text-xs text-primary font-bold uppercase tracking-wider">
                          {isCourtesy ? 'Acesso:' : 'Por:'}
                        </span>
                        <span className="text-4xl sm:text-5xl font-black text-foreground tracking-tight">
                          {isCourtesy || price === 0 ? 'Cortesia' : formatPrice(price)}
                        </span>
                        {!isCourtesy && (
                          <span className="text-xs text-muted-foreground font-medium">/ {intervalLabel}</span>
                        )}
                      </div>

                      {discountBadge && (
                        <div className="mt-2.5 flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-semibold bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1.5 rounded-lg">
                          <Zap className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                          <span>Desconto especial ativo na contratação!</span>
                        </div>
                      )}

                      {/* Formas de pagamento: ocultas quando o plano for cortesia */}
                      {!isCourtesy && (
                        <div className="flex items-center gap-2 mt-3">
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                            <QrCode className="w-3 h-3" /> PIX
                          </span>
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-primary/15 text-primary border border-primary/30">
                            <CreditCard className="w-3 h-3" /> Cartão de Crédito
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Benefícios Dinâmicos Salvos */}
                    <div className="pt-4 border-t border-border space-y-3 text-xs text-foreground">
                      {features.map((feat: string, idx: number) => (
                        <div key={idx} className="flex items-center gap-2.5">
                          <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                          <span>{feat}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="pt-8">
                    <Button
                      asChild
                      size="lg"
                      className={`w-full h-12 font-extrabold text-sm gap-2 cursor-pointer ${
                        isFeatured ? 'shadow-lg' : ''
                      }`}
                      variant={isFeatured ? 'default' : 'outline'}
                    >
                      <Link href={`/register?plan=${encodeURIComponent(plan.slug || plan.name)}`}>
                        <span>{isCourtesy ? 'Aderir ao Plano Cortesia' : 'Contratar Plano (7 Dias Grátis)'}</span>
                        <ArrowRight className="w-4 h-4" />
                      </Link>
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        )}

      </div>
    </section>
  )
}
