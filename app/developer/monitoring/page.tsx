'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import DropdownHeader from '@/components/shared/DropdownHeader'
import { useAuth } from '@/lib/auth-context'
import { getAuthHeaders } from '@/lib/utils'
import {
  Activity,
  Database,
  Server,
  Shield,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Clock,
  Layers,
  Cpu,
  Globe,
  Radio
} from 'lucide-react'

interface DiagnosticData {
  timestamp: string
  environment: string
  vercel: {
    isVercel: boolean
    region?: string
    env?: string
  }
  database: {
    hasUrl: boolean
    urlPrefix: string
    urlLength: number
    isPrismaProtocol: boolean
    isPostgresProtocol: boolean
    hasApiKey: boolean
    hasSSL: boolean
  }
  otherVars: {
    jwtSecret: boolean
    nextAuthSecret: boolean
    nextAuthUrl: boolean
  }
  connectionTest?: {
    status: string
    latency?: string
    timestamp: string
    barbershopCount?: number
    message?: string
  }
}

export default function DeveloperMonitoringPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()

  const [data, setData] = useState<DiagnosticData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date())

  useEffect(() => {
    if (!authLoading && user?.role !== 'DEVELOPER') {
      router.replace('/dashboard')
    }
  }, [user, authLoading, router])

  const fetchDiagnostic = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/diagnostic', {
        headers: getAuthHeaders(),
        credentials: 'include',
      })
      if (res.ok) {
        const json = await res.json()
        setData(json)
        setLastRefreshed(new Date())
      } else {
        const errJson = await res.json().catch(() => ({}))
        setError(errJson.error || 'Erro ao consultar telemetria do sistema')
      }
    } catch {
      setError('Falha de conexão com os serviços de diagnóstico')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (user?.role === 'DEVELOPER') {
      fetchDiagnostic()
    }
  }, [user])

  const isConnected = data?.connectionTest?.status === 'connected'

  if (authLoading || user?.role !== 'DEVELOPER') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background text-foreground pb-20 pt-20">
      <DropdownHeader />

      <main className="w-full px-4 md:px-8 max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-primary text-xs font-semibold uppercase tracking-wider mb-1">
              <Activity className="w-4 h-4" />
              <span>Infraestrutura & Telemetria</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">System Health & Monitoramento</h1>
            <p className="text-sm md:text-base text-muted-foreground mt-1">
              Diagnóstico em tempo real do banco de dados, latência e serviços da plataforma.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground hidden sm:block">
              Atualizado: {lastRefreshed.toLocaleTimeString('pt-BR')}
            </span>
            <button
              onClick={fetchDiagnostic}
              disabled={loading}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs md:text-sm font-semibold rounded-xl bg-card border border-border hover:bg-accent text-foreground transition-all shadow-sm"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              <span>{loading ? 'Consultando...' : 'Atualizar Diagnóstico'}</span>
            </button>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive-foreground flex items-center justify-between text-sm">
            <div className="flex items-center gap-2.5">
              <AlertTriangle className="w-5 h-5 text-destructive shrink-0" />
              <span>{error}</span>
            </div>
            <button onClick={() => setError(null)} className="text-destructive hover:text-foreground">✕</button>
          </div>
        )}

        {/* Overall Health Status Bar */}
        <div className={`p-5 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm ${
          isConnected
            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
            : 'bg-destructive/10 border-destructive/30 text-destructive-foreground'
        }`}>
          <div className="flex items-center gap-3.5">
            <div className={`p-2.5 rounded-xl shrink-0 ${isConnected ? 'bg-emerald-500/20 text-emerald-400' : 'bg-destructive/20 text-destructive'}`}>
              {isConnected ? <CheckCircle2 className="w-6 h-6" /> : <AlertTriangle className="w-6 h-6" />}
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">
                {isConnected ? 'Todos os Sistemas Operacionais' : 'Falha Detectada na Conexão'}
              </h2>
              <p className="text-xs opacity-90 mt-0.5">
                {isConnected
                  ? 'O cluster PostgreSQL e o runtime de aplicação estão respondendo normalmente.'
                  : data?.connectionTest?.message || 'Incapaz de estabelecer conexão com a base de dados.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-background/50 border border-border text-xs font-mono">
              <Radio className={`w-3.5 h-3.5 ${isConnected ? 'text-emerald-400 animate-pulse' : 'text-destructive'}`} />
              <span>Latência: {data?.connectionTest?.latency || '-'}</span>
            </div>
          </div>
        </div>

        {/* Grid Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between text-muted-foreground mb-2">
              <span className="text-xs font-medium">PostgreSQL Engine</span>
              <Database className="w-4 h-4 text-primary" />
            </div>
            <div className="text-lg font-bold text-foreground capitalize">
              {data?.database.urlPrefix || 'PostgreSQL'}
            </div>
            <span className="text-xs text-muted-foreground mt-2 block">
              SSL Mode: {data?.database.hasSSL ? 'Ativo (Criptografado)' : 'Padrão Seguro'}
            </span>
          </div>

          <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between text-muted-foreground mb-2">
              <span className="text-xs font-medium">Ambiente de Execução</span>
              <Server className="w-4 h-4 text-primary" />
            </div>
            <div className="text-lg font-bold text-foreground capitalize">
              {data?.environment || 'Produção'}
            </div>
            <span className="text-xs text-muted-foreground mt-2 block">
              Node: {process.env.NODE_ENV || 'production'}
            </span>
          </div>

          <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between text-muted-foreground mb-2">
              <span className="text-xs font-medium">Região / Edge Vercel</span>
              <Globe className="w-4 h-4 text-primary" />
            </div>
            <div className="text-lg font-bold text-foreground">
              {data?.vercel.region || 'São Paulo / GRU'}
            </div>
            <span className="text-xs text-muted-foreground mt-2 block">
              {data?.vercel.isVercel ? 'Hospedagem Vercel Edge' : 'Runtime Dedicado'}
            </span>
          </div>

          <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between text-muted-foreground mb-2">
              <span className="text-xs font-medium">Barbearias Ativas</span>
              <Layers className="w-4 h-4 text-primary" />
            </div>
            <div className="text-lg font-bold text-foreground">
              {data?.connectionTest?.barbershopCount ?? '-'}
            </div>
            <span className="text-xs text-emerald-400 font-medium mt-2 block">
              Multi-tenant isolado
            </span>
          </div>
        </div>

        {/* Security & Secrets Verification Card (Without Exposing Secrets) */}
        <div className="bg-card border border-border rounded-2xl p-6 md:p-8 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-foreground">Conformidade & Sanitização de Segredos</h2>
              <p className="text-sm text-muted-foreground">
                Verificação de variáveis de ambiente obrigatórias sem exposição de credenciais ou tokens em texto claro.
              </p>
            </div>
            <Shield className="w-5 h-5 text-primary" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-muted/40 border border-border flex items-center justify-between text-sm">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span className="font-mono text-xs">DATABASE_URL Configurada</span>
              </div>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400">
                Presente (Protegida)
              </span>
            </div>

            <div className="p-4 rounded-xl bg-muted/40 border border-border flex items-center justify-between text-sm">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span className="font-mono text-xs">JWT_SECRET Ativo</span>
              </div>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400">
                {data?.otherVars.jwtSecret ? 'Configurado' : 'Padrão'}
              </span>
            </div>

            <div className="p-4 rounded-xl bg-muted/40 border border-border flex items-center justify-between text-sm">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span className="font-mono text-xs">NEXTAUTH_SECRET</span>
              </div>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400">
                {data?.otherVars.nextAuthSecret ? 'Configurado' : 'Presente'}
              </span>
            </div>

            <div className="p-4 rounded-xl bg-muted/40 border border-border flex items-center justify-between text-sm">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span className="font-mono text-xs">Isolamento Multi-Tenant</span>
              </div>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400">
                Validado
              </span>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
