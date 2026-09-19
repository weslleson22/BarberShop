'use client'

import { useAuth } from '@/lib/auth-context'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { 
  ArrowRight, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  ShieldCheck, 
  Sparkles, 
  Bell, 
  Star, 
  CheckCircle, 
  UserCheck,
  Smartphone
} from 'lucide-react'

export default function Hero() {
  const { user } = useAuth()
  const router = useRouter()

  const handleBooking = () => {
    router.push('/agendar')
  }

  const handleAccess = () => {
    if (user) {
      if (user.role === 'DEVELOPER') router.push('/developer')
      else if (user.role === 'CLIENT') router.push('/meus-agendamentos')
      else router.push('/dashboard')
    } else {
      router.push('/login')
    }
  }

  return (
    <section id="home" className="relative min-h-screen pt-32 pb-20 flex items-center bg-[#090D16] overflow-hidden">
      {/* Luzes de ambientação e grid de fundo */}
      <div className="absolute top-1/4 -left-40 w-[500px] h-[500px] bg-blue-600/15 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute top-1/3 -right-40 w-[500px] h-[500px] bg-cyan-500/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute -bottom-20 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-indigo-600/10 rounded-full blur-[160px] pointer-events-none" />

      {/* Grid sutil */}
      <div 
        className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[radial-gradient(#3b82f6_1px,transparent_1px)] [background-size:24px_24px]" 
      />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div className="grid lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          
          {/* Conteúdo Esquerdo */}
          <div className="lg:col-span-6 xl:col-span-7 space-y-8 text-center lg:text-left">
            
            {/* Badge de Destaque */}
            <div className="inline-flex items-center space-x-2 px-4 py-2 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs sm:text-sm font-semibold tracking-wide">
              <Sparkles className="w-4 h-4 text-blue-400 animate-pulse" />
              <span>Plataforma Inteligente de Agendamento de Serviços</span>
            </div>

            {/* Título de Alto Impacto */}
            <div className="space-y-4">
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white tracking-tight leading-[1.15]">
                Agende seus serviços com{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-cyan-300 to-indigo-400">
                  rapidez, pontualidade e praticidade.
                </span>
              </h1>
              <p className="text-lg sm:text-xl text-slate-300 leading-relaxed max-w-2xl mx-auto lg:mx-0 font-normal">
                Encontre horários livres em tempo real, escolha o serviço ideal em poucos segundos e receba lembretes automáticos diretamente no seu celular.
              </p>
            </div>

            {/* Botões de Ação Principais */}
            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4">
              <button 
                onClick={handleBooking}
                className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-semibold rounded-xl transition-all shadow-xl shadow-blue-500/25 hover:shadow-blue-500/40 flex items-center justify-center space-x-3 group"
              >
                <Calendar className="w-5 h-5 text-blue-100" />
                <span className="text-base">Agendar um Horário Agora</span>
                <ArrowRight className="w-5 h-5 text-blue-100 group-hover:translate-x-1 transition-transform" />
              </button>

              <button 
                onClick={handleAccess}
                className="w-full sm:w-auto px-7 py-4 text-slate-200 hover:text-white bg-slate-900/80 hover:bg-slate-800/90 border border-slate-700/80 hover:border-slate-600 rounded-xl transition-all flex items-center justify-center space-x-2 text-base font-medium"
              >
                <span>{user ? 'Acessar Meu Painel' : 'Acessar Conta / Login'}</span>
              </button>
            </div>

            {/* Pilares em Destaque */}
            <div className="pt-2 flex flex-wrap items-center justify-center lg:justify-start gap-6 text-sm text-slate-300">
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Horários em Tempo Real</span>
              </div>
              <div className="flex items-center space-x-2">
                <Bell className="w-4 h-4 text-cyan-400" />
                <span>Lembretes Automáticos</span>
              </div>
              <div className="flex items-center space-x-2">
                <ShieldCheck className="w-4 h-4 text-blue-400" />
                <span>Confirmação Segura</span>
              </div>
            </div>

            {/* Prova Social e Avaliação */}
            <div className="pt-4 border-t border-white/5 flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-6">
              <div className="flex items-center space-x-3">
                <div className="flex -space-x-2">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-blue-500 to-cyan-400 border-2 border-[#090D16] flex items-center justify-center text-xs font-bold text-slate-950">
                    JD
                  </div>
                  <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-400 border-2 border-[#090D16] flex items-center justify-center text-xs font-bold text-slate-950">
                    MC
                  </div>
                  <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-400 border-2 border-[#090D16] flex items-center justify-center text-xs font-bold text-slate-950">
                    AL
                  </div>
                  <div className="w-9 h-9 rounded-full bg-slate-800 border-2 border-[#090D16] flex items-center justify-center text-xs font-bold text-blue-300">
                    +10k
                  </div>
                </div>
                <div className="text-left">
                  <p className="text-sm font-semibold text-white">Agendamentos Realizados</p>
                  <p className="text-xs text-slate-400">Pontualidade e satisfação comprovada</p>
                </div>
              </div>

              <div className="flex items-center space-x-1.5 pl-0 sm:pl-4 sm:border-l sm:border-white/10">
                <div className="flex text-amber-400">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-current" />
                  ))}
                </div>
                <span className="text-sm font-bold text-white ml-1">4.9/5</span>
                <span className="text-xs text-slate-400">avaliações</span>
              </div>
            </div>

          </div>

          {/* Lado Direito: Ilustração do Sistema de Agendamento */}
          <div className="lg:col-span-6 xl:col-span-5 relative">
            <div className="relative mx-auto max-w-lg lg:max-w-none">
              
              {/* Moldura da Ilustração com Efeito Glassmorphism */}
              <div className="relative rounded-3xl border border-white/10 bg-gradient-to-b from-slate-900/90 to-slate-950/90 p-4 shadow-2xl shadow-blue-950/50 backdrop-blur-2xl overflow-hidden group">
                <div className="relative h-96 sm:h-[430px] w-full rounded-2xl overflow-hidden">
                  <Image
                    src="/images/scheduling-hero.jpg"
                    alt="Sistema de Agendamento de Serviços"
                    fill
                    className="object-cover object-center group-hover:scale-105 transition-transform duration-700"
                    priority
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/30 to-transparent" />

                  {/* Card Flutuante Superior: Disponibilidade em Tempo Real */}
                  <div className="absolute top-4 left-4 right-4 bg-slate-900/90 border border-white/15 backdrop-blur-md rounded-2xl p-3.5 shadow-xl flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-400">
                        <Calendar className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-white">Agenda Aberta Online</div>
                        <div className="text-[11px] text-slate-400">Selecione seu horário favorito</div>
                      </div>
                    </div>
                    <span className="flex items-center text-xs font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 mr-1.5 animate-pulse" />
                      Disponível
                    </span>
                  </div>

                  {/* Card Flutuante Inferior: Simulação de Atendimento Confirmado */}
                  <div className="absolute bottom-4 left-4 right-4 bg-slate-900/95 border border-white/15 backdrop-blur-md rounded-2xl p-4 shadow-xl space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-400/30 flex items-center justify-center text-cyan-400">
                          <CheckCircle2 className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-white">Serviço Agendado com Sucesso</p>
                          <p className="text-[11px] text-slate-400">Lembrete enviado para seu WhatsApp</p>
                        </div>
                      </div>
                      <span className="text-xs font-bold text-blue-300 bg-blue-500/20 border border-blue-500/30 px-2.5 py-1 rounded-lg">
                        14:30
                      </span>
                    </div>

                    {/* Grade de horários interativa em demonstração */}
                    <div className="pt-2 border-t border-white/5 flex items-center justify-between text-xs">
                      <span className="text-slate-400 text-[11px]">Horários populares:</span>
                      <div className="flex space-x-1.5">
                        <span className="px-2 py-0.5 rounded bg-white/5 text-slate-400 text-[11px]">09:00</span>
                        <span className="px-2 py-0.5 rounded bg-white/5 text-slate-400 text-[11px]">11:00</span>
                        <span className="px-2 py-0.5 rounded bg-blue-500/30 border border-blue-400/40 text-blue-200 text-[11px] font-semibold">14:30 ✓</span>
                        <span className="px-2 py-0.5 rounded bg-white/5 text-slate-400 text-[11px]">16:00</span>
                      </div>
                    </div>
                  </div>

                </div>
              </div>

              {/* Badges Flutuantes Exteriores */}
              <div className="absolute -top-3 -right-3 hidden sm:flex items-center space-x-1.5 bg-gradient-to-r from-blue-600 to-cyan-500 text-white text-xs font-semibold px-3 py-1.5 rounded-full shadow-lg shadow-blue-500/30">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Agendamento em 3 Passos</span>
              </div>

              <div className="absolute -bottom-3 -left-3 hidden sm:flex items-center space-x-1.5 bg-slate-900 border border-white/10 text-slate-300 text-xs font-medium px-3 py-1.5 rounded-full shadow-xl">
                <Smartphone className="w-3.5 h-3.5 text-blue-400" />
                <span>Compatível com Celular & Web</span>
              </div>

            </div>
          </div>

        </div>
      </div>
    </section>
  )
}
