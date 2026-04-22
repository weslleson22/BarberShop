'use client'

import { useState, useEffect } from 'react'
import { Eye, EyeOff, Copy, Check, Database, Wifi, WifiOff, AlertCircle, CheckCircle, Clock } from 'lucide-react'

interface DatabaseConnection {
  status: 'connected' | 'error' | 'unknown'
  latency: number
  error: string | null
  databaseInfo: {
    current_database: string;
    current_user: string;
  } | null
}

interface EnvironmentInfo {
  databaseUrl: string
  databaseUrlMasked: string
  jwtSecret: string
  jwtSecretMasked: string
  nodeEnv: string
  nextAuthSecret: string
  nextAuthSecretMasked: string
  nextAuthUrl: string
  hasDatabaseUrl: boolean
  hasJwtSecret: boolean
  hasNextAuthSecret: boolean
  hasNextAuthUrl: boolean
  databaseConnection?: DatabaseConnection
  totalResponseTime?: number
}

export default function EnvironmentDebug() {
  const [environment, setEnvironment] = useState<EnvironmentInfo | null>(null)
  const [showSecrets, setShowSecrets] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)

  useEffect(() => {
    fetchEnvironmentData()
  }, [showSecrets])

  const fetchEnvironmentData = async () => {
    try {
      console.log('=== BUSCANDO VARIÁVEIS DE AMBIENTE DO SERVIDOR ===')
      
      const response = await fetch('/api/debug/env')
      
      if (response.ok) {
        const data = await response.json()
        console.log('Variáveis recebidas do servidor:', data)
        
        // Função para mascarar valores sensíveis
        const maskValue = (value: string, show: boolean) => {
          if (value === 'Não definida') return value
          if (show) return value
          
          if (value.length <= 8) {
            return '*'.repeat(value.length)
          }
          
          const start = value.substring(0, 8)
          const end = value.substring(value.length - 8)
          const middle = '*'.repeat(Math.max(3, value.length - 16))
          
          return `${start}${middle}${end}`
        }

        setEnvironment({
          databaseUrl: data.databaseUrl,
          databaseUrlMasked: maskValue(data.databaseUrl, showSecrets),
          jwtSecret: data.jwtSecret,
          jwtSecretMasked: maskValue(data.jwtSecret, showSecrets),
          nextAuthSecret: data.nextAuthSecret,
          nextAuthSecretMasked: maskValue(data.nextAuthSecret, showSecrets),
          nextAuthUrl: data.nextAuthUrl,
          nodeEnv: data.nodeEnv,
          hasDatabaseUrl: data.hasDatabaseUrl,
          hasJwtSecret: data.hasJwtSecret,
          hasNextAuthSecret: data.hasNextAuthSecret,
          hasNextAuthUrl: data.hasNextAuthUrl
        })
        
        console.log('Environment state atualizado com sucesso!')
      } else {
        console.error('Erro ao buscar variáveis:', response.status)
        // Fallback para valores padrão
        setEnvironment({
          databaseUrl: 'Erro ao carregar',
          databaseUrlMasked: 'Erro ao carregar',
          jwtSecret: 'Erro ao carregar',
          jwtSecretMasked: 'Erro ao carregar',
          nextAuthSecret: 'Erro ao carregar',
          nextAuthSecretMasked: 'Erro ao carregar',
          nextAuthUrl: 'Erro ao carregar',
          nodeEnv: 'Erro ao carregar',
          hasDatabaseUrl: false,
          hasJwtSecret: false,
          hasNextAuthSecret: false,
          hasNextAuthUrl: false
        })
      }
    } catch (error) {
      console.error('Error ao buscar variáveis:', error)
      setEnvironment({
        databaseUrl: 'Erro de conexão',
        databaseUrlMasked: 'Erro de conexão',
        jwtSecret: 'Erro de conexão',
        jwtSecretMasked: 'Erro de conexão',
        nextAuthSecret: 'Erro de conexão',
        nextAuthSecretMasked: 'Erro de conexão',
        nextAuthUrl: 'Erro de conexão',
        nodeEnv: 'Erro de conexão',
        hasDatabaseUrl: false,
        hasJwtSecret: false,
        hasNextAuthSecret: false,
        hasNextAuthUrl: false
      })
    }
  }

  const copyToClipboard = async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(type)
      setTimeout(() => setCopied(null), 2000)
    } catch (error) {
      console.error('Erro ao copiar:', error)
    }
  }

  if (!environment) {
    return (
      <div className="bg-gray-100 rounded-lg p-4 animate-pulse">
        <div className="h-4 bg-gray-300 rounded w-1/4 mb-2"></div>
        <div className="h-3 bg-gray-300 rounded w-full mb-1"></div>
        <div className="h-3 bg-gray-300 rounded w-full"></div>
      </div>
    )
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">
          Environment Variables Debug
        </h3>
        <button
          onClick={() => setShowSecrets(!showSecrets)}
          className="flex items-center space-x-2 px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
        >
          {showSecrets ? (
            <>
              <EyeOff className="w-4 h-4" />
              <span>Ocultar</span>
            </>
          ) : (
            <>
              <Eye className="w-4 h-4" />
              <span>Mostrar</span>
            </>
          )}
        </button>
      </div>

      <div className="space-y-4">
        {/* DATABASE_URL */}
        <div className="border-l-4 border-blue-500 pl-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-medium text-gray-700">DATABASE_URL</span>
                <span className={`px-2 py-1 text-xs rounded-full ${
                  environment.hasDatabaseUrl 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-red-100 text-red-800'
                }`}>
                  {environment.hasDatabaseUrl ? 'OK' : 'FALTANDO'}
                </span>
              </div>
              <div className="mt-1 flex items-center space-x-2">
                <code className="text-sm bg-gray-100 px-2 py-1 rounded font-mono break-all">
                  {showSecrets ? environment.databaseUrl : environment.databaseUrlMasked}
                </code>
                <button
                  onClick={() => copyToClipboard(environment.databaseUrl, 'database')}
                  className="text-gray-500 hover:text-gray-700"
                >
                  {copied === 'database' ? (
                    <Check className="w-4 h-4 text-green-600" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* JWT_SECRET */}
        <div className="border-l-4 border-green-500 pl-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-medium text-gray-700">JWT_SECRET</span>
                <span className={`px-2 py-1 text-xs rounded-full ${
                  environment.hasJwtSecret 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-yellow-100 text-yellow-800'
                }`}>
                  {environment.hasJwtSecret ? 'OK' : 'FALLBACK'}
                </span>
              </div>
              <div className="mt-1 flex items-center space-x-2">
                <code className="text-sm bg-gray-100 px-2 py-1 rounded font-mono break-all">
                  {showSecrets ? environment.jwtSecret : environment.jwtSecretMasked}
                </code>
                <button
                  onClick={() => copyToClipboard(environment.jwtSecret, 'jwt')}
                  className="text-gray-500 hover:text-gray-700"
                >
                  {copied === 'jwt' ? (
                    <Check className="w-4 h-4 text-green-600" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* NEXTAUTH_SECRET */}
        <div className="border-l-4 border-purple-500 pl-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-medium text-gray-700">NEXTAUTH_SECRET</span>
                <span className={`px-2 py-1 text-xs rounded-full ${
                  environment.hasNextAuthSecret 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {environment.hasNextAuthSecret ? 'OK' : 'NÃO USADO'}
                </span>
              </div>
              <div className="mt-1 flex items-center space-x-2">
                <code className="text-sm bg-gray-100 px-2 py-1 rounded font-mono break-all">
                  {showSecrets ? environment.nextAuthSecret : environment.nextAuthSecretMasked}
                </code>
                <button
                  onClick={() => copyToClipboard(environment.nextAuthSecret, 'nextauth')}
                  className="text-gray-500 hover:text-gray-700"
                >
                  {copied === 'nextauth' ? (
                    <Check className="w-4 h-4 text-green-600" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* NEXTAUTH_URL */}
        <div className="border-l-4 border-orange-500 pl-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-medium text-gray-700">NEXTAUTH_URL</span>
                <span className={`px-2 py-1 text-xs rounded-full ${
                  environment.hasNextAuthUrl 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {environment.hasNextAuthUrl ? 'OK' : 'NÃO USADO'}
                </span>
              </div>
              <div className="mt-1">
                <code className="text-sm bg-gray-100 px-2 py-1 rounded font-mono">
                  {environment.nextAuthUrl}
                </code>
              </div>
            </div>
          </div>
        </div>

        {/* NODE_ENV */}
        <div className="border-l-4 border-gray-500 pl-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-medium text-gray-700">NODE_ENV</span>
                <span className={`px-2 py-1 text-xs rounded-full ${
                  environment.nodeEnv === 'production' 
                    ? 'bg-red-100 text-red-800' 
                    : 'bg-blue-100 text-blue-800'
                }`}>
                  {environment.nodeEnv.toUpperCase()}
                </span>
              </div>
              <div className="mt-1">
                <code className="text-sm bg-gray-100 px-2 py-1 rounded font-mono">
                  {environment.nodeEnv}
                </code>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Database Connection Status */}
      {environment?.databaseConnection && (
        <div className="mt-6 border-t border-gray-200 pt-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Database className="w-5 h-5 mr-2" />
            Status da Conexão com Banco de Dados
          </h3>
          
          <div className="bg-gray-50 rounded-lg p-4 mb-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                {environment.databaseConnection.status === 'connected' ? (
                  <>
                    <CheckCircle className="w-6 h-6 text-green-500" />
                    <span className="text-green-700 font-medium">Conectado</span>
                  </>
                ) : environment.databaseConnection.status === 'error' ? (
                  <>
                    <AlertCircle className="w-6 h-6 text-red-500" />
                    <span className="text-red-700 font-medium">Erro de Conexão</span>
                  </>
                ) : (
                  <>
                    <WifiOff className="w-6 h-6 text-gray-500" />
                    <span className="text-gray-700 font-medium">Status Desconhecido</span>
                  </>
                )}
              </div>
              
              {environment.databaseConnection.status === 'connected' && (
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <Clock className="w-4 h-4" />
                  <span>{environment.databaseConnection.latency}ms</span>
                </div>
              )}
            </div>

            {environment.databaseConnection.error && (
              <div className="bg-red-50 border border-red-200 rounded-md p-3 mb-3">
                <div className="flex items-start space-x-2">
                  <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm text-red-800 font-medium">Erro detectado:</p>
                    <p className="text-sm text-red-700 mt-1">{environment.databaseConnection.error}</p>
                  </div>
                </div>
              </div>
            )}

            {environment.databaseConnection.databaseInfo && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white rounded-md p-3 border border-gray-200">
                  <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Database</p>
                  <p className="text-sm font-medium text-gray-900">
                    {environment.databaseConnection.databaseInfo.current_database}
                  </p>
                </div>
                <div className="bg-white rounded-md p-3 border border-gray-200">
                  <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Usuário</p>
                  <p className="text-sm font-medium text-gray-900">
                    {environment.databaseConnection.databaseInfo.current_user}
                  </p>
                </div>
              </div>
            )}

            {/* Status Visual Indicator */}
            <div className="mt-4">
              <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
                <span>Qualidade da Conexão</span>
                <span>
                  {environment.databaseConnection.status === 'connected' 
                    ? environment.databaseConnection.latency < 100 
                      ? 'Excelente' 
                      : environment.databaseConnection.latency < 300 
                        ? 'Boa' 
                        : 'Lenta'
                    : 'Indisponível'
                  }
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full transition-all duration-300 ${
                    environment.databaseConnection.status === 'connected'
                      ? environment.databaseConnection.latency < 100
                        ? 'bg-green-500'
                        : environment.databaseConnection.latency < 300
                          ? 'bg-yellow-500'
                          : 'bg-orange-500'
                      : 'bg-red-500'
                  }`}
                  style={{
                    width: environment.databaseConnection.status === 'connected'
                      ? Math.max(10, 100 - Math.min(environment.databaseConnection.latency / 5, 90))
                      : '0%'
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Resumo */}
      <div className="mt-6 pt-4 border-t border-gray-200">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-blue-600">
              {environment.hasDatabaseUrl ? '1' : '0'}
            </div>
            <div className="text-xs text-gray-600">Database</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-green-600">
              {environment.hasJwtSecret ? '1' : '0'}
            </div>
            <div className="text-xs text-gray-600">JWT Secret</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-purple-600">
              {environment.hasNextAuthSecret ? '1' : '0'}
            </div>
            <div className="text-xs text-gray-600">NextAuth</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-600">
              {environment.nodeEnv === 'production' ? 'PROD' : 'DEV'}
            </div>
            <div className="text-xs text-gray-600">Ambiente</div>
          </div>
        </div>
      </div>
    </div>
  )
}
