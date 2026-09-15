'use client'

import { ReactNode } from 'react'
import { useAuth } from '@/lib/auth-context'
import type { UserRole } from '@/lib/roles'

interface RoleGuardProps {
  allow: UserRole[]
  children: ReactNode
  fallback?: ReactNode
}

// Mostra/esconde um trecho de UI conforme a role do usuário logado — para
// botões de ação, seções de formulário, itens de lista, etc. Isso é só
// experiência de navegação: a permissão de verdade é sempre validada de
// novo no backend (ver lib/api-auth.ts), nunca só aqui.
export function RoleGuard({ allow, children, fallback = null }: RoleGuardProps) {
  const { user } = useAuth()

  if (!user || !allow.includes(user.role)) {
    return <>{fallback}</>
  }

  return <>{children}</>
}

// Atalho para o caso mais comum: "isto é só pro ADMIN"
export function AdminOnly({ children, fallback = null }: { children: ReactNode; fallback?: ReactNode }) {
  return (
    <RoleGuard allow={['ADMIN']} fallback={fallback}>
      {children}
    </RoleGuard>
  )
}
