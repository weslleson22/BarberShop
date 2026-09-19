'use client'

import { Calendar, Clock, CheckCircle2, Bell, Sparkles, Smartphone, ShieldCheck, Zap } from 'lucide-react'

export default function Benefits() {
  const steps = [
    {
      step: '01',
      icon: Sparkles,
      title: '1. Escolha o Serviço',
      description: 'Navegue pelos serviços disponíveis, consulte a duração estimada e confira os valores com transparência.',
      badge: 'Catálogo Claro',
      gradient: 'from-blue-600 to-cyan-500'
    },
    {
      step: '02',
      icon: Calendar,
      title: '2. Selecione o Horário',
      description: 'Escolha o profissional de sua preferência e encontre horários livres atualizados em tempo real sem conflitos.',
      badge: 'Tempo Real',
      gradient: 'from-cyan-500 to-blue-500'
    },
    {
      step: '03',
      icon: Bell,
      title: '3. Confirmação & Lembrete',
      description: 'Receba confirmação imediata e lembretes automáticos no seu celular para nunca perder seu atendimento.',
      badge: 'Avisos Automáticos',
      gradient: 'from-indigo-600 to-blue-600'
    }
  ]

  return (
    <section id="como-funciona" className="py-24 bg-[#080C14] border-t border-white/5 relative overflow-hidden">
      {/* Luz ambiente */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[350px] bg-blue-600/5 rounded-full blur-[160px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Cabeçalho da Seção */}
        <div className="text-center mb-16 space-y-4">
          <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold uppercase tracking-wider">
            <Zap className="w-3.5 h-3.5 text-blue-400" />
            <span>Processo 100% Descomplicado</span>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight">
            Como funciona o{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-cyan-300 to-indigo-400">
              agendamento de serviços?
            </span>
          </h2>
          <p className="text-base sm:text-lg text-slate-400 max-w-2xl mx-auto">
            Sem filas de espera, sem ligações e sem burocracia. Agende seu atendimento em menos de 1 minuto.
          </p>
        </div>

        {/* Grid de Passos */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
          {steps.map((item, index) => (
            <div 
              key={index}
              className="group relative rounded-3xl bg-slate-900/60 border border-white/10 p-8 hover:border-blue-500/40 transition-all duration-300 hover:-translate-y-1.5 shadow-xl shadow-black/40 backdrop-blur-xl flex flex-col justify-between"
            >
              <div>
                {/* Cabeçalho do Card */}
                <div className="flex items-center justify-between mb-6">
                  <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${item.gradient} p-0.5 shadow-lg shadow-blue-500/20 group-hover:scale-110 transition-transform`}>
                    <div className="w-full h-full bg-[#0B1120] rounded-[14px] flex items-center justify-center">
                      <item.icon className="w-6 h-6 text-blue-400" />
                    </div>
                  </div>
                  <span className="text-3xl font-black text-white/10 group-hover:text-blue-500/20 transition-colors">
                    {item.step}
                  </span>
                </div>

                <div className="mb-2">
                  <span className="inline-block text-[11px] font-semibold text-cyan-400 uppercase tracking-wider bg-cyan-500/10 px-2.5 py-0.5 rounded-full border border-cyan-500/20 mb-2">
                    {item.badge}
                  </span>
                  <h3 className="text-xl font-bold text-white mb-3 group-hover:text-blue-300 transition-colors">
                    {item.title}
                  </h3>
                </div>

                <p className="text-sm text-slate-400 leading-relaxed">
                  {item.description}
                </p>
              </div>

              <div className="pt-6 mt-6 border-t border-white/5 flex items-center space-x-2 text-xs text-blue-400 font-medium">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Rápido e 100% online</span>
              </div>
            </div>
          ))}
        </div>

        {/* Métricas de Performance */}
        <div id="beneficios" className="mt-20 pt-12 border-t border-white/5 grid grid-cols-2 lg:grid-cols-4 gap-6 text-center">
          <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5">
            <div className="text-3xl sm:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300 mb-1">
              &lt; 60s
            </div>
            <p className="text-xs sm:text-sm text-slate-400">Tempo médio para agendar</p>
          </div>
          <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5">
            <div className="text-3xl sm:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400 mb-1">
              24/7
            </div>
            <p className="text-xs sm:text-sm text-slate-400">Disponibilidade online contínua</p>
          </div>
          <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5">
            <div className="text-3xl sm:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-300 mb-1">
              Zero
            </div>
            <p className="text-xs sm:text-sm text-slate-400">Conflito ou duplicidade de horários</p>
          </div>
          <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5">
            <div className="text-3xl sm:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-300 mb-1">
              100%
            </div>
            <p className="text-xs sm:text-sm text-slate-400">Seguro e criptografado</p>
          </div>
        </div>

      </div>
    </section>
  )
}
