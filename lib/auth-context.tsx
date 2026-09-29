'use client'

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import { useIdleLogout } from '@/hooks/useIdleLogout'
import type { UserRole } from './roles'

const IDLE_TIMEOUT_MS = 15 * 60 * 1000 // 15 minutos de inatividade

interface User {
  id: string
  name: string
  email: string
  role: UserRole
  barbershopId: string
  isActive: boolean
  avatar?: string
  phone?: string
  address?: string
  birthDate?: string
  bio?: string
  createdAt?: string
  updatedAt?: string
  sessionId?: string
  barbershop?: {
    id?: string
    name?: string
    slug?: string | null
    logo?: string | null
    isActive?: boolean
    status?: string
    trialEndsAt?: string | null
  } | null
}

interface AuthContextType {
  user: User | null
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>
  register: (name: string, email: string, password: string, phone?: string, role?: string) => Promise<boolean>
  logout: () => void
  updateUser: (userData: Partial<User>) => void
  loading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

// Verifica localmente se o JWT ainda não expirou (mesma lógica do middleware)
function isTokenValid(token: string): boolean {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return false
    const payload = JSON.parse(atob(parts[1]))
    return !payload.exp || payload.exp * 1000 > Date.now()
  } catch {
    return false
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check for existing session on mount
    const token = localStorage.getItem('auth_token')
    const userData = localStorage.getItem('user_data')

    if (token && userData && isTokenValid(token)) {
      try {
        const parsedUser = JSON.parse(userData)
        setUser(parsedUser)
      } catch (error) {
        console.error('Error parsing user data:', error)
        localStorage.removeItem('auth_token')
        localStorage.removeItem('user_data')
      }
    } else if (token || userData) {
      // Token ausente/expirado ou dados corrompidos: não iniciar com sessão residual
      localStorage.removeItem('auth_token')
      localStorage.removeItem('user_data')
    }
    
    setLoading(false)
  }, [])

  // Canal de sincronização de sessão única em tempo real entre abas do mesmo navegador
  useEffect(() => {
    let bc: BroadcastChannel | null = null
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        bc = new BroadcastChannel('barbershop-auth-channel')
        bc.onmessage = (event) => {
          const data = event.data
          if (data?.type === 'NEW_LOGIN' && user && data.userId === user.id) {
            if (data.sessionId && user.sessionId && data.sessionId !== user.sessionId) {
              // Outra sessão assumiu a conta
              localStorage.removeItem('auth_token')
              localStorage.removeItem('user_data')
              setUser(null)
              alert('Sua sessão foi encerrada porque um novo login foi realizado nesta conta.')
              window.location.href = '/login'
            }
          }
        }
      }
    } catch {
      // Ignora erro se BroadcastChannel não estiver disponível
    }

    return () => {
      if (bc) bc.close()
    }
  }, [user])

  // Verificação periódica e ao focar a aba para detectar se a sessão foi invalidada por outro dispositivo
  useEffect(() => {
    if (!user) return

    const verifyActiveSession = async () => {
      try {
        const token = localStorage.getItem('auth_token')
        if (!token) return

        const res = await fetch('/api/auth/session', {
          headers: { Authorization: `Bearer ${token}` },
          credentials: 'include',
        })

        if (res.status === 401) {
          const data = await res.json().catch(() => ({}))
          if (data.reason === 'SESSION_SUPERSEDED') {
            localStorage.removeItem('auth_token')
            localStorage.removeItem('user_data')
            setUser(null)
            alert('Sua sessão foi encerrada porque outro login foi realizado nesta conta.')
            window.location.href = '/login'
          }
        }
      } catch {
        // Falha silenciosa de rede
      }
    }

    window.addEventListener('focus', verifyActiveSession)
    const interval = setInterval(verifyActiveSession, 25000)

    return () => {
      window.removeEventListener('focus', verifyActiveSession)
      clearInterval(interval)
    }
  }, [user])

  const notifyNewSession = (userId: string, sessionId?: string) => {
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window && sessionId) {
        const bc = new BroadcastChannel('barbershop-auth-channel')
        bc.postMessage({
          type: 'NEW_LOGIN',
          userId,
          sessionId,
        })
        bc.close()
      }
    } catch {
      // Ignora
    }
  }

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      setLoading(true)
      
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      })

      const data = await response.json().catch(() => ({}))

      if (!response.ok) {
        const errorMessage = data.error || data.message || 'Email ou senha incorretos'
        return { success: false, error: errorMessage }
      }
      
      // Store token and user data
      localStorage.setItem('auth_token', data.token)
      localStorage.setItem('user_data', JSON.stringify(data.user))
      setUser(data.user)

      // Notifica outras abas para desconectar
      notifyNewSession(data.user.id, data.user.sessionId)
      
      return { success: true }
    } catch (error: any) {
      console.error('Login error:', error)
      return { success: false, error: error?.message || 'Erro de conexão' }
    } finally {
      setLoading(false)
    }
  }

  const register = async (name: string, email: string, password: string, phone?: string, role?: string): Promise<boolean> => {
    try {
      setLoading(true)
      
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, email, password, phone, role }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Registration failed')
      }

      const data = await response.json()
      
      // Store token and user data
      localStorage.setItem('auth_token', data.token)
      localStorage.setItem('user_data', JSON.stringify(data.user))
      setUser(data.user)

      notifyNewSession(data.user.id, data.user.sessionId)
      
      return true
    } catch (error) {
      console.error('Registration error:', error)
      return false
    } finally {
      setLoading(false)
    }
  }

  const logout = useCallback(async () => {
    setUser(null)
    setLoading(false)

    // Clear localStorage
    localStorage.removeItem('auth_token')
    localStorage.removeItem('user_data')

    // O cookie 'auth-token' é httpOnly (não pode mais ser limpo via
    // document.cookie), então o servidor precisa limpá-lo. Aguardamos a
    // resposta antes de navegar para garantir que o cookie já foi limpo.
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
    } catch {
      // Se a chamada falhar, ainda assim seguimos com o redirect local
    }

    // Force redirect to clear any residual state
    if (typeof window !== 'undefined') {
      window.location.href = '/login'
    }
  }, [])

  // Logout automático por inatividade (somente com usuário autenticado)
  useIdleLogout(logout, !!user, IDLE_TIMEOUT_MS)

  const updateUser = (userData: Partial<User>) => {
    setUser(prev => {
      if (!prev) return prev
      const updatedUser = { ...prev, ...userData }
      // Atualizar localStorage também
      localStorage.setItem('user_data', JSON.stringify(updatedUser))
      return updatedUser
    })
  }

  return (
    <AuthContext.Provider value={{ user, login, register, logout, updateUser, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
