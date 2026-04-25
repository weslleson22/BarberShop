'use client'

import { Users, Calendar, DollarSign } from 'lucide-react'

interface Client {
  id: string
  name: string
  avatar: string
  date: string
  service: string
  value: string
  status: 'new' | 'returning'
}

export default function RecentClients() {
  const clients: Client[] = [
    {
      id: '1',
      name: 'Carlos Silva',
      avatar: 'CS',
      date: 'Hoje, 14:30',
      service: 'Corte + Barba',
      value: 'R$ 85',
      status: 'returning'
    },
    {
      id: '2',
      name: 'Maria Santos',
      avatar: 'MS',
      date: 'Hoje, 10:15',
      service: 'Progressiva',
      value: 'R$ 120',
      status: 'new'
    },
    {
      id: '3',
      name: 'João Oliveira',
      avatar: 'JO',
      date: 'Ontem, 16:45',
      service: 'Barba',
      value: 'R$ 35',
      status: 'returning'
    },
    {
      id: '4',
      name: 'Ana Costa',
      avatar: 'AC',
      date: 'Ontem, 09:00',
      service: 'Corte Masculino',
      value: 'R$ 50',
      status: 'new'
    },
    {
      id: '5',
      name: 'Pedro Santos',
      avatar: 'PS',
      date: '2 dias atrás',
      service: 'Sobrancelha',
      value: 'R$ 25',
      status: 'returning'
    }
  ]

  const getStatusBadge = (status: string) => {
    if (status === 'new') {
      return (
        <span className="px-2 py-1 bg-green-500/20 text-green-400 border border-green-500/30 rounded-lg text-xs font-medium">
          Novo
        </span>
      )
    }
    return (
      <span className="px-2 py-1 bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-lg text-xs font-medium">
        Recorrente
      </span>
    )
  }

  return (
    <div className="bg-gradient-to-br from-gray-800/50 to-black/50 border border-white/6 rounded-2xl p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-xl font-semibold text-white">Últimos Clientes</h3>
          <p className="text-white/60 text-sm">Atendimentos recentes</p>
        </div>
        <div className="flex items-center space-x-2 text-white/60">
          <Users className="w-4 h-4" />
          <span className="text-sm">5 clientes</span>
        </div>
      </div>

      <div className="space-y-3">
        {clients.map((client) => (
          <div
            key={client.id}
            className="flex items-center justify-between p-4 bg-white/5 border border-white/6 rounded-xl hover:bg-white/10 transition-all"
          >
            <div className="flex items-center space-x-4">
              {/* Avatar */}
              <div className="w-10 h-10 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full flex items-center justify-center">
                <span className="text-black font-bold text-sm">{client.avatar}</span>
              </div>

              {/* Client Info */}
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-1">
                  <p className="text-white font-medium">{client.name}</p>
                  {getStatusBadge(client.status)}
                </div>
                <div className="flex items-center space-x-4 text-white/60 text-sm">
                  <div className="flex items-center space-x-1">
                    <Calendar className="w-3 h-3" />
                    <span>{client.date}</span>
                  </div>
                  <span>{client.service}</span>
                </div>
              </div>
            </div>

            {/* Value */}
            <div className="text-right">
              <p className="text-white font-semibold">{client.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* View All Button */}
      <div className="mt-6 pt-4 border-t border-white/6">
        <button className="w-full py-3 text-yellow-400 hover:text-yellow-300 font-medium transition-colors">
          Ver todos os clientes
        </button>
      </div>
    </div>
  )
}
