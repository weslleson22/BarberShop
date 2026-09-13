'use client'

import { useState, useEffect } from 'react'
import { Scissors, Clock, DollarSign, Plus, Search, Edit, Trash2, Eye, EyeOff } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { useSidebar } from '@/lib/sidebar-context'
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
  const { isSidebarCollapsed } = useSidebar()
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
    // Garantir que o valor seja um número válido
    const numericValue = typeof value === 'number' ? value : parseFloat(String(value))
    if (isNaN(numericValue) || !isFinite(numericValue)) {
      return 'R$ 0,00'
    }
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      maximumFractionDigits: 2,
    }).format(numericValue)
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
      <div className="fixed inset-y-0 left-0 sidebar-responsive z-50">
        <AppSidebar />
      </div>
      
      {/* Conteúdo principal à frente do sidebar */}
      <div className={`md:pl-[280px] lg:pl-[320px] relative z-10 flex flex-col h-screen transition-all duration-300 ${isSidebarCollapsed ? 'lg:pl-16' : ''}`}>
        <div className="flex-1 main-content-scroll">
          <div className="container-responsive py-6">
          <div className="mb-6 md:mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-white">Serviços</h1>
                <p className="text-white/60 mt-1 md:mt-2 text-sm md:text-base">Gerencie todos os serviços oferecidos pela barbearia</p>
              </div>
              {canManageServices && (
                <button
                  onClick={() => {
                    setShowAddForm(true)
                    setEditingService(null)
                    setFormData({ name: '', description: '', price: '', duration: '', isActive: true })
                  }}
                  className="bg-gradient-to-r from-yellow-400 to-yellow-600 text-black px-4 md:px-6 py-2.5 md:py-3 rounded-lg md:rounded-xl hover:from-yellow-500 hover:to-yellow-700 transition-all flex items-center font-medium text-sm md:text-base"
                >
                  <Plus className="w-4 h-4 md:w-5 md:h-5 mr-2" />
                  Novo Serviço
                </button>
              )}
            </div>
          </div>

          {/* Busca */}
          <div className="mb-4 md:mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/40 w-4 h-4 md:w-5 md:h-5" />
              <input
                type="text"
                placeholder="Buscar por nome ou descrição..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 md:pl-10 pr-4 py-2.5 md:py-3 bg-white/5 border border-white/6 rounded-lg md:rounded-xl text-white placeholder-white/40 focus:ring-2 focus:ring-yellow-400/50 focus:border-yellow-400/50 transition-all text-sm md:text-base"
              />
            </div>
          </div>

          {/* Formulário de Adicionar/Editar */}
          {showAddForm && (
            <div className="mb-4 md:mb-6 bg-gradient-to-br from-gray-800/50 to-black/50 border border-white/6 rounded-lg md:rounded-2xl p-4 md:p-6">
              <h3 className="text-lg md:text-xl font-semibold text-white mb-3 md:mb-4">
                {editingService ? 'Editar Serviço' : 'Novo Serviço'}
              </h3>
          <form onSubmit={handleSubmit} className="space-y-3 md:space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
              <div>
                <label className="block text-xs md:text-sm font-medium text-white/80 mb-1 md:mb-1.5">
                  Nome *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 md:px-4 py-2 md:py-2.5 bg-white/5 border border-white/6 rounded-lg md:rounded-xl text-white placeholder-white/40 focus:ring-2 focus:ring-yellow-400/50 focus:border-yellow-400/50 transition-all text-sm md:text-base"
                  placeholder="Nome do serviço"
                  required
                />
              </div>
              <div>
                <label className="block text-xs md:text-sm font-medium text-white/80 mb-1 md:mb-1.5">
                  Descrição
                </label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 md:px-4 py-2 md:py-2.5 bg-white/5 border border-white/6 rounded-lg md:rounded-xl text-white placeholder-white/40 focus:ring-2 focus:ring-yellow-400/50 focus:border-yellow-400/50 transition-all text-sm md:text-base"
                  placeholder="Descrição do serviço"
                />
              </div>
              <div>
                <label className="block text-xs md:text-sm font-medium text-white/80 mb-1 md:mb-1.5">
                  Preço (R$) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  className="w-full px-3 md:px-4 py-2 md:py-2.5 bg-white/5 border border-white/6 rounded-lg md:rounded-xl text-white placeholder-white/40 focus:ring-2 focus:ring-yellow-400/50 focus:border-yellow-400/50 transition-all text-sm md:text-base"
                  placeholder="0.00"
                  required
                />
              </div>
              <div>
                <label className="block text-xs md:text-sm font-medium text-white/80 mb-1 md:mb-1.5">
                  Duração (minutos) *
                </label>
                <input
                  type="number"
                  min="1"
                  value={formData.duration}
                  onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                  className="w-full px-3 md:px-4 py-2 md:py-2.5 bg-white/5 border border-white/6 rounded-lg md:rounded-xl text-white placeholder-white/40 focus:ring-2 focus:ring-yellow-400/50 focus:border-yellow-400/50 transition-all text-sm md:text-base"
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
              <label htmlFor="isActive" className="ml-2 text-xs md:text-sm text-gray-700">
                Serviço ativo (disponível para agendamento)
              </label>
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
              <button
                type="submit"
                className="bg-gradient-to-r from-yellow-400 to-yellow-600 text-black px-4 md:px-6 py-2.5 md:py-3 rounded-lg md:rounded-xl hover:from-yellow-500 hover:to-yellow-700 transition-all font-medium text-sm md:text-base"
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
                className="bg-white/10 border border-white/20 text-white px-4 md:px-6 py-2.5 md:py-3 rounded-lg md:rounded-xl hover:bg-white/20 transition-all font-medium text-sm md:text-base"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Lista de Serviços em Cards */}
      <div className="bg-gradient-to-br from-gray-800/50 to-black/50 border border-white/6 rounded-lg md:rounded-2xl p-4 md:p-6">
        {filteredServices.length === 0 ? (
          <div className="text-center py-8 md:py-12">
            <Scissors className="w-10 h-10 md:w-12 md:h-12 text-white/40 mx-auto mb-3 md:mb-4" />
            <p className="text-white text-base md:text-lg">Nenhum serviço encontrado</p>
            <p className="text-white/60 text-xs md:text-sm mt-1 md:mt-2">
              {searchTerm ? 'Tente uma busca diferente' : 'Adicione seu primeiro serviço'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4">
            {filteredServices.map((service) => (
              <div 
                key={service.id} 
                className="bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/6 rounded-xl p-4 hover:bg-white/10 hover:border-white/10 transition-all cursor-pointer group shadow-lg flex flex-col h-full"
              >
                {/* Header do Card - Nome */}
                <div className="flex items-center space-x-2 mb-2">
                  <div className="w-8 h-8 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-lg flex items-center justify-center flex-shrink-0 shadow-md">
                    <Scissors className="w-4 h-4 text-black" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-white text-sm md:text-base leading-tight" title={service.name}>{service.name}</h3>
                  </div>
                </div>

                {/* Status do serviço - Acima da descrição */}
                <div className="mb-2">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold ${
                    service.isActive 
                      ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                      : 'bg-red-500/20 text-red-400 border border-red-500/30'
                  }`}>
                    {service.isActive ? 'Ativo' : 'Inativo'}
                  </span>
                </div>
                
                {/* Descrição - Altura fixa e alinhada */}
                <div className="h-10 mb-3">
                  {service.description ? (
                    <p className="text-white/70 text-xs leading-relaxed line-clamp-2 text-left" title={service.description}>
                      {service.description}
                    </p>
                  ) : (
                    <p className="text-white/40 text-xs italic text-left">Sem descrição</p>
                  )}
                </div>

                {/* Informações principais - Duração e Preço - Alinhados */}
                <div className="grid grid-cols-2 gap-2 mb-3">
                  <div className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 border border-blue-500/20 rounded-lg p-2 flex flex-col justify-center">
                    <div className="flex items-center justify-between mb-0.5">
                      <div className="flex items-center space-x-1">
                        <Clock className="w-3 h-3 text-blue-400 flex-shrink-0" />
                        <span className="text-white/50 text-[9px] font-semibold uppercase tracking-wider">Duração</span>
                      </div>
                    </div>
                    <p className="text-white font-bold text-sm text-right">
                      {service.duration}<span className="text-[10px] font-normal text-white/60 ml-1">min</span>
                    </p>
                  </div>
                  <div className="bg-gradient-to-br from-yellow-500/10 to-yellow-500/5 border border-yellow-500/20 rounded-lg p-2 flex flex-col justify-center">
                    <div className="flex items-center justify-between mb-0.5">
                      <div className="flex items-center space-x-1">
                        <DollarSign className="w-3 h-3 text-yellow-400 flex-shrink-0" />
                        <span className="text-white/50 text-[9px] font-semibold uppercase tracking-wider">Preço</span>
                      </div>
                    </div>
                    <p className="text-white font-bold text-sm text-right" title={formatCurrency(service.price)}>
                      {formatCurrency(service.price)}
                    </p>
                  </div>
                </div>

                {/* Botão principal - Alinhado na base */}
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    router.push('/agendar?service=' + service.id)
                  }}
                  className="w-full bg-gradient-to-r from-yellow-400 via-yellow-500 to-yellow-600 text-black px-3 py-2 rounded-lg hover:from-yellow-500 hover:via-yellow-600 hover:to-yellow-700 transition-all font-bold text-sm shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 mb-3 mt-auto"
                >
                  Agendar Agora
                </button>
                
                {/* Ações de gerenciamento - Apenas para administradores */}
                {canManageServices && (
                  <div className="pt-3 border-t border-white/10 mt-auto">
                    <div className="grid grid-cols-3 gap-1.5">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleEdit(service)
                        }}
                        className="flex flex-col items-center justify-center px-1.5 py-2 bg-blue-500/10 border border-blue-500/20 rounded-lg hover:bg-blue-500/20 hover:border-blue-500/30 transition-all group"
                        title="Editar serviço"
                      >
                        <Edit className="w-3.5 h-3.5 text-blue-400 group-hover:text-blue-300 mb-0.5" />
                        <span className="text-[9px] text-blue-400 group-hover:text-blue-300 font-medium">Editar</span>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleToggleActive(service.id, service.isActive)
                        }}
                        className={`flex flex-col items-center justify-center px-1.5 py-2 border rounded-lg hover:bg-opacity-20 transition-all group ${
                          service.isActive 
                            ? 'bg-yellow-500/10 border-yellow-500/20 hover:bg-yellow-500/20 hover:border-yellow-500/30' 
                            : 'bg-green-500/10 border-green-500/20 hover:bg-green-500/20 hover:border-green-500/30'
                        }`}
                        title={service.isActive ? 'Desativar serviço' : 'Ativar serviço'}
                      >
                        {service.isActive ? (
                          <>
                            <EyeOff className="w-3.5 h-3.5 text-yellow-400 group-hover:text-yellow-300 mb-0.5" />
                            <span className="text-[9px] text-yellow-400 group-hover:text-yellow-300 font-medium">Desativar</span>
                          </>
                        ) : (
                          <>
                            <Eye className="w-3.5 h-3.5 text-green-400 group-hover:text-green-300 mb-0.5" />
                            <span className="text-[9px] text-green-400 group-hover:text-green-300 font-medium">Ativar</span>
                          </>
                        )}
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDelete(service.id)
                        }}
                        className="flex flex-col items-center justify-center px-1.5 py-2 bg-red-500/10 border border-red-500/20 rounded-lg hover:bg-red-500/20 hover:border-red-500/30 transition-all group"
                        title="Excluir serviço"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-red-400 group-hover:text-red-300 mb-0.5" />
                        <span className="text-[9px] text-red-400 group-hover:text-red-300 font-medium">Excluir</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Resumo */}
      {services.length > 0 && (
        <div className="mt-6 md:mt-8 bg-gradient-to-br from-gray-800/50 to-black/50 border border-white/6 rounded-lg md:rounded-2xl p-4 md:p-6">
          <h3 className="text-base md:text-lg font-semibold text-white mb-3 md:mb-4">Resumo de Serviços</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 md:gap-4">
            <div className="bg-white/5 border border-white/10 rounded-lg p-3 md:p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs md:text-sm text-white/60">Total de Serviços</p>
                  <p className="text-xl md:text-2xl font-bold text-white">{services.length}</p>
                </div>
                <div className="w-8 h-8 md:w-10 md:h-10 bg-blue-400/20 rounded-lg flex items-center justify-center">
                  <Scissors className="w-4 h-4 md:w-5 md:h-5 text-blue-400" />
                </div>
              </div>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-lg p-3 md:p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs md:text-sm text-white/60">Serviços Ativos</p>
                  <p className="text-xl md:text-2xl font-bold text-white">
                    {services.filter(s => s.isActive).length}
                  </p>
                </div>
                <div className="w-8 h-8 md:w-10 md:h-10 bg-green-400/20 rounded-lg flex items-center justify-center">
                  <Eye className="w-4 h-4 md:w-5 md:h-5 text-green-400" />
                </div>
              </div>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-lg p-3 md:p-4">
              <div className="flex items-center justify-between">
                <div className="min-w-0">
                  <p className="text-xs md:text-sm text-white/60">Preço Médio</p>
                  <p className="text-lg md:text-xl font-bold text-white truncate">
                    {(() => {
                      if (services.length === 0) return formatCurrency(0)
                      const totalPrice = services.reduce((sum, s) => {
                        const price = typeof s.price === 'number' ? s.price : parseFloat(String(s.price))
                        return sum + (isNaN(price) ? 0 : price)
                      }, 0)
                      const averagePrice = totalPrice / services.length
                      return formatCurrency(averagePrice)
                    })()}
                  </p>
                </div>
                <div className="w-8 h-8 md:w-10 md:h-10 bg-yellow-400/20 rounded-lg flex items-center justify-center flex-shrink-0">
                  <DollarSign className="w-4 h-4 md:w-5 md:h-5 text-yellow-400" />
                </div>
              </div>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-lg p-3 md:p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs md:text-sm text-white/60">Total de Agendamentos</p>
                  <p className="text-xl md:text-2xl font-bold text-white">
                    {services.reduce((sum, s) => sum + (s._count?.appointments || 0), 0)}
                  </p>
                </div>
                <div className="w-8 h-8 md:w-10 md:h-10 bg-purple-400/20 rounded-lg flex items-center justify-center">
                  <Clock className="w-4 h-4 md:w-5 md:h-5 text-purple-400" />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
          </div>
        </div>
      </div>
    </div>
  )
}
