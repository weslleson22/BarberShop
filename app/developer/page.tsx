'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import DropdownHeader from '@/components/shared/DropdownHeader'
import { getAuthHeaders, maskPhone, maskEmail, maskName } from '@/lib/utils'
import AddressAutocomplete from '@/components/developer/AddressAutocomplete'
import {
  Building2,
  Users,
  Power,
  ShieldCheck,
  Server,
  Activity,
  AlertTriangle,
  RefreshCw,
  CheckCircle2,
  Plus,
  X,
  Briefcase,
  Mail,
  Phone,
  MapPin,
  Lock,
  UserCheck,
  Search,
  Calendar,
  Clock,
  Info,
  CalendarClock,
  Shield,
  Crown,
} from 'lucide-react'

interface BarbershopData {
  id: string
  name: string
  email: string
  phone: string | null
  address: string | null
  isActive: boolean
  status?: string
  createdAt: string
  contractExpiresAt: string | null
  createdById: string | null
  creator?: {
    id: string
    name: string
    email: string
  } | null
  users?: Array<{
    id: string
    name: string
    email: string
    phone: string | null
    role: string
    isActive: boolean
    createdAt: string
  }>
  _count?: {
    users?: number
    clients?: number
    services?: number
  }
}

interface PlatformMetrics {
  tenants?: {
    total: number
    active: number
    inactive: number
  }
  users?: {
    total: number
    byRole: Record<string, number>
  }
  clients?: {
    total: number
  }
  services?: {
    total: number
  }
  system?: {
    nodeEnv: string
    serverTime: string
    database?: string
    isolation?: string
  }
}

const initialMetrics: PlatformMetrics = {
  tenants: { total: 0, active: 0, inactive: 0 },
  users: { total: 0, byRole: {} },
  clients: { total: 0 },
  services: { total: 0 },
  system: {
    nodeEnv: 'development',
    serverTime: new Date().toISOString(),
    database: 'PostgreSQL (Prisma)',
    isolation: 'Tenant ID Scoped',
  },
}

