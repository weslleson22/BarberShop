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
  Scissors,
  Mail,
  Phone,
  MapPin,
  Lock,
  UserCheck,
  Search,
} from 'lucide-react'

interface BarbershopData {
  id: string
  name: string
  email: string
  phone: string | null
  address: string | null
  isActive: boolean
  createdAt: string
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

  // Modal "+ Nova Barbearia"
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
      setFormError('O nome da barbearia deve ter pelo menos 3 caracteres.')
      return
    }

    // 3. Validação do email comercial da barbearia
    const emailRegex = /^[a-z0-9._%+\-]+@[a-z0-9.-]+\.[a-z]{2,}$/i
    if (!emailRegex.test(trimmedShopEmail)) {
      setFormError('O email comercial informado é inválido. Ex: contato@barbearia.com')
      return
    }

    // 4. Validação do telefone da barbearia (se preenchido)
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
      setFormError('O email de acesso do administrador é inválido. Ex: admin@barbearia.com')
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
        throw new Error(data.error || 'Erro ao cadastrar nova barbearia')
      }

      setMessage({
        type: 'success',
        text: `Barbearia "${formData.name}" e administrador "${formData.adminName}" cadastrados com sucesso!`,
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
      })

      await loadData()
    } catch (err: any) {
      setFormError(err.message || 'Erro inesperado ao cadastrar barbearia.')
    } finally {
      setIsSubmittingShop(false)
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
        throw new Error(errorData.error || 'Erro ao atualizar barbearia')
      }

      const updated = await res.json()
      setBarbershops((prev) =>
        prev.map((s) => (s.id === updated.id ? { ...s, isActive: updated.isActive } : s))
      )

      setMessage({
        type: 'success',
        text: `Barbearia "${shop.name}" ${updated.isActive ? 'ativada' : 'desativada'} com sucesso.`,
      })
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Erro ao alterar status' })
    } finally {
      setActionLoadingId(null)
    }
  }

  const filteredBarbershops = barbershops.filter((shop) => {
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
              Nova Barbearia
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
              <span className="text-xs font-semibold uppercase tracking-wider">Barbearias (Tenants)</span>
              <Building2 className="h-5 w-5 text-amber-400" />
            </div>
            <div className="text-3xl font-bold text-white">
              {metrics?.tenants?.total ?? 0}
            </div>
            <div className="text-xs text-gray-400 mt-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-emerald-400 font-medium">{metrics?.tenants?.active ?? 0} ativas</span>
                <span>•</span>
                <span className="text-red-400 font-medium">{metrics?.tenants?.inactive ?? 0} inativas</span>
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
              <span className="text-gray-300 font-medium">{metrics?.users?.byRole?.['BARBER'] ?? 0} barbeiros</span>
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
              <Scissors className="h-5 w-5 text-emerald-400" />
            </div>
            <div className="text-3xl font-bold text-white">
              {metrics?.services?.total ?? 0}
            </div>
            <div className="text-xs text-emerald-400 mt-2">
              Serviços configurados pelas barbearias
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
                  placeholder="Buscar barbearia..."
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
                Cadastrar Barbearia
              </button>

              <span className="text-xs text-gray-400 hidden lg:inline-block">
                Total: <strong className="text-white">{filteredBarbershops.length}</strong>
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-gray-900/80 text-gray-400 border-b border-gray-800">
                  <th className="py-3.5 px-4 font-semibold">Barbearia</th>
                  <th className="py-3.5 px-4 font-semibold">Contato</th>
                  <th className="py-3.5 px-4 font-semibold">Endereço</th>
                  <th className="py-3.5 px-4 font-semibold text-center">Equipe</th>
                  <th className="py-3.5 px-4 font-semibold text-center">Clientes</th>
                  <th className="py-3.5 px-4 font-semibold text-center">Serviços</th>
                  <th className="py-3.5 px-4 font-semibold text-center">Status</th>
                  <th className="py-3.5 px-4 font-semibold text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/60">
                {filteredBarbershops.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-gray-500">
                      <div className="flex flex-col items-center justify-center gap-3 max-w-sm mx-auto">
                        <div className="w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                          <Building2 className="w-6 h-6 text-amber-400" />
                        </div>
                        <p className="text-sm font-medium text-gray-300">
                          {searchTerm
                            ? 'Nenhuma barbearia encontrada para o termo pesquisado.'
                            : 'Nenhuma barbearia cadastrada no sistema.'}
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
                            Cadastrar Primeira Barbearia
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
                      </td>
                      <td className="py-4 px-4">
                        <div className="text-gray-300">{shop.email}</div>
                        <div className="text-xs text-gray-500">{shop.phone || 'Sem telefone'}</div>
                      </td>
                      <td className="py-4 px-4 max-w-xs truncate text-gray-300 text-xs">
                        {shop.address || 'Não informado'}
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
                      </td>
                      <td className="py-4 px-4 text-right">
                        <button
                          onClick={() => toggleBarbershopStatus(shop)}
                          disabled={actionLoadingId === shop.id}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition ${
                            shop.isActive
                              ? 'border-red-800/80 bg-red-950/20 text-red-400 hover:bg-red-900/30'
                              : 'border-emerald-800/80 bg-emerald-950/20 text-emerald-400 hover:bg-emerald-900/30'
                          } disabled:opacity-50`}
                        >
                          <Power className="h-3.5 w-3.5" />
                          {actionLoadingId === shop.id
                            ? 'Alterando...'
                            : shop.isActive
                            ? 'Desativar'
                            : 'Ativar'}
                        </button>
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

      {/* Modal "+ Nova Barbearia" */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl relative my-8 animate-in fade-in duration-200">
            <div className="flex items-center justify-between border-b border-gray-800 pb-4 mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Cadastrar Nova Barbearia</h3>
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
              {/* Seção 1: Dados da Barbearia */}
              <div>
                <h4 className="text-xs font-semibold text-amber-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Building2 className="w-4 h-4" />
                  1. Dados da Unidade (Tenant)
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-gray-300 mb-1.5">
                      Nome da Barbearia *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: Barbearia Dom Pedro"
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
                        placeholder="contato@barbeariadompedro.com"
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
                </div>
              </div>

              {/* Seção 2: Administrador Inicial */}
              <div className="border-t border-gray-800 pt-5">
                <h4 className="text-xs font-semibold text-blue-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <UserCheck className="w-4 h-4" />
                  2. Administrador Inicial da Barbearia
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
                        placeholder="pedro@barbeariadompedro.com"
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
                  className="px-4 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-sm font-medium transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingShop}
                  className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-black font-semibold rounded-lg text-sm transition shadow-lg shadow-amber-500/20 disabled:opacity-50"
                >
                  {isSubmittingShop ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Cadastrando...
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4 stroke-[2.5]" />
                      Criar Barbearia
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
