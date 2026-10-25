'use client'

import { useState, useEffect } from 'react'
import { Scissors, Clock, DollarSign, Plus, Search, Edit, Trash2, Eye, EyeOff } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { useRouter } from 'next/navigation'
import DropdownHeader from '@/components/shared/DropdownHeader'

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

  const filteredServices = services
    .filter(service => canManageServices || service.isActive)
    .filter(service =>
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


  return (
    <div className="min-h-screen bg-background text-foreground pb-20 pt-20">
      {/* Header Fixo no Topo */}
      <DropdownHeader />
      
      {/* Conteúdo Principal Padrão */}
      <main className="w-full px-4 md:px-8 max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-6">
          <div>
            <div className="flex items-center gap-2 text-primary text-xs font-semibold uppercase tracking-wider mb-1">
              <Scissors className="w-4 h-4" />
              <span>Catálogo & Preços</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight">Serviços</h1>
            <p className="text-muted-foreground text-xs md:text-sm mt-1">Gerencie todos os serviços oferecidos pela barbearia</p>
          </div>
          {canManageServices && (
            <button
              onClick={() => {
                setShowAddForm(true)
                setEditingService(null)
                setFormData({ name: '', description: '', price: '', duration: '', isActive: true })
              }}
              className="bg-primary hover:bg-primary/90 text-primary-foreground px-4 md:px-5 py-2.5 rounded-lg transition-all flex items-center font-semibold text-xs md:text-sm shadow-sm cursor-pointer"
            >
              <Plus className="w-4 h-4 mr-1.5" />
              Novo Serviço
            </button>
          )}
        </div>

        {/* Busca */}
        <div>
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <input
              type="text"
              placeholder="Buscar por nome ou descrição..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-background border border-input rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring transition-all text-xs md:text-sm"
            />
          </div>
        </div>

        {/* Formulário de Adicionar/Editar */}
        {showAddForm && (
          <div className="bg-card border border-border rounded-xl p-4 md:p-6 shadow-sm">
            <h3 className="text-lg md:text-xl font-bold text-foreground mb-4">
              {editingService ? 'Editar Serviço' : 'Novo Serviço'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs md:text-sm font-medium text-foreground mb-1.5">
                    Nome *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3.5 py-2 bg-background border border-input rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring transition-all text-xs md:text-sm"
                    placeholder="Nome do serviço"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs md:text-sm font-medium text-foreground mb-1.5">
                    Descrição
                  </label>
                  <input
                    type="text"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-3.5 py-2 bg-background border border-input rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring transition-all text-xs md:text-sm"
                    placeholder="Descrição do serviço"
                  />
                </div>
                <div>
                  <label className="block text-xs md:text-sm font-medium text-foreground mb-1.5">
                    Preço (R$) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    className="w-full px-3.5 py-2 bg-background border border-input rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring transition-all text-xs md:text-sm"
                    placeholder="0.00"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs md:text-sm font-medium text-foreground mb-1.5">
                    Duração (minutos) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formData.duration}
                    onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                    className="w-full px-3.5 py-2 bg-background border border-input rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring transition-all text-xs md:text-sm"
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
                  className="w-4 h-4 rounded border-input text-primary focus:ring-ring accent-primary cursor-pointer"
                />
                <label htmlFor="isActive" className="ml-2 text-xs md:text-sm font-medium text-foreground cursor-pointer">
                  Serviço ativo (disponível para agendamento)
                </label>
              </div>
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddForm(false)
                    setEditingService(null)
                    setFormData({ name: '', description: '', price: '', duration: '', isActive: true })
                  }}
                  className="bg-card border border-border text-foreground px-4 py-2 rounded-lg hover:bg-muted transition-all font-medium text-xs md:text-sm cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-primary hover:bg-primary/90 text-primary-foreground px-5 py-2 rounded-lg transition-all font-semibold text-xs md:text-sm shadow-sm cursor-pointer"
                >
                  {editingService ? 'Atualizar' : 'Salvar'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Lista de Serviços em Cards */}
        {loading ? (
          <div className="flex items-center justify-center py-16 bg-card border border-border rounded-xl">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : filteredServices.length === 0 ? (
          <div className="bg-card border border-border rounded-xl text-center py-12 px-4">
            <Scissors className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-foreground font-semibold text-base">Nenhum serviço encontrado</p>
            <p className="text-muted-foreground text-xs md:text-sm mt-1">
              {searchTerm ? 'Tente uma busca diferente' : 'Adicione seu primeiro serviço'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredServices.map((service) => (
              <div 
                key={service.id} 
                className="bg-card border border-border rounded-xl p-4 hover:border-primary/40 hover:shadow-sm transition-all flex flex-col h-full"
              >
                {/* Header do Card - Nome e Ícone */}
                <div className="flex items-center space-x-2.5 mb-2">
                  <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0 text-primary">
                    <Scissors className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-foreground text-sm md:text-base leading-tight truncate" title={service.name}>
                      {service.name}
                    </h3>
                  </div>
                </div>

                {/* Status do serviço */}
                <div className="mb-2">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold border ${
                    service.isActive 
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' 
                      : 'bg-destructive/10 text-destructive border-destructive/20'
                  }`}>
                    {service.isActive ? 'Ativo' : 'Inativo'}
                  </span>
                </div>
                
                {/* Descrição */}
                <div className="h-10 mb-3">
                  {service.description ? (
                    <p className="text-muted-foreground text-xs leading-relaxed line-clamp-2 text-left" title={service.description}>
                      {service.description}
                    </p>
                  ) : (
                    <p className="text-muted-foreground/60 text-xs italic text-left">Sem descrição</p>
                  )}
                </div>

                {/* Informações principais - Duração e Preço */}
                <div className="grid grid-cols-2 gap-2 mb-3">
                  <div className="bg-muted/40 border border-border rounded-lg p-2.5 flex flex-col justify-center">
                    <div className="flex items-center space-x-1 mb-1">
                      <Clock className="w-3 h-3 text-blue-500 flex-shrink-0" />
                      <span className="text-muted-foreground text-[10px] font-semibold uppercase tracking-wider">Duração</span>
                    </div>
                    <p className="text-foreground font-bold text-sm text-right">
                      {service.duration}<span className="text-[10px] font-normal text-muted-foreground ml-1">min</span>
                    </p>
                  </div>
                  <div className="bg-muted/40 border border-border rounded-lg p-2.5 flex flex-col justify-center">
                    <div className="flex items-center space-x-1 mb-1">
                      <DollarSign className="w-3 h-3 text-emerald-500 dark:text-emerald-400 flex-shrink-0" />
                      <span className="text-muted-foreground text-[10px] font-semibold uppercase tracking-wider">Preço</span>
                    </div>
                    <p className="text-foreground font-bold text-sm text-right" title={formatCurrency(service.price)}>
                      {formatCurrency(service.price)}
                    </p>
                  </div>
                </div>

                {/* Botão principal */}
                {service.isActive ? (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      router.push('/agendar?service=' + service.id)
                    }}
                    className="w-full bg-primary hover:bg-primary/90 text-primary-foreground py-2 px-3 rounded-lg transition-all font-semibold text-xs md:text-sm mb-3 mt-auto cursor-pointer shadow-sm"
                  >
                    Agendar Agora
                  </button>
                ) : (
                  <div className="w-full py-2 text-center text-destructive bg-destructive/10 border border-destructive/20 rounded-lg text-xs font-semibold mb-3 mt-auto">
                    Serviço Desativado
                  </div>
                )}
                
                {/* Ações de gerenciamento - Apenas para administradores */}
                {canManageServices && (
                  <div className="pt-3 border-t border-border mt-auto">
                    <div className="grid grid-cols-3 gap-1.5">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleEdit(service)
                        }}
                        className="flex flex-col items-center justify-center px-1.5 py-1.5 bg-blue-500/10 border border-blue-500/20 rounded-lg hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 transition-all cursor-pointer"
                        title="Editar serviço"
                      >
                        <Edit className="w-3.5 h-3.5 mb-0.5" />
                        <span className="text-[10px] font-medium">Editar</span>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleToggleActive(service.id, service.isActive)
                        }}
                        className={`flex flex-col items-center justify-center px-1.5 py-1.5 border rounded-lg transition-all cursor-pointer ${
                          service.isActive 
                            ? 'bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20' 
                            : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20'
                        }`}
                        title={service.isActive ? 'Desativar serviço' : 'Ativar serviço'}
                      >
                        {service.isActive ? (
                          <>
                            <EyeOff className="w-3.5 h-3.5 mb-0.5" />
                            <span className="text-[10px] font-medium">Desativar</span>
                          </>
                        ) : (
                          <>
                            <Eye className="w-3.5 h-3.5 mb-0.5" />
                            <span className="text-[10px] font-medium">Ativar</span>
                          </>
                        )}
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDelete(service.id)
                        }}
                        className="flex flex-col items-center justify-center px-1.5 py-1.5 bg-destructive/10 border border-destructive/20 rounded-lg hover:bg-destructive/20 text-destructive transition-all cursor-pointer"
                        title="Excluir serviço"
                      >
                        <Trash2 className="w-3.5 h-3.5 mb-0.5" />
                        <span className="text-[10px] font-medium">Excluir</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Resumo */}
        {services.length > 0 && (
          <div className="pt-2">
            <h3 className="text-base md:text-lg font-bold text-foreground mb-3">Resumo de Serviços</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 md:gap-4">
              <div className="bg-card border border-border rounded-xl p-3 md:p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs md:text-sm font-medium text-muted-foreground">Total de Serviços</p>
                    <p className="text-xl md:text-2xl font-bold text-foreground mt-0.5">{services.length}</p>
                  </div>
                  <div className="w-8 h-8 md:w-9 md:h-9 bg-primary/10 rounded-lg flex items-center justify-center text-primary">
                    <Scissors className="w-4 h-4 md:w-4.5 md:h-4.5" />
                  </div>
                </div>
              </div>
              <div className="bg-card border border-border rounded-xl p-3 md:p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs md:text-sm font-medium text-muted-foreground">Serviços Ativos</p>
                    <p className="text-xl md:text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                      {services.filter(s => s.isActive).length}
                    </p>
                  </div>
                  <div className="w-8 h-8 md:w-9 md:h-9 bg-emerald-500/10 rounded-lg flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                    <Eye className="w-4 h-4 md:w-4.5 md:h-4.5" />
                  </div>
                </div>
              </div>
              <div className="bg-card border border-border rounded-xl p-3 md:p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="min-w-0">
                    <p className="text-xs md:text-sm font-medium text-muted-foreground">Preço Médio</p>
                    <p className="text-lg md:text-xl font-bold text-foreground mt-0.5 truncate">
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
                  <div className="w-8 h-8 md:w-9 md:h-9 bg-amber-500/10 rounded-lg flex items-center justify-center text-amber-600 dark:text-amber-400 flex-shrink-0">
                    <DollarSign className="w-4 h-4 md:w-4.5 md:h-4.5" />
                  </div>
                </div>
              </div>
              <div className="bg-card border border-border rounded-xl p-3 md:p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs md:text-sm font-medium text-muted-foreground">Agendamentos</p>
                    <p className="text-xl md:text-2xl font-bold text-foreground mt-0.5">
                      {services.reduce((sum, s) => sum + (s._count?.appointments || 0), 0)}
                    </p>
                  </div>
                  <div className="w-8 h-8 md:w-9 md:h-9 bg-blue-500/10 rounded-lg flex items-center justify-center text-blue-600 dark:text-blue-400">
                    <Clock className="w-4 h-4 md:w-4.5 md:h-4.5" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
