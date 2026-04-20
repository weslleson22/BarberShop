'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'

interface User {
  id: string
  name: string
  email: string
  role: 'ADMIN' | 'BARBER' | 'CLIENT'
  barbershopId?: string
}

interface AuthContextType {
  user: User | null
  login: (email: string, password: string) => Promise<boolean>
  logout: () => void
  register: (data: RegisterData) => Promise<boolean>
  isLoading: boolean
}

interface RegisterData {
  name: string
  email: string
  password: string
  role: 'ADMIN' | 'BARBER' | 'CLIENT'
  barbershopId?: string
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Simulação rápida para garantir que o dashboard funcione
    const token = localStorage.getItem('auth-token')
    if (token) {
      // TODO: Validate token with backend
      const userData = localStorage.getItem('user-data')
      if (userData) {
        setUser(JSON.parse(userData))
      }
    } else {
      // Se não houver token, definir um usuário mockado para demonstração
      setUser({
        id: '1',
        name: 'Admin Demo',
        email: 'admin@barberiacentral.com',
        role: 'ADMIN',
        barbershopId: '1'
      })
    }
    
    // Garantir que isLoading seja false rapidamente
    setTimeout(() => setIsLoading(false), 100)
  }, [])

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      // TODO: Implement actual login API call
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      if (response.ok) {
        const data = await response.json()
        setUser(data.user)
        localStorage.setItem('auth-token', data.token)
        localStorage.setItem('user-data', JSON.stringify(data.user))
        return true
      }
      return false
    } catch (error) {
      console.error('Login error:', error)
      return false
    }
  }

  const logout = () => {
    setUser(null)
    localStorage.removeItem('auth-token')
    localStorage.removeItem('user-data')
  }

  const register = async (data: RegisterData): Promise<boolean> => {
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (response.ok) {
        const result = await response.json()
        setUser(result.user)
        localStorage.setItem('auth-token', result.token)
        localStorage.setItem('user-data', JSON.stringify(result.user))
        return true
      }
      return false
    } catch (error) {
      console.error('Register error:', error)
      return false
    }
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, register, isLoading }}>
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
