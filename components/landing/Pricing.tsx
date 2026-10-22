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
  Sparkles,
  Tag,
} from 'lucide-react'

export interface PlanOption {
  id: string
  name: string
  slug?: string
  description?: string
  price: number
  originalPrice?: number | null
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

// Valores padrão de contingência caso a API esteja carregando ou sem registros no banco
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
    fetch('/api/billing/plans')
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
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
      })
      .catch((err) => console.warn('Erro ao carregar planos dinâmicos na landing:', err))
      .finally(() => setLoading(false))
  }, [])

  const formatPrice = (price: number | string) => {
    const val = Number(price) || 0
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)
  }

  // Prepara os planos para exibição: se vieram do banco/developer usa eles, caso contrário usa os defaults
  const displayPlans = plans.length > 0 ? plans : [DEFAULT_MONTHLY_PLAN, DEFAULT_YEARLY_PLAN]

  // Separa o plano mensal (ou destaque) e o plano anual
  const monthlyPlan =
    displayPlans.find((p) => p.billingInterval === 'MONTHLY' || p.cycleType === 'MONTHLY') ||
    displayPlans[0] ||
    DEFAULT_MONTHLY_PLAN

  const yearlyPlan =
    displayPlans.find((p) => p.billingInterval === 'YEARLY' || p.cycleType === 'YEARLY') ||
    (displayPlans.length > 1 ? displayPlans[1] : DEFAULT_YEARLY_PLAN)

  // Planos adicionais caso o Developer tenha cadastrado mais de 2 planos pagos
  const additionalPlans = displayPlans.filter(
    (p) => p.id !== monthlyPlan?.id && p.id !== yearlyPlan?.id
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
    <section id="planos" className="py-24 bg-gray-950 relative border-t border-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Cabeçalho */}
        <div className="text-center mb-16 space-y-4">
          <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-blue-950/60 border border-blue-800/60 text-blue-400 text-xs font-semibold uppercase tracking-wider shadow-sm">
            <Sparkles className="w-3.5 h-3.5 text-blue-400 animate-pulse" />
            <span>Condição Promocional com Desconto Ativo</span>
          </div>

          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight">
            Tecnologia de ponta com{' '}
            <span className="text-blue-400">
              preços justos e previsíveis.
            </span>
          </h2>

          <p className="text-base sm:text-lg text-slate-400 max-w-2xl mx-auto">
            Sem pegadinhas, sem taxas escondidas. Comece com <strong>7 dias de teste grátis</strong> e aproveite a <strong>tabela promocional com desconto exclusivo</strong> para sua barbearia com cobrança segura via PIX ou Cartão.
          </p>

          {/* Faixa promocional de urgência/valor */}
          <div className="pt-2">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs sm:text-sm font-bold shadow-md">
              <Tag className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Oferta Especial: Economize até 38% contratando hoje com garantia incondicional de 7 dias!</span>
            </div>
          </div>
        </div>

        {/* Grid Principal de Planos */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
          
          {/* Card 1: Trial Gratuito (7 Dias) */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 flex flex-col justify-between hover:border-gray-700 transition-colors shadow-sm">
            <div className="space-y-6">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  Experimentação
                </span>
                <h3 className="text-2xl font-bold text-white">Trial 7 Dias Grátis</h3>
                <p className="text-xs text-slate-400 mt-2">
                  Teste todas as funcionalidades na prática sem precisar cadastrar cartão de crédito.
                </p>
              </div>

              <div className="pt-2">
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-extrabold text-white">R$ 0</span>
                  <span className="text-xs text-slate-400 font-medium">/ 7 dias</span>
                </div>
                <span className="text-[11px] text-emerald-400 font-medium block mt-1">
                  ✓ 100% gratuito e sem compromisso
                </span>
              </div>

              <div className="pt-4 border-t border-white/10 space-y-3 text-xs text-slate-300">
                <div className="flex items-center gap-2.5">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Agendamentos online ilimitados</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Página pública personalizada da barbearia</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Gestão de equipe e barbeiros</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Relatórios básicos e histórico</span>
                </div>
              </div>
            </div>

            <div className="pt-8">
              <Link
                href="/register"
                className="w-full py-3.5 px-4 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 text-white font-bold text-xs transition flex items-center justify-center gap-2"
              >
                <span>Criar Conta e Testar Grátis</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          {/* Card 2: Plano Mensal / Destaque (Com Preço Cortado e Desconto) */}
          {(() => {
            const plan = monthlyPlan
            const price = Number(plan.price) || 49.90
            const originalPrice =
              plan.originalPrice && Number(plan.originalPrice) > price
                ? Number(plan.originalPrice)
                : 79.90
            const discountBadge =
              plan.discountBadge ||
              `${Math.round(((originalPrice - price) / originalPrice) * 100)}% OFF`
            const savings = (originalPrice - price).toFixed(2).replace('.', ',')
            const features = getFeaturesList(plan, [
              'Agendamento em tempo real sem limite',
              'Página exclusiva /b/suabarbearia',
              'Lembretes inteligentes via WhatsApp e SMS',
              'Controle de comissões por barbeiro',
              'Relatórios financeiros detalhados de faturamento',
              'Suporte prioritário via WhatsApp',
            ])

            return (
              <div className="bg-gray-900 border-2 border-blue-500 rounded-2xl p-8 flex flex-col justify-between relative shadow-2xl scale-105 z-20">
                <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-[11px] font-extrabold uppercase tracking-wider px-4 py-1 rounded-full shadow-md flex items-center gap-1.5">
                  <Sparkles className="w-3 h-3 text-amber-300" />
                  Mais Escolhido • Oferta Especial
                </span>

                <div className="space-y-6">
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-blue-400 block mb-1">
                        {plan.name || 'Plano Profissional'}
                      </span>
                      <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                        {discountBadge}
                      </span>
                    </div>
                    <h3 className="text-2xl font-bold text-white">
                      {plan.name.includes('Mensal') ? plan.name : `${plan.name} (Mensal)`}
                    </h3>
                    <p className="text-xs text-slate-300 mt-2">
                      {plan.description || 'A solução completa para barbearias que desejam automatizar o atendimento e fidelizar clientes.'}
                    </p>
                  </div>

                  {/* Bloco de Preço: Preço Cortado sem Desconto + Preço Atual */}
                  <div className="pt-2">
                    {/* Linha do Preço Cortado / Sem Desconto */}
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-xs text-slate-400 font-semibold">De:</span>
                      <span className="text-base text-slate-400 line-through font-bold decoration-red-500/80 decoration-2">
                        {formatPrice(originalPrice)}
                      </span>
                      <span className="text-[11px] font-bold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/60">
                        Economize R$ {savings}/mês
                      </span>
                    </div>

                    {/* Preço Atual Promocional */}
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-xs text-blue-400 font-bold uppercase tracking-wider">Por:</span>
                      <span className="text-4xl sm:text-5xl font-black text-white tracking-tight">
                        {formatPrice(price)}
                      </span>
                      <span className="text-xs text-slate-400 font-medium">/ mês</span>
                    </div>

                    {/* Mensagem de percepção de alto valor e desconto */}
                    <div className="mt-2.5 flex items-center gap-1.5 text-xs text-emerald-400 font-semibold bg-emerald-950/40 border border-emerald-800/40 px-2.5 py-1.5 rounded-lg">
                      <Zap className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>Desconto especial ativo na contratação de hoje!</span>
                    </div>

                    {/* Formas de pagamento */}
                    <div className="flex items-center gap-2 mt-3">
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                        <QrCode className="w-3 h-3" /> PIX
                      </span>
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-blue-500/15 text-blue-400 border border-blue-500/30">
                        <CreditCard className="w-3 h-3" /> Cartão de Crédito
                      </span>
                    </div>
                  </div>

                  {/* Benefícios */}
                  <div className="pt-4 border-t border-white/10 space-y-3 text-xs text-slate-200">
                    {features.map((feat: string, idx: number) => (
                      <div key={idx} className="flex items-center gap-2.5">
                        <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span>{feat}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-8">
                  <Link
                    href={`/register?plan=${encodeURIComponent(plan.slug || plan.name)}`}
                    className="w-full py-4 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-sm transition-all flex items-center justify-center gap-2 shadow-xl shadow-blue-600/30 hover:scale-[1.02] cursor-pointer"
                  >
                    <span>Contratar com Desconto (7 Dias Grátis)</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            )
          })()}

          {/* Card 3: Plano Anual (Com Máxima Economia e Preço Cortado) */}
          {(() => {
            const plan = yearlyPlan
            const price = Number(plan.price) || 479.00
            const originalPrice =
              plan.originalPrice && Number(plan.originalPrice) > price
                ? Number(plan.originalPrice)
                : 598.80
            const discountBadge =
              plan.discountBadge ||
              `${Math.round(((originalPrice - price) / originalPrice) * 100)}% OFF`
            const savings = (originalPrice - price).toFixed(2).replace('.', ',')
            const monthlyEquivalent = (price / 12).toFixed(2).replace('.', ',')
            const features = getFeaturesList(plan, [
              'Todos os benefícios do Plano Profissional',
              'Parcelamento em até 12x no Cartão',
              'Implantação e suporte VIP por WhatsApp',
              'Sem reajustes durante 12 meses',
              '2 meses grátis inclusos no pacote',
            ])

            return (
              <div className="bg-gray-900 border border-purple-800/60 rounded-2xl p-8 flex flex-col justify-between hover:border-purple-600 transition-colors shadow-sm">
                <div className="space-y-6">
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-purple-400 block mb-1">
                        Máxima Economia
                      </span>
                      <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40">
                        {discountBadge}
                      </span>
                    </div>
                    <h3 className="text-2xl font-bold text-white">{plan.name || 'Plano Anual'}</h3>
                    <p className="text-xs text-slate-400 mt-2">
                      {plan.description || 'Economize pagando anualmente e garanta estabilidade para o seu negócio o ano todo.'}
                    </p>
                  </div>

                  {/* Bloco de Preço Anual: Preço Cortado + Preço com Desconto */}
                  <div className="pt-2">
                    {/* Linha do Preço Cortado / Sem Desconto */}
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-xs text-slate-400 font-semibold">De:</span>
                      <span className="text-base text-slate-400 line-through font-bold decoration-red-500/80 decoration-2">
                        {formatPrice(originalPrice)}
                      </span>
                      <span className="text-[11px] font-bold text-purple-300 bg-purple-950/60 px-2 py-0.5 rounded border border-purple-800/60">
                        Economize R$ {savings}
                      </span>
                    </div>

                    {/* Preço Atual Promocional */}
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-xs text-purple-400 font-bold uppercase tracking-wider">Por:</span>
                      <span className="text-4xl font-extrabold text-white">
                        {formatPrice(price)}
                      </span>
                      <span className="text-xs text-slate-400 font-medium">/ ano</span>
                    </div>

                    <span className="text-[11px] text-purple-400 font-bold block mt-1.5">
                      Equivalente a apenas R$ {monthlyEquivalent}/mês (2 meses grátis)
                    </span>

                    {/* Formas de pagamento */}
                    <div className="flex items-center gap-2 mt-3">
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                        <QrCode className="w-3 h-3" /> PIX
                      </span>
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-purple-500/15 text-purple-400 border border-purple-500/30">
                        <CreditCard className="w-3 h-3" /> Até 12x no Cartão
                      </span>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-white/10 space-y-3 text-xs text-slate-300">
                    {features.map((feat: string, idx: number) => (
                      <div key={idx} className="flex items-center gap-2.5">
                        <Check className="w-4 h-4 text-purple-400 shrink-0" />
                        <span>{feat}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-8">
                  <Link
                    href={`/register?plan=${encodeURIComponent(plan.slug || plan.name)}`}
                    className="w-full py-3.5 px-4 rounded-xl border border-purple-500/30 bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 font-bold text-xs transition flex items-center justify-center gap-2 shadow-lg hover:scale-[1.02] cursor-pointer"
                  >
                    <span>Garantir Desconto Anual</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
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
              const isYearly = plan.billingInterval === 'YEARLY' || plan.cycleType === 'YEARLY'
              const features = getFeaturesList(plan, [
                'Agendamento online completo',
                'Gestão de equipe e barbeiros',
                'Página exclusiva da barbearia',
                'Relatórios financeiros',
              ])

              return (
                <div
                  key={plan.id}
                  className="bg-gray-900 border border-gray-800 rounded-2xl p-8 flex flex-col justify-between hover:border-gray-700 transition-colors shadow-sm"
                >
                  <div className="space-y-6">
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-blue-400 block mb-1">
                          {plan.name}
                        </span>
                        {plan.discountBadge && (
                          <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                            {plan.discountBadge}
                          </span>
                        )}
                      </div>
                      <h3 className="text-2xl font-bold text-white">{plan.name}</h3>
                      <p className="text-xs text-slate-400 mt-2">{plan.description}</p>
                    </div>

                    <div className="pt-2">
                      {originalPrice && originalPrice > price && (
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs text-slate-400 font-semibold">De:</span>
                          <span className="text-base text-slate-400 line-through font-bold decoration-red-500/80 decoration-2">
                            {formatPrice(originalPrice)}
                          </span>
                        </div>
                      )}

                      <div className="flex items-baseline gap-1.5">
                        <span className="text-xs text-blue-400 font-bold uppercase tracking-wider">Por:</span>
                        <span className="text-4xl font-extrabold text-white">
                          {formatPrice(price)}
                        </span>
                        <span className="text-xs text-slate-400 font-medium">
                          /{isYearly ? 'ano' : 'mês'}
                        </span>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-white/10 space-y-3 text-xs text-slate-300">
                      {features.map((feat: string, idx: number) => (
                        <div key={idx} className="flex items-center gap-2.5">
                          <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                          <span>{feat}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="pt-8">
                    <Link
                      href={`/register?plan=${encodeURIComponent(plan.slug || plan.name)}`}
                      className="w-full py-3.5 px-4 rounded-xl border border-blue-500/30 bg-blue-500/10 hover:bg-blue-500/20 text-blue-300 font-bold text-xs transition flex items-center justify-center gap-2"
                    >
                      <span>Contratar Plano com Desconto</span>
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Faixa de Garantia e Gateway */}
        <div className="mt-16 p-6 rounded-2xl bg-gray-900 border border-gray-800 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-slate-300">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-950/60 border border-emerald-800/60 flex items-center justify-center text-emerald-400 shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <strong className="text-white block text-sm">Garantia Incondicional de 7 Dias (CDC)</strong>
              <span className="text-slate-400">
                Se não ficar 100% satisfeito, solicite o estorno do valor pago sem burocracia ou multas.
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <span className="text-slate-400">Processado com segurança por:</span>
            <div className="px-3 py-1.5 rounded-lg bg-gray-950 border border-gray-800 text-emerald-400 font-semibold flex items-center gap-1.5 shadow-sm">
              <CreditCard className="w-4 h-4 text-emerald-400" />
              <span>AbacatePay</span>
            </div>
          </div>
        </div>

      </div>
    </section>
  )
}
