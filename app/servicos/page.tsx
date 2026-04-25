'use client'

import { useState, useEffect } from 'react'
import { Scissors, Clock, DollarSign, Plus, Search, Edit, Trash2, Eye, EyeOff } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { useRouter } from 'next/navigation'
import AppSidebar from '@/components/dashboard/AppSidebar'

interface Service {
  id: string
  name: string
  description?: string
  price: number
  duration: number
  isActive: boolean
  createdAt: string
  _count?: {
    appointments: number
  }
}

export default function ServicosPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingService, setEditingService] = useState<Service | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    duration: '',
    isActive: true,
  })

  useEffect(() => {
    fetchServices()
  }, [])

  // Página pública de serviços - todos podem visualizar

  // Controlar visibilidade do botão de adicionar/editar serviços
  const canManageServices = user?.role === 'ADMIN'

  const fetchServices = async () => {
    try {
      // Usando a API real para buscar serviços do Prisma
      const response = await fetch('/api/services')
      if (response.ok) {
        const data = await response.json()
        setServices(data)
      } else {
        console.error('Erro ao buscar serviços:', response.statusText)
      }
    } catch (error) {
      console.error('Error fetching services:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.name || !formData.price || !formData.duration) {
      alert('Nome, preço e duração são obrigatórios')
      return
    }

    try {
      const serviceData = {
        name: formData.name,
        description: formData.description,
        price: parseFloat(formData.price),
        duration: parseInt(formData.duration),
        isActive: formData.isActive,
      }

      let response
      if (editingService) {
        // Editar serviço
        response = await fetch(`/api/services/${editingService.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(serviceData),
        })
      } else {
        // Adicionar novo serviço
        response = await fetch('/api/services', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(serviceData),
        })
      }
      
      if (response.ok) {
        const savedService = await response.json()
        console.log('Serviço salvo no Prisma:', savedService)
        
        // Atualizar a lista de serviços
        await fetchServices()
        
        // Resetar formulário
        setFormData({ name: '', description: '', price: '', duration: '', isActive: true })
        setShowAddForm(false)
        setEditingService(null)
        
        alert(editingService ? 'Serviço atualizado com sucesso!' : 'Serviço criado com sucesso!')
      } else {
        const error = await response.json()
        alert(error.error || 'Erro ao salvar serviço')
      }
    } catch (error) {
      console.error('Error saving service:', error)
      alert('Erro ao salvar serviço')
    }
  }

  const handleEdit = (service: Service) => {
    setEditingService(service)
    setFormData({
      name: service.name,
      description: service.description || '',
      price: service.price.toString(),
      duration: service.duration.toString(),
      isActive: service.isActive,
    })
    setShowAddForm(true)
  }

  const handleToggleActive = async (serviceId: string, currentStatus: boolean) => {
    try {
      const response = await fetch(`/api/services/${serviceId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !currentStatus }),
      })
      
      if (response.ok) {
        await fetchServices()
        alert(`Serviço ${!currentStatus ? 'ativado' : 'desativado'} com sucesso!`)
      } else {
        const error = await response.json()
        alert(error.error || 'Erro ao atualizar serviço')
      }
    } catch (error) {
      console.error('Error toggling service:', error)
      alert('Erro ao atualizar serviço')
    }
  }

  const handleDelete = async (serviceId: string) => {
    if (!confirm('Tem certeza que deseja excluir este serviço? Esta ação não pode ser desfeita.')) {
      return
    }

    try {
      const response = await fetch(`/api/services/${serviceId}`, {
        method: 'DELETE',
      })
      
      if (response.ok) {
        await fetchServices()
        alert('Serviço excluído com sucesso!')
      } else {
        const error = await response.json()
        alert(error.error || 'Erro ao excluir serviço')
      }
    } catch (error) {
      console.error('Error deleting service:', error)
      alert('Erro ao excluir serviço')
    }
  }

  const filteredServices = services.filter(service =>
    service.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (service.description && service.description.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-blue-950 to-black">
      {/* Sidebar Fixado atrás do conteúdo */}
      <div className="fixed inset-y-0 left-0 z-30 w-80">
        <AppSidebar />
      </div>
      
      {/* Conteúdo principal à frente do sidebar */}
      <div className="lg:pl-80 relative z-40">
        <div className="p-6">
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-white">Serviços</h1>
                <p className="text-white/60 mt-2">Gerencie todos os serviços oferecidos pela barbearia</p>
              </div>
              {canManageServices && (
                <button
                  onClick={() => {
                    setShowAddForm(true)
                    setEditingService(null)
                    setFormData({ name: '', description: '', price: '', duration: '', isActive: true })
                  }}
                  className="bg-gradient-to-r from-yellow-400 to-yellow-600 text-black px-6 py-3 rounded-xl hover:from-yellow-500 hover:to-yellow-700 transition-all flex items-center font-medium"
                >
                  <Plus className="w-5 h-5 mr-2" />
                  Novo Serviço
                </button>
              )}
            </div>
          </div>

          {/* Busca */}
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/40 w-5 h-5" />
              <input
                type="text"
                placeholder="Buscar por nome ou descrição..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/6 rounded-xl text-white placeholder-white/40 focus:ring-2 focus:ring-yellow-400/50 focus:border-yellow-400/50 transition-all"
              />
            </div>
          </div>

          {/* Formulário de Adicionar/Editar */}
          {showAddForm && (
            <div className="mb-6 bg-gradient-to-br from-gray-800/50 to-black/50 border border-white/6 rounded-2xl p-6">
              <h3 className="text-xl font-semibold text-white mb-4">
                {editingService ? 'Editar Serviço' : 'Novo Serviço'}
              </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-white/80 mb-1">
                  Nome *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 bg-white/5 border border-white/6 rounded-xl text-white placeholder-white/40 focus:ring-2 focus:ring-yellow-400/50 focus:border-yellow-400/50 transition-all"
                  placeholder="Nome do serviço"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-white/80 mb-1">
                  Descrição
                </label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 bg-white/5 border border-white/6 rounded-xl text-white placeholder-white/40 focus:ring-2 focus:ring-yellow-400/50 focus:border-yellow-400/50 transition-all"
                  placeholder="Descrição do serviço"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-white/80 mb-1">
                  Preço (R$) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  className="w-full px-3 py-2 bg-white/5 border border-white/6 rounded-xl text-white placeholder-white/40 focus:ring-2 focus:ring-yellow-400/50 focus:border-yellow-400/50 transition-all"
                  placeholder="0.00"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-white/80 mb-1">
                  Duração (minutos) *
                </label>
                <input
                  type="number"
                  min="1"
                  value={formData.duration}
                  onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                  className="w-full px-3 py-2 bg-white/5 border border-white/6 rounded-xl text-white placeholder-white/40 focus:ring-2 focus:ring-yellow-400/50 focus:border-yellow-400/50 transition-all"
                  placeholder="30"
                  required
                />
              </div>
            </div>
            <div className="flex items-center">
              <input
                type="checkbox"
                id="isActive"
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <label htmlFor="isActive" className="ml-2 text-sm text-gray-700">
                Serviço ativo (disponível para agendamento)
              </label>
            </div>
            <div className="flex items-center space-x-4">
              <button
                type="submit"
                className="bg-gradient-to-r from-yellow-400 to-yellow-600 text-black px-6 py-3 rounded-xl hover:from-yellow-500 hover:to-yellow-700 transition-all font-medium"
              >
                {editingService ? 'Atualizar' : 'Salvar'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowAddForm(false)
                  setEditingService(null)
                  setFormData({ name: '', description: '', price: '', duration: '', isActive: true })
                }}
                className="bg-white/10 border border-white/20 text-white px-6 py-3 rounded-xl hover:bg-white/20 transition-all font-medium"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Lista de Serviços em Cards */}
      <div className="bg-gradient-to-br from-gray-800/50 to-black/50 border border-white/6 rounded-2xl p-6">
        {filteredServices.length === 0 ? (
          <div className="text-center py-12">
            <Scissors className="w-12 h-12 text-white/40 mx-auto mb-4" />
            <p className="text-white text-lg">Nenhum serviço encontrado</p>
            <p className="text-white/60 text-sm mt-2">
              {searchTerm ? 'Tente uma busca diferente' : 'Adicione seu primeiro serviço'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-h-96 overflow-y-auto">
            {filteredServices.map((service) => (
              <div 
                key={service.id} 
                className="bg-white/5 border border-white/6 rounded-xl p-4 hover:bg-white/10 transition-all cursor-pointer"
                onClick={() => router.push('/agendar?service=' + service.id)}
              >
                <div className="flex items-start space-x-3 mb-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full flex items-center justify-center flex-shrink-0">
                    <Scissors className="w-6 h-6 text-black" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-white truncate mb-1">{service.name}</h3>
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      service.isActive 
                        ? 'bg-green-400/20 text-green-400 border border-green-400/30' 
                        : 'bg-red-400/20 text-red-400 border border-red-400/30'
                    }`}>
                      {service.isActive ? 'Ativo' : 'Inativo'}
                    </span>
                  </div>
                </div>
                
                {service.description && (
                  <p className="text-white/60 text-sm mb-3 line-clamp-2">{service.description}</p>
                )}
                
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center text-sm text-white/60">
                    <Clock className="w-4 h-4 text-white/40 mr-2 flex-shrink-0" />
                    <span>{service.duration} min</span>
                  </div>
                  <div className="flex items-center text-sm font-semibold text-white">
                    <DollarSign className="w-4 h-4 text-white/40 mr-2 flex-shrink-0" />
                    <span>{formatCurrency(service.price)}</span>
                  </div>
                </div>
                
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    router.push('/agendar?service=' + service.id)
                  }}
                  className="w-full bg-gradient-to-r from-yellow-400 to-yellow-600 text-black px-4 py-2 rounded-xl hover:from-yellow-500 hover:to-yellow-700 transition-all font-medium text-center"
                >
                  Agendar Agora
                </button>
                
                {/* Ações de gerenciamento apenas para administradores */}
                {canManageServices && (
                  <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-white/10">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleEdit(service)
                      }}
                      className="flex items-center justify-center text-blue-400 hover:text-blue-300 hover:bg-white/5 text-sm py-2 px-3 rounded-lg transition-all"
                      title="Editar"
                    >
                      <Edit className="w-4 h-4 mr-1 flex-shrink-0" />
                      <span>Editar</span>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleToggleActive(service.id, service.isActive)
                      }}
                      className={`flex items-center justify-center hover:bg-white/5 text-sm py-2 px-3 rounded-lg transition-all ${
                        service.isActive ? 'text-yellow-400 hover:text-yellow-300' : 'text-green-400 hover:text-green-300'
                      }`}
                      title={service.isActive ? 'Desativar' : 'Ativar'}
                    >
                      {service.isActive ? <EyeOff className="w-4 h-4 mr-1 flex-shrink-0" /> : <Eye className="w-4 h-4 mr-1 flex-shrink-0" />}
                      <span>{service.isActive ? 'Desativar' : 'Ativar'}</span>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDelete(service.id)
                      }}
                      className="flex items-center justify-center text-red-400 hover:text-red-300 hover:bg-white/5 text-sm py-2 px-3 rounded-lg transition-all"
                      title="Excluir"
                    >
                      <Trash2 className="w-4 h-4 mr-1 flex-shrink-0" />
                      <span>Excluir</span>
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Resumo */}
      {services.length > 0 && (
        <div className="mt-8 bg-gradient-to-br from-gray-800/50 to-black/50 border border-white/6 rounded-2xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Resumo de Serviços</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-white/60">Total de Serviços</p>
              <p className="text-2xl font-bold text-white">{services.length}</p>
            </div>
            <div>
              <p className="text-sm text-white/60">Serviços Ativos</p>
              <p className="text-2xl font-bold text-white">
                {services.filter(s => s.isActive).length}
              </p>
            </div>
            <div>
              <p className="text-sm text-white/60">Preço Médio</p>
              <p className="text-2xl font-bold text-white">
                {formatCurrency(services.reduce((sum, s) => sum + s.price, 0) / services.length)}
              </p>
            </div>
            <div>
              <p className="text-sm text-white/60">Total de Agendamentos</p>
              <p className="text-2xl font-bold text-white">
                {services.reduce((sum, s) => sum + (s._count?.appointments || 0), 0)}
              </p>
            </div>
          </div>
        </div>
      )}
        </div>
      </div>
    </div>
  )
}
