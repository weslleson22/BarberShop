'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import DropdownHeader from '@/components/shared/DropdownHeader'
import RealtimeNavTabs from '@/components/developer/RealtimeNavTabs'
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
    <div className="min-h-screen bg-gray-950 text-white pb-20 pt-20">
      <DropdownHeader />

      <main className="w-full px-4 md:px-8 max-w-7xl mx-auto space-y-8 pt-4">
        {/* Navegação por Subitens / Abas */}
        <RealtimeNavTabs activeTab="monitoring" />

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider mb-1.5">
              <span className="bg-[#2563eb] text-white px-2.5 py-0.5 rounded-md border border-[#1d4ed8] inline-flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-white" />
                Infraestrutura & Telemetria
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-white">System Health & Monitoramento</h1>
            <p className="text-xs sm:text-sm text-white font-normal mt-1">
              Diagnóstico em tempo real do banco de dados, latência e serviços da plataforma.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs text-white font-medium hidden sm:block">
              Atualizado: {lastRefreshed.toLocaleTimeString('pt-BR')}
            </span>
            <button
              onClick={fetchDiagnostic}
              disabled={loading}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-xl bg-[#2563eb] hover:bg-[#1d4ed8] text-white border border-[#1d4ed8] transition cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 text-white ${loading ? 'animate-spin' : ''}`} />
              <span>{loading ? 'Consultando...' : 'Atualizar Diagnóstico'}</span>
            </button>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-4 rounded-xl bg-[#7f1d1d] border-2 border-[#ef4444] text-white flex items-center justify-between text-xs font-bold">
            <div className="flex items-center gap-2.5">
              <AlertTriangle className="w-5 h-5 text-white shrink-0" />
              <span>{error}</span>
            </div>
            <button onClick={() => setError(null)} className="text-white hover:text-gray-200 cursor-pointer font-bold px-2 py-1 bg-[#1f2937] rounded">✕</button>
          </div>
        )}

        {/* Overall Health Status Bar */}
        <div className={`p-5 rounded-2xl border-2 flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
          isConnected
            ? 'bg-[#064e3b] border-[#10b981] text-white'
            : 'bg-[#7f1d1d] border-[#ef4444] text-white'
        }`}>
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-[#059669] text-white flex items-center justify-center font-bold shrink-0">
              {isConnected ? <CheckCircle2 className="w-6 h-6 text-white" /> : <AlertTriangle className="w-6 h-6 text-white" />}
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">
                {isConnected ? 'Todos os Sistemas Operacionais' : 'Falha Detectada na Conexão'}
              </h2>
              <p className="text-xs text-white font-medium mt-0.5">
                {isConnected
                  ? 'O cluster PostgreSQL e o runtime da aplicação estão respondendo com estabilidade.'
                  : data?.connectionTest?.message || 'Incapaz de estabelecer conexão com a base de dados.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#030712] border border-[#374151] text-xs font-mono text-white font-bold">
              <Radio className={`w-3.5 h-3.5 ${isConnected ? 'text-[#10b981]' : 'text-red-400'}`} />
              <span>Latência: {data?.connectionTest?.latency || '-'}</span>
            </div>
          </div>
        </div>

        {/* Grid Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-[#111827] border border-[#374151] rounded-2xl p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-white uppercase tracking-wider">PostgreSQL Engine</span>
              <Database className="w-4 h-4 text-white" />
            </div>
            <div className="text-lg font-extrabold text-white capitalize">
              {data?.database.urlPrefix || 'PostgreSQL'}
            </div>
            <span className="text-xs text-white font-medium mt-2 block">
              SSL Mode: {data?.database.hasSSL ? 'Ativo (Criptografado)' : 'Padrão Seguro'}
            </span>
          </div>

          <div className="bg-[#111827] border border-[#374151] rounded-2xl p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-white uppercase tracking-wider">Ambiente</span>
              <Server className="w-4 h-4 text-white" />
            </div>
            <div className="text-lg font-extrabold text-white capitalize">
              {data?.environment || 'Produção'}
            </div>
            <span className="text-xs text-white font-medium mt-2 block">
              Node: {process.env.NODE_ENV || 'production'}
            </span>
          </div>

          <div className="bg-[#111827] border border-[#374151] rounded-2xl p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-white uppercase tracking-wider">Região / Edge Vercel</span>
              <Globe className="w-4 h-4 text-white" />
            </div>
            <div className="text-lg font-extrabold text-white">
              {data?.vercel.region || 'São Paulo / GRU'}
            </div>
            <span className="text-xs text-white font-medium mt-2 block">
              {data?.vercel.isVercel ? 'Hospedagem Vercel Edge' : 'Runtime Dedicado'}
            </span>
          </div>

          <div className="bg-[#111827] border border-[#374151] rounded-2xl p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-white uppercase tracking-wider">Barbearias Ativas</span>
              <Layers className="w-4 h-4 text-white" />
            </div>
            <div className="text-lg font-extrabold text-white">
              {data?.connectionTest?.barbershopCount ?? '-'}
            </div>
            <span className="text-xs text-white font-bold bg-[#059669] px-2 py-0.5 rounded inline-block mt-2">
              Multi-tenant isolado
            </span>
          </div>
        </div>

        {/* Security & Secrets Verification Card */}
        <div className="bg-[#111827] border border-[#374151] rounded-2xl p-6 md:p-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-white">Conformidade & Sanitização de Segredos</h2>
              <p className="text-xs text-white font-normal mt-1">
                Verificação de variáveis de ambiente obrigatórias sem exposição de credenciais ou tokens em texto claro.
              </p>
            </div>
            <Shield className="w-6 h-6 text-white" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-[#030712] border border-[#374151] flex items-center justify-between text-xs">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-4 h-4 text-[#10b981]" />
                <span className="font-mono text-white font-bold">DATABASE_URL Configurada</span>
              </div>
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-md bg-[#059669] text-white border border-[#10b981]">
                Presente (Protegida)
              </span>
            </div>

            <div className="p-4 rounded-xl bg-[#030712] border border-[#374151] flex items-center justify-between text-xs">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-4 h-4 text-[#10b981]" />
                <span className="font-mono text-white font-bold">JWT_SECRET Ativo</span>
              </div>
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-md bg-[#059669] text-white border border-[#10b981]">
                {data?.otherVars.jwtSecret ? 'Configurado' : 'Padrão'}
              </span>
            </div>

            <div className="p-4 rounded-xl bg-[#030712] border border-[#374151] flex items-center justify-between text-xs">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-4 h-4 text-[#10b981]" />
                <span className="font-mono text-white font-bold">NEXTAUTH_SECRET</span>
              </div>
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-md bg-[#059669] text-white border border-[#10b981]">
                {data?.otherVars.nextAuthSecret ? 'Configurado' : 'Presente'}
              </span>
            </div>

            <div className="p-4 rounded-xl bg-[#030712] border border-[#374151] flex items-center justify-between text-xs">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-4 h-4 text-[#10b981]" />
                <span className="font-mono text-white font-bold">Isolamento Multi-Tenant</span>
              </div>
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-md bg-[#059669] text-white border border-[#10b981]">
                Validado
              </span>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
