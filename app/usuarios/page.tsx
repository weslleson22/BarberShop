'use client'

import { useState, useEffect } from 'react'
import { User, Plus, Search, Edit, Trash2, Eye, EyeOff, Shield, Camera, Building2, Crown, X, Sparkles, Check, AlertCircle, RefreshCw } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { useRouter } from 'next/navigation'
import DropdownHeader from '@/components/shared/DropdownHeader'
import { maskPhone, maskName, maskEmail, getAuthHeaders } from '@/lib/utils'
import type { UserRole } from '@/lib/roles'

interface User {
  id: string
  name: string
  email: string
  phone?: string
  role: UserRole
  isActive: boolean
  createdAt: string
  barbershopId: string | null
  barbershop?: {
    id: string
    name: string
  } | null
  avatar?: string
  bio?: string | null
  specialties?: string[]
}

const DEFAULT_SPECIALTY_SUGGESTIONS = [
  'Corte Tradicional',
  'Degradê / Fade',
  'Barboterapia',
  'Barba Modelada',
  'Coloração / Luzes',
  'Penteado / Escova',
  'Sobrancelha',
  'Tratamento Capilar',
  'Pigmentação',
  'Selagem / Alisamento',
]

export default function UsuariosPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [users, setUsers] = useState<User[]>([])
  const [barbershops, setBarbershops] = useState<{ id: string; name: string }[]>([])
  const [availableServices, setAvailableServices] = useState<string[]>([])
  const [customSpecialtyInput, setCustomSpecialtyInput] = useState('')
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedShopFilter, setSelectedShopFilter] = useState<string>('all')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [mounted, setMounted] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    role: 'BARBER' as UserRole,
    barbershopId: '',
    password: '',
    isActive: true,
    avatar: '',
    bio: '',
    specialties: [] as string[],
  })
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState('')

  useEffect(() => {
    setMounted(true)
  }, [])

  // Verificar autenticação e permissão
  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        console.log('USUÁRIOS: Usuário não autenticado, redirecionando para login')
        router.push('/login')
        return
      }
      
      // Apenas ADMIN e DEVELOPER podem acessar página de usuários
      if (user.role !== 'ADMIN' && user.role !== 'DEVELOPER') {
        console.log('USUÁRIOS: Usuário sem permissão - Role:', user.role, '- Redirecionando')
        router.push(user.role === 'CLIENT' ? '/meus-agendamentos' : '/dashboard')
        return
      }
    }
  }, [user, authLoading, router])

  // Buscar usuários apenas quando a autenticação estiver concluída e usuário for válido
  useEffect(() => {
    if (mounted && !authLoading && user && (user.role === 'ADMIN' || user.role === 'DEVELOPER')) {
      fetchUsers()
    }
  }, [mounted, authLoading, user?.id, user?.role, selectedShopFilter])

  // Aguardar autenticação
  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-950 via-blue-950 to-black">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-yellow-400"></div>
      </div>
    )
  }

  const fetchUsers = async () => {
    try {
      setLoading(true)
      setErrorMessage(null)
      console.log('=== BUSCANDO USUÁRIOS DO PRISMA COM AUTH HEADERS ===')

      let url = '/api/users'
      if (user?.role === 'DEVELOPER' && selectedShopFilter && selectedShopFilter !== 'all') {
        url += `?barbershopId=${encodeURIComponent(selectedShopFilter)}`
      }
      
      const response = await fetch(url, {
        headers: getAuthHeaders(),
        credentials: 'include',
        cache: 'no-store',
      })
      
      if (response.ok) {
        const data = await response.json()
        console.log('Usuários recebidos do Prisma:', data)
        setUsers(Array.isArray(data) ? data : [])
      } else {
        const errData = await response.json().catch(() => ({}))
        const msg = errData?.error || `Erro ${response.status}: ${response.statusText}`
        console.error('Erro ao buscar usuários do Prisma:', response.status, msg)
        setErrorMessage(msg)
        setUsers([])
      }

      // Buscar serviços para sugestões de especialidades no cadastro de profissionais
      try {
        const srvRes = await fetch('/api/services', {
          headers: getAuthHeaders(),
          credentials: 'include',
          cache: 'no-store',
        })
        if (srvRes.ok) {
          const srvData = await srvRes.json()
          if (Array.isArray(srvData)) {
            setAvailableServices(srvData.map((s: any) => s.name).filter(Boolean))
          }
        }
      } catch (srvErr) {
        console.error('Erro ao buscar serviços para sugestões:', srvErr)
      }

      // Se for DEVELOPER, buscar lista de barbearias para filtro e vinculação
      if (user?.role === 'DEVELOPER') {
        try {
          const shopRes = await fetch('/api/developer/barbershops', {
            headers: getAuthHeaders(),
            credentials: 'include',
            cache: 'no-store',
          })
          if (shopRes.ok) {
            const shops = await shopRes.json()
            setBarbershops(Array.isArray(shops) ? shops : [])
          }
        } catch (err) {
          console.error('Erro ao buscar barbearias para seleção:', err)
        }
      }
    } catch (error: any) {
      console.error('Error ao buscar usuários do Prisma:', error)
      setErrorMessage(error?.message || 'Erro de conexão com o servidor')
      setUsers([])
    } finally {
      setLoading(false)
    }
  }

  const handleAddCustomSpecialty = () => {
    const trimmed = customSpecialtyInput.trim()
    if (!trimmed) return
    if (!formData.specialties.includes(trimmed)) {
      setFormData((prev) => ({
        ...prev,
        specialties: [...prev.specialties, trimmed],
      }))
    }
    setCustomSpecialtyInput('')
  }

  const allSuggestedSpecialties = Array.from(
    new Set([...DEFAULT_SPECIALTY_SUGGESTIONS, ...availableServices])
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.name || !formData.email || (!editingUser && !formData.password)) {
      alert('Nome, email e senha são obrigatórios')
      return
    }

    if (user?.role === 'DEVELOPER' && formData.role !== 'DEVELOPER' && !formData.barbershopId) {
      alert('Selecione a barbearia para este usuário')
      return
    }

    try {
      const operation = editingUser ? 'ATUALIZAR' : 'CRIAR'
      console.log(`=== ${operation} USUÁRIO NO PRISMA ===`)
      
      const method = editingUser ? 'PUT' : 'POST'
      const url = editingUser ? `/api/users/${editingUser.id}` : '/api/users'
      
      const payload: any = {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        role: formData.role,
        isActive: formData.isActive,
        avatar: avatarPreview || formData.avatar,
        bio: formData.bio || null,
        specialties: formData.specialties || [],
      }

      if (formData.password) {
        payload.password = formData.password
      }

      if (formData.role === 'DEVELOPER') {
        payload.barbershopId = null
      } else if (user?.role === 'DEVELOPER') {
        payload.barbershopId = formData.barbershopId || null
      }
      
      const response = await fetch(url, {
        method: method,
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        credentials: 'include',
        body: JSON.stringify(payload),
      })
      
      if (response.ok) {
        const result = await response.json()
        console.log(`Usuário ${operation.toLowerCase()} com sucesso:`, result)
        
        await fetchUsers()
        
        // Resetar formulário
        setFormData({
          name: '',
          email: '',
          phone: '',
          role: 'BARBER',
          barbershopId: '',
          password: '',
          isActive: true,
          avatar: '',
          bio: '',
          specialties: [],
        })
        setCustomSpecialtyInput('')
        setAvatarPreview('')
        setAvatarFile(null)
        setShowAddForm(false)
        setEditingUser(null)
        
        alert(`Usuário ${editingUser ? 'atualizado' : 'criado'} com sucesso!`)
      } else {
        const error = await response.json()
        console.error(`Erro ao ${operation.toLowerCase()} usuário:`, error)
        alert(error.error || `Erro ao ${operation.toLowerCase()} usuário`)
      }
    } catch (error) {
      console.error('Error na operação CRUD:', error)
      alert('Erro na operação com o servidor')
    }
  }

  const handleEdit = (u: User) => {
    console.log('=== EDITAR USUÁRIO DO PRISMA ===', u)
    
    setEditingUser(u)
    setFormData({
      name: u.name,
      email: u.email,
      phone: u.phone || '',
      role: u.role,
      barbershopId: u.barbershopId || '',
      password: '',
      isActive: u.isActive,
      avatar: u.avatar || '',
      bio: u.bio || '',
      specialties: u.specialties || [],
    })
    setCustomSpecialtyInput('')
    setAvatarPreview(u.avatar || '')
    setShowAddForm(true)
  }

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setAvatarFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string)
        setFormData({ ...formData, avatar: reader.result as string })
      }
      reader.readAsDataURL(file)
    }
  }

  const handleToggleActive = async (userId: string, currentStatus: boolean) => {
    try {
      const response = await fetch(`/api/users/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        credentials: 'include',
        body: JSON.stringify({ isActive: !currentStatus }),
      })
      
      if (response.ok) {
        await fetchUsers()
      } else {
        const error = await response.json()
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
      const response = await fetch(`/api/users/${userId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
        credentials: 'include',
      })
      
      if (response.ok) {
        await fetchUsers()
        alert('Usuário excluído com sucesso!')
      } else {
        const error = await response.json()
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
      case 'DEVELOPER':
        return 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
      case 'ADMIN':
        return 'bg-purple-100 text-purple-800'
      case 'BARBER':
        return 'bg-blue-100 text-blue-800'
      case 'RECEPTIONIST':
        return 'bg-yellow-100 text-yellow-800'
      case 'CLIENT':
        return 'bg-green-100 text-green-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getRoleText = (role: string) => {
    switch (role) {
      case 'DEVELOPER':
        return 'Desenvolvedor'
      case 'ADMIN':
        return 'Administrador'
      case 'BARBER':
        return 'Profissional / Barbeiro'
      case 'RECEPTIONIST':
        return 'Recepcionista'
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
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-blue-950 to-black pt-20">
      {/* Header Fixo no Topo */}
      <DropdownHeader />
      
      {/* Conteúdo Principal */}
      <div className="w-full px-4 md:px-6">
        {/* Conteúdo com scroll */}
        <div className="flex-1 min-w-0">
          <div className="container-responsive py-6 px-4 md:px-6">
      <div className="mb-6 md:mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-white">Usuários</h1>
            <p className="text-white/60 mt-1 md:mt-2 text-sm md:text-base">Gerencie os usuários com acesso à plataforma</p>
          </div>
          <button
            onClick={() => {
              setShowAddForm(true)
              setEditingUser(null)
              setFormData({ 
                name: '', 
                email: '', 
                phone: '', 
                role: user?.role === 'DEVELOPER' ? 'DEVELOPER' : 'BARBER', 
                barbershopId: '', 
                password: '', 
                isActive: true, 
                avatar: '',
                bio: '',
                specialties: [],
              })
              setCustomSpecialtyInput('')
              setAvatarPreview('')
              setAvatarFile(null)
            }}
            className="bg-gradient-to-r from-yellow-400 to-yellow-600 text-black px-4 md:px-6 py-2.5 md:py-3 rounded-lg md:rounded-xl hover:from-yellow-500 hover:to-yellow-700 transition-all flex items-center font-medium text-sm md:text-base"
          >
            <Plus className="w-4 h-4 md:w-5 md:h-5 mr-2" />
            Novo Usuário
          </button>
        </div>
      </div>

      {/* Barra de Filtros e Busca */}
      <div className="mb-4 md:mb-6 grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className={`relative ${user?.role === 'DEVELOPER' ? 'md:col-span-2' : 'md:col-span-3'}`}>
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/40 w-4 h-4 md:w-5 md:h-5" />
          <input
            type="text"
            placeholder="Buscar por nome, email ou telefone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 md:pl-10 pr-4 py-2.5 md:py-3 bg-white/5 border border-white/6 rounded-lg md:rounded-xl text-white placeholder-white/40 focus:ring-2 focus:ring-yellow-400/50 focus:border-yellow-400/50 transition-all text-sm md:text-base"
          />
        </div>

        {/* Filtro por Empresa/Estabelecimento para DEVELOPER */}
        {user?.role === 'DEVELOPER' && (
          <div className="relative">
            <select
              value={selectedShopFilter}
              onChange={(e) => setSelectedShopFilter(e.target.value)}
              className="w-full px-3 md:px-4 py-2.5 md:py-3 bg-gray-900 border border-white/10 rounded-lg md:rounded-xl text-white focus:ring-2 focus:ring-yellow-400/50 focus:border-yellow-400/50 transition-all text-sm md:text-base cursor-pointer"
            >
              <option value="all">🏢 Todas as Barbearias / Empresas</option>
              {barbershops.map((shop) => (
                <option key={shop.id} value={shop.id}>
                  {shop.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Alerta de Erro com Botão de Tentar Novamente */}
      {errorMessage && (
        <div className="mb-4 p-4 rounded-xl bg-red-900/30 border border-red-500/30 flex items-center justify-between gap-4 text-red-300 animate-in fade-in">
          <div className="flex items-center gap-2 text-sm">
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => fetchUsers()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-white text-xs font-semibold transition shrink-0 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Tentar novamente
          </button>
        </div>
      )}

      {/* Formulário de Adicionar/Editar */}
      {showAddForm && (
        <div className="mb-4 md:mb-6 bg-gradient-to-br from-gray-800/50 to-black/50 border border-white/6 rounded-lg md:rounded-xl p-4 md:p-6">
          <h3 className="text-lg md:text-xl font-semibold mb-3 md:mb-4 text-white">
            {editingUser ? 'Editar Usuário' : 'Novo Usuário'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-3 md:space-y-4">
            {/* Avatar Upload */}
            <div>
              <label className="block text-xs md:text-sm font-medium text-white/80 mb-1 md:mb-1.5">
                Foto de Perfil
              </label>
              <div className="flex items-center space-x-4">
                <div className="relative w-16 h-16 md:w-20 md:h-20 bg-gradient-to-br from-yellow-400/20 to-yellow-600/20 border border-yellow-400/30 rounded-full flex items-center justify-center overflow-hidden">
                  {avatarPreview ? (
                    <img 
                      src={avatarPreview} 
                      alt="Avatar preview"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-yellow-400 font-bold text-xl md:text-2xl">
                      {formData.name ? formData.name.charAt(0).toUpperCase() : 'U'}
                    </span>
                  )}
                  <label className="absolute bottom-0 right-0 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full p-1.5 cursor-pointer hover:from-yellow-500 hover:to-yellow-700 transition-all">
                    <Camera className="w-3 h-3 md:w-4 md:h-4 text-black" />
                    <input 
                      type="file" 
                      className="hidden" 
                      accept="image/*"
                      onChange={handleAvatarChange}
                    />
                  </label>
                </div>
                <div>
                  <p className="text-white/60 text-xs md:text-sm mb-1">Clique na câmera para alterar</p>
                  <p className="text-white/40 text-xs">PNG, JPG até 5MB</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
              <div>
                <label className="block text-xs md:text-sm font-medium text-white/80 mb-1 md:mb-1.5">
                  Nome *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: maskName(e.target.value) })}
                  maxLength={50}
                  className="w-full px-3 md:px-4 py-2 md:py-2.5 bg-white/5 border border-white/6 rounded-lg text-white placeholder-white/40 focus:ring-2 focus:ring-yellow-400/50 focus:border-yellow-400/50 transition-all text-sm md:text-base"
                  placeholder="Nome completo"
                  required
                />
              </div>
              <div>
                <label className="block text-xs md:text-sm font-medium text-white/80 mb-1 md:mb-1.5">
                  Email *
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: maskEmail(e.target.value) })}
                  maxLength={80}
                  className="w-full px-3 md:px-4 py-2 md:py-2.5 bg-white/5 border border-white/6 rounded-lg text-white placeholder-white/40 focus:ring-2 focus:ring-yellow-400/50 focus:border-yellow-400/50 transition-all text-sm md:text-base"
                  placeholder="email@exemplo.com"
                  required
                />
              </div>
              <div>
                <label className="block text-xs md:text-sm font-medium text-white/80 mb-1 md:mb-1.5">
                  Telefone
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: maskPhone(e.target.value) })}
                  maxLength={15}
                  className="w-full px-3 md:px-4 py-2 md:py-2.5 bg-white/5 border border-white/6 rounded-lg text-white placeholder-white/40 focus:ring-2 focus:ring-yellow-400/50 focus:border-yellow-400/50 transition-all text-sm md:text-base"
                  placeholder="(00) 00000-0000"
                />
              </div>
              <div>
                <label className="block text-xs md:text-sm font-medium text-white/80 mb-1 md:mb-1.5">
                  Função *
                </label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value as any })}
                  className="w-full px-3 md:px-4 py-2 md:py-2.5 bg-white/5 border border-white/6 rounded-lg text-white focus:ring-2 focus:ring-yellow-400/50 focus:border-yellow-400/50 transition-all text-sm md:text-base"
                  required
                >
                  <option value="" className="bg-gray-900">Selecione...</option>
                  {user?.role === 'DEVELOPER' && (
                    <option value="DEVELOPER" className="bg-gray-900 text-amber-400 font-medium">👑 Desenvolvedor (Plataforma)</option>
                  )}
                  <option value="ADMIN" className="bg-gray-900">Administrador</option>
                  <option value="BARBER" className="bg-gray-900">Profissional / Barbeiro</option>
                  <option value="RECEPTIONIST" className="bg-gray-900">Recepcionista</option>
                  <option value="CLIENT" className="bg-gray-900">Cliente</option>
                </select>
              </div>

              {/* Se o criador for Desenvolvedor e a função criada NÃO for DEVELOPER, selecionar a unidade/barbearia */}
              {user?.role === 'DEVELOPER' && formData.role !== 'DEVELOPER' && (
                <div className="md:col-span-2">
                  <label className="block text-xs md:text-sm font-medium text-white/80 mb-1 md:mb-1.5 flex items-center gap-1.5">
                    <Building2 className="w-4 h-4 text-yellow-400" />
                    Unidade / Barbearia vinculada *
                  </label>
                  <select
                    value={formData.barbershopId}
                    onChange={(e) => setFormData({ ...formData, barbershopId: e.target.value })}
                    className="w-full px-3 md:px-4 py-2 md:py-2.5 bg-white/5 border border-white/6 rounded-lg text-white focus:ring-2 focus:ring-yellow-400/50 focus:border-yellow-400/50 transition-all text-sm md:text-base"
                    required
                  >
                    <option value="" className="bg-gray-900">Selecione a barbearia do usuário...</option>
                    {barbershops.map((shop) => (
                      <option key={shop.id} value={shop.id} className="bg-gray-900">
                        {shop.name}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-white/40 mt-1">
                    Como desenvolvedor, você pode atribuir colaboradores para qualquer barbearia cadastrada.
                  </p>
                </div>
              )}

              <div>
                <label className="block text-xs md:text-sm font-medium text-white/80 mb-1 md:mb-1.5">
                  Senha
                </label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full px-3 md:px-4 py-2 md:py-2.5 bg-white/5 border border-white/6 rounded-lg text-white placeholder-white/40 focus:ring-2 focus:ring-yellow-400/50 focus:border-yellow-400/50 transition-all text-sm md:text-base"
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
                <label htmlFor="isActive" className="ml-2 block text-xs md:text-sm text-white/80">
                  Usuário ativo
                </label>
              </div>

              {/* Seção de Perfil do Profissional (Descrição e Serviços/Especialidades) */}
              {formData.role === 'BARBER' && (
                <div className="md:col-span-2 mt-2 pt-4 border-t border-white/10 space-y-4">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-yellow-400" />
                    <h4 className="text-sm font-semibold text-yellow-400 uppercase tracking-wider">
                      Perfil do Profissional (Visível no Agendamento)
                    </h4>
                  </div>

                  {/* Descrição / Bio */}
                  <div>
                    <label className="block text-xs md:text-sm font-medium text-white/80 mb-1.5">
                      Descrição / Apresentação Profissional
                    </label>
                    <textarea
                      rows={3}
                      value={formData.bio}
                      onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                      placeholder="Ex: Especialista em cortes modernos, visagismo masculino, barba modelada e barboterapia completa."
                      className="w-full px-3 md:px-4 py-2.5 bg-white/5 border border-white/6 rounded-lg text-white placeholder-white/40 focus:ring-2 focus:ring-yellow-400/50 focus:border-yellow-400/50 transition-all text-xs md:text-sm resize-none"
                    />
                    <p className="text-[11px] text-white/40 mt-1">
                      Esta descrição será exibida no card do profissional para os clientes durante o agendamento.
                    </p>
                  </div>

                  {/* Especialidades / Serviços */}
                  <div>
                    <label className="block text-xs md:text-sm font-medium text-white/80 mb-1.5">
                      Serviços & Especialidades que o Profissional Realiza
                    </label>

                    {/* Sugestões de Serviços para selecionar */}
                    <div className="mb-3">
                      <p className="text-xs text-white/60 mb-2">Clique para selecionar os serviços prestados:</p>
                      <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto pr-1">
                        {allSuggestedSpecialties.map((item) => {
                          const isSelected = formData.specialties.includes(item)
                          return (
                            <button
                              key={item}
                              type="button"
                              onClick={() => {
                                if (isSelected) {
                                  setFormData({
                                    ...formData,
                                    specialties: formData.specialties.filter((s) => s !== item),
                                  })
                                } else {
                                  setFormData({
                                    ...formData,
                                    specialties: [...formData.specialties, item],
                                  })
                                }
                              }}
                              className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-all cursor-pointer flex items-center gap-1.5 ${
                                isSelected
                                  ? 'bg-yellow-400/20 text-yellow-300 border-yellow-400/50 shadow-sm shadow-yellow-400/10'
                                  : 'bg-white/5 text-white/70 border-white/10 hover:bg-white/10 hover:text-white'
                              }`}
                            >
                              {isSelected && <Check className="w-3 h-3 text-yellow-400" />}
                              {item}
                            </button>
                          )
                        })}
                      </div>
                    </div>

                    {/* Campo para adicionar nova especialidade personalizada */}
                    <div className="bg-white/[0.02] border border-white/6 rounded-lg p-3">
                      <label className="block text-xs text-white/70 mb-1.5">
                        Não encontrou o serviço na lista? Adicione uma especialidade personalizada:
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={customSpecialtyInput}
                          onChange={(e) => setCustomSpecialtyInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault()
                              handleAddCustomSpecialty()
                            }
                          }}
                          placeholder="Ex: Barboterapia com Ozônio, Platinado, Barba Terapia..."
                          className="flex-1 px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-xs text-white placeholder-white/30 focus:ring-2 focus:ring-yellow-400/50 focus:border-yellow-400/50 transition-all"
                        />
                        <button
                          type="button"
                          onClick={handleAddCustomSpecialty}
                          className="px-3 py-1.5 bg-gradient-to-r from-yellow-400 to-yellow-600 text-black font-semibold rounded-lg text-xs hover:from-yellow-500 hover:to-yellow-700 transition-all cursor-pointer shrink-0 flex items-center gap-1"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          Adicionar
                        </button>
                      </div>
                    </div>

                    {/* Tags selecionadas ativas */}
                    {formData.specialties.length > 0 && (
                      <div className="mt-3">
                        <span className="text-xs text-white/60 block mb-1.5">
                          Especialidades vinculadas ({formData.specialties.length}):
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {formData.specialties.map((spec) => (
                            <span
                              key={spec}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-gradient-to-r from-yellow-400/15 to-yellow-600/15 text-yellow-300 border border-yellow-400/30 shadow-sm"
                            >
                              <span>{spec}</span>
                              <button
                                type="button"
                                onClick={() =>
                                  setFormData({
                                    ...formData,
                                    specialties: formData.specialties.filter((s) => s !== spec),
                                  })
                                }
                                className="hover:text-red-400 transition-colors p-0.5 rounded-full hover:bg-white/10"
                                title="Remover especialidade"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
            <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-3 mt-4 md:mt-6">
              <button
                type="button"
                onClick={() => {
                  setShowAddForm(false)
                  setEditingUser(null)
                  setFormData({
                    name: '',
                    email: '',
                    phone: '',
                    role: 'BARBER',
                    barbershopId: '',
                    password: '',
                    isActive: true,
                    avatar: '',
                    bio: '',
                    specialties: [],
                  })
                  setCustomSpecialtyInput('')
                  setAvatarPreview('')
                  setAvatarFile(null)
                }}
                className="px-4 py-2 md:px-4 md:py-2 bg-white/10 border border-white/20 rounded-lg text-white hover:bg-white/20 transition-all text-sm md:text-base"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-2 md:px-4 md:py-2 bg-gradient-to-r from-yellow-400 to-yellow-600 text-black font-semibold rounded-lg hover:from-yellow-500 hover:to-yellow-700 transition-all text-sm md:text-base"
              >
                {editingUser ? 'Atualizar' : 'Cadastrar'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Lista de Usuários */}
      <div className="bg-gradient-to-br from-gray-800/50 to-black/50 border border-white/6 rounded-lg md:rounded-xl overflow-hidden">
        {filteredUsers.length === 0 ? (
          <div className="text-center py-8 md:py-12">
            <User className="w-10 h-10 md:w-12 md:h-12 text-white/40 mx-auto mb-3 md:mb-4" />
            <p className="text-white/60 text-base md:text-lg">Nenhum usuário encontrado</p>
            <p className="text-white/40 text-xs md:text-sm mt-1 md:mt-2">
              {searchTerm ? 'Tente uma busca diferente' : 'Adicione seu primeiro usuário'}
            </p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="w-full">
              <thead className="bg-white/5 border-b border-white/6">
                <tr>
                  <th className="px-3 md:px-6 py-2 md:py-3 text-left text-xs font-medium text-white/60 uppercase tracking-wider">
                    Usuário
                  </th>
                  <th className="px-3 md:px-6 py-2 md:py-3 text-left text-xs font-medium text-white/60 uppercase tracking-wider hidden sm:table-cell">
                    Função
                  </th>
                  <th className="px-3 md:px-6 py-2 md:py-3 text-left text-xs font-medium text-white/60 uppercase tracking-wider hidden md:table-cell">
                    Telefone
                  </th>
                  <th className="px-3 md:px-6 py-2 md:py-3 text-left text-xs font-medium text-white/60 uppercase tracking-wider hidden sm:table-cell">
                    Status
                  </th>
                  <th className="px-3 md:px-6 py-2 md:py-3 text-left text-xs font-medium text-white/60 uppercase tracking-wider hidden md:table-cell">
                    Data de Cadastro
                  </th>
                  <th className="px-3 md:px-6 py-2 md:py-3 text-left text-xs font-medium text-white/60 uppercase tracking-wider">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/6">
                {filteredUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-white/5">
                    <td className="px-3 md:px-6 py-3 md:py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-8 h-8 md:w-10 md:h-10 bg-gradient-to-br from-yellow-400/20 to-yellow-600/20 border border-yellow-400/30 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden">
                          {u.avatar ? (
                            <img 
                              src={u.avatar} 
                              alt={u.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span className="text-yellow-400 font-bold text-xs md:text-sm">
                              {u.name.charAt(0).toUpperCase()}
                            </span>
                          )}
                        </div>
                        <div className="ml-2 md:ml-4 min-w-0">
                          <div className="text-xs md:text-sm font-medium text-white truncate flex items-center gap-1.5">
                            <span>{u.name}</span>
                            {u.role === 'DEVELOPER' ? (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                <Crown className="w-3 h-3 text-amber-400" /> Global
                              </span>
                            ) : u.barbershop?.name ? (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-white/10 text-white/70 border border-white/10">
                                <Building2 className="w-3 h-3 text-yellow-400" /> {u.barbershop.name}
                              </span>
                            ) : null}
                          </div>
                          <div className="text-xs md:text-sm text-white/60 truncate hidden sm:block">{u.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 md:px-6 py-3 md:py-4 whitespace-nowrap hidden sm:table-cell">
                      <div className="flex items-center">
                        <Shield className="w-3.5 h-3.5 md:w-4 md:h-4 text-white/40 mr-1.5 md:mr-2" />
                        <span className={`inline-flex items-center px-2 md:px-2.5 py-0.5 rounded-full text-xs font-medium ${getRoleColor(u.role)}`}>
                          {getRoleText(u.role)}
                        </span>
                      </div>
                    </td>
                    <td className="px-3 md:px-6 py-3 md:py-4 whitespace-nowrap hidden md:table-cell">
                      {u.phone ? (
                        <span className="text-xs md:text-sm text-white">{u.phone}</span>
                      ) : (
                        <span className="text-xs md:text-sm text-white/40">Não informado</span>
                      )}
                    </td>
                    <td className="px-3 md:px-6 py-3 md:py-4 whitespace-nowrap hidden sm:table-cell">
                      <span className={`inline-flex items-center px-1.5 md:px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        u.isActive 
                          ? 'bg-green-400/20 text-green-400 border border-green-400/30' 
                          : 'bg-red-400/20 text-red-400 border border-red-400/30'
                      }`}>
                        {u.isActive ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td className="px-3 md:px-6 py-3 md:py-4 whitespace-nowrap hidden md:table-cell">
                      <span className="text-xs md:text-sm text-white/60">
                        {new Date(u.createdAt).toLocaleDateString('pt-BR')}
                      </span>
                    </td>
                    <td className="px-3 md:px-6 py-3 md:py-4 whitespace-nowrap text-xs md:text-sm font-medium">
                      <div className="flex space-x-1.5 md:space-x-2">
                        <button
                          onClick={() => handleEdit(u)}
                          className="text-blue-400 hover:text-blue-300 p-1.5 md:p-2 rounded-lg hover:bg-blue-500/10 transition-all"
                          title="Editar"
                        >
                          <Edit className="w-3.5 h-3.5 md:w-4 md:h-4" />
                        </button>
                        <button
                          onClick={() => handleToggleActive(u.id, u.isActive)}
                          className={u.isActive ? 'text-yellow-400 hover:text-yellow-300 p-1.5 md:p-2 rounded-lg hover:bg-yellow-500/10 transition-all' : 'text-green-400 hover:text-green-300 p-1.5 md:p-2 rounded-lg hover:bg-green-500/10 transition-all'}
                          title={u.isActive ? 'Desativar' : 'Ativar'}
                        >
                          {u.isActive ? <EyeOff className="w-3.5 h-3.5 md:w-4 md:h-4" /> : <Eye className="w-3.5 h-3.5 md:w-4 md:h-4" />}
                        </button>
                        <button
                          onClick={() => handleDelete(u.id)}
                          className="text-red-400 hover:text-red-300 p-1.5 md:p-2 rounded-lg hover:bg-red-500/10 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                          title="Excluir"
                          disabled={
                            u.id === user?.id || 
                            (u.role === 'DEVELOPER' && filteredUsers.filter(item => item.role === 'DEVELOPER').length === 1) ||
                            (u.role === 'ADMIN' && filteredUsers.filter(item => item.role === 'ADMIN').length === 1)
                          }
                        >
                          <Trash2 className="w-3.5 h-3.5 md:w-4 md:h-4" />
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
        <div className="mt-6 md:mt-8 bg-gradient-to-br from-gray-800/50 to-black/50 border border-white/6 rounded-lg md:rounded-xl p-4 md:p-6">
          <h3 className="text-base md:text-lg font-semibold text-white mb-3 md:mb-4">Resumo de Usuários</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4">
            <div>
              <p className="text-xs md:text-sm text-white/60">Total de Usuários</p>
              <p className="text-xl md:text-2xl font-bold text-white">{users.length}</p>
            </div>
            {user?.role === 'DEVELOPER' && (
              <div>
                <p className="text-xs md:text-sm text-white/60">Desenvolvedores</p>
                <p className="text-xl md:text-2xl font-bold text-amber-400">
                  {users.filter(u => u.role === 'DEVELOPER').length}
                </p>
              </div>
            )}
            <div>
              <p className="text-xs md:text-sm text-white/60">Administradores</p>
              <p className="text-xl md:text-2xl font-bold text-purple-400">
                {users.filter(u => u.role === 'ADMIN').length}
              </p>
            </div>
            <div>
              <p className="text-xs md:text-sm text-white/60">Profissionais</p>
              <p className="text-xl md:text-2xl font-bold text-blue-400">
                {users.filter(u => u.role === 'BARBER').length}
              </p>
            </div>
            <div>
              <p className="text-xs md:text-sm text-white/60">Clientes</p>
              <p className="text-xl md:text-2xl font-bold text-green-400">
                {users.filter(u => u.role === 'CLIENT').length}
              </p>
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
