'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  Check,
  ShieldCheck,
  QrCode,
  CreditCard,
  ArrowRight,
  Zap,
  Tag,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

export interface PlanOption {
  id: string
  name: string
  slug?: string
  description?: string
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

// Valores padrão de contingência caso a API ainda não tenha registros no banco
const DEFAULT_MONTHLY_PLAN: PlanOption = {
  id: 'default-monthly',
  name: 'Plano Profissional',
  slug: 'plano-profissional',
  description: 'A solução completa para barbearias que desejam automatizar o atendimento e fidelizar clientes.',
  price: 49.90,
  originalPrice: 79.90,
  discountBadge: '38% OFF',
  discountPercent: 38,
  savingsAmount: 30.00,
  billingInterval: 'MONTHLY',
  cycleType: 'MONTHLY',
  features: [
    'Agendamento em tempo real sem limites',
    'Página exclusiva /b/suabarbearia',
    'Lembretes inteligentes via WhatsApp e SMS',
    'Controle de comissões por barbeiro',
    'Relatórios financeiros detalhados de faturamento',
    'Suporte prioritário via WhatsApp',
  ],
}

const DEFAULT_YEARLY_PLAN: PlanOption = {
  id: 'default-yearly',
  name: 'Plano Anual',
  slug: 'plano-anual',
  description: 'Economize pagando anualmente e garanta estabilidade para o seu negócio o ano todo.',
  price: 479.00,
  originalPrice: 598.80,
  discountBadge: '20% OFF',
  discountPercent: 20,
  savingsAmount: 119.80,
  billingInterval: 'YEARLY',
  cycleType: 'YEARLY',
  features: [
    'Todos os benefícios do Plano Profissional',
    'Parcelamento em até 12x no Cartão',
    'Implantação e suporte VIP por WhatsApp',
    'Sem reajustes durante 12 meses',
    '2 meses grátis inclusos na anuidade',
  ],
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
          if (Array.isArray(data) && data.length > 0 && isMounted) {
            const activePlans = data.filter(
              (p: any) =>
                p.isActive === true &&
                p.status !== 'INACTIVE' &&
                !p.deletedAt &&
                Number(p.price) > 0
            )
            if (activePlans.length > 0) {
              setPlans(activePlans)
            }
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

  // Prepara os planos para exibição: se vieram do banco usa sempre os dados salvos
  const displayPlans = plans.length > 0 ? plans : [DEFAULT_MONTHLY_PLAN, DEFAULT_YEARLY_PLAN]

  // Identificação inteligente do plano mensal (destaque) e anual
  const isMonthlyPlan = (p: PlanOption) => {
    const interval = (p.billingInterval || '').toUpperCase()
    const cycle = (p.cycleType || '').toUpperCase()
    const name = (p.name || '').toLowerCase()
    const slug = (p.slug || '').toLowerCase()
    return (
      interval === 'MONTHLY' ||
      cycle === 'MONTHLY' ||
      name.includes('mensal') ||
      name.includes('profissional') ||
      slug.includes('mensal') ||
      slug.includes('profissional')
    )
  }

  const isYearlyPlan = (p: PlanOption) => {
    const interval = (p.billingInterval || '').toUpperCase()
    const cycle = (p.cycleType || '').toUpperCase()
    const name = (p.name || '').toLowerCase()
    const slug = (p.slug || '').toLowerCase()
    return (
      interval === 'YEARLY' ||
      cycle === 'YEARLY' ||
      name.includes('anual') ||
      slug.includes('anual')
    )
  }

  // Separa o plano mensal (ou destaque) e o plano anual garantindo dados salvos
  const monthlyPlan =
    displayPlans.find(isMonthlyPlan) ||
    displayPlans[0] ||
    DEFAULT_MONTHLY_PLAN

  const yearlyPlan =
    displayPlans.find((p) => isYearlyPlan(p) && p.id !== monthlyPlan.id) ||
    displayPlans.find((p) => p.id !== monthlyPlan.id) ||
    (displayPlans.length > 1 ? displayPlans[1] : DEFAULT_YEARLY_PLAN)

  // Planos adicionais caso existam mais planos cadastrados no banco
  const additionalPlans = displayPlans.filter(
    (p) =>
      p.id !== monthlyPlan?.id &&
      p.id !== yearlyPlan?.id &&
      p.id !== 'default-monthly' &&
      p.id !== 'default-yearly'
  )

  const getFeaturesList = (plan: PlanOption, defaultList: string[]) => {
    if (Array.isArray(plan.features) && plan.features.length > 0) {
      return plan.features
    }
    if (plan.features && typeof plan.features === 'object' && Array.isArray(plan.features.items)) {
      return plan.features.items
    }
    return defaultList
  }

  return (
    <section id="planos" className="py-24 bg-background relative border-t border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Cabeçalho */}
        <div className="text-center mb-16 space-y-4">
          <Badge variant="outline" className="px-3.5 py-1.5 text-xs font-semibold border-primary/30 text-primary bg-primary/10">
            <span>Condição Promocional com Desconto Ativo</span>
          </Badge>

          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-foreground tracking-tight">
            Tecnologia de ponta com{' '}
            <span className="text-primary">
              preços justos e previsíveis.
            </span>
          </h2>

          <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto">
            Sem pegadinhas, sem taxas escondidas. Comece com <strong>7 dias de teste grátis</strong> e aproveite a <strong>tabela promocional com desconto exclusivo</strong> para sua barbearia com cobrança segura via PIX ou Cartão.
          </p>

          {/* Faixa promocional de urgência/valor */}
          <div className="pt-2">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs sm:text-sm font-bold shadow-xs">
              <Tag className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>Oferta Especial: Economize até 38% contratando hoje com garantia incondicional de 7 dias!</span>
            </div>
          </div>
        </div>

        {/* Grid Principal de Planos */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
          
          {/* Card 1: Trial Gratuito (7 Dias) */}
          <div className="bg-card border border-border rounded-2xl p-8 flex flex-col justify-between hover:border-primary/40 transition-all shadow-sm">
            <div className="space-y-6">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                  Experimentação
                </span>
                <h3 className="text-2xl font-bold text-foreground">Trial 7 Dias Grátis</h3>
                <p className="text-xs text-muted-foreground mt-2">
                  Teste todas as funcionalidades na prática sem precisar cadastrar cartão de crédito.
                </p>
              </div>

              <div className="pt-2">
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-extrabold text-foreground">R$ 0</span>
                  <span className="text-xs text-muted-foreground font-medium">/ 7 dias</span>
                </div>
                <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold block mt-1">
                  ✓ 100% gratuito e sem compromisso
                </span>
              </div>

              <div className="pt-4 border-t border-border space-y-3 text-xs text-muted-foreground">
                <div className="flex items-center gap-2.5">
                  <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>Agendamentos online ilimitados</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>Página pública personalizada da barbearia</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>Gestão de equipe e barbeiros</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>Relatórios básicos e histórico</span>
                </div>
              </div>
            </div>

            <div className="pt-8">
              <Button asChild variant="outline" className="w-full h-11 font-bold text-xs gap-2">
                <Link href="/register">
                  <span>Criar Conta e Testar Grátis</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </Button>
            </div>
          </div>

          {/* Card 2: Plano Mensal / Destaque (Mais Escolhido • Oferta Especial) - Sem ícone de estrela */}
          {(() => {
            const plan = monthlyPlan
            const price = Number(plan.price) || 49.90
            const isFallback = plan.id === DEFAULT_MONTHLY_PLAN.id

            // Verifica se possui originalPrice explicitamente salvo no banco de dados
            const hasSavedOriginalPrice =
              plan.originalPrice !== undefined &&
              plan.originalPrice !== null &&
              Number(plan.originalPrice) > price

            const originalPrice = hasSavedOriginalPrice
              ? Number(plan.originalPrice)
              : (isFallback ? 79.90 : null)

            const discountBadge =
              plan.discountBadge ||
              (originalPrice && originalPrice > price
                ? `${Math.round(((originalPrice - price) / originalPrice) * 100)}% OFF`
                : (isFallback ? '38% OFF' : null))

            const savings =
              originalPrice && originalPrice > price
                ? (originalPrice - price).toFixed(2).replace('.', ',')
                : null

            const features = getFeaturesList(plan, [
              'Agendamento em tempo real sem limite',
              'Página exclusiva /b/suabarbearia',
              'Lembretes inteligentes via WhatsApp e SMS',
              'Controle de comissões por barbeiro',
              'Relatórios financeiros detalhados de faturamento',
              'Suporte prioritário via WhatsApp',
            ])

            return (
              <div className="bg-card border-2 border-primary rounded-2xl p-8 flex flex-col justify-between relative shadow-2xl scale-105 z-20">
                <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-[11px] font-extrabold uppercase tracking-wider px-4 py-1 rounded-full shadow-md whitespace-nowrap">
                  Mais Escolhido • Oferta Especial
                </span>

                <div className="space-y-6">
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-primary block mb-1">
                        {plan.name || 'Plano Profissional'}
                      </span>
                      {discountBadge && (
                        <Badge variant="secondary" className="text-[10px] font-extrabold text-emerald-600 dark:text-emerald-400 bg-emerald-500/15 border-emerald-500/30">
                          {discountBadge}
                        </Badge>
                      )}
                    </div>
                    <h3 className="text-2xl font-bold text-foreground">
                      {plan.name}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-2">
                      {plan.description || 'A solução completa para barbearias que desejam automatizar o atendimento e fidelizar clientes.'}
                    </p>
                  </div>

                  {/* Bloco de Preço Dinâmico Salvo */}
                  <div className="pt-2">
                    {originalPrice && originalPrice > price && (
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="text-xs text-muted-foreground font-semibold">De:</span>
                        <span className="text-base text-muted-foreground line-through font-bold decoration-rose-500/80 decoration-2">
                          {formatPrice(originalPrice)}
                        </span>
                        {savings && (
                          <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                            Economize R$ {savings}/mês
                          </span>
                        )}
                      </div>
                    )}

                    <div className="flex items-baseline gap-1.5">
                      <span className="text-xs text-primary font-bold uppercase tracking-wider">Por:</span>
                      <span className="text-4xl sm:text-5xl font-black text-foreground tracking-tight">
                        {formatPrice(price)}
                      </span>
                      <span className="text-xs text-muted-foreground font-medium">/ mês</span>
                    </div>

                    <div className="mt-2.5 flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-semibold bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1.5 rounded-lg">
                      <Zap className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      <span>Desconto especial ativo na contratação de hoje!</span>
                    </div>

                    <div className="flex items-center gap-2 mt-3">
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                        <QrCode className="w-3 h-3" /> PIX
                      </span>
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-primary/15 text-primary border border-primary/30">
                        <CreditCard className="w-3 h-3" /> Cartão de Crédito
                      </span>
                    </div>
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
                  <Button asChild size="lg" className="w-full h-12 font-extrabold text-sm shadow-lg gap-2 cursor-pointer">
                    <Link href={`/register?plan=${encodeURIComponent(plan.slug || plan.name)}`}>
                      <span>Contratar com Desconto (7 Dias Grátis)</span>
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  </Button>
                </div>
              </div>
            )
          })()}

          {/* Card 3: Plano Anual */}
          {(() => {
            const plan = yearlyPlan
            const price = Number(plan.price) || 479.00
            const isFallback = plan.id === DEFAULT_YEARLY_PLAN.id

            const hasSavedOriginalPrice =
              plan.originalPrice !== undefined &&
              plan.originalPrice !== null &&
              Number(plan.originalPrice) > price

            const originalPrice = hasSavedOriginalPrice
              ? Number(plan.originalPrice)
              : (isFallback ? 598.80 : null)

            const discountBadge =
              plan.discountBadge ||
              (originalPrice && originalPrice > price
                ? `${Math.round(((originalPrice - price) / originalPrice) * 100)}% OFF`
                : (isFallback ? '20% OFF' : null))

            const savings =
              originalPrice && originalPrice > price
                ? (originalPrice - price).toFixed(2).replace('.', ',')
                : null

            const monthlyEquivalent = (price / 12).toFixed(2).replace('.', ',')
            const features = getFeaturesList(plan, [
              'Todos os benefícios do Plano Profissional',
              'Parcelamento em até 12x no Cartão',
              'Implantação e suporte VIP por WhatsApp',
              'Sem reajustes durante 12 meses',
              '2 meses grátis inclusos no pacote',
            ])

            return (
              <div className="bg-card border border-border hover:border-primary/50 rounded-2xl p-8 flex flex-col justify-between transition-all shadow-sm">
                <div className="space-y-6">
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-primary block mb-1">
                        Máxima Economia
                      </span>
                      {discountBadge && (
                        <Badge variant="secondary" className="text-[10px] font-extrabold text-purple-600 dark:text-purple-400 bg-purple-500/15 border-purple-500/30">
                          {discountBadge}
                        </Badge>
                      )}
                    </div>
                    <h3 className="text-2xl font-bold text-foreground">{plan.name}</h3>
                    <p className="text-xs text-muted-foreground mt-2">
                      {plan.description || 'Economize pagando anualmente e garanta estabilidade para o seu negócio o ano todo.'}
                    </p>
                  </div>

                  {/* Bloco de Preço Anual */}
                  <div className="pt-2">
                    {originalPrice && originalPrice > price && (
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="text-xs text-muted-foreground font-semibold">De:</span>
                        <span className="text-base text-muted-foreground line-through font-bold decoration-rose-500/80 decoration-2">
                          {formatPrice(originalPrice)}
                        </span>
                        {savings && (
                          <span className="text-[11px] font-bold text-purple-600 dark:text-purple-300 bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20">
                            Economize R$ {savings}
                          </span>
                        )}
                      </div>
                    )}

                    <div className="flex items-baseline gap-1.5">
                      <span className="text-xs text-primary font-bold uppercase tracking-wider">Por:</span>
                      <span className="text-4xl font-extrabold text-foreground">
                        {formatPrice(price)}
                      </span>
                      <span className="text-xs text-muted-foreground font-medium">/ ano</span>
                    </div>

                    <span className="text-[11px] text-primary font-bold block mt-1.5">
                      Equivalente a apenas R$ {monthlyEquivalent}/mês (2 meses grátis)
                    </span>

                    <div className="flex items-center gap-2 mt-3">
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                        <QrCode className="w-3 h-3" /> PIX
                      </span>
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/30">
                        <CreditCard className="w-3 h-3" /> Até 12x no Cartão
                      </span>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-border space-y-3 text-xs text-muted-foreground">
                    {features.map((feat: string, idx: number) => (
                      <div key={idx} className="flex items-center gap-2.5">
                        <Check className="w-4 h-4 text-purple-500 shrink-0" />
                        <span>{feat}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-8">
                  <Button asChild variant="outline" className="w-full h-11 border-primary/30 text-primary hover:bg-primary/10 font-bold text-xs gap-2">
                    <Link href={`/register?plan=${encodeURIComponent(plan.slug || plan.name)}`}>
                      <span>Garantir Desconto Anual</span>
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  </Button>
                </div>
              </div>
            )
          })()}

        </div>

        {/* Planos Adicionais se configurados no Developer */}
        {additionalPlans.length > 0 && (
          <div className="mt-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {additionalPlans.map((plan) => {
              const price = Number(plan.price) || 0
              const originalPrice = plan.originalPrice ? Number(plan.originalPrice) : null
              const isYearly =
                (plan.billingInterval || '').toUpperCase() === 'YEARLY' ||
                (plan.cycleType || '').toUpperCase() === 'YEARLY'
              const features = getFeaturesList(plan, [
                'Agendamento online completo',
                'Gestão de equipe e barbeiros',
                'Página exclusiva da barbearia',
                'Relatórios financeiros',
              ])

              return (
                <div
                  key={plan.id}
                  className="bg-card border border-border rounded-2xl p-8 flex flex-col justify-between hover:border-primary/40 transition-all shadow-sm"
                >
                  <div className="space-y-6">
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-primary block mb-1">
                          {plan.name}
                        </span>
                        {plan.discountBadge && (
                          <Badge variant="secondary" className="text-[10px] font-extrabold text-emerald-600 dark:text-emerald-400 bg-emerald-500/20 border-emerald-500/40">
                            {plan.discountBadge}
                          </Badge>
                        )}
                      </div>
                      <h3 className="text-2xl font-bold text-foreground">{plan.name}</h3>
                      <p className="text-xs text-muted-foreground mt-2">{plan.description}</p>
                    </div>

                    <div className="pt-2">
                      {originalPrice && originalPrice > price && (
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs text-muted-foreground font-semibold">De:</span>
                          <span className="text-base text-muted-foreground line-through font-bold decoration-rose-500/80 decoration-2">
                            {formatPrice(originalPrice)}
                          </span>
                        </div>
                      )}

                      <div className="flex items-baseline gap-1.5">
                        <span className="text-xs text-primary font-bold uppercase tracking-wider">Por:</span>
                        <span className="text-4xl font-extrabold text-foreground">
                          {formatPrice(price)}
                        </span>
                        <span className="text-xs text-muted-foreground font-medium">
                          /{isYearly ? 'ano' : 'mês'}
                        </span>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-border space-y-3 text-xs text-muted-foreground">
                      {features.map((feat: string, idx: number) => (
                        <div key={idx} className="flex items-center gap-2.5">
                          <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                          <span>{feat}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="pt-8">
                    <Button asChild variant="outline" className="w-full h-11 font-bold text-xs gap-2">
                      <Link href={`/register?plan=${encodeURIComponent(plan.slug || plan.name)}`}>
                        <span>Contratar Plano com Desconto</span>
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
