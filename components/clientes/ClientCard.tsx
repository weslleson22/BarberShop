'use client'

import { useState } from 'react'
import { User, Phone, Mail, Calendar, MoreVertical, Edit, Trash2, MessageSquare, TrendingUp } from 'lucide-react'

interface ClientCardProps {
  client: {
    id: string
    name: string
    phone: string
    email?: string
    createdAt: string
    _count?: {
      appointments: number
    }
  }
  onEdit?: (client: any) => void
  onDelete?: (clientId: string) => void
  onMessage?: (client: any) => void
}

export default function ClientCard({ client, onEdit, onDelete, onMessage }: ClientCardProps) {
  const [showActions, setShowActions] = useState(false)

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
  }

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  }

  const getAppointmentStatus = (count: number) => {
    if (count === 0) return { color: 'text-gray-400', bg: 'bg-gray-400/20', border: 'border-gray-400/30', label: 'Sem agendamentos' }
    if (count <= 3) return { color: 'text-yellow-400', bg: 'bg-yellow-400/20', border: 'border-yellow-400/30', label: 'Cliente novo' }
    if (count <= 10) return { color: 'text-green-400', bg: 'bg-green-400/20', border: 'border-green-400/30', label: 'Cliente regular' }
    return { color: 'text-purple-400', bg: 'bg-purple-400/20', border: 'border-purple-400/30', label: 'Cliente VIP' }
  }

  const statusInfo = getAppointmentStatus(client._count?.appointments || 0)

  return (
    <div className="bg-gradient-to-br from-gray-800/50 to-black/50 border border-white/6 rounded-2xl p-6 hover:border-white/10 transition-all duration-300">
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 bg-gradient-to-br from-yellow-400/20 to-yellow-600/20 border border-yellow-400/30 rounded-xl flex items-center justify-center">
            <span className="text-xl font-bold text-yellow-400">
              {getInitials(client.name)}
            </span>
          </div>
          <div>
            <h3 className="text-xl font-semibold text-white">{client.name}</h3>
            <div className={`flex items-center space-x-2 px-3 py-1 rounded-lg border ${statusInfo.bg} ${statusInfo.border} ${statusInfo.color}`}>
              <TrendingUp className="w-4 h-4" />
              <span className="text-sm font-medium">{statusInfo.label}</span>
            </div>
          </div>
        </div>
        
        <div className="relative">
          <button 
            onClick={() => setShowActions(!showActions)}
            className="p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-all"
          >
            <MoreVertical className="w-5 h-5" />
          </button>
          
          {showActions && (
            <div className="absolute right-0 top-12 w-48 bg-gray-900 border border-white/10 rounded-xl shadow-xl z-10">
              <button
                onClick={() => {
                  onEdit?.(client)
                  setShowActions(false)
                }}
                className="w-full px-4 py-3 text-left text-white/80 hover:text-white hover:bg-white/10 transition-all flex items-center space-x-3 rounded-t-xl"
              >
                <Edit className="w-4 h-4" />
                <span>Editar</span>
              </button>
              <button
                onClick={() => {
                  onMessage?.(client)
                  setShowActions(false)
                }}
                className="w-full px-4 py-3 text-left text-white/80 hover:text-white hover:bg-white/10 transition-all flex items-center space-x-3"
              >
                <MessageSquare className="w-4 h-4" />
                <span>Enviar Mensagem</span>
              </button>
              <button
                onClick={() => {
                  onDelete?.(client.id)
                  setShowActions(false)
                }}
                className="w-full px-4 py-3 text-left text-red-400 hover:text-red-300 hover:bg-red-400/10 transition-all flex items-center space-x-3 rounded-b-xl"
              >
                <Trash2 className="w-4 h-4" />
                <span>Excluir</span>
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="space-y-4">
        {/* Contact Info */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-white/5 rounded-lg flex items-center justify-center">
              <Phone className="w-4 h-4 text-yellow-400" />
            </div>
            <div>
              <p className="text-white/60 text-xs">Telefone</p>
              <p className="text-white font-medium">{client.phone}</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-white/5 rounded-lg flex items-center justify-center">
              <Mail className="w-4 h-4 text-yellow-400" />
            </div>
            <div>
              <p className="text-white/60 text-xs">Email</p>
              <p className="text-white font-medium text-sm">
                {client.email || 'Não informado'}
              </p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="flex items-center justify-between pt-4 border-t border-white/6">
          <div className="flex items-center space-x-3">
            <Calendar className="w-4 h-4 text-white/40" />
            <span className="text-white/60 text-sm">
              Cliente desde {formatDate(client.createdAt)}
            </span>
          </div>
          
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
            <span className="text-yellow-400 font-medium">
              {client._count?.appointments || 0} agendamentos
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