export default function DeveloperDashboardPage() {
  const { user, loading } = useAuth()
  const router = useRouter()

  const [barbershops, setBarbershops] = useState<BarbershopData[]>([])
  const [metrics, setMetrics] = useState<PlatformMetrics>(initialMetrics)
  const [isLoading, setIsLoading] = useState(true)
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [searchTerm, setSearchTerm] = useState('')

  // Modal "Detalhes da Empresa"
  const [selectedShopForDetails, setSelectedShopForDetails] = useState<BarbershopData | null>(null)
  const [isUpdatingContract, setIsUpdatingContract] = useState(false)
  const [contractEditDate, setContractEditDate] = useState('')

  // Abas de filtro de tenants
  const [filterTab, setFilterTab] = useState<'ALL' | 'PENDING' | 'ACTIVE' | 'INACTIVE'>('ALL')

  // Modal "Análise e Aprovação de Cadastro"
  const [selectedShopForApproval, setSelectedShopForApproval] = useState<BarbershopData | null>(null)
  const [isProcessingApproval, setIsProcessingApproval] = useState(false)
  const [approvalFormData, setApprovalFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    adminName: '',
    adminEmail: '',
    adminPhone: '',
    contractExpiresAt: '',
  })

  // Modal "+ Nova Empresa"
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isSubmittingShop, setIsSubmittingShop] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    adminName: '',
    adminEmail: '',
    adminPassword: '',
    adminPhone: '',
    contractExpiresAt: '',
  })

  useEffect(() => {
    if (!loading) {
      if (!user || user.role !== 'DEVELOPER') {
        router.push('/dashboard')
        return
      }
      loadData()
    }
  }, [user, loading, router])

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const searchParams = new URLSearchParams(window.location.search)
      if (
        searchParams.get('action') === 'new' ||
        searchParams.get('novo') === 'true' ||
        searchParams.get('modal') === 'true'
      ) {
        setFormError(null)
        setIsAddModalOpen(true)
      }
    }
  }, [])

  const loadData = async () => {
    setIsLoading(true)
    try {
      const [shopsRes, metricsRes] = await Promise.all([
        fetch('/api/developer/barbershops', {
          headers: getAuthHeaders(),
          credentials: 'include',
        }),
        fetch('/api/developer/metrics', {
          headers: getAuthHeaders(),
          credentials: 'include',
        }),
      ])

      if (!shopsRes.ok || !metricsRes.ok) {
        throw new Error('Falha ao obter dados da plataforma')
      }

      const shopsData = await shopsRes.json()
      const metricsData = await metricsRes.json()

      if (Array.isArray(shopsData)) {
        setBarbershops(shopsData)
      }
      if (metricsData && metricsData.tenants) {
        setMetrics(metricsData)
      }
    } catch (err) {
      console.error('Erro ao carregar dados do painel developer:', err)
      setMessage({ type: 'error', text: 'Não foi possível carregar as informações do sistema' })
    } finally {
      setIsLoading(false)
    }
  }

  const handleInputChange = (field: string, value: string) => {
    let formatted = value

    if (field === 'phone' || field === 'adminPhone') {
      formatted = maskPhone(value)
    } else if (field === 'email' || field === 'adminEmail') {
      formatted = maskEmail(value)
    } else if (field === 'adminName') {
      formatted = maskName(value)
    }

    setFormData((prev) => ({ ...prev, [field]: formatted }))
  }

  const handleCreateBarbershop = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)

    const trimmedShopName = formData.name.trim()
    const trimmedShopEmail = formData.email.trim()
    const trimmedAdminName = formData.adminName.trim()
    const trimmedAdminEmail = formData.adminEmail.trim()
    const trimmedPassword = formData.adminPassword.trim()

    // 1. Validação de campos obrigatórios
    if (
      !trimmedShopName ||
      !trimmedShopEmail ||
      !trimmedAdminName ||
      !trimmedAdminEmail ||
      !trimmedPassword
    ) {
      setFormError('Por favor, preencha todos os campos obrigatórios marcados com (*).')
      return
    }

    // 2. Validação do nome da unidade
    if (trimmedShopName.length < 3) {
      setFormError('O nome da empresa deve ter pelo menos 3 caracteres.')
      return
    }

    // 3. Validação do email comercial da empresa
    const emailRegex = /^[a-z0-9._%+\-]+@[a-z0-9.-]+\.[a-z]{2,}$/i
    if (!emailRegex.test(trimmedShopEmail)) {
      setFormError('O email comercial informado é inválido. Ex: contato@empresa.com')
      return
    }

    // 4. Validação do telefone da empresa (se preenchido)
    if (formData.phone) {
      const phoneDigits = formData.phone.replace(/\D/g, '')
      if (phoneDigits.length < 10 || phoneDigits.length > 11) {
        setFormError('Informe um telefone comercial válido com DDD no formato (00) 00000-0000.')
        return
      }
    }

    // 5. Validação do nome do administrador
    if (trimmedAdminName.length < 3) {
      setFormError('O nome do administrador deve ter pelo menos 3 caracteres.')
      return
    }

    // 6. Validação do email do administrador
    if (!emailRegex.test(trimmedAdminEmail)) {
      setFormError('O email de acesso do administrador é inválido. Ex: admin@empresa.com')
      return
    }

    // 7. Validação da senha provisória
    if (trimmedPassword.length < 6) {
      setFormError('A senha do administrador deve ter no mínimo 6 caracteres.')
      return
    }

    // 8. Validação do telefone do administrador (se preenchido)
    if (formData.adminPhone) {
      const adminPhoneDigits = formData.adminPhone.replace(/\D/g, '')
      if (adminPhoneDigits.length < 10 || adminPhoneDigits.length > 11) {
        setFormError('Informe um telefone do administrador válido com DDD no formato (00) 00000-0000.')
        return
      }
    }

    setIsSubmittingShop(true)
    try {
      const res = await fetch('/api/developer/barbershops', {
        method: 'POST',
        headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
        credentials: 'include',
        body: JSON.stringify(formData),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Erro ao cadastrar nova empresa')
      }

      setMessage({
        type: 'success',
        text: `Empresa "${formData.name}" e administrador "${formData.adminName}" cadastrados com sucesso!`,
      })

      setIsAddModalOpen(false)
      setFormData({
        name: '',
        email: '',
        phone: '',
        address: '',
        adminName: '',
        adminEmail: '',
        adminPassword: '',
        adminPhone: '',
        contractExpiresAt: '',
      })

      await loadData()
    } catch (err: any) {
      setFormError(err.message || 'Erro inesperado ao cadastrar empresa.')
    } finally {
      setIsSubmittingShop(false)
    }
  }

  const getContractStatus = (contractExpiresAt: string | null) => {
    if (!contractExpiresAt) {
      return {
        label: 'Vitalício',
        color: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
        isExpired: false,
        daysRemaining: null,
      }
    }

    const now = new Date()
    const expDate = new Date(contractExpiresAt)
    const diffTime = expDate.getTime() - now.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays < 0) {
      return {
        label: `Expirado (${expDate.toLocaleDateString('pt-BR')})`,
        color: 'bg-red-500/20 text-red-400 border border-red-500/30',
        isExpired: true,
        daysRemaining: diffDays,
      }
    } else if (diffDays <= 15) {
      return {
        label: `Expira em ${diffDays}d (${expDate.toLocaleDateString('pt-BR')})`,
        color: 'bg-amber-500/20 text-amber-400 border border-amber-500/30',
        isExpired: false,
        daysRemaining: diffDays,
      }
    } else {
      return {
        label: `Até ${expDate.toLocaleDateString('pt-BR')}`,
        color: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
        isExpired: false,
        daysRemaining: diffDays,
      }
    }
  }

  const handleOpenDetails = (shop: BarbershopData) => {
    setSelectedShopForDetails(shop)
    if (shop.contractExpiresAt) {
      const d = new Date(shop.contractExpiresAt)
      setContractEditDate(d.toISOString().split('T')[0])
    } else {
      setContractEditDate('')
    }
  }

  const handleUpdateContract = async () => {
    if (!selectedShopForDetails) return
    setIsUpdatingContract(true)
    try {
      const res = await fetch('/api/developer/barbershops', {
        method: 'PATCH',
        headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
        credentials: 'include',
        body: JSON.stringify({
          id: selectedShopForDetails.id,
          contractExpiresAt: contractEditDate ? new Date(contractEditDate).toISOString() : null,
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Erro ao atualizar contrato')
      }

      const updated = await res.json()
      setBarbershops((prev) =>
        prev.map((s) => (s.id === updated.id ? { ...s, contractExpiresAt: updated.contractExpiresAt } : s))
      )
      setSelectedShopForDetails((prev) =>
        prev ? { ...prev, contractExpiresAt: updated.contractExpiresAt } : null
      )
      setMessage({
        type: 'success',
        text: `Vencimento do contrato de "${selectedShopForDetails.name}" atualizado com sucesso!`,
      })
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Erro ao atualizar contrato' })
    } finally {
      setIsUpdatingContract(false)
    }
  }

  const toggleBarbershopStatus = async (shop: BarbershopData) => {
    setActionLoadingId(shop.id)
    setMessage(null)
    try {
      const res = await fetch('/api/developer/barbershops', {
        method: 'PATCH',
        headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
        credentials: 'include',
        body: JSON.stringify({
          id: shop.id,
          isActive: !shop.isActive,
        }),
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || 'Erro ao atualizar empresa')
      }

      const updated = await res.json()
      setBarbershops((prev) =>
        prev.map((s) => (s.id === updated.id ? { ...s, isActive: updated.isActive } : s))
      )

      setMessage({
        type: 'success',
        text: `Empresa "${shop.name}" ${updated.isActive ? 'ativada' : 'desativada'} com sucesso.`,
      })
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Erro ao alterar status' })
    } finally {
      setActionLoadingId(null)
    }
  }

  const handleOpenApprovalModal = (shop: BarbershopData) => {
    setSelectedShopForApproval(shop)
    const admin = shop.users?.[0]
    setApprovalFormData({
      name: shop.name || '',
      email: shop.email || '',
      phone: shop.phone || '',
      address: shop.address || '',
      adminName: admin?.name || '',
      adminEmail: admin?.email || '',
      adminPhone: admin?.phone || '',
      contractExpiresAt: shop.contractExpiresAt
        ? new Date(shop.contractExpiresAt).toISOString().split('T')[0]
        : '',
    })
  }

  const handleApprovalInputChange = (field: string, value: string) => {
    let formatted = value
    if (field === 'phone' || field === 'adminPhone') {
      formatted = maskPhone(value)
    } else if (field === 'email' || field === 'adminEmail') {
      formatted = maskEmail(value)
    } else if (field === 'adminName') {
      formatted = maskName(value)
    }
    setApprovalFormData((prev) => ({ ...prev, [field]: formatted }))
  }

  const handleProcessApproval = async (status: 'APPROVED' | 'REJECTED' | 'SAVE') => {
    if (!selectedShopForApproval) return
    setIsProcessingApproval(true)
    setMessage(null)

    try {
      const payload: any = {
        id: selectedShopForApproval.id,
        name: approvalFormData.name.trim(),
        email: approvalFormData.email.trim(),
        phone: approvalFormData.phone.trim() || null,
        address: approvalFormData.address.trim() || null,
        adminName: approvalFormData.adminName.trim() || undefined,
        adminEmail: approvalFormData.adminEmail.trim() || undefined,
        adminPhone: approvalFormData.adminPhone.trim() || undefined,
        contractExpiresAt: approvalFormData.contractExpiresAt
          ? new Date(approvalFormData.contractExpiresAt).toISOString()
          : null,
      }

      if (status === 'APPROVED' || status === 'REJECTED') {
        payload.status = status
      }

      const res = await fetch('/api/developer/barbershops', {
        method: 'PATCH',
        headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
        credentials: 'include',
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || 'Erro ao processar estabelecimento')
      }

      const updated = await res.json()

      setBarbershops((prev) =>
        prev.map((s) => {
          if (s.id === updated.id) {
            return {
              ...s,
              ...updated,
              users: updated.users || s.users,
            }
          }
          return s
        })
      )

      if (status === 'APPROVED') {
        setMessage({
          type: 'success',
          text: `Estabelecimento "${updated.name}" foi APROVADO com sucesso! Acesso liberado para o administrador.`,
        })
      } else if (status === 'REJECTED') {
        setMessage({
          type: 'success',
          text: `Cadastro do estabelecimento "${updated.name}" foi REJEITADO.`,
        })
      } else {
        setMessage({
          type: 'success',
          text: `Dados do estabelecimento "${updated.name}" atualizados com sucesso!`,
        })
      }

      setSelectedShopForApproval(null)
    } catch (err: any) {
      console.error('Erro ao processar aprovação:', err)
      setMessage({
        type: 'error',
        text: err?.message || 'Erro ao processar solicitação',
      })
    } finally {
      setIsProcessingApproval(false)
    }
  }

  const pendingCount = barbershops.filter((s) => s.status === 'PENDING').length
  const activeCount = barbershops.filter((s) => s.isActive && s.status !== 'PENDING').length
  const inactiveCount = barbershops.filter(
    (s) => (!s.isActive && s.status !== 'PENDING') || s.status === 'REJECTED'
  ).length

  const filteredBarbershops = barbershops.filter((shop) => {
    if (filterTab === 'PENDING' && shop.status !== 'PENDING') return false
    if (filterTab === 'ACTIVE' && (!shop.isActive || shop.status === 'PENDING')) return false
    if (filterTab === 'INACTIVE' && shop.isActive && shop.status !== 'REJECTED') return false

    const q = searchTerm.toLowerCase().trim()
    if (!q) return true
    return (
      shop.name.toLowerCase().includes(q) ||
      shop.email.toLowerCase().includes(q) ||
      (shop.address && shop.address.toLowerCase().includes(q))
    )
  })

  if (loading || (user && user.role !== 'DEVELOPER')) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center text-white">
        <RefreshCw className="h-8 w-8 animate-spin text-amber-500" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 flex flex-col">
      <DropdownHeader />

      <main className="flex-1 pt-24 pb-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        {/* Top Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-gray-800 pb-6 mb-8">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                DEVELOPER ADMIN
              </span>
              <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                Gestão da Plataforma SaaS
              </h1>
            </div>
            <p className="text-gray-400 text-sm mt-1">
              Painel técnico de controle de tenants, isolamento multi-tenant e administração da plataforma.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setFormError(null)
                setIsAddModalOpen(true)
              }}
              className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-black font-semibold rounded-lg text-sm shadow-lg shadow-amber-500/20 transition-all hover:scale-[1.02]"
            >
              <Plus className="h-4 w-4 stroke-[2.5]" />
              Nova Empresa
            </button>

            <button
              onClick={loadData}
              disabled={isLoading}
              className="flex items-center gap-2 px-4 py-2.5 bg-gray-900 border border-gray-700 hover:border-gray-500 rounded-lg text-sm font-medium transition text-gray-200 hover:text-white"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              Atualizar
            </button>
          </div>
        </div>

        {/* Feedback Alert */}
        {message && (
          <div
            className={`mb-6 p-4 rounded-lg flex items-center justify-between gap-3 border ${
              message.type === 'success'
                ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300'
                : 'bg-red-950/40 border-red-500/30 text-red-300'
            }`}
          >
            <div className="flex items-center gap-3">
              {message.type === 'success' ? (
                <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-red-400 shrink-0" />
              )}
              <span className="text-sm font-medium">{message.text}</span>
            </div>
            <button
              onClick={() => setMessage(null)}
              className="text-gray-400 hover:text-white transition"
              aria-label="Fechar mensagem"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Metrics Grid (Platform / Technical Metrics Only - Zero Operational Appointments) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-gray-900/60 border border-gray-800 p-5 rounded-xl backdrop-blur-sm">
            <div className="flex items-center justify-between text-gray-400 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Empresas (Tenants)</span>
              <Building2 className="h-5 w-5 text-amber-400" />
            </div>
            <div className="text-3xl font-bold text-white">
              {metrics?.tenants?.total ?? 0}
            </div>
            <div className="text-xs text-gray-400 mt-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-emerald-400 font-medium">{activeCount} ativas</span>
                <span>•</span>
                <span className="text-red-400 font-medium">{inactiveCount} inativas</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setFormError(null)
                  setIsAddModalOpen(true)
                }}
                className="text-amber-400 hover:text-amber-300 font-medium text-xs flex items-center gap-1 transition cursor-pointer hover:underline"
              >
                <Plus className="w-3.5 h-3.5" />
                Criar
              </button>
            </div>
            {pendingCount > 0 && (
              <button
                type="button"
                onClick={() => setFilterTab('PENDING')}
                className="mt-2 text-xs font-semibold text-amber-400 hover:text-amber-300 flex items-center gap-1.5 transition cursor-pointer hover:underline"
              >
                <Clock className="w-3.5 h-3.5 animate-pulse" />
                <span>{pendingCount} aguardando aprovação</span>
              </button>
            )}
          </div>

          <div className="bg-gray-900/60 border border-gray-800 p-5 rounded-xl backdrop-blur-sm">
            <div className="flex items-center justify-between text-gray-400 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Usuários da Plataforma</span>
              <Users className="h-5 w-5 text-blue-400" />
            </div>
            <div className="text-3xl font-bold text-white">
              {metrics?.users?.total ?? 0}
            </div>
            <div className="text-xs text-gray-400 mt-2 flex items-center gap-2">
              <span className="text-gray-300 font-medium">{metrics?.users?.byRole?.['ADMIN'] ?? 0} admins</span>
              <span>•</span>
              <span className="text-gray-300 font-medium">{metrics?.users?.byRole?.['BARBER'] ?? 0} profissionais</span>
            </div>
          </div>

          <div className="bg-gray-900/60 border border-gray-800 p-5 rounded-xl backdrop-blur-sm">
            <div className="flex items-center justify-between text-gray-400 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Base de Clientes</span>
              <ShieldCheck className="h-5 w-5 text-purple-400" />
            </div>
            <div className="text-3xl font-bold text-white">
              {metrics?.clients?.total ?? 0}
            </div>
            <div className="text-xs text-gray-400 mt-2">
              Cadastros registrados nos tenants
            </div>
          </div>

          <div className="bg-gray-900/60 border border-gray-800 p-5 rounded-xl backdrop-blur-sm">
            <div className="flex items-center justify-between text-gray-400 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Serviços no Catálogo</span>
              <Briefcase className="h-5 w-5 text-emerald-400" />
            </div>
            <div className="text-3xl font-bold text-white">
              {metrics?.services?.total ?? 0}
            </div>
            <div className="text-xs text-emerald-400 mt-2">
              Serviços configurados pelas empresas
            </div>
          </div>
        </div>

        {/* Tenants Table */}
        <div className="bg-gray-900/50 border border-gray-800 rounded-xl overflow-hidden shadow-xl mb-8">
          <div className="p-5 border-b border-gray-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-amber-400" />
                <h2 className="text-lg font-semibold text-white">Tenants Cadastrados</h2>
              </div>
              <p className="text-xs text-gray-400 mt-0.5">Controle de acesso, isolamento de dados e ativação de unidades</p>
            </div>
            
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar empresa..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 pr-3 py-2 bg-gray-950/80 border border-gray-700 rounded-lg text-xs text-white placeholder-gray-500 focus:outline-none focus:border-amber-500 w-44 sm:w-56"
                />
              </div>

              <button
                type="button"
                onClick={() => {
                  setFormError(null)
                  setIsAddModalOpen(true)
                }}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-black font-semibold rounded-lg text-xs shadow-md shadow-amber-500/20 transition-all hover:scale-[1.02] cursor-pointer"
              >
                <Plus className="h-4 w-4 stroke-[2.5]" />
                Cadastrar Empresa
              </button>

              <span className="text-xs text-gray-400 hidden lg:inline-block">
                Total: <strong className="text-white">{filteredBarbershops.length}</strong>
              </span>
            </div>
          </div>

          {/* Sub-menu / Abas de Filtro de Tenants */}
          <div className="px-5 py-2.5 bg-gray-950/40 border-b border-gray-800/80 flex items-center gap-2 overflow-x-auto">
            <button
              type="button"
              onClick={() => setFilterTab('ALL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer flex items-center gap-1.5 ${
                filterTab === 'ALL'
                  ? 'bg-amber-500 text-black font-semibold shadow-sm'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
              }`}
            >
              <span>Todos</span>
              <span
                className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                  filterTab === 'ALL' ? 'bg-black/20 text-black font-bold' : 'bg-gray-800 text-gray-300'
                }`}
              >
                {barbershops.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setFilterTab('PENDING')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer flex items-center gap-1.5 ${
                filterTab === 'PENDING'
                  ? 'bg-amber-500 text-black font-semibold shadow-sm'
                  : 'text-amber-400 hover:text-amber-300 hover:bg-amber-500/10'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Aguardando Aprovação</span>
              {pendingCount > 0 ? (
                <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-400 text-black animate-pulse">
                  {pendingCount}
                </span>
              ) : (
                <span
                  className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                    filterTab === 'PENDING' ? 'bg-black/20 text-black font-bold' : 'bg-gray-800 text-gray-300'
                  }`}
                >
                  0
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setFilterTab('ACTIVE')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer flex items-center gap-1.5 ${
                filterTab === 'ACTIVE'
                  ? 'bg-amber-500 text-black font-semibold shadow-sm'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Ativos / Aprovados</span>
              <span
                className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                  filterTab === 'ACTIVE' ? 'bg-black/20 text-black font-bold' : 'bg-gray-800 text-gray-300'
                }`}
              >
                {activeCount}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setFilterTab('INACTIVE')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer flex items-center gap-1.5 ${
                filterTab === 'INACTIVE'
                  ? 'bg-amber-500 text-black font-semibold shadow-sm'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
              }`}
            >
              <Power className="w-3.5 h-3.5" />
              <span>Inativos / Rejeitados</span>
              <span
                className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                  filterTab === 'INACTIVE' ? 'bg-black/20 text-black font-bold' : 'bg-gray-800 text-gray-300'
                }`}
              >
                {inactiveCount}
              </span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-gray-900/80 text-gray-400 border-b border-gray-800">
                  <th className="py-3.5 px-4 font-semibold">Empresa</th>
                  <th className="py-3.5 px-4 font-semibold">Cadastrado em</th>
                  <th className="py-3.5 px-4 font-semibold">Contrato</th>
                  <th className="py-3.5 px-4 font-semibold">Contato</th>
                  <th className="py-3.5 px-4 font-semibold text-center">Equipe</th>
                  <th className="py-3.5 px-4 font-semibold text-center">Clientes</th>
                  <th className="py-3.5 px-4 font-semibold text-center">Serviços</th>
                  <th className="py-3.5 px-4 font-semibold text-center">Status</th>
                  <th className="py-3.5 px-4 font-semibold text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/60">
                {filteredBarbershops.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-gray-500">
                      <div className="flex flex-col items-center justify-center gap-3 max-w-sm mx-auto">
                        <div className="w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                          <Building2 className="w-6 h-6 text-amber-400" />
                        </div>
                        <p className="text-sm font-medium text-gray-300">
                          {searchTerm
                            ? 'Nenhuma empresa encontrada para o termo pesquisado.'
                            : 'Nenhuma empresa cadastrada no sistema.'}
                        </p>
                        <p className="text-xs text-gray-500">
                          {searchTerm
                            ? 'Verifique os termos digitados ou limpe a busca.'
                            : 'Comece criando o primeiro tenant da sua plataforma SaaS com o administrador da unidade.'}
                        </p>
                        {!searchTerm && (
                          <button
                            type="button"
                            onClick={() => {
                              setFormError(null)
                              setIsAddModalOpen(true)
                            }}
                            className="mt-2 flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-black font-semibold rounded-lg text-xs shadow-lg shadow-amber-500/20 transition hover:scale-105 cursor-pointer"
                          >
                            <Plus className="h-4 w-4 stroke-[2.5]" />
                            Cadastrar Primeira Empresa
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredBarbershops.map((shop) => (
                    <tr key={shop.id} className="hover:bg-gray-800/30 transition">
                      <td className="py-4 px-4">
                        <div className="font-semibold text-white">{shop.name}</div>
                        <div className="text-xs text-gray-500 font-mono">ID: {shop.id}</div>
                        {shop.creator && (
                          <div className="text-[11px] text-amber-400/80 mt-0.5 flex items-center gap-1">
                            <Crown className="w-3 h-3 text-amber-400" /> Por: {shop.creator.name}
                          </div>
                        )}
                      </td>
                      <td className="py-4 px-4 whitespace-nowrap text-xs text-gray-300">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-gray-500" />
                          {new Date(shop.createdAt).toLocaleDateString('pt-BR')}
                        </div>
                      </td>
                      <td className="py-4 px-4 whitespace-nowrap">
                        {(() => {
                          const status = getContractStatus(shop.contractExpiresAt)
                          return (
                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border ${status.color}`}>
                              <CalendarClock className="w-3.5 h-3.5" />
                              {status.label}
                            </span>
                          )
                        })()}
                      </td>
                      <td className="py-4 px-4">
                        <div className="text-gray-300 text-xs">{shop.email}</div>
                        <div className="text-xs text-gray-500">{shop.phone || 'Sem telefone'}</div>
                      </td>
                      <td className="py-4 px-4 text-center font-medium text-gray-200">
                        {shop._count?.users ?? 0}
                      </td>
                      <td className="py-4 px-4 text-center font-medium text-gray-200">
                        {shop._count?.clients ?? 0}
                      </td>
                      <td className="py-4 px-4 text-center font-medium text-gray-200">
                        {shop._count?.services ?? 0}
                      </td>
                      <td className="py-4 px-4 text-center">
                        {shop.status === 'PENDING' ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30 animate-pulse">
                            <Clock className="w-3.5 h-3.5" />
                            Aguardando Aprovação
                          </span>
                        ) : shop.status === 'REJECTED' ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-500/10 text-red-400 border border-red-500/20">
                            <X className="w-3.5 h-3.5" />
                            Rejeitado
                          </span>
                        ) : (
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                              shop.isActive
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                : 'bg-red-500/10 text-red-400 border border-red-500/20'
                            }`}
                          >
                            <span
                              className={`h-1.5 w-1.5 rounded-full ${
                                shop.isActive ? 'bg-emerald-400' : 'bg-red-400'
                              }`}
                            />
                            {shop.isActive ? 'Ativa' : 'Desativada'}
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {shop.status === 'PENDING' ? (
                            <button
                              type="button"
                              onClick={() => handleOpenApprovalModal(shop)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-black shadow-md shadow-amber-500/20 transition hover:scale-[1.02] cursor-pointer"
                              title="Analisar solicitação de cadastro e aprovar"
                            >
                              <ShieldCheck className="h-3.5 w-3.5 stroke-[2.5]" />
                              Analisar / Aprovar
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleOpenDetails(shop)}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border border-blue-800/80 bg-blue-950/20 text-blue-400 hover:bg-blue-900/30 transition cursor-pointer"
                              title="Ver Detalhes da Empresa"
                            >
                              <Info className="h-3.5 w-3.5" />
                              Ver Detalhes
                            </button>
                          )}

                          {shop.status !== 'PENDING' && (
                            <button
                              onClick={() => toggleBarbershopStatus(shop)}
                              disabled={actionLoadingId === shop.id}
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition ${
                                shop.isActive
                                  ? 'border-red-800/80 bg-red-950/20 text-red-400 hover:bg-red-900/30'
                                  : 'border-emerald-800/80 bg-emerald-950/20 text-emerald-400 hover:bg-emerald-900/30'
                              } disabled:opacity-50 cursor-pointer`}
                            >
                              <Power className="h-3.5 w-3.5" />
                              {actionLoadingId === shop.id
                                ? 'Alterando...'
                                : shop.isActive
                                ? 'Desativar'
                                : 'Ativar'}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* System Diagnostics Card */}
        <div className="bg-gray-900/40 border border-gray-800 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Server className="h-5 w-5 text-amber-400" />
            <h3 className="font-semibold text-white text-base">Diagnóstico de Infraestrutura SaaS</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs text-gray-400">
            <div className="p-3 bg-gray-950/60 rounded-lg border border-gray-800">
              <span className="text-gray-500 block mb-1">Ambiente de Execução:</span>
              <span className="font-mono text-gray-200 font-semibold">{metrics?.system?.nodeEnv || 'development'}</span>
            </div>
            <div className="p-3 bg-gray-950/60 rounded-lg border border-gray-800">
              <span className="text-gray-500 block mb-1">Banco de Dados:</span>
              <span className="font-mono text-gray-200 font-semibold">{metrics?.system?.database || 'PostgreSQL (Prisma)'}</span>
            </div>
            <div className="p-3 bg-gray-950/60 rounded-lg border border-gray-800">
              <span className="text-gray-500 block mb-1">Isolamento Multi-Tenant:</span>
              <span className="font-mono text-emerald-400 font-semibold">{metrics?.system?.isolation || 'ATIVO E BLINDADO'}</span>
            </div>
          </div>
        </div>
      </main>

      {/* Modal "+ Nova Empresa" */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl relative my-8 animate-in fade-in duration-200">
            <div className="flex items-center justify-between border-b border-gray-800 pb-4 mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Cadastrar Nova Empresa</h3>
                  <p className="text-xs text-gray-400">Criar um novo tenant com seu administrador inicial</p>
                </div>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                disabled={isSubmittingShop}
                className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-gray-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="mb-6 p-4 rounded-lg bg-red-950/40 border border-red-500/30 text-red-300 flex items-center gap-3 text-sm">
                <AlertTriangle className="h-5 w-5 text-red-400 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleCreateBarbershop} className="space-y-6">
              {/* Seção 1: Dados da Empresa */}
              <div>
                <h4 className="text-xs font-semibold text-amber-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Building2 className="w-4 h-4" />
                  1. Dados da Unidade (Tenant)
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-gray-300 mb-1.5">
                      Nome da Empresa *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: Minha Empresa Ltda"
                      value={formData.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-gray-950 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-amber-500 transition"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-300 mb-1.5">
                      Email Comercial *
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="email"
                        required
                        placeholder="contato@empresa.com"
                        value={formData.email}
                        onChange={(e) => handleInputChange('email', e.target.value)}
                        className="w-full pl-9 pr-3.5 py-2.5 bg-gray-950 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-amber-500 transition"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-medium text-gray-300">
                        Telefone / WhatsApp
                      </label>
                      <span className="text-[10px] font-mono text-amber-400/80">(00) 00000-0000</span>
                    </div>
                    <div className="relative">
                      <Phone className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="tel"
                        maxLength={15}
                        placeholder="(11) 98765-4321"
                        value={formData.phone}
                        onChange={(e) => handleInputChange('phone', e.target.value)}
                        className="w-full pl-9 pr-3.5 py-2.5 bg-gray-950 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-amber-500 transition font-mono"
                      />
                    </div>
                  </div>

                  <div className="sm:col-span-2">
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-medium text-gray-300">
                        Endereço Completo
                      </label>
                      <span className="text-[10px] text-amber-400/90 font-medium">
                        ✦ Digite para sugerir cidades do Brasil
                      </span>
                    </div>
                    <AddressAutocomplete
                      id="shop-address"
                      value={formData.address}
                      onChange={(val) => setFormData((prev) => ({ ...prev, address: val }))}
                      placeholder="Ex: Av. Paulista, 1000 - São Paulo, SP (ou digite a cidade)"
                    />
                  </div>

                  {/* Vigência do Contrato */}
                  <div className="sm:col-span-2 border-t border-gray-800/80 pt-3">
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-medium text-amber-300 flex items-center gap-1.5">
                        <CalendarClock className="w-4 h-4 text-amber-400" />
                        Vigência / Vencimento do Contrato
                      </label>
                      <span className="text-[10px] text-gray-400">
                        Opcional (Deixe em branco para vitalício)
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <button
                        type="button"
                        onClick={() => {
                          const d = new Date()
                          d.setDate(d.getDate() + 30)
                          setFormData(prev => ({ ...prev, contractExpiresAt: d.toISOString().split('T')[0] }))
                        }}
                        className="px-2 py-1 text-xs rounded bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-700 transition cursor-pointer"
                      >
                        +30 dias
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const d = new Date()
                          d.setDate(d.getDate() + 90)
                          setFormData(prev => ({ ...prev, contractExpiresAt: d.toISOString().split('T')[0] }))
                        }}
                        className="px-2 py-1 text-xs rounded bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-700 transition cursor-pointer"
                      >
                        +90 dias (3m)
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const d = new Date()
                          d.setDate(d.getDate() + 180)
                          setFormData(prev => ({ ...prev, contractExpiresAt: d.toISOString().split('T')[0] }))
                        }}
                        className="px-2 py-1 text-xs rounded bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-700 transition cursor-pointer"
                      >
                        +180 dias (6m)
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const d = new Date()
                          d.setDate(d.getDate() + 365)
                          setFormData(prev => ({ ...prev, contractExpiresAt: d.toISOString().split('T')[0] }))
                        }}
                        className="px-2 py-1 text-xs rounded bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-700 transition cursor-pointer"
                      >
                        +365 dias (1 ano)
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setFormData(prev => ({ ...prev, contractExpiresAt: '' }))
                        }}
                        className="px-2 py-1 text-xs rounded bg-emerald-950/40 hover:bg-emerald-900/40 text-emerald-400 border border-emerald-800/60 transition cursor-pointer"
                      >
                        Vitalício (Sem vencimento)
                      </button>
                    </div>

                    <div className="relative">
                      <Calendar className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="date"
                        value={formData.contractExpiresAt}
                        onChange={(e) => setFormData(prev => ({ ...prev, contractExpiresAt: e.target.value }))}
                        className="w-full pl-9 pr-3.5 py-2.5 bg-gray-950 border border-gray-700 rounded-lg text-sm text-white focus:outline-none focus:border-amber-500 transition"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Seção 2: Administrador Inicial */}
              <div className="border-t border-gray-800 pt-5">
                <h4 className="text-xs font-semibold text-blue-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <UserCheck className="w-4 h-4" />
                  2. Administrador Inicial da Empresa
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-300 mb-1.5">
                      Nome do Administrador *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: Pedro Silva"
                      value={formData.adminName}
                      onChange={(e) => handleInputChange('adminName', e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-gray-950 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-300 mb-1.5">
                      Email de Acesso do Admin *
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="email"
                        required
                        placeholder="admin@empresa.com"
                        value={formData.adminEmail}
                        onChange={(e) => handleInputChange('adminEmail', e.target.value)}
                        className="w-full pl-9 pr-3.5 py-2.5 bg-gray-950 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-300 mb-1.5">
                      Senha Provisória * (mínimo 6 dígitos)
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="password"
                        required
                        minLength={6}
                        placeholder="••••••••"
                        value={formData.adminPassword}
                        onChange={(e) => handleInputChange('adminPassword', e.target.value)}
                        className="w-full pl-9 pr-3.5 py-2.5 bg-gray-950 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-medium text-gray-300">
                        Telefone do Administrador
                      </label>
                      <span className="text-[10px] font-mono text-blue-400/80">(00) 00000-0000</span>
                    </div>
                    <div className="relative">
                      <Phone className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="tel"
                        maxLength={15}
                        placeholder="(11) 98765-4321"
                        value={formData.adminPhone}
                        onChange={(e) => handleInputChange('adminPhone', e.target.value)}
                        className="w-full pl-9 pr-3.5 py-2.5 bg-gray-950 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition font-mono"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Botões do Formulário */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-800">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  disabled={isSubmittingShop}
                  className="px-4 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-sm font-medium transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingShop}
                  className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-black font-semibold rounded-lg text-sm transition shadow-lg shadow-amber-500/20 disabled:opacity-50 cursor-pointer"
                >
                  {isSubmittingShop ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Cadastrando...
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4 stroke-[2.5]" />
                      Criar Empresa
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal "Detalhes da Empresa" */}
      {selectedShopForDetails && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl max-w-3xl w-full p-6 sm:p-8 shadow-2xl relative my-8 animate-in fade-in duration-200">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-800 pb-4 mb-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                  <Building2 className="w-6 h-6 text-amber-400" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xl font-bold text-white">{selectedShopForDetails.name}</h3>
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                        selectedShopForDetails.isActive
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'bg-red-500/10 text-red-400 border border-red-500/20'
                      }`}
                    >
                      {selectedShopForDetails.isActive ? 'Ativa' : 'Desativada'}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 font-mono mt-0.5">ID: {selectedShopForDetails.id}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedShopForDetails(null)}
                className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-gray-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-6 max-h-[72vh] overflow-y-auto pr-1">
              {/* Card 1: Registro & Origem */}
              <div className="bg-gray-950/60 border border-gray-800 rounded-xl p-4 sm:p-5">
                <h4 className="text-xs font-semibold text-amber-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Informações de Cadastro
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-gray-500 block mb-1">Data e Hora do Cadastro:</span>
                    <span className="text-gray-200 font-medium text-sm flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-amber-400" />
                      {new Date(selectedShopForDetails.createdAt).toLocaleString('pt-BR')}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500 block mb-1">Cadastrado por:</span>
                    {selectedShopForDetails.creator ? (
                      <div className="text-gray-200">
                        <span className="font-semibold text-amber-300 flex items-center gap-1">
                          <Crown className="w-3.5 h-3.5" />
                          {selectedShopForDetails.creator.name}
                        </span>
                        <span className="text-gray-400 text-[11px]">{selectedShopForDetails.creator.email}</span>
                      </div>
                    ) : (
                      <span className="text-gray-400 italic">Sistema / Registro Direto</span>
                    )}
                  </div>
                  <div>
                    <span className="text-gray-500 block mb-1">Email Comercial:</span>
                    <span className="text-gray-200 font-mono">{selectedShopForDetails.email}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 block mb-1">Telefone da Unidade:</span>
                    <span className="text-gray-200 font-mono">{selectedShopForDetails.phone || 'Não informado'}</span>
                  </div>
                  <div className="sm:col-span-2">
                    <span className="text-gray-500 block mb-1">Endereço:</span>
                    <span className="text-gray-200">{selectedShopForDetails.address || 'Não informado'}</span>
                  </div>
                </div>
              </div>

              {/* Card 2: Contrato & Vigência */}
              <div className="bg-gray-950/60 border border-gray-800 rounded-xl p-4 sm:p-5">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
                  <h4 className="text-xs font-semibold text-emerald-400 uppercase tracking-wider flex items-center gap-2">
                    <CalendarClock className="w-4 h-4" />
                    Contrato & Vigência da Licença
                  </h4>
                  {(() => {
                    const status = getContractStatus(selectedShopForDetails.contractExpiresAt)
                    return (
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${status.color}`}>
                        <CalendarClock className="w-3.5 h-3.5" />
                        Status: {status.label}
                      </span>
                    )
                  })()}
                </div>

                <p className="text-xs text-gray-400 mb-4">
                  {selectedShopForDetails.contractExpiresAt
                    ? `O contrato desta unidade expira em ${new Date(selectedShopForDetails.contractExpiresAt).toLocaleDateString('pt-BR')}. Você pode estender ou renovar o prazo abaixo.`
                    : 'Esta unidade possui contrato vitalício / sem data de expiração cadastrada.'}
                </p>

                {/* Formulário de Renovação / Alteração */}
                <div className="bg-gray-900/80 border border-gray-800 rounded-lg p-3.5">
                  <label className="block text-xs font-medium text-gray-300 mb-2">
                    Alterar / Renovar Data de Expiração do Contrato:
                  </label>

                  <div className="flex flex-wrap items-center gap-2 mb-3">
                    <button
                      type="button"
                      onClick={() => {
                        const d = new Date()
                        d.setDate(d.getDate() + 30)
                        setContractEditDate(d.toISOString().split('T')[0])
                      }}
                      className="px-2 py-1 text-xs rounded bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-700 transition cursor-pointer"
                    >
                      +30 dias
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const d = new Date()
                        d.setDate(d.getDate() + 90)
                        setContractEditDate(d.toISOString().split('T')[0])
                      }}
                      className="px-2 py-1 text-xs rounded bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-700 transition cursor-pointer"
                    >
                      +90 dias (3m)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const d = new Date()
                        d.setDate(d.getDate() + 180)
                        setContractEditDate(d.toISOString().split('T')[0])
                      }}
                      className="px-2 py-1 text-xs rounded bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-700 transition cursor-pointer"
                    >
                      +180 dias (6m)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const d = new Date()
                        d.setDate(d.getDate() + 365)
                        setContractEditDate(d.toISOString().split('T')[0])
                      }}
                      className="px-2 py-1 text-xs rounded bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-700 transition cursor-pointer"
                    >
                      +365 dias (1 ano)
                    </button>
                    <button
                      type="button"
                      onClick={() => setContractEditDate('')}
                      className="px-2 py-1 text-xs rounded bg-emerald-950/40 hover:bg-emerald-900/40 text-emerald-400 border border-emerald-800/60 transition cursor-pointer"
                    >
                      Tornar Vitalício
                    </button>
                  </div>

                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                    <div className="relative flex-1">
                      <Calendar className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="date"
                        value={contractEditDate}
                        onChange={(e) => setContractEditDate(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 bg-gray-950 border border-gray-700 rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500 transition"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleUpdateContract}
                      disabled={isUpdatingContract}
                      className="flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-lg text-xs transition disabled:opacity-50 cursor-pointer shadow-md shadow-emerald-600/20"
                    >
                      {isUpdatingContract ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          Salvando...
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Salvar Vigência
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Card 3: Administrador da Unidade */}
              <div className="bg-gray-950/60 border border-gray-800 rounded-xl p-4 sm:p-5">
                <h4 className="text-xs font-semibold text-blue-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <UserCheck className="w-4 h-4" />
                  Administrador(es) da Unidade
                </h4>

                {(() => {
                  const admins = (selectedShopForDetails.users || []).filter(u => u.role === 'ADMIN')
                  if (admins.length === 0) {
                    return (
                      <p className="text-xs text-gray-500 italic">
                        Nenhum usuário com função de Administrador vinculado a esta empresa.
                      </p>
                    )
                  }
                  return (
                    <div className="space-y-3">
                      {admins.map((adm) => (
                        <div key={adm.id} className="p-3 bg-gray-900/90 border border-gray-800 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                          <div>
                            <div className="font-semibold text-white text-sm flex items-center gap-2">
                              {adm.name}
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${adm.isActive ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                                {adm.isActive ? 'Ativo' : 'Inativo'}
                              </span>
                            </div>
                            <div className="text-gray-400 mt-0.5">{adm.email} • {adm.phone || 'Sem telefone'}</div>
                          </div>
                          <div className="text-right text-gray-500 text-[11px]">
                            Cadastrado em: {new Date(adm.createdAt).toLocaleDateString('pt-BR')}
                          </div>
                        </div>
                      ))}
                    </div>
                  )
                })()}
              </div>

              {/* Card 4: Métricas do Tenant */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3.5 bg-gray-950/60 rounded-xl border border-gray-800 text-center">
                  <div className="text-xl font-bold text-white">{selectedShopForDetails._count?.users ?? 0}</div>
                  <div className="text-[11px] text-gray-400 mt-1">Colaboradores</div>
                </div>
                <div className="p-3.5 bg-gray-950/60 rounded-xl border border-gray-800 text-center">
                  <div className="text-xl font-bold text-white">{selectedShopForDetails._count?.clients ?? 0}</div>
                  <div className="text-[11px] text-gray-400 mt-1">Clientes</div>
                </div>
                <div className="p-3.5 bg-gray-950/60 rounded-xl border border-gray-800 text-center">
                  <div className="text-xl font-bold text-white">{selectedShopForDetails._count?.services ?? 0}</div>
                  <div className="text-[11px] text-gray-400 mt-1">Serviços</div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between pt-5 border-t border-gray-800 mt-6">
              <button
                type="button"
                onClick={() => {
                  toggleBarbershopStatus(selectedShopForDetails)
                  setSelectedShopForDetails((prev) => prev ? { ...prev, isActive: !prev.isActive } : null)
                }}
                disabled={actionLoadingId === selectedShopForDetails.id}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold border transition ${
                  selectedShopForDetails.isActive
                    ? 'border-red-800/80 bg-red-950/20 text-red-400 hover:bg-red-900/30'
                    : 'border-emerald-800/80 bg-emerald-950/20 text-emerald-400 hover:bg-emerald-900/30'
                } disabled:opacity-50 cursor-pointer`}
              >
                <Power className="w-4 h-4" />
                {selectedShopForDetails.isActive ? 'Desativar Unidade' : 'Ativar Unidade'}
              </button>

              <button
                type="button"
                onClick={() => setSelectedShopForDetails(null)}
                className="px-5 py-2 bg-gray-800 hover:bg-gray-700 text-gray-200 rounded-lg text-xs font-semibold transition cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal "Análise e Aprovação de Cadastro" */}
      {selectedShopForApproval && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-gray-900 border border-amber-500/40 rounded-2xl max-w-3xl w-full p-6 sm:p-8 shadow-2xl shadow-amber-500/10 relative my-8 animate-in fade-in duration-200">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-800 pb-4 mb-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                  <ShieldCheck className="w-6 h-6 text-amber-400" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xl font-bold text-white">Análise e Aprovação de Cadastro</h3>
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                      <Clock className="w-3 h-3" />
                      {selectedShopForApproval.status === 'PENDING'
                        ? 'Aguardando Aprovação'
                        : selectedShopForApproval.status === 'REJECTED'
                        ? 'Rejeitado'
                        : 'Aprovado'}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Solicitado em: {new Date(selectedShopForApproval.createdAt).toLocaleString('pt-BR')} &bull; ID: {selectedShopForApproval.id}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedShopForApproval(null)}
                className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-gray-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-1">
              {/* Card 1: Dados do Estabelecimento */}
              <div className="bg-gray-950/60 border border-gray-800 rounded-xl p-4 sm:p-5">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs font-semibold text-amber-400 uppercase tracking-wider flex items-center gap-2">
                    <Building2 className="w-4 h-4" />
                    1. Informações do Estabelecimento (Editáveis)
                  </h4>
                  <span className="text-[11px] text-gray-500">Revise ou complemente antes de aprovar</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="block text-gray-400 mb-1 font-medium">Nome da Empresa:</label>
                    <input
                      type="text"
                      value={approvalFormData.name}
                      onChange={(e) => handleApprovalInputChange('name', e.target.value)}
                      className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-xs text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-gray-400 mb-1 font-medium">E-mail Comercial:</label>
                    <input
                      type="email"
                      value={approvalFormData.email}
                      onChange={(e) => handleApprovalInputChange('email', e.target.value)}
                      className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-gray-400 mb-1 font-medium">Telefone Comercial / WhatsApp:</label>
                    <input
                      type="tel"
                      value={approvalFormData.phone}
                      onChange={(e) => handleApprovalInputChange('phone', e.target.value)}
                      className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-gray-400 mb-1 font-medium">Endereço Completo:</label>
                    <AddressAutocomplete
                      id="approvalAddress"
                      value={approvalFormData.address}
                      onChange={(val) => handleApprovalInputChange('address', val)}
                      placeholder="Rua, número, cidade - UF"
                      className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-xs text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>
              </div>

              {/* Card 2: Administrador Solicitante */}
              <div className="bg-gray-950/60 border border-gray-800 rounded-xl p-4 sm:p-5">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs font-semibold text-blue-400 uppercase tracking-wider flex items-center gap-2">
                    <UserCheck className="w-4 h-4" />
                    2. Dados do Administrador Solicitante
                  </h4>
                  <span className="text-[11px] text-gray-500">Credenciais para acesso à conta de gestão</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                  <div>
                    <label className="block text-gray-400 mb-1 font-medium">Nome do Responsável:</label>
                    <input
                      type="text"
                      value={approvalFormData.adminName}
                      onChange={(e) => handleApprovalInputChange('adminName', e.target.value)}
                      className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-xs text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-gray-400 mb-1 font-medium">E-mail de Login:</label>
                    <input
                      type="email"
                      value={approvalFormData.adminEmail}
                      onChange={(e) => handleApprovalInputChange('adminEmail', e.target.value)}
                      className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-gray-400 mb-1 font-medium">Telefone do Gestor:</label>
                    <input
                      type="tel"
                      value={approvalFormData.adminPhone}
                      onChange={(e) => handleApprovalInputChange('adminPhone', e.target.value)}
                      className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Card 3: Vigência do Contrato Inicial */}
              <div className="bg-gray-950/60 border border-gray-800 rounded-xl p-4 sm:p-5">
                <h4 className="text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                  <CalendarClock className="w-4 h-4" />
                  3. Vigência Inicial do Contrato
                </h4>
                <p className="text-xs text-gray-400 mb-3">
                  Selecione um prazo para a licença inicial da unidade. A empresa e seu administrador serão ativados com essa validade.
                </p>

                <div className="flex flex-wrap items-center gap-2 mb-3">
                  <button
                    type="button"
                    onClick={() => {
                      const d = new Date()
                      d.setDate(d.getDate() + 30)
                      setApprovalFormData((prev) => ({
                        ...prev,
                        contractExpiresAt: d.toISOString().split('T')[0],
                      }))
                    }}
                    className="px-2.5 py-1 text-xs rounded bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-700 transition cursor-pointer"
                  >
                    +30 dias (1 mês)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const d = new Date()
                      d.setDate(d.getDate() + 90)
                      setApprovalFormData((prev) => ({
                        ...prev,
                        contractExpiresAt: d.toISOString().split('T')[0],
                      }))
                    }}
                    className="px-2.5 py-1 text-xs rounded bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-700 transition cursor-pointer"
                  >
                    +90 dias (3 meses)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const d = new Date()
                      d.setDate(d.getDate() + 180)
                      setApprovalFormData((prev) => ({
                        ...prev,
                        contractExpiresAt: d.toISOString().split('T')[0],
                      }))
                    }}
                    className="px-2.5 py-1 text-xs rounded bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-700 transition cursor-pointer"
                  >
                    +180 dias (6 meses)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const d = new Date()
                      d.setDate(d.getDate() + 365)
                      setApprovalFormData((prev) => ({
                        ...prev,
                        contractExpiresAt: d.toISOString().split('T')[0],
                      }))
                    }}
                    className="px-2.5 py-1 text-xs rounded bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-700 transition cursor-pointer"
                  >
                    +365 dias (1 ano)
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setApprovalFormData((prev) => ({
                        ...prev,
                        contractExpiresAt: '',
                      }))
                    }
                    className="px-2.5 py-1 text-xs rounded bg-emerald-950/40 hover:bg-emerald-900/40 text-emerald-400 border border-emerald-800/60 transition cursor-pointer"
                  >
                    Vitalício
                  </button>
                </div>

                <div className="relative max-w-xs">
                  <Calendar className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="date"
                    value={approvalFormData.contractExpiresAt}
                    onChange={(e) =>
                      setApprovalFormData((prev) => ({
                        ...prev,
                        contractExpiresAt: e.target.value,
                      }))
                    }
                    className="w-full pl-9 pr-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500 transition"
                  />
                </div>
              </div>
            </div>

            {/* Footer com botões de decisão */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-5 border-t border-gray-800 mt-6">
              <div>
                <button
                  type="button"
                  onClick={() => handleProcessApproval('REJECTED')}
                  disabled={isProcessingApproval}
                  className="w-full sm:w-auto px-4 py-2 rounded-lg text-xs font-semibold border border-red-800/80 bg-red-950/30 text-red-400 hover:bg-red-900/40 transition disabled:opacity-50 cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <X className="w-4 h-4" />
                  Rejeitar Solicitação
                </button>
              </div>

              <div className="flex items-center gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => handleProcessApproval('SAVE')}
                  disabled={isProcessingApproval}
                  className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-200 rounded-lg text-xs font-semibold transition disabled:opacity-50 cursor-pointer"
                >
                  Salvar Informações
                </button>

                <button
                  type="button"
                  onClick={() => handleProcessApproval('APPROVED')}
                  disabled={isProcessingApproval}
                  className="flex items-center justify-center gap-2 px-5 py-2 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-bold rounded-lg text-xs shadow-lg shadow-emerald-600/20 transition hover:scale-[1.02] disabled:opacity-50 cursor-pointer"
                >
                  {isProcessingApproval ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      Processando...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
                      Aprovar e Liberar Acesso
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
