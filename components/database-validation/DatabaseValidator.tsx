'use client'

import { useState, useEffect, createContext, useContext } from 'react'
import { useRouter } from 'next/navigation'

interface DatabaseContextType {
  isValidated: boolean
  isConnected: boolean
  isLoading: boolean
  error: string | null
  retryValidation: () => void
}

const DatabaseContext = createContext<DatabaseContextType | undefined>(undefined)

export function useDatabase() {
  const context = useContext(DatabaseContext)
  if (context === undefined) {
    throw new Error('useDatabase must be used within a DatabaseProvider')
  }
  return context
}

export function DatabaseProvider({ children }: { children: React.ReactNode }) {
  const [isValidated, setIsValidated] = useState(false)
  const [isConnected, setIsConnected] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    // Só validar em produção ou quando explicitamente solicitado
    if (process.env.NODE_ENV === 'production' || window.location.search.includes('validate_db=true')) {
      validateDatabaseConnection()
    } else {
      setIsLoading(false)
      setIsValidated(true)
      setIsConnected(true)
    }
  }, [])

  const validateDatabaseConnection = async () => {
    try {
      setIsLoading(true)
      setError(null)
      
      const response = await fetch('/api/health', {
        method: 'GET',
        cache: 'no-store'
      })

      if (response.ok) {
        const data = await response.json()
        
        if (data.status === 'connected') {
          setIsConnected(true)
          setError(null)
          console.log('Database connected successfully:', data)
        } else {
          setIsConnected(false)
          setError(data.message || 'Database connection failed')
        }
      } else {
        const errorData = await response.json().catch(() => ({}))
        setIsConnected(false)
        setError(errorData.message || `HTTP ${response.status}`)
      }
    } catch (err) {
      setIsConnected(false)
      setError(err instanceof Error ? err.message : 'Network error')
      console.error('Database validation error:', err)
    } finally {
      setIsLoading(false)
      setIsValidated(true)
    }
  }

  const retryValidation = () => {
    validateDatabaseConnection()
  }

  // Em produção, se não estiver conectado, redirecionar para página de validação
  useEffect(() => {
    if (process.env.NODE_ENV === 'production' && isValidated && !isConnected) {
      router.push('/loading')
    }
  }, [isValidated, isConnected, router])

  return (
    <DatabaseContext.Provider
      value={{
        isValidated,
        isConnected,
        isLoading,
        error,
        retryValidation
      }}
    >
      {children}
    </DatabaseContext.Provider>
  )
}
