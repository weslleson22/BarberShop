'use client'

import { useState } from 'react'
import { Users, Filter, ChevronDown, Search, Edit, Trash2, MessageSquare, Phone, Mail, Calendar, User } from 'lucide-react'

interface Client {
  id: string
  name: string
  phone: string
  email?: string
  createdAt: string
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
                           (filterStatus === 'vip' && (client._count?.appointments || 0) > 10)
      
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
        return clients.filter(c => (c._count?.appointments || 0) > 10).length
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center space-x-4">
          <h2 className="text-2xl font-bold text-white">Lista de Clientes</h2>
          <div className="flex items-center space-x-2 text-white/60">
            <Users className="w-5 h-5" />
            <span className="text-sm">{filteredAndSortedClients.length} clientes</span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          {/* Status Filter */}
          <div className="relative">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="appearance-none bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white text-sm focus:outline-none focus:border-yellow-400/50 focus:bg-white/10 transition-all cursor-pointer"
            >
              <option value="all" className="bg-gray-900">Todos Status</option>
              <option value="new" className="bg-gray-900">Novos (&lt;=3)</option>
              <option value="regular" className="bg-gray-900">Regulares (4-10)</option>
              <option value="vip" className="bg-gray-900">VIPs (&gt;10)</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40 pointer-events-none" />
          </div>

          {/* Sort By */}
          <div className="relative">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="appearance-none bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white text-sm focus:outline-none focus:border-yellow-400/50 focus:bg-white/10 transition-all cursor-pointer"
            >
              <option value="name" className="bg-gray-900">Ordenar por Nome</option>
              <option value="appointments" className="bg-gray-900">Ordenar por Agendamentos</option>
              <option value="date" className="bg-gray-900">Ordenar por Data</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Status Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <div className="bg-white/5 border border-white/10 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white/60 text-sm">Novos</p>
              <p className="text-2xl font-bold text-yellow-400">{getStatusCount('new')}</p>
            </div>
            <div className="w-8 h-8 bg-yellow-400/20 rounded-lg flex items-center justify-center">
              <Users className="w-4 h-4 text-yellow-400" />
            </div>
          </div>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white/60 text-sm">Regulares</p>
              <p className="text-2xl font-bold text-green-400">{getStatusCount('regular')}</p>
            </div>
            <div className="w-8 h-8 bg-green-400/20 rounded-lg flex items-center justify-center">
              <Users className="w-4 h-4 text-green-400" />
            </div>
          </div>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white/60 text-sm">VIPs</p>
              <p className="text-2xl font-bold text-purple-400">{getStatusCount('vip')}</p>
            </div>
            <div className="w-8 h-8 bg-purple-400/20 rounded-lg flex items-center justify-center">
              <Users className="w-4 h-4 text-purple-400" />
            </div>
          </div>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white/60 text-sm">Total</p>
              <p className="text-2xl font-bold text-white">{clients.length}</p>
            </div>
            <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
              <Users className="w-4 h-4 text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* Clients Table */}
      <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                <th className="px-4 py-3 text-left text-xs font-medium text-white/60 uppercase tracking-wider">Cliente</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-white/60 uppercase tracking-wider">Contato</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-white/60 uppercase tracking-wider">Agendamentos</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-white/60 uppercase tracking-wider">Cadastro</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-white/60 uppercase tracking-wider">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredAndSortedClients.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center">
                    <Users className="w-16 h-16 text-white/20 mx-auto mb-4" />
                    <p className="text-white/60 text-lg">Nenhum cliente encontrado</p>
                    <p className="text-white/40 text-sm mt-2">
                      {searchQuery ? 'Tente alterar a busca ou filtros' : 'Adicione seu primeiro cliente'}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredAndSortedClients.map((client) => (
                  <tr key={client.id} className="hover:bg-white/5 transition-colors">
                    <td className="px-4 py-4">
                      <div className="flex items-center space-x-4">
                        <div className="w-14 h-14 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full flex items-center justify-center flex-shrink-0">
                          <span className="text-black font-bold text-lg">
                            {client.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="text-white font-semibold text-lg">{client.name}</p>
                          <p className="text-white/60 text-sm">ID: {client.id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2 text-white/80 text-sm">
                          <Phone className="w-4 h-4" />
                          <span>{client.phone}</span>
                        </div>
                        {client.email && (
                          <div className="flex items-center space-x-2 text-white/60 text-sm">
                            <Mail className="w-4 h-4" />
                            <span>{client.email}</span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center space-x-2">
                        <Calendar className="w-5 h-5 text-white/60" />
                        <span className="text-white font-semibold text-base">{client._count?.appointments || 0}</span>
                        <span className="text-white/60 text-sm">visitas</span>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="text-white/80 text-sm">
                        {new Date(client.createdAt).toLocaleDateString('pt-BR')}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center justify-center space-x-2">
                        <button
                          onClick={() => onEdit?.(client)}
                          className="p-3 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-all"
                          title="Editar cliente"
                        >
                          <Edit className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => onMessage?.(client)}
                          className="p-3 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-all"
                          title="Enviar mensagem"
                        >
                          <MessageSquare className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => onDelete?.(client.id)}
                          className="p-3 text-white/60 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all"
                          title="Excluir cliente"
                        >
                          <Trash2 className="w-5 h-5" />
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
