'use client'

import { Scissors, TrendingUp } from 'lucide-react'

interface ServiceData {
  name: string
  count: number
  percentage: number
  color: string
}

export default function PopularServices() {
  const services: ServiceData[] = [
    { name: 'Corte Masculino', count: 145, percentage: 100, color: 'from-blue-500 to-blue-600' },
    { name: 'Corte + Barba', count: 98, percentage: 68, color: 'from-purple-500 to-purple-600' },
    { name: 'Barba', count: 76, percentage: 52, color: 'from-green-500 to-green-600' },
    { name: 'Pigmentação', count: 45, percentage: 31, color: 'from-orange-500 to-orange-600' },
    { name: 'Sobrancelha', count: 32, percentage: 22, color: 'from-pink-500 to-pink-600' }
  ]

  return (
    <div className="bg-gradient-to-br from-gray-800/50 to-black/50 border border-white/6 rounded-2xl p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-xl font-semibold text-white">Serviços Mais Procurados</h3>
          <p className="text-white/60 text-sm">Este mês</p>
        </div>
        <div className="flex items-center space-x-2 text-green-400">
          <TrendingUp className="w-4 h-4" />
          <span className="text-sm">+12.5%</span>
        </div>
      </div>

      <div className="space-y-4">
        {services.map((service, index) => (
          <div key={index} className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className={`w-8 h-8 bg-gradient-to-br ${service.color} rounded-lg flex items-center justify-center`}>
                  <Scissors className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p className="text-white font-medium">{service.name}</p>
                  <p className="text-white/60 text-sm">{service.count} agendamentos</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-white font-semibold">{service.percentage}%</p>
              </div>
            </div>
            
            {/* Progress Bar */}
            <div className="w-full bg-white/10 rounded-full h-2">
              <div 
                className={`h-full bg-gradient-to-r ${service.color} rounded-full transition-all duration-500`}
                style={{ width: `${service.percentage}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* View All Button */}
      <div className="mt-6 pt-4 border-t border-white/6">
        <button className="w-full py-3 text-yellow-400 hover:text-yellow-300 font-medium transition-colors">
          Ver todos os serviços
        </button>
      </div>
    </div>
  )
}
