'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Database, Loader2, CheckCircle, XCircle, AlertTriangle } from 'lucide-react'

interface ConnectionStatus {
  status: 'checking' | 'connected' | 'error'
  message?: string
  details?: string
}

export default function DatabaseValidationPage() {
  const router = useRouter()
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({
    status: 'checking'
  })

  useEffect(() => {
    validateDatabaseConnection()
  }, [])

  const validateDatabaseConnection = async () => {
    try {
      setConnectionStatus({ status: 'checking' })
      
      // Testar conexão com o banco
      const response = await fetch('/api/health', {
        method: 'GET',
        cache: 'no-store'
      })

      if (response.ok) {
        const data = await response.json()
        
        if (data.status === 'connected') {
          setConnectionStatus({
            status: 'connected',
            message: 'Conectado com sucesso ao banco de dados!',
            details: `Banco: ${data.database} | Ambiente: ${data.environment}`
          })
          
          // Redirecionar para home após 2 segundos
          setTimeout(() => {
            router.push('/')
          }, 2000)
        } else {
          setConnectionStatus({
            status: 'error',
            message: 'Falha na conexão com o banco de dados',
            details: data.message || 'Erro desconhecido'
          })
        }
      } else {
        const errorData = await response.json().catch(() => ({}))
        setConnectionStatus({
          status: 'error',
          message: 'Erro ao validar conexão com o banco',
          details: errorData.message || `Status: ${response.status}`
        })
      }
    } catch (error) {
      console.error('Database validation error:', error)
      setConnectionStatus({
        status: 'error',
        message: 'Erro crítico na conexão com o banco',
        details: error instanceof Error ? error.message : 'Erro de rede ou servidor'
      })
    }
  }

  const retryConnection = () => {
    validateDatabaseConnection()
  }

  return (
    <div className="min-h-screen bg-[#090D16] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Luzes ambiente */}
      <div className="absolute top-1/3 -left-32 w-80 h-80 bg-blue-600/15 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/3 -right-32 w-80 h-80 bg-cyan-500/15 rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-md w-full bg-slate-900/80 border border-white/10 rounded-2xl shadow-2xl shadow-black/60 backdrop-blur-2xl p-8 space-y-6 relative z-10">
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 via-blue-500 to-cyan-400 p-0.5 shadow-lg shadow-blue-500/25 flex items-center justify-center">
            <div className="w-full h-full bg-[#0B1120] rounded-[14px] flex items-center justify-center">
              <Database className="w-6 h-6 text-blue-400" />
            </div>
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white">
              Agenda<span className="text-blue-400">SaaS</span>
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Verificando disponibilidade e ambiente...
            </p>
          </div>
        </div>

        {/* Status Messages */}
        <div className="space-y-4">
          {connectionStatus.status === 'checking' && (
            <div className="flex flex-col items-center space-y-3 p-5 bg-blue-500/10 border border-blue-500/20 rounded-xl">
              <Loader2 className="w-7 h-7 text-blue-400 animate-spin" />
              <div className="text-center">
                <p className="text-white font-medium text-sm">Verificando conexão...</p>
                <p className="text-slate-400 text-xs mt-0.5">Sincronizando com os serviços da nuvem</p>
              </div>
            </div>
          )}

          {connectionStatus.status === 'connected' && (
            <div className="flex flex-col items-center space-y-3 p-5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
              <CheckCircle className="w-7 h-7 text-emerald-400" />
              <div className="text-center">
                <p className="text-emerald-300 font-medium text-sm">{connectionStatus.message}</p>
                <p className="text-emerald-400/80 text-xs mt-0.5">{connectionStatus.details}</p>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                <div className="bg-emerald-500 h-full rounded-full animate-pulse w-full"></div>
              </div>
            </div>
          )}

          {connectionStatus.status === 'error' && (
            <div className="flex flex-col items-center space-y-3 p-5 bg-red-500/10 border border-red-500/20 rounded-xl">
              <XCircle className="w-7 h-7 text-red-400" />
              <div className="text-center">
                <p className="text-red-300 font-medium text-sm">{connectionStatus.message}</p>
                <p className="text-red-400/80 text-xs mt-0.5">{connectionStatus.details}</p>
              </div>
              
              {/* Troubleshooting Tips */}
              <div className="w-full space-y-2 text-left bg-slate-950/60 p-3 rounded-lg border border-white/5">
                <div className="flex items-start space-x-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
                  <div className="text-xs text-slate-400">
                    <p className="font-medium text-slate-300">Possíveis causas:</p>
                    <ul className="list-disc list-inside space-y-0.5 mt-1 text-[11px]">
                      <li>Variável DATABASE_URL ausente</li>
                      <li>Instabilidade de rede</li>
                      <li>Banco em hibernação ou inacessível</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Retry Button */}
              <button
                onClick={retryConnection}
                className="w-full bg-gradient-to-r from-blue-600 to-cyan-500 text-white py-2.5 px-4 rounded-xl hover:from-blue-500 hover:to-cyan-400 transition-all font-semibold text-sm shadow-lg shadow-blue-500/20"
              >
                Tentar Novamente
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="text-center text-[11px] text-slate-500 pt-2 border-t border-white/5">
          <p>AgendaSaaS &bull; {process.env.NODE_ENV || 'production'}</p>
        </div>
      </div>
    </div>
  )
}
