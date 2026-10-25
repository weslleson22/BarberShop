'use client'

import { useState, useEffect } from 'react'
import { Calendar, Users, DollarSign, TrendingUp, ArrowUp, ArrowDown } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'

interface StatCard {
  title: string
  value: string
  change: number
  changeType: 'increase' | 'decrease'
  icon: any
  iconBg: string
  iconColor: string
}

interface DashboardStats {
  appointments: {
    total: number
    completed: number
    pending: number
    cancelled: number
    change: number
    changeType: 'increase' | 'decrease'
  }
  clients: {
    total: number
    newThisMonth: number
    change: number
    changeType: 'increase' | 'decrease'
  }
  revenue: {
    total: number
    thisMonth: number
    change: number
    changeType: 'increase' | 'decrease'
  }
  averageTicket: {
    value: number
    thisMonth: number
    change: number
    changeType: 'increase' | 'decrease'
  }
  services: {
    total: number
  }
  barbers: {
    total: number
  }
}

import { getAuthHeaders } from '@/lib/utils'

export default function StatsCards() {
  const { user } = useAuth()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/dashboard/stats', {
        headers: getAuthHeaders(),
        credentials: 'include',
      })
      if (response.ok) {
        const data = await response.json()
        console.log('Estatísticas do dashboard:', data)
        setStats(data)
      } else {
        console.error('Erro ao buscar estatísticas:', response.status)
      }
    } catch (error) {
      console.error('Error fetching stats:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value)
  }

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('pt-BR').format(value)
  }

  const formatPercent = (value: number) => {
    const num = Math.abs(Number(value) || 0)
    return new Intl.NumberFormat('pt-BR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 1,
    }).format(num) + '%'
  }

  // Role-based stats
  const getStatsForRole = () => {
    if (!stats) return []

    const userRole = user?.role
    const statCards: StatCard[] = []

    // Todos os roles veem agendamentos
    statCards.push({
      title: 'Agendamentos',
      value: formatNumber(stats.appointments.total),
      change: stats.appointments.change,
      changeType: stats.appointments.changeType,
      icon: Calendar,
      iconBg: 'bg-blue-500/10 border border-blue-500/20',
      iconColor: 'text-blue-500',
    })

    // ADMIN e BARBER veem clientes
    if (userRole === 'ADMIN' || userRole === 'BARBER') {
      statCards.push({
        title: 'Clientes',
        value: formatNumber(stats.clients.total),
        change: stats.clients.change,
        changeType: stats.clients.changeType,
        icon: Users,
        iconBg: 'bg-purple-500/10 border border-purple-500/20',
        iconColor: 'text-purple-500',
      })
    }

    // Apenas ADMIN veem faturamento
    if (userRole === 'ADMIN') {
      statCards.push({
        title: 'Faturamento',
        value: formatCurrency(stats.revenue.total),
        change: stats.revenue.change,
        changeType: stats.revenue.changeType,
        icon: DollarSign,
        iconBg: 'bg-emerald-500/10 border border-emerald-500/20',
        iconColor: 'text-emerald-500',
      })

      statCards.push({
        title: 'Ticket Médio',
        value: formatCurrency(stats.averageTicket.value),
        change: stats.averageTicket.change,
        changeType: stats.averageTicket.changeType,
        icon: TrendingUp,
        iconBg: 'bg-amber-500/10 border border-amber-500/20',
        iconColor: 'text-amber-500',
      })
    }

    // CLIENT veem apenas agendamentos
    if (userRole === 'CLIENT') {
      statCards.push({
        title: 'Seus Agendamentos',
        value: formatNumber(stats.appointments.total),
        change: stats.appointments.change,
        changeType: stats.appointments.changeType,
        icon: Calendar,
        iconBg: 'bg-blue-500/10 border border-blue-500/20',
        iconColor: 'text-blue-500',
      })
    }

    return statCards
  }

  const statCards = getStatsForRole()

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-card border border-border rounded-xl md:rounded-2xl p-4 md:p-6 animate-pulse shadow-sm">
            <div className="flex items-center justify-between mb-3 md:mb-4">
              <div className="w-10 h-10 md:w-12 md:h-12 bg-muted rounded-lg md:rounded-xl"></div>
              <div className="w-14 h-5 md:w-16 md:h-6 bg-muted rounded-lg"></div>
            </div>
            <div className="w-20 h-6 md:w-24 md:h-8 bg-muted rounded-lg mb-1 md:mb-2"></div>
            <div className="w-16 h-3 md:w-20 md:h-4 bg-muted rounded-lg"></div>
          </div>
        ))}
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="text-center py-8 md:py-12">
        <p className="text-muted-foreground text-sm md:text-base">Erro ao carregar estatísticas</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 min-w-0">
      {statCards.map((stat, index) => {
        const Icon = stat.icon
        const isPositive = stat.changeType === 'increase'
        
        return (
          <div
            key={index}
            className="bg-card border border-border rounded-xl md:rounded-2xl p-4 md:p-6 hover:shadow-md transition-all shadow-sm min-w-0 text-card-foreground"
          >
            <div className="flex items-start justify-between mb-3 md:mb-4">
              <div className={`w-10 h-10 md:w-12 md:h-12 ${stat.iconBg} rounded-lg md:rounded-xl flex items-center justify-center`}>
                <Icon className={`w-5 h-5 md:w-6 md:h-6 ${stat.iconColor}`} />
              </div>
              <div className={`flex items-center space-x-1 px-2 py-0.5 rounded-full text-xs font-semibold ${
                isPositive 
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20' 
                  : 'bg-destructive/10 text-destructive border border-destructive/20'
              }`}>
                {isPositive ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
                <span>
                  {formatPercent(stat.change)}
                </span>
              </div>
            </div>
            
            <div>
              <p className="text-muted-foreground text-xs md:text-sm mb-1 font-medium">{stat.title}</p>
              <p className="text-lg md:text-2xl font-bold text-foreground tracking-tight">{stat.value}</p>
              <p className="text-muted-foreground/70 text-xs mt-1">
                vs. semana anterior
              </p>
            </div>
          </div>
        )
      })}
    </div>
  )
}
