'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth-context'
import { useRouter } from 'next/navigation'
import { Calendar, Users, Clock, DollarSign, TrendingUp, UserCheck, Scissors, PieChart } from 'lucide-react'
import AppSidebar from '@/components/dashboard/AppSidebar'
import DashboardHeader from '@/components/dashboard/DashboardHeader'
import StatsCards from '@/components/dashboard/StatsCards'
import RevenueChart from '@/components/dashboard/RevenueChart'
import TodayAppointments from '@/components/dashboard/TodayAppointments'
import PopularServices from '@/components/dashboard/PopularServices'
import FinanceSummary from '@/components/dashboard/FinanceSummary'
import RecentClients from '@/components/dashboard/RecentClients'

interface DashboardStats {
  todayAppointments: number
  todayRevenue: number
  totalClients: number
  totalServices: number
  totalUsers: number
}

interface Appointment {
  id: string
  client: { name: string; phone: string }
  service: { name: string; price: number }
  startTime: string
  status: string
}

export default function DashboardPage() {
  const { user, loading: authLoading, logout } = useAuth()
  const router = useRouter()
  const [stats, setStats] = useState<DashboardStats>({
    todayAppointments: 0,
    todayRevenue: 0,
    totalClients: 0,
    totalServices: 0,
    totalUsers: 0
  })
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value)
  }

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  useEffect(() => {
    console.log('=== CARREGANDO DASHBOARD COM DADOS DO PRISMA ===')
    fetchDashboardData()
  }, [])

  // Aguardar carregamento inicial do contexto
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

  // Controlar visibilidade das ações do dashboard
  const canManageUsers = user?.role === 'ADMIN'
  const canManageServices = user?.role === 'ADMIN' || user?.role === 'BARBER'

  const fetchDashboardData = async () => {
    try {
      console.log('=== INICIANDO BUSCA OTIMIZADA DE DADOS DO PRISMA ===')
      const startTime = performance.now()
      
      // Timeout de 5 segundos para cada chamada
      const TIMEOUT = 5000
      
      // Função auxiliar com timeout
      const fetchWithTimeout = async (url: string, timeout: number) => {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), timeout)
        
        try {
          const response = await fetch(url, { 
            signal: controller.signal,
            headers: { 'Cache-Control': 'no-cache' }
          })
          clearTimeout(timeoutId)
          return response
        } catch (error) {
          clearTimeout(timeoutId)
          throw error
        }
      }
      
      // Chamadas paralelas para melhor performance
      console.log('Fazendo chamadas paralelas às APIs...')
      const parallelStartTime = performance.now()
      
      const [
        appointmentsResponse,
        clientsResponse, 
        servicesResponse,
        usersResponse
      ] = await Promise.allSettled([
        fetchWithTimeout('/api/appointments/public', TIMEOUT),
        fetchWithTimeout('/api/clients/all', TIMEOUT),
        fetchWithTimeout('/api/services/public', TIMEOUT),
        fetchWithTimeout('/api/users', TIMEOUT)
      ])
      
      const parallelEndTime = performance.now()
      console.log(`Tempo das chamadas paralelas: ${(parallelEndTime - parallelStartTime).toFixed(2)}ms`)
      
      // Processar resultados
      let appointmentsData: Appointment[] = []
      let todayRevenue = 0
      let todayAppointments = 0
      let totalClients = 0
      let totalServices = 0
      let totalUsers = 0
      
      // Processar agendamentos
      if (appointmentsResponse.status === 'fulfilled') {
        const response = appointmentsResponse.value
        if (response.ok) {
          appointmentsData = await response.json()
          console.log('Agendamentos recebidos do Prisma:', appointmentsData.length)
          
          // Calcular métricas do dia
          const today = new Date().toDateString()
          appointmentsData.forEach(apt => {
            const aptDate = new Date(apt.startTime).toDateString()
            if (aptDate === today) {
              todayAppointments++
              todayRevenue += apt.service.price
            }
          })
        }
      } else {
        console.warn('API de agendamentos falhou:', appointmentsResponse.reason)
      }
      
      // Processar clientes
      if (clientsResponse.status === 'fulfilled') {
        const response = clientsResponse.value
        if (response.ok) {
          const clientsData = await response.json()
          totalClients = clientsData.length
          console.log('Clientes recebidos do Prisma:', totalClients)
        }
      } else {
        console.warn('API de clientes falhou:', clientsResponse.reason)
      }
      
      // Processar serviços
      if (servicesResponse.status === 'fulfilled') {
        const response = servicesResponse.value
        if (response.ok) {
          const servicesData = await response.json()
          totalServices = servicesData.length
          console.log('Serviços recebidos do Prisma:', totalServices)
        }
      } else {
        console.warn('API de serviços falhou:', servicesResponse.reason)
      }
      
      // Processar usuários
      if (usersResponse.status === 'fulfilled') {
        const response = usersResponse.value
        if (response.ok) {
          const usersData = await response.json()
          totalUsers = usersData.length
          console.log('Usuários recebidos do Prisma:', totalUsers)
        }
      } else {
        console.warn('API de usuários falhou:', usersResponse.reason)
      }
      
      // Atualizar estado com dados reais do Prisma
      setStats({
        todayAppointments,
        todayRevenue,
        totalClients,
        totalServices,
        totalUsers
      })

      setAppointments(appointmentsData)
      
      const endTime = performance.now()
      console.log(`=== DASHBOARD CARREGADO EM ${(endTime - startTime).toFixed(2)}ms ===`)
      console.log('Stats:', { todayAppointments, todayRevenue, totalClients, totalServices, totalUsers })
      
      // Identificar gargalos
      if (endTime - startTime > 3000) {
        console.warn('DASHBOARD DEMOROU MAIS DE 3 SEGUNDOS - POSSÍVEL GARGALO!')
      }
      
    } catch (error) {
      console.error('Erro crítico ao buscar dados do Prisma:', error)
      // Em caso de erro, mostrar dados vazios para não quebrar a UI
      setStats({
        todayAppointments: 0,
        todayRevenue: 0,
        totalClients: 0,
        totalServices: 0,
        totalUsers: 0
      })
      setAppointments([])
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="flex flex-col items-center justify-center min-h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600 text-lg">Carregando dados do Prisma...</p>
          <p className="text-gray-400 text-sm mt-2">Buscando métricas em tempo real</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-black to-gray-900">
      <AppSidebar />
      
      <div className="lg:pl-80">
        <DashboardHeader />
        
        <div className="p-6">
          {/* KPI Cards */}
          <div className="mb-8">
            <StatsCards />
          </div>

          {/* Main Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            {/* Revenue Chart - 2 columns */}
            <div className="lg:col-span-2">
              <RevenueChart />
            </div>
            
            {/* Today Appointments - 1 column */}
            <div>
              <TodayAppointments />
            </div>
          </div>

          {/* Second Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            {/* Popular Services */}
            <div>
              <PopularServices />
            </div>
            
            {/* Recent Clients */}
            <div>
              <RecentClients />
            </div>
            
            {/* Finance Summary */}
            <div>
              <FinanceSummary />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
