'use client'

import { useState, useEffect } from 'react'
import { User, Plus, Search, Edit, Trash2, Eye, EyeOff, Shield } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { useRouter } from 'next/navigation'

interface User {
  id: string
  name: string
  email: string
  phone?: string
  role: 'ADMIN' | 'BARBER' | 'CLIENT'
  isActive: boolean
  createdAt: string
  barbershopId: string
}

export default function UsuariosPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [mounted, setMounted] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    role: 'BARBER' as 'ADMIN' | 'BARBER' | 'CLIENT',
    password: '',
    isActive: true,
  })

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (mounted) {
      fetchUsers()
    }
  }, [mounted])

  // Verificar autenticação e permissão
  useEffect(() => {
    console.log('=== USUÁRIOS - VERIFICANDO AUTENTICAÇÃO ===')
    console.log('authLoading:', authLoading)
    console.log('user:', user)
    console.log('user.role:', user?.role)
    
    if (!authLoading) {
      if (!user) {
        console.log('USUÁRIOS: Usuário não autenticado, redirecionando para login')
        router.push('/login')
        return
      }
      
      // Apenas ADMIN pode acessar página de usuários
      if (user.role !== 'ADMIN') {
        console.log('USUÁRIOS: Usuário sem permissão - Role:', user.role, '- Redirecionando para dashboard')
        router.push('/dashboard')
        return
      }
      
      console.log('USUÁRIOS: Usuário com permissão - Role:', user.role, '- Continuando na página')
    }
  }, [user, authLoading, router])

  // Aguardar autenticação
  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  const fetchUsers = async () => {
    try {
      console.log('=== BUSCANDO USUÁRIOS DO PRISMA ===')
      
      // Buscando APENAS usuários reais do Prisma via API
      const response = await fetch('/api/users')
      
      if (response.ok) {
        const data = await response.json()
        console.log('Usuários recebidos do Prisma:', data)
        console.log('Total de usuários do Prisma:', data.length)
        
        // Apenas dados do Prisma - sem mockados
        setUsers(data)
        
        // Validando se temos dados reais
        if (data.length === 0) {
          console.log('NENHUM usuário encontrado no Prisma')
        } else {
          console.log('Usuários do Prisma carregados com sucesso!')
        }
      } else {
        console.error('Erro ao buscar usuários do Prisma:', response.status, response.statusText)
        setUsers([]) // Array vazio em caso de erro
      }
    } catch (error) {
      console.error('Error ao buscar usuários do Prisma:', error)
      setUsers([]) // Array vazio em caso de erro
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.name || !formData.email || (!editingUser && !formData.password)) {
      alert('Nome, email e senha são obrigatórios')
      return
    }

    try {
      const operation = editingUser ? 'ATUALIZAR' : 'CRIAR'
      console.log(`=== ${operation} USUÁRIO NO PRISMA ===`)
      console.log('Dados para enviar:', formData)
      
      const method = editingUser ? 'PUT' : 'POST'
      const url = editingUser ? `/api/users/${editingUser.id}` : '/api/users'
      
      console.log(`Método: ${method}`)
      console.log(`URL: ${url}`)
      
      const response = await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })
      
      console.log(`Status da resposta: ${response.status} ${response.statusText}`)
      
      if (response.ok) {
        const result = await response.json()
        console.log(`Usuário ${operation.toLowerCase()} com sucesso no Prisma:`, result)
        
        // Atualizar a lista de usuários do Prisma
        console.log('Atualizando lista de usuários do Prisma...')
        await fetchUsers()
        
        // Resetar formulário
        setFormData({ name: '', email: '', phone: '', role: 'BARBER', password: '', isActive: true })
        setShowAddForm(false)
        setEditingUser(null)
        
        alert(`Usuário ${editingUser ? 'atualizado' : 'criado'} com sucesso no Prisma!`)
      } else {
        const error = await response.json()
        console.error(`Erro ao ${operation.toLowerCase()} usuário:`, error)
        alert(error.error || `Erro ao ${operation.toLowerCase()} usuário`)
      }
    } catch (error) {
      console.error('Error na operação CRUD:', error)
      alert('Erro na operação com o Prisma')
    }
  }

  const handleEdit = (user: User) => {
    console.log('=== EDITAR USUÁRIO DO PRISMA ===')
    console.log('Usuário selecionado para edição:', user)
    
    setEditingUser(user)
    setFormData({
      name: user.name,
      email: user.email,
      phone: user.phone || '',
      role: user.role,
      password: '',
      isActive: user.isActive,
    })
    setShowAddForm(true)
  }

  const handleToggleActive = async (userId: string, currentStatus: boolean) => {
    try {
      console.log('=== ATIVAR/DESATIVAR USUÁRIO NO PRISMA ===')
      console.log('ID do usuário:', userId)
      console.log('Status atual:', currentStatus)
      console.log('Novo status:', !currentStatus)
      
      const response = await fetch(`/api/users/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !currentStatus }),
      })
      
      if (response.ok) {
        console.log('Usuário atualizado com sucesso no Prisma')
        await fetchUsers()
        alert(`Usuário ${!currentStatus ? 'ativado' : 'desativado'} com sucesso no Prisma!`)
      } else {
        const error = await response.json()
        console.error('Erro ao atualizar status:', error)
        alert(error.error || 'Erro ao atualizar usuário')
      }
    } catch (error) {
      console.error('Error toggling user:', error)
      alert('Erro ao atualizar usuário')
    }
  }

  const handleDelete = async (userId: string) => {
    if (!confirm('Tem certeza que deseja excluir este usuário? Esta ação não pode ser desfeita.')) {
      return
    }

    try {
      console.log('=== EXCLUIR USUÁRIO DO PRISMA ===')
      console.log('ID do usuário para excluir:', userId)
      
      const response = await fetch(`/api/users?id=${userId}`, {
        method: 'DELETE',
      })
      
      if (response.ok) {
        console.log('Usuário excluído com sucesso do Prisma')
        await fetchUsers()
        alert('Usuário excluído com sucesso do Prisma!')
      } else {
        const error = await response.json()
        console.error('Erro ao excluir usuário:', error)
        alert(error.error || 'Erro ao excluir usuário')
      }
    } catch (error) {
      console.error('Error deleting user:', error)
      alert('Erro ao excluir usuário')
    }
  }

  const filteredUsers = users.filter(user =>
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (user.phone && user.phone.includes(searchTerm))
  )

  console.log('Total de usuários:', users.length)
  console.log('Termo de busca:', searchTerm)
  console.log('Usuários filtrados:', filteredUsers.length)

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return 'bg-purple-100 text-purple-800'
      case 'BARBER':
        return 'bg-blue-100 text-blue-800'
      case 'CLIENT':
        return 'bg-green-100 text-green-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getRoleText = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return 'Administrador'
      case 'BARBER':
        return 'Barbeiro'
      case 'CLIENT':
        return 'Cliente'
      default:
        return role
    }
  }

  if (!mounted) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
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
            <h1 className="text-3xl font-bold text-gray-900">Usuários</h1>
            <p className="text-gray-600 mt-2">Gerencie os usuários com acesso à plataforma</p>
          </div>
          <button
            onClick={() => {
              setShowAddForm(true)
              setEditingUser(null)
              setFormData({ name: '', email: '', phone: '', role: 'BARBER', password: '', isActive: true })
            }}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center"
          >
            <Plus className="w-5 h-5 mr-2" />
            Novo Usuário
          </button>
        </div>
      </div>

      {/* Busca */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Buscar por nome, email ou telefone..."
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
            {editingUser ? 'Editar Usuário' : 'Novo Usuário'}
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
                  placeholder="Nome completo"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email *
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="email@exemplo.com"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Telefone
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="(00) 00000-0000"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Função *
                </label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value as 'ADMIN' | 'BARBER' | 'CLIENT' })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  <option value="ADMIN">Administrador</option>
                  <option value="BARBER">Barbeiro</option>
                  <option value="CLIENT">Cliente</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Senha {editingUser && '(deixe em branco para manter atual)'}
                </label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder={!editingUser ? 'Senha' : 'Nova senha (opcional)'}
                  required={!editingUser}
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
                Usuário ativo (pode acessar a plataforma)
              </label>
            </div>
            <div className="flex space-x-3">
              <button
                type="submit"
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                {editingUser ? 'Atualizar' : 'Salvar'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowAddForm(false)
                  setEditingUser(null)
                  setFormData({ name: '', email: '', phone: '', role: 'BARBER', password: '', isActive: true })
                }}
                className="bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Lista de Usuários */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        {filteredUsers.length === 0 ? (
          <div className="text-center py-12">
            <User className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">Nenhum usuário encontrado</p>
            <p className="text-gray-400 text-sm mt-2">
              {searchTerm ? 'Tente uma busca diferente' : 'Adicione seu primeiro usuário'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Usuário
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Função
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Telefone
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Data de Cadastro
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <User className="w-5 h-5 text-blue-600" />
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{user.name}</div>
                          <div className="text-sm text-gray-500">{user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <Shield className="w-4 h-4 text-gray-400 mr-2" />
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRoleColor(user.role)}`}>
                          {getRoleText(user.role)}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {user.phone ? (
                        <span className="text-sm text-gray-900">{user.phone}</span>
                      ) : (
                        <span className="text-sm text-gray-400">Não informado</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        user.isActive 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {user.isActive ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-500">
                        {new Date(user.createdAt).toLocaleDateString('pt-BR')}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleEdit(user)}
                          className="text-blue-600 hover:text-blue-900"
                          title="Editar"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleToggleActive(user.id, user.isActive)}
                          className={user.isActive ? 'text-yellow-600 hover:text-yellow-900' : 'text-green-600 hover:text-green-900'}
                          title={user.isActive ? 'Desativar' : 'Ativar'}
                        >
                          {user.isActive ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                        <button
                          onClick={() => handleDelete(user.id)}
                          className="text-red-600 hover:text-red-900"
                          title="Excluir"
                          disabled={user.role === 'ADMIN' && filteredUsers.filter(u => u.role === 'ADMIN').length === 1}
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
      {users.length > 0 && (
        <div className="mt-8 bg-blue-50 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-4">Resumo de Usuários</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-blue-600">Total de Usuários</p>
              <p className="text-2xl font-bold text-blue-900">{users.length}</p>
            </div>
            <div>
              <p className="text-sm text-blue-600">Administradores</p>
              <p className="text-2xl font-bold text-blue-900">
                {users.filter(u => u.role === 'ADMIN').length}
              </p>
            </div>
            <div>
              <p className="text-sm text-blue-600">Barbeiros</p>
              <p className="text-2xl font-bold text-blue-900">
                {users.filter(u => u.role === 'BARBER').length}
              </p>
            </div>
            <div>
              <p className="text-sm text-blue-600">Clientes</p>
              <p className="text-2xl font-bold text-blue-900">
                {users.filter(u => u.role === 'CLIENT').length}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
