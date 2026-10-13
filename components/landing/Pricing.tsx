'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { Check, ShieldCheck, QrCode, CreditCard, ArrowRight, Zap } from 'lucide-react'

interface PlanOption {
  id: string
  name: string
  description?: string
  price: number
  billingInterval: string
  features?: string[] | any
  providerProductId?: string
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
          setPlans(activePlans)
        }
      })
      .catch((err) => console.warn('Erro ao carregar planos dinâmicos na landing:', err))
      .finally(() => setLoading(false))
  }, [])

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(price)
  }
  return (
    <section id="planos" className="py-24 bg-gray-950 relative border-t border-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Cabeçalho */}
        <div className="text-center mb-16 space-y-4">
          <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-gray-900 border border-gray-800 text-blue-400 text-xs font-semibold uppercase tracking-wider">
            <CreditCard className="w-3.5 h-3.5 text-blue-400" />
            <span>Planos e Preços Transparentes</span>
          </div>

          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight">
            Tecnologia de ponta com{' '}
            <span className="text-blue-400">
              preços justos e previsíveis.
            </span>
          </h2>

          <p className="text-base sm:text-lg text-slate-400 max-w-2xl mx-auto">
            Sem pegadinhas, sem taxas escondidas. Comece com <strong>30 dias de teste grátis</strong> e escolha a melhor opção para sua barbearia com cobrança segura via PIX ou Cartão.
          </p>
        </div>

        {/* Grid de Planos */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
          
          {/* Card 1: Trial Gratuito */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 flex flex-col justify-between hover:border-gray-700 transition-colors shadow-sm">
            <div className="space-y-6">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  Experimentação
                </span>
                <h3 className="text-2xl font-bold text-white">Trial 30 Dias Grátis</h3>
                <p className="text-xs text-slate-400 mt-2">
                  Teste todas as funcionalidades na prática sem precisar cadastrar cartão de crédito.
                </p>
              </div>

              <div className="pt-2">
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-extrabold text-white">R$ 0</span>
                  <span className="text-xs text-slate-400 font-medium">/ 30 dias</span>
                </div>
                <span className="text-[11px] text-emerald-400 font-medium block mt-1">
                  100% gratuito e sem compromisso
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
                className="w-full py-3 px-4 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 text-white font-semibold text-xs transition flex items-center justify-center gap-2"
              >
                <span>Criar Conta e Testar Grátis</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          {/* Card 2: Plano Profissional (Destaque) */}
          <div className="bg-gray-900 border-2 border-blue-500 rounded-2xl p-8 flex flex-col justify-between relative shadow-md scale-105 z-20">
            <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-[11px] font-bold uppercase tracking-wider px-4 py-1 rounded-full shadow-sm">
              Mais Escolhido
            </span>

            <div className="space-y-6">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-blue-400 block mb-1">
                  Plano Profissional
                </span>
                <h3 className="text-2xl font-bold text-white">Mensal Recorrente</h3>
                <p className="text-xs text-slate-300 mt-2">
                  A solução completa para barbearias que desejam automatizar o atendimento e fidelizar clientes.
                </p>
              </div>

              <div className="pt-2">
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl sm:text-5xl font-black text-white">R$ 49,90</span>
                  <span className="text-xs text-slate-400 font-medium">/ mês</span>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                    <QrCode className="w-3 h-3" /> PIX
                  </span>
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-blue-500/15 text-blue-400 border border-blue-500/30">
                    <CreditCard className="w-3 h-3" /> Cartão de Crédito
                  </span>
                </div>
              </div>

              <div className="pt-4 border-t border-white/10 space-y-3 text-xs text-slate-200">
                <div className="flex items-center gap-2.5">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span><strong>Agendamento em tempo real</strong> sem limite</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Página exclusiva <code>/b/suabarbearia</code></span>
                </div>
                <div className="flex items-center gap-2.5">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Lembretes inteligentes via WhatsApp e SMS</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Controle de comissões por barbeiro</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Relatórios financeiros detalhados de faturamento</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Suporte prioritário via WhatsApp</span>
                </div>
              </div>
            </div>

            <div className="pt-8">
              <Link
                href="/register"
                className="w-full py-3.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm transition-colors flex items-center justify-center gap-2"
              >
                <span>Contratar (30 Dias Grátis)</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          {/* Card 3: Plano Anual */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 flex flex-col justify-between hover:border-gray-700 transition-colors shadow-sm">
            <div className="space-y-6">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-purple-400 block mb-1">
                  Máxima Economia
                </span>
                <h3 className="text-2xl font-bold text-white">Plano Anual</h3>
                <p className="text-xs text-slate-400 mt-2">
                  Economize pagando anualmente e garanta estabilidade para o seu negócio o ano todo.
                </p>
              </div>

              <div className="pt-2">
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-extrabold text-white">R$ 479,00</span>
                  <span className="text-xs text-slate-400 font-medium">/ ano</span>
                </div>
                <span className="text-[11px] text-purple-400 font-bold block mt-1">
                  Equivalente a apenas R$ 39,90/mês (2 meses grátis)
                </span>
              </div>

              <div className="pt-4 border-t border-white/10 space-y-3 text-xs text-slate-300">
                <div className="flex items-center gap-2.5">
                  <Check className="w-4 h-4 text-purple-400 shrink-0" />
                  <span>Todos os benefícios do Plano Profissional</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <Check className="w-4 h-4 text-purple-400 shrink-0" />
                  <span>Parcelamento em até 12x no Cartão</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <Check className="w-4 h-4 text-purple-400 shrink-0" />
                  <span>Implantação e suporte VIP por WhatsApp</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <Check className="w-4 h-4 text-purple-400 shrink-0" />
                  <span>Sem reajustes durante 12 meses</span>
                </div>
              </div>
            </div>

            <div className="pt-8">
              <Link
                href="/register"
                className="w-full py-3 px-4 rounded-xl border border-purple-500/30 bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 font-semibold text-xs transition flex items-center justify-center gap-2"
              >
                <span>Garantir Desconto Anual</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

        </div>

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
