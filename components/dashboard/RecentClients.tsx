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
      if (!response.ok) {
        console.error('Erro ao buscar clientes recentes:', response.status)
        setClients([])
        return
      }

      const allClients = await response.json()
      if (!Array.isArray(allClients)) {
        setClients([])
        return
      }

      // Sort by last appointment date if available, otherwise by creation date
      const recentClients = allClients
        .sort((a: Client, b: Client) => {
          const dateA = a.lastAppointment 
            ? new Date(a.lastAppointment.startTime).getTime() 
            : new Date(a.createdAt).getTime()
          const dateB = b.lastAppointment 
            ? new Date(b.lastAppointment.startTime).getTime() 
            : new Date(b.createdAt).getTime()
          return dateB - dateA
        })
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

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value)
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
      <div className="bg-gradient-to-br from-gray-800/50 to-black/50 border border-white/6 rounded-xl md:rounded-2xl p-4 md:p-6">
        <div className="flex items-center justify-center h-24 md:h-32">
          <div className="animate-spin rounded-full h-5 w-5 md:h-6 md:w-6 border-b-2 border-yellow-400"></div>
        </div>
      </div>
    )
  }

  const getStatusBadge = (client: Client) => {
    if (isReturningClient(client)) {
      return (
        <span className="px-1.5 md:px-2 py-0.5 md:py-1 bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-lg text-xs font-medium">
          Recorrente
        </span>
      )
    }
    return (
      <span className="px-1.5 md:px-2 py-0.5 md:py-1 bg-green-500/20 text-green-400 border border-green-500/30 rounded-lg text-xs font-medium">
        Novo
      </span>
    )
  }

  return (
    <div className="bg-gradient-to-br from-gray-800/50 to-black/50 border border-white/6 rounded-xl md:rounded-2xl p-4 md:p-6">
      <div className="flex items-center justify-between mb-4 md:mb-6">
        <div>
          <h3 className="text-lg md:text-xl font-semibold text-white">Últimos Clientes</h3>
          <p className="text-white/60 text-xs md:text-sm">Atividade recente</p>
        </div>
        <div className="flex items-center space-x-2 text-white/60">
          <Users className="w-3.5 h-3.5 md:w-4 md:h-4" />
          <span className="text-xs md:text-sm">5 clientes</span>
        </div>
      </div>

      <div className="space-y-2 md:space-y-3">
        {clients.map((client) => (
          <div
            key={client.id}
            className="flex items-center justify-between p-3 md:p-4 bg-white/5 border border-white/6 rounded-lg md:rounded-xl hover:bg-white/10 transition-all"
          >
            <div className="flex items-center space-x-3 md:space-x-4 min-w-0 flex-1">
              {/* Avatar */}
              <div className="w-8 h-8 md:w-10 md:h-10 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-black font-bold text-xs md:text-sm">{getInitials(client.name)}</span>
              </div>

              {/* Client Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-1.5 md:space-x-2 mb-1">
                  <p className="text-white font-medium text-sm md:text-base truncate">{client.name}</p>
                  {getStatusBadge(client)}
                </div>
                <div className="flex items-center space-x-2 md:space-x-4 text-white/60 text-xs md:text-sm">
                  <div className="flex items-center space-x-1">
                    <Calendar className="w-2.5 h-2.5 md:w-3 md:h-3" />
                    <span className="truncate">
                      {client.lastAppointment 
                        ? formatDate(client.lastAppointment.startTime) 
                        : formatDate(client.createdAt)
                      }
                    </span>
                  </div>
                  {client.lastAppointment && (
                    <span className="hidden sm:inline truncate">{client.lastAppointment.service}</span>
                  )}
                </div>
              </div>
            </div>

            {/* Value */}
            <div className="text-right flex-shrink-0 ml-2">
              {client.lastAppointment ? (
                <div className="flex flex-col items-end">
                  <p className="text-yellow-400 font-semibold text-xs md:text-sm">{formatCurrency(client.lastAppointment.totalAmount)}</p>
                  <p className="text-white/60 text-xs">{client._count?.appointments || 0} agend.</p>
                </div>
              ) : (
                <p className="text-white font-semibold text-xs md:text-sm">{client._count?.appointments || 0} agend.</p>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* View All Button */}
      <div className="mt-4 md:mt-6 pt-3 md:pt-4 border-t border-white/6">
        <button className="w-full py-2.5 md:py-3 text-yellow-400 hover:text-yellow-300 font-medium text-sm md:text-base transition-colors">
          Ver todos os clientes
        </button>
      </div>
    </div>
  )
}
