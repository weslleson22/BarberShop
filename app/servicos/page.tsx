'use client'

import { useState, useEffect } from 'react'
import { Scissors, Clock, DollarSign, Plus, Search, Edit, Trash2, Eye, EyeOff } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { useRouter } from 'next/navigation'

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
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Serviços</h1>
            <p className="text-gray-600 mt-2">Gerencie todos os serviços oferecidos pela barbearia</p>
          </div>
          {canManageServices && (
            <button
              onClick={() => {
                setShowAddForm(true)
                setEditingService(null)
                setFormData({ name: '', description: '', price: '', duration: '', isActive: true })
              }}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center"
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
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Buscar por nome ou descrição..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Formulário de Adicionar/Editar */}
      {showAddForm && (
        <div className="mb-6 bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold mb-4">
            {editingService ? 'Editar Serviço' : 'Novo Serviço'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nome *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Nome do serviço"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Descrição
                </label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Descrição do serviço"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Preço (R$) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="0.00"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Duração (minutos) *
                </label>
                <input
                  type="number"
                  min="1"
                  value={formData.duration}
                  onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
            <div className="flex space-x-3">
              <button
                type="submit"
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
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
                className="bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Lista de Serviços em Cards */}
      <div className="bg-white rounded-lg shadow-md p-6">
        {filteredServices.length === 0 ? (
          <div className="text-center py-12">
            <Scissors className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">Nenhum serviço encontrado</p>
            <p className="text-gray-400 text-sm mt-2">
              {searchTerm ? 'Tente uma busca diferente' : 'Adicione seu primeiro serviço'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-h-96 overflow-y-auto">
            {filteredServices.map((service) => (
              <div 
                key={service.id} 
                className="border border-gray-200 rounded-lg p-4 hover:shadow-lg transition-shadow cursor-pointer hover:border-blue-300"
                onClick={() => router.push('/agendar?service=' + service.id)}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center">
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                      <Scissors className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{service.name}</h3>
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        service.isActive 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {service.isActive ? 'Ativo' : 'Inativo'}
                      </span>
                    </div>
                  </div>
                </div>
                
                {service.description && (
                  <p className="text-gray-600 text-sm mb-3">{service.description}</p>
                )}
                
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center text-sm text-gray-700">
                    <Clock className="w-4 h-4 text-gray-400 mr-1" />
                    {service.duration} min
                  </div>
                  <div className="flex items-center text-sm font-semibold text-gray-900">
                    <DollarSign className="w-4 h-4 text-gray-400 mr-1" />
                    {formatCurrency(service.price)}
                  </div>
                </div>
                
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    router.push('/agendar?service=' + service.id)
                  }}
                  className="w-full bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors font-medium"
                >
                  Agendar Agora
                </button>
                
                {/* Ações de gerenciamento apenas para administradores */}
                {canManageServices && (
                  <div className="flex space-x-2 mt-3 pt-3 border-t border-gray-200">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleEdit(service)
                      }}
                      className="flex-1 text-blue-600 hover:text-blue-900 text-sm"
                      title="Editar"
                    >
                      <Edit className="w-4 h-4 inline mr-1" />
                      Editar
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleToggleActive(service.id, service.isActive)
                      }}
                      className={`flex-1 text-sm ${
                        service.isActive ? 'text-yellow-600 hover:text-yellow-900' : 'text-green-600 hover:text-green-900'
                      }`}
                      title={service.isActive ? 'Desativar' : 'Ativar'}
                    >
                      {service.isActive ? <EyeOff className="w-4 h-4 inline mr-1" /> : <Eye className="w-4 h-4 inline mr-1" />}
                      {service.isActive ? 'Desativar' : 'Ativar'}
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDelete(service.id)
                      }}
                      className="flex-1 text-red-600 hover:text-red-900 text-sm"
                      title="Excluir"
                    >
                      <Trash2 className="w-4 h-4 inline mr-1" />
                      Excluir
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
        <div className="mt-8 bg-blue-50 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-4">Resumo de Serviços</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-blue-600">Total de Serviços</p>
              <p className="text-2xl font-bold text-blue-900">{services.length}</p>
            </div>
            <div>
              <p className="text-sm text-blue-600">Serviços Ativos</p>
              <p className="text-2xl font-bold text-blue-900">
                {services.filter(s => s.isActive).length}
              </p>
            </div>
            <div>
              <p className="text-sm text-blue-600">Preço Médio</p>
              <p className="text-2xl font-bold text-blue-900">
                {formatCurrency(services.reduce((sum, s) => sum + s.price, 0) / services.length)}
              </p>
            </div>
            <div>
              <p className="text-sm text-blue-600">Total de Agendamentos</p>
              <p className="text-2xl font-bold text-blue-900">
                {services.reduce((sum, s) => sum + (s._count?.appointments || 0), 0)}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
