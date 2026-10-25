'use client'

import React, { useState, useEffect } from 'react'
import {
  User as UserIcon,
  Plus,
  Search,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  Shield,
  Camera,
  Building2,
  Crown,
  X,
  Check,
  AlertCircle,
  RefreshCw,
  Users,
  Briefcase,
  UserCheck,
} from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { useRouter } from 'next/navigation'
import DropdownHeader from '@/components/shared/DropdownHeader'
import { maskPhone, maskName, maskEmail, getAuthHeaders } from '@/lib/utils'
import type { UserRole } from '@/lib/roles'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

interface User {
  id: string
  name: string
  email: string
  phone?: string | null
  role: UserRole
  isActive: boolean
  createdAt: string
  barbershopId: string | null
  barbershop?: {
    id: string
    name: string
    slug?: string
  } | null
  avatar?: string | null
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
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<string>('all')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [togglingId, setTogglingId] = useState<string | null>(null)
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
  }, [mounted, authLoading, user?.id, user?.role, selectedShopFilter, selectedRoleFilter])

  const fetchUsers = async () => {
    try {
      setLoading(true)
      setErrorMessage(null)

      let url = '/api/users'
      const queryParams = new URLSearchParams()

      if (user?.role === 'DEVELOPER') {
        if (selectedShopFilter && selectedShopFilter !== 'all') {
          queryParams.set('barbershopId', selectedShopFilter)
        }
      }

      if (selectedRoleFilter && selectedRoleFilter !== 'all') {
        queryParams.set('role', selectedRoleFilter)
      }

      const qs = queryParams.toString()
      if (qs) {
        url += `?${qs}`
      }

      const response = await fetch(url, {
        headers: getAuthHeaders(),
        credentials: 'include',
        cache: 'no-store',
      })

      if (response.ok) {
        const data = await response.json()
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
      console.error('Erro ao buscar usuários do Prisma:', error)
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
      const method = editingUser ? 'PUT' : 'POST'
      const url = editingUser ? `/api/users/${editingUser.id}` : '/api/users'

      const payload: any = {
        name: formData.name,
        email: formData.email,
        phone: formData.phone || null,
        role: formData.role,
        isActive: formData.isActive,
        avatar: avatarPreview || formData.avatar || null,
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
        const error = await response.json().catch(() => ({}))
        alert(error.error || `Erro ao ${operation.toLowerCase()} usuário`)
      }
    } catch (error) {
      console.error('Erro na operação CRUD:', error)
      alert('Erro na operação com o servidor')
    }
  }

  const handleEdit = (u: User) => {
    setEditingUser(u)
    setFormData({
      name: u.name || '',
      email: u.email || '',
      phone: u.phone || '',
      role: u.role,
      barbershopId: u.barbershopId || '',
      password: '',
      isActive: Boolean(u.isActive),
      avatar: u.avatar || '',
      bio: u.bio || '',
      specialties: Array.isArray(u.specialties) ? u.specialties : [],
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
        setFormData((prev) => ({ ...prev, avatar: reader.result as string }))
      }
      reader.readAsDataURL(file)
    }
  }

  const handleToggleActive = async (userId: string, currentStatus: boolean) => {
    const nextStatus = !currentStatus
    setTogglingId(userId)

    // Atualização otimista imediata na interface
    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, isActive: nextStatus } : u))
    )

    try {
      const response = await fetch(`/api/users/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        credentials: 'include',
        body: JSON.stringify({ isActive: nextStatus }),
      })

      if (!response.ok) {
        // Reverter atualização otimista em caso de erro da API
        setUsers((prev) =>
          prev.map((u) => (u.id === userId ? { ...u, isActive: currentStatus } : u))
        )
        const error = await response.json().catch(() => ({}))
        alert(error.error || 'Erro ao atualizar disponibilidade')
      }
    } catch (error) {
      // Reverter atualização otimista em caso de erro de conexão
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, isActive: currentStatus } : u))
      )
      console.error('Error toggling user availability:', error)
      alert('Erro de conexão ao atualizar disponibilidade')
    } finally {
      setTogglingId(null)
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
        const error = await response.json().catch(() => ({}))
        alert(error.error || 'Erro ao excluir usuário')
      }
    } catch (error) {
      console.error('Error deleting user:', error)
      alert('Erro ao excluir usuário')
    }
  }

  // Filtragem ultra-defensiva contra valores nulos ou corrompidos
  const filteredUsers = users.filter((u) => {
    if (!u) return false
    const term = searchTerm.toLowerCase().trim()
    const name = (u.name || '').toLowerCase()
    const email = (u.email || '').toLowerCase()
    const phone = u.phone ? String(u.phone) : ''
    const shopName = (u.barbershop?.name || '').toLowerCase()

    const matchesSearch =
      !term ||
      name.includes(term) ||
      email.includes(term) ||
      phone.includes(term) ||
      shopName.includes(term)

    const matchesRole =
      selectedRoleFilter === 'all' || u.role === selectedRoleFilter

    return matchesSearch && matchesRole
  })

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'DEVELOPER':
        return (
          <Badge variant="outline" className="border-amber-500/30 text-amber-500 dark:text-amber-400 bg-amber-500/10 font-medium">
            <Crown className="w-3 h-3 mr-1" /> Desenvolvedor
          </Badge>
        )
      case 'ADMIN':
        return (
          <Badge variant="secondary" className="font-medium">
            <Shield className="w-3 h-3 mr-1" /> Administrador
          </Badge>
        )
      case 'BARBER':
        return (
          <Badge variant="outline" className="border-primary/30 text-primary bg-primary/10 font-medium">
            <Briefcase className="w-3 h-3 mr-1" /> Barbeiro / Equipe
          </Badge>
        )
      case 'RECEPTIONIST':
        return (
          <Badge variant="outline" className="font-medium">
            Recepcionista
          </Badge>
        )
      case 'CLIENT':
        return (
          <Badge variant="outline" className="border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 font-medium">
            <UserCheck className="w-3 h-3 mr-1" /> Cliente
          </Badge>
        )
      default:
        return <Badge variant="outline">{role}</Badge>
    }
  }

  if (authLoading || !mounted) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background text-foreground pb-20 pt-20">
      {/* Header Fixo no Topo */}
      <DropdownHeader />

      {/* Conteúdo Principal Padrão */}
      <main className="w-full px-4 md:px-8 max-w-7xl mx-auto space-y-6">
        {/* Top Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-6">
          <div>
            {user?.role === 'DEVELOPER' ? (
              <div className="flex items-center gap-2 mb-1.5">
                <Badge variant="outline" className="border-amber-500/30 text-amber-500 dark:text-amber-400 bg-amber-500/10 font-semibold tracking-wide text-xs">
                  <Crown className="w-3 h-3 mr-1" /> DEVELOPER ADMIN
                </Badge>
                <span className="text-muted-foreground text-xs">/</span>
                <span className="text-muted-foreground text-xs font-medium">Gestão Global de Acessos</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 mb-1.5">
                <Shield className="w-4 h-4 text-primary" />
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Gestão da Equipe</span>
              </div>
            )}
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
              {user?.role === 'DEVELOPER' ? 'Usuários da Plataforma' : 'Equipe & Usuários'}
            </h1>
            <p className="text-muted-foreground text-sm md:text-base mt-1">
              {user?.role === 'DEVELOPER'
                ? 'Gerencie desenvolvedores, administradores e profissionais de todas as unidades da plataforma.'
                : 'Gerencie os usuários e profissionais com acesso à sua barbearia.'}
            </p>
          </div>
          <div className="flex items-center gap-2.5">
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchUsers()}
              disabled={loading}
              title="Recarregar lista"
              className="h-10"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
            <Button
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
              size="default"
              className="gap-2"
            >
              <Plus className="w-4 h-4" />
              Novo Usuário
            </Button>
          </div>
        </div>

        {/* Barra de Filtros e Busca */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          {/* Busca por Texto */}
          <div className="relative sm:col-span-2">
            <Search className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              type="text"
              placeholder="Buscar por nome, email, telefone ou unidade..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 h-10"
            />
          </div>

          {/* Filtro por Barbearia/Unidade para DEVELOPER */}
          {user?.role === 'DEVELOPER' && (
            <div className="relative">
              <select
                value={selectedShopFilter}
                onChange={(e) => setSelectedShopFilter(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
              >
                <option value="all">🏢 Todas as Barbearias / Unidades</option>
                {barbershops.map((shop) => (
                  <option key={shop.id} value={shop.id}>
                    {shop.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Filtro por Função / Role */}
          <div className="relative">
            <select
              value={selectedRoleFilter}
              onChange={(e) => setSelectedRoleFilter(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
            >
              <option value="all">👥 Todas as Funções</option>
              {user?.role === 'DEVELOPER' && (
                <option value="DEVELOPER">👑 Desenvolvedores</option>
              )}
              <option value="ADMIN">Administradores</option>
              <option value="BARBER">Barbeiros / Equipe</option>
              <option value="RECEPTIONIST">Recepcionistas</option>
              <option value="CLIENT">Clientes</option>
            </select>
          </div>
        </div>

        {/* Alerta de Erro com Botão de Tentar Novamente */}
        {errorMessage && (
          <div className="p-4 rounded-lg bg-destructive/15 border border-destructive/30 flex items-center justify-between gap-4 text-destructive animate-in fade-in">
            <div className="flex items-center gap-2 text-sm">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span>{errorMessage}</span>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fetchUsers()}
              className="shrink-0 gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Tentar novamente
            </Button>
          </div>
        )}

        {/* Formulário de Adicionar/Editar Usuário */}
        {showAddForm && (
          <Card className="border-border shadow-sm animate-in fade-in">
            <CardHeader className="pb-4">
              <CardTitle className="text-xl">
                {editingUser ? 'Editar Usuário' : 'Novo Usuário'}
              </CardTitle>
              <CardDescription>
                {editingUser
                  ? 'Atualize os dados e privilégios de acesso do usuário selecionado.'
                  : 'Cadastre um novo membro de equipe, administrador ou usuário da plataforma.'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Avatar Upload */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Foto de Perfil
                  </label>
                  <div className="flex items-center space-x-4">
                    <div className="relative w-16 h-16 md:w-20 md:h-20 bg-muted border border-border rounded-full flex items-center justify-center overflow-hidden">
                      {avatarPreview ? (
                        <img
                          src={avatarPreview}
                          alt="Avatar preview"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-primary font-bold text-xl md:text-2xl">
                          {formData.name ? formData.name.charAt(0).toUpperCase() : 'U'}
                        </span>
                      )}
                      <label className="absolute bottom-0 right-0 bg-primary hover:bg-primary/90 text-primary-foreground rounded-full p-1.5 cursor-pointer transition-colors shadow-sm">
                        <Camera className="w-3.5 h-3.5" />
                        <input
                          type="file"
                          className="hidden"
                          accept="image/*"
                          onChange={handleAvatarChange}
                        />
                      </label>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs md:text-sm">Clique no ícone de câmera para selecionar</p>
                      <p className="text-muted-foreground/60 text-xs">PNG, JPG de até 3MB</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">
                      Nome Completo *
                    </label>
                    <Input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: maskName(e.target.value) })}
                      maxLength={50}
                      placeholder="Ex: Carlos Silva"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">
                      Email *
                    </label>
                    <Input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: maskEmail(e.target.value) })}
                      maxLength={80}
                      placeholder="carlos@exemplo.com"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">
                      Telefone
                    </label>
                    <Input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: maskPhone(e.target.value) })}
                      maxLength={15}
                      placeholder="(00) 00000-0000"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">
                      Função no Sistema *
                    </label>
                    <select
                      value={formData.role}
                      onChange={(e) => setFormData({ ...formData, role: e.target.value as any })}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                      required
                    >
                      {user?.role === 'DEVELOPER' && (
                        <option value="DEVELOPER">👑 Desenvolvedor (Plataforma Global)</option>
                      )}
                      <option value="ADMIN">Administrador da Unidade</option>
                      <option value="BARBER">Profissional / Barbeiro</option>
                      <option value="RECEPTIONIST">Recepcionista</option>
                      <option value="CLIENT">Cliente</option>
                    </select>
                  </div>

                  {/* Seleção de Barbearia para DEVELOPER quando a função não é global */}
                  {user?.role === 'DEVELOPER' && formData.role !== 'DEVELOPER' && (
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-foreground mb-1.5 flex items-center gap-1.5">
                        <Building2 className="w-4 h-4 text-primary" />
                        Unidade / Barbearia Vinculada *
                      </label>
                      <select
                        value={formData.barbershopId}
                        onChange={(e) => setFormData({ ...formData, barbershopId: e.target.value })}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                        required
                      >
                        <option value="">Selecione a barbearia do usuário...</option>
                        {barbershops.map((shop) => (
                          <option key={shop.id} value={shop.id}>
                            {shop.name}
                          </option>
                        ))}
                      </select>
                      <p className="text-xs text-muted-foreground mt-1">
                        Como Desenvolvedor, você pode atribuir administradores e profissionais a qualquer unidade da plataforma.
                      </p>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">
                      Senha {editingUser ? '(Opcional)' : '*'}
                    </label>
                    <Input
                      type="password"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      placeholder={editingUser ? 'Deixe em branco para manter a atual' : 'Defina uma senha segura'}
                      required={!editingUser}
                    />
                  </div>

                  <div className="flex items-center space-x-2 pt-6">
                    <input
                      type="checkbox"
                      id="isActive"
                      checked={formData.isActive}
                      onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                      className="h-4 w-4 rounded border-input text-primary focus:ring-primary cursor-pointer"
                    />
                    <label htmlFor="isActive" className="text-sm font-medium text-foreground cursor-pointer">
                      Usuário ativo com permissão de login
                    </label>
                  </div>

                  {/* Seção de Perfil do Profissional (Descrição e Serviços/Especialidades) */}
                  {formData.role === 'BARBER' && (
                    <div className="md:col-span-2 pt-4 border-t border-border space-y-4">
                      <div className="flex items-center gap-2">
                        <Briefcase className="w-4 h-4 text-primary" />
                        <h4 className="text-sm font-semibold text-foreground uppercase tracking-wider">
                          Perfil do Profissional (Exibido no Agendamento)
                        </h4>
                      </div>

                      {/* Descrição / Bio */}
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-1.5">
                          Apresentação Profissional / Bio
                        </label>
                        <textarea
                          rows={3}
                          value={formData.bio}
                          onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                          placeholder="Ex: Especialista em cortes modernos, visagismo masculino, barba modelada e barboterapia completa."
                          className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 resize-none"
                        />
                      </div>

                      {/* Especialidades / Serviços */}
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-1.5">
                          Especialidades e Serviços Realizados
                        </label>

                        {/* Sugestões de Serviços para selecionar */}
                        <div className="mb-3">
                          <p className="text-xs text-muted-foreground mb-2">Clique para selecionar os serviços prestados:</p>
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
                                  className={`px-2.5 py-1 rounded-md text-xs font-medium border transition-all cursor-pointer flex items-center gap-1.5 ${
                                    isSelected
                                      ? 'bg-primary text-primary-foreground border-primary'
                                      : 'bg-muted/50 text-foreground border-border hover:bg-muted'
                                  }`}
                                >
                                  {isSelected && <Check className="w-3 h-3" />}
                                  {item}
                                </button>
                              )
                            })}
                          </div>
                        </div>

                        {/* Campo para adicionar nova especialidade personalizada */}
                        <div className="border border-border rounded-lg p-3 bg-muted/20">
                          <label className="block text-xs text-muted-foreground mb-1.5">
                            Não encontrou na lista? Adicione uma especialidade personalizada:
                          </label>
                          <div className="flex gap-2">
                            <Input
                              type="text"
                              value={customSpecialtyInput}
                              onChange={(e) => setCustomSpecialtyInput(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault()
                                  handleAddCustomSpecialty()
                                }
                              }}
                              placeholder="Ex: Barboterapia com Ozônio, Platinado..."
                              className="h-9 text-xs"
                            />
                            <Button
                              type="button"
                              onClick={handleAddCustomSpecialty}
                              size="sm"
                              className="h-9 gap-1"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              Adicionar
                            </Button>
                          </div>
                        </div>

                        {/* Tags selecionadas ativas */}
                        {formData.specialties.length > 0 && (
                          <div className="mt-3">
                            <span className="text-xs text-muted-foreground block mb-1.5">
                              Especialidades vinculadas ({formData.specialties.length}):
                            </span>
                            <div className="flex flex-wrap gap-1.5">
                              {formData.specialties.map((spec) => (
                                <Badge
                                  key={spec}
                                  variant="secondary"
                                  className="gap-1.5 py-1 px-2.5 text-xs font-medium"
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
                                    className="hover:text-destructive transition-colors"
                                    title="Remover especialidade"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-2.5 pt-3 border-t border-border">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowAddForm(false)
                      setEditingUser(null)
                    }}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit">
                    {editingUser ? 'Salvar Alterações' : 'Cadastrar Usuário'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Tabela de Usuários */}
        <Card className="border-border shadow-sm overflow-hidden">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead>Usuário</TableHead>
                <TableHead className="hidden sm:table-cell">Função</TableHead>
                {user?.role === 'DEVELOPER' && (
                  <TableHead className="hidden md:table-cell">Unidade / Barbearia</TableHead>
                )}
                <TableHead className="hidden md:table-cell">Telefone</TableHead>
                <TableHead className="hidden sm:table-cell">Status</TableHead>
                <TableHead className="hidden lg:table-cell">Cadastro</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell
                    colSpan={user?.role === 'DEVELOPER' ? 7 : 6}
                    className="py-16 text-center"
                  >
                    <div className="flex flex-col items-center justify-center gap-3">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                      <span className="text-muted-foreground text-sm">Carregando usuários da plataforma...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : filteredUsers.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={user?.role === 'DEVELOPER' ? 7 : 6}
                    className="py-16 text-center"
                  >
                    <div className="flex flex-col items-center justify-center gap-2">
                      <UserIcon className="w-10 h-10 text-muted-foreground/40 mb-1" />
                      <p className="text-foreground font-medium">Nenhum usuário encontrado</p>
                      <p className="text-muted-foreground text-xs md:text-sm">
                        {searchTerm
                          ? 'Tente ajustar os filtros ou o termo de busca pesquisado.'
                          : 'Nenhum usuário cadastrado com os critérios selecionados.'}
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredUsers.map((u) => (
                  <TableRow key={u.id} className="hover:bg-muted/50 transition-colors">
                    {/* Usuário (Foto, Nome, Email) */}
                    <TableCell className="py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 overflow-hidden text-primary font-semibold text-xs">
                          {u.avatar ? (
                            <img
                              src={u.avatar}
                              alt={u.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span>{(u.name || 'U').charAt(0).toUpperCase()}</span>
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="font-medium text-sm text-foreground truncate flex items-center gap-1.5">
                            <span>{u.name || 'Sem Nome'}</span>
                            {u.role === 'DEVELOPER' && (
                              <Badge variant="outline" className="text-[10px] py-0 px-1.5 border-amber-500/30 text-amber-500 dark:text-amber-400 bg-amber-500/10">
                                Global
                              </Badge>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground truncate">{u.email || '-'}</div>
                          {user?.role === 'DEVELOPER' && (
                            <div className="text-[10px] text-muted-foreground font-mono mt-0.5">ID: {u.id}</div>
                          )}
                        </div>
                      </div>
                    </TableCell>

                    {/* Função */}
                    <TableCell className="hidden sm:table-cell py-3">
                      {getRoleBadge(u.role)}
                    </TableCell>

                    {/* Barbearia / Unidade (para DEVELOPER) */}
                    {user?.role === 'DEVELOPER' && (
                      <TableCell className="hidden md:table-cell py-3">
                        {u.role === 'DEVELOPER' ? (
                          <span className="text-xs text-muted-foreground italic">Todas as unidades</span>
                        ) : u.barbershop?.name ? (
                          <div className="flex items-center gap-1.5 text-xs font-medium text-foreground">
                            <Building2 className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                            <span className="truncate max-w-[180px]">{u.barbershop.name}</span>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground italic">Sem vínculo</span>
                        )}
                      </TableCell>
                    )}

                    {/* Telefone */}
                    <TableCell className="hidden md:table-cell py-3 text-xs text-muted-foreground">
                      {u.phone || '-'}
                    </TableCell>

                    {/* Status */}
                    <TableCell className="hidden sm:table-cell py-3">
                      <Badge
                        variant={u.isActive ? 'outline' : 'secondary'}
                        className={
                          u.isActive
                            ? 'border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10'
                            : 'opacity-70'
                        }
                      >
                        {u.isActive ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </TableCell>

                    {/* Data de Cadastro */}
                    <TableCell className="hidden lg:table-cell py-3 text-xs text-muted-foreground">
                      {u.createdAt ? new Date(u.createdAt).toLocaleDateString('pt-BR') : '-'}
                    </TableCell>

                    {/* Ações */}
                    <TableCell className="text-right py-3">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(u)}
                          title="Editar"
                          className="h-8 w-8 text-muted-foreground hover:text-foreground"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(u.id)}
                          title="Excluir"
                          disabled={
                            u.id === user?.id ||
                            (u.role === 'DEVELOPER' && filteredUsers.filter((item) => item.role === 'DEVELOPER').length === 1) ||
                            (u.role === 'ADMIN' && filteredUsers.filter((item) => item.role === 'ADMIN').length === 1)
                          }
                          className="h-8 w-8 text-muted-foreground hover:text-destructive disabled:opacity-30"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>

        {/* Resumo de Usuários no Padrão shadcn Metric Cards */}
        {users.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4">
            <Card className="border-border">
              <CardContent className="p-4">
                <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5 mb-1">
                  <Users className="w-3.5 h-3.5" /> Total Geral
                </p>
                <p className="text-2xl font-bold tracking-tight text-foreground">{users.length}</p>
              </CardContent>
            </Card>

            {user?.role === 'DEVELOPER' && (
              <Card className="border-border">
                <CardContent className="p-4">
                  <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5 mb-1">
                    <Crown className="w-3.5 h-3.5 text-amber-500" /> Desenvolvedores
                  </p>
                  <p className="text-2xl font-bold tracking-tight text-amber-500 dark:text-amber-400">
                    {users.filter((u) => u.role === 'DEVELOPER').length}
                  </p>
                </CardContent>
              </Card>
            )}

            <Card className="border-border">
              <CardContent className="p-4">
                <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5 mb-1">
                  <Shield className="w-3.5 h-3.5 text-primary" /> Administradores
                </p>
                <p className="text-2xl font-bold tracking-tight text-foreground">
                  {users.filter((u) => u.role === 'ADMIN').length}
                </p>
              </CardContent>
            </Card>

            <Card className="border-border">
              <CardContent className="p-4">
                <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5 mb-1">
                  <Briefcase className="w-3.5 h-3.5 text-primary" /> Barbeiros / Equipe
                </p>
                <div className="flex items-baseline gap-2">
                  <p className="text-2xl font-bold tracking-tight text-foreground">
                    {users.filter((u) => u.role === 'BARBER').length}
                  </p>
                  <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                    ({users.filter((u) => u.role === 'BARBER' && u.isActive).length} disponíveis)
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border">
              <CardContent className="p-4">
                <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5 mb-1">
                  <UserCheck className="w-3.5 h-3.5 text-emerald-500" /> Clientes
                </p>
                <p className="text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
                  {users.filter((u) => u.role === 'CLIENT').length}
                </p>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  )
}
