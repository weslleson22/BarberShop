'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth-context'
import { useRouter } from 'next/navigation'
import {
  User,
  Camera,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Shield,
  Settings,
  Save,
  Upload,
  Building2,
  ExternalLink,
  Copy,
  Check,
  Globe,
  Link2,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Sparkles,
  ImageIcon,
  Trash2,
} from 'lucide-react'
import DropdownHeader from '@/components/shared/DropdownHeader'

export default function ConfiguracoesPage() {
  const { user, updateUser } = useAuth()
  const router = useRouter()

  const [activeTab, setActiveTab] = useState<'profile' | 'barbershop'>('profile')
  const [isLoading, setIsLoading] = useState(false)
  const [isFetching, setIsFetching] = useState(true)

  // Dados do Perfil Pessoal
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    birthDate: '',
    bio: '',
  })
  const [originalData, setOriginalData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    birthDate: '',
    bio: '',
  })
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState('')
  const [originalAvatar, setOriginalAvatar] = useState('')

  // Dados da Barbearia & Slug & Logo
  const [isShopFetching, setIsShopFetching] = useState(false)
  const [isShopSaving, setIsShopSaving] = useState(false)
  const [shopFeedback, setShopFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [copiedType, setCopiedType] = useState<'main' | 'booking' | null>(null)
  const [origin, setOrigin] = useState('')
  const [logoPreview, setLogoPreview] = useState('')

  const [shopData, setShopData] = useState({
    id: '',
    name: '',
    slug: '',
    logo: '',
    email: '',
    phone: '',
    address: '',
    description: '',
  })
  const [originalShopData, setOriginalShopData] = useState({
    name: '',
    slug: '',
    logo: '',
    phone: '',
    address: '',
    description: '',
  })

  // Apenas usuários com papel ADMIN possuem permissão para visualizar e gerenciar as configurações da Barbearia e Link Público
  const canManageShop = user?.role === 'ADMIN'

  // Redireciona para perfil caso usuário sem permissão tente alternar para barbershop
  useEffect(() => {
    if (!canManageShop && activeTab === 'barbershop') {
      setActiveTab('profile')
    }
  }, [canManageShop, activeTab])

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setOrigin(window.location.origin)
    }
  }, [])

  useEffect(() => {
    // Carregar dados do perfil do usuário
    const fetchUserData = async () => {
      try {
        const response = await fetch('/api/users/profile')
        if (response.ok) {
          const userData = await response.json()
          const phoneFormatted = userData.phone || ''
          setFormData({
            name: userData.name || '',
            email: userData.email || '',
            phone: phoneFormatted,
            address: userData.address || '',
            birthDate: userData.birthDate || '',
            bio: userData.bio || '',
          })
          setOriginalData({
            name: userData.name || '',
            email: userData.email || '',
            phone: phoneFormatted,
            address: userData.address || '',
            birthDate: userData.birthDate || '',
            bio: userData.bio || '',
          })
          setAvatarPreview(userData.avatar || '')
          setOriginalAvatar(userData.avatar || '')
        }
      } catch (error) {
        console.error('Erro ao carregar dados do usuário:', error)
      } finally {
        setIsFetching(false)
      }
    }

    fetchUserData()
  }, [])

  // Carregar dados da Barbearia (se elegível)
  const fetchBarbershopData = async () => {
    setIsShopFetching(true)
    try {
      const response = await fetch('/api/barbershop')
      if (response.ok) {
        const data = await response.json()
        setShopData({
          id: data.id || '',
          name: data.name || '',
          slug: data.slug || '',
          logo: data.logo || '',
          email: data.email || '',
          phone: data.phone || '',
          address: data.address || '',
          description: data.description || '',
        })
        setOriginalShopData({
          name: data.name || '',
          slug: data.slug || '',
          logo: data.logo || '',
          phone: data.phone || '',
          address: data.address || '',
          description: data.description || '',
        })
        setLogoPreview(data.logo || '')
      }
    } catch (error) {
      console.error('Erro ao carregar dados da barbearia:', error)
    } finally {
      setIsShopFetching(false)
    }
  }

  // Upload e manipulação da logo da barbearia
  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('A imagem da logo deve ter no máximo 5MB.')
        return
      }
      const reader = new FileReader()
      reader.onloadend = () => {
        const base64 = reader.result as string
        setLogoPreview(base64)
        setShopData((prev) => ({ ...prev, logo: base64 }))
      }
      reader.readAsDataURL(file)
    }
  }

  const handleRemoveLogo = () => {
    setLogoPreview('')
    setShopData((prev) => ({ ...prev, logo: '' }))
  }

  useEffect(() => {
    if (canManageShop) {
      fetchBarbershopData()
    }
  }, [canManageShop])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    let formattedValue = value.replace(/\D/g, '')

    if (formattedValue.length > 11) {
      formattedValue = formattedValue.slice(0, 11)
    }

    if (formattedValue.length > 10) {
      formattedValue = `(${formattedValue.slice(0, 2)}) ${formattedValue.slice(2, 7)}-${formattedValue.slice(7, 11)}`
    } else if (formattedValue.length > 6) {
      formattedValue = `(${formattedValue.slice(0, 2)}) ${formattedValue.slice(2, 7)}`
    } else if (formattedValue.length > 2) {
      formattedValue = `(${formattedValue.slice(0, 2)}) ${formattedValue.slice(2)}`
    }

    setFormData((prev) => ({ ...prev, [name]: formattedValue }))
  }

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setAvatarFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const changedData: any = {}

      if (formData.name !== originalData.name) changedData.name = formData.name
      if (formData.email !== originalData.email) changedData.email = formData.email
      if (formData.phone !== originalData.phone) changedData.phone = formData.phone
      if (formData.address !== originalData.address) changedData.address = formData.address
      if (formData.birthDate !== originalData.birthDate) changedData.birthDate = formData.birthDate
      if (formData.bio !== originalData.bio) changedData.bio = formData.bio
      if (avatarPreview !== originalAvatar) changedData.avatar = avatarPreview

      if (Object.keys(changedData).length === 0) {
        alert('Nenhuma alteração detectada.')
        setIsLoading(false)
        return
      }

      const response = await fetch('/api/users/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(changedData),
      })

      if (response.ok) {
        const updatedUser = await response.json()
        updateUser(updatedUser)

        setOriginalData({
          name: updatedUser.name || '',
          email: updatedUser.email || '',
          phone: updatedUser.phone || '',
          address: updatedUser.address || '',
          birthDate: updatedUser.birthDate || '',
          bio: updatedUser.bio || '',
        })
        setOriginalAvatar(updatedUser.avatar || '')

        alert('Perfil atualizado com sucesso!')
      } else {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Erro ao atualizar perfil')
      }
    } catch (error) {
      console.error('Erro ao atualizar perfil:', error)
      alert('Erro ao atualizar perfil. Tente novamente.')
    } finally {
      setIsLoading(false)
    }
  }

  // Sanitizador de slug em tempo real
  const handleSlugChange = (raw: string) => {
    const formatted = raw
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-')

    setShopData((prev) => ({ ...prev, slug: formatted }))
  }

  // Copiar links com feedback visual
  const handleCopy = (text: string, type: 'main' | 'booking') => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text)
      setCopiedType(type)
      setTimeout(() => setCopiedType(null), 2500)
    }
  }

  // Salvar alterações da Barbearia & Slug
  const handleShopSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsShopSaving(true)
    setShopFeedback(null)

    try {
      const payload: any = {}

      if (shopData.name !== originalShopData.name) payload.name = shopData.name.trim()
      if (shopData.slug !== originalShopData.slug) payload.slug = shopData.slug.trim()
      if (shopData.phone !== originalShopData.phone) payload.phone = shopData.phone.trim()
      if (shopData.address !== originalShopData.address) payload.address = shopData.address.trim()
      if (shopData.description !== originalShopData.description)
        payload.description = shopData.description.trim()
      if (shopData.logo !== originalShopData.logo)
        payload.logo = shopData.logo ? shopData.logo.trim() : null

      if (Object.keys(payload).length === 0) {
        setShopFeedback({ type: 'success', text: 'Nenhuma alteração detectada.' })
        setIsShopSaving(false)
        return
      }

      const response = await fetch('/api/barbershop', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao atualizar dados da barbearia')
      }

      setShopData((prev) => ({
        ...prev,
        name: data.name || prev.name,
        slug: data.slug || prev.slug,
        logo: data.logo || '',
        phone: data.phone || '',
        address: data.address || '',
        description: data.description || '',
      }))

      setOriginalShopData({
        name: data.name || '',
        slug: data.slug || '',
        logo: data.logo || '',
        phone: data.phone || '',
        address: data.address || '',
        description: data.description || '',
      })
      setLogoPreview(data.logo || '')

      if (user && updateUser) {
        updateUser({
          barbershop: {
            ...(user.barbershop || { id: data.id, name: data.name }),
            id: data.id,
            name: data.name,
            slug: data.slug,
            logo: data.logo,
          },
        })
      }

      setShopFeedback({
        type: 'success',
        text: 'Informações da barbearia, logo e link público salvos com sucesso!',
      })
    } catch (err: any) {
      setShopFeedback({
        type: 'error',
        text: err.message || 'Erro ao salvar alterações da barbearia',
      })
    } finally {
      setIsShopSaving(false)
    }
  }

  const publicMainUrl = `${origin}/b/${shopData.slug || ''}`
  const publicBookingUrl = `${origin}/b/${shopData.slug || ''}/agendamento`

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-blue-950 to-black pt-20">
      {/* Header Fixo no Topo */}
      <DropdownHeader />

      {/* Conteúdo Principal */}
      <div className="w-full px-4 md:px-6">
        <div className="flex-1 min-w-0">
          <div className="p-4 md:p-6">
            <div className="max-w-4xl mx-auto">
              {/* Header */}
              <div className="mb-6">
                <h1 className="text-3xl font-bold text-white mb-2">Configurações</h1>
                <p className="text-white/60">
                  {canManageShop
                    ? 'Gerencie seu perfil, preferências e link público da sua barbearia'
                    : 'Gerencie seu perfil e preferências da sua conta'}
                </p>
              </div>

              {/* Abas de Navegação */}
              <div className="flex items-center gap-2 border-b border-white/10 mb-8 pb-3 overflow-x-auto">
                <button
                  type="button"
                  onClick={() => setActiveTab('profile')}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition cursor-pointer ${
                    activeTab === 'profile'
                      ? 'bg-gradient-to-r from-yellow-400 to-yellow-600 text-black shadow-lg shadow-yellow-500/20'
                      : 'text-white/70 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <User className="w-4 h-4" />
                  <span>Meu Perfil</span>
                </button>

                {canManageShop && (
                  <button
                    type="button"
                    onClick={() => setActiveTab('barbershop')}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition cursor-pointer ${
                      activeTab === 'barbershop'
                        ? 'bg-gradient-to-r from-yellow-400 to-yellow-600 text-black shadow-lg shadow-yellow-500/20'
                        : 'text-white/70 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <Building2 className="w-4 h-4" />
                    <span>Minha Barbearia & Link Público</span>
                    {shopData.slug && (
                      <span className="hidden md:inline-flex px-2 py-0.5 rounded text-[11px] font-mono bg-black/20 text-black font-bold">
                        /b/{shopData.slug}
                      </span>
                    )}
                  </button>
                )}
              </div>

              {/* Conteúdo da Aba: MEU PERFIL */}
              {activeTab === 'profile' && (
                <>
                  {isFetching ? (
                    <div className="flex items-center justify-center py-12">
                      <div className="text-white/60">Carregando dados...</div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                      {/* Avatar Section */}
                      <div className="lg:col-span-1">
                        <div className="bg-gradient-to-br from-gray-800/50 to-black/50 border border-white/10 rounded-xl p-6">
                          <h2 className="text-lg font-semibold text-white mb-4">Foto do Perfil</h2>

                          <div className="flex flex-col items-center">
                            <div className="relative mb-4">
                              <div className="w-24 h-24 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full flex items-center justify-center">
                                {avatarPreview ? (
                                  <img
                                    src={avatarPreview}
                                    alt="Avatar"
                                    className="w-24 h-24 rounded-full object-cover"
                                  />
                                ) : (
                                  <span className="text-black font-bold text-2xl">
                                    {formData.name?.charAt(0)?.toUpperCase() || 'U'}
                                  </span>
                                )}
                              </div>
                              <label className="absolute bottom-0 right-0 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full p-2 cursor-pointer hover:from-yellow-500 hover:to-yellow-700 transition-all">
                                <Camera className="w-4 h-4 text-black" />
                                <input
                                  type="file"
                                  className="hidden"
                                  accept="image/*"
                                  onChange={handleAvatarChange}
                                />
                              </label>
                            </div>

                            <label className="w-full py-2 bg-gradient-to-r from-yellow-400 to-yellow-600 text-black font-semibold rounded-lg hover:from-yellow-500 hover:to-yellow-700 transition-all flex items-center justify-center space-x-2 cursor-pointer">
                              <Upload className="w-4 h-4" />
                              <span>Alterar Foto</span>
                              <input
                                type="file"
                                className="hidden"
                                accept="image/*"
                                onChange={handleAvatarChange}
                              />
                            </label>
                          </div>
                        </div>

                        {/* Quick Actions */}
                        <div className="bg-gradient-to-br from-gray-800/50 to-black/50 border border-white/10 rounded-xl p-6 mt-6">
                          <h2 className="text-lg font-semibold text-white mb-4">Ações Rápidas</h2>
                          <div className="space-y-3">
                            <button
                              type="button"
                              onClick={() => alert('Para redefinir sua senha, solicite suporte ao administrador.')}
                              className="w-full py-2 bg-white/5 border border-white/10 rounded-lg text-white hover:bg-white/10 transition-all flex items-center justify-center space-x-2 cursor-pointer"
                            >
                              <Shield className="w-4 h-4" />
                              <span>Segurança & Senha</span>
                            </button>
                            {canManageShop && (
                              <button
                                type="button"
                                onClick={() => setActiveTab('barbershop')}
                                className="w-full py-2 bg-yellow-500/10 border border-yellow-500/30 rounded-lg text-yellow-400 hover:bg-yellow-500/20 transition-all flex items-center justify-center space-x-2 cursor-pointer"
                              >
                                <Globe className="w-4 h-4" />
                                <span>Ver Link Público da Barbearia</span>
                              </button>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Form Section */}
                      <div className="lg:col-span-2">
                        <div className="bg-gradient-to-br from-gray-800/50 to-black/50 border border-white/10 rounded-xl p-6">
                          <h2 className="text-lg font-semibold text-white mb-6">Informações Pessoais</h2>

                          <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              <div>
                                <label className="block text-sm font-medium text-white mb-2">
                                  <User className="w-4 h-4 inline mr-2 text-yellow-400" />
                                  Nome Completo
                                </label>
                                <input
                                  type="text"
                                  name="name"
                                  value={formData.name}
                                  onChange={handleInputChange}
                                  className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-yellow-400/50 focus:bg-white/10 transition-all"
                                  placeholder="Seu nome completo"
                                />
                              </div>

                              <div>
                                <label className="block text-sm font-medium text-white mb-2">
                                  <Mail className="w-4 h-4 inline mr-2 text-yellow-400" />
                                  E-mail
                                </label>
                                <input
                                  type="email"
                                  name="email"
                                  value={formData.email}
                                  onChange={handleInputChange}
                                  className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-yellow-400/50 focus:bg-white/10 transition-all"
                                  placeholder="email@exemplo.com"
                                />
                              </div>

                              <div>
                                <label className="block text-sm font-medium text-white mb-2">
                                  <Phone className="w-4 h-4 inline mr-2 text-yellow-400" />
                                  Telefone
                                </label>
                                <input
                                  type="tel"
                                  name="phone"
                                  value={formData.phone}
                                  onChange={handlePhoneChange}
                                  className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-yellow-400/50 focus:bg-white/10 transition-all"
                                  placeholder="(11) 99999-8888"
                                  maxLength={15}
                                />
                              </div>

                              <div>
                                <label className="block text-sm font-medium text-white mb-2">
                                  <Calendar className="w-4 h-4 inline mr-2 text-yellow-400" />
                                  Data de Nascimento
                                </label>
                                <input
                                  type="date"
                                  name="birthDate"
                                  value={formData.birthDate}
                                  onChange={handleInputChange}
                                  className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-yellow-400/50 focus:bg-white/10 transition-all"
                                />
                              </div>
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-white mb-2">
                                <MapPin className="w-4 h-4 inline mr-2 text-yellow-400" />
                                Endereço
                              </label>
                              <input
                                type="text"
                                name="address"
                                value={formData.address}
                                onChange={handleInputChange}
                                className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-yellow-400/50 focus:bg-white/10 transition-all"
                                placeholder="Seu endereço"
                              />
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-white mb-2">Bio</label>
                              <textarea
                                name="bio"
                                value={formData.bio}
                                onChange={handleInputChange}
                                rows={4}
                                className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-yellow-400/50 focus:bg-white/10 transition-all resize-none"
                                placeholder="Fale um pouco sobre você..."
                              />
                            </div>

                            <div className="flex justify-end space-x-4">
                              <button
                                type="button"
                                onClick={() => router.back()}
                                className="px-6 py-2 bg-white/5 border border-white/10 rounded-lg text-white hover:bg-white/10 transition-all cursor-pointer"
                              >
                                Cancelar
                              </button>
                              <button
                                type="submit"
                                disabled={isLoading}
                                className="px-6 py-2 bg-gradient-to-r from-yellow-400 to-yellow-600 text-black font-semibold rounded-lg hover:from-yellow-500 hover:to-yellow-700 transition-all flex items-center space-x-2 disabled:opacity-50 cursor-pointer shadow-lg shadow-yellow-500/20"
                              >
                                <Save className="w-4 h-4" />
                                <span>{isLoading ? 'Salvando...' : 'Salvar Alterações'}</span>
                              </button>
                            </div>
                          </form>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Conteúdo da Aba: MINHA BARBEARIA & LINK PÚBLICO (SLUG) */}
              {activeTab === 'barbershop' && canManageShop && (
                <div className="space-y-6">
                  {isShopFetching ? (
                    <div className="flex items-center justify-center py-16 text-white/60">
                      <RefreshCw className="w-6 h-6 animate-spin text-yellow-400 mr-2" />
                      Carregando dados da barbearia...
                    </div>
                  ) : (
                    <>
                      {/* Banner do Link Público */}
                      <div className="relative overflow-hidden rounded-2xl border border-yellow-500/30 bg-gradient-to-br from-yellow-950/30 via-gray-900 to-black p-6 sm:p-8 shadow-2xl">
                        <div className="absolute top-0 right-0 w-80 h-80 bg-yellow-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />

                        <div className="relative z-10">
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-5">
                            <div className="flex items-center gap-3">
                              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-yellow-400 to-yellow-600 flex items-center justify-center text-black shadow-lg shadow-yellow-500/20">
                                <Globe className="w-6 h-6" />
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <h2 className="text-xl font-bold text-white">Link Público Exclusivo</h2>
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-yellow-400/20 text-yellow-300 border border-yellow-400/30 flex items-center gap-1">
                                    <Sparkles className="w-3 h-3 text-yellow-400" />
                                    Multi-tenant Ativo
                                  </span>
                                </div>
                                <p className="text-xs text-white/60 mt-0.5">
                                  Compartilhe seu link exclusivo com seus clientes no Instagram, WhatsApp e redes sociais.
                                </p>
                              </div>
                            </div>

                            {/* Badge do Slug Atual */}
                            {shopData.slug && (
                              <div className="self-start sm:self-auto px-3 py-1.5 rounded-lg bg-black/60 border border-yellow-500/30 font-mono text-xs text-yellow-400 flex items-center gap-2">
                                <Link2 className="w-3.5 h-3.5 text-yellow-400" />
                                <span>/b/{shopData.slug}</span>
                              </div>
                            )}
                          </div>

                          {/* Caixa do Link Principal */}
                          <div className="bg-black/60 border border-white/10 rounded-xl p-4 mb-4 backdrop-blur-sm">
                            <div className="text-xs text-white/50 mb-1.5 font-medium flex items-center justify-between">
                              <span>Página da Barbearia (Catálogo & Informações):</span>
                              <span className="text-[11px] text-yellow-400/80">Recomendado para Bio do Instagram</span>
                            </div>
                            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                              <div className="flex-1 px-3.5 py-2.5 bg-white/5 border border-white/10 rounded-lg font-mono text-xs sm:text-sm text-yellow-300 truncate">
                                {publicMainUrl}
                              </div>
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleCopy(publicMainUrl, 'main')}
                                  className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2.5 bg-yellow-500 hover:bg-yellow-400 text-black font-semibold rounded-lg text-xs transition cursor-pointer shadow-md shadow-yellow-500/20"
                                >
                                  {copiedType === 'main' ? (
                                    <>
                                      <Check className="w-3.5 h-3.5 text-black stroke-[3]" />
                                      <span>Copiado!</span>
                                    </>
                                  ) : (
                                    <>
                                      <Copy className="w-3.5 h-3.5" />
                                      <span>Copiar</span>
                                    </>
                                  )}
                                </button>
                                <a
                                  href={`/b/${shopData.slug}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center justify-center gap-1.5 px-3.5 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-medium transition cursor-pointer"
                                  title="Abrir em nova aba"
                                >
                                  <ExternalLink className="w-3.5 h-3.5" />
                                  <span className="hidden sm:inline">Visualizar</span>
                                </a>
                              </div>
                            </div>
                          </div>

                          {/* Caixa do Link de Agendamento Direto */}
                          <div className="bg-black/60 border border-white/10 rounded-xl p-4 backdrop-blur-sm">
                            <div className="text-xs text-white/50 mb-1.5 font-medium flex items-center justify-between">
                              <span>Link Direto de Agendamento:</span>
                              <span className="text-[11px] text-blue-400/80">Ideal para enviar no WhatsApp</span>
                            </div>
                            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                              <div className="flex-1 px-3.5 py-2.5 bg-white/5 border border-white/10 rounded-lg font-mono text-xs sm:text-sm text-blue-300 truncate">
                                {publicBookingUrl}
                              </div>
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleCopy(publicBookingUrl, 'booking')}
                                  className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white font-medium rounded-lg text-xs transition cursor-pointer border border-white/10"
                                >
                                  {copiedType === 'booking' ? (
                                    <>
                                      <Check className="w-3.5 h-3.5 text-emerald-400 stroke-[3]" />
                                      <span className="text-emerald-400">Copiado!</span>
                                    </>
                                  ) : (
                                    <>
                                      <Copy className="w-3.5 h-3.5 text-gray-300" />
                                      <span>Copiar</span>
                                    </>
                                  )}
                                </button>
                                <a
                                  href={`/b/${shopData.slug}/agendamento`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center justify-center gap-1.5 px-3.5 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-medium transition cursor-pointer"
                                  title="Testar fluxo de agendamento em nova aba"
                                >
                                  <ExternalLink className="w-3.5 h-3.5" />
                                  <span className="hidden sm:inline">Testar Agendamento</span>
                                </a>
                              </div>
                            </div>
                          </div>

                          <div className="mt-4 flex items-start gap-2 text-xs text-white/60 bg-white/5 border border-white/10 rounded-lg p-3">
                            <Shield className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                            <span>
                              <strong>Isolamento Multi-tenant Garantido:</strong> Qualquer agendamento realizado através
                              destes links é gravado exclusivamente na sua barbearia. Seus clientes nunca veem dados ou
                              serviços de outros estabelecimentos.
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Seção: Logo da Barbearia & Identidade Visual */}
                      <div className="bg-gradient-to-br from-gray-800/50 to-black/50 border border-white/10 rounded-xl p-6 sm:p-8">
                        <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-6">
                          <div>
                            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                              <ImageIcon className="w-5 h-5 text-yellow-400" />
                              Logo da Barbearia & Identidade Visual
                            </h3>
                            <p className="text-xs text-white/60 mt-0.5">
                              Esta logo é exibida na sua página pública de clientes (/b/{shopData.slug || 'sua-barbearia'}), na barra lateral do painel e no onboarding.
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-col sm:flex-row items-center gap-6">
                          <div className="relative group">
                            <div className="w-28 h-28 rounded-2xl bg-black/60 border-2 border-dashed border-yellow-500/40 flex items-center justify-center overflow-hidden shadow-xl shadow-black/60 group-hover:border-yellow-400 transition-all">
                              {logoPreview ? (
                                <img
                                  src={logoPreview}
                                  alt="Logo da Barbearia"
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="flex flex-col items-center justify-center text-white/40 gap-1.5 p-2 text-center">
                                  <Building2 className="w-8 h-8 text-yellow-400/60" />
                                  <span className="text-[10px] font-medium text-white/50">Sem logo cadastrada</span>
                                </div>
                              )}
                            </div>

                            <label className="absolute bottom-1 right-1 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-xl p-2 cursor-pointer hover:from-yellow-500 hover:to-yellow-700 transition-all shadow-md shadow-black/50 text-black">
                              <Camera className="w-4 h-4" />
                              <input
                                type="file"
                                className="hidden"
                                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                                onChange={handleLogoChange}
                              />
                            </label>
                          </div>

                          <div className="flex-1 text-center sm:text-left space-y-3">
                            <div className="space-y-1">
                              <h4 className="text-sm font-semibold text-white">Upload da Marca</h4>
                              <p className="text-xs text-white/60">
                                Formatos aceitos: PNG, JPG, WebP ou SVG (máx. 5MB). Recomendamos imagens quadradas com fundo transparente ou escuro.
                              </p>
                            </div>

                            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5">
                              <label className="px-4 py-2 bg-yellow-500 hover:bg-yellow-400 text-black font-semibold rounded-lg text-xs transition cursor-pointer flex items-center gap-2 shadow-md shadow-yellow-500/20">
                                <Upload className="w-3.5 h-3.5" />
                                <span>{logoPreview ? 'Alterar Logo' : 'Enviar Nova Logo'}</span>
                                <input
                                  type="file"
                                  className="hidden"
                                  accept="image/png,image/jpeg,image/webp,image/svg+xml"
                                  onChange={handleLogoChange}
                                />
                              </label>

                              {logoPreview && (
                                <button
                                  type="button"
                                  onClick={handleRemoveLogo}
                                  className="px-3.5 py-2 bg-white/5 hover:bg-red-500/20 text-white/70 hover:text-red-300 border border-white/10 hover:border-red-500/30 font-medium rounded-lg text-xs transition cursor-pointer flex items-center gap-1.5"
                                >
                                  <Trash2 className="w-3.5 h-3.5 text-red-400" />
                                  <span>Remover Logo</span>
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Formulário de Configuração do Estabelecimento & Slug */}
                      <div className="bg-gradient-to-br from-gray-800/50 to-black/50 border border-white/10 rounded-xl p-6 sm:p-8">
                        <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-6">
                          <div>
                            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                              <Building2 className="w-5 h-5 text-yellow-400" />
                              Dados da Barbearia & Personalização do Slug
                            </h3>
                            <p className="text-xs text-white/60 mt-0.5">
                              Personalize o nome, contato e o identificador (slug) da sua barbearia na URL.
                            </p>
                          </div>
                        </div>

                        {/* Mensagem de Feedback */}
                        {shopFeedback && (
                          <div
                            className={`p-4 rounded-xl text-xs sm:text-sm mb-6 flex items-start gap-3 border ${
                              shopFeedback.type === 'success'
                                ? 'bg-emerald-950/40 text-emerald-300 border-emerald-800/60'
                                : 'bg-red-950/40 text-red-300 border-red-800/60'
                            }`}
                          >
                            {shopFeedback.type === 'success' ? (
                              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                            ) : (
                              <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                            )}
                            <div>
                              <p className="font-semibold">
                                {shopFeedback.type === 'success' ? 'Sucesso' : 'Atenção'}
                              </p>
                              <p className="mt-0.5">{shopFeedback.text}</p>
                            </div>
                          </div>
                        )}

                        <form onSubmit={handleShopSubmit} className="space-y-6">
                          {/* Campo do Slug */}
                          <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-xl p-4 sm:p-5">
                            <label className="block text-sm font-semibold text-yellow-300 mb-1 flex items-center gap-2">
                              <Link2 className="w-4 h-4 text-yellow-400" />
                              Slug da Barbearia (Identificador da URL) *
                            </label>
                            <p className="text-xs text-white/60 mb-3">
                              Este é o texto final do endereço público da sua barbearia. Deve conter apenas letras minúsculas,
                              números e hífens.
                            </p>

                            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                              <div className="flex items-center px-3 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white/50 text-xs sm:text-sm font-mono select-none">
                                {origin}/b/
                              </div>
                              <input
                                type="text"
                                required
                                minLength={2}
                                maxLength={50}
                                value={shopData.slug}
                                onChange={(e) => handleSlugChange(e.target.value)}
                                placeholder="ex: barbearia-central"
                                className="flex-1 px-4 py-2.5 bg-white/5 border border-yellow-500/40 rounded-lg text-yellow-400 placeholder-white/30 font-mono text-sm focus:outline-none focus:border-yellow-400 focus:bg-white/10 transition"
                              />
                            </div>

                            <div className="mt-2.5 flex items-center justify-between text-[11px] text-white/50 font-mono">
                              <span>
                                Exibição: <strong className="text-yellow-400">/b/{shopData.slug || 'seu-slug'}</strong>
                              </span>
                              <span>{shopData.slug.length} / 50 caracteres</span>
                            </div>
                          </div>

                          {/* Demais campos da Barbearia */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                              <label className="block text-sm font-medium text-white mb-2">
                                Nome Comercial da Barbearia *
                              </label>
                              <input
                                type="text"
                                required
                                value={shopData.name}
                                onChange={(e) => setShopData((prev) => ({ ...prev, name: e.target.value }))}
                                placeholder="Ex: Barbearia Central VIP"
                                className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-yellow-400/50 focus:bg-white/10 transition-all text-sm"
                              />
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-white mb-2">
                                Telefone Comercial / WhatsApp
                              </label>
                              <input
                                type="tel"
                                value={shopData.phone}
                                onChange={(e) => setShopData((prev) => ({ ...prev, phone: e.target.value }))}
                                placeholder="(11) 98765-4321"
                                className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-yellow-400/50 focus:bg-white/10 transition-all text-sm font-mono"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-white mb-2">
                              Endereço Completo da Unidade
                            </label>
                            <input
                              type="text"
                              value={shopData.address}
                              onChange={(e) => setShopData((prev) => ({ ...prev, address: e.target.value }))}
                              placeholder="Ex: Av. Paulista, 1000 - Bela Vista, São Paulo - SP"
                              className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-yellow-400/50 focus:bg-white/10 transition-all text-sm"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-white mb-2">
                              Descrição / Apresentação da Barbearia
                            </label>
                            <textarea
                              rows={3}
                              value={shopData.description}
                              onChange={(e) => setShopData((prev) => ({ ...prev, description: e.target.value }))}
                              placeholder="Conte aos seus clientes sobre a experiência, ambiente, café, especialidades..."
                              className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-yellow-400/50 focus:bg-white/10 transition-all resize-none text-sm"
                            />
                          </div>

                          {/* Botão de Salvar Barbearia */}
                          <div className="flex justify-end pt-4 border-t border-white/10">
                            <button
                              type="submit"
                              disabled={isShopSaving}
                              className="px-6 py-2.5 bg-gradient-to-r from-yellow-400 to-yellow-600 text-black font-semibold rounded-lg hover:from-yellow-500 hover:to-yellow-700 transition-all flex items-center space-x-2 disabled:opacity-50 cursor-pointer shadow-lg shadow-yellow-500/20"
                            >
                              {isShopSaving ? (
                                <>
                                  <RefreshCw className="w-4 h-4 animate-spin text-black" />
                                  <span>Salvando...</span>
                                </>
                              ) : (
                                <>
                                  <Save className="w-4 h-4 text-black" />
                                  <span>Salvar Dados da Barbearia</span>
                                </>
                              )}
                            </button>
                          </div>
                        </form>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
