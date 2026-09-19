'use client'

import { useAuth } from '@/lib/auth-context'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowRight, Calendar, CheckCircle2, ShieldCheck, Sparkles, Clock, Lock } from 'lucide-react'

export default function CTA() {
  const { user } = useAuth()
  const router = useRouter()

  const handleBooking = () => {
    router.push('/agendar')
  }

  const handleLogin = () => {
    if (user) {
      if (user.role === 'DEVELOPER') router.push('/developer')
      else if (user.role === 'CLIENT') router.push('/meus-agendamentos')
      else router.push('/dashboard')
    } else {
      router.push('/login')
    }
  }

  return (
    <section className="py-24 bg-[#080C14] border-t border-white/5 relative overflow-hidden">
      {/* Luz ambiente */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-[140px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="rounded-3xl bg-gradient-to-b from-slate-900/90 via-slate-900/60 to-slate-950/90 border border-white/10 p-8 sm:p-12 lg:p-16 shadow-2xl shadow-blue-950/40 backdrop-blur-2xl relative overflow-hidden text-center">
          
          {/* Badge */}
          <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold uppercase tracking-wider mb-6">
            <Sparkles className="w-3.5 h-3.5 text-blue-400" />
            <span>Comece em Poucos Segundos</span>
          </div>

          {/* Título de Fechamento */}
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight leading-tight max-w-3xl mx-auto mb-6">
            Pronto para agendar seu próximo serviço com{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-cyan-300 to-indigo-400">
              total comodidade?
            </span>
          </h2>

          <p className="text-base sm:text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed mb-10">
            Acesse a plataforma a qualquer hora, escolha o serviço ideal e garanta seu horário sem filas, esperas ou ligações demoradas.
          </p>

          {/* Botões de Ação */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 max-w-md mx-auto mb-10">
            <button
              onClick={handleBooking}
              className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-semibold rounded-xl shadow-xl shadow-blue-500/25 hover:shadow-blue-500/40 transition-all flex items-center justify-center space-x-2 group"
            >
              <Calendar className="w-5 h-5 text-blue-100" />
              <span>Agendar Horário Online</span>
              <ArrowRight className="w-5 h-5 text-blue-100 group-hover:translate-x-1 transition-transform" />
            </button>

            <button
              onClick={handleLogin}
              className="w-full sm:w-auto px-7 py-4 text-slate-200 hover:text-white bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/80 hover:border-slate-600 rounded-xl transition-all flex items-center justify-center space-x-2 font-medium"
            >
              <Lock className="w-4 h-4 text-slate-400" />
              <span>{user ? 'Acessar Meu Painel' : 'Acessar Minha Conta'}</span>
            </button>
          </div>

          {/* Destaques Rápidos */}
          <div className="pt-8 border-t border-white/5 flex flex-wrap items-center justify-center gap-6 text-xs sm:text-sm text-slate-400">
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Sem necessidade de instalação</span>
            </div>
            <div className="flex items-center space-x-2">
              <Clock className="w-4 h-4 text-cyan-400" />
              <span>Disponível 24 horas por dia</span>
            </div>
            <div className="flex items-center space-x-2">
              <ShieldCheck className="w-4 h-4 text-blue-400" />
              <span>Confirmação imediata</span>
            </div>
          </div>

        </div>
      </div>
    </section>
  )
}
