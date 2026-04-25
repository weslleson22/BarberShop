'use client'

import { useState, useEffect } from 'react'
import { User, Plus, Search, Edit, Trash2, Eye, EyeOff, Shield } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { useRouter } from 'next/navigation'
import AppSidebar from '@/components/dashboard/AppSidebar'

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
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-950 via-blue-950 to-black">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-yellow-400"></div>
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
        <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">Usuários</h1>
            <p className="text-white/60 mt-2">Gerencie os usuários com acesso à plataforma</p>
          </div>
          <button
            onClick={() => {
              setShowAddForm(true)
              setEditingUser(null)
              setFormData({ name: '', email: '', phone: '', role: 'BARBER', password: '', isActive: true })
            }}
            className="bg-gradient-to-r from-yellow-400 to-yellow-600 text-black px-6 py-3 rounded-xl hover:from-yellow-500 hover:to-yellow-700 transition-all flex items-center font-medium"
          >
            <Plus className="w-5 h-5 mr-2" />
            Novo Usuário
          </button>
        </div>
      </div>

      {/* Busca */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/40 w-5 h-5" />
          <input
            type="text"
            placeholder="Buscar por nome, email ou telefone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/6 rounded-xl text-white placeholder-white/40 focus:ring-2 focus:ring-yellow-400/50 focus:border-yellow-400/50 transition-all"
          />
        </div>
      </div>

      {/* Formulário de Adicionar/Editar */}
      {showAddForm && (
        <div className="mb-6 bg-gradient-to-br from-gray-800/50 to-black/50 border border-white/6 rounded-xl p-4">
          <h3 className="text-lg font-semibold mb-4 text-white">
            {editingUser ? 'Editar Usuário' : 'Novo Usuário'}
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
                  className="w-full px-3 py-2 bg-white/5 border border-white/6 rounded-lg text-white placeholder-white/40 focus:ring-2 focus:ring-yellow-400/50 focus:border-yellow-400/50 transition-all"
                  placeholder="Nome completo"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-white/80 mb-1">
                  Email *
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 bg-white/5 border border-white/6 rounded-lg text-white placeholder-white/40 focus:ring-2 focus:ring-yellow-400/50 focus:border-yellow-400/50 transition-all"
                  placeholder="email@exemplo.com"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-white/80 mb-1">
                  Telefone
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-3 py-2 bg-white/5 border border-white/6 rounded-lg text-white placeholder-white/40 focus:ring-2 focus:ring-yellow-400/50 focus:border-yellow-400/50 transition-all"
                  placeholder="(00) 00000-0000"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-white/80 mb-1">
                  Função *
                </label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value as any })}
                  className="w-full px-3 py-2 bg-white/5 border border-white/6 rounded-lg text-white focus:ring-2 focus:ring-yellow-400/50 focus:border-yellow-400/50 transition-all"
                  required
                >
                  <option value="" className="bg-gray-900">Selecione...</option>
                  <option value="ADMIN" className="bg-gray-900">Administrador</option>
                  <option value="BARBER" className="bg-gray-900">Barbeiro</option>
                  <option value="CLIENT" className="bg-gray-900">Cliente</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-white/80 mb-1">
                  Senha
                </label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full px-3 py-2 bg-white/5 border border-white/6 rounded-lg text-white placeholder-white/40 focus:ring-2 focus:ring-yellow-400/50 focus:border-yellow-400/50 transition-all"
                  placeholder={editingUser ? "Deixe em branco para manter atual" : "Digite uma senha"}
                />
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="h-4 w-4 text-yellow-400 focus:ring-yellow-400/50 border-white/6 rounded bg-white/5"
                />
                <label htmlFor="isActive" className="ml-2 block text-sm text-white/80">
                  Usuário ativo
                </label>
              </div>
            </div>
            <div className="flex justify-end space-x-3 mt-6">
              <button
                type="button"
                onClick={() => {
                  setShowAddForm(false)
                  setEditingUser(null)
                  setFormData({ name: '', email: '', phone: '', role: 'BARBER', password: '', isActive: true })
                }}
                className="px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white hover:bg-white/20 transition-all"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-gradient-to-r from-yellow-400 to-yellow-600 text-black font-semibold rounded-lg hover:from-yellow-500 hover:to-yellow-700 transition-all"
              >
                {editingUser ? 'Atualizar' : 'Cadastrar'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Lista de Usuários */}
      <div className="bg-gradient-to-br from-gray-800/50 to-black/50 border border-white/6 rounded-xl overflow-hidden">
        {filteredUsers.length === 0 ? (
          <div className="text-center py-12">
            <User className="w-12 h-12 text-white/40 mx-auto mb-4" />
            <p className="text-white/60 text-lg">Nenhum usuário encontrado</p>
            <p className="text-white/40 text-sm mt-2">
              {searchTerm ? 'Tente uma busca diferente' : 'Adicione seu primeiro usuário'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-white/5 border-b border-white/6">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white/60 uppercase tracking-wider">
                    Usuário
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white/60 uppercase tracking-wider">
                    Função
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white/60 uppercase tracking-wider">
                    Telefone
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white/60 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white/60 uppercase tracking-wider">
                    Data de Cadastro
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white/60 uppercase tracking-wider">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/6">
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-white/5">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-gradient-to-br from-yellow-400/20 to-yellow-600/20 border border-yellow-400/30 rounded-full flex items-center justify-center">
                          <span className="text-yellow-400 font-bold text-sm">
                            {user.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-white">{user.name}</div>
                          <div className="text-sm text-white/60">{user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <Shield className="w-4 h-4 text-white/40 mr-2" />
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRoleColor(user.role)}`}>
                          {getRoleText(user.role)}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {user.phone ? (
                        <span className="text-sm text-white">{user.phone}</span>
                      ) : (
                        <span className="text-sm text-white/40">Não informado</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        user.isActive 
                          ? 'bg-green-400/20 text-green-400 border border-green-400/30' 
                          : 'bg-red-400/20 text-red-400 border border-red-400/30'
                      }`}>
                        {user.isActive ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-white/60">
                        {new Date(user.createdAt).toLocaleDateString('pt-BR')}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleEdit(user)}
                          className="text-yellow-400 hover:text-yellow-300"
                          title="Editar"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleToggleActive(user.id, user.isActive)}
                          className={user.isActive ? 'text-yellow-400 hover:text-yellow-300' : 'text-green-400 hover:text-green-300'}
                          title={user.isActive ? 'Desativar' : 'Ativar'}
                        >
                          {user.isActive ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                        <button
                          onClick={() => handleDelete(user.id)}
                          className="text-red-400 hover:text-red-300"
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
        <div className="mt-8 bg-gradient-to-br from-gray-800/50 to-black/50 border border-white/6 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Resumo de Usuários</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-white/60">Total de Usuários</p>
              <p className="text-2xl font-bold text-white">{users.length}</p>
            </div>
            <div>
              <p className="text-sm text-white/60">Administradores</p>
              <p className="text-2xl font-bold text-purple-400">
                {users.filter(u => u.role === 'ADMIN').length}
              </p>
            </div>
            <div>
              <p className="text-sm text-white/60">Barbeiros</p>
              <p className="text-2xl font-bold text-blue-400">
                {users.filter(u => u.role === 'BARBER').length}
              </p>
            </div>
            <div>
              <p className="text-sm text-white/60">Clientes</p>
              <p className="text-2xl font-bold text-green-400">
                {users.filter(u => u.role === 'CLIENT').length}
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
