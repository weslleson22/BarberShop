'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth-context'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import {
  User,
  Camera,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Shield,
  FileText,
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
  ImageIcon,
  Trash2,
  Clock,
  Sliders,
  Sun,
  Coffee,
  X,
  Users,
} from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import DropdownHeader from '@/components/shared/DropdownHeader'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  DAYS_CONFIG,
  DEFAULT_OPERATING_HOURS,
  normalizeOperatingHours,
  type WeekOperatingHours,
  type DayOfWeekKey,
} from '@/lib/operating-hours'

export default function ConfiguracoesPage() {
  const { user, updateUser } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()

  const [activeTab, setActiveTab] = useState<'profile' | 'barbershop' | 'hours'>('profile')
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

  // Dados de Horários de Atendimento
  const [operatingHours, setOperatingHours] = useState<WeekOperatingHours>(DEFAULT_OPERATING_HOURS)
  const [isHoursSaving, setIsHoursSaving] = useState(false)
  const [hoursFeedback, setHoursFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

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

  // Estado dos barbeiros da equipe para controle de disponibilidade em Horários de Atendimento
  const [teamBarbers, setTeamBarbers] = useState<any[]>([])
  const [isTeamFetching, setIsTeamFetching] = useState(false)
  const [togglingBarberId, setTogglingBarberId] = useState<string | null>(null)
  const [barberWorkDays, setBarberWorkDays] = useState<Record<string, DayOfWeekKey[]>>({})

  // Apenas usuários com papel ADMIN possuem permissão para visualizar e gerenciar as configurações da Barbearia, Link Público e Horários
  const canManageShop = user?.role === 'ADMIN'

  // Redireciona para perfil caso usuário sem permissão tente alternar para abas restritas
  useEffect(() => {
    if (!canManageShop && (activeTab === 'barbershop' || activeTab === 'hours')) {
      setActiveTab('profile')
    }
  }, [canManageShop, activeTab])

  // Suporte a parâmetro de URL (?tab=hours, ?tab=barbershop ou ?tab=profile)
  useEffect(() => {
    const tabParam = searchParams?.get('tab')
    if (tabParam === 'hours' && canManageShop) {
      setActiveTab('hours')
    } else if (tabParam === 'barbershop' && canManageShop) {
      setActiveTab('barbershop')
    } else if (tabParam === 'profile') {
      setActiveTab('profile')
    }
  }, [searchParams, canManageShop])

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

        if (data.operatingHours) {
          setOperatingHours(normalizeOperatingHours(data.operatingHours))
        } else {
          setOperatingHours(DEFAULT_OPERATING_HOURS)
        }

        if (data.barberWorkDays && typeof data.barberWorkDays === 'object') {
          setBarberWorkDays(data.barberWorkDays)
        }
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

  // Funções de manipulação de horários de funcionamento
  const handleToggleDay = (key: DayOfWeekKey) => {
    setOperatingHours((prev) => ({
      ...prev,
      [key]: {
        ...prev[key],
        isOpen: !prev[key].isOpen,
      },
    }))
  }

  const handleTimeChange = (
    key: DayOfWeekKey,
    field: 'open' | 'close' | 'breakStart' | 'breakEnd',
    value: string
  ) => {
    setOperatingHours((prev) => ({
      ...prev,
      [key]: {
        ...prev[key],
        [field]: value,
      },
    }))
  }

  const handleToggleBreak = (key: DayOfWeekKey) => {
    setOperatingHours((prev) => ({
      ...prev,
      [key]: {
        ...prev[key],
        hasBreak: !prev[key].hasBreak,
      },
    }))
  }

  const applyCommercialHours = () => {
    setOperatingHours({
      monday: { isOpen: true, open: '08:00', close: '18:00', hasBreak: false, breakStart: '12:00', breakEnd: '13:00' },
      tuesday: { isOpen: true, open: '08:00', close: '18:00', hasBreak: false, breakStart: '12:00', breakEnd: '13:00' },
      wednesday: { isOpen: true, open: '08:00', close: '18:00', hasBreak: false, breakStart: '12:00', breakEnd: '13:00' },
      thursday: { isOpen: true, open: '08:00', close: '18:00', hasBreak: false, breakStart: '12:00', breakEnd: '13:00' },
      friday: { isOpen: true, open: '08:00', close: '18:00', hasBreak: false, breakStart: '12:00', breakEnd: '13:00' },
      saturday: { isOpen: true, open: '08:00', close: '14:00', hasBreak: false, breakStart: '12:00', breakEnd: '13:00' },
      sunday: { isOpen: false, open: '08:00', close: '14:00', hasBreak: false, breakStart: '12:00', breakEnd: '13:00' },
    })
    setHoursFeedback({ type: 'success', text: 'Predefinição comercial aplicada! Clique em "Salvar Horários" para confirmar.' })
  }

  const applyExtendedHours = () => {
    setOperatingHours({
      monday: { isOpen: true, open: '09:00', close: '20:00', hasBreak: false, breakStart: '12:00', breakEnd: '13:00' },
      tuesday: { isOpen: true, open: '09:00', close: '20:00', hasBreak: false, breakStart: '12:00', breakEnd: '13:00' },
      wednesday: { isOpen: true, open: '09:00', close: '20:00', hasBreak: false, breakStart: '12:00', breakEnd: '13:00' },
      thursday: { isOpen: true, open: '09:00', close: '20:00', hasBreak: false, breakStart: '12:00', breakEnd: '13:00' },
      friday: { isOpen: true, open: '09:00', close: '20:00', hasBreak: false, breakStart: '12:00', breakEnd: '13:00' },
      saturday: { isOpen: true, open: '09:00', close: '20:00', hasBreak: false, breakStart: '12:00', breakEnd: '13:00' },
      sunday: { isOpen: false, open: '08:00', close: '14:00', hasBreak: false, breakStart: '12:00', breakEnd: '13:00' },
    })
    setHoursFeedback({ type: 'success', text: 'Predefinição estendida aplicada! Clique em "Salvar Horários" para confirmar.' })
  }

  const copyMondayToWeekdays = () => {
    const mon = operatingHours.monday
    setOperatingHours((prev) => ({
      ...prev,
      tuesday: { ...mon },
      wednesday: { ...mon },
      thursday: { ...mon },
      friday: { ...mon },
    }))
    setHoursFeedback({ type: 'success', text: 'Horário de Segunda copiado para Terça a Sexta-feira!' })
  }

  const handleSaveOperatingHours = async () => {
    setIsHoursSaving(true)
    setHoursFeedback(null)
    try {
      const response = await fetch('/api/barbershop', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          operatingHours,
          barberWorkDays,
        }),
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Erro ao salvar os horários de atendimento.')
      }

      if (data.operatingHours) {
        setOperatingHours(normalizeOperatingHours(data.operatingHours))
      }

      setHoursFeedback({
        type: 'success',
        text: 'Horários de atendimento salvos com sucesso! A grade pública e o fluxo de agendamento foram atualizados.',
      })
    } catch (err: any) {
      setHoursFeedback({
        type: 'error',
        text: err.message || 'Falha ao salvar horários de atendimento.',
      })
    } finally {
      setIsHoursSaving(false)
    }
  }

  const fetchTeamBarbers = async () => {
    setIsTeamFetching(true)
    try {
      const res = await fetch('/api/users?role=BARBER', {
        credentials: 'include',
      })
      if (res.ok) {
        const data = await res.json()
        setTeamBarbers(Array.isArray(data) ? data : [])
      }
    } catch (error) {
      console.error('Erro ao buscar profissionais da barbearia:', error)
    } finally {
      setIsTeamFetching(false)
    }
  }

  const handleToggleBarberAvailability = async (barberId: string, currentStatus: boolean) => {
    const nextStatus = !currentStatus
    setTogglingBarberId(barberId)

    // Atualização otimista
    setTeamBarbers((prev) =>
      prev.map((b) => (b.id === barberId ? { ...b, isActive: nextStatus } : b))
    )

    try {
      const response = await fetch(`/api/users/${barberId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ isActive: nextStatus }),
      })

      if (!response.ok) {
        setTeamBarbers((prev) =>
          prev.map((b) => (b.id === barberId ? { ...b, isActive: currentStatus } : b))
        )
        const err = await response.json().catch(() => ({}))
        alert(err.error || 'Erro ao atualizar disponibilidade do profissional')
      }
    } catch (error) {
      setTeamBarbers((prev) =>
        prev.map((b) => (b.id === barberId ? { ...b, isActive: currentStatus } : b))
      )
      console.error('Erro ao atualizar disponibilidade:', error)
      alert('Erro de conexão ao atualizar disponibilidade')
    } finally {
      setTogglingBarberId(null)
    }
  }

  // Alternar um dia específico da semana para o profissional
  const handleToggleBarberDay = async (barberId: string, dayKey: DayOfWeekKey) => {
    const defaultDays = DAYS_CONFIG.filter((d) => operatingHours[d.key]?.isOpen).map((d) => d.key)
    const currentDays = barberWorkDays[barberId] ? barberWorkDays[barberId] : defaultDays
    const isSelected = currentDays.includes(dayKey)
    const nextDays = isSelected
      ? currentDays.filter((d) => d !== dayKey)
      : [...currentDays, dayKey]

    const nextBarberWorkDays = {
      ...barberWorkDays,
      [barberId]: nextDays,
    }

    setBarberWorkDays(nextBarberWorkDays)

    try {
      const res = await fetch('/api/barbershop', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          barberWorkDays: nextBarberWorkDays,
        }),
      })
      if (!res.ok) {
        console.error('Falha ao sincronizar escala do profissional')
      }
    } catch (err) {
      console.error('Erro ao salvar escala do barbeiro:', err)
    }
  }

  const handleSetAllDaysForBarber = async (barberId: string) => {
    const allOpenDays = DAYS_CONFIG.filter((d) => operatingHours[d.key]?.isOpen).map((d) => d.key)
    const next = { ...barberWorkDays, [barberId]: allOpenDays }
    setBarberWorkDays(next)
    try {
      await fetch('/api/barbershop', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ barberWorkDays: next }),
      })
    } catch (err) {
      console.error('Erro ao salvar escala:', err)
    }
  }

  const handleSetWeekdaysForBarber = async (barberId: string) => {
    const weekdays: DayOfWeekKey[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']
    const next = { ...barberWorkDays, [barberId]: weekdays }
    setBarberWorkDays(next)
    try {
      await fetch('/api/barbershop', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ barberWorkDays: next }),
      })
    } catch (err) {
      console.error('Erro ao salvar escala:', err)
    }
  }

  useEffect(() => {
    if (canManageShop) {
      fetchBarbershopData()
      fetchTeamBarbers()
    }
  }, [canManageShop])

  useEffect(() => {
    if (activeTab === 'hours' && canManageShop && teamBarbers.length === 0) {
      fetchTeamBarbers()
    }
  }, [activeTab, canManageShop])

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
    <div className="min-h-screen bg-background text-foreground pb-20 pt-20">
      {/* Header Fixo no Topo */}
      <DropdownHeader />

      {/* Conteúdo Principal Padrão */}
      <main className="w-full px-4 md:px-8 max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/80 pb-6">
          <div>
            {user?.role === 'DEVELOPER' ? (
              <div className="flex items-center gap-2 text-primary text-xs font-semibold uppercase tracking-wider mb-1">
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-500 border border-amber-500/20">
                  DEVELOPER ADMIN
                </span>
                <span className="text-muted-foreground">/</span>
                <span className="text-muted-foreground">Configurações Globais</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-primary text-xs font-semibold uppercase tracking-wider mb-1">
                <Settings className="w-4 h-4" />
                <span>Preferências da Conta</span>
              </div>
            )}
            <h1 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight">
              {user?.role === 'DEVELOPER'
                ? 'Configurações Globais'
                : activeTab === 'profile'
                ? 'Configurações da Conta'
                : 'Perfil do Estabelecimento'}
            </h1>
            <p className="text-sm md:text-base text-muted-foreground mt-1">
              {user?.role === 'DEVELOPER'
                ? 'Gerencie seu perfil de Desenvolvedor, credenciais de acesso e preferências do sistema.'
                : activeTab === 'profile'
                ? 'Gerencie suas informações pessoais, e-mail e credenciais da sua conta.'
                : 'Gerencie as informações da barbearia, identidade visual, link público e horários de atendimento.'}
            </p>
          </div>
        </div>

        {/* Abas de Navegação */}
        {activeTab === 'profile' ? (
          <div className="flex items-center gap-2 border-b border-border/80 pb-3">
            <Button
              type="button"
              variant="default"
              className="gap-2 h-9"
            >
              <User className="w-4 h-4" />
              <span>Meu Perfil</span>
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-2 border-b border-border/80 pb-3 overflow-x-auto">
            {canManageShop && (
              <Button
                type="button"
                variant={activeTab === 'barbershop' ? 'default' : 'outline'}
                onClick={() => setActiveTab('barbershop')}
                className="gap-2 h-9"
              >
                <Building2 className="w-4 h-4" />
                <span>Dados da Barbearia & Link Público</span>
                {shopData.slug && (
                  <Badge variant="secondary" className="font-mono text-[10px]">
                    /b/{shopData.slug}
                  </Badge>
                )}
              </Button>
            )}

            {canManageShop && (
              <Button
                type="button"
                variant={activeTab === 'hours' ? 'default' : 'outline'}
                onClick={() => setActiveTab('hours')}
                className="gap-2 h-9"
              >
                <Clock className="w-4 h-4" />
                <span>Horários de Atendimento</span>
              </Button>
            )}
          </div>
        )}

        {/* Conteúdo da Aba: MEU PERFIL */}
        {activeTab === 'profile' && (
          <>
            {isFetching ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-muted-foreground font-medium text-sm">Carregando dados...</div>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Avatar Section */}
                <div className="lg:col-span-1 space-y-6">
                  <Card className="p-6 shadow-sm">
                    <h2 className="text-lg font-semibold text-foreground mb-4">Foto do Perfil</h2>

                    <div className="flex flex-col items-center">
                      <div className="relative mb-4">
                        <div className="w-24 h-24 bg-primary/10 text-primary border border-primary/20 rounded-full flex items-center justify-center overflow-hidden">
                          {avatarPreview ? (
                            <img
                              src={avatarPreview}
                              alt="Avatar"
                              className="w-24 h-24 rounded-full object-cover"
                            />
                          ) : (
                            <span className="font-bold text-2xl">
                              {formData.name?.charAt(0)?.toUpperCase() || 'U'}
                            </span>
                          )}
                        </div>
                        <label className="absolute bottom-0 right-0 bg-primary hover:bg-primary/90 text-primary-foreground rounded-full p-2 cursor-pointer transition-colors shadow-sm">
                          <Camera className="w-4 h-4" />
                          <input
                            type="file"
                            className="hidden"
                            accept="image/*"
                            onChange={handleAvatarChange}
                          />
                        </label>
                      </div>

                      <label className="w-full py-2 bg-primary hover:bg-primary/90 text-primary-foreground font-medium text-xs sm:text-sm rounded-lg transition-colors flex items-center justify-center space-x-2 cursor-pointer shadow-sm">
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
                  </Card>

                  {/* Quick Actions */}
                  <Card className="p-6 shadow-sm">
                    <h2 className="text-lg font-semibold text-foreground mb-4">Ações Rápidas</h2>
                    <div className="space-y-3">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          if (user?.role === 'DEVELOPER') {
                            alert('Você está autenticado como Administrador da Plataforma (DEVELOPER).')
                          } else {
                            alert('Para redefinir sua senha, solicite suporte ao administrador da barbearia.')
                          }
                        }}
                        className="w-full justify-center gap-2"
                      >
                        <Shield className="w-4 h-4" />
                        <span>Segurança & Senha</span>
                      </Button>
                      {canManageShop && (
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={() => setActiveTab('barbershop')}
                          className="w-full justify-center gap-2"
                        >
                          <Globe className="w-4 h-4" />
                          <span>Ver Link Público da Barbearia</span>
                        </Button>
                      )}
                    </div>
                  </Card>
                </div>

                {/* Form Section */}
                <div className="lg:col-span-2">
                  <Card className="p-6 shadow-sm">
                    <h2 className="text-lg font-semibold text-foreground mb-6">Informações Pessoais</h2>

                    <form onSubmit={handleSubmit} className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-xs font-semibold text-foreground mb-2">
                            <User className="w-4 h-4 inline mr-2 text-primary" />
                            Nome Completo
                          </label>
                          <Input
                            type="text"
                            name="name"
                            value={formData.name}
                            onChange={handleInputChange}
                            placeholder="Seu nome completo"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-foreground mb-2">
                            <Mail className="w-4 h-4 inline mr-2 text-primary" />
                            E-mail
                          </label>
                          <Input
                            type="email"
                            name="email"
                            value={formData.email}
                            onChange={handleInputChange}
                            placeholder="email@exemplo.com"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-foreground mb-2">
                            <Phone className="w-4 h-4 inline mr-2 text-primary" />
                            Telefone
                          </label>
                          <Input
                            type="tel"
                            name="phone"
                            value={formData.phone}
                            onChange={handlePhoneChange}
                            placeholder="(11) 99999-8888"
                            maxLength={15}
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-foreground mb-2">
                            <Calendar className="w-4 h-4 inline mr-2 text-primary" />
                            Data de Nascimento
                          </label>
                          <Input
                            type="date"
                            name="birthDate"
                            value={formData.birthDate}
                            onChange={handleInputChange}
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-foreground mb-2">
                          <MapPin className="w-4 h-4 inline mr-2 text-primary" />
                          Endereço
                        </label>
                        <Input
                          type="text"
                          name="address"
                          value={formData.address}
                          onChange={handleInputChange}
                          placeholder="Seu endereço"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-foreground mb-2">Bio</label>
                        <textarea
                          name="bio"
                          value={formData.bio}
                          onChange={handleInputChange}
                          rows={4}
                          className="w-full px-3.5 py-2.5 bg-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring transition-all resize-none text-sm"
                          placeholder="Fale um pouco sobre você..."
                        />
                      </div>

                      <div className="flex justify-end gap-3 pt-4 border-t border-border">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => router.back()}
                        >
                          Cancelar
                        </Button>
                        <Button
                          type="submit"
                          disabled={isLoading}
                          className="gap-2"
                        >
                          <Save className="w-4 h-4" />
                          <span>{isLoading ? 'Salvando...' : 'Salvar Alterações'}</span>
                        </Button>
                      </div>
                    </form>
                  </Card>
                </div>
              </div>
            )}
          </>
        )}

        {/* Conteúdo da Aba: MINHA BARBEARIA & LINK PÚBLICO (SLUG) */}
        {activeTab === 'barbershop' && canManageShop && (
          <div className="space-y-6">
            {isShopFetching ? (
              <div className="flex items-center justify-center py-16 text-muted-foreground font-medium">
                <RefreshCw className="w-6 h-6 animate-spin text-primary mr-2" />
                Carregando dados da barbearia...
              </div>
            ) : (
              <>
                {/* Banner do Link Público */}
                <Card className="p-6 sm:p-8 shadow-sm">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
                        <Globe className="w-6 h-6" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h2 className="text-xl font-bold text-foreground">Link Público Exclusivo</h2>
                          <Badge variant="secondary" className="gap-1">
                            <Globe className="w-3 h-3 text-primary" />
                            Multi-tenant Ativo
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Compartilhe seu link exclusivo com seus clientes no Instagram, WhatsApp e redes sociais.
                        </p>
                      </div>
                    </div>

                    {/* Badge do Slug Atual */}
                    {shopData.slug && (
                      <Badge variant="outline" className="font-mono text-xs gap-1.5 py-1 px-3 self-start sm:self-auto">
                        <Link2 className="w-3.5 h-3.5 text-primary" />
                        <span>/b/{shopData.slug}</span>
                      </Badge>
                    )}
                  </div>

                  {/* Caixa do Link Principal */}
                  <div className="bg-muted/40 border border-border rounded-xl p-4 mb-4">
                    <div className="text-xs text-muted-foreground mb-1.5 font-medium flex items-center justify-between">
                      <span>Página da Barbearia (Catálogo & Informações):</span>
                      <span className="text-[11px] text-primary font-medium">Recomendado para Bio do Instagram</span>
                    </div>
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                      <div className="flex-1 px-3.5 py-2.5 bg-background border border-border rounded-lg font-mono text-xs sm:text-sm text-foreground truncate select-all">
                        {publicMainUrl}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => handleCopy(publicMainUrl, 'main')}
                          className="flex-1 sm:flex-none gap-1.5"
                        >
                          {copiedType === 'main' ? (
                            <>
                              <Check className="w-3.5 h-3.5 stroke-[3]" />
                              <span>Copiado!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              <span>Copiar</span>
                            </>
                          )}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          asChild
                          className="gap-1.5"
                        >
                          <a
                            href={`/b/${shopData.slug}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Abrir em nova aba"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Visualizar</span>
                          </a>
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Caixa do Link de Agendamento Direto */}
                  <div className="bg-muted/40 border border-border rounded-xl p-4">
                    <div className="text-xs text-muted-foreground mb-1.5 font-medium flex items-center justify-between">
                      <span>Link Direto de Agendamento:</span>
                      <span className="text-[11px] text-primary font-medium">Ideal para enviar no WhatsApp</span>
                    </div>
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                      <div className="flex-1 px-3.5 py-2.5 bg-background border border-border rounded-lg font-mono text-xs sm:text-sm text-foreground truncate select-all">
                        {publicBookingUrl}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleCopy(publicBookingUrl, 'booking')}
                          className="flex-1 sm:flex-none gap-1.5"
                        >
                          {copiedType === 'booking' ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-500 stroke-[3]" />
                              <span className="text-emerald-500">Copiado!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5 text-muted-foreground" />
                              <span>Copiar</span>
                            </>
                          )}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          asChild
                          className="gap-1.5"
                        >
                          <a
                            href={`/b/${shopData.slug}/agendamento`}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Testar fluxo de agendamento em nova aba"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Testar Agendamento</span>
                          </a>
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 flex items-start gap-2.5 text-xs text-muted-foreground bg-muted/30 border border-border rounded-lg p-3">
                    <Shield className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                    <span>
                      <strong>Isolamento Multi-tenant Garantido:</strong> Qualquer agendamento realizado através
                      destes links é gravado exclusivamente na sua barbearia. Seus clientes nunca veem dados ou
                      serviços de outros estabelecimentos.
                    </span>
                  </div>
                </Card>

                {/* Seção: Logo da Barbearia & Identidade Visual */}
                <Card className="p-6 sm:p-8 shadow-sm">
                  <div className="border-b border-border pb-4 mb-6">
                    <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                      <ImageIcon className="w-5 h-5 text-primary" />
                      Logo da Barbearia & Identidade Visual
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Esta logo é exibida na sua página pública de clientes (/b/{shopData.slug || 'sua-barbearia'}), na barra lateral do painel e no onboarding.
                    </p>
                  </div>

                  <div className="flex flex-col sm:flex-row items-center gap-6">
                    <div className="relative group">
                      <div className="w-28 h-28 rounded-2xl bg-muted/40 border-2 border-dashed border-border hover:border-primary/50 flex items-center justify-center overflow-hidden transition-all shadow-sm">
                        {logoPreview ? (
                          <img
                            src={logoPreview}
                            alt="Logo da Barbearia"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="flex flex-col items-center justify-center text-muted-foreground gap-1.5 p-2 text-center">
                            <Building2 className="w-8 h-8 opacity-50" />
                            <span className="text-[10px] font-medium">Sem logo cadastrada</span>
                          </div>
                        )}
                      </div>

                      <label className="absolute bottom-1 right-1 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl p-2 cursor-pointer transition-colors shadow-sm">
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
                        <h4 className="text-sm font-semibold text-foreground">Upload da Marca</h4>
                        <p className="text-xs text-muted-foreground">
                          Formatos aceitos: PNG, JPG, WebP ou SVG (máx. 5MB). Imagens quadradas com fundo transparente ou escuro são recomendadas.
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5">
                        <label className="px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground font-medium rounded-lg text-xs transition cursor-pointer flex items-center gap-2 shadow-sm">
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
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={handleRemoveLogo}
                            className="text-destructive hover:bg-destructive/10 border-border gap-1.5 h-8 text-xs"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Remover Logo</span>
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </Card>

                {/* Formulário de Configuração do Estabelecimento & Slug */}
                <Card className="p-6 sm:p-8 shadow-sm">
                  <div className="border-b border-border pb-4 mb-6">
                    <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                      <Building2 className="w-5 h-5 text-primary" />
                      Dados da Barbearia & Personalização do Slug
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Personalize o nome, contato e o identificador (slug) da sua barbearia na URL.
                    </p>
                  </div>

                  {/* Mensagem de Feedback */}
                  {shopFeedback && (
                    <div
                      className={`p-4 rounded-xl text-xs sm:text-sm mb-6 flex items-start gap-3 border ${
                        shopFeedback.type === 'success'
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                          : 'bg-destructive/10 text-destructive border-destructive/20'
                      }`}
                    >
                      {shopFeedback.type === 'success' ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                      ) : (
                        <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
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
                    <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 sm:p-5">
                      <label className="block text-xs font-semibold text-foreground mb-1 flex items-center gap-2">
                        <Link2 className="w-4 h-4 text-primary" />
                        Slug da Barbearia (Identificador da URL) *
                      </label>
                      <p className="text-xs text-muted-foreground mb-3">
                        Este é o texto final do endereço público da sua barbearia. Deve conter apenas letras minúsculas,
                        números e hífens.
                      </p>

                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                        <div className="flex items-center px-3 py-2 bg-muted border border-border rounded-lg text-muted-foreground text-xs sm:text-sm font-mono select-none">
                          {origin}/b/
                        </div>
                        <Input
                          type="text"
                          required
                          minLength={2}
                          maxLength={50}
                          value={shopData.slug}
                          onChange={(e) => handleSlugChange(e.target.value)}
                          placeholder="ex: barbearia-central"
                          className="flex-1 font-mono text-sm"
                        />
                      </div>

                      <div className="mt-2.5 flex items-center justify-between text-[11px] text-muted-foreground font-mono">
                        <span>
                          Exibição: <strong className="text-foreground">/b/{shopData.slug || 'seu-slug'}</strong>
                        </span>
                        <span>{shopData.slug.length} / 50 caracteres</span>
                      </div>
                    </div>

                    {/* Demais campos da Barbearia */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-xs font-semibold text-foreground mb-2">
                          Nome Comercial da Barbearia *
                        </label>
                        <Input
                          type="text"
                          required
                          value={shopData.name}
                          onChange={(e) => setShopData((prev) => ({ ...prev, name: e.target.value }))}
                          placeholder="Ex: Barbearia Central VIP"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-foreground mb-2">
                          Telefone Comercial / WhatsApp
                        </label>
                        <Input
                          type="tel"
                          value={shopData.phone}
                          onChange={(e) => setShopData((prev) => ({ ...prev, phone: e.target.value }))}
                          placeholder="(11) 98765-4321"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-foreground mb-2">
                        Endereço Completo da Unidade
                      </label>
                      <Input
                        type="text"
                        value={shopData.address}
                        onChange={(e) => setShopData((prev) => ({ ...prev, address: e.target.value }))}
                        placeholder="Ex: Av. Paulista, 1000 - Bela Vista, São Paulo - SP"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-foreground mb-2">
                        Descrição / Apresentação da Barbearia
                      </label>
                      <textarea
                        rows={3}
                        value={shopData.description}
                        onChange={(e) => setShopData((prev) => ({ ...prev, description: e.target.value }))}
                        placeholder="Conte aos seus clientes sobre a experiência, ambiente, café, especialidades..."
                        className="w-full px-3.5 py-2.5 bg-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring transition-all resize-none text-sm"
                      />
                    </div>

                    {/* Botão de Salvar Barbearia */}
                    <div className="flex justify-end pt-4 border-t border-border">
                      <Button
                        type="submit"
                        disabled={isShopSaving}
                        className="gap-2"
                      >
                        {isShopSaving ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            <span>Salvando...</span>
                          </>
                        ) : (
                          <>
                            <Save className="w-4 h-4" />
                            <span>Salvar Dados da Barbearia</span>
                          </>
                        )}
                      </Button>
                    </div>
                  </form>
                </Card>
              </>
            )}
          </div>
        )}

        {/* Conteúdo da Aba: HORÁRIOS DE ATENDIMENTO */}
        {activeTab === 'hours' && (
          <div className="space-y-6">
            {isShopFetching ? (
              <div className="flex items-center justify-center py-16 text-muted-foreground font-medium">
                <RefreshCw className="w-6 h-6 animate-spin text-primary mr-2" />
                Carregando horários da barbearia...
              </div>
            ) : (
              <>
                {/* Header dos Horários */}
                <Card className="p-6 sm:p-8 shadow-sm">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
                        <Clock className="w-6 h-6" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h2 className="text-xl font-bold text-foreground">Horários de Atendimento &amp; Funcionamento</h2>
                          <Badge variant="secondary" className="gap-1 bg-primary/10 text-primary border-primary/20">
                            Disponibilidade Online
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Defina quando sua barbearia estará aberta. Estes horários definem a grade de agendamento na sua página pública (/b/{shopData.slug || 'sua-unidade'}) e no painel.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-start sm:self-auto">
                      <Badge variant="outline" className="text-xs font-semibold px-3 py-1 bg-muted/50 border-border">
                        {DAYS_CONFIG.filter((d) => operatingHours[d.key].isOpen).length} de 7 dias com atendimento
                      </Badge>
                    </div>
                  </div>

                  {/* Atalhos Rápidos de Horário */}
                  <div className="mt-6 pt-5 border-t border-border">
                    <div className="text-xs font-semibold text-foreground mb-2 flex items-center gap-2">
                      <Sliders className="w-4 h-4 text-primary" />
                      <span>Modelos e Atalhos Rápidos:</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={applyCommercialHours}
                        className="text-xs h-8"
                      >
                        Comercial (Seg-Sex 08h-18h | Sáb 08h-14h)
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={applyExtendedHours}
                        className="text-xs h-8"
                      >
                        Estendido (Seg-Sáb 09h-20h)
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={copyMondayToWeekdays}
                        className="text-xs h-8"
                      >
                        Copiar Segunda para Ter-Sex
                      </Button>
                    </div>
                  </div>
                </Card>

                {/* Mensagem de Feedback */}
                {hoursFeedback && (
                  <div
                    className={`p-4 rounded-xl text-xs sm:text-sm flex items-start gap-3 border ${
                      hoursFeedback.type === 'success'
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                        : 'bg-destructive/10 text-destructive border-destructive/20'
                    }`}
                  >
                    {hoursFeedback.type === 'success' ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
                    )}
                    <div>
                      <p className="font-semibold">
                        {hoursFeedback.type === 'success' ? 'Sucesso' : 'Atenção'}
                      </p>
                      <p className="mt-0.5">{hoursFeedback.text}</p>
                    </div>
                  </div>
                )}

                {/* Seção 1: Profissionais da Barbearia & Disponibilidade para Atendimentos */}
                <Card className="p-6 sm:p-8 shadow-sm">
                  <div className="border-b border-border pb-4 mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 text-primary text-xs font-semibold uppercase tracking-wider mb-1">
                        <Users className="w-4 h-4" />
                        <span>Equipe & Escala de Atendimento</span>
                      </div>
                      <h3 className="text-lg font-bold text-foreground">
                        Disponibilidade dos Profissionais
                      </h3>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Defina em tempo real quais profissionais da barbearia estão disponíveis para atender clientes e receber reservas online.
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs font-semibold px-3 py-1 bg-muted/40 border-border">
                        {teamBarbers.filter((b) => b.isActive).length} de {teamBarbers.length} profissionais disponíveis
                      </Badge>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={fetchTeamBarbers}
                        disabled={isTeamFetching}
                        title="Recarregar profissionais"
                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${isTeamFetching ? 'animate-spin' : ''}`} />
                      </Button>
                    </div>
                  </div>

                  {isTeamFetching ? (
                    <div className="py-10 text-center flex flex-col items-center justify-center gap-3">
                      <div className="animate-spin rounded-full h-7 w-7 border-2 border-primary border-r-transparent" />
                      <span className="text-xs text-muted-foreground">Carregando profissionais da equipe...</span>
                    </div>
                  ) : teamBarbers.length === 0 ? (
                    <div className="p-6 rounded-2xl border border-dashed border-border bg-muted/20 text-center space-y-3">
                      <p className="text-sm font-medium text-foreground">Nenhum profissional cadastrado na equipe</p>
                      <p className="text-xs text-muted-foreground max-w-md mx-auto">
                        Cadastre os barbeiros da sua equipe para definir as disponibilidades de atendimento e gerenciar suas escalas.
                      </p>
                      <Link href="/usuarios">
                        <Button size="sm" variant="outline" className="gap-2 text-xs">
                          <Users className="w-3.5 h-3.5" />
                          <span>Cadastrar Profissional em Usuários</span>
                        </Button>
                      </Link>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-4">
                      {teamBarbers.map((barber) => {
                        const defaultDays = DAYS_CONFIG.filter((d) => operatingHours[d.key]?.isOpen).map((d) => d.key)
                        const assignedDays = barberWorkDays[barber.id] !== undefined ? barberWorkDays[barber.id] : defaultDays

                        return (
                          <div
                            key={barber.id}
                            className={`p-5 rounded-2xl border transition-all space-y-4 ${
                              barber.isActive
                                ? 'bg-card border-border shadow-sm ring-1 ring-primary/10'
                                : 'bg-muted/30 border-border/60 opacity-75'
                            }`}
                          >
                            {/* Cabeçalho do Card do Barbeiro */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                              <div className="flex items-center gap-3.5 min-w-0">
                                <div className="relative shrink-0">
                                  {barber.avatar ? (
                                    <img
                                      src={barber.avatar}
                                      alt={barber.name}
                                      className="w-12 h-12 rounded-xl object-cover border border-border"
                                    />
                                  ) : (
                                    <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold text-base">
                                      {(barber.name || 'B').charAt(0).toUpperCase()}
                                    </div>
                                  )}
                                  <span
                                    className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-background transition-colors ${
                                      barber.isActive ? 'bg-emerald-500 shadow-sm shadow-emerald-500/50' : 'bg-muted-foreground'
                                    }`}
                                  />
                                </div>

                                <div className="min-w-0">
                                  <div className="flex items-center gap-2">
                                    <h4 className="text-base font-semibold text-foreground truncate">
                                      {barber.name || 'Sem Nome'}
                                    </h4>
                                    <Badge
                                      variant={barber.isActive ? 'default' : 'outline'}
                                      className={`text-[10px] font-semibold py-0.5 px-2 ${
                                        barber.isActive
                                          ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30'
                                          : 'text-muted-foreground'
                                      }`}
                                    >
                                      {barber.isActive ? 'Disponível' : 'Indisponível / Pausado'}
                                    </Badge>
                                  </div>
                                  <p className="text-xs text-muted-foreground truncate mt-0.5">
                                    {barber.email || barber.phone || 'Sem contato cadastrado'}
                                  </p>
                                </div>
                              </div>

                              {/* Switch de Ativação Geral shadcn */}
                              <div className="flex items-center gap-3 self-end sm:self-auto shrink-0 bg-muted/40 px-3 py-1.5 rounded-xl border border-border">
                                <span className="text-xs font-semibold text-muted-foreground">
                                  {barber.isActive ? 'Em Atendimento' : 'Pausado'}
                                </span>
                                <Switch
                                  id={`barber-avail-${barber.id}`}
                                  checked={barber.isActive}
                                  disabled={togglingBarberId === barber.id}
                                  onCheckedChange={() => handleToggleBarberAvailability(barber.id, barber.isActive)}
                                  className="data-[state=checked]:bg-emerald-600"
                                />
                              </div>
                            </div>

                            {/* Seletor dos Dias da Semana de Atendimento do Barbeiro */}
                            <div className="pt-3 border-t border-border/70 space-y-2.5">
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <Calendar className="w-3.5 h-3.5 text-primary" />
                                  <span className="text-xs font-semibold text-foreground">
                                    Dias da Semana em que este Barbeiro Atende:
                                  </span>
                                  <Badge variant="outline" className="text-[10px] py-0 px-1.5 font-normal">
                                    {assignedDays.length} de 7 dias selecionados
                                  </Badge>
                                  {!barber.isActive && (
                                    <Badge variant="secondary" className="text-[10px] py-0 px-1.5 bg-muted text-muted-foreground">
                                      Pausado
                                    </Badge>
                                  )}
                                </div>

                                <div className="flex items-center gap-2 self-start sm:self-auto">
                                  <button
                                    type="button"
                                    onClick={() => handleSetAllDaysForBarber(barber.id)}
                                    className="text-xs text-primary hover:underline font-medium cursor-pointer"
                                  >
                                    Todos os Dias
                                  </button>
                                  <span className="text-border">•</span>
                                  <button
                                    type="button"
                                    onClick={() => handleSetWeekdaysForBarber(barber.id)}
                                    className="text-xs text-muted-foreground hover:text-foreground font-medium cursor-pointer"
                                  >
                                    Segunda a Sexta
                                  </button>
                                </div>
                              </div>

                              {/* Grade das Pílulas de Segunda a Domingo */}
                              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
                                {DAYS_CONFIG.map((day) => {
                                  const isDayActive = assignedDays.includes(day.key)
                                  const isShopOpen = operatingHours[day.key]?.isOpen

                                  return (
                                    <button
                                      key={day.key}
                                      type="button"
                                      onClick={() => handleToggleBarberDay(barber.id, day.key)}
                                      className={`p-2.5 rounded-xl text-center transition-all cursor-pointer flex flex-col items-center justify-center border ${
                                        isDayActive
                                          ? 'bg-primary text-primary-foreground border-primary font-bold shadow-xs'
                                          : 'bg-muted/30 text-muted-foreground border-border hover:bg-muted/70'
                                      }`}
                                      title={`${day.label}: ${isDayActive ? 'Atendendo' : 'Folga'}${
                                        !isShopOpen ? ' (Estabelecimento fechado)' : ''
                                      }`}
                                    >
                                      <div className="flex items-center justify-between w-full mb-1">
                                        <span className="text-xs font-extrabold uppercase">
                                          {day.shortLabel}
                                        </span>
                                        <span
                                          className={`w-1.5 h-1.5 rounded-full ${
                                            isDayActive ? 'bg-primary-foreground' : 'bg-muted-foreground/40'
                                          }`}
                                        />
                                      </div>
                                      <span className="text-[11px] font-medium block truncate max-w-full">
                                        {day.label}
                                      </span>
                                      <span
                                        className={`text-[10px] mt-1 font-semibold px-1.5 py-0.5 rounded ${
                                          isDayActive
                                            ? 'bg-primary-foreground/20 text-primary-foreground'
                                            : 'bg-muted text-muted-foreground'
                                        }`}
                                      >
                                        {isDayActive ? 'Atende' : 'Folga'}
                                      </span>
                                      {!isShopOpen && (
                                        <span className="text-[9px] text-amber-500 font-medium mt-0.5 block truncate">
                                          Loja Fechada
                                        </span>
                                      )}
                                    </button>
                                  )
                                })}
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </Card>

                {/* Seção 2: Lista Dia a Dia dos Horários da Unidade */}
                <Card className="p-6 sm:p-8 shadow-sm">
                  <div className="border-b border-border pb-4 mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div>
                      <h3 className="text-base font-semibold text-foreground">Grade Semanal de Expediente</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Alterne os dias da semana e configure horários de abertura, fechamento e intervalos de descanso.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {DAYS_CONFIG.map((day) => {
                      const dayData = operatingHours[day.key]
                      return (
                        <div
                          key={day.key}
                          className={`p-4 sm:p-5 rounded-2xl border transition-all ${
                            dayData.isOpen
                              ? 'bg-card border-border shadow-sm'
                              : 'bg-muted/30 border-border/60 opacity-80'
                          }`}
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            {/* Dia e Indicadores */}
                            <div className="flex items-center gap-3.5">
                              <span
                                className={`w-11 h-11 rounded-xl flex items-center justify-center font-bold text-xs uppercase shrink-0 transition-colors ${
                                  dayData.isOpen
                                    ? 'bg-primary/10 text-primary border border-primary/20'
                                    : 'bg-muted text-muted-foreground border border-border'
                                }`}
                              >
                                {day.shortLabel}
                              </span>
                              <div>
                                <div className="flex items-center gap-2">
                                  <h4 className="font-semibold text-base text-foreground">
                                    {day.label}
                                  </h4>
                                  {dayData.isOpen ? (
                                    <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 text-[10px] font-semibold">
                                      Aberto
                                    </Badge>
                                  ) : (
                                    <Badge variant="outline" className="text-muted-foreground border-border text-[10px]">
                                      Fechado
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-xs text-muted-foreground mt-0.5 font-mono">
                                  {dayData.isOpen
                                    ? `${dayData.open} às ${dayData.close}${
                                        dayData.hasBreak
                                          ? ` (Intervalo: ${dayData.breakStart} - ${dayData.breakEnd})`
                                          : ''
                                      }`
                                    : 'Sem agendamentos disponíveis neste dia'}
                                </p>
                              </div>
                            </div>

                            {/* Alternador Aberto/Fechado com Switch shadcn */}
                            <div className="flex items-center gap-3">
                              <span className="text-xs font-semibold text-muted-foreground">
                                {dayData.isOpen ? 'Aberto' : 'Fechado'}
                              </span>
                              <Switch
                                id={`day-switch-${day.key}`}
                                checked={dayData.isOpen}
                                onCheckedChange={() => handleToggleDay(day.key)}
                                className="data-[state=checked]:bg-emerald-600"
                              />
                            </div>
                          </div>

                          {/* Se Aberto: Inputs de Horário */}
                          {dayData.isOpen && (
                            <div className="mt-4 pt-4 border-t border-border grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 items-end">
                              <div>
                                <label className="block text-[11px] font-semibold text-foreground mb-1.5 flex items-center gap-1.5">
                                  <Sun className="w-3.5 h-3.5 text-amber-500" />
                                  Horário de Abertura
                                </label>
                                <Input
                                  type="time"
                                  value={dayData.open}
                                  onChange={(e) => handleTimeChange(day.key, 'open', e.target.value)}
                                  className="h-9 text-xs sm:text-sm font-mono"
                                />
                              </div>

                              <div>
                                <label className="block text-[11px] font-semibold text-foreground mb-1.5 flex items-center gap-1.5">
                                  <Clock className="w-3.5 h-3.5 text-primary" />
                                  Horário de Encerramento
                                </label>
                                <Input
                                  type="time"
                                  value={dayData.close}
                                  onChange={(e) => handleTimeChange(day.key, 'close', e.target.value)}
                                  className="h-9 text-xs sm:text-sm font-mono"
                                />
                              </div>

                              <div className="sm:col-span-2">
                                <div className="flex items-center justify-between mb-1.5">
                                  <label className="text-[11px] font-semibold text-foreground flex items-center gap-1.5">
                                    <Coffee className="w-3.5 h-3.5 text-amber-500" />
                                    Intervalo / Almoço (opcional)
                                  </label>
                                  <button
                                    type="button"
                                    onClick={() => handleToggleBreak(day.key)}
                                    className={`text-[11px] font-semibold transition-colors cursor-pointer ${
                                      dayData.hasBreak
                                        ? 'text-primary hover:underline'
                                        : 'text-muted-foreground hover:text-foreground'
                                    }`}
                                  >
                                    {dayData.hasBreak ? 'Remover pausa' : '+ Adicionar pausa'}
                                  </button>
                                </div>

                                {dayData.hasBreak ? (
                                  <div className="flex items-center gap-2">
                                    <Input
                                      type="time"
                                      value={dayData.breakStart || '12:00'}
                                      onChange={(e) => handleTimeChange(day.key, 'breakStart', e.target.value)}
                                      className="h-9 text-xs sm:text-sm font-mono flex-1"
                                      placeholder="Início"
                                    />
                                    <span className="text-xs text-muted-foreground font-medium">até</span>
                                    <Input
                                      type="time"
                                      value={dayData.breakEnd || '13:00'}
                                      onChange={(e) => handleTimeChange(day.key, 'breakEnd', e.target.value)}
                                      className="h-9 text-xs sm:text-sm font-mono flex-1"
                                      placeholder="Término"
                                    />
                                  </div>
                                ) : (
                                  <div className="h-9 px-3 bg-muted/40 border border-dashed border-border rounded-lg flex items-center text-xs text-muted-foreground font-normal">
                                    Sem intervalo de almoço (expediente contínuo)
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>

                  {/* Botão de Salvar Horários */}
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 mt-6 border-t border-border">
                    <p className="text-xs text-muted-foreground">
                      Ao salvar, a nova grade de horários passa a valer imediatamente no agendamento online.
                    </p>
                    <Button
                      type="button"
                      onClick={handleSaveOperatingHours}
                      disabled={isHoursSaving}
                      className="w-full sm:w-auto gap-2"
                    >
                      {isHoursSaving ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>Salvando horários...</span>
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4" />
                          <span>Salvar Horários de Atendimento</span>
                        </>
                      )}
                    </Button>
                  </div>
                </Card>
              </>
            )}
          </div>
        )}

        {/* Rodapé Legal e Políticas (Discreto na parte inferior) */}
        <div className="pt-6 pb-2 border-t border-border mt-10">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <Shield className="w-3.5 h-3.5 text-muted-foreground/70" />
              <span>Conformidade Legal &amp; Proteção de Dados</span>
            </div>
            <div className="flex items-center gap-4">
              <Link
                href="/termos"
                className="hover:text-foreground hover:underline transition-colors flex items-center gap-1.5"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Termos de Uso</span>
              </Link>
              <span className="text-border">•</span>
              <Link
                href="/privacidade"
                className="hover:text-foreground hover:underline transition-colors flex items-center gap-1.5"
              >
                <Shield className="w-3.5 h-3.5" />
                <span>Privacidade &amp; LGPD</span>
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
