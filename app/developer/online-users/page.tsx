'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/lib/auth-context'
import DropdownHeader from '@/components/shared/DropdownHeader'
import RealtimeNavTabs from '@/components/developer/RealtimeNavTabs'
import { getAuthHeaders } from '@/lib/utils'
import {
  Users,
  Activity,
  Radio,
  RefreshCw,
  Search,
  Filter,
  Shield,
  Smartphone,
  Laptop,
  Tablet,
  Globe,
  Clock,
  LogOut,
  AlertTriangle,
  CheckCircle2,
  Building2,
  ExternalLink,
  SlidersHorizontal,
  ChevronRight,
  ShieldAlert,
  Wifi,
  Eye
} from 'lucide-react'

interface OnlineUser {
  userId: string
  sessionId: string
  name: string
  email: string
  role: string
  avatar: string | null
  phone: string | null
  barbershopId: string | null
  barbershopName: string
  barbershopSlug: string | null
  barbershopLogo: string | null
  currentPath: string
  ipAddress: string
  userAgent: string | null
  deviceType: 'Desktop' | 'Mobile' | 'Tablet' | 'Outro'
  connectedAt: number
  lastActive: number
  secondsSinceLastActive: number
  status: 'ONLINE' | 'IDLE'
}

interface OnlineUsersResponse {
  timestamp: number
  stats: {
    totalOnline: number
    totalIdle: number
    totalActive: number
    rolesCount: {
      ADMIN: number
      BARBER: number
      CLIENT: number
      DEVELOPER: number
      RECEPTIONIST: number
    }
    uniqueTenants: number
  }
  users: OnlineUser[]
}

