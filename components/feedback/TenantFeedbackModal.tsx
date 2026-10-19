'use client'

import { useState } from 'react'
import {
  Star,
  MessageSquare,
  CheckCircle2,
  AlertCircle,
  X,
  Send,
  ThumbsUp,
  HelpCircle,
  XCircle,
  Check,
  Building2,
} from 'lucide-react'
import { getAuthHeaders } from '@/lib/utils'

interface TenantFeedbackModalProps {
  isOpen: boolean
  onClose: () => void
  barbershopId?: string
  barbershopName?: string
  onFeedbackSubmitted?: () => void
}

const easeLabels: Record<number, string> = {
  1: 'Muito Difícil (muito atrito)',
  2: 'Difícil (requer suporte)',
  3: 'Regular (aprendizado normal)',
  4: 'Fácil (fluxo fluido)',
  5: 'Muito Fácil & Intuitivo ✨',
}

const satisfactionLabels: Record<number, string> = {
  1: 'Muito Insatisfeito',
  2: 'Insatisfeito',
  3: 'Neutro / Razoável',
  4: 'Satisfeito com a ferramenta',
  5: 'Encantado / Superou Expectativas! 🚀',
}

export default function TenantFeedbackModal({
  isOpen,
  onClose,
  barbershopId,
  barbershopName,
  onFeedbackSubmitted,
}: TenantFeedbackModalProps) {
  const [easeScore, setEaseScore] = useState<number>(5)
  const [hoverEaseScore, setHoverEaseScore] = useState<number | null>(null)

  const [satisfactionScore, setSatisfactionScore] = useState<number>(5)
  const [hoverSatisfactionScore, setHoverSatisfactionScore] = useState<number | null>(null)

  const [mostUsedFeature, setMostUsedFeature] = useState('')
  const [missingFeature, setMissingFeature] = useState('')
  const [problems, setProblems] = useState('')
  const [bugsReported, setBugsReported] = useState('')
  const [continueIntent, setContinueIntent] = useState<'YES' | 'MAYBE' | 'NO'>('YES')
  const [notes, setNotes] = useState('')

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  if (!isOpen) return null

  const activeEase = hoverEaseScore ?? easeScore
  const activeSatisfaction = hoverSatisfactionScore ?? satisfactionScore

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)
    setIsSubmitting(true)

    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify({
          barbershopId,
          easeScore,
          satisfactionScore,
          mostUsedFeature,
          missingFeature,
          problems,
          bugsReported,
          continueIntent,
          notes,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Erro ao enviar feedback')
      }

      setSubmitted(true)
      if (onFeedbackSubmitted) {
        onFeedbackSubmitted()
      }
      setTimeout(() => {
        setSubmitted(false)
        onClose()
      }, 2400)
    } catch (err: any) {
      setErrorMessage(err.message || 'Falha ao registrar feedback')
    } finally {
      setIsSubmitting(false)
    }
  }

  const continueOptions = [
    {
      id: 'YES' as const,
      label: 'Sim, com certeza',
      desc: 'Pretende assinar o plano',
      icon: ThumbsUp,
      activeColor: 'border-[#10b981] bg-[#059669] text-white shadow-md shadow-emerald-500/20 ring-1 ring-[#10b981]',
      badgeColor: 'bg-[#064e3b] text-white border border-[#10b981]',
    },
    {
      id: 'MAYBE' as const,
      label: 'Talvez / Dúvida',
      desc: 'Avaliando rotina e custos',
      icon: HelpCircle,
      activeColor: 'border-[#f59e0b] bg-[#d97706] text-white shadow-md shadow-amber-500/20 ring-1 ring-[#f59e0b]',
      badgeColor: 'bg-[#78350f] text-white border border-[#f59e0b]',
    },
    {
      id: 'NO' as const,
      label: 'Não pretendo',
      desc: 'Sem interesse em continuar',
      icon: XCircle,
      activeColor: 'border-[#ef4444] bg-[#dc2626] text-white shadow-md shadow-red-500/20 ring-1 ring-[#ef4444]',
      badgeColor: 'bg-[#7f1d1d] text-white border border-[#ef4444]',
    },
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-filter-none animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl max-h-[92vh] flex flex-col bg-[#0f172a] sm:bg-[#111827] border border-[#374151] rounded-2xl shadow-2xl text-white overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-5 sm:p-6 pb-4 border-b border-[#374151] bg-[#030712] flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#2563eb] border border-[#3b82f6] flex items-center justify-center text-white shrink-0 shadow-lg shadow-blue-500/20">
              <MessageSquare className="w-5 h-5 text-white stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-medium text-white tracking-wider uppercase bg-[#1f2937] px-2 py-0.5 rounded border border-[#374151]">
                  CSAT & Validação • Piloto 30 Dias
                </span>
                {barbershopName && (
                  <span className="text-[11px] font-medium text-white bg-[#030712] px-2 py-0.5 rounded-full border border-[#374151] flex items-center gap-1">
                    <Building2 className="w-3 h-3 text-[#3b82f6]" />
                    {barbershopName}
                  </span>
                )}
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-white mt-1">
                Avaliação da Experiência
              </h3>
            </div>
          </div>

          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="p-2 text-white bg-[#1f2937] hover:bg-[#374151] border border-[#4b5563] rounded-xl transition cursor-pointer active:scale-95"
            aria-label="Fechar modal"
          >
            <X className="w-4 h-4 text-white" />
          </button>
        </div>

        {/* Modal Body */}
        {submitted ? (
          <div className="py-14 px-6 text-center space-y-4 animate-in fade-in zoom-in-95 duration-300">
            <div className="w-16 h-16 bg-[#059669] text-white rounded-2xl flex items-center justify-center mx-auto border border-[#10b981] shadow-xl shadow-emerald-500/30 animate-bounce">
              <CheckCircle2 className="w-9 h-9 stroke-[2.5]" />
            </div>
            <h3 className="text-xl font-bold text-white">Avaliação Registrada com Sucesso!</h3>
            <p className="text-xs text-white font-normal max-w-md mx-auto leading-relaxed">
              Obrigado! Os indicadores de satisfação (CSAT) e retenção desta barbearia foram salvos e atualizados em tempo real no cockpit do desenvolvedor.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
            {errorMessage && (
              <div className="p-3 bg-[#dc2626] border border-[#ef4444] text-white text-xs font-medium rounded-xl flex items-center gap-2 animate-in fade-in">
                <AlertCircle className="w-4 h-4 shrink-0 text-white" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Avaliação Interativa: Facilidade e Satisfação */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {/* Facilidade de Uso */}
              <div className="p-4 bg-[#030712] rounded-xl border border-[#374151] space-y-2.5 transition-colors hover:border-[#4b5563]">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-white">
                    Facilidade de Uso
                  </span>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[#1f2937] text-white border border-[#374151]">
                    {activeEase}/5 ★
                  </span>
                </div>

                <div className="flex items-center gap-1.5 pt-0.5">
                  {[1, 2, 3, 4, 5].map((score) => {
                    const isFilled = activeEase >= score
                    return (
                      <button
                        key={score}
                        type="button"
                        onClick={() => setEaseScore(score)}
                        onMouseEnter={() => setHoverEaseScore(score)}
                        onMouseLeave={() => setHoverEaseScore(null)}
                        className={`p-1 rounded-lg transition-transform duration-150 hover:scale-125 active:scale-95 cursor-pointer ${
                          isFilled
                            ? 'text-[#f59e0b]'
                            : 'text-[#4b5563] hover:text-[#f59e0b]/70'
                        }`}
                        aria-label={`Nota de facilidade ${score}`}
                      >
                        <Star
                          className={`w-6 h-6 transition-all duration-150 ${
                            isFilled ? 'fill-[#f59e0b] drop-shadow-[0_0_6px_rgba(245,158,11,0.5)]' : 'fill-transparent'
                          }`}
                        />
                      </button>
                    )
                  })}
                </div>

                <div className="text-[11px] text-white/70 font-normal">
                  {easeLabels[activeEase]}
                </div>
              </div>

              {/* Satisfação Geral */}
              <div className="p-4 bg-[#030712] rounded-xl border border-[#374151] space-y-2.5 transition-colors hover:border-[#4b5563]">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-white">
                    Satisfação Geral
                  </span>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[#1f2937] text-white border border-[#374151]">
                    {activeSatisfaction}/5 ★
                  </span>
                </div>

                <div className="flex items-center gap-1.5 pt-0.5">
                  {[1, 2, 3, 4, 5].map((score) => {
                    const isFilled = activeSatisfaction >= score
                    return (
                      <button
                        key={score}
                        type="button"
                        onClick={() => setSatisfactionScore(score)}
                        onMouseEnter={() => setHoverSatisfactionScore(score)}
                        onMouseLeave={() => setHoverSatisfactionScore(null)}
                        className={`p-1 rounded-lg transition-transform duration-150 hover:scale-125 active:scale-95 cursor-pointer ${
                          isFilled
                            ? 'text-[#f59e0b]'
                            : 'text-[#4b5563] hover:text-[#f59e0b]/70'
                        }`}
                        aria-label={`Nota de satisfação ${score}`}
                      >
                        <Star
                          className={`w-6 h-6 transition-all duration-150 ${
                            isFilled ? 'fill-[#f59e0b] drop-shadow-[0_0_6px_rgba(245,158,11,0.5)]' : 'fill-transparent'
                          }`}
                        />
                      </button>
                    )
                  })}
                </div>

                <div className="text-[11px] text-white/70 font-normal">
                  {satisfactionLabels[activeSatisfaction]}
                </div>
              </div>
            </div>

            {/* Intenção de Continuar (3 Cards Interativos) */}
            <div className="p-4 bg-[#030712] rounded-xl border border-[#374151] space-y-2.5">
              <label className="block text-xs font-semibold text-white">
                Pretende continuar utilizando após o período de teste de 30 dias?
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-0.5">
                {continueOptions.map((opt) => {
                  const Icon = opt.icon
                  const isSelected = continueIntent === opt.id

                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setContinueIntent(opt.id)}
                      className={`p-3 rounded-xl border text-left transition-all duration-200 cursor-pointer select-none relative flex flex-col justify-between ${
                        isSelected
                          ? opt.activeColor
                          : 'border-[#374151] bg-[#111827] text-white hover:bg-[#1f2937] hover:border-[#4b5563] hover:-translate-y-0.5'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <Icon className="w-4 h-4 text-white shrink-0" />
                        {isSelected && <Check className="w-3.5 h-3.5 text-white stroke-[3]" />}
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-white">{opt.label}</div>
                        <div className="text-[10px] text-white/70 mt-0.5">{opt.desc}</div>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Funcionalidades mais usadas e ausentes */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-semibold text-white mb-1.5">
                  Funcionalidade mais utilizada
                </label>
                <input
                  type="text"
                  placeholder="Ex: Agenda diária, link público /b/..."
                  value={mostUsedFeature}
                  onChange={(e) => setMostUsedFeature(e.target.value)}
                  className="w-full bg-[#030712] border border-[#374151] rounded-xl px-3.5 py-2.5 text-xs text-white font-normal placeholder:text-white/40 focus:outline-none focus:border-[#3b82f6] focus:ring-1 focus:ring-[#3b82f6] transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-white mb-1.5">
                  Funcionalidade que faz falta
                </label>
                <input
                  type="text"
                  placeholder="Ex: Lembrete WhatsApp, relatórios..."
                  value={missingFeature}
                  onChange={(e) => setMissingFeature(e.target.value)}
                  className="w-full bg-[#030712] border border-[#374151] rounded-xl px-3.5 py-2.5 text-xs text-white font-normal placeholder:text-white/40 focus:outline-none focus:border-[#3b82f6] focus:ring-1 focus:ring-[#3b82f6] transition-all"
                />
              </div>
            </div>

            {/* Dificuldades enfrentadas */}
            <div>
              <label className="block text-xs font-semibold text-white mb-1.5">
                Quais foram as principais dúvidas ou dificuldades no dia a dia?
              </label>
              <textarea
                rows={2}
                placeholder="Conte o que gerou atrito operacional ou dúvidas da equipe..."
                value={problems}
                onChange={(e) => setProblems(e.target.value)}
                className="w-full bg-[#030712] border border-[#374151] rounded-xl p-3 text-xs text-white font-normal placeholder:text-white/40 focus:outline-none focus:border-[#3b82f6] focus:ring-1 focus:ring-[#3b82f6] transition-all resize-none"
              />
            </div>

            {/* Bugs encontrados */}
            <div>
              <label className="block text-xs font-semibold text-white mb-1.5">
                Encontrou algum bug ou comportamento inesperado?
              </label>
              <input
                type="text"
                placeholder="Descreva o que aconteceu ou deixe em branco se não houve falhas"
                value={bugsReported}
                onChange={(e) => setBugsReported(e.target.value)}
                className="w-full bg-[#030712] border border-[#374151] rounded-xl px-3.5 py-2.5 text-xs text-white font-normal placeholder:text-white/40 focus:outline-none focus:border-[#3b82f6] focus:ring-1 focus:ring-[#3b82f6] transition-all"
              />
            </div>

            {/* Rodapé do Formulário */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#374151]">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2 text-xs text-white font-medium rounded-xl border border-[#374151] bg-[#111827] hover:bg-[#1f2937] transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex items-center gap-2 px-6 py-2.5 bg-[#2563eb] hover:bg-[#1d4ed8] text-white font-medium text-xs rounded-xl border border-[#3b82f6] shadow-md shadow-blue-500/20 transition cursor-pointer active:scale-95 disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5 text-white" />
                <span>{isSubmitting ? 'Registrando...' : 'Salvar Avaliação'}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
