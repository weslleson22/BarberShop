'use client'

import { useState, useEffect } from 'react'
import { Users, Calendar, DollarSign } from 'lucide-react'

interface Client {
  id: string
  name: string
  phone: string
  createdAt: string
  lastAppointment?: {
    service: string
    startTime: string
    totalAmount: number
  }
  _count?: {
    appointments: number
  }
}

export default function RecentClients() {
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchRecentClients()
  }, [])

  const fetchRecentClients = async () => {
    try {
      console.log('=== BUSCANDO CLIENTES RECENTES ===')
      
      const response = await fetch('/api/clients/all')
      const allClients = await response.json()
      
      console.log('Total de clientes recebidos:', allClients.length)
      
      // Sort by creation date (most recent first) and take top 5
      const recentClients = allClients
        .sort((a: Client, b: Client) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 5)
      
      console.log('Clientes recentes:', recentClients)
      setClients(recentClients)
      
    } catch (error) {
      console.error('Erro ao buscar clientes recentes:', error)
      setClients([])
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffTime = Math.abs(now.getTime() - date.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    
    if (diffDays === 0) {
      return 'Hoje'
    } else if (diffDays === 1) {
      return 'Ontem'
    } else if (diffDays < 7) {
      return `${diffDays} dias atrás`
    } else {
      return date.toLocaleDateString('pt-BR', { 
        day: '2-digit', 
        month: '2-digit' 
      })
    }
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const isReturningClient = (client: Client) => {
    return (client._count?.appointments || 0) > 1
  }

  if (loading) {
    return (
      <div className="bg-gradient-to-br from-gray-800/50 to-black/50 border border-white/6 rounded-2xl p-6">
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-yellow-400"></div>
        </div>
      </div>
    )
  }

  const getStatusBadge = (client: Client) => {
    if (isReturningClient(client)) {
      return (
        <span className="px-2 py-1 bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-lg text-xs font-medium">
          Recorrente
        </span>
      )
    }
    return (
      <span className="px-2 py-1 bg-green-500/20 text-green-400 border border-green-500/30 rounded-lg text-xs font-medium">
        Novo
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
                <span className="text-black font-bold text-sm">{getInitials(client.name)}</span>
              </div>

              {/* Client Info */}
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-1">
                  <p className="text-white font-medium">{client.name}</p>
                  {getStatusBadge(client)}
                </div>
                <div className="flex items-center space-x-4 text-white/60 text-sm">
                  <div className="flex items-center space-x-1">
                    <Calendar className="w-3 h-3" />
                    <span>{formatDate(client.createdAt)}</span>
                  </div>
                  <span>{client.phone}</span>
                </div>
              </div>
            </div>

            {/* Value */}
            <div className="text-right">
              <p className="text-white font-semibold">{client._count?.appointments || 0} agend.</p>
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