export default function OnlineUsersPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()

  const [data, setData] = useState<OnlineUsersResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Filtros
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedRole, setSelectedRole] = useState('ALL')
  const [selectedStatus, setSelectedStatus] = useState('ALL')
  const [selectedDevice, setSelectedDevice] = useState('ALL')

  // Auto-refresh (em segundos: 5, 10, 30, 0 = desligado)
  const [autoRefreshInterval, setAutoRefreshInterval] = useState<number>(5)
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date>(new Date())

  // Modal de desconexão
  const [userToDisconnect, setUserToDisconnect] = useState<OnlineUser | null>(null)
  const [disconnecting, setDisconnecting] = useState(false)
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Guarda referência para evitar memory leaks
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (!authLoading && user && user.role !== 'DEVELOPER' && user.role !== 'ADMIN') {
      router.replace('/dashboard')
    }
  }, [user, authLoading, router])

  const fetchOnlineUsers = useCallback(async (isBackground = false) => {
    if (!isBackground) setRefreshing(true)
    setError(null)

    try {
      const res = await fetch('/api/developer/online-users?threshold=20', {
        headers: getAuthHeaders(),
        credentials: 'include',
      })

      if (res.ok) {
        const json: OnlineUsersResponse = await res.json()
        setData(json)
        setLastRefreshedAt(new Date())
      } else {
        const errJson = await res.json().catch(() => ({}))
        setError(errJson.error || 'Erro ao carregar telemetria em tempo real')
      }
    } catch {
      setError('Falha de conexão com os serviços de telemetria')
    } finally {
      setLoading(false)
      if (!isBackground) setRefreshing(false)
    }
  }, [])

  // Efeito de pooling automático
  useEffect(() => {
    fetchOnlineUsers()

    if (autoRefreshInterval > 0) {
      timerRef.current = setInterval(() => {
        if (typeof document !== 'undefined' && document.hidden) return
        fetchOnlineUsers(true)
      }, autoRefreshInterval * 1000)
    }

    const handleVisibility = () => {
      if (typeof document !== 'undefined' && !document.hidden && autoRefreshInterval > 0) {
        fetchOnlineUsers(true)
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [autoRefreshInterval, fetchOnlineUsers])

  // Desconectar sessão remotamente
  const handleConfirmDisconnect = async () => {
    if (!userToDisconnect) return
    setDisconnecting(true)

    try {
      const res = await fetch(`/api/developer/online-users?userId=${encodeURIComponent(userToDisconnect.userId)}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
        credentials: 'include',
      })

      const resData = await res.json()
      if (res.ok) {
        setFeedbackMessage({
          type: 'success',
          text: `A sessão de ${userToDisconnect.name} foi encerrada com sucesso!`,
        })
        setUserToDisconnect(null)
        fetchOnlineUsers(true)
      } else {
        setFeedbackMessage({
          type: 'error',
          text: resData.error || 'Erro ao encerrar a sessão do usuário.',
        })
      }
    } catch {
      setFeedbackMessage({
        type: 'error',
        text: 'Erro de comunicação ao tentar desconectar o usuário.',
      })
    } finally {
      setDisconnecting(false)
      setTimeout(() => setFeedbackMessage(null), 5000)
    }
  }

  // Filtragem local dos usuários
  const filteredUsers = (data?.users || []).filter((u) => {
    if (selectedRole !== 'ALL' && u.role !== selectedRole) return false
    if (selectedStatus !== 'ALL' && u.status !== selectedStatus) return false
    if (selectedDevice !== 'ALL' && u.deviceType !== selectedDevice) return false

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase()
      const matchName = u.name.toLowerCase().includes(term)
      const matchEmail = u.email.toLowerCase().includes(term)
      const matchShop = u.barbershopName.toLowerCase().includes(term)
      const matchIp = u.ipAddress.toLowerCase().includes(term)
      const matchPath = u.currentPath.toLowerCase().includes(term)
      return matchName || matchEmail || matchShop || matchIp || matchPath
    }

    return true
  })

  // Formatadores visuais
  const formatSecondsAgo = (secs: number) => {
    if (secs < 10) return 'agora mesmo'
    if (secs < 60) return `há ${secs}s`
    const mins = Math.floor(secs / 60)
    if (mins < 60) return `há ${mins}min`
    const hours = Math.floor(mins / 60)
    return `há ${hours}h`
  }

  const formatDuration = (ms: number) => {
    const totalSecs = Math.max(0, Math.floor(ms / 1000))
    const mins = Math.floor(totalSecs / 60)
    if (mins < 60) return `${mins} min`
    const hours = Math.floor(mins / 60)
    const remMins = mins % 60
    return `${hours}h ${remMins}m`
  }

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'DEVELOPER':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
            <Shield className="w-3 h-3 text-purple-600 dark:text-purple-400" />
            Developer
          </span>
        )
      case 'ADMIN':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
            <Building2 className="w-3 h-3 text-amber-600 dark:text-amber-400" />
            Administrador
          </span>
        )
      case 'BARBER':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
            Barbeiro
          </span>
        )
      case 'CLIENT':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            Cliente
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-muted text-muted-foreground border border-border">
            {role}
          </span>
        )
    }
  }

  const getDeviceIcon = (deviceType: string) => {
    switch (deviceType) {
      case 'Mobile':
        return <Smartphone className="w-3.5 h-3.5 text-muted-foreground" />
      case 'Tablet':
        return <Tablet className="w-3.5 h-3.5 text-muted-foreground" />
      default:
        return <Laptop className="w-3.5 h-3.5 text-muted-foreground" />
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors">
      <DropdownHeader />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-12 space-y-8">
        {/* Navegação por Subitens / Abas */}
        <RealtimeNavTabs activeTab="online-users" />

        {/* Banner de Feedback */}
        {feedbackMessage && (
          <div
            className={`p-4 rounded-xl border flex items-center justify-between ${
              feedbackMessage.type === 'success'
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-400'
                : 'bg-destructive/10 border-destructive/30 text-destructive'
            }`}
          >
            <div className="flex items-center gap-3">
              {feedbackMessage.type === 'success' ? (
                <CheckCircle2 className="w-5 h-5 shrink-0" />
              ) : (
                <AlertTriangle className="w-5 h-5 shrink-0" />
              )}
              <span className="text-sm font-semibold">{feedbackMessage.text}</span>
            </div>
            <button
              onClick={() => setFeedbackMessage(null)}
              className="text-xs font-semibold px-3 py-1 bg-background border border-border rounded-lg hover:bg-muted cursor-pointer"
            >
              Fechar
            </button>
          </div>
        )}

        {/* Top Control Bar: Status + Interval Selector + Manual Refresh */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-xl bg-card border border-border shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse shrink-0"></div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-base text-card-foreground">Telemetria de Presença Ativa</span>
                <span className="text-xs font-semibold font-mono text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                  AO VIVO
                </span>
              </div>
              <p className="text-xs text-muted-foreground font-normal mt-0.5">
                Última sincronização: {lastRefreshedAt.toLocaleTimeString('pt-BR')}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
            {/* Seletor de Intervalo de Atualização */}
            <div className="flex items-center gap-1.5 bg-muted/50 p-1 rounded-lg border border-border text-xs">
              <span className="text-muted-foreground px-2 flex items-center gap-1 text-xs font-medium">
                <Clock className="w-3.5 h-3.5" /> Atualização:
              </span>
              {[
                { label: '5s', val: 5 },
                { label: '10s', val: 10 },
                { label: '30s', val: 30 },
                { label: 'Desativado', val: 0 },
              ].map((item) => (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => setAutoRefreshInterval(item.val)}
                  className={`px-3 py-1 rounded-md font-medium text-xs transition cursor-pointer ${
                    autoRefreshInterval === item.val
                      ? 'bg-primary text-primary-foreground shadow-xs'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>

            {/* Botão de Atualizar Agora */}
            <button
              type="button"
              onClick={() => fetchOnlineUsers(false)}
              disabled={refreshing}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-medium shadow-xs transition cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              <span>Atualizar Agora</span>
            </button>
          </div>
        </div>

        {/* Métricas Principais (Cards de KPI) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* Card 1: Online Agora */}
          <div className="p-6 rounded-xl bg-card border border-border shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Online Agora (&lt; 3m)
              </span>
              <div className="w-9 h-9 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
                <Wifi className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-3xl sm:text-4xl font-bold text-card-foreground tracking-tight">
                {data?.stats.totalOnline ?? 0}
              </span>
              <span className="text-xs text-emerald-700 dark:text-emerald-400 font-semibold bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-md">
                Em tempo real
              </span>
            </div>
            <p className="text-xs text-muted-foreground font-normal mt-2">
              Dispositivos ativos conectados neste instante
            </p>
          </div>

          {/* Card 2: Sessões Recentes */}
          <div className="p-6 rounded-xl bg-card border border-border shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Ativos Recentes (&lt; 15m)
              </span>
              <div className="w-9 h-9 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
                <Activity className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-3xl sm:text-4xl font-bold text-card-foreground tracking-tight">
                {data?.stats.totalActive ?? 0}
              </span>
              <span className="text-xs text-amber-700 dark:text-amber-400 font-semibold bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-md">
                {data?.stats.totalIdle ?? 0} ausentes
              </span>
            </div>
            <p className="text-xs text-muted-foreground font-normal mt-2">
              Usuários conectados na janela de 15 minutos
            </p>
          </div>

          {/* Card 3: Barbearias com Acesso Simultâneo */}
          <div className="p-6 rounded-xl bg-card border border-border shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Barbearias Conectadas
              </span>
              <div className="w-9 h-9 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
                <Building2 className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-3xl sm:text-4xl font-bold text-card-foreground tracking-tight">
                {data?.stats.uniqueTenants ?? 0}
              </span>
              <span className="text-xs text-blue-700 dark:text-blue-400 font-semibold bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded-md">
                unidades SaaS
              </span>
            </div>
            <p className="text-xs text-muted-foreground font-normal mt-2">
              Estabelecimentos com membros da equipe online
            </p>
          </div>

          {/* Card 4: Distribuição de Perfis */}
          <div className="p-6 rounded-xl bg-card border border-border shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Distribuição de Perfis
              </span>
              <div className="w-9 h-9 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
              <div className="flex items-center justify-between bg-muted/40 px-2.5 py-1.5 rounded-lg border border-border">
                <span className="text-muted-foreground font-medium">Admins:</span>
                <span className="font-bold text-amber-700 dark:text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">{data?.stats.rolesCount.ADMIN ?? 0}</span>
              </div>
              <div className="flex items-center justify-between bg-muted/40 px-2.5 py-1.5 rounded-lg border border-border">
                <span className="text-muted-foreground font-medium">Barbeiros:</span>
                <span className="font-bold text-blue-700 dark:text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded border border-blue-500/20">{data?.stats.rolesCount.BARBER ?? 0}</span>
              </div>
              <div className="flex items-center justify-between bg-muted/40 px-2.5 py-1.5 rounded-lg border border-border">
                <span className="text-muted-foreground font-medium">Clientes:</span>
                <span className="font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">{data?.stats.rolesCount.CLIENT ?? 0}</span>
              </div>
              <div className="flex items-center justify-between bg-muted/40 px-2.5 py-1.5 rounded-lg border border-border">
                <span className="text-muted-foreground font-medium">Devs:</span>
                <span className="font-bold text-purple-700 dark:text-purple-400 bg-purple-500/10 px-1.5 py-0.5 rounded border border-purple-500/20">{data?.stats.rolesCount.DEVELOPER ?? 0}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Filtros e Busca */}
        <div className="p-5 rounded-xl bg-card border border-border shadow-xs space-y-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            {/* Input de Busca */}
            <div className="relative w-full md:w-96">
              <Search className="w-4 h-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar por nome, email, barbearia, IP ou página..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-lg bg-background border border-input text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring transition"
              />
            </div>

            {/* Filtros Rápidos */}
            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
              {/* Filtro Perfil */}
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
                className="px-3 py-2 rounded-lg bg-background border border-input text-xs text-foreground font-medium focus:outline-none focus:ring-1 focus:ring-ring cursor-pointer"
              >
                <option value="ALL">Todos os Perfis</option>
                <option value="ADMIN">Apenas Administradores</option>
                <option value="BARBER">Apenas Barbeiros</option>
                <option value="CLIENT">Apenas Clientes</option>
                <option value="DEVELOPER">Apenas Desenvolvedores</option>
              </select>

              {/* Filtro Status */}
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="px-3 py-2 rounded-lg bg-background border border-input text-xs text-foreground font-medium focus:outline-none focus:ring-1 focus:ring-ring cursor-pointer"
              >
                <option value="ALL">Todos os Status</option>
                <option value="ONLINE">Apenas Online (&lt; 3m)</option>
                <option value="IDLE">Apenas Ausente (3-15m)</option>
              </select>

              {/* Filtro Dispositivo */}
              <select
                value={selectedDevice}
                onChange={(e) => setSelectedDevice(e.target.value)}
                className="px-3 py-2 rounded-lg bg-background border border-input text-xs text-foreground font-medium focus:outline-none focus:ring-1 focus:ring-ring cursor-pointer"
              >
                <option value="ALL">Todos Dispositivos</option>
                <option value="Desktop">Desktop / Computador</option>
                <option value="Mobile">Celular / Smartphone</option>
                <option value="Tablet">Tablet</option>
              </select>
            </div>
          </div>
        </div>

        {/* Tabela de Usuários Conectados */}
        <div className="rounded-xl bg-card border border-border shadow-xs overflow-hidden">
          <div className="px-6 py-4 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-muted-foreground" />
              <h3 className="font-semibold text-card-foreground text-base">Lista de Sessões Conectadas</h3>
              <span className="text-xs bg-muted px-2.5 py-0.5 rounded-full text-muted-foreground font-medium border border-border">
                {filteredUsers.length} encontradas
              </span>
            </div>
          </div>

          {loading ? (
            <div className="py-20 text-center space-y-3">
              <RefreshCw className="w-8 h-8 text-primary animate-spin mx-auto" />
              <p className="text-xs text-muted-foreground font-medium">Carregando telemetria em tempo real...</p>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="py-20 text-center space-y-3">
              <Users className="w-10 h-10 text-muted-foreground mx-auto" />
              <h4 className="font-semibold text-card-foreground text-base">Nenhum usuário online encontrado</h4>
              <p className="text-xs text-muted-foreground font-normal max-w-sm mx-auto">
                {searchTerm || selectedRole !== 'ALL' || selectedStatus !== 'ALL'
                  ? 'Nenhum usuário corresponde aos filtros aplicados.'
                  : 'Nenhuma sessão ativa foi detectada na plataforma no momento.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-border bg-muted/40 text-muted-foreground uppercase font-semibold text-[10px] tracking-wider">
                    <th className="py-3 px-4">Usuário</th>
                    <th className="py-3 px-4">Perfil</th>
                    <th className="py-3 px-4">Barbearia / Estabelecimento</th>
                    <th className="py-3 px-4">Página Atual</th>
                    <th className="py-3 px-4">Dispositivo & IP</th>
                    <th className="py-3 px-4">Última Atividade</th>
                    <th className="py-3 px-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredUsers.map((item) => {
                    const isOnline = item.status === 'ONLINE'
                    return (
                      <tr
                        key={item.userId + item.sessionId}
                        className="hover:bg-muted/50 transition-colors"
                      >
                        {/* Coluna 1: Usuário */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <div className="relative">
                              {item.avatar ? (
                                <img
                                  src={item.avatar}
                                  alt={item.name}
                                  className="w-9 h-9 rounded-full object-cover border border-border"
                                />
                              ) : (
                                <div className="w-9 h-9 rounded-full bg-muted border border-border flex items-center justify-center font-bold text-xs text-foreground">
                                  {item.name.slice(0, 2).toUpperCase()}
                                </div>
                              )}
                              <span
                                className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-background ${
                                  isOnline ? 'bg-emerald-500' : 'bg-amber-500'
                                }`}
                                title={isOnline ? 'Online agora' : 'Ausente (idle)'}
                              />
                            </div>
                            <div>
                              <div className="font-semibold text-foreground text-sm">
                                {item.name}
                              </div>
                              <div className="text-[11px] text-muted-foreground font-mono">
                                {item.email}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Coluna 2: Perfil */}
                        <td className="py-3.5 px-4">
                          {getRoleBadge(item.role)}
                        </td>

                        {/* Coluna 3: Barbearia */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2">
                            <Building2 className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                            <span className="font-medium text-foreground truncate max-w-[180px]">
                              {item.barbershopName}
                            </span>
                          </div>
                          {item.barbershopSlug && (
                            <Link
                              href={`/b/${item.barbershopSlug}`}
                              target="_blank"
                              className="text-xs text-primary hover:underline font-medium inline-flex items-center gap-1 mt-0.5"
                            >
                              <span>/b/{item.barbershopSlug}</span>
                              <ExternalLink className="w-2.5 h-2.5" />
                            </Link>
                          )}
                        </td>

                        {/* Coluna 4: Página Atual */}
                        <td className="py-3.5 px-4 font-mono text-[11px]">
                          <span className="bg-muted px-2 py-1 rounded-md border border-border text-foreground">
                            {item.currentPath}
                          </span>
                        </td>

                        {/* Coluna 5: Dispositivo & IP */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-1.5 font-medium text-foreground">
                            {getDeviceIcon(item.deviceType)}
                            <span>{item.deviceType}</span>
                          </div>
                          <div className="text-[10px] text-muted-foreground font-mono mt-0.5">
                            IP: {item.ipAddress}
                          </div>
                        </td>

                        {/* Coluna 6: Última Atividade */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`w-2 h-2 rounded-full ${
                                isOnline ? 'bg-emerald-500' : 'bg-amber-500'
                              }`}
                            />
                            <span className="font-semibold text-foreground">
                              {formatSecondsAgo(item.secondsSinceLastActive)}
                            </span>
                          </div>
                          <div className="text-[10px] text-muted-foreground mt-0.5 font-normal">
                            Sessão ativa: {formatDuration(Date.now() - item.connectedAt)}
                          </div>
                        </td>

                        {/* Coluna 7: Ações */}
                        <td className="py-3.5 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => setUserToDisconnect(item)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-destructive hover:bg-destructive/90 text-destructive-foreground text-xs font-medium transition cursor-pointer"
                            title="Desconectar sessão deste usuário remotamente"
                          >
                            <LogOut className="w-3.5 h-3.5" />
                            <span>Desconectar</span>
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* Modal de Confirmação para Desconectar Usuário */}
      {userToDisconnect && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-xs">
          <div className="bg-card border border-border w-full max-w-md rounded-xl p-6 shadow-xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-destructive/10 text-destructive flex items-center justify-center font-bold shrink-0">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-semibold text-card-foreground text-base">Desconectar Sessão</h4>
                <p className="text-xs text-muted-foreground font-normal">Confirmação administrativa</p>
              </div>
            </div>

            <p className="text-xs text-card-foreground leading-relaxed font-normal">
              Você tem certeza que deseja encerrar remotamente a sessão do usuário{' '}
              <strong className="font-semibold">{userToDisconnect.name}</strong> ({userToDisconnect.email})?
              O usuário será imediatamente deslogado da plataforma na próxima requisição.
            </p>

            <div className="p-3 rounded-xl bg-muted/40 border border-border text-xs space-y-1.5">
              <div><span className="text-muted-foreground font-medium">Perfil:</span> <span className="font-bold text-amber-700 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded ml-1 border border-amber-500/20">{userToDisconnect.role}</span></div>
              <div><span className="text-muted-foreground font-medium">Barbearia:</span> <span className="font-semibold text-foreground ml-1">{userToDisconnect.barbershopName}</span></div>
              <div><span className="text-muted-foreground font-medium">Endereço IP:</span> <span className="font-mono text-foreground ml-1 font-semibold">{userToDisconnect.ipAddress}</span></div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setUserToDisconnect(null)}
                disabled={disconnecting}
                className="px-4 py-2 rounded-lg bg-background hover:bg-muted text-foreground text-xs font-medium border border-border transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDisconnect}
                disabled={disconnecting}
                className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-destructive hover:bg-destructive/90 text-destructive-foreground text-xs font-medium shadow-xs transition cursor-pointer disabled:opacity-50"
              >
                {disconnecting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Desconectando...</span>
                  </>
                ) : (
                  <>
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sim, Desconectar</span>
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
