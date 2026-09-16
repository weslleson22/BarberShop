'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth-context'
import Link from 'next/link'
import { Calendar, Clock, Plus, ArrowRight } from 'lucide-react'
import DropdownHeader from '@/components/shared/DropdownHeader'
import StatsCards from '@/components/dashboard/StatsCards'
import RevenueChart from '@/components/dashboard/RevenueChart'
import TodayAppointments from '@/components/dashboard/TodayAppointments'
import PopularServices from '@/components/dashboard/PopularServices'
import FinanceSummary from '@/components/dashboard/FinanceSummary'
import RecentClients from '@/components/dashboard/RecentClients'

interface ClientAppointment {
  id: string
  startTime: string
  status: string
  service: { name: string; price: number }
  barber: { name: string }
}

function ClientDashboard() {
  const [appointments, setAppointments] = useState<ClientAppointment[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/appointments')
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setAppointments(Array.isArray(data) ? data : []))
      .catch(() => setAppointments([]))
      .finally(() => setLoading(false))
  }, [])

  const now = new Date()
  const upcoming = appointments
    .filter((a) => (a.status === 'PENDING' || a.status === 'CONFIRMED') && new Date(a.startTime) >= now)
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())[0]

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleString('pt-BR', { dateStyle: 'long', timeStyle: 'short' })

  return (
    <div className="min-h-screen overflow-x-hidden bg-gradient-to-br from-gray-950 via-blue-950 to-black pt-20">
      <DropdownHeader />

      <div className="w-full px-4 md:px-6 max-w-3xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">Início</h1>
          <p className="text-white/60 text-sm md:text-base">Seus próximos atendimentos</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-yellow-400" />
          </div>
        ) : (
          <>
            <div className="bg-gradient-to-br from-gray-800/50 to-black/50 border border-white/6 rounded-2xl p-6 mb-6">
              {upcoming ? (
                <>
                  <p className="text-white/60 text-sm mb-2">Próximo agendamento</p>
                  <p className="text-xl font-bold text-white mb-1">{upcoming.service.name}</p>
                  <div className="flex items-center gap-2 text-white/70 text-sm mb-1">
                    <Clock className="w-4 h-4" />
                    {formatDate(upcoming.startTime)}
                  </div>
                  <p className="text-white/70 text-sm">com {upcoming.barber.name}</p>
                </>
              ) : (
                <p className="text-white/60">Você não tem nenhum agendamento futuro.</p>
              )}
              <div className="flex flex-wrap gap-3 mt-4">
                <Link
                  href="/agendar"
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-yellow-400 to-yellow-600 text-black font-semibold rounded-xl hover:from-yellow-500 hover:to-yellow-700 transition-all"
                >
                  <Plus className="w-4 h-4" />
                  Agendar
                </Link>
                <Link
                  href="/meus-agendamentos"
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-white/5 border border-white/10 text-white font-medium rounded-xl hover:bg-white/10 transition-all"
                >
                  <Calendar className="w-4 h-4" />
                  Meus Agendamentos
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function StaffDashboard() {
  return (
    <div className="min-h-screen overflow-x-hidden bg-gradient-to-br from-gray-950 via-blue-950 to-black pt-20">
      <DropdownHeader />

      <div className="w-full px-4 md:px-6">
        <div className="mb-6 md:mb-8">
          <StatsCards />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
          <div className="lg:col-span-2">
            <RevenueChart />
          </div>
          <div>
            <TodayAppointments />
          </div>
          <div>
            <PopularServices />
          </div>
          <div>
            <RecentClients />
          </div>
          <div className="lg:col-span-2">
            <FinanceSummary />
          </div>
        </div>
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth()

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando...</p>
        </div>
      </div>
    )
  }

  if (user?.role === 'CLIENT') {
    return <ClientDashboard />
  }

  return <StaffDashboard />
}
