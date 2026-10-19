'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/lib/auth-context'
import DropdownHeader from '@/components/shared/DropdownHeader'
import { getAuthHeaders, maskPhone, maskEmail, maskName } from '@/lib/utils'
import AddressAutocomplete from '@/components/developer/AddressAutocomplete'
import {
  Building2,
  Users,
  CreditCard,
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
  ExternalLink,
  Globe,
  Copy,
  Link2,
  Package,
  ShieldAlert,
  MoreHorizontal,
} from 'lucide-react'
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card'
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'

interface BarbershopData {
  id: string
  name: string
  slug?: string | null
  email: string
  phone: string | null
  address: string | null
  isActive: boolean
  status?: string
  createdAt: string
  contractExpiresAt: string | null
  createdById: string | null
  trial?: {
    isTrial: boolean
    trialStart: string | null
    trialEnd: string | null
    daysRemaining: number
    planName: string
    status: string
  } | null
  subscriptionStatus?: string
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
  lifecycleStatus?: string
  lastAccess?: string
  lastActivity?: string
  _count?: {
    users?: number
    clients?: number
    services?: number
    appointments?: number
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
  const [slugEditValue, setSlugEditValue] = useState('')
  const [isUpdatingSlug, setIsUpdatingSlug] = useState(false)

  // Sincronização em massa de slugs e cópia de URLs
  const [isSyncingSlugs, setIsSyncingSlugs] = useState(false)
  const [copiedShopId, setCopiedShopId] = useState<string | null>(null)

  const handleCopyPublicUrl = (slug: string, shopId: string) => {
    const origin = typeof window !== 'undefined' ? window.location.origin : ''
    const url = `${origin}/b/${slug}`
    navigator.clipboard.writeText(url)
    setCopiedShopId(shopId)
    setTimeout(() => setCopiedShopId(null), 2500)
  }

  // Abas de filtro de tenants (com drag-to-scroll e sem barra de scroll visível)
  const [filterTab, setFilterTab] = useState<'ALL' | 'PENDING' | 'ACTIVE' | 'INACTIVE' | 'TRIALING' | 'EXPIRED' | 'SUSPENDED' | 'CANCELLED'>('ALL')
  const tabsScrollRef = useRef<HTMLDivElement>(null)
  const isDraggingTabsRef = useRef(false)
  const dragStartXRef = useRef(0)
  const dragScrollLeftRef = useRef(0)
  const dragMovedRef = useRef(false)
  const [isGrabbingTabs, setIsGrabbingTabs] = useState(false)

  const handleTabsMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!tabsScrollRef.current) return
    isDraggingTabsRef.current = true
    dragMovedRef.current = false
    dragStartXRef.current = e.pageX - tabsScrollRef.current.offsetLeft
    dragScrollLeftRef.current = tabsScrollRef.current.scrollLeft
    setIsGrabbingTabs(true)
  }

  const handleTabsMouseLeave = () => {
    isDraggingTabsRef.current = false
    setIsGrabbingTabs(false)
  }

  const handleTabsMouseUp = () => {
    isDraggingTabsRef.current = false
    setIsGrabbingTabs(false)
  }

  const handleTabsMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDraggingTabsRef.current || !tabsScrollRef.current) return
    e.preventDefault()
    const x = e.pageX - tabsScrollRef.current.offsetLeft
    const walk = (x - dragStartXRef.current) * 1.5
    if (Math.abs(walk) > 4) {
      dragMovedRef.current = true
    }
    tabsScrollRef.current.scrollLeft = dragScrollLeftRef.current - walk
  }

  const handleTabsWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (!tabsScrollRef.current) return
    if (e.deltaY !== 0) {
      tabsScrollRef.current.scrollLeft += e.deltaY
    }
  }

  // Modal "Resetar Período de Trial"
  const [trialResetShop, setTrialResetShop] = useState<BarbershopData | null>(null)
  const [trialDaysInput, setTrialDaysInput] = useState<number>(30)
  const [trialReasonInput, setTrialReasonInput] = useState<string>('Prorrogação de degustação comercial')
  const [isResettingTrial, setIsResettingTrial] = useState<boolean>(false)

  // Modal "Análise e Aprovação de Cadastro"
  const [selectedShopForApproval, setSelectedShopForApproval] = useState<BarbershopData | null>(null)
  const [isProcessingApproval, setIsProcessingApproval] = useState(false)
  const [approvalFormData, setApprovalFormData] = useState({
    name: '',
    slug: '',
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
    slug: '',
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
      const statusParam = searchParams.get('status')
      if (statusParam === 'APPROVED' || statusParam === 'ACTIVE') {
        setFilterTab('ACTIVE')
      } else if (statusParam === 'PENDING') {
        setFilterTab('PENDING')
      } else if (statusParam === 'SUSPENDED') {
        setFilterTab('SUSPENDED')
      } else if (statusParam === 'CANCELLED' || statusParam === 'CANCELED') {
        setFilterTab('CANCELLED')
      }

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
        slug: '',
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
        color: 'bg-[#059669] text-white border border-[#10b981]',
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
        color: 'bg-[#dc2626] text-white border border-[#ef4444]',
        isExpired: true,
        daysRemaining: diffDays,
      }
    } else if (diffDays <= 15) {
      return {
        label: `Expira em ${diffDays}d (${expDate.toLocaleDateString('pt-BR')})`,
        color: 'bg-[#d97706] text-white border border-[#f59e0b]',
        isExpired: false,
        daysRemaining: diffDays,
      }
    } else {
      return {
        label: `Até ${expDate.toLocaleDateString('pt-BR')}`,
        color: 'bg-[#2563eb] text-white border border-[#3b82f6]',
        isExpired: false,
        daysRemaining: diffDays,
      }
    }
  }

  const handleOpenDetails = (shop: BarbershopData) => {
    setSelectedShopForDetails(shop)
    setSlugEditValue(shop.slug || '')
    if (shop.contractExpiresAt) {
      const d = new Date(shop.contractExpiresAt)
      setContractEditDate(d.toISOString().split('T')[0])
    } else {
      setContractEditDate('')
    }
  }

  const handleUpdateSlug = async () => {
    if (!selectedShopForDetails) return
    setIsUpdatingSlug(true)
    try {
      const res = await fetch('/api/developer/barbershops', {
        method: 'PATCH',
        headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
        credentials: 'include',
        body: JSON.stringify({
          id: selectedShopForDetails.id,
          slug: slugEditValue.trim(),
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Erro ao atualizar slug')
      }

      setBarbershops((prev) =>
        prev.map((s) => (s.id === data.id ? { ...s, slug: data.slug } : s))
      )
      setSelectedShopForDetails((prev) => (prev ? { ...prev, slug: data.slug } : null))
      setMessage({
        type: 'success',
        text: `Slug da empresa "${data.name}" atualizado para "/b/${data.slug}" com sucesso!`,
      })
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Erro ao atualizar slug' })
    } finally {
      setIsUpdatingSlug(false)
    }
  }

  const handleBackfillSlugs = async () => {
    setIsSyncingSlugs(true)
    setMessage(null)
    try {
      const res = await fetch('/api/developer/slugs/backfill', {
        method: 'POST',
        headers: getAuthHeaders(),
        credentials: 'include',
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Erro ao sincronizar slugs')
      }

      setMessage({
        type: 'success',
        text: data.message || `Rotina de slugs concluída! ${data.updatedCount || 0} estabelecimentos atualizados.`,
      })

      await loadData()
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Erro ao executar rotina de slugs' })
    } finally {
      setIsSyncingSlugs(false)
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

  const handleConfirmResetTrial = async () => {
    if (!trialResetShop) return
    setIsResettingTrial(true)
    try {
      const res = await fetch('/api/developer/trial/reset', {
        method: 'POST',
        headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
        credentials: 'include',
        body: JSON.stringify({
          barbershopId: trialResetShop.id,
          days: trialDaysInput,
          reason: trialReasonInput,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Erro ao resetar período de trial')
      }

      setMessage({
        type: 'success',
        text: `Período de trial de "${trialResetShop.name}" resetado com sucesso por ${trialDaysInput} dias!`,
      })
      setTrialResetShop(null)
      loadData()
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Erro ao resetar trial' })
    } finally {
      setIsResettingTrial(false)
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
      slug: shop.slug || '',
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
        slug: approvalFormData.slug.trim() || undefined,
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
  const activeCount = barbershops.filter((s) => (s.subscriptionStatus === 'ACTIVE' || (s.isActive && s.status !== 'PENDING'))).length
  const inactiveCount = barbershops.filter(
    (s) => (!s.isActive && s.status !== 'PENDING') || s.status === 'REJECTED'
  ).length
  const trialingCount = barbershops.filter((s) => s.trial?.status === 'TRIALING').length
  const expiredCount = barbershops.filter((s) => s.trial?.status === 'EXPIRED').length
  const suspendedCount = barbershops.filter((s) => s.status === 'SUSPENDED' || s.subscriptionStatus === 'SUSPENDED').length
  const cancelledCount = barbershops.filter(
    (s) => s.status === 'CANCELLED' || s.status === 'CANCELED' || s.subscriptionStatus === 'CANCELED'
  ).length

  const filteredBarbershops = barbershops.filter((shop) => {
    if (filterTab === 'PENDING' && shop.status !== 'PENDING') return false
    if (filterTab === 'ACTIVE') {
      const isSubActive = shop.subscriptionStatus === 'ACTIVE' || shop.trial?.status === 'ACTIVE'
      const isLegacyActive = shop.isActive && shop.status !== 'PENDING' && shop.trial?.status !== 'EXPIRED'
      if (!isSubActive && !isLegacyActive) return false
    }
    if (filterTab === 'INACTIVE' && shop.isActive && shop.status !== 'REJECTED') return false
    if (filterTab === 'TRIALING' && shop.trial?.status !== 'TRIALING') return false
    if (filterTab === 'EXPIRED' && shop.trial?.status !== 'EXPIRED') return false
    if (filterTab === 'SUSPENDED' && shop.status !== 'SUSPENDED' && shop.subscriptionStatus !== 'SUSPENDED') return false
    if (
      filterTab === 'CANCELLED' &&
      shop.status !== 'CANCELLED' &&
      shop.status !== 'CANCELED' &&
      shop.subscriptionStatus !== 'CANCELED'
    )
      return false

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
    <div className="min-h-screen bg-gray-950 text-white pb-20 pt-20">
      <DropdownHeader />

      <main className="w-full px-4 md:px-8 max-w-7xl mx-auto space-y-8">
        {/* Top Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-[#374151] pb-6 mb-8">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-lg text-xs font-bold bg-[#2563eb] text-white border border-[#3b82f6] shadow-sm">
                DEVELOPER ADMIN
              </span>
              <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                Gestão da Plataforma SaaS
              </h1>
            </div>
            <p className="text-white text-sm mt-1 font-medium">
              Painel técnico de controle de tenants, isolamento multi-tenant e administração da plataforma.
            </p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <Link
              href="/developer/billing"
              className="flex items-center gap-2 px-4 py-2.5 bg-[#111827] hover:bg-[#1f2937] text-white font-bold border border-[#374151] rounded-lg text-sm transition-colors shadow-sm"
            >
              <CreditCard className="h-4 w-4 text-white" />
              <span>Faturamento & Gateway</span>
            </Link>

            <Link
              href="/developer/onboarding"
              className="flex items-center gap-2 px-4 py-2.5 bg-[#111827] hover:bg-[#1f2937] text-white font-bold border border-[#374151] rounded-lg text-sm transition-colors shadow-sm"
            >
              <Users className="h-4 w-4 text-white" />
              <span>Cockpit Onboarding</span>
            </Link>

            <button
              onClick={() => {
                setFormError(null)
                setIsAddModalOpen(true)
              }}
              className="flex items-center gap-2 px-4 py-2.5 bg-[#059669] hover:bg-[#047857] text-white font-bold rounded-lg text-sm border border-[#10b981] transition-colors cursor-pointer shadow-sm"
            >
              <Plus className="h-4 w-4 stroke-[2.5]" />
              Nova Empresa
            </button>

            <button
              onClick={loadData}
              disabled={isLoading}
              className="flex items-center gap-2 px-4 py-2.5 bg-[#111827] border border-[#374151] hover:bg-[#1f2937] rounded-lg text-sm font-bold transition text-white shadow-sm"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              Atualizar
            </button>
          </div>
        </div>

        {/* Feedback Alert */}
        {message && (
          <div
            className={`mb-6 p-4 rounded-xl flex items-center justify-between gap-3 border shadow-sm ${
              message.type === 'success'
                ? 'bg-[#059669] border-[#10b981] text-white font-bold'
                : 'bg-[#dc2626] border-[#ef4444] text-white font-bold'
            }`}
          >
            <div className="flex items-center gap-3">
              {message.type === 'success' ? (
                <CheckCircle2 className="h-5 w-5 text-white shrink-0" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-white shrink-0" />
              )}
              <span className="text-sm font-bold">{message.text}</span>
            </div>
            <button
              onClick={() => setMessage(null)}
              className="text-white hover:text-gray-200 transition"
              aria-label="Fechar mensagem"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Hub de Faturamento, Gateway, Planos & Assinaturas */}
        <div className="bg-[#111827] border border-[#374151] rounded-xl p-6 space-y-4 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#059669] border border-[#10b981] text-white text-xs font-bold uppercase tracking-wider mb-2">
                <CreditCard className="w-3.5 h-3.5" />
                <span>Gestão Financeira SaaS</span>
              </div>
              <h2 className="text-xl font-bold text-white">Faturamento & Planos</h2>
              <p className="text-xs text-white font-medium mt-1">
                Controle direto de assinaturas das barbearias, cobranças geradas e planos cadastrados.
              </p>
            </div>
            <Link
              href="/developer/billing"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#059669] hover:bg-[#047857] text-white font-bold text-xs border border-[#10b981] transition-colors self-start sm:self-auto cursor-pointer shadow-sm"
            >
              <span>Abrir Faturamento Completo</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
            {/* Card 1: Cobranças Gateway */}
            <Link
              href="/developer/billing?tab=cobrancas"
              className="bg-[#030712] border border-[#374151] hover:border-[#4b5563] p-4 rounded-xl transition-colors flex flex-col justify-between cursor-pointer shadow-sm"
            >
              <div className="flex items-center justify-between text-white mb-2">
                <span className="text-xs font-bold">Cobranças Gateway</span>
                <span className="p-1 rounded bg-[#059669] text-white border border-[#10b981]">
                  <CreditCard className="w-3.5 h-3.5" />
                </span>
              </div>
              <div className="text-xs text-white font-medium leading-relaxed">
                Histórico de cobranças, links de checkout e liquidações PIX/Cartão.
              </div>
              <span className="text-[11px] text-white font-bold mt-3 flex items-center gap-1 underline">
                Acessar cobranças →
              </span>
            </Link>

            {/* Card 2: Assinaturas SaaS */}
            <Link
              href="/developer/subscriptions"
              className="bg-[#030712] border border-[#374151] hover:border-[#4b5563] p-4 rounded-xl transition-colors flex flex-col justify-between cursor-pointer shadow-sm"
            >
              <div className="flex items-center justify-between text-white mb-2">
                <span className="text-xs font-bold">Assinaturas SaaS</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-[#2563eb] text-white border border-[#3b82f6] font-mono font-bold">
                  {barbershops.filter(b => b.subscriptionStatus === 'ACTIVE' || b.isActive).length} ativas
                </span>
              </div>
              <div className="text-xs text-white font-medium leading-relaxed">
                Status das assinaturas, vigências, renovações e inadimplência.
              </div>
              <span className="text-[11px] text-white font-bold mt-3 flex items-center gap-1 underline">
                Ver assinaturas →
              </span>
            </Link>

            {/* Card 3: Produtos no Gateway */}
            <Link
              href="/developer/billing?tab=produtos"
              className="bg-[#030712] border border-[#374151] hover:border-[#4b5563] p-4 rounded-xl transition-colors flex flex-col justify-between cursor-pointer shadow-sm"
            >
              <div className="flex items-center justify-between text-white mb-2">
                <span className="text-xs font-bold">Produtos no Gateway</span>
                <span className="p-1 rounded bg-[#d97706] text-white border border-[#f59e0b]">
                  <Package className="w-3.5 h-3.5" />
                </span>
              </div>
              <div className="text-xs text-white font-medium leading-relaxed">
                Seus produtos cadastrados e sincronizados com a API de pagamento.
              </div>
              <span className="text-[11px] text-white font-bold mt-3 flex items-center gap-1 underline">
                Gerenciar produtos →
              </span>
            </Link>

            {/* Card 4: Planos Cadastrados pelo Developer */}
            <Link
              href="/developer/billing?tab=produtos"
              className="bg-[#030712] border border-[#374151] hover:border-[#4b5563] p-4 rounded-xl transition-colors flex flex-col justify-between cursor-pointer shadow-sm"
            >
              <div className="flex items-center justify-between text-white mb-2">
                <span className="text-xs font-bold">Planos Cadastrados</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-[#7c3aed] text-white border border-[#8b5cf6] font-mono font-bold">
                  Developer
                </span>
              </div>
              <div className="text-xs text-white font-medium leading-relaxed">
                Planos cadastrados pelo developer e sincronização com o gateway.
              </div>
              <span className="text-[11px] text-white font-bold mt-3 flex items-center gap-1 underline">
                Configurar planos →
              </span>
            </Link>
          </div>
        </div>

        {/* Metrics Grid (Platform / Technical Metrics Only - Zero Operational Appointments) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-[#111827] border border-[#374151] p-5 rounded-xl shadow-sm">
            <div className="flex items-center justify-between text-white mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-white">Empresas (Tenants)</span>
              <span className="p-1.5 rounded-lg bg-[#2563eb] text-white border border-[#3b82f6]">
                <Building2 className="h-4 w-4" />
              </span>
            </div>
            <div className="text-3xl font-bold text-white">
              {metrics?.tenants?.total ?? 0}
            </div>
            <div className="text-xs text-white mt-2 flex items-center justify-between font-bold">
              <div className="flex items-center gap-2">
                <span className="bg-[#059669] text-white border border-[#10b981] px-2 py-0.5 rounded text-[11px]">{activeCount} ativas</span>
                <span className="bg-[#dc2626] text-white border border-[#ef4444] px-2 py-0.5 rounded text-[11px]">{inactiveCount} inativas</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setFormError(null)
                  setIsAddModalOpen(true)
                }}
                className="text-white hover:text-gray-200 font-bold text-xs flex items-center gap-1 transition cursor-pointer underline"
              >
                <Plus className="w-3.5 h-3.5" />
                Criar
              </button>
            </div>
            {pendingCount > 0 && (
              <button
                type="button"
                onClick={() => setFilterTab('PENDING')}
                className="mt-2.5 text-xs font-bold bg-[#d97706] text-white border border-[#f59e0b] px-2.5 py-1 rounded-md flex items-center gap-1.5 transition cursor-pointer shadow-sm w-fit"
              >
                <Clock className="w-3.5 h-3.5" />
                <span>{pendingCount} aguardando aprovação</span>
              </button>
            )}
          </div>

          <Link
            href="/usuarios"
            className="block bg-[#111827] border border-[#374151] hover:border-[#4b5563] p-5 rounded-xl transition shadow-sm"
          >
            <div className="flex items-center justify-between text-white mb-2 transition">
              <span className="text-xs font-bold uppercase tracking-wider text-white">Usuários da Plataforma</span>
              <span className="p-1.5 rounded-lg bg-[#059669] text-white border border-[#10b981]">
                <Users className="h-4 w-4" />
              </span>
            </div>
            <div className="text-3xl font-bold text-white">
              {metrics?.users?.total ?? 0}
            </div>
            <div className="text-xs text-white mt-2 flex items-center gap-2 font-bold">
              <span className="bg-[#1f2937] text-white px-2 py-0.5 rounded border border-[#374151]">{metrics?.users?.byRole?.['ADMIN'] ?? 0} admins</span>
              <span className="bg-[#1f2937] text-white px-2 py-0.5 rounded border border-[#374151]">{metrics?.users?.byRole?.['BARBER'] ?? 0} profissionais</span>
            </div>
          </Link>

          <div className="bg-[#111827] border border-[#374151] p-5 rounded-xl shadow-sm">
            <div className="flex items-center justify-between text-white mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-white">Base de Clientes</span>
              <span className="p-1.5 rounded-lg bg-[#7c3aed] text-white border border-[#8b5cf6]">
                <ShieldCheck className="h-4 w-4" />
              </span>
            </div>
            <div className="text-3xl font-bold text-white">
              {metrics?.clients?.total ?? 0}
            </div>
            <div className="text-xs text-white font-medium mt-2">
              Cadastros registrados nos tenants
            </div>
          </div>

          <div className="bg-[#111827] border border-[#374151] p-5 rounded-xl shadow-sm">
            <div className="flex items-center justify-between text-white mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-white">Serviços no Catálogo</span>
              <span className="p-1.5 rounded-lg bg-[#d97706] text-white border border-[#f59e0b]">
                <Briefcase className="h-4 w-4" />
              </span>
            </div>
            <div className="text-3xl font-bold text-white">
              {metrics?.services?.total ?? 0}
            </div>
            <div className="text-xs text-white font-medium mt-2">
              Serviços configurados pelas empresas
            </div>
          </div>
        </div>

        {/* Tenants Table - shadcn/ui */}
        <TooltipProvider delayDuration={150}>
          <Card className="bg-[#111827] border-[#374151] rounded-xl overflow-hidden shadow-sm mb-8 text-white">
            <CardHeader className="p-5 border-b border-[#374151] bg-[#111827] space-y-4">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div className="flex items-start gap-3">
                  <span className="p-2.5 rounded-lg bg-[#2563eb] text-white border border-[#3b82f6] shadow-sm mt-0.5">
                    <Building2 className="w-5 h-5 text-white" />
                  </span>
                  <div>
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <CardTitle className="text-xl font-bold text-white tracking-tight">
                        Tenants Cadastrados
                      </CardTitle>
                      <Badge
                        variant="outline"
                        className="bg-[#030712] text-white border-[#374151] font-mono text-[11px] px-2.5 py-0.5 font-bold"
                      >
                        {filteredBarbershops.length}{' '}
                        {filteredBarbershops.length === 1 ? 'empresa' : 'empresas'}
                      </Badge>
                    </div>
                    <CardDescription className="text-xs text-white font-medium mt-1">
                      Controle de acesso, isolamento de dados e ativação de unidades
                    </CardDescription>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white" />
                    <Input
                      type="text"
                      placeholder="Buscar por nome, e-mail..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-9 pr-8 py-2 h-9 bg-[#030712] border-[#374151] rounded-lg text-xs text-white placeholder:text-gray-400 font-medium focus-visible:ring-1 focus-visible:ring-[#2563eb] focus-visible:border-[#2563eb] w-52 sm:w-64"
                    />
                    {searchTerm && (
                      <button
                        type="button"
                        onClick={() => setSearchTerm('')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-300 hover:text-white cursor-pointer"
                        title="Limpar busca"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <Button
                    type="button"
                    onClick={() => {
                      setFormError(null)
                      setIsAddModalOpen(true)
                    }}
                    className="h-9 px-4 bg-[#059669] hover:bg-[#047857] text-white font-bold rounded-lg text-xs border border-[#10b981] shadow-sm flex items-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="h-4 w-4 stroke-[2.5]" />
                    <span>Cadastrar Empresa</span>
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleBackfillSlugs}
                    disabled={isSyncingSlugs}
                    className="h-9 px-3.5 bg-[#030712] hover:bg-[#1f2937] hover:text-white text-white border-[#374151] font-bold rounded-lg text-xs shadow-sm flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    title="Gera automaticamente slugs únicos para clientes e barbearias antigas sem slug"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${isSyncingSlugs ? 'animate-spin text-white' : 'text-white'}`} />
                    <span className="hidden sm:inline">
                      {isSyncingSlugs ? 'Sincronizando...' : 'Sincronizar Slugs'}
                    </span>
                  </Button>
                </div>
              </div>

              {/* Sub-menu / Abas de Filtro de Tenants (Arrastável e sem barra inferior) */}
              <div
                ref={tabsScrollRef}
                onMouseDown={handleTabsMouseDown}
                onMouseLeave={handleTabsMouseLeave}
                onMouseUp={handleTabsMouseUp}
                onMouseMove={handleTabsMouseMove}
                onWheel={handleTabsWheel}
                className={`pt-2 border-t border-[#374151] flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] select-none ${
                  isGrabbingTabs ? 'cursor-grabbing' : 'cursor-grab'
                }`}
              >
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    if (dragMovedRef.current) return
                    setFilterTab('ALL')
                  }}
                  className={`h-8 px-3 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 border shadow-sm shrink-0 ${
                    filterTab === 'ALL'
                      ? 'bg-[#2563eb] text-white border-[#3b82f6] hover:bg-[#1d4ed8] hover:text-white'
                      : 'bg-[#030712] text-white border-[#374151] hover:bg-[#1f2937] hover:text-white'
                  }`}
                >
                  <span>Todos</span>
                  <Badge
                    variant="outline"
                    className="px-1.5 py-0 text-[10px] font-mono font-bold bg-[#111827] text-white border-[#374151]"
                  >
                    {barbershops.length}
                  </Badge>
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    if (dragMovedRef.current) return
                    setFilterTab('PENDING')
                  }}
                  className={`h-8 px-3 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 border shadow-sm shrink-0 ${
                    filterTab === 'PENDING'
                      ? 'bg-[#2563eb] text-white border-[#3b82f6] hover:bg-[#1d4ed8] hover:text-white'
                      : 'bg-[#030712] text-white border-[#374151] hover:bg-[#1f2937] hover:text-white'
                  }`}
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>Aguardando Aprovação</span>
                  {pendingCount > 0 ? (
                    <Badge className="px-1.5 py-0 text-[10px] font-bold bg-[#d97706] text-white border-[#f59e0b]">
                      {pendingCount}
                    </Badge>
                  ) : (
                    <Badge
                      variant="outline"
                      className="px-1.5 py-0 text-[10px] font-mono font-bold bg-[#111827] text-white border-[#374151]"
                    >
                      0
                    </Badge>
                  )}
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    if (dragMovedRef.current) return
                    setFilterTab('ACTIVE')
                  }}
                  className={`h-8 px-3 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 border shadow-sm shrink-0 ${
                    filterTab === 'ACTIVE'
                      ? 'bg-[#2563eb] text-white border-[#3b82f6] hover:bg-[#1d4ed8] hover:text-white'
                      : 'bg-[#030712] text-white border-[#374151] hover:bg-[#1f2937] hover:text-white'
                  }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Ativos / Aprovados</span>
                  <Badge
                    variant="outline"
                    className="px-1.5 py-0 text-[10px] font-mono font-bold bg-[#111827] text-white border-[#374151]"
                  >
                    {activeCount}
                  </Badge>
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    if (dragMovedRef.current) return
                    setFilterTab('TRIALING')
                  }}
                  className={`h-8 px-3 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 border shadow-sm shrink-0 ${
                    filterTab === 'TRIALING'
                      ? 'bg-[#2563eb] text-white border-[#3b82f6] hover:bg-[#1d4ed8] hover:text-white'
                      : 'bg-[#030712] text-white border-[#374151] hover:bg-[#1f2937] hover:text-white'
                  }`}
                >
                  <CalendarClock className="w-3.5 h-3.5" />
                  <span>Em Trial (30 dias)</span>
                  <Badge className="px-1.5 py-0 text-[10px] font-mono font-bold bg-[#d97706] text-white border-[#f59e0b]">
                    {trialingCount}
                  </Badge>
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    if (dragMovedRef.current) return
                    setFilterTab('EXPIRED')
                  }}
                  className={`h-8 px-3 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 border shadow-sm shrink-0 ${
                    filterTab === 'EXPIRED'
                      ? 'bg-[#2563eb] text-white border-[#3b82f6] hover:bg-[#1d4ed8] hover:text-white'
                      : 'bg-[#030712] text-white border-[#374151] hover:bg-[#1f2937] hover:text-white'
                  }`}
                >
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Trial Expirado</span>
                  <Badge className="px-1.5 py-0 text-[10px] font-mono font-bold bg-[#dc2626] text-white border-[#ef4444]">
                    {expiredCount}
                  </Badge>
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    if (dragMovedRef.current) return
                    setFilterTab('INACTIVE')
                  }}
                  className={`h-8 px-3 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 border shadow-sm shrink-0 ${
                    filterTab === 'INACTIVE'
                      ? 'bg-[#2563eb] text-white border-[#3b82f6] hover:bg-[#1d4ed8] hover:text-white'
                      : 'bg-[#030712] text-white border-[#374151] hover:bg-[#1f2937] hover:text-white'
                  }`}
                >
                  <Power className="w-3.5 h-3.5" />
                  <span>Inativos / Rejeitados</span>
                  <Badge
                    variant="outline"
                    className="px-1.5 py-0 text-[10px] font-mono font-bold bg-[#111827] text-white border-[#374151]"
                  >
                    {inactiveCount}
                  </Badge>
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    if (dragMovedRef.current) return
                    setFilterTab('SUSPENDED')
                  }}
                  className={`h-8 px-3 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 border shadow-sm shrink-0 ${
                    filterTab === 'SUSPENDED'
                      ? 'bg-[#2563eb] text-white border-[#3b82f6] hover:bg-[#1d4ed8] hover:text-white'
                      : 'bg-[#030712] text-white border-[#374151] hover:bg-[#1f2937] hover:text-white'
                  }`}
                >
                  <ShieldAlert className="w-3.5 h-3.5" />
                  <span>Suspensas</span>
                  <Badge className="px-1.5 py-0 text-[10px] font-mono font-bold bg-[#d97706] text-white border-[#f59e0b]">
                    {suspendedCount}
                  </Badge>
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    if (dragMovedRef.current) return
                    setFilterTab('CANCELLED')
                  }}
                  className={`h-8 px-3 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 border shadow-sm shrink-0 ${
                    filterTab === 'CANCELLED'
                      ? 'bg-[#2563eb] text-white border-[#3b82f6] hover:bg-[#1d4ed8] hover:text-white'
                      : 'bg-[#030712] text-white border-[#374151] hover:bg-[#1f2937] hover:text-white'
                  }`}
                >
                  <span>Canceladas</span>
                  <Badge
                    variant="outline"
                    className="px-1.5 py-0 text-[10px] font-mono font-bold bg-[#111827] text-white border-[#374151]"
                  >
                    {cancelledCount}
                  </Badge>
                </Button>
              </div>
            </CardHeader>

            <CardContent className="p-0 overflow-x-auto">
              <Table className="w-full text-left border-collapse text-sm">
                <TableHeader className="bg-[#030712] border-b border-[#374151]">
                  <TableRow className="border-b border-[#374151] hover:bg-transparent">
                    <TableHead className="py-3.5 px-4 font-bold text-xs uppercase tracking-wider text-white">
                      Empresa / Tenant
                    </TableHead>
                    <TableHead className="py-3.5 px-4 font-bold text-xs uppercase tracking-wider text-white">
                      Cadastrado em
                    </TableHead>
                    <TableHead className="py-3.5 px-4 font-bold text-xs uppercase tracking-wider text-white">
                      Trial / Assinatura
                    </TableHead>
                    <TableHead className="py-3.5 px-4 font-bold text-xs uppercase tracking-wider text-white">
                      Contato & Gestor
                    </TableHead>
                    <TableHead className="py-3.5 px-4 font-bold text-xs uppercase tracking-wider text-white text-center">
                      Equipe
                    </TableHead>
                    <TableHead className="py-3.5 px-4 font-bold text-xs uppercase tracking-wider text-white text-center">
                      Clientes
                    </TableHead>
                    <TableHead className="py-3.5 px-4 font-bold text-xs uppercase tracking-wider text-white text-center">
                      Serviços
                    </TableHead>
                    <TableHead className="py-3.5 px-4 font-bold text-xs uppercase tracking-wider text-white text-center">
                      Agendamentos
                    </TableHead>
                    <TableHead className="py-3.5 px-4 font-bold text-xs uppercase tracking-wider text-white text-center">
                      Status
                    </TableHead>
                    <TableHead className="py-3.5 px-4 font-bold text-xs uppercase tracking-wider text-white text-right">
                      Ações
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-[#1f2937]">
                  {filteredBarbershops.length === 0 ? (
                    <TableRow className="hover:bg-transparent">
                      <TableCell colSpan={10} className="py-12 text-center text-white">
                        <div className="flex flex-col items-center justify-center gap-3 max-w-sm mx-auto">
                          <div className="w-12 h-12 rounded-xl bg-[#2563eb] border border-[#3b82f6] text-white flex items-center justify-center shadow-sm">
                            <Building2 className="w-6 h-6 text-white" />
                          </div>
                          <p className="text-sm font-bold text-white">
                            {searchTerm
                              ? 'Nenhuma empresa encontrada para o termo pesquisado.'
                              : 'Nenhuma empresa cadastrada no sistema.'}
                          </p>
                          <p className="text-xs text-white font-medium">
                            {searchTerm
                              ? 'Verifique os termos digitados ou limpe o filtro de busca.'
                              : 'Comece criando o primeiro tenant da sua plataforma SaaS com o administrador da unidade.'}
                          </p>
                          {!searchTerm && (
                            <Button
                              type="button"
                              onClick={() => {
                                setFormError(null)
                                setIsAddModalOpen(true)
                              }}
                              className="mt-2 h-9 px-5 bg-[#059669] hover:bg-[#047857] text-white font-bold rounded-lg text-xs transition-colors cursor-pointer border border-[#10b981] shadow-sm flex items-center gap-1.5"
                            >
                              <Plus className="h-4 w-4 stroke-[2.5]" />
                              <span>Cadastrar Primeira Empresa</span>
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredBarbershops.map((shop) => (
                      <TableRow key={shop.id} className="hover:bg-[#1f2937] transition border-b border-[#1f2937]">
                        {/* 1. Empresa / Tenant */}
                        <TableCell className="py-4 px-4 align-top">
                          <div className="flex items-start gap-3">
                            <Avatar className="h-9 w-9 rounded-lg border border-[#374151] bg-[#030712] shrink-0 mt-0.5">
                              <AvatarFallback className="rounded-lg bg-[#2563eb] text-white font-bold text-xs border border-[#3b82f6]">
                                {shop.name.slice(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div className="space-y-1">
                              <div className="font-bold text-white text-sm leading-tight">
                                {shop.name}
                              </div>
                              <div className="text-xs text-white font-mono font-medium">
                                ID: {shop.id}
                              </div>
                              {shop.slug ? (
                                <div className="flex items-center gap-1.5 pt-0.5">
                                  <a
                                    href={`/b/${shop.slug}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 text-[11px] text-white font-mono bg-[#030712] hover:bg-[#1f2937] px-2 py-0.5 rounded border border-[#374151] font-bold transition"
                                    title="Abrir página pública de agendamento em nova aba"
                                  >
                                    <span>/b/{shop.slug}</span>
                                    <ExternalLink className="w-3 h-3 text-white" />
                                  </a>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <button
                                        type="button"
                                        onClick={() => handleCopyPublicUrl(shop.slug!, shop.id)}
                                        className="p-1 rounded bg-[#030712] border border-[#374151] text-white hover:bg-[#1f2937] transition cursor-pointer"
                                      >
                                        {copiedShopId === shop.id ? (
                                          <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                                        ) : (
                                          <Copy className="w-3.5 h-3.5 text-white" />
                                        )}
                                      </button>
                                    </TooltipTrigger>
                                    <TooltipContent className="bg-[#111827] text-white border-[#374151] font-bold text-xs">
                                      {copiedShopId === shop.id ? 'URL copiada!' : 'Copiar URL pública'}
                                    </TooltipContent>
                                  </Tooltip>
                                </div>
                              ) : (
                                <div className="text-[11px] text-white font-medium italic">
                                  Sem slug público
                                </div>
                              )}
                              {shop.creator && (
                                <div className="text-[11px] text-white font-bold flex items-center gap-1 pt-0.5">
                                  <Crown className="w-3.5 h-3.5 text-white" />
                                  <span>Por: {shop.creator.name}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </TableCell>

                        {/* 2. Cadastrado em */}
                        <TableCell className="py-4 px-4 whitespace-nowrap text-xs text-white font-medium align-top">
                          <div className="flex items-center gap-1.5 bg-[#030712] px-2.5 py-1 rounded-md border border-[#374151] w-fit">
                            <Calendar className="w-3.5 h-3.5 text-white" />
                            <span>{new Date(shop.createdAt).toLocaleDateString('pt-BR')}</span>
                          </div>
                        </TableCell>

                        {/* 3. Trial / Assinatura */}
                        <TableCell className="py-4 px-4 whitespace-nowrap align-top">
                          {shop.trial ? (
                            <div className="flex flex-col gap-1.5">
                              <Badge
                                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-bold shadow-sm w-fit ${
                                  shop.trial.status === 'TRIALING'
                                    ? 'bg-[#d97706] text-white border border-[#f59e0b]'
                                    : shop.trial.status === 'ACTIVE'
                                    ? 'bg-[#059669] text-white border border-[#10b981]'
                                    : shop.trial.status === 'EXPIRED'
                                    ? 'bg-[#dc2626] text-white border border-[#ef4444]'
                                    : 'bg-[#1f2937] text-white border border-[#374151]'
                                }`}
                              >
                                <CalendarClock className="w-3.5 h-3.5 text-white" />
                                <span>
                                  {shop.trial.status === 'TRIALING'
                                    ? `Trial: ${shop.trial.daysRemaining}d restantes`
                                    : shop.trial.status === 'ACTIVE'
                                    ? 'Ativo (Assinatura)'
                                    : shop.trial.status === 'EXPIRED'
                                    ? 'Trial Expirado'
                                    : shop.trial.status}
                                </span>
                              </Badge>

                              <div className="text-[11px] text-white flex items-center gap-1 font-medium">
                                <span>Plano:</span>
                                <span className="font-bold text-white underline">{shop.trial.planName}</span>
                              </div>

                              {shop.trial.trialStart && shop.trial.trialEnd && (
                                <div className="text-[10px] text-white font-mono font-medium">
                                  {new Date(shop.trial.trialStart).toLocaleDateString('pt-BR')} até{' '}
                                  {new Date(shop.trial.trialEnd).toLocaleDateString('pt-BR')}
                                </div>
                              )}
                            </div>
                          ) : (
                            (() => {
                              const status = getContractStatus(shop.contractExpiresAt)
                              return (
                                <Badge className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold shadow-sm ${status.color}`}>
                                  <CalendarClock className="w-3.5 h-3.5 text-white" />
                                  <span>{status.label}</span>
                                </Badge>
                              )
                            })()
                          )}
                        </TableCell>

                        {/* 4. Contato */}
                        <TableCell className="py-4 px-4 align-top space-y-1">
                          <div className="text-white text-xs font-bold flex items-center gap-1.5">
                            <Mail className="w-3.5 h-3.5 text-white shrink-0" />
                            <span className="truncate max-w-[190px]">{shop.email}</span>
                          </div>
                          <div className="text-xs text-white font-mono font-medium flex items-center gap-1.5">
                            <Phone className="w-3.5 h-3.5 text-white shrink-0" />
                            <span>{shop.phone || 'Sem telefone'}</span>
                          </div>
                        </TableCell>

                        {/* 5. Equipe */}
                        <TableCell className="py-4 px-4 text-center align-middle">
                          <span className="inline-block px-2.5 py-1 rounded-md bg-[#030712] border border-[#374151] font-bold text-white text-xs">
                            {shop._count?.users ?? 0}
                          </span>
                        </TableCell>

                        {/* 6. Clientes */}
                        <TableCell className="py-4 px-4 text-center align-middle">
                          <span className="inline-block px-2.5 py-1 rounded-md bg-[#030712] border border-[#374151] font-bold text-white text-xs">
                            {shop._count?.clients ?? 0}
                          </span>
                        </TableCell>

                        {/* 7. Serviços */}
                        <TableCell className="py-4 px-4 text-center align-middle">
                          <span className="inline-block px-2.5 py-1 rounded-md bg-[#030712] border border-[#374151] font-bold text-white text-xs">
                            {shop._count?.services ?? 0}
                          </span>
                        </TableCell>

                        {/* 8. Agendamentos */}
                        <TableCell className="py-4 px-4 text-center align-middle">
                          <span className="inline-block px-2.5 py-1 rounded-md bg-[#030712] border border-[#374151] font-extrabold text-white text-xs">
                            {shop._count?.appointments ?? 0}
                          </span>
                        </TableCell>

                        {/* 9. Status */}
                        <TableCell className="py-4 px-4 text-center align-middle">
                          {shop.status === 'PENDING' ? (
                            <Badge className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold bg-[#d97706] text-white border border-[#f59e0b] shadow-sm">
                              <Clock className="w-3.5 h-3.5 text-white" />
                              <span>Aguardando Aprovação</span>
                            </Badge>
                          ) : shop.status === 'REJECTED' ? (
                            <Badge className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold bg-[#dc2626] text-white border border-[#ef4444] shadow-sm">
                              <X className="w-3.5 h-3.5 text-white" />
                              <span>Rejeitado</span>
                            </Badge>
                          ) : (
                            <Badge
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold border shadow-sm ${
                                shop.isActive
                                  ? 'bg-[#059669] text-white border-[#10b981]'
                                  : 'bg-[#dc2626] text-white border-[#ef4444]'
                              }`}
                            >
                              <span className="h-2 w-2 rounded-full bg-white" />
                              <span>{shop.isActive ? 'Ativa' : 'Desativada'}</span>
                            </Badge>
                          )}
                        </TableCell>

                        {/* 10. Ações */}
                        <TableCell className="py-4 px-4 text-right align-middle">
                          <div className="flex items-center justify-end gap-1.5">
                            {shop.status === 'PENDING' ? (
                              <Button
                                type="button"
                                size="sm"
                                onClick={() => handleOpenApprovalModal(shop)}
                                className="h-8 px-3 rounded-lg text-xs font-bold bg-[#2563eb] hover:bg-[#1d4ed8] text-white border border-[#3b82f6] transition-colors cursor-pointer shadow-sm flex items-center gap-1.5"
                                title="Analisar solicitação de cadastro e aprovar"
                              >
                                <ShieldCheck className="h-3.5 w-3.5 stroke-[2.5]" />
                                <span>Analisar / Aprovar</span>
                              </Button>
                            ) : (
                              <>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleOpenDetails(shop)}
                                  className="h-8 px-2.5 rounded-lg text-xs font-bold border border-[#374151] bg-[#111827] text-white hover:bg-[#1f2937] hover:text-white transition cursor-pointer shadow-sm flex items-center gap-1"
                                  title="Ver Detalhes da Empresa"
                                >
                                  <Info className="h-3.5 w-3.5 text-white" />
                                  <span>Detalhes</span>
                                </Button>

                                <Button
                                  type="button"
                                  size="sm"
                                  onClick={() => {
                                    setTrialResetShop(shop)
                                    setTrialDaysInput(30)
                                    setTrialReasonInput('Prorrogação de degustação comercial')
                                  }}
                                  className="h-8 px-2.5 rounded-lg text-xs font-bold border border-[#f59e0b] bg-[#d97706] hover:bg-[#b45309] text-white transition cursor-pointer shadow-sm flex items-center gap-1"
                                  title="Resetar ou prorrogar período de trial desta empresa"
                                >
                                  <Clock className="h-3.5 w-3.5 text-white" />
                                  <span>Trial</span>
                                </Button>
                              </>
                            )}

                            {/* Dropdown Menu com Mais Ações */}
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="icon"
                                  className="h-8 w-8 bg-[#030712] hover:bg-[#1f2937] hover:text-white border-[#374151] text-white rounded-lg cursor-pointer"
                                  title="Mais ações deste tenant"
                                >
                                  <MoreHorizontal className="h-4 w-4 text-white" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent
                                align="end"
                                className="w-52 bg-[#111827] border-[#374151] text-white shadow-xl rounded-xl p-1.5"
                              >
                                <DropdownMenuLabel className="text-xs font-bold text-white px-2 py-1.5">
                                  Opções de Gestão
                                </DropdownMenuLabel>
                                <DropdownMenuSeparator className="bg-[#374151]" />

                                {shop.status === 'PENDING' ? (
                                  <DropdownMenuItem
                                    onClick={() => handleOpenApprovalModal(shop)}
                                    className="text-xs font-bold text-white hover:bg-[#2563eb] hover:text-white rounded-md cursor-pointer flex items-center gap-2 px-2 py-2"
                                  >
                                    <ShieldCheck className="h-4 w-4 text-white" />
                                    <span>Analisar / Aprovar</span>
                                  </DropdownMenuItem>
                                ) : (
                                  <>
                                    <DropdownMenuItem
                                      onClick={() => handleOpenDetails(shop)}
                                      className="text-xs font-bold text-white hover:bg-[#1f2937] hover:text-white rounded-md cursor-pointer flex items-center gap-2 px-2 py-2"
                                    >
                                      <Info className="h-4 w-4 text-white" />
                                      <span>Ver Detalhes Completos</span>
                                    </DropdownMenuItem>

                                    <DropdownMenuItem
                                      onClick={() => {
                                        setTrialResetShop(shop)
                                        setTrialDaysInput(30)
                                        setTrialReasonInput('Prorrogação de degustação comercial')
                                      }}
                                      className="text-xs font-bold text-white hover:bg-[#1f2937] hover:text-white rounded-md cursor-pointer flex items-center gap-2 px-2 py-2"
                                    >
                                      <Clock className="h-4 w-4 text-white" />
                                      <span>Resetar / Prorrogar Trial</span>
                                    </DropdownMenuItem>
                                  </>
                                )}

                                {shop.slug && (
                                  <>
                                    <DropdownMenuItem
                                      onClick={() => {
                                        if (typeof window !== 'undefined') {
                                          window.open(`/b/${shop.slug}`, '_blank')
                                        }
                                      }}
                                      className="text-xs font-bold text-white hover:bg-[#1f2937] hover:text-white rounded-md cursor-pointer flex items-center gap-2 px-2 py-2"
                                    >
                                      <ExternalLink className="h-4 w-4 text-white" />
                                      <span>Abrir Página Pública</span>
                                    </DropdownMenuItem>

                                    <DropdownMenuItem
                                      onClick={() => handleCopyPublicUrl(shop.slug!, shop.id)}
                                      className="text-xs font-bold text-white hover:bg-[#1f2937] hover:text-white rounded-md cursor-pointer flex items-center gap-2 px-2 py-2"
                                    >
                                      <Copy className="h-4 w-4 text-white" />
                                      <span>Copiar Link Público</span>
                                    </DropdownMenuItem>
                                  </>
                                )}

                                {shop.status !== 'PENDING' && (
                                  <>
                                    <DropdownMenuSeparator className="bg-[#374151]" />
                                    <DropdownMenuItem
                                      onClick={() => toggleBarbershopStatus(shop)}
                                      disabled={actionLoadingId === shop.id}
                                      className={`text-xs font-bold rounded-md cursor-pointer flex items-center gap-2 px-2 py-2 ${
                                        shop.isActive
                                          ? 'text-white hover:bg-[#dc2626] hover:text-white'
                                          : 'text-white hover:bg-[#059669] hover:text-white'
                                      }`}
                                    >
                                      <Power className="h-4 w-4 text-white" />
                                      <span>
                                        {actionLoadingId === shop.id
                                          ? 'Alterando status...'
                                          : shop.isActive
                                          ? 'Desativar Unidade'
                                          : 'Ativar Unidade'}
                                      </span>
                                    </DropdownMenuItem>
                                  </>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>

            <CardFooter className="p-4 border-t border-[#374151] bg-[#030712] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-white">
              <div className="flex items-center gap-3">
                <span className="font-medium text-white">
                  Exibindo <strong className="text-white font-bold">{filteredBarbershops.length}</strong> de{' '}
                  <strong className="text-white font-bold">{barbershops.length}</strong> empresas cadastradas
                </span>
                {searchTerm && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setSearchTerm('')}
                    className="h-7 text-xs text-white hover:text-white hover:bg-[#1f2937] px-2 font-bold underline cursor-pointer"
                  >
                    Limpar pesquisa
                  </Button>
                )}
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <Badge
                  variant="outline"
                  className="bg-[#111827] border-[#374151] text-white text-[11px] font-bold"
                >
                  {activeCount} ativas
                </Badge>
                <Badge
                  variant="outline"
                  className="bg-[#111827] border-[#374151] text-white text-[11px] font-bold"
                >
                  {trialingCount} em trial
                </Badge>
                {pendingCount > 0 && (
                  <Badge className="bg-[#d97706] text-white border-[#f59e0b] text-[11px] font-bold">
                    {pendingCount} pendentes
                  </Badge>
                )}
                {expiredCount > 0 && (
                  <Badge className="bg-[#dc2626] text-white border-[#ef4444] text-[11px] font-bold">
                    {expiredCount} expirados
                  </Badge>
                )}
              </div>
            </CardFooter>
          </Card>
        </TooltipProvider>


        {/* System Diagnostics Card */}
        <div className="bg-[#111827] border border-[#374151] rounded-xl p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <span className="p-1.5 rounded-lg bg-[#2563eb] text-white border border-[#3b82f6]">
              <Server className="h-4 w-4" />
            </span>
            <h3 className="font-bold text-white text-base">Diagnóstico de Infraestrutura SaaS</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs text-white">
            <div className="p-3.5 bg-[#030712] rounded-lg border border-[#374151] shadow-sm">
              <span className="text-white font-bold block mb-1">Ambiente de Execução:</span>
              <span className="font-mono text-white font-bold">{metrics?.system?.nodeEnv || 'development'}</span>
            </div>
            <div className="p-3.5 bg-[#030712] rounded-lg border border-[#374151] shadow-sm">
              <span className="text-white font-bold block mb-1">Banco de Dados:</span>
              <span className="font-mono text-white font-bold">{metrics?.system?.database || 'PostgreSQL (Prisma)'}</span>
            </div>
            <div className="p-3.5 bg-[#030712] rounded-lg border border-[#374151] shadow-sm">
              <span className="text-white font-bold block mb-1">Isolamento Multi-Tenant:</span>
              <span className="font-mono text-white font-bold bg-[#059669] px-2 py-0.5 rounded border border-[#10b981] inline-block">{metrics?.system?.isolation || 'ATIVO E BLINDADO'}</span>
            </div>
          </div>
        </div>
      </main>

      {/* Modal "+ Nova Empresa" */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#111827] border border-[#374151] rounded-2xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl relative my-8">
            <div className="flex items-center justify-between border-b border-[#374151] pb-4 mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#2563eb] border border-[#3b82f6] text-white flex items-center justify-center shadow-sm">
                  <Building2 className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Cadastrar Nova Empresa</h3>
                  <p className="text-xs text-white font-medium mt-0.5">Criar um novo tenant com seu administrador inicial</p>
                </div>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                disabled={isSubmittingShop}
                className="p-1.5 text-white hover:bg-[#1f2937] rounded-lg transition"
              >
                <X className="w-5 h-5 text-white" />
              </button>
            </div>

            {formError && (
              <div className="mb-6 p-4 rounded-xl bg-[#dc2626] border border-[#ef4444] text-white font-bold flex items-center gap-3 text-sm shadow-sm">
                <AlertTriangle className="h-5 w-5 text-white shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleCreateBarbershop} className="space-y-6">
              {/* Seção 1: Dados da Empresa */}
              <div>
                <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-3 flex items-center gap-2">
                  <span className="p-1 rounded bg-[#2563eb] text-white border border-[#3b82f6]">
                    <Building2 className="w-3.5 h-3.5" />
                  </span>
                  1. Dados da Unidade (Tenant)
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-white mb-1.5">
                      Nome da Empresa *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: Minha Empresa Ltda"
                      value={formData.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-[#030712] border border-[#374151] rounded-lg text-sm text-white placeholder-gray-400 focus:outline-none focus:border-[#2563eb] transition font-medium"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-bold text-white">
                        Slug Personalizado (/b/slug)
                      </label>
                      <span className="text-[10px] text-white font-medium">
                        Opcional (Deixe em branco para gerar a partir do nome)
                      </span>
                    </div>
                    <div className="flex items-center">
                      <span className="px-3 py-2.5 bg-[#1f2937] border border-r-0 border-[#374151] rounded-l-lg text-xs text-white font-mono font-bold select-none">
                        /b/
                      </span>
                      <input
                        type="text"
                        placeholder="ex: minha-empresa"
                        value={formData.slug}
                        onChange={(e) => handleInputChange('slug', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                        className="w-full px-3.5 py-2.5 bg-[#030712] border border-[#374151] rounded-r-lg text-sm text-white placeholder-gray-400 focus:outline-none focus:border-[#2563eb] transition font-mono font-bold"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-white mb-1.5">
                      Email Comercial *
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-white absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="email"
                        required
                        placeholder="contato@empresa.com"
                        value={formData.email}
                        onChange={(e) => handleInputChange('email', e.target.value)}
                        className="w-full pl-9 pr-3.5 py-2.5 bg-[#030712] border border-[#374151] rounded-lg text-sm text-white placeholder-gray-400 focus:outline-none focus:border-[#2563eb] transition font-medium"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-bold text-white">
                        Telefone / WhatsApp
                      </label>
                      <span className="text-[10px] font-mono text-white font-bold">(00) 00000-0000</span>
                    </div>
                    <div className="relative">
                      <Phone className="w-4 h-4 text-white absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="tel"
                        maxLength={15}
                        placeholder="(11) 98765-4321"
                        value={formData.phone}
                        onChange={(e) => handleInputChange('phone', e.target.value)}
                        className="w-full pl-9 pr-3.5 py-2.5 bg-[#030712] border border-[#374151] rounded-lg text-sm text-white placeholder-gray-400 focus:outline-none focus:border-[#2563eb] transition font-mono font-medium"
                      />
                    </div>
                  </div>

                  <div className="sm:col-span-2">
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-bold text-white">
                        Endereço Completo
                      </label>
                      <span className="text-[10px] text-white font-bold">
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
                  <div className="sm:col-span-2 border-t border-[#374151] pt-3">
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-bold text-white flex items-center gap-1.5">
                        <CalendarClock className="w-4 h-4 text-white" />
                        Vigência / Vencimento do Contrato
                      </label>
                      <span className="text-[10px] text-white font-medium">
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
                        className="px-2.5 py-1 text-xs font-bold rounded-lg bg-[#030712] hover:bg-[#1f2937] text-white border border-[#374151] transition cursor-pointer shadow-sm"
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
                        className="px-2.5 py-1 text-xs font-bold rounded-lg bg-[#030712] hover:bg-[#1f2937] text-white border border-[#374151] transition cursor-pointer shadow-sm"
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
                        className="px-2.5 py-1 text-xs font-bold rounded-lg bg-[#030712] hover:bg-[#1f2937] text-white border border-[#374151] transition cursor-pointer shadow-sm"
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
                        className="px-2.5 py-1 text-xs font-bold rounded-lg bg-[#030712] hover:bg-[#1f2937] text-white border border-[#374151] transition cursor-pointer shadow-sm"
                      >
                        +365 dias (1 ano)
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setFormData(prev => ({ ...prev, contractExpiresAt: '' }))
                        }}
                        className="px-2.5 py-1 text-xs font-bold rounded-lg bg-[#059669] hover:bg-[#047857] text-white border border-[#10b981] transition cursor-pointer shadow-sm"
                      >
                        Vitalício (Sem vencimento)
                      </button>
                    </div>

                    <div className="relative">
                      <Calendar className="w-4 h-4 text-white absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="date"
                        value={formData.contractExpiresAt}
                        onChange={(e) => setFormData(prev => ({ ...prev, contractExpiresAt: e.target.value }))}
                        className="w-full pl-9 pr-3.5 py-2.5 bg-[#030712] border border-[#374151] rounded-lg text-sm text-white focus:outline-none focus:border-[#2563eb] transition font-medium"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Seção 2: Administrador Inicial */}
              <div className="border-t border-[#374151] pt-5">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-3 flex items-center gap-2">
                  <span className="p-1 rounded bg-[#059669] text-white border border-[#10b981]">
                    <UserCheck className="w-3.5 h-3.5" />
                  </span>
                  2. Administrador Inicial da Empresa
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-white mb-1.5">
                      Nome do Administrador *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: Pedro Silva"
                      value={formData.adminName}
                      onChange={(e) => handleInputChange('adminName', e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-[#030712] border border-[#374151] rounded-lg text-sm text-white placeholder-gray-400 focus:outline-none focus:border-[#2563eb] transition font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-white mb-1.5">
                      Email de Acesso do Admin *
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-white absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="email"
                        required
                        placeholder="admin@empresa.com"
                        value={formData.adminEmail}
                        onChange={(e) => handleInputChange('adminEmail', e.target.value)}
                        className="w-full pl-9 pr-3.5 py-2.5 bg-[#030712] border border-[#374151] rounded-lg text-sm text-white placeholder-gray-400 focus:outline-none focus:border-[#2563eb] transition font-medium"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-white mb-1.5">
                      Senha Provisória * (mínimo 6 dígitos)
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-white absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="password"
                        required
                        minLength={6}
                        placeholder="••••••••"
                        value={formData.adminPassword}
                        onChange={(e) => handleInputChange('adminPassword', e.target.value)}
                        className="w-full pl-9 pr-3.5 py-2.5 bg-[#030712] border border-[#374151] rounded-lg text-sm text-white placeholder-gray-400 focus:outline-none focus:border-[#2563eb] transition font-medium"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-bold text-white">
                        Telefone do Administrador
                      </label>
                      <span className="text-[10px] font-mono text-white font-bold">(00) 00000-0000</span>
                    </div>
                    <div className="relative">
                      <Phone className="w-4 h-4 text-white absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="tel"
                        maxLength={15}
                        placeholder="(11) 98765-4321"
                        value={formData.adminPhone}
                        onChange={(e) => handleInputChange('adminPhone', e.target.value)}
                        className="w-full pl-9 pr-3.5 py-2.5 bg-[#030712] border border-[#374151] rounded-lg text-sm text-white placeholder-gray-400 focus:outline-none focus:border-[#2563eb] transition font-mono font-medium"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Botões do Formulário */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#374151]">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  disabled={isSubmittingShop}
                  className="px-4 py-2.5 bg-[#1f2937] hover:bg-[#374151] text-white rounded-lg text-sm font-bold border border-[#374151] transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingShop}
                  className="flex items-center gap-2 px-6 py-2.5 bg-[#059669] hover:bg-[#047857] text-white font-bold rounded-lg text-sm border border-[#10b981] transition-colors disabled:opacity-50 cursor-pointer shadow-sm"
                >
                  {isSubmittingShop ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin text-white" />
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
        <div className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#111827] border border-[#374151] rounded-2xl max-w-3xl w-full p-6 sm:p-8 shadow-2xl relative my-8">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[#374151] pb-4 mb-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-[#d97706] border border-[#f59e0b] flex items-center justify-center text-white">
                  <Building2 className="w-6 h-6 stroke-[2.5]" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xl font-bold text-white">{selectedShopForDetails.name}</h3>
                    <span
                      className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold ${
                        selectedShopForDetails.isActive
                          ? 'bg-[#059669] text-white border border-[#10b981]'
                          : 'bg-[#dc2626] text-white border border-[#ef4444]'
                      }`}
                    >
                      {selectedShopForDetails.isActive ? 'Ativa' : 'Desativada'}
                    </span>
                  </div>
                  <p className="text-xs text-white font-mono mt-0.5">ID: {selectedShopForDetails.id}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedShopForDetails(null)}
                className="p-2 text-white bg-[#1f2937] hover:bg-[#374151] border border-[#4b5563] rounded-lg transition cursor-pointer"
              >
                <X className="w-5 h-5 stroke-[2.5]" />
              </button>
            </div>

            <div className="space-y-6 max-h-[72vh] overflow-y-auto pr-1">
              {/* Card 1: Registro & Origem */}
              <div className="bg-[#030712] border border-[#374151] rounded-xl p-4 sm:p-5">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-3 flex items-center gap-2">
                  <span className="p-1 rounded bg-[#d97706] text-white"><Calendar className="w-3.5 h-3.5" /></span>
                  Informações de Cadastro
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-white font-semibold block mb-1">Data e Hora do Cadastro:</span>
                    <span className="text-white font-bold text-sm flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-[#d97706]" />
                      {new Date(selectedShopForDetails.createdAt).toLocaleString('pt-BR')}
                    </span>
                  </div>
                  <div>
                    <span className="text-white font-semibold block mb-1">Cadastrado por:</span>
                    {selectedShopForDetails.creator ? (
                      <div className="text-white">
                        <span className="font-bold text-white flex items-center gap-1">
                          <Crown className="w-3.5 h-3.5 text-[#d97706]" />
                          {selectedShopForDetails.creator.name}
                        </span>
                        <span className="text-white text-[11px] block">{selectedShopForDetails.creator.email}</span>
                      </div>
                    ) : (
                      <span className="text-white italic">Sistema / Registro Direto</span>
                    )}
                  </div>
                  <div>
                    <span className="text-white font-semibold block mb-1">Email Comercial:</span>
                    <span className="text-white font-mono">{selectedShopForDetails.email}</span>
                  </div>
                  <div>
                    <span className="text-white font-semibold block mb-1">Telefone da Unidade:</span>
                    <span className="text-white font-mono">{selectedShopForDetails.phone || 'Não informado'}</span>
                  </div>
                  <div className="sm:col-span-2">
                    <span className="text-white font-semibold block mb-1">Endereço:</span>
                    <span className="text-white">{selectedShopForDetails.address || 'Não informado'}</span>
                  </div>
                </div>
              </div>

              {/* Card: Link Público & Identificador (Slug) */}
              <div className="bg-[#030712] border border-[#374151] rounded-xl p-4 sm:p-5">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <span className="p-1 rounded bg-[#2563eb] text-white"><Globe className="w-3.5 h-3.5" /></span>
                    Link Público & Identificador (Slug)
                  </h4>
                  {selectedShopForDetails.slug && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold bg-[#1e40af] text-white border border-[#3b82f6]">
                      <Link2 className="w-3.5 h-3.5" />
                      /b/{selectedShopForDetails.slug}
                    </span>
                  )}
                </div>

                <div className="space-y-3">
                  <div className="bg-[#111827] border border-[#374151] rounded-lg p-3">
                    <div className="text-xs text-white font-semibold mb-1">Endereço público do catálogo:</div>
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                      <div className="flex-1 font-mono text-xs text-white truncate bg-[#030712] px-3 py-2 rounded border border-[#374151]">
                        {typeof window !== 'undefined' ? `${window.location.origin}/b/${selectedShopForDetails.slug || ''}` : `/b/${selectedShopForDetails.slug}`}
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            if (typeof navigator !== 'undefined' && navigator.clipboard) {
                              navigator.clipboard.writeText(`${window.location.origin}/b/${selectedShopForDetails.slug || ''}`)
                              alert('Link copiado com sucesso!')
                            }
                          }}
                          className="px-3.5 py-2 bg-[#1f2937] hover:bg-[#374151] text-white border border-[#4b5563] rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition"
                        >
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copiar</span>
                        </button>
                        {selectedShopForDetails.slug && (
                          <a
                            href={`/b/${selectedShopForDetails.slug}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3.5 py-2 bg-[#2563eb] hover:bg-[#1d4ed8] text-white border border-[#3b82f6] rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            <span>Visualizar</span>
                          </a>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Edição rápida de slug */}
                  <div className="bg-[#111827] border border-[#374151] rounded-lg p-3">
                    <label className="block text-xs text-white mb-1.5 font-bold">
                      Alterar Slug desta Unidade:
                    </label>
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                      <div className="flex items-center px-3 py-2 bg-[#030712] border border-[#374151] rounded-lg text-xs text-white font-mono select-none">
                        /b/
                      </div>
                      <input
                        type="text"
                        value={slugEditValue}
                        onChange={(e) => setSlugEditValue(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                        placeholder="ex: nova-unidade-vip"
                        className="flex-1 px-3 py-2 bg-[#030712] border border-[#374151] rounded-lg text-xs text-white font-mono font-medium focus:outline-none focus:border-[#2563eb]"
                      />
                      <button
                        type="button"
                        onClick={handleUpdateSlug}
                        disabled={isUpdatingSlug || !slugEditValue.trim() || slugEditValue.trim() === selectedShopForDetails.slug}
                        className="px-4 py-2 bg-[#2563eb] hover:bg-[#1d4ed8] text-white font-bold rounded-lg text-xs transition cursor-pointer disabled:opacity-50 border border-[#3b82f6]"
                      >
                        {isUpdatingSlug ? 'Salvando...' : 'Salvar Slug'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Card 2: Contrato & Vigência */}
              <div className="bg-[#030712] border border-[#374151] rounded-xl p-4 sm:p-5">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <span className="p-1 rounded bg-[#059669] text-white"><CalendarClock className="w-3.5 h-3.5" /></span>
                    Contrato & Vigência da Licença
                  </h4>
                  {(() => {
                    const status = getContractStatus(selectedShopForDetails.contractExpiresAt)
                    return (
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${status.color}`}>
                        <CalendarClock className="w-3.5 h-3.5" />
                        Status: {status.label}
                      </span>
                    )
                  })()}
                </div>

                <p className="text-xs text-white font-medium mb-4">
                  {selectedShopForDetails.contractExpiresAt
                    ? `O contrato desta unidade expira em ${new Date(selectedShopForDetails.contractExpiresAt).toLocaleDateString('pt-BR')}. Você pode estender ou renovar o prazo abaixo.`
                    : 'Esta unidade possui contrato vitalício / sem data de expiração cadastrada.'}
                </p>

                {/* Formulário de Renovação / Alteração */}
                <div className="bg-[#111827] border border-[#374151] rounded-lg p-4">
                  <label className="block text-xs font-bold text-white mb-2.5">
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
                      className="px-3 py-1.5 text-xs font-bold rounded-lg bg-[#1f2937] hover:bg-[#374151] text-white border border-[#4b5563] transition cursor-pointer"
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
                      className="px-3 py-1.5 text-xs font-bold rounded-lg bg-[#1f2937] hover:bg-[#374151] text-white border border-[#4b5563] transition cursor-pointer"
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
                      className="px-3 py-1.5 text-xs font-bold rounded-lg bg-[#1f2937] hover:bg-[#374151] text-white border border-[#4b5563] transition cursor-pointer"
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
                      className="px-3 py-1.5 text-xs font-bold rounded-lg bg-[#1f2937] hover:bg-[#374151] text-white border border-[#4b5563] transition cursor-pointer"
                    >
                      +365 dias (1 ano)
                    </button>
                    <button
                      type="button"
                      onClick={() => setContractEditDate('')}
                      className="px-3 py-1.5 text-xs font-bold rounded-lg bg-[#059669] hover:bg-[#047857] text-white border border-[#10b981] transition cursor-pointer"
                    >
                      Tornar Vitalício
                    </button>
                  </div>

                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                    <div className="relative flex-1">
                      <Calendar className="w-4 h-4 text-white absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="date"
                        value={contractEditDate}
                        onChange={(e) => setContractEditDate(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 bg-[#030712] border border-[#374151] rounded-lg text-xs text-white focus:outline-none focus:border-[#059669] transition"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleUpdateContract}
                      disabled={isUpdatingContract}
                      className="flex items-center justify-center gap-2 px-5 py-2.5 bg-[#059669] hover:bg-[#047857] text-white font-bold rounded-lg text-xs border border-[#10b981] transition disabled:opacity-50 cursor-pointer"
                    >
                      {isUpdatingContract ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          Salvando...
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5 stroke-[2.5]" />
                          Salvar Vigência
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Card 3: Administrador da Unidade */}
              <div className="bg-[#030712] border border-[#374151] rounded-xl p-4 sm:p-5">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-3 flex items-center gap-2">
                  <span className="p-1 rounded bg-[#2563eb] text-white"><UserCheck className="w-3.5 h-3.5" /></span>
                  Administrador(es) da Unidade
                </h4>

                {(() => {
                  const admins = (selectedShopForDetails.users || []).filter(u => u.role === 'ADMIN')
                  if (admins.length === 0) {
                    return (
                      <p className="text-xs text-white font-medium italic">
                        Nenhum usuário com função de Administrador vinculado a esta empresa.
                      </p>
                    )
                  }
                  return (
                    <div className="space-y-3">
                      {admins.map((adm) => (
                        <div key={adm.id} className="p-3 bg-[#111827] border border-[#374151] rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                          <div>
                            <div className="font-bold text-white text-sm flex items-center gap-2">
                              {adm.name}
                              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${adm.isActive ? 'bg-[#059669] text-white border border-[#10b981]' : 'bg-[#dc2626] text-white border border-[#ef4444]'}`}>
                                {adm.isActive ? 'Ativo' : 'Inativo'}
                              </span>
                            </div>
                            <div className="text-white font-medium mt-0.5">{adm.email} • {adm.phone || 'Sem telefone'}</div>
                          </div>
                          <div className="text-right text-white font-semibold text-[11px]">
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
                <div className="p-4 bg-[#030712] rounded-xl border border-[#374151] text-center">
                  <div className="text-2xl font-bold text-white">{selectedShopForDetails._count?.users ?? 0}</div>
                  <div className="text-xs text-white font-bold mt-1">Colaboradores</div>
                </div>
                <div className="p-4 bg-[#030712] rounded-xl border border-[#374151] text-center">
                  <div className="text-2xl font-bold text-white">{selectedShopForDetails._count?.clients ?? 0}</div>
                  <div className="text-xs text-white font-bold mt-1">Clientes</div>
                </div>
                <div className="p-4 bg-[#030712] rounded-xl border border-[#374151] text-center">
                  <div className="text-2xl font-bold text-white">{selectedShopForDetails._count?.services ?? 0}</div>
                  <div className="text-xs text-white font-bold mt-1">Serviços</div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between pt-5 border-t border-[#374151] mt-6">
              <button
                type="button"
                onClick={() => {
                  toggleBarbershopStatus(selectedShopForDetails)
                  setSelectedShopForDetails((prev) => prev ? { ...prev, isActive: !prev.isActive } : null)
                }}
                disabled={actionLoadingId === selectedShopForDetails.id}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold border transition ${
                  selectedShopForDetails.isActive
                    ? 'border-[#ef4444] bg-[#dc2626] text-white hover:bg-[#b91c1c]'
                    : 'border-[#10b981] bg-[#059669] text-white hover:bg-[#047857]'
                } disabled:opacity-50 cursor-pointer`}
              >
                <Power className="w-4 h-4 stroke-[2.5]" />
                {selectedShopForDetails.isActive ? 'Desativar Unidade' : 'Ativar Unidade'}
              </button>

              <button
                type="button"
                onClick={() => setSelectedShopForDetails(null)}
                className="px-6 py-2.5 bg-[#1f2937] hover:bg-[#374151] text-white border border-[#4b5563] rounded-lg text-xs font-bold transition cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal "Análise e Aprovação de Cadastro" */}
      {selectedShopForApproval && (
        <div className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#111827] border border-[#374151] rounded-2xl max-w-3xl w-full p-6 sm:p-8 shadow-2xl relative my-8">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[#374151] pb-4 mb-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-[#d97706] border border-[#f59e0b] flex items-center justify-center text-white">
                  <ShieldCheck className="w-6 h-6 stroke-[2.5]" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xl font-bold text-white">Análise e Aprovação de Cadastro</h3>
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-[#d97706] text-white border border-[#f59e0b]">
                      <Clock className="w-3.5 h-3.5" />
                      {selectedShopForApproval.status === 'PENDING'
                        ? 'Aguardando Aprovação'
                        : selectedShopForApproval.status === 'REJECTED'
                        ? 'Rejeitado'
                        : 'Aprovado'}
                    </span>
                  </div>
                  <p className="text-xs text-white font-medium mt-0.5">
                    Solicitado em: {new Date(selectedShopForApproval.createdAt).toLocaleString('pt-BR')} &bull; ID: {selectedShopForApproval.id}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedShopForApproval(null)}
                className="p-2 text-white bg-[#1f2937] hover:bg-[#374151] border border-[#4b5563] rounded-lg transition cursor-pointer"
              >
                <X className="w-5 h-5 stroke-[2.5]" />
              </button>
            </div>

            <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-1">
              {/* Card 1: Dados do Estabelecimento */}
              <div className="bg-[#030712] border border-[#374151] rounded-xl p-4 sm:p-5">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <span className="p-1 rounded bg-[#d97706] text-white"><Building2 className="w-3.5 h-3.5" /></span>
                    1. Informações do Estabelecimento (Editáveis)
                  </h4>
                  <span className="text-[11px] text-white font-semibold">Revise ou complemente antes de aprovar</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="block text-white mb-1.5 font-bold">Nome da Empresa:</label>
                    <input
                      type="text"
                      value={approvalFormData.name}
                      onChange={(e) => handleApprovalInputChange('name', e.target.value)}
                      className="w-full px-3 py-2 bg-[#111827] border border-[#374151] rounded-lg text-xs text-white font-medium focus:outline-none focus:border-[#2563eb]"
                    />
                  </div>

                  <div>
                    <label className="block text-white mb-1.5 font-bold">E-mail Comercial:</label>
                    <input
                      type="email"
                      value={approvalFormData.email}
                      onChange={(e) => handleApprovalInputChange('email', e.target.value)}
                      className="w-full px-3 py-2 bg-[#111827] border border-[#374151] rounded-lg text-xs text-white font-mono focus:outline-none focus:border-[#2563eb]"
                    />
                  </div>

                  <div>
                    <label className="block text-white mb-1.5 font-bold">Telefone Comercial / WhatsApp:</label>
                    <input
                      type="tel"
                      value={approvalFormData.phone}
                      onChange={(e) => handleApprovalInputChange('phone', e.target.value)}
                      className="w-full px-3 py-2 bg-[#111827] border border-[#374151] rounded-lg text-xs text-white font-mono focus:outline-none focus:border-[#2563eb]"
                    />
                  </div>

                  <div>
                    <label className="block text-white mb-1.5 font-bold">Slug do Link Público (/b/slug):</label>
                    <input
                      type="text"
                      value={approvalFormData.slug}
                      onChange={(e) => handleApprovalInputChange('slug', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                      placeholder="ex: barbearia-central"
                      className="w-full px-3 py-2 bg-[#111827] border border-[#374151] rounded-lg text-xs text-white font-mono font-medium focus:outline-none focus:border-[#2563eb]"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-white mb-1.5 font-bold">Endereço Completo:</label>
                    <AddressAutocomplete
                      id="approvalAddress"
                      value={approvalFormData.address}
                      onChange={(val) => handleApprovalInputChange('address', val)}
                      placeholder="Rua, número, cidade - UF"
                      className="w-full px-3 py-2 bg-[#111827] border border-[#374151] rounded-lg text-xs text-white font-medium focus:outline-none focus:border-[#2563eb]"
                    />
                  </div>
                </div>
              </div>

              {/* Card 2: Administrador Solicitante */}
              <div className="bg-[#030712] border border-[#374151] rounded-xl p-4 sm:p-5">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <span className="p-1 rounded bg-[#2563eb] text-white"><UserCheck className="w-3.5 h-3.5" /></span>
                    2. Dados do Administrador Solicitante
                  </h4>
                  <span className="text-[11px] text-white font-semibold">Credenciais para acesso à conta de gestão</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                  <div>
                    <label className="block text-white mb-1.5 font-bold">Nome do Responsável:</label>
                    <input
                      type="text"
                      value={approvalFormData.adminName}
                      onChange={(e) => handleApprovalInputChange('adminName', e.target.value)}
                      className="w-full px-3 py-2 bg-[#111827] border border-[#374151] rounded-lg text-xs text-white font-medium focus:outline-none focus:border-[#2563eb]"
                    />
                  </div>

                  <div>
                    <label className="block text-white mb-1.5 font-bold">E-mail de Login:</label>
                    <input
                      type="email"
                      value={approvalFormData.adminEmail}
                      onChange={(e) => handleApprovalInputChange('adminEmail', e.target.value)}
                      className="w-full px-3 py-2 bg-[#111827] border border-[#374151] rounded-lg text-xs text-white font-mono focus:outline-none focus:border-[#2563eb]"
                    />
                  </div>

                  <div>
                    <label className="block text-white mb-1.5 font-bold">Telefone do Gestor:</label>
                    <input
                      type="tel"
                      value={approvalFormData.adminPhone}
                      onChange={(e) => handleApprovalInputChange('adminPhone', e.target.value)}
                      className="w-full px-3 py-2 bg-[#111827] border border-[#374151] rounded-lg text-xs text-white font-mono focus:outline-none focus:border-[#2563eb]"
                    />
                  </div>
                </div>
              </div>

              {/* Card 3: Vigência do Contrato Inicial */}
              <div className="bg-[#030712] border border-[#374151] rounded-xl p-4 sm:p-5">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-2 flex items-center gap-2">
                  <span className="p-1 rounded bg-[#059669] text-white"><CalendarClock className="w-3.5 h-3.5" /></span>
                  3. Vigência Inicial do Contrato
                </h4>
                <p className="text-xs text-white font-medium mb-3">
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
                    className="px-3 py-1.5 text-xs font-bold rounded-lg bg-[#1f2937] hover:bg-[#374151] text-white border border-[#4b5563] transition cursor-pointer"
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
                    className="px-3 py-1.5 text-xs font-bold rounded-lg bg-[#1f2937] hover:bg-[#374151] text-white border border-[#4b5563] transition cursor-pointer"
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
                    className="px-3 py-1.5 text-xs font-bold rounded-lg bg-[#1f2937] hover:bg-[#374151] text-white border border-[#4b5563] transition cursor-pointer"
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
                    className="px-3 py-1.5 text-xs font-bold rounded-lg bg-[#1f2937] hover:bg-[#374151] text-white border border-[#4b5563] transition cursor-pointer"
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
                    className="px-3 py-1.5 text-xs font-bold rounded-lg bg-[#059669] hover:bg-[#047857] text-white border border-[#10b981] transition cursor-pointer"
                  >
                    Vitalício
                  </button>
                </div>

                <div className="relative max-w-xs">
                  <Calendar className="w-4 h-4 text-white absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="date"
                    value={approvalFormData.contractExpiresAt}
                    onChange={(e) =>
                      setApprovalFormData((prev) => ({
                        ...prev,
                        contractExpiresAt: e.target.value,
                      }))
                    }
                    className="w-full pl-9 pr-3 py-2 bg-[#111827] border border-[#374151] rounded-lg text-xs text-white focus:outline-none focus:border-[#059669] transition"
                  />
                </div>
              </div>
            </div>

            {/* Footer com botões de decisão */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-5 border-t border-[#374151] mt-6">
              <div>
                <button
                  type="button"
                  onClick={() => handleProcessApproval('REJECTED')}
                  disabled={isProcessingApproval}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-lg text-xs font-bold border border-[#ef4444] bg-[#dc2626] text-white hover:bg-[#b91c1c] transition disabled:opacity-50 cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <X className="w-4 h-4 stroke-[2.5]" />
                  Rejeitar Solicitação
                </button>
              </div>

              <div className="flex items-center gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => handleProcessApproval('SAVE')}
                  disabled={isProcessingApproval}
                  className="px-4 py-2.5 bg-[#1f2937] hover:bg-[#374151] text-white border border-[#4b5563] rounded-lg text-xs font-bold transition disabled:opacity-50 cursor-pointer"
                >
                  Salvar Informações
                </button>

                <button
                  type="button"
                  onClick={() => handleProcessApproval('APPROVED')}
                  disabled={isProcessingApproval}
                  className="flex items-center justify-center gap-2 px-5 py-2.5 bg-[#059669] hover:bg-[#047857] text-white font-bold rounded-lg text-xs border border-[#10b981] transition-colors disabled:opacity-50 cursor-pointer"
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

      {/* Modal de Reset de Período de Trial */}
      {trialResetShop && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85">
          <div className="bg-[#111827] border border-[#374151] w-full max-w-md rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#374151] pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#d97706] border border-[#f59e0b] flex items-center justify-center text-white">
                  <Clock className="w-5 h-5 stroke-[2.5]" />
                </div>
                <div>
                  <h4 className="font-bold text-white text-base">Resetar Período de Trial</h4>
                  <p className="text-xs text-white font-medium">{trialResetShop.name}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setTrialResetShop(null)}
                className="p-1.5 text-white bg-[#1f2937] hover:bg-[#374151] border border-[#4b5563] rounded-lg text-xs transition"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-white font-medium leading-relaxed">
              Defina a quantidade de dias para reativar o período de testes gratuito desta barbearia. A conta e o administrador serão ativados automaticamente.
            </p>

            {/* Presets Rápidos */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-white uppercase tracking-wider">
                1. Selecione um Prazo Predefinido:
              </label>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { label: '+7 dias', val: 7 },
                  { label: '+14 dias', val: 14 },
                  { label: '+30 dias', val: 30 },
                  { label: '+60 dias', val: 60 },
                ].map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => setTrialDaysInput(item.val)}
                    className={`py-2 px-1 text-xs font-bold rounded-xl border transition cursor-pointer ${
                      trialDaysInput === item.val
                        ? 'bg-[#d97706] text-white border-[#f59e0b]'
                        : 'bg-[#030712] border-[#374151] text-white hover:bg-[#1f2937]'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Dias personalizados */}
            <div>
              <label className="block text-xs font-bold text-white uppercase tracking-wider mb-1">
                2. Ou especifique a quantidade de dias:
              </label>
              <input
                type="number"
                min="1"
                max="365"
                value={trialDaysInput}
                onChange={(e) => setTrialDaysInput(Math.max(1, Number(e.target.value) || 1))}
                className="w-full px-3 py-2 bg-[#030712] border border-[#374151] rounded-xl text-xs text-white font-mono focus:outline-none focus:border-[#d97706]"
              />
            </div>

            {/* Justificativa / Motivo */}
            <div>
              <label className="block text-xs font-bold text-white uppercase tracking-wider mb-1">
                3. Motivo / Justificativa do Reset:
              </label>
              <input
                type="text"
                placeholder="Ex: Degustação estendida, suporte comercial..."
                value={trialReasonInput}
                onChange={(e) => setTrialReasonInput(e.target.value)}
                className="w-full px-3 py-2 bg-[#030712] border border-[#374151] rounded-xl text-xs text-white placeholder-gray-400 focus:outline-none focus:border-[#d97706]"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#374151]">
              <button
                type="button"
                onClick={() => setTrialResetShop(null)}
                disabled={isResettingTrial}
                className="px-4 py-2 rounded-xl bg-[#1f2937] hover:bg-[#374151] text-white text-xs font-bold border border-[#4b5563] transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmResetTrial}
                disabled={isResettingTrial}
                className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-[#d97706] hover:bg-[#b45309] text-white text-xs font-bold border border-[#f59e0b] transition disabled:opacity-50"
              >
                {isResettingTrial ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Resetando...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 stroke-[2.5]" />
                    <span>Confirmar e Liberar Trial</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
