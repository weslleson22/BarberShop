'use client'

import { useRouter } from 'next/navigation'
import { Calendar, Users, DollarSign, Settings, BarChart3, Bell, Shield, Zap } from 'lucide-react'

export default function Features() {
  const router = useRouter()

  const features = [
    {
      icon: Calendar,
      title: 'Agenda Inteligente',
      description: 'Gerencie agendamentos com calendário integrado e lembretes automáticos.',
      gradient: 'from-blue-500 to-blue-600'
    },
    {
      icon: Users,
      title: 'Clientes',
      description: 'Cadastre clientes com histórico completo e preferências personalizadas.',
      gradient: 'from-purple-500 to-purple-600'
    },
    {
      icon: Settings,
      title: 'Serviços',
      description: 'Defina serviços, preços e durações com controle total.',
      gradient: 'from-green-500 to-green-600'
    },
    {
      icon: Users,
      title: 'Equipe',
      description: 'Gerencie barbeiros, horários e comissões de forma simples.',
      gradient: 'from-orange-500 to-orange-600'
    },
    {
      icon: DollarSign,
      title: 'Financeiro',
      description: 'Controle financeiro completo com relatórios e métricas em tempo real.',
      gradient: 'from-yellow-500 to-yellow-600'
    },
    {
      icon: BarChart3,
      title: 'Relatórios',
      description: 'Análise detalhada do negócio com gráficos e insights.',
      gradient: 'from-red-500 to-red-600'
    },
    {
      icon: Bell,
      title: 'Lembretes',
      description: 'Notificações automáticas para clientes e equipe.',
      gradient: 'from-indigo-500 to-indigo-600'
    },
    {
      icon: Shield,
      title: 'Configurações',
      description: 'Personalize o sistema conforme as necessidades da sua barbearia.',
      gradient: 'from-pink-500 to-pink-600'
    }
  ]

  return (
    <section id="features" className="py-24 bg-gradient-to-br from-gray-900 via-black to-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-yellow-400/20 to-yellow-600/20 border border-yellow-400/30 rounded-full mb-6">
            <Zap className="w-4 h-4 text-yellow-400" />
            <span className="text-sm font-medium text-yellow-400">Recursos Poderosos</span>
          </div>
          <h2 className="text-4xl lg:text-5xl font-bold text-white mb-6">
            Tudo que sua <span className="bg-gradient-to-r from-yellow-400 to-yellow-600 bg-clip-text text-transparent">barbearia precisa</span>
          </h2>
          <p className="text-xl text-white/80 max-w-3xl mx-auto">
            Ferramentas profissionais desenvolvidas especificamente para otimizar a gestão do seu negócio
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => (
            <div 
              key={index}
              className="group relative overflow-hidden bg-gradient-to-br from-gray-800/50 to-black/50 border border-white/10 rounded-2xl p-6 hover:border-white/20 transition-all duration-300 hover:transform hover:scale-105 cursor-pointer"
              onClick={() => {
                // Navigate to relevant pages based on feature
                if (feature.title === 'Agenda Inteligente' || feature.title === 'Agenda') {
                  router.push('/agenda')
                } else if (feature.title === 'Clientes') {
                  router.push('/clientes')
                } else if (feature.title === 'Serviços') {
                  router.push('/servicos')
                } else if (feature.title === 'Equipe') {
                  router.push('/usuarios')
                } else if (feature.title === 'Financeiro') {
                  router.push('/dashboard')
                } else {
                  router.push('/dashboard')
                }
              }}
            >
              {/* Gradient Overlay */}
              <div className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-300`}></div>
              
              {/* Content */}
              <div className="relative z-10">
                {/* Icon */}
                <div className={`w-12 h-12 bg-gradient-to-br ${feature.gradient} rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}>
                  <feature.icon className="w-6 h-6 text-white" />
                </div>
                
                {/* Title */}
                <h3 className="text-xl font-semibold text-white mb-3 group-hover:text-yellow-400 transition-colors duration-300">
                  {feature.title}
                </h3>
                
                {/* Description */}
                <p className="text-white/70 leading-relaxed group-hover:text-white/80 transition-colors duration-300">
                  {feature.description}
                </p>
              </div>

              {/* Hover Effect */}
              <div className="absolute inset-0 bg-gradient-to-t from-yellow-400/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            </div>
          ))}
        </div>

        {/* Bottom CTA */}
        <div className="text-center mt-16">
          <p className="text-white/60 mb-4">
            E muito mais recursos para otimizar seu negócio
          </p>
          <button className="px-8 py-3 bg-gradient-to-r from-yellow-400 to-yellow-600 text-black font-semibold rounded-xl hover:from-yellow-500 hover:to-yellow-700 transition-all flex items-center space-x-2 mx-auto">
            <span>Ver todos os recursos</span>
          </button>
        </div>
      </div>
    </section>
  )
}
