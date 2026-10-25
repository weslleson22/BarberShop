'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Users, Calendar, DollarSign, Crown } from 'lucide-react'
import { getAuthHeaders } from '@/lib/utils'

interface Client {
  id: string
  name: string
  phone: string
  isVip?: boolean
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
      
      const response = await fetch('/api/clients/all', {
        headers: getAuthHeaders(),
        credentials: 'include',
      })
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
      <div className="bg-card border border-border rounded-xl md:rounded-2xl p-4 md:p-6 shadow-sm">
        <div className="flex items-center justify-center h-24 md:h-32">
          <div className="animate-spin rounded-full h-5 w-5 md:h-6 md:w-6 border-b-2 border-primary"></div>
        </div>
      </div>
    )
  }

  const getStatusBadge = (client: Client) => {
    if (isReturningClient(client)) {
      return (
        <span className="px-2 py-0.5 bg-primary/10 text-primary border border-primary/20 rounded-full text-[10px] font-semibold">
          Recorrente
        </span>
      )
    }
    return (
      <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 rounded-full text-[10px] font-semibold">
        Novo
      </span>
    )
  }

  return (
    <div className="bg-card border border-border rounded-xl md:rounded-2xl p-4 md:p-6 shadow-sm flex flex-col justify-between h-full">
      <div>
        <div className="flex items-center justify-between mb-4 md:mb-5 pb-3 border-b border-border">
          <div>
            <h3 className="text-lg md:text-xl font-bold text-foreground tracking-tight">Últimos Clientes</h3>
            <p className="text-muted-foreground text-xs md:text-sm font-medium">Clientes com agendamentos recentes</p>
          </div>
          <div className="flex items-center space-x-1.5 px-2.5 py-1 bg-primary/10 border border-primary/20 text-primary rounded-full text-xs font-semibold shrink-0">
            <Users className="w-3.5 h-3.5" />
            <span>{clients.length} recentes</span>
          </div>
        </div>

        {clients.length === 0 ? (
          <div className="text-center py-10 px-4 bg-muted/30 border border-border rounded-xl">
            <Users className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
            <p className="text-foreground font-semibold text-sm">Nenhum cliente cadastrado</p>
            <p className="text-muted-foreground text-xs mt-1 max-w-xs mx-auto">
              Os novos clientes atendidos aparecerão listados aqui.
            </p>
          </div>
        ) : (
          <div className="space-y-2 md:space-y-2.5">
            {clients.map((client) => (
              <div
                key={client.id}
                className="flex items-center justify-between p-2.5 md:p-3 bg-background border border-border rounded-xl hover:border-primary/40 hover:shadow-xs transition-all"
              >
                <div className="flex items-center space-x-3 min-w-0 flex-1">
                  {/* Avatar */}
                  <div className="w-8 h-8 md:w-9 md:h-9 bg-primary/10 border border-primary/20 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-primary font-bold text-xs">{getInitials(client.name)}</span>
                  </div>

                  {/* Client Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-1.5 mb-0.5 flex-wrap gap-y-0.5">
                      <p className="text-foreground font-semibold text-xs md:text-sm truncate max-w-[130px] sm:max-w-none">{client.name}</p>
                      {Boolean(client.isVip) && (
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 rounded-full text-[9px] font-bold flex-shrink-0">
                          <Crown className="w-2.5 h-2.5 text-amber-500" />
                          VIP
                        </span>
                      )}
                      {getStatusBadge(client)}
                    </div>
                    <div className="flex items-center space-x-2 text-muted-foreground text-[11px]">
                      <div className="flex items-center space-x-1">
                        <Calendar className="w-3 h-3 text-muted-foreground/70" />
                        <span className="truncate">
                          {client.lastAppointment 
                            ? formatDate(client.lastAppointment.startTime) 
                            : formatDate(client.createdAt)
                          }
                        </span>
                      </div>
                      {client.lastAppointment && (
                        <span className="hidden sm:inline truncate border-l border-border/70 pl-2">{client.lastAppointment.service}</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Value */}
                <div className="text-right flex-shrink-0 ml-2">
                  {client.lastAppointment ? (
                    <div className="flex flex-col items-end">
                      <p className="text-foreground font-bold text-xs">{formatCurrency(client.lastAppointment.totalAmount)}</p>
                      <p className="text-muted-foreground text-[10px]">{client._count?.appointments || 0} agend.</p>
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-xs">{client._count?.appointments || 0} agend.</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* View All Button */}
      <div className="mt-4 pt-3 border-t border-border">
        <Link
          href="/clientes"
          className="block w-full py-2 text-center text-primary hover:text-primary/80 hover:bg-muted font-semibold text-xs md:text-sm rounded-lg transition-all"
        >
          Ver Todos os Clientes &rarr;
        </Link>
      </div>
    </div>
  )
}

