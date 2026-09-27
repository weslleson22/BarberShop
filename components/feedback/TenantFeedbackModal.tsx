'use client'

import { useState } from 'react'
import { Star, MessageSquare, CheckCircle2, AlertCircle, X, Send } from 'lucide-react'
import { getAuthHeaders } from '@/lib/utils'

interface TenantFeedbackModalProps {
  isOpen: boolean
  onClose: () => void
  barbershopId?: string
  barbershopName?: string
  onFeedbackSubmitted?: () => void
}

export default function TenantFeedbackModal({
  isOpen,
  onClose,
  barbershopId,
  barbershopName,
  onFeedbackSubmitted,
}: TenantFeedbackModalProps) {
  const [easeScore, setEaseScore] = useState<number>(5)
  const [satisfactionScore, setSatisfactionScore] = useState<number>(5)
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
      }, 2500)
    } catch (err: any) {
      setErrorMessage(err.message || 'Falha ao registrar feedback')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-xl max-h-[90vh] overflow-y-auto bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 text-slate-100">
        <button
          onClick={onClose}
          disabled={isSubmitting}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        {submitted ? (
          <div className="py-12 text-center space-y-4 animate-scaleUp">
            <div className="w-16 h-16 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto border border-emerald-500/30">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <h3 className="text-xl font-bold text-white">Obrigado pelo seu Feedback!</h3>
            <p className="text-sm text-slate-400 max-w-md mx-auto">
              Sua opinião como cliente piloto é essencial para evoluirmos a plataforma BarberShop.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
              <div className="p-2.5 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-xl">
                <MessageSquare className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Avaliação da Experiência (Trial 30 Dias)</h3>
                <p className="text-xs text-slate-400">
                  {barbershopName ? `Barbearia: ${barbershopName}` : 'Compartilhe sua experiência real com a equipe'}
                </p>
              </div>
            </div>

            {errorMessage && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-lg flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Facilidade e Satisfação */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-3.5 bg-slate-800/60 rounded-xl border border-slate-700/60">
                <label className="block text-xs font-semibold text-slate-300 mb-2">
                  Facilidade de Uso (1 a 5)
                </label>
                <div className="flex items-center gap-1.5">
                  {[1, 2, 3, 4, 5].map((score) => (
                    <button
                      key={score}
                      type="button"
                      onClick={() => setEaseScore(score)}
                      className={`p-1.5 rounded transition ${
                        easeScore >= score ? 'text-amber-400' : 'text-slate-600 hover:text-slate-400'
                      }`}
                    >
                      <Star className="w-6 h-6 fill-current" />
                    </button>
                  ))}
                  <span className="ml-2 text-xs font-bold text-amber-300">{easeScore}/5</span>
                </div>
              </div>

              <div className="p-3.5 bg-slate-800/60 rounded-xl border border-slate-700/60">
                <label className="block text-xs font-semibold text-slate-300 mb-2">
                  Satisfação Geral (1 a 5)
                </label>
                <div className="flex items-center gap-1.5">
                  {[1, 2, 3, 4, 5].map((score) => (
                    <button
                      key={score}
                      type="button"
                      onClick={() => setSatisfactionScore(score)}
                      className={`p-1.5 rounded transition ${
                        satisfactionScore >= score ? 'text-amber-400' : 'text-slate-600 hover:text-slate-400'
                      }`}
                    >
                      <Star className="w-6 h-6 fill-current" />
                    </button>
                  ))}
                  <span className="ml-2 text-xs font-bold text-amber-300">{satisfactionScore}/5</span>
                </div>
              </div>
            </div>

            {/* Intenção de Continuar */}
            <div className="p-3.5 bg-slate-800/60 rounded-xl border border-slate-700/60">
              <label className="block text-xs font-semibold text-slate-300 mb-2">
                Pretende continuar utilizando a plataforma após o período de teste?
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'YES', label: 'Sim, com certeza', color: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300' },
                  { id: 'MAYBE', label: 'Talvez / Em dúvida', color: 'border-amber-500/40 bg-amber-500/10 text-amber-300' },
                  { id: 'NO', label: 'Não pretendo', color: 'border-rose-500/40 bg-rose-500/10 text-rose-300' },
                ].map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setContinueIntent(opt.id as any)}
                    className={`py-2 px-3 text-xs font-semibold rounded-lg border transition ${
                      continueIntent === opt.id
                        ? opt.color + ' ring-2 ring-white/20'
                        : 'border-slate-700 bg-slate-800/80 text-slate-400 hover:bg-slate-700'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Funcionalidade mais usada e ausente */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Funcionalidade mais utilizada
                </label>
                <input
                  type="text"
                  placeholder="Ex: Agenda diária, link público /b/..."
                  value={mostUsedFeature}
                  onChange={(e) => setMostUsedFeature(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Funcionalidade que faz falta
                </label>
                <input
                  type="text"
                  placeholder="Ex: Lembrete WhatsApp, comissões..."
                  value={missingFeature}
                  onChange={(e) => setMissingFeature(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            {/* Problemas enfrentados */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Quais foram as principais dificuldades no dia a dia?
              </label>
              <textarea
                rows={2}
                placeholder="Conte-nos o que gerou dúvidas ou atrito operacional..."
                value={problems}
                onChange={(e) => setProblems(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-amber-500 resize-none"
              />
            </div>

            {/* Bugs encontrados */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Encontrou algum bug ou comportamento estranho?
              </label>
              <input
                type="text"
                placeholder="Descreva o que aconteceu ou deixe em branco se não houve bugs"
                value={bugsReported}
                onChange={(e) => setBugsReported(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2 text-xs text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-amber-500/20 disabled:opacity-50 transition"
              >
                <Send className="w-3.5 h-3.5" />
                {isSubmitting ? 'Enviando...' : 'Enviar Feedback'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
