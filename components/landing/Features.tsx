'use client'

import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { 
  Calendar, 
  Clock, 
  Bell, 
  ShieldCheck, 
  Smartphone, 
  Users, 
  CheckCircle2, 
  ArrowRight,
  Layers,
  Zap
} from 'lucide-react'

export default function Features() {
  const router = useRouter()

  const features = [
    {
      icon: Calendar,
      title: 'Agenda em Tempo Real',
      description: 'Sincronização imediata de horários disponíveis, eliminando conflitos de agenda.',
      gradient: 'from-blue-600 to-cyan-500'
    },
    {
      icon: Bell,
      title: 'Lembretes Inteligentes',
      description: 'Notificações e avisos automáticos para garantir pontualidade e zero faltas.',
      gradient: 'from-cyan-500 to-blue-500'
    },
    {
      icon: Layers,
      title: 'Catálogo de Serviços',
      description: 'Duração estimada, valores transparentes e detalhes de cada serviço cadastrado.',
    },
    {
      icon: Users,
      title: 'Profissionais Dedicados',
      description: 'Liberdade para escolher seu profissional favorito ou o horário mais conveniente.',
      gradient: 'from-blue-500 to-indigo-600'
    },
    {
      icon: Smartphone,
      title: 'Acesso Rápido no Celular',
      description: 'Interface otimizada e ultra-rápida para agendar em qualquer dispositivo móvel.',
      gradient: 'from-cyan-500 to-teal-500'
    },
    {
      icon: ShieldCheck,
      title: 'Segurança & Privacidade',
      description: 'Dados protegidos com criptografia de ponta a ponta e total conformidade.',
      gradient: 'from-blue-600 to-indigo-600'
    }
  ]

  return (
    <section id="recursos" className="py-24 bg-gray-950 relative">

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Cabeçalho da Seção */}
        <div className="text-center mb-16 space-y-4">
          <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-gray-900 border border-gray-800 text-blue-400 text-xs font-semibold uppercase tracking-wider">
            <Calendar className="w-3.5 h-3.5 text-blue-400" />
            <span>Recursos da Plataforma</span>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight">
            Tudo o que você precisa para{' '}
            <span className="text-blue-400">
              agendar com confiança.
            </span>
          </h2>
          <p className="text-base sm:text-lg text-slate-400 max-w-2xl mx-auto">
            Uma plataforma completa desenvolvida para tornar o agendamento de serviços ágil, transparente e sem atritos.
          </p>
        </div>

        {/* Vitrine Visual Showcase: Imagem de Celular e Tablet */}
        <div className="mb-20 rounded-2xl border border-gray-800 bg-gray-900 p-4 sm:p-8 shadow-sm">
          <div className="grid lg:grid-cols-12 gap-8 items-center">
            
            <div className="lg:col-span-6 space-y-6">
              <span className="inline-flex items-center text-xs font-bold text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-3 py-1 rounded-full uppercase tracking-wider">
                Experiência Mobile & Desktop
              </span>
              <h3 className="text-2xl sm:text-3xl font-extrabold text-white leading-tight">
                Agendamento simplificado na palma da sua mão.
              </h3>
              <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
                Navegue pelas datas no calendário, visualize a grade horária e confirme o agendamento com um único toque. A plataforma foi desenhada para carregar instantaneamente, sem travamentos.
              </p>

              <div className="space-y-3 pt-2">
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 rounded-lg bg-blue-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <CheckCircle2 className="w-4 h-4 text-blue-400" />
                  </div>
                  <div>
                    <strong className="text-white text-sm block">Seleção clara de serviços</strong>
                    <span className="text-xs text-slate-400">Valores, tempo e profissional responsável em destaque.</span>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 rounded-lg bg-cyan-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <CheckCircle2 className="w-4 h-4 text-cyan-400" />
                  </div>
                  <div>
                    <strong className="text-white text-sm block">Grade de horários inteligente</strong>
                    <span className="text-xs text-slate-400">Apenas horários realmente livres são exibidos para agendamento.</span>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 rounded-lg bg-emerald-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div>
                    <strong className="text-white text-sm block">Comprovante e lembretes</strong>
                    <span className="text-xs text-slate-400">Notificação imediata e avisos antes do início do atendimento.</span>
                  </div>
                </div>
              </div>

              <div className="pt-4">
                <button
                  onClick={() => router.push('/login')}
                  className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm transition-colors flex items-center space-x-2 group cursor-pointer"
                >
                  <Calendar className="w-4 h-4" />
                  <span>Acessar a Plataforma</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            </div>

            <div className="lg:col-span-6 relative">
              <div className="relative h-72 sm:h-96 w-full rounded-2xl overflow-hidden border border-white/10 group">
                <Image
                  src="/images/scheduling-mobile-preview.jpg"
                  alt="Aplicativo de Agendamento de Serviços"
                  fill
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 580px"
                  className="object-cover object-center group-hover:scale-105 transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-slate-950/40" />
                
                <div className="absolute bottom-4 left-4 right-4 bg-slate-900/90 border border-white/15 backdrop-blur-md rounded-xl p-3 flex items-center justify-between text-xs">
                  <div className="flex items-center space-x-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-white font-semibold">Agendamentos Abertos</span>
                  </div>
                  <span className="text-blue-300 font-bold">100% Online</span>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* Grid de Cards de Recursos */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <div 
              key={index}
              className="group relative overflow-hidden bg-gray-900 border border-gray-800 rounded-2xl p-7 hover:border-gray-700 transition-colors"
            >
              {/* Ícone */}
              <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white mb-5">
                <feature.icon className="w-5 h-5 text-white" />
              </div>
              
              <h3 className="text-lg font-bold text-white mb-2 group-hover:text-blue-300 transition-colors">
                {feature.title}
              </h3>
              
              <p className="text-sm text-slate-400 leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>

      </div>
    </section>
  )
}
