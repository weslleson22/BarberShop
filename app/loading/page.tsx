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
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl p-8 space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
            <Database className="w-8 h-8 text-blue-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">
            Barber Shop SaaS
          </h1>
          <p className="text-gray-600">
            Validando conexão com o banco de dados...
          </p>
        </div>

        {/* Status Messages */}
        <div className="space-y-4">
          {connectionStatus.status === 'checking' && (
            <div className="flex flex-col items-center space-y-3 p-4 bg-blue-50 rounded-lg">
              <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
              <div className="text-center">
                <p className="text-blue-900 font-medium">Verificando conexão...</p>
                <p className="text-blue-700 text-sm">Aguarde um momento</p>
              </div>
            </div>
          )}

          {connectionStatus.status === 'connected' && (
            <div className="flex flex-col items-center space-y-3 p-4 bg-green-50 rounded-lg">
              <CheckCircle className="w-8 h-8 text-green-600" />
              <div className="text-center">
                <p className="text-green-900 font-medium">{connectionStatus.message}</p>
                <p className="text-green-700 text-sm">{connectionStatus.details}</p>
              </div>
              <div className="w-full bg-green-200 rounded-full h-2">
                <div className="bg-green-600 h-2 rounded-full animate-pulse"></div>
              </div>
            </div>
          )}

          {connectionStatus.status === 'error' && (
            <div className="flex flex-col items-center space-y-3 p-4 bg-red-50 rounded-lg">
              <XCircle className="w-8 h-8 text-red-600" />
              <div className="text-center">
                <p className="text-red-900 font-medium">{connectionStatus.message}</p>
                <p className="text-red-700 text-sm">{connectionStatus.details}</p>
              </div>
              
              {/* Troubleshooting Tips */}
              <div className="w-full space-y-2 text-left">
                <div className="flex items-start space-x-2">
                  <AlertTriangle className="w-4 h-4 text-yellow-600 mt-0.5" />
                  <div className="text-xs text-gray-600">
                    <p className="font-medium">Possíveis causas:</p>
                    <ul className="list-disc list-inside space-y-1 mt-1">
                      <li>Variável DATABASE_URL não configurada</li>
                      <li>API key do Prisma Data Proxy inválida</li>
                      <li>Banco de dados indisponível</li>
                      <li>Problemas de rede</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Retry Button */}
              <button
                onClick={retryConnection}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                Tentar Novamente
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="text-center text-xs text-gray-500 space-y-1">
          <p>Ambiente: {process.env.NODE_ENV || 'development'}</p>
          <p>Barber Shop SaaS v1.0</p>
        </div>
      </div>
    </div>
  )
}
