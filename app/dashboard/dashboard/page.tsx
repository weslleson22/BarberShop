'use client'

import { useState, useEffect } from 'react'
import { Calendar, DollarSign, Users, Clock, LogOut } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { useRouter } from 'next/navigation'

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
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-gray-600 mt-2">
              Bem-vindo(a), {user?.name}! 
              {user?.role === 'ADMIN' && ' Aqui está o resumo completo da sua barbearia.'}
              {user?.role === 'BARBER' && ' Aqui está sua agenda e informações do dia.'}
              {user?.role === 'CLIENT' && ' Aqui está seu perfil e agendamentos.'}
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-right">
              <p className="text-sm text-gray-500">Perfil</p>
              <p className="font-semibold text-gray-900">{user?.name}</p>
              <p className="text-sm text-blue-600">{user?.role}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <span className="text-blue-600 font-bold text-lg">
                {user?.name?.charAt(0)?.toUpperCase() || 'U'}
              </span>
            </div>
            <button
              onClick={logout}
              className="ml-4 p-2 bg-red-100 rounded-full hover:bg-red-200 transition-colors"
              title="Sair"
            >
              <LogOut className="w-5 h-5 text-red-600" />
            </button>
          </div>
        </div>
      </div>

      {/* Stats Cards - Personalizados por perfil */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Card de Agendamentos - visível para todos */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-3 bg-blue-100 rounded-full">
              <Calendar className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">
                {user?.role === 'CLIENT' ? 'Seus Agendamentos' : 'Agendamentos Hoje'}
              </p>
              <p className="text-2xl font-semibold text-gray-900">{stats.todayAppointments}</p>
            </div>
          </div>
        </div>

        {/* Card de Faturamento - apenas ADMIN */}
        {canManageUsers && (
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-3 bg-green-100 rounded-full">
                <DollarSign className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Faturamento Hoje</p>
                <p className="text-2xl font-semibold text-gray-900">{formatCurrency(stats.todayRevenue)}</p>
              </div>
            </div>
          </div>
        )}

        {/* Card de Clientes - ADMIN e BARBER */}
        {(canManageUsers || canManageServices) && (
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-3 bg-blue-100 rounded-full">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">
                  {user?.role === 'CLIENT' ? 'Seu Perfil' : 'Total de Clientes'}
                </p>
                <p className="text-2xl font-semibold text-gray-900">{stats.totalClients}</p>
              </div>
            </div>
          </div>
        )}

        {/* Card de Serviços - ADMIN e BARBER */}
        {canManageServices && (
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-3 bg-purple-100 rounded-full">
                <Clock className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total de Serviços</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.totalServices}</p>
              </div>
            </div>
          </div>
        )}

        {/* Card de Usuários - apenas ADMIN */}
        {canManageUsers && (
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-3 bg-orange-100 rounded-full">
                <Users className="h-6 w-6 text-orange-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total de Usuários</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.totalUsers}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Next Appointment Card */}
      {appointments.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Próximo Agendamento</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-gray-600">Cliente</p>
              <p className="font-medium">{appointments[0].client?.name}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Serviço</p>
              <p className="font-medium">{appointments[0].service?.name}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Horário</p>
              <p className="font-medium">
                {new Date(appointments[0].startTime).toLocaleString('pt-BR')}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Recent Appointments */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Agendamentos do Prisma</h2>
          <div className="space-y-4">
            {appointments.length > 0 ? (
              appointments.map((appointment) => (
                <div key={appointment.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <Calendar className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{appointment.client.name}</p>
                      <p className="text-sm text-gray-500">{appointment.client.phone}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-gray-900">{appointment.service.name}</p>
                    <p className="text-sm text-gray-500">{formatTime(appointment.startTime)}</p>
                    <p className="text-sm font-medium text-green-600">{formatCurrency(appointment.service.price)}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-500">Nenhum agendamento encontrado no Prisma</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <button
          onClick={() => window.location.href = '/agenda'}
          className="bg-blue-600 text-white px-4 py-3 rounded-lg hover:bg-blue-700 transition-colors"
        >
          Ver Agenda
        </button>
        <button
          onClick={() => window.location.href = '/agendar'}
          className="bg-red-600 text-white px-4 py-3 rounded-lg hover:bg-red-700 transition-colors"
        >
          Novo Agendamento
        </button>
        {canManageServices && (
          <button
            onClick={() => window.location.href = '/servicos'}
            className="bg-gray-600 text-white px-4 py-3 rounded-lg hover:bg-gray-700 transition-colors"
          >
            Gerenciar Serviços
          </button>
        )}
        {canManageUsers && (
          <button
            onClick={() => window.location.href = '/usuarios'}
            className="bg-purple-600 text-white px-4 py-3 rounded-lg hover:bg-purple-700 transition-colors"
          >
            Gerenciar Usuários
          </button>
        )}
      </div>
    </div>
  )
}
