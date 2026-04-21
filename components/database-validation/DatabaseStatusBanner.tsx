'use client'

import { useDatabase } from './DatabaseValidator'
import { Database, Wifi, WifiOff, RefreshCw } from 'lucide-react'

export function DatabaseStatusBanner() {
  const { isValidated, isConnected, isLoading, error, retryValidation } = useDatabase()

  // Não mostrar banner em desenvolvimento unless explicitamente solicitado
  if (process.env.NODE_ENV !== 'production' && !window.location.search.includes('validate_db=true')) {
    return null
  }

  // Se ainda está validando, não mostrar nada (a página de loading cuida disso)
  if (isLoading) {
    return null
  }

  // Se está conectado, mostrar banner verde sutil
  if (isConnected) {
    return (
      <div className="bg-green-50 border-b border-green-200 px-4 py-2">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Database className="w-4 h-4 text-green-600" />
            <Wifi className="w-4 h-4 text-green-600" />
            <span className="text-sm text-green-800 font-medium">
              Banco de dados conectado
            </span>
          </div>
          <span className="text-xs text-green-600">
            Produção
          </span>
        </div>
      </div>
    )
  }

  // Se houve erro, mostrar banner vermelho com opção de retry
  return (
    <div className="bg-red-50 border-b border-red-200 px-4 py-2">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Database className="w-4 h-4 text-red-600" />
          <WifiOff className="w-4 h-4 text-red-600" />
          <div>
            <span className="text-sm text-red-800 font-medium">
              Falha na conexão com o banco
            </span>
            {error && (
              <span className="text-xs text-red-600 ml-2">
                {error}
              </span>
            )}
          </div>
        </div>
        <button
          onClick={retryValidation}
          className="flex items-center space-x-1 text-xs text-red-600 hover:text-red-800 transition-colors"
        >
          <RefreshCw className="w-3 h-3" />
          <span>Tentar novamente</span>
        </button>
      </div>
    </div>
  )
}
