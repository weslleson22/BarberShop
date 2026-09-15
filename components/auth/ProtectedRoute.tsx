'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import type { UserRole } from '@/lib/roles'

interface ProtectedRouteProps {
  allow: UserRole[]
  children: React.ReactNode
}

// Padrão único para "esta página só é para estas roles" no lado do cliente.
// O middleware (middleware.ts) já bloqueia o carregamento da página no
// servidor — este componente cobre a navegação client-side (ex.: troca de
// rota via next/link, sem passar pelo middleware de novo) e mostra um
// estado de carregamento em vez de piscar conteúdo indevido.
export function ProtectedRoute({ allow, children }: ProtectedRouteProps) {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (loading) return

    if (!user) {
      router.push('/login')
      return
    }

    if (!allow.includes(user.role)) {
      router.push('/dashboard')
    }
  }, [user, loading, allow, router])

  if (loading || !user || !allow.includes(user.role)) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-950 via-blue-950 to-black">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-yellow-400" />
      </div>
    )
  }

  return <>{children}</>
}
