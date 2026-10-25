'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
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

function DeveloperDashboardContent() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const statusParam = searchParams?.get('status')
  const actionParam = searchParams?.get('action') || searchParams?.get('novo') || searchParams?.get('modal')

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
    if (statusParam === 'APPROVED' || statusParam === 'ACTIVE') {
      setFilterTab('ACTIVE')
    } else if (statusParam === 'PENDING') {
      setFilterTab('PENDING')
    } else if (statusParam === 'SUSPENDED') {
      setFilterTab('SUSPENDED')
    } else if (statusParam === 'CANCELLED' || statusParam === 'CANCELED') {
      setFilterTab('CANCELLED')
    } else if (statusParam === 'ALL') {
      setFilterTab('ALL')
    }
  }, [statusParam])

  useEffect(() => {
    if (actionParam === 'new' || actionParam === 'true') {
      setFormError(null)
      setIsAddModalOpen(true)
    }
  }, [actionParam])

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
        label: 'Contrato Vitalício',
        badgeText: 'Vitalício',
        variant: 'secondary' as const,
        color: 'border-border text-muted-foreground bg-muted',
        isExpired: false,
        daysRemaining: null,
        formattedDate: null,
      }
    }

    const now = new Date()
    const expDate = new Date(contractExpiresAt)
    const diffTime = expDate.getTime() - now.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    const formattedDate = expDate.toLocaleDateString('pt-BR')

    if (diffDays < 0) {
      return {
        label: `Expirado em ${formattedDate}`,
        badgeText: 'Expirado',
        variant: 'destructive' as const,
        color: 'border-destructive/30 text-destructive bg-destructive/10',
        isExpired: true,
        daysRemaining: diffDays,
        formattedDate,
      }
    } else if (diffDays <= 15) {
      return {
        label: `Expira em ${diffDays}d (${formattedDate})`,
        badgeText: `${diffDays}d restantes`,
        variant: 'outline' as const,
        color: 'border-amber-500/30 text-amber-600 dark:text-amber-400 bg-amber-500/10',
        isExpired: false,
        daysRemaining: diffDays,
        formattedDate,
      }
    } else {
      return {
        label: `Válido até ${formattedDate}`,
        badgeText: 'Ativo',
        variant: 'outline' as const,
        color: 'border-border text-foreground bg-muted/40',
        isExpired: false,
        daysRemaining: diffDays,
        formattedDate,
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
    <div className="min-h-screen bg-background text-foreground pb-20 pt-20">
      <DropdownHeader />

      <main className="w-full px-4 md:px-8 max-w-7xl mx-auto space-y-8">
        {/* Top Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-border pb-6 mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
              Gestão da Plataforma SaaS
            </h1>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <Button variant="outline" size="sm" asChild className="gap-2 text-xs">
              <Link href="/developer/billing">
                <CreditCard className="h-4 w-4 text-muted-foreground" />
                <span>Faturamento & Gateway</span>
              </Link>
            </Button>

            <Button variant="outline" size="sm" asChild className="gap-2 text-xs">
              <Link href="/developer/onboarding">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span>Cockpit Onboarding</span>
              </Link>
            </Button>

            <Button
              size="sm"
              onClick={() => {
                setFormError(null)
                setIsAddModalOpen(true)
              }}
              className="gap-1.5 text-xs font-medium"
            >
              <Plus className="h-4 w-4 stroke-[2.5]" />
              <span>Nova Empresa</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={loadData}
              disabled={isLoading}
              className="gap-2 text-xs"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Atualizar</span>
            </Button>
          </div>
        </div>

        {/* Feedback Alert */}
        {message && (
          <div
            className={`mb-6 p-4 rounded-lg flex items-center justify-between gap-3 border shadow-sm ${
              message.type === 'success'
                ? 'bg-muted/80 border-border text-foreground'
                : 'bg-destructive/10 border-destructive/20 text-destructive'
            }`}
          >
            <div className="flex items-center gap-3">
              {message.type === 'success' ? (
                <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-destructive shrink-0" />
              )}
              <span className="text-sm font-medium">{message.text}</span>
            </div>
            <button
              onClick={() => setMessage(null)}
              className="text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Fechar mensagem"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Hub de Faturamento, Gateway, Planos & Assinaturas */}
        <Card className="bg-card text-card-foreground border-border shadow-sm p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-muted text-muted-foreground text-xs font-medium uppercase tracking-wider mb-2 border border-border">
                <CreditCard className="w-3.5 h-3.5" />
                <span>Gestão Financeira SaaS</span>
              </div>
              <h2 className="text-xl font-semibold tracking-tight text-foreground">Faturamento & Planos</h2>
            </div>
            <Button variant="outline" size="sm" asChild className="gap-1.5 self-start sm:self-auto text-xs">
              <Link href="/developer/billing">
                <span>Abrir Faturamento Completo</span>
                <ExternalLink className="w-3.5 h-3.5 text-muted-foreground" />
              </Link>
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
            {/* Card 1: Cobranças Gateway */}
            <Link
              href="/developer/billing?tab=cobrancas"
              className="bg-muted/30 border border-border hover:bg-muted/60 p-4 rounded-lg transition-colors flex flex-col justify-between shadow-none"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-foreground">Cobranças Gateway</span>
                <CreditCard className="w-4 h-4 text-muted-foreground" />
              </div>
              <span className="text-[11px] text-primary font-medium mt-3 flex items-center gap-1 hover:underline">
                Acessar cobranças →
              </span>
            </Link>

            {/* Card 2: Assinaturas SaaS */}
            <Link
              href="/developer/subscriptions"
              className="bg-muted/30 border border-border hover:bg-muted/60 p-4 rounded-lg transition-colors flex flex-col justify-between shadow-none"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-foreground">Assinaturas SaaS</span>
                <Badge variant="secondary" className="text-[10px] font-normal">
                  {barbershops.filter(b => b.subscriptionStatus === 'ACTIVE' || b.isActive).length} ativas
                </Badge>
              </div>
              <span className="text-[11px] text-primary font-medium mt-3 flex items-center gap-1 hover:underline">
                Ver assinaturas →
              </span>
            </Link>

            {/* Card 3: Produtos no Gateway */}
            <Link
              href="/developer/billing?tab=produtos"
              className="bg-muted/30 border border-border hover:bg-muted/60 p-4 rounded-lg transition-colors flex flex-col justify-between shadow-none"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-foreground">Produtos no Gateway</span>
                <Package className="w-4 h-4 text-muted-foreground" />
              </div>
              <span className="text-[11px] text-primary font-medium mt-3 flex items-center gap-1 hover:underline">
                Gerenciar produtos →
              </span>
            </Link>

            {/* Card 4: Planos Cadastrados pelo Developer */}
            <Link
              href="/developer/billing?tab=produtos"
              className="bg-muted/30 border border-border hover:bg-muted/60 p-4 rounded-lg transition-colors flex flex-col justify-between shadow-none"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-foreground">Planos Cadastrados</span>
                <Badge variant="outline" className="text-[10px] font-normal">
                  Developer
                </Badge>
              </div>
              <span className="text-[11px] text-primary font-medium mt-3 flex items-center gap-1 hover:underline">
                Configurar planos →
              </span>
            </Link>
          </div>
        </Card>

        {/* Metrics Grid — Padrão Canônico shadcn/ui */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {/* Métrica 1: Empresas (Tenants) */}
          <Card className="bg-card text-card-foreground border-border shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Empresas (Tenants)</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics?.tenants?.total ?? 0}</div>
              <div className="flex items-center justify-between mt-2 text-xs">
                <div className="flex items-center gap-1.5">
                  <Badge variant="secondary" className="px-1.5 py-0 text-[10px] font-normal">
                    {activeCount} ativas
                  </Badge>
                  <Badge variant="outline" className="px-1.5 py-0 text-[10px] font-normal">
                    {inactiveCount} inativas
                  </Badge>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setFormError(null)
                    setIsAddModalOpen(true)
                  }}
                  className="text-primary hover:underline font-medium text-xs flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Criar
                </button>
              </div>
              {pendingCount > 0 && (
                <button
                  type="button"
                  onClick={() => setFilterTab('PENDING')}
                  className="mt-2 text-xs text-amber-500 hover:underline flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>{pendingCount} aguardando aprovação</span>
                </button>
              )}
            </CardContent>
          </Card>

          {/* Métrica 2: Usuários da Plataforma */}
          <Link href="/usuarios" className="block">
            <Card className="bg-card text-card-foreground border-border shadow-sm hover:border-foreground/20 transition-colors h-full">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Usuários da Plataforma</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics?.users?.total ?? 0}</div>
                <div className="flex items-center gap-1.5 mt-2 text-xs">
                  <Badge variant="secondary" className="px-1.5 py-0 text-[10px] font-normal">
                    {metrics?.users?.byRole?.['ADMIN'] ?? 0} admins
                  </Badge>
                  <Badge variant="outline" className="px-1.5 py-0 text-[10px] font-normal">
                    {metrics?.users?.byRole?.['BARBER'] ?? 0} profissionais
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </Link>

          {/* Métrica 3: Base de Clientes */}
          <Card className="bg-card text-card-foreground border-border shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Base de Clientes</CardTitle>
              <ShieldCheck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics?.clients?.total ?? 0}</div>
              <p className="text-xs text-muted-foreground mt-2">
                Cadastros registrados nos tenants
              </p>
            </CardContent>
          </Card>

          {/* Métrica 4: Serviços no Catálogo */}
          <Card className="bg-card text-card-foreground border-border shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Serviços no Catálogo</CardTitle>
              <Briefcase className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics?.services?.total ?? 0}</div>
              <p className="text-xs text-muted-foreground mt-2">
                Serviços configurados pelas empresas
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Tenants Table - shadcn/ui */}
        <TooltipProvider delayDuration={150}>
          <Card className="bg-card text-card-foreground border-border shadow-sm mb-8 overflow-hidden">
            <CardHeader className="p-5 border-b border-border space-y-4">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div className="flex items-start gap-3">
                  <span className="p-2 rounded-md bg-primary/10 text-primary border border-primary/20 shadow-none mt-0.5">
                    <Building2 className="w-5 h-5" />
                  </span>
                  <div>
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <CardTitle className="text-lg font-semibold tracking-tight text-foreground">
                        Cadastrados
                      </CardTitle>
                      <Badge
                        variant="secondary"
                        className="font-mono text-[11px] px-2 py-0.5 font-normal"
                      >
                        {filteredBarbershops.length}{' '}
                        {filteredBarbershops.length === 1 ? 'empresa' : 'empresas'}
                      </Badge>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="text"
                      placeholder="Buscar por nome, e-mail..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-9 pr-8 py-2 h-9 bg-background border-input text-xs text-foreground placeholder:text-muted-foreground font-medium w-52 sm:w-64"
                    />
                    {searchTerm && (
                      <button
                        type="button"
                        onClick={() => setSearchTerm('')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
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
                    className="h-9 px-4 gap-1.5 text-xs font-medium cursor-pointer"
                  >
                    <Plus className="h-4 w-4 stroke-[2.5]" />
                    <span>Cadastrar Empresa</span>
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleBackfillSlugs}
                    disabled={isSyncingSlugs}
                    className="h-9 px-3.5 text-xs font-medium gap-1.5 cursor-pointer disabled:opacity-50"
                    title="Gera automaticamente slugs únicos para clientes e barbearias antigas sem slug"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 text-muted-foreground ${isSyncingSlugs ? 'animate-spin' : ''}`} />
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
                className={`pt-2 border-t border-border flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar select-none ${
                  isGrabbingTabs ? 'cursor-grabbing' : 'cursor-grab'
                }`}
              >
                <Button
                  type="button"
                  variant={filterTab === 'ALL' ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => {
                    if (dragMovedRef.current) return
                    setFilterTab('ALL')
                  }}
                  className="h-8 px-3 rounded-md text-xs font-medium gap-1.5 shrink-0"
                >
                  <span>Todos</span>
                  <Badge
                    variant="outline"
                    className="px-1.5 py-0 text-[10px] font-mono font-normal"
                  >
                    {barbershops.length}
                  </Badge>
                </Button>

                <Button
                  type="button"
                  variant={filterTab === 'PENDING' ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => {
                    if (dragMovedRef.current) return
                    setFilterTab('PENDING')
                  }}
                  className="h-8 px-3 rounded-md text-xs font-medium gap-1.5 shrink-0"
                >
                  <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                  <span>Aguardando Aprovação</span>
                  {pendingCount > 0 ? (
                    <Badge variant="outline" className="px-1.5 py-0 text-[10px] font-mono font-normal border-amber-500/30 text-amber-600 dark:text-amber-400 bg-amber-500/10">
                      {pendingCount}
                    </Badge>
                  ) : (
                    <Badge
                      variant="outline"
                      className="px-1.5 py-0 text-[10px] font-mono font-normal"
                    >
                      0
                    </Badge>
                  )}
                </Button>

                <Button
                  type="button"
                  variant={filterTab === 'ACTIVE' ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => {
                    if (dragMovedRef.current) return
                    setFilterTab('ACTIVE')
                  }}
                  className="h-8 px-3 rounded-md text-xs font-medium gap-1.5 shrink-0"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-muted-foreground" />
                  <span>Ativos / Aprovados</span>
                  <Badge
                    variant="outline"
                    className="px-1.5 py-0 text-[10px] font-mono font-normal"
                  >
                    {activeCount}
                  </Badge>
                </Button>

                <Button
                  type="button"
                  variant={filterTab === 'TRIALING' ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => {
                    if (dragMovedRef.current) return
                    setFilterTab('TRIALING')
                  }}
                  className="h-8 px-3 rounded-md text-xs font-medium gap-1.5 shrink-0"
                >
                  <CalendarClock className="w-3.5 h-3.5 text-muted-foreground" />
                  <span>Em Trial (7 dias)</span>
                  <Badge variant="outline" className="px-1.5 py-0 text-[10px] font-mono font-normal border-amber-500/30 text-amber-600 dark:text-amber-400 bg-amber-500/10">
                    {trialingCount}
                  </Badge>
                </Button>

                <Button
                  type="button"
                  variant={filterTab === 'EXPIRED' ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => {
                    if (dragMovedRef.current) return
                    setFilterTab('EXPIRED')
                  }}
                  className="h-8 px-3 rounded-md text-xs font-medium gap-1.5 shrink-0"
                >
                  <AlertTriangle className="w-3.5 h-3.5 text-muted-foreground" />
                  <span>Trial Expirado</span>
                  <Badge variant="destructive" className="px-1.5 py-0 text-[10px] font-mono font-normal">
                    {expiredCount}
                  </Badge>
                </Button>

                <Button
                  type="button"
                  variant={filterTab === 'INACTIVE' ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => {
                    if (dragMovedRef.current) return
                    setFilterTab('INACTIVE')
                  }}
                  className="h-8 px-3 rounded-md text-xs font-medium gap-1.5 shrink-0"
                >
                  <Power className="w-3.5 h-3.5 text-muted-foreground" />
                  <span>Inativos / Rejeitados</span>
                  <Badge
                    variant="outline"
                    className="px-1.5 py-0 text-[10px] font-mono font-normal"
                  >
                    {inactiveCount}
                  </Badge>
                </Button>

                <Button
                  type="button"
                  variant={filterTab === 'SUSPENDED' ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => {
                    if (dragMovedRef.current) return
                    setFilterTab('SUSPENDED')
                  }}
                  className="h-8 px-3 rounded-md text-xs font-medium gap-1.5 shrink-0"
                >
                  <ShieldAlert className="w-3.5 h-3.5 text-muted-foreground" />
                  <span>Suspensas</span>
                  <Badge variant="outline" className="px-1.5 py-0 text-[10px] font-mono font-normal border-amber-500/30 text-amber-600 dark:text-amber-400 bg-amber-500/10">
                    {suspendedCount}
                  </Badge>
                </Button>

                <Button
                  type="button"
                  variant={filterTab === 'CANCELLED' ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => {
                    if (dragMovedRef.current) return
                    setFilterTab('CANCELLED')
                  }}
                  className="h-8 px-3 rounded-md text-xs font-medium gap-1.5 shrink-0"
                >
                  <span>Canceladas</span>
                  <Badge
                    variant="outline"
                    className="px-1.5 py-0 text-[10px] font-mono font-normal"
                  >
                    {cancelledCount}
                  </Badge>
                </Button>
              </div>
            </CardHeader>

            <CardContent className="p-0 overflow-x-auto">
              <Table className="w-full text-left border-collapse text-sm">
                <TableHeader className="bg-muted/40 border-b border-border">
                  <TableRow className="border-b border-border hover:bg-transparent">
                    <TableHead className="h-10 px-4 text-xs font-medium text-muted-foreground">
                      Empresa / Tenant
                    </TableHead>
                    <TableHead className="h-10 px-4 text-xs font-medium text-muted-foreground">
                      Cadastrado em
                    </TableHead>
                    <TableHead className="h-10 px-4 text-xs font-medium text-muted-foreground">
                      Plano & Assinatura
                    </TableHead>
                    <TableHead className="h-10 px-4 text-xs font-medium text-muted-foreground">
                      Contato & Gestor
                    </TableHead>
                    <TableHead className="h-10 px-4 text-xs font-medium text-muted-foreground text-center">
                      Equipe
                    </TableHead>
                    <TableHead className="h-10 px-4 text-xs font-medium text-muted-foreground text-center">
                      Clientes
                    </TableHead>
                    <TableHead className="h-10 px-4 text-xs font-medium text-muted-foreground text-center">
                      Serviços
                    </TableHead>
                    <TableHead className="h-10 px-4 text-xs font-medium text-muted-foreground text-center">
                      Agendamentos
                    </TableHead>
                    <TableHead className="h-10 px-4 text-xs font-medium text-muted-foreground text-center">
                      Status
                    </TableHead>
                    <TableHead className="h-10 px-4 text-xs font-medium text-muted-foreground text-right">
                      Ações
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-border">
                  {filteredBarbershops.length === 0 ? (
                    <TableRow className="hover:bg-transparent">
                      <TableCell colSpan={10} className="py-12 text-center text-foreground">
                        <div className="flex flex-col items-center justify-center gap-3 max-w-sm mx-auto">
                          <div className="w-10 h-10 rounded-md bg-muted text-muted-foreground flex items-center justify-center border border-border">
                            <Building2 className="w-5 h-5" />
                          </div>
                          <p className="text-sm font-semibold text-foreground">
                            {searchTerm
                              ? 'Nenhuma empresa encontrada para o termo pesquisado.'
                              : 'Nenhuma empresa cadastrada no sistema.'}
                          </p>
                          <p className="text-xs text-muted-foreground">
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
                              className="mt-2 h-9 px-4 text-xs font-medium gap-1.5"
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
                      <TableRow key={shop.id} className="hover:bg-muted/50 transition-colors border-b border-border">
                        {/* 1. Empresa / Tenant */}
                        <TableCell className="py-3.5 px-4 align-middle">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-9 w-9 rounded-md border border-border shrink-0 bg-muted">
                              <AvatarFallback className="rounded-md bg-muted text-foreground font-semibold text-xs">
                                {shop.name.slice(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex flex-col gap-0.5 min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="font-medium text-foreground text-sm leading-tight truncate">
                                  {shop.name}
                                </span>
                                {shop.creator && (
                                  <span
                                    className="text-[11px] text-muted-foreground flex items-center gap-0.5 shrink-0"
                                    title={`Criado por: ${shop.creator.name}`}
                                  >
                                    <Crown className="w-3 h-3 text-muted-foreground" />
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-mono">
                                {shop.slug ? (
                                  <div className="flex items-center gap-1">
                                    <a
                                      href={`/b/${shop.slug}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="hover:text-foreground hover:underline inline-flex items-center gap-1 transition-colors"
                                      title="Abrir página pública de agendamento"
                                    >
                                      <span>/b/{shop.slug}</span>
                                      <ExternalLink className="w-2.5 h-2.5 text-muted-foreground" />
                                    </a>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <button
                                          type="button"
                                          onClick={() => handleCopyPublicUrl(shop.slug!, shop.id)}
                                          className="p-0.5 rounded text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                                        >
                                          {copiedShopId === shop.id ? (
                                            <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                                          ) : (
                                            <Copy className="w-3 h-3" />
                                          )}
                                        </button>
                                      </TooltipTrigger>
                                      <TooltipContent className="text-xs">
                                        {copiedShopId === shop.id ? 'URL copiada!' : 'Copiar URL pública'}
                                      </TooltipContent>
                                    </Tooltip>
                                  </div>
                                ) : (
                                  <span className="text-[11px] text-muted-foreground/60 italic">Sem slug público</span>
                                )}
                                <span className="text-muted-foreground/40">•</span>
                                <span className="text-[11px] text-muted-foreground/70">ID: {shop.id.slice(0, 8)}</span>
                              </div>
                            </div>
                          </div>
                        </TableCell>

                        {/* 2. Cadastrado em */}
                        <TableCell className="py-3.5 px-4 whitespace-nowrap align-middle">
                          <div className="flex flex-col gap-0.5">
                            <span className="text-sm font-medium text-foreground leading-none">
                              {new Date(shop.createdAt).toLocaleDateString('pt-BR')}
                            </span>
                            <span className="text-xs text-muted-foreground font-mono">
                              {new Date(shop.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        </TableCell>

                        {/* 3. Plano / Assinatura (100% Padrão shadcn/ui) */}
                        <TableCell className="py-3.5 px-4 align-middle whitespace-nowrap">
                          {shop.trial ? (
                            <div className="flex flex-col gap-1">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-foreground leading-none">
                                  {shop.trial.planName || 'Degustação'}
                                </span>
                                {shop.trial.status === 'TRIALING' ? (
                                  <Badge
                                    variant="outline"
                                    className="h-5 px-1.5 text-[10px] font-medium border-amber-500/30 text-amber-600 dark:text-amber-400 bg-amber-500/10"
                                  >
                                    Trial
                                  </Badge>
                                ) : shop.trial.status === 'ACTIVE' ? (
                                  <Badge
                                    variant="outline"
                                    className="h-5 px-1.5 text-[10px] font-medium border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10"
                                  >
                                    Ativo
                                  </Badge>
                                ) : shop.trial.status === 'EXPIRED' ? (
                                  <Badge
                                    variant="destructive"
                                    className="h-5 px-1.5 text-[10px] font-medium"
                                  >
                                    Expirado
                                  </Badge>
                                ) : (
                                  <Badge
                                    variant="secondary"
                                    className="h-5 px-1.5 text-[10px] font-medium capitalize"
                                  >
                                    {shop.trial.status.toLowerCase()}
                                  </Badge>
                                )}
                              </div>

                              <div className="text-xs text-muted-foreground flex items-center gap-1.5 font-mono">
                                {shop.trial.status === 'TRIALING' ? (
                                  <>
                                    <Clock className="w-3 h-3 text-amber-600 dark:text-amber-400 shrink-0" />
                                    <span>
                                      {shop.trial.daysRemaining > 0
                                        ? `${shop.trial.daysRemaining} ${shop.trial.daysRemaining === 1 ? 'dia restante' : 'dias restantes'}`
                                        : 'Expira hoje'}
                                    </span>
                                    {shop.trial.trialEnd && (
                                      <span className="text-muted-foreground/60">
                                        • até {new Date(shop.trial.trialEnd).toLocaleDateString('pt-BR')}
                                      </span>
                                    )}
                                  </>
                                ) : shop.trial.status === 'ACTIVE' ? (
                                  <>
                                    <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
                                    <span>
                                      {shop.trial.trialEnd
                                        ? `Renova em ${new Date(shop.trial.trialEnd).toLocaleDateString('pt-BR')}`
                                        : 'Assinatura ativa'}
                                    </span>
                                  </>
                                ) : shop.trial.status === 'EXPIRED' ? (
                                  <>
                                    <AlertTriangle className="w-3 h-3 text-destructive shrink-0" />
                                    <span>
                                      {shop.trial.trialEnd
                                        ? `Expirou em ${new Date(shop.trial.trialEnd).toLocaleDateString('pt-BR')}`
                                        : 'Período encerrado'}
                                    </span>
                                  </>
                                ) : (
                                  <span>Período encerrado</span>
                                )}
                              </div>
                            </div>
                          ) : (
                            (() => {
                              const contract = getContractStatus(shop.contractExpiresAt)
                              return (
                                <div className="flex flex-col gap-1">
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium text-foreground leading-none">
                                      Licença Direta
                                    </span>
                                    <Badge
                                      variant={contract.variant}
                                      className={`h-5 px-1.5 text-[10px] font-medium ${contract.color}`}
                                    >
                                      {contract.badgeText}
                                    </Badge>
                                  </div>
                                  <div className="text-xs text-muted-foreground flex items-center gap-1.5 font-mono">
                                    {contract.isExpired ? (
                                      <AlertTriangle className="w-3 h-3 text-destructive shrink-0" />
                                    ) : (
                                      <ShieldCheck className="w-3 h-3 text-muted-foreground shrink-0" />
                                    )}
                                    <span>{contract.label}</span>
                                  </div>
                                </div>
                              )
                            })()
                          )}
                        </TableCell>

                        {/* 4. Contato */}
                        <TableCell className="py-3.5 px-4 align-middle whitespace-nowrap">
                          <div className="flex flex-col gap-1">
                            <div className="text-foreground text-sm font-medium flex items-center gap-1.5 leading-none">
                              <Mail className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                              <span className="truncate max-w-[190px]">{shop.email}</span>
                            </div>
                            <div className="text-xs text-muted-foreground font-mono flex items-center gap-1.5">
                              <Phone className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                              <span>{shop.phone || 'Sem telefone'}</span>
                            </div>
                          </div>
                        </TableCell>

                        {/* 5. Equipe */}
                        <TableCell className="py-3.5 px-4 text-center align-middle">
                          <span className={`font-mono text-xs ${shop._count?.users ? 'text-foreground font-medium' : 'text-muted-foreground/60'}`}>
                            {shop._count?.users ?? 0}
                          </span>
                        </TableCell>

                        {/* 6. Clientes */}
                        <TableCell className="py-3.5 px-4 text-center align-middle">
                          <span className={`font-mono text-xs ${shop._count?.clients ? 'text-foreground font-medium' : 'text-muted-foreground/60'}`}>
                            {shop._count?.clients ?? 0}
                          </span>
                        </TableCell>

                        {/* 7. Serviços */}
                        <TableCell className="py-3.5 px-4 text-center align-middle">
                          <span className={`font-mono text-xs ${shop._count?.services ? 'text-foreground font-medium' : 'text-muted-foreground/60'}`}>
                            {shop._count?.services ?? 0}
                          </span>
                        </TableCell>

                        {/* 8. Agendamentos */}
                        <TableCell className="py-3.5 px-4 text-center align-middle">
                          <span className={`font-mono text-xs ${shop._count?.appointments ? 'text-foreground font-semibold' : 'text-muted-foreground/60'}`}>
                            {shop._count?.appointments ?? 0}
                          </span>
                        </TableCell>

                        {/* 9. Status */}
                        <TableCell className="py-3.5 px-4 text-center align-middle whitespace-nowrap">
                          {shop.status === 'PENDING' ? (
                            <Badge
                              variant="outline"
                              className="h-5 px-2 text-[11px] font-medium border-amber-500/30 text-amber-600 dark:text-amber-400 bg-amber-500/10 gap-1.5"
                            >
                              <Clock className="w-3 h-3" />
                              <span>Aguardando</span>
                            </Badge>
                          ) : shop.status === 'REJECTED' ? (
                            <Badge
                              variant="destructive"
                              className="h-5 px-2 text-[11px] font-medium gap-1"
                            >
                              <X className="w-3 h-3" />
                              <span>Rejeitada</span>
                            </Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              className={`h-5 px-2 text-[11px] font-medium gap-1.5 ${
                                shop.isActive
                                  ? 'border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10'
                                  : 'border-border text-muted-foreground bg-muted/40'
                              }`}
                            >
                              <span className={`size-1.5 rounded-full ${shop.isActive ? 'bg-emerald-500' : 'bg-muted-foreground/60'}`} />
                              <span>{shop.isActive ? 'Ativa' : 'Inativa'}</span>
                            </Badge>
                          )}
                        </TableCell>

                        {/* 10. Ações */}
                        <TableCell className="py-3.5 px-4 text-right align-middle whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            {shop.status === 'PENDING' ? (
                              <Button
                                type="button"
                                size="sm"
                                onClick={() => handleOpenApprovalModal(shop)}
                                className="h-8 px-2.5 text-xs font-medium gap-1.5"
                                title="Analisar solicitação de cadastro e aprovar"
                              >
                                <ShieldCheck className="h-3.5 w-3.5" />
                                <span>Aprovar</span>
                              </Button>
                            ) : (
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => handleOpenDetails(shop)}
                                className="h-8 px-2.5 text-xs font-medium gap-1 text-foreground"
                                title="Ver Detalhes da Empresa"
                              >
                                <Info className="h-3.5 w-3.5 text-muted-foreground" />
                                <span>Detalhes</span>
                              </Button>
                            )}

                            {/* Dropdown Menu com Mais Ações */}
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                  title="Mais ações deste tenant"
                                >
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent
                                align="end"
                                className="w-52 bg-popover border-border text-popover-foreground shadow-md rounded-md p-1"
                              >
                                <DropdownMenuLabel className="text-xs font-medium text-muted-foreground px-2 py-1.5">
                                  Opções de Gestão
                                </DropdownMenuLabel>
                                <DropdownMenuSeparator className="bg-border" />

                                {shop.status === 'PENDING' ? (
                                  <DropdownMenuItem
                                    onClick={() => handleOpenApprovalModal(shop)}
                                    className="text-xs cursor-pointer focus:bg-accent focus:text-accent-foreground flex items-center gap-2 px-2 py-1.5"
                                  >
                                    <ShieldCheck className="h-4 w-4 text-muted-foreground" />
                                    <span>Analisar / Aprovar</span>
                                  </DropdownMenuItem>
                                ) : (
                                  <>
                                    <DropdownMenuItem
                                      onClick={() => handleOpenDetails(shop)}
                                      className="text-xs cursor-pointer focus:bg-accent focus:text-accent-foreground flex items-center gap-2 px-2 py-1.5"
                                    >
                                      <Info className="h-4 w-4 text-muted-foreground" />
                                      <span>Ver Detalhes</span>
                                    </DropdownMenuItem>

                                    <DropdownMenuItem
                                      onClick={() => {
                                        setTrialResetShop(shop)
                                        setTrialDaysInput(30)
                                        setTrialReasonInput('Prorrogação de degustação comercial')
                                      }}
                                      className="text-xs cursor-pointer focus:bg-accent focus:text-accent-foreground flex items-center gap-2 px-2 py-1.5"
                                    >
                                      <Clock className="h-4 w-4 text-muted-foreground" />
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
                                      className="text-xs cursor-pointer focus:bg-accent focus:text-accent-foreground flex items-center gap-2 px-2 py-1.5"
                                    >
                                      <ExternalLink className="h-4 w-4 text-muted-foreground" />
                                      <span>Abrir Página Pública</span>
                                    </DropdownMenuItem>

                                    <DropdownMenuItem
                                      onClick={() => handleCopyPublicUrl(shop.slug!, shop.id)}
                                      className="text-xs cursor-pointer focus:bg-accent focus:text-accent-foreground flex items-center gap-2 px-2 py-1.5"
                                    >
                                      <Copy className="h-4 w-4 text-muted-foreground" />
                                      <span>Copiar Link Público</span>
                                    </DropdownMenuItem>
                                  </>
                                )}

                                {shop.status !== 'PENDING' && (
                                  <>
                                    <DropdownMenuSeparator className="bg-border" />
                                    <DropdownMenuItem
                                      onClick={() => toggleBarbershopStatus(shop)}
                                      disabled={actionLoadingId === shop.id}
                                      className={`text-xs cursor-pointer flex items-center gap-2 px-2 py-1.5 ${
                                        shop.isActive
                                          ? 'text-destructive focus:bg-destructive/10 focus:text-destructive'
                                          : 'text-emerald-600 dark:text-emerald-400 focus:bg-emerald-500/10 focus:text-emerald-600'
                                      }`}
                                    >
                                      <Power className="h-4 w-4" />
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

            <CardFooter className="p-4 border-t border-border bg-muted/20 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
              <div className="flex items-center gap-3">
                <span className="font-normal">
                  Exibindo <strong className="text-foreground font-semibold">{filteredBarbershops.length}</strong> de{' '}
                  <strong className="text-foreground font-semibold">{barbershops.length}</strong> empresas cadastradas
                </span>
                {searchTerm && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setSearchTerm('')}
                    className="h-7 text-xs text-primary hover:text-primary px-2 font-medium hover:underline cursor-pointer"
                  >
                    Limpar pesquisa
                  </Button>
                )}
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <Badge
                  variant="outline"
                  className="text-[11px] font-normal"
                >
                  {activeCount} ativas
                </Badge>
                <Badge
                  variant="outline"
                  className="text-[11px] font-normal"
                >
                  {trialingCount} em trial
                </Badge>
                {pendingCount > 0 && (
                  <Badge variant="outline" className="border-amber-500/40 text-amber-500 bg-amber-500/10 text-[11px] font-normal">
                    {pendingCount} pendentes
                  </Badge>
                )}
                {expiredCount > 0 && (
                  <Badge variant="destructive" className="text-[11px] font-normal">
                    {expiredCount} expirados
                  </Badge>
                )}
              </div>
            </CardFooter>
          </Card>
        </TooltipProvider>
      </main>

      {/* Modal "+ Nova Empresa" */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-card text-card-foreground border border-border rounded-xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl relative my-8">
            <div className="flex items-center justify-between border-b border-border pb-4 mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-muted text-foreground border border-border flex items-center justify-center shadow-sm">
                  <Building2 className="w-5 h-5 text-foreground" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-foreground">Cadastrar Nova Empresa</h3>
                  <p className="text-xs text-muted-foreground font-normal mt-0.5">Criar um novo tenant com seu administrador inicial</p>
                </div>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                disabled={isSubmittingShop}
                className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition"
              >
                <X className="w-5 h-5" />
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
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-card text-card-foreground border border-border rounded-xl max-w-3xl w-full p-6 sm:p-8 shadow-2xl relative my-8">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border pb-4 mb-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 flex items-center justify-center">
                  <Building2 className="w-6 h-6 stroke-[2.5]" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xl font-bold text-foreground">{selectedShopForDetails.name}</h3>
                    <Badge
                      variant={selectedShopForDetails.isActive ? "secondary" : "destructive"}
                      className="text-xs font-semibold"
                    >
                      {selectedShopForDetails.isActive ? 'Ativa' : 'Desativada'}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground font-mono mt-0.5">ID: {selectedShopForDetails.id}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedShopForDetails(null)}
                className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted border border-border rounded-md transition cursor-pointer"
              >
                <X className="w-5 h-5 stroke-[2.5]" />
              </button>
            </div>

            <div className="space-y-6 max-h-[72vh] overflow-y-auto pr-1">
              {/* Card 1: Registro & Origem */}
              <div className="bg-muted/30 border border-border rounded-lg p-4 sm:p-5">
                <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                  <span className="p-1 rounded bg-muted text-muted-foreground"><Calendar className="w-3.5 h-3.5" /></span>
                  Informações de Cadastro
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-muted-foreground block mb-1">Data e Hora do Cadastro:</span>
                    <span className="text-foreground font-medium text-sm flex items-center gap-1.5 font-mono">
                      <Clock className="w-4 h-4 text-muted-foreground" />
                      {new Date(selectedShopForDetails.createdAt).toLocaleString('pt-BR')}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block mb-1">Cadastrado por:</span>
                    {selectedShopForDetails.creator ? (
                      <div className="text-foreground">
                        <span className="font-medium text-foreground flex items-center gap-1">
                          <Crown className="w-3.5 h-3.5 text-muted-foreground" />
                          {selectedShopForDetails.creator.name}
                        </span>
                        <span className="text-muted-foreground text-[11px] block">{selectedShopForDetails.creator.email}</span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground italic">Sistema / Registro Direto</span>
                    )}
                  </div>
                  <div>
                    <span className="text-muted-foreground block mb-1">Email Comercial:</span>
                    <span className="text-foreground font-mono">{selectedShopForDetails.email}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block mb-1">Telefone da Unidade:</span>
                    <span className="text-foreground font-mono">{selectedShopForDetails.phone || 'Não informado'}</span>
                  </div>
                  <div className="sm:col-span-2">
                    <span className="text-muted-foreground block mb-1">Endereço:</span>
                    <span className="text-foreground">{selectedShopForDetails.address || 'Não informado'}</span>
                  </div>
                </div>
              </div>

              {/* Card: Link Público & Identificador (Slug) */}
              <div className="bg-muted/30 border border-border rounded-lg p-4 sm:p-5">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
                  <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider flex items-center gap-2">
                    <span className="p-1 rounded bg-muted text-muted-foreground"><Globe className="w-3.5 h-3.5" /></span>
                    Link Público & Identificador (Slug)
                  </h4>
                  {selectedShopForDetails.slug && (
                    <Badge variant="outline" className="font-mono text-xs font-medium gap-1.5">
                      <Link2 className="w-3.5 h-3.5" />
                      /b/{selectedShopForDetails.slug}
                    </Badge>
                  )}
                </div>

                <div className="space-y-3">
                  <div className="bg-background border border-border rounded-md p-3">
                    <div className="text-xs text-muted-foreground font-medium mb-1.5">Endereço público do catálogo:</div>
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                      <div className="flex-1 font-mono text-xs text-foreground truncate bg-muted/50 px-3 py-2 rounded-md border border-border">
                        {typeof window !== 'undefined' ? `${window.location.origin}/b/${selectedShopForDetails.slug || ''}` : `/b/${selectedShopForDetails.slug}`}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            if (typeof navigator !== 'undefined' && navigator.clipboard) {
                              navigator.clipboard.writeText(`${window.location.origin}/b/${selectedShopForDetails.slug || ''}`)
                              setMessage({ type: 'success', text: 'Link copiado com sucesso!' })
                            }
                          }}
                          className="h-9 text-xs font-medium gap-1.5"
                        >
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copiar</span>
                        </Button>
                        {selectedShopForDetails.slug && (
                          <Button
                            type="button"
                            size="sm"
                            asChild
                            className="h-9 text-xs font-medium gap-1.5"
                          >
                            <a
                              href={`/b/${selectedShopForDetails.slug}`}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                              <span>Visualizar</span>
                            </a>
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Edição rápida de slug */}
                  <div className="bg-background border border-border rounded-md p-3">
                    <label className="block text-xs text-muted-foreground mb-1.5 font-medium">
                      Alterar Slug desta Unidade:
                    </label>
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                      <div className="flex items-center px-3 h-9 bg-muted/60 border border-border rounded-md text-xs text-muted-foreground font-mono select-none">
                        /b/
                      </div>
                      <Input
                        type="text"
                        value={slugEditValue}
                        onChange={(e) => setSlugEditValue(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                        placeholder="ex: nova-unidade-vip"
                        className="flex-1 h-9 text-xs font-mono font-medium"
                      />
                      <Button
                        type="button"
                        size="sm"
                        onClick={handleUpdateSlug}
                        disabled={isUpdatingSlug || !slugEditValue.trim() || slugEditValue.trim() === selectedShopForDetails.slug}
                        className="h-9 px-4 text-xs font-medium"
                      >
                        {isUpdatingSlug ? 'Salvando...' : 'Salvar Slug'}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Card 2: Contrato & Vigência */}
              <div className="bg-muted/30 border border-border rounded-lg p-4 sm:p-5">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
                  <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider flex items-center gap-2">
                    <span className="p-1 rounded bg-muted text-muted-foreground"><CalendarClock className="w-3.5 h-3.5" /></span>
                    Contrato & Vigência da Licença
                  </h4>
                  {(() => {
                    const status = getContractStatus(selectedShopForDetails.contractExpiresAt)
                    return (
                      <Badge variant={status.variant} className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 text-xs font-medium ${status.color}`}>
                        <CalendarClock className="w-3.5 h-3.5" />
                        Status: {status.label}
                      </Badge>
                    )
                  })()}
                </div>

                <p className="text-xs text-muted-foreground mb-4">
                  {selectedShopForDetails.contractExpiresAt
                    ? `O contrato desta unidade expira em ${new Date(selectedShopForDetails.contractExpiresAt).toLocaleDateString('pt-BR')}. Você pode estender ou renovar o prazo abaixo.`
                    : 'Esta unidade possui contrato vitalício / sem data de expiração cadastrada.'}
                </p>

                {/* Formulário de Renovação / Alteração */}
                <div className="bg-background border border-border rounded-md p-4">
                  <label className="block text-xs font-medium text-foreground mb-2.5">
                    Alterar / Renovar Data de Expiração do Contrato:
                  </label>

                  <div className="flex flex-wrap items-center gap-2 mb-3">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const d = new Date()
                        d.setDate(d.getDate() + 30)
                        setContractEditDate(d.toISOString().split('T')[0])
                      }}
                      className="h-7 text-xs font-medium"
                    >
                      +30 dias
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const d = new Date()
                        d.setDate(d.getDate() + 90)
                        setContractEditDate(d.toISOString().split('T')[0])
                      }}
                      className="h-7 text-xs font-medium"
                    >
                      +90 dias (3m)
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const d = new Date()
                        d.setDate(d.getDate() + 180)
                        setContractEditDate(d.toISOString().split('T')[0])
                      }}
                      className="h-7 text-xs font-medium"
                    >
                      +180 dias (6m)
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const d = new Date()
                        d.setDate(d.getDate() + 365)
                        setContractEditDate(d.toISOString().split('T')[0])
                      }}
                      className="h-7 text-xs font-medium"
                    >
                      +365 dias (1 ano)
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => setContractEditDate('')}
                      className="h-7 text-xs font-medium"
                    >
                      Tornar Vitalício
                    </Button>
                  </div>

                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                    <div className="relative flex-1">
                      <Calendar className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                      <Input
                        type="date"
                        value={contractEditDate}
                        onChange={(e) => setContractEditDate(e.target.value)}
                        className="w-full pl-9 h-9 text-xs font-mono"
                      />
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleUpdateContract}
                      disabled={isUpdatingContract}
                      className="h-9 px-4 text-xs font-medium gap-1.5"
                    >
                      {isUpdatingContract ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Salvando...</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Salvar Vigência</span>
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>

              {/* Card 3: Administrador da Unidade */}
              <div className="bg-muted/30 border border-border rounded-lg p-4 sm:p-5">
                <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                  <span className="p-1 rounded bg-muted text-muted-foreground"><UserCheck className="w-3.5 h-3.5" /></span>
                  Administrador(es) da Unidade
                </h4>

                {(() => {
                  const admins = (selectedShopForDetails.users || []).filter(u => u.role === 'ADMIN')
                  if (admins.length === 0) {
                    return (
                      <p className="text-xs text-muted-foreground italic">
                        Nenhum usuário com função de Administrador vinculado a esta empresa.
                      </p>
                    )
                  }
                  return (
                    <div className="space-y-2">
                      {admins.map((adm) => (
                        <div key={adm.id} className="p-3 bg-background border border-border rounded-md flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                          <div>
                            <div className="font-medium text-foreground text-sm flex items-center gap-2">
                              {adm.name}
                              <Badge
                                variant={adm.isActive ? "outline" : "secondary"}
                                className={`text-[10px] font-normal ${
                                  adm.isActive
                                    ? 'border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10'
                                    : 'text-muted-foreground'
                                }`}
                              >
                                {adm.isActive ? 'Ativo' : 'Inativo'}
                              </Badge>
                            </div>
                            <div className="text-muted-foreground font-mono mt-0.5">{adm.email} • {adm.phone || 'Sem telefone'}</div>
                          </div>
                          <div className="text-right text-muted-foreground text-[11px] font-mono">
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
                <div className="p-4 bg-muted/40 rounded-lg border border-border text-center">
                  <div className="text-2xl font-bold font-mono text-foreground">{selectedShopForDetails._count?.users ?? 0}</div>
                  <div className="text-xs text-muted-foreground font-medium mt-1">Colaboradores</div>
                </div>
                <div className="p-4 bg-muted/40 rounded-lg border border-border text-center">
                  <div className="text-2xl font-bold font-mono text-foreground">{selectedShopForDetails._count?.clients ?? 0}</div>
                  <div className="text-xs text-muted-foreground font-medium mt-1">Clientes</div>
                </div>
                <div className="p-4 bg-muted/40 rounded-lg border border-border text-center">
                  <div className="text-2xl font-bold font-mono text-foreground">{selectedShopForDetails._count?.services ?? 0}</div>
                  <div className="text-xs text-muted-foreground font-medium mt-1">Serviços</div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between pt-5 border-t border-border mt-6">
              <Button
                type="button"
                variant={selectedShopForDetails.isActive ? "destructive" : "default"}
                size="sm"
                onClick={() => {
                  toggleBarbershopStatus(selectedShopForDetails)
                  setSelectedShopForDetails((prev) => prev ? { ...prev, isActive: !prev.isActive } : null)
                }}
                disabled={actionLoadingId === selectedShopForDetails.id}
                className="gap-2 text-xs font-medium h-9"
              >
                <Power className="w-3.5 h-3.5" />
                <span>{selectedShopForDetails.isActive ? 'Desativar Unidade' : 'Ativar Unidade'}</span>
              </Button>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setSelectedShopForDetails(null)}
                className="h-9 px-5 text-xs font-medium"
              >
                Fechar
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal "Análise e Aprovação de Cadastro" (100% Padrão shadcn/ui) */}
      {selectedShopForApproval && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-card text-card-foreground border border-border rounded-xl max-w-3xl w-full p-6 sm:p-8 shadow-2xl relative my-8">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border pb-4 mb-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 flex items-center justify-center">
                  <ShieldCheck className="w-6 h-6 stroke-[2.5]" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xl font-bold text-foreground">Análise e Aprovação de Cadastro</h3>
                    <Badge
                      variant="outline"
                      className="border-amber-500/30 text-amber-600 dark:text-amber-400 bg-amber-500/10 text-xs font-medium gap-1"
                    >
                      <Clock className="w-3.5 h-3.5" />
                      {selectedShopForApproval.status === 'PENDING'
                        ? 'Aguardando Aprovação'
                        : selectedShopForApproval.status === 'REJECTED'
                        ? 'Rejeitado'
                        : 'Aprovado'}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground font-mono mt-0.5">
                    Solicitado em: {new Date(selectedShopForApproval.createdAt).toLocaleString('pt-BR')} &bull; ID: {selectedShopForApproval.id}
                  </p>
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setSelectedShopForApproval(null)}
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-1">
              {/* Card 1: Dados do Estabelecimento */}
              <div className="bg-muted/30 border border-border rounded-lg p-4 sm:p-5">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider flex items-center gap-2">
                    <span className="p-1 rounded bg-muted text-muted-foreground"><Building2 className="w-3.5 h-3.5" /></span>
                    1. Informações do Estabelecimento (Editáveis)
                  </h4>
                  <span className="text-[11px] text-muted-foreground">Revise ou complemente antes de aprovar</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="block text-muted-foreground mb-1.5 font-medium">Nome da Empresa:</label>
                    <Input
                      type="text"
                      value={approvalFormData.name}
                      onChange={(e) => handleApprovalInputChange('name', e.target.value)}
                      className="h-9 text-xs font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-muted-foreground mb-1.5 font-medium">E-mail Comercial:</label>
                    <Input
                      type="email"
                      value={approvalFormData.email}
                      onChange={(e) => handleApprovalInputChange('email', e.target.value)}
                      className="h-9 text-xs font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-muted-foreground mb-1.5 font-medium">Telefone Comercial / WhatsApp:</label>
                    <Input
                      type="tel"
                      value={approvalFormData.phone}
                      onChange={(e) => handleApprovalInputChange('phone', e.target.value)}
                      className="h-9 text-xs font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-muted-foreground mb-1.5 font-medium">Slug do Link Público (/b/slug):</label>
                    <Input
                      type="text"
                      value={approvalFormData.slug}
                      onChange={(e) => handleApprovalInputChange('slug', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                      placeholder="ex: barbearia-central"
                      className="h-9 text-xs font-mono font-medium"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-muted-foreground mb-1.5 font-medium">Endereço Completo:</label>
                    <AddressAutocomplete
                      id="approvalAddress"
                      value={approvalFormData.address}
                      onChange={(val) => handleApprovalInputChange('address', val)}
                      placeholder="Rua, número, cidade - UF"
                      className="w-full px-3 py-2 bg-background border border-input rounded-md text-xs text-foreground font-medium focus:outline-none focus:ring-1 focus:ring-ring"
                    />
                  </div>
                </div>
              </div>

              {/* Card 2: Administrador Solicitante */}
              <div className="bg-muted/30 border border-border rounded-lg p-4 sm:p-5">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider flex items-center gap-2">
                    <span className="p-1 rounded bg-muted text-muted-foreground"><UserCheck className="w-3.5 h-3.5" /></span>
                    2. Dados do Administrador Solicitante
                  </h4>
                  <span className="text-[11px] text-muted-foreground">Credenciais para acesso à conta de gestão</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                  <div>
                    <label className="block text-muted-foreground mb-1.5 font-medium">Nome do Responsável:</label>
                    <Input
                      type="text"
                      value={approvalFormData.adminName}
                      onChange={(e) => handleApprovalInputChange('adminName', e.target.value)}
                      className="h-9 text-xs font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-muted-foreground mb-1.5 font-medium">E-mail de Login:</label>
                    <Input
                      type="email"
                      value={approvalFormData.adminEmail}
                      onChange={(e) => handleApprovalInputChange('adminEmail', e.target.value)}
                      className="h-9 text-xs font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-muted-foreground mb-1.5 font-medium">Telefone do Gestor:</label>
                    <Input
                      type="tel"
                      value={approvalFormData.adminPhone}
                      onChange={(e) => handleApprovalInputChange('adminPhone', e.target.value)}
                      className="h-9 text-xs font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Card 3: Vigência do Contrato Inicial */}
              <div className="bg-muted/30 border border-border rounded-lg p-4 sm:p-5">
                <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider mb-2 flex items-center gap-2">
                  <span className="p-1 rounded bg-muted text-muted-foreground"><CalendarClock className="w-3.5 h-3.5" /></span>
                  3. Vigência Inicial do Contrato
                </h4>
                <p className="text-xs text-muted-foreground mb-3">
                  Selecione um prazo para a licença inicial da unidade. A empresa e seu administrador serão ativados com essa validade.
                </p>

                <div className="flex flex-wrap items-center gap-2 mb-3">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const d = new Date()
                      d.setDate(d.getDate() + 30)
                      setApprovalFormData((prev) => ({
                        ...prev,
                        contractExpiresAt: d.toISOString().split('T')[0],
                      }))
                    }}
                    className="h-7 text-xs font-medium"
                  >
                    +30 dias (1 mês)
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const d = new Date()
                      d.setDate(d.getDate() + 90)
                      setApprovalFormData((prev) => ({
                        ...prev,
                        contractExpiresAt: d.toISOString().split('T')[0],
                      }))
                    }}
                    className="h-7 text-xs font-medium"
                  >
                    +90 dias (3 meses)
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const d = new Date()
                      d.setDate(d.getDate() + 180)
                      setApprovalFormData((prev) => ({
                        ...prev,
                        contractExpiresAt: d.toISOString().split('T')[0],
                      }))
                    }}
                    className="h-7 text-xs font-medium"
                  >
                    +180 dias (6 meses)
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const d = new Date()
                      d.setDate(d.getDate() + 365)
                      setApprovalFormData((prev) => ({
                        ...prev,
                        contractExpiresAt: d.toISOString().split('T')[0],
                      }))
                    }}
                    className="h-7 text-xs font-medium"
                  >
                    +365 dias (1 ano)
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() =>
                      setApprovalFormData((prev) => ({
                        ...prev,
                        contractExpiresAt: '',
                      }))
                    }
                    className="h-7 text-xs font-medium"
                  >
                    Vitalício
                  </Button>
                </div>

                <div className="relative max-w-xs">
                  <Calendar className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                  <Input
                    type="date"
                    value={approvalFormData.contractExpiresAt}
                    onChange={(e) =>
                      setApprovalFormData((prev) => ({
                        ...prev,
                        contractExpiresAt: e.target.value,
                      }))
                    }
                    className="w-full pl-9 h-9 text-xs font-mono"
                  />
                </div>
              </div>
            </div>

            {/* Footer com botões de decisão */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-5 border-t border-border mt-6">
              <div>
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={() => handleProcessApproval('REJECTED')}
                  disabled={isProcessingApproval}
                  className="w-full sm:w-auto h-9 text-xs font-medium gap-1.5"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Rejeitar Solicitação</span>
                </Button>
              </div>

              <div className="flex items-center gap-2 justify-end">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleProcessApproval('SAVE')}
                  disabled={isProcessingApproval}
                  className="h-9 px-4 text-xs font-medium"
                >
                  Salvar Informações
                </Button>

                <Button
                  type="button"
                  size="sm"
                  onClick={() => handleProcessApproval('APPROVED')}
                  disabled={isProcessingApproval}
                  className="h-9 px-5 text-xs font-medium gap-1.5"
                >
                  {isProcessingApproval ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Processando...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Aprovar e Liberar Acesso</span>
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Reset de Período de Trial (100% Padrão shadcn/ui) */}
      {trialResetShop && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
          <div className="bg-card text-card-foreground border border-border w-full max-w-md rounded-xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 flex items-center justify-center">
                  <Clock className="w-5 h-5 stroke-[2.5]" />
                </div>
                <div>
                  <h4 className="font-semibold text-foreground text-base">Resetar Período de Trial</h4>
                  <p className="text-xs text-muted-foreground font-normal">{trialResetShop.name}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setTrialResetShop(null)}
                className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-muted-foreground font-normal leading-relaxed">
              Defina a quantidade de dias para reativar o período de degustação gratuita desta unidade. A conta e o acesso do administrador serão mantidos sincronizados.
            </p>

            {/* Presets Rápidos */}
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-foreground">
                1. Selecione um prazo pré-definido:
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
                    className={`py-2 px-1 text-xs font-medium rounded-md border transition cursor-pointer ${
                      trialDaysInput === item.val
                        ? 'bg-primary text-primary-foreground border-primary font-semibold'
                        : 'bg-muted/40 hover:bg-muted border-border text-foreground'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Dias personalizados */}
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">
                2. Ou especifique a quantidade de dias:
              </label>
              <Input
                type="number"
                min="1"
                max="365"
                value={trialDaysInput}
                onChange={(e) => setTrialDaysInput(Math.max(1, Number(e.target.value) || 1))}
                className="h-9 text-xs font-mono"
              />
            </div>

            {/* Justificativa / Motivo */}
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">
                3. Motivo / Justificativa do ajuste:
              </label>
              <Input
                type="text"
                placeholder="Ex: Degustação estendida, suporte comercial..."
                value={trialReasonInput}
                onChange={(e) => setTrialReasonInput(e.target.value)}
                className="h-9 text-xs"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setTrialResetShop(null)}
                disabled={isResettingTrial}
                className="h-8 text-xs"
              >
                Cancelar
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleConfirmResetTrial}
                disabled={isResettingTrial}
                className="h-8 text-xs gap-1.5"
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
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function DeveloperDashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background flex items-center justify-center">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <DeveloperDashboardContent />
    </Suspense>
  )
}
