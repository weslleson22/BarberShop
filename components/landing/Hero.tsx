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
  Bell, 
  Star, 
  Building2,
  LogIn,
  Smartphone
} from 'lucide-react'

export default function Hero() {
  const { user } = useAuth()
  const router = useRouter()

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
    <section id="home" className="relative min-h-screen pt-32 pb-20 flex items-center bg-gray-950">

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div className="grid lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          
          {/* Conteúdo Esquerdo */}
          <div className="lg:col-span-6 xl:col-span-7 space-y-8 text-center lg:text-left">
            
            {/* Badge de Destaque */}
            <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-gray-900 border border-gray-800 text-blue-400 text-xs sm:text-sm font-semibold tracking-wide">
              <Calendar className="w-4 h-4 text-blue-400" />
              <span>Plataforma de Gestão e Agendamento</span>
            </div>

            {/* Título de Alto Impacto */}
            <div className="space-y-4">
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white tracking-tight leading-[1.15]">
                Gestão e agendamentos com{' '}
                <span className="text-blue-400">
                  rapidez, controle e pontualidade.
                </span>
              </h1>
              <p className="text-lg sm:text-xl text-slate-300 leading-relaxed max-w-2xl mx-auto lg:mx-0 font-normal">
                Conecte seu estabelecimento a clientes cadastrados. Controle horários em tempo real, organize equipes e ofereça agendamentos exclusivos com confirmação imediata.
              </p>
            </div>

            {/* Botões de Ação Principais */}
            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4">
              <button 
                onClick={handleAccess}
                className="w-full sm:w-auto px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl transition-colors flex items-center justify-center space-x-3 group cursor-pointer"
              >
                <LogIn className="w-5 h-5 text-blue-100" />
                <span className="text-base">
                  {user ? (user.role === 'CLIENT' ? 'Meus Agendamentos' : 'Acessar Meu Painel') : 'Acessar a Plataforma'}
                </span>
                <ArrowRight className="w-5 h-5 text-blue-100 group-hover:translate-x-1 transition-transform" />
              </button>

              <Link 
                href="/register"
                className="w-full sm:w-auto px-7 py-4 text-slate-200 hover:text-white bg-slate-900/80 hover:bg-slate-800/90 border border-slate-700/80 hover:border-slate-600 rounded-xl transition-all flex items-center justify-center space-x-2 text-base font-medium"
              >
                <Building2 className="w-5 h-5 text-slate-400" />
                <span>Cadastre sua Empresa</span>
              </Link>
            </div>

            {/* Pilares em Destaque */}
            <div className="pt-2 flex flex-wrap items-center justify-center lg:justify-start gap-6 text-sm text-slate-300">
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Exclusivo para Clientes Cadastrados</span>
              </div>
              <div className="flex items-center space-x-2">
                <Bell className="w-4 h-4 text-cyan-400" />
                <span>Lembretes Automáticos</span>
              </div>
              <div className="flex items-center space-x-2">
                <ShieldCheck className="w-4 h-4 text-blue-400" />
                <span>Isolamento Multi-tenant</span>
              </div>
            </div>

            {/* Prova Social e Avaliação */}
            <div className="pt-4 border-t border-white/5 flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-6">
              <div className="flex items-center space-x-3">
                <div className="flex -space-x-2">
                  <div className="w-9 h-9 rounded-full bg-blue-600 border-2 border-gray-950 flex items-center justify-center text-xs font-bold text-white">
                    JD
                  </div>
                  <div className="w-9 h-9 rounded-full bg-indigo-600 border-2 border-gray-950 flex items-center justify-center text-xs font-bold text-white">
                    MC
                  </div>
                  <div className="w-9 h-9 rounded-full bg-emerald-600 border-2 border-gray-950 flex items-center justify-center text-xs font-bold text-white">
                    AL
                  </div>
                  <div className="w-9 h-9 rounded-full bg-gray-800 border-2 border-gray-950 flex items-center justify-center text-xs font-bold text-blue-300">
                    +10k
                  </div>
                </div>
                <div className="text-left">
                  <p className="text-sm font-semibold text-white">Atendimentos Gerenciados</p>
                  <p className="text-xs text-slate-400">Pontualidade e satisfação comprovada</p>
                </div>
              </div>

              <div className="flex items-center space-x-1.5 pl-0 sm:pl-4 sm:border-l sm:border-white/10">
                <div className="flex text-amber-400">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-current" />
                  ))}
                </div>
                <span className="text-sm font-bold text-white ml-1">5/5</span>
                <span className="text-xs text-slate-400">avaliações</span>
              </div>
            </div>

          </div>

          {/* Lado Direito: Ilustração do Sistema de Agendamento */}
          <div className="lg:col-span-6 xl:col-span-5 relative">
            <div className="relative mx-auto max-w-lg lg:max-w-none">
              
              {/* Moldura da Ilustração com visual sólido */}
              <div className="relative rounded-2xl border border-gray-800 bg-gray-900 p-4 shadow-sm overflow-hidden group">
                <div className="relative h-96 sm:h-[430px] w-full rounded-xl overflow-hidden bg-gray-950">
                  <Image
                    src="/images/scheduling-hero.jpg"
                    alt="Sistema de Gestão e Agendamento de Serviços"
                    fill
                    className="object-cover object-center"
                    priority
                  />
                  <div className="absolute inset-0 bg-black/40" />

                  {/* Card Sólido Superior: Disponibilidade em Tempo Real */}
                  <div className="absolute top-4 left-4 right-4 bg-gray-900 border border-gray-800 rounded-xl p-3.5 shadow-md flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-400">
                        <Calendar className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-white">Painel de Horários</div>
                        <div className="text-[11px] text-slate-400">Controle inteligente de vagas</div>
                      </div>
                    </div>
                    <span className="flex items-center text-xs font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 mr-1.5 animate-pulse" />
                      Online
                    </span>
                  </div>

                  {/* Card Sólido Inferior: Simulação de Atendimento Confirmado */}
                  <div className="absolute bottom-4 left-4 right-4 bg-gray-900 border border-gray-800 rounded-xl p-4 shadow-md space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-400/30 flex items-center justify-center text-cyan-400">
                          <CheckCircle2 className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-white">Serviço Confirmado</p>
                          <p className="text-[11px] text-slate-400">Lembrete sincronizado na agenda</p>
                        </div>
                      </div>
                      <span className="text-xs font-bold text-blue-300 bg-blue-500/20 border border-blue-500/30 px-2.5 py-1 rounded-lg">
                        14:30
                      </span>
                    </div>

                    {/* Grade de horários interativa em demonstração */}
                    <div className="pt-2 border-t border-white/5 flex items-center justify-between text-xs">
                      <span className="text-slate-400 text-[11px]">Horários do dia:</span>
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
              <div className="absolute -top-3 -right-3 hidden sm:flex items-center space-x-1.5 bg-blue-600 text-white text-xs font-semibold px-3 py-1.5 rounded-full shadow-md">
                <Calendar className="w-3.5 h-3.5" />
                <span>Gestão Completa SaaS</span>
              </div>

              <div className="absolute -bottom-3 -left-3 hidden sm:flex items-center space-x-1.5 bg-slate-900 border border-white/10 text-slate-300 text-xs font-medium px-3 py-1.5 rounded-full shadow-xl">
                <Smartphone className="w-3.5 h-3.5 text-blue-400" />
                <span>Acesso Seguro via Web</span>
              </div>

            </div>
          </div>

        </div>
      </div>
    </section>
  )
}
