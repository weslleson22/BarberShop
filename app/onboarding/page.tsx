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
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <DropdownHeader />
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-amber-400" />
      </div>
    )
  }

  if (user?.role === 'DEVELOPER') {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <DropdownHeader />
        <div className="text-center space-y-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-400 mx-auto" />
          <p className="text-slate-400 text-sm">Carregando Cockpit de Onboarding do Desenvolvedor...</p>
        </div>
      </div>
    )
  }

  return <DashboardOnboardingPage />
}
