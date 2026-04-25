'use client'

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'

interface User {
  id: string
  name: string
  email: string
  role: 'ADMIN' | 'BARBER' | 'CLIENT'
  barbershopId: string
  isActive: boolean
  avatar?: string
  phone?: string
  address?: string
  birthDate?: string
  bio?: string
}

interface AuthContextType {
  user: User | null
  login: (email: string, password: string) => Promise<boolean>
  register: (name: string, email: string, password: string, phone?: string, role?: string) => Promise<boolean>
  logout: () => void
  updateUser: (userData: Partial<User>) => void
  loading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check for existing session on mount
    const token = localStorage.getItem('auth_token')
    const userData = localStorage.getItem('user_data')
    const userAvatar = localStorage.getItem('userAvatar')
    
    if (token && userData) {
      try {
        const parsedUser = JSON.parse(userData)
        // Se houver avatar salvo separadamente, adiciona ao usuário
        if (userAvatar && !parsedUser.avatar) {
          parsedUser.avatar = userAvatar
        }
        setUser(parsedUser)
      } catch (error) {
        console.error('Error parsing user data:', error)
        localStorage.removeItem('auth_token')
        localStorage.removeItem('user_data')
        localStorage.removeItem('userAvatar')
      }
    }
    
    setLoading(false)
  }, [])

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      setLoading(true)
      
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Login failed')
      }

      const data = await response.json()
      
      // Store token and user data
      localStorage.setItem('auth_token', data.token)
      localStorage.setItem('user_data', JSON.stringify(data.user))
      setUser(data.user)
      
      return true
    } catch (error) {
      console.error('Login error:', error)
      return false
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
      
      return true
    } catch (error) {
      console.error('Registration error:', error)
      return false
    } finally {
      setLoading(false)
    }
  }

  const logout = () => {
    setUser(null)
    setLoading(false)
    
    // Clear localStorage
    localStorage.removeItem('auth_token')
    localStorage.removeItem('user_data')
    localStorage.removeItem('userAvatar')
    
    // Clear auth cookies
    document.cookie = 'auth-token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;'
    document.cookie = 'user=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;'
    
    // Force redirect to clear any residual state
    if (typeof window !== 'undefined') {
      window.location.href = '/'
    }
  }

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
