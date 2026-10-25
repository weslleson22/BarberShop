'use client'

import React, { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import DropdownHeader from '@/components/shared/DropdownHeader'
import DashboardOnboardingPage from '@/app/dashboard/onboarding/page'

export default function OnboardingRoutePage() {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.replace('/login?redirect=/onboarding')
        return
      }
      if (user.role === 'DEVELOPER') {
        router.replace('/developer/onboarding')
      }
    }
  }, [user, loading, router])

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center text-foreground pb-20 pt-20">
        <DropdownHeader />
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
      </div>
    )
  }

  if (user?.role === 'DEVELOPER') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center text-foreground pb-20 pt-20">
        <DropdownHeader />
        <div className="text-center space-y-3">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent mx-auto" />
          <p className="text-muted-foreground font-normal text-sm">Carregando Cockpit de Onboarding do Desenvolvedor...</p>
        </div>
      </div>
    )
  }

  return <DashboardOnboardingPage />
}
