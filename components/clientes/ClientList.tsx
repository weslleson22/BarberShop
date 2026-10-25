'use client'

import { useState } from 'react'
import { Users, Filter, ChevronDown, Search, Edit, Trash2, MessageSquare, Phone, Mail, Calendar, User, Crown } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'

interface Client {
  id: string
  name: string
  phone: string
  email?: string
  isVip?: boolean
  createdAt: string
  lastAppointment?: {
    service: string
    startTime: string
  }
  _count?: {
    appointments: number
  }
}

interface ClientListProps {
  clients: Client[]
  loading?: boolean
  searchQuery?: string
  onEdit?: (client: Client) => void
  onDelete?: (clientId: string) => void
  onMessage?: (client: Client) => void
}

export default function ClientList({ 
  clients, 
  loading, 
  searchQuery = '',
  onEdit, 
  onDelete, 
  onMessage 
}: ClientListProps) {
  const { user } = useAuth()
  const [sortBy, setSortBy] = useState('name')
  const [filterStatus, setFilterStatus] = useState('all')

  const filteredAndSortedClients = clients
    .filter(client => {
      const matchesSearch = client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           client.phone.includes(searchQuery) ||
                           (client.email && client.email.toLowerCase().includes(searchQuery.toLowerCase()))
      
      const matchesStatus = filterStatus === 'all' || 
                           (filterStatus === 'new' && (client._count?.appointments || 0) <= 3) ||
                           (filterStatus === 'regular' && (client._count?.appointments || 0) > 3 && (client._count?.appointments || 0) <= 10) ||
                           (filterStatus === 'vip' && (Boolean(client.isVip) || (client._count?.appointments || 0) > 10))
      
      return matchesSearch && matchesStatus
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name)
        case 'appointments':
          return (b._count?.appointments || 0) - (a._count?.appointments || 0)
        case 'date':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        default:
          return 0
      }
    })

  const getStatusCount = (type: string) => {
    switch (type) {
      case 'new':
        return clients.filter(c => (c._count?.appointments || 0) <= 3).length
      case 'regular':
        return clients.filter(c => (c._count?.appointments || 0) > 3 && (c._count?.appointments || 0) <= 10).length
      case 'vip':
        return clients.filter(c => Boolean(c.isVip) || (c._count?.appointments || 0) > 10).length
      default:
        return 0
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-400"></div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 md:gap-4">
        <div className="flex items-center space-x-3 md:space-x-4 min-w-0">
          <h2 className="text-xl md:text-2xl font-bold text-foreground tracking-tight truncate">Lista de Clientes</h2>
          <div className="flex items-center space-x-2 text-muted-foreground flex-shrink-0">
            <Users className="w-4 h-4 md:w-5 md:h-5" />
            <span className="text-xs md:text-sm font-medium">{filteredAndSortedClients.length} clientes</span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 md:gap-3">
          {/* Status Filter */}
          <div className="relative">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="appearance-none bg-background border border-border rounded-lg px-3 md:px-4 py-2 text-foreground text-xs md:text-sm font-medium focus:outline-none focus:ring-1 focus:ring-ring transition-all cursor-pointer pr-8 md:pr-10"
            >
              <option value="all">Todos Status</option>
              <option value="new">Novos (&lt;=3)</option>
              <option value="regular">Regulares (4-10)</option>
              <option value="vip">VIPs (&gt;10)</option>
            </select>
            <ChevronDown className="absolute right-2 md:right-3 top-1/2 -translate-y-1/2 w-3 h-3 md:w-4 md:h-4 text-muted-foreground pointer-events-none" />
          </div>

          {/* Sort By */}
          <div className="relative">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="appearance-none bg-background border border-border rounded-lg px-3 md:px-4 py-2 text-foreground text-xs md:text-sm font-medium focus:outline-none focus:ring-1 focus:ring-ring transition-all cursor-pointer pr-8 md:pr-10"
            >
              <option value="name">Ordenar por Nome</option>
              <option value="appointments">Ordenar por Agendamentos</option>
              <option value="date">Ordenar por Data</option>
            </select>
            <ChevronDown className="absolute right-2 md:right-3 top-1/2 -translate-y-1/2 w-3 h-3 md:w-4 md:h-4 text-muted-foreground pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Status Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 md:gap-4">
        <div className="bg-card border border-border rounded-xl p-3 md:p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-muted-foreground text-xs md:text-sm font-medium">Novos</p>
              <p className="text-xl md:text-2xl font-bold text-amber-500">{getStatusCount('new')}</p>
            </div>
            <div className="w-8 h-8 bg-amber-500/10 rounded-lg flex items-center justify-center">
              <Users className="w-4 h-4 text-amber-500" />
            </div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-3 md:p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-muted-foreground text-xs md:text-sm font-medium">Regulares</p>
              <p className="text-xl md:text-2xl font-bold text-emerald-500">{getStatusCount('regular')}</p>
            </div>
            <div className="w-8 h-8 bg-emerald-500/10 rounded-lg flex items-center justify-center">
              <Users className="w-4 h-4 text-emerald-500" />
            </div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-3 md:p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-muted-foreground text-xs md:text-sm font-medium">VIPs</p>
              <p className="text-xl md:text-2xl font-bold text-primary">{getStatusCount('vip')}</p>
            </div>
            <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
              <Crown className="w-4 h-4 text-primary" />
            </div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-3 md:p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-muted-foreground text-xs md:text-sm font-medium">Total</p>
              <p className="text-xl md:text-2xl font-bold text-foreground">{clients.length}</p>
            </div>
            <div className="w-8 h-8 bg-muted rounded-lg flex items-center justify-center">
              <Users className="w-4 h-4 text-foreground" />
            </div>
          </div>
        </div>
      </div>

      {/* Clients Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
        <div className="table-responsive">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="px-3 md:px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Cliente</th>
                <th className="px-3 md:px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden sm:table-cell">Contato</th>
                <th className="px-3 md:px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Agend.</th>
                <th className="px-3 md:px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden md:table-cell">Cadastro</th>
                <th className="px-3 md:px-4 py-3 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredAndSortedClients.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 md:px-4 py-8 md:py-12 text-center">
                    <Users className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                    <p className="text-foreground font-semibold text-base">Nenhum cliente encontrado</p>
                    <p className="text-muted-foreground text-xs md:text-sm mt-1">
                      {searchQuery ? 'Tente alterar a busca ou filtros' : 'Adicione seu primeiro cliente'}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredAndSortedClients.map((client) => (
                  <tr key={client.id} className="hover:bg-muted/40 transition-colors">
                    <td className="px-3 md:px-4 py-3 md:py-4">
                      <div className="flex items-center space-x-3 md:space-x-4">
                        <div className="w-10 h-10 md:w-12 md:h-12 bg-primary/10 border border-primary/20 rounded-full flex items-center justify-center flex-shrink-0">
                          <span className="text-primary font-bold text-sm md:text-base">
                            {client.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-foreground font-semibold text-sm md:text-base truncate">{client.name}</p>
                            {Boolean(client.isVip) && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 flex-shrink-0">
                                <Crown className="w-3 h-3 text-amber-500" />
                                VIP
                              </span>
                            )}
                          </div>
                          {user?.role === 'DEVELOPER' && (
                            <p className="text-muted-foreground text-[10px] hidden md:block font-mono">ID: {client.id}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-3 md:px-4 py-3 md:py-4 hidden sm:table-cell">
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2 text-foreground/80 text-xs md:text-sm">
                          <Phone className="w-3.5 h-3.5 text-muted-foreground" />
                          <span className="truncate">{client.phone}</span>
                        </div>
                        {client.email && (
                          <div className="flex items-center space-x-2 text-muted-foreground text-xs">
                            <Mail className="w-3.5 h-3.5 text-muted-foreground" />
                            <span className="truncate">{client.email}</span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-3 md:px-4 py-3 md:py-4">
                      <div className="flex items-center space-x-1 md:space-x-2">
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                        <span className="text-foreground font-semibold text-sm">{client._count?.appointments || 0}</span>
                        <span className="text-muted-foreground text-xs hidden sm:inline">visitas</span>
                      </div>
                      {client.lastAppointment && (
                        <p className="text-muted-foreground text-xs mt-1 hidden md:block">
                          Última: {new Date(client.lastAppointment.startTime).toLocaleDateString('pt-BR')} · {client.lastAppointment.service}
                        </p>
                      )}
                    </td>
                    <td className="px-3 md:px-4 py-3 md:py-4 hidden md:table-cell">
                      <div className="text-muted-foreground text-xs font-medium">
                        {new Date(client.createdAt).toLocaleDateString('pt-BR')}
                      </div>
                    </td>
                    <td className="px-3 md:px-4 py-3 md:py-4">
                      <div className="flex items-center justify-center space-x-1 md:space-x-2">
                        <button
                          onClick={() => onEdit?.(client)}
                          className="p-2 text-primary hover:bg-primary/10 rounded-lg transition-colors"
                          title="Editar cliente"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => onMessage?.(client)}
                          className="p-2 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition-colors hidden sm:block"
                          title="Enviar mensagem"
                        >
                          <MessageSquare className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => onDelete?.(client.id)}
                          className="p-2 text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                          title="Excluir cliente"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
