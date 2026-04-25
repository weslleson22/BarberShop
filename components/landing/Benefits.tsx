'use client'

import { Calendar, Users, BarChart3, Shield, Star, TrendingUp } from 'lucide-react'

export default function Benefits() {
  const benefits = [
    {
      icon: Calendar,
      title: 'Agendamento Online',
      description: 'Sistema de agendamento em 3 passos. Rápido, simples e eficiente.',
      gradient: 'from-green-500 to-emerald-600'
    },
    {
      icon: Users,
      title: 'Gestão de Clientes',
      description: 'Histórico completo, preferências e observações dos clientes.',
      gradient: 'from-blue-500 to-indigo-600'
    },
    {
      icon: BarChart3,
      title: 'Relatórios Inteligentes',
      description: 'Análise detalhada do negócio com gráficos e insights.',
      gradient: 'from-purple-500 to-pink-600'
    },
    {
      icon: Shield,
      title: 'Seguro e Confiável',
      description: 'Dados criptografados, backup automático e suporte 24/7.',
      gradient: 'from-orange-500 to-red-600'
    }
  ]

  return (
    <section className="py-20 bg-gradient-to-br from-gray-900/50 to-black/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <div className="inline-flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-yellow-400/20 to-yellow-600/20 border border-yellow-400/30 rounded-full mb-6">
            <Star className="w-4 h-4 text-yellow-400" />
            <span className="text-sm font-medium text-yellow-400">Benefícios Exclusivos</span>
          </div>
          <h2 className="text-3xl lg:text-4xl font-bold text-white mb-6">
            Por que <span className="bg-gradient-to-r from-yellow-400 to-yellow-600 bg-clip-text text-transparent">escolher</span> nosso sistema?
          </h2>
          <p className="text-xl text-white/80 max-w-3xl mx-auto">
            Ferramentas desenvolvidas especificamente para otimizar cada aspecto da sua barbearia
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {benefits.map((benefit, index) => (
            <div 
              key={index}
              className="group relative text-center"
            >
              {/* Icon Container */}
              <div className="relative mx-auto mb-6">
                <div className={`w-20 h-20 bg-gradient-to-br ${benefit.gradient} rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-lg`}>
                  <benefit.icon className="w-10 h-10 text-white" />
                </div>
                {/* Glow Effect */}
                <div className={`absolute inset-0 bg-gradient-to-br ${benefit.gradient} rounded-2xl blur-xl opacity-0 group-hover:opacity-30 transition-opacity duration-300`}></div>
              </div>

              {/* Content */}
              <h3 className="text-xl font-semibold text-white mb-3 group-hover:text-yellow-400 transition-colors duration-300">
                {benefit.title}
              </h3>
              <p className="text-white/70 leading-relaxed group-hover:text-white/80 transition-colors duration-300">
                {benefit.description}
              </p>

              {/* Hover Indicator */}
              <div className="mt-4 flex justify-center">
                <div className="w-8 h-0.5 bg-gradient-to-r from-transparent via-yellow-400 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom Stats */}
        <div className="mt-16 grid grid-cols-2 lg:grid-cols-4 gap-8">
          <div className="text-center">
            <div className="text-3xl font-bold text-white mb-2">2.000+</div>
            <p className="text-white/60">Barbearias Ativas</p>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-white mb-2">50K+</div>
            <p className="text-white/60">Agendamentos/mês</p>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-white mb-2">99.9%</div>
            <p className="text-white/60">Uptime</p>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-white mb-2">4.9/5</div>
            <p className="text-white/60">Satisfação</p>
          </div>
        </div>
      </div>
    </section>
  )
}
