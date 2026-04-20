'use client'

import { useState, useEffect } from 'react'
import { User, Phone, Mail, Plus, Search, Edit, Trash2 } from 'lucide-react'

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

export default function ClientesPage() {
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingClient, setEditingClient] = useState<Client | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
  })

  useEffect(() => {
    fetchClients()
  }, [])

  const fetchClients = async () => {
    try {
      // Buscando todos os clientes do Prisma via API
      const response = await fetch('/api/clients/all')
      if (response.ok) {
        const data = await response.json()
        console.log('Clientes recebidos do Prisma:', data)
        setClients(data)
      } else {
        console.error('Erro ao buscar clientes:', response.statusText)
        // Se falhar, usar dados mockados como fallback
        const mockClients = [
          { id: '1', name: 'Cliente Demo', phone: '(11) 99999-8888', email: 'cliente@demo.com', createdAt: new Date().toISOString() },
        ]
        setClients(mockClients)
      }
    } catch (error) {
      console.error('Error fetching clients:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.name || !formData.phone) {
      alert('Nome e telefone são obrigatórios')
      return
    }

    try {
      console.log('Enviando dados para criar cliente:', formData)
      
      const response = await fetch('/api/clients/public', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })
      
      console.log('Resposta da API:', response.status, response.statusText)
      
      if (response.ok) {
        const savedClient = await response.json()
        console.log('Cliente salvo no Prisma:', savedClient)
        
        // Atualizar a lista de clientes
        await fetchClients()
        
        // Resetar formulário
        setFormData({ name: '', phone: '', email: '' })
        setShowAddForm(false)
        setEditingClient(null)
        
        alert('Cliente salvo com sucesso!')
      } else {
        const error = await response.json()
        alert(error.error || 'Erro ao salvar cliente')
      }
    } catch (error) {
      console.error('Error saving client:', error)
      alert('Erro ao salvar cliente')
    }
  }

  const handleEdit = (client: Client) => {
    setEditingClient(client)
    setFormData({
      name: client.name,
      phone: client.phone,
      email: client.email || '',
    })
    setShowAddForm(true)
  }

  const handleDelete = async (clientId: string) => {
    if (!confirm('Tem certeza que deseja excluir este cliente?')) {
      return
    }

    try {
      // Para deletar, precisamos verificar se o cliente não tem agendamentos
      // Por enquanto, vamos apenas mostrar uma mensagem
      alert('Função de exclusão em desenvolvimento. Clientes com agendamentos não podem ser excluídos.')
      
      // Em produção, implementar API de DELETE
      /*
      const response = await fetch(`/api/clients/${clientId}`, {
        method: 'DELETE',
      })
      
      if (response.ok) {
        fetchClients()
        alert('Cliente excluído com sucesso!')
      } else {
        const error = await response.json()
        alert(error.error || 'Erro ao excluir cliente')
      }
      */
    } catch (error) {
      console.error('Error deleting client:', error)
      alert('Erro ao excluir cliente')
    }
  }

  const filteredClients = clients.filter(client =>
    client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.phone.includes(searchTerm) ||
    (client.email && client.email.toLowerCase().includes(searchTerm.toLowerCase()))
  )

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
            <h1 className="text-3xl font-bold text-gray-900">Clientes</h1>
            <p className="text-gray-600 mt-2">Gerencie todos os clientes da barbearia</p>
          </div>
          <button
            onClick={() => {
              setShowAddForm(true)
              setEditingClient(null)
              setFormData({ name: '', phone: '', email: '' })
            }}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center"
          >
            <Plus className="w-5 h-5 mr-2" />
            Novo Cliente
          </button>
        </div>
      </div>

      {/* Busca */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Buscar por nome, telefone ou email..."
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
            {editingClient ? 'Editar Cliente' : 'Novo Cliente'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nome *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Nome completo"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Telefone *
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="(00) 00000-0000"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="email@exemplo.com"
                />
              </div>
            </div>
            <div className="flex space-x-3">
              <button
                type="submit"
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                {editingClient ? 'Atualizar' : 'Salvar'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowAddForm(false)
                  setEditingClient(null)
                  setFormData({ name: '', phone: '', email: '' })
                }}
                className="bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Lista de Clientes */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        {filteredClients.length === 0 ? (
          <div className="text-center py-12">
            <User className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">Nenhum cliente encontrado</p>
            <p className="text-gray-400 text-sm mt-2">
              {searchTerm ? 'Tente uma busca diferente' : 'Adicione seu primeiro cliente'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Cliente
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Telefone
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Agendamentos
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredClients.map((client) => (
                  <tr key={client.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <User className="w-5 h-5 text-blue-600" />
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{client.name}</div>
                          <div className="text-sm text-gray-500">
                            Cliente desde {new Date(client.createdAt).toLocaleDateString('pt-BR')}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center text-sm text-gray-900">
                        <Phone className="w-4 h-4 text-gray-400 mr-2" />
                        {client.phone}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {client.email ? (
                        <div className="flex items-center text-sm text-gray-900">
                          <Mail className="w-4 h-4 text-gray-400 mr-2" />
                          {client.email}
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400">Não informado</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {client._count?.appointments || 0} agendamentos
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleEdit(client)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(client.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Resumo */}
      {clients.length > 0 && (
        <div className="mt-8 bg-blue-50 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-4">Resumo de Clientes</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-blue-600">Total de Clientes</p>
              <p className="text-2xl font-bold text-blue-900">{clients.length}</p>
            </div>
            <div>
              <p className="text-sm text-blue-600">Total de Agendamentos</p>
              <p className="text-2xl font-bold text-blue-900">
                {clients.reduce((sum, client) => sum + (client._count?.appointments || 0), 0)}
              </p>
            </div>
            <div>
              <p className="text-sm text-blue-600">Média por Cliente</p>
              <p className="text-2xl font-bold text-blue-900">
                {clients.length > 0 
                  ? (clients.reduce((sum, client) => sum + (client._count?.appointments || 0), 0) / clients.length).toFixed(1)
                  : 0}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
