'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth-context'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Calendar, Users, DollarSign, Clock, TrendingUp, TrendingDown } from 'lucide-react'

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

export default function NewDashboardPage() {
  const { user, loading: authLoading } = useAuth()
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

  const fetchDashboardData = async () => {
    try {
      const parseJson = async (res: Response): Promise<any[]> => {
        if (!res.ok) return []
        const data = await res.json().catch(() => [])
        return Array.isArray(data) ? data : []
      }

      const [appointmentsRes, clientsRes, servicesRes, usersRes] = await Promise.allSettled([
        fetch('/api/appointments/public').then(parseJson),
        fetch('/api/clients/all').then(parseJson),
        fetch('/api/services/public').then(parseJson),
        fetch('/api/users').then(parseJson)
      ])

      const appointmentsData: any[] = appointmentsRes.status === 'fulfilled' ? appointmentsRes.value : []
      const clientsData: any[] = clientsRes.status === 'fulfilled' ? clientsRes.value : []
      const servicesData: any[] = servicesRes.status === 'fulfilled' ? servicesRes.value : []
      const usersData: any[] = usersRes.status === 'fulfilled' ? usersRes.value : []

      // Calculate stats based on user role
      const today = new Date().toISOString().split('T')[0]
      const todayAppointments = appointmentsData.filter((apt: any) =>
        apt.startTime?.startsWith(today)
      ).length

      const todayRevenue = appointmentsData
        .filter((apt: any) => apt.status === 'COMPLETED' && apt.startTime?.startsWith(today))
        .reduce((sum: number, apt: any) => sum + (apt.totalAmount || 0), 0)

      setStats({
        todayAppointments,
        todayRevenue,
        totalClients: clientsData.length,
        totalServices: servicesData.length,
        totalUsers: usersData.length
      })

      setAppointments(appointmentsData.slice(0, 5)) // Show recent 5 appointments
    } catch (error) {
      console.error('Dashboard data fetch error:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (user) {
      fetchDashboardData()
    }
  }, [user])

  if (authLoading || loading) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="flex flex-col items-center justify-center min-h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600 text-lg">Carregando dashboard...</p>
        </div>
      </div>
    )
  }

  const canManageUsers = user?.role === 'ADMIN'
  const canManageServices = user?.role === 'ADMIN' || user?.role === 'BARBER'
  const canViewFinancial = user?.role === 'ADMIN'

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-2">
          Bem-vindo(a), {user?.name}! 
          {user?.role === 'ADMIN' && ' Aqui está o resumo completo da sua barbearia.'}
          {user?.role === 'BARBER' && ' Aqui está sua agenda e informações do dia.'}
          {user?.role === 'CLIENT' && ' Aqui está seu perfil e agendamentos.'}
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Agendamentos Hoje</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.todayAppointments}</div>
            <p className="text-xs text-muted-foreground">Hoje</p>
          </CardContent>
        </Card>

        {canViewFinancial && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Faturamento Hoje</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(stats.todayRevenue)}</div>
              <p className="text-xs text-muted-foreground">Hoje</p>
            </CardContent>
          </Card>
        )}

        {canManageServices && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Clientes</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalClients}</div>
              <p className="text-xs text-muted-foreground">Total</p>
            </CardContent>
          </Card>
        )}

        {canManageServices && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Serviços</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalServices}</div>
              <p className="text-xs text-muted-foreground">Total</p>
            </CardContent>
          </Card>
        )}

        {canManageUsers && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Usuários</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalUsers}</div>
              <p className="text-xs text-muted-foreground">Total</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Recent Appointments */}
      <Card>
        <CardHeader>
          <CardTitle>Agendamentos Recentes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {appointments.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">Nenhum agendamento encontrado</p>
            ) : (
              <div className="space-y-3">
                {appointments.map((appointment) => (
                  <div key={appointment.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <Avatar className="h-10 w-10">
                          <AvatarFallback>
                            {appointment.client.name.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{appointment.client.name}</p>
                          <p className="text-sm text-muted-foreground">{appointment.client.phone}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{appointment.service.name}</p>
                        <p className="text-sm text-muted-foreground">{formatTime(appointment.startTime)}</p>
                        <Badge variant={appointment.status === 'COMPLETED' ? 'default' : 'secondary'}>
                          {appointment.status}
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
