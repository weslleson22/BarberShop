'use client'

import { useState, useEffect } from 'react'
import { DollarSign, TrendingUp, TrendingDown, ArrowUp, ArrowDown, Calendar } from 'lucide-react'

interface FinanceItem {
  title: string
  value: string
  change: number
  changeType: 'increase' | 'decrease'
  icon: any
  color: string
}

export default function FinanceSummary() {
  const [financeData, setFinanceData] = useState<FinanceItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchFinanceData()
  }, [])

  const fetchFinanceData = async () => {
    try {
      console.log('=== BUSCANDO DADOS FINANCEIROS ===')
      
      // Get current month
      const now = new Date()
      const currentMonth = now.getMonth()
      const currentYear = now.getFullYear()
      
      console.log('Mês atual:', currentMonth + 1, 'Ano:', currentYear)
      
      // Fetch all appointments
      const response = await fetch('/api/appointments/public')
      const allAppointments = await response.json()
      
      console.log('Total de agendamentos:', allAppointments.length)
      
      // Filter appointments for current month
      const currentMonthAppointments = allAppointments.filter((apt: any) => {
        const aptDate = new Date(apt.startTime)
        return aptDate.getMonth() === currentMonth && aptDate.getFullYear() === currentYear
      })
      
      console.log('Agendamentos do mês:', currentMonthAppointments.length)
      
      // Calculate revenue from completed appointments
      const completedAppointments = currentMonthAppointments.filter((apt: any) => apt.status === 'COMPLETED')
      const totalRevenue = completedAppointments.reduce((sum: number, apt: any) => {
        return sum + (apt.totalAmount || 0)
      }, 0)
      
      console.log('Receita total:', totalRevenue)
      
      // Calculate previous month for comparison
      const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1
      const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear
      
      const prevMonthAppointments = allAppointments.filter((apt: any) => {
        const aptDate = new Date(apt.startTime)
        return aptDate.getMonth() === prevMonth && aptDate.getFullYear() === prevYear
      })
      
      const prevCompletedAppointments = prevMonthAppointments.filter((apt: any) => apt.status === 'COMPLETED')
      const prevRevenue = prevCompletedAppointments.reduce((sum: number, apt: any) => {
        return sum + (apt.totalAmount || 0)
      }, 0)
      
      console.log('Receita mês anterior:', prevRevenue)
      
      // Calculate percentage change
      const revenueChange = prevRevenue > 0 ? ((totalRevenue - prevRevenue) / prevRevenue) * 100 : 0
      
      // Format currency
      const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('pt-BR', {
          style: 'currency',
          currency: 'BRL',
        }).format(value)
      }
      
      const data: FinanceItem[] = [
        {
          title: 'Receitas',
          value: formatCurrency(totalRevenue),
          change: Math.round(revenueChange * 10) / 10,
          changeType: revenueChange >= 0 ? 'increase' : 'decrease',
          icon: DollarSign,
          color: 'from-green-500 to-green-600'
        },
        {
          title: 'Atendimentos',
          value: completedAppointments.length.toString(),
          change: prevCompletedAppointments.length > 0 ? 
            Math.round(((completedAppointments.length - prevCompletedAppointments.length) / prevCompletedAppointments.length) * 100) : 0,
          changeType: completedAppointments.length >= prevCompletedAppointments.length ? 'increase' : 'decrease',
          icon: Calendar,
          color: 'from-blue-500 to-blue-600'
        },
        {
          title: 'Ticket Médio',
          value: formatCurrency(completedAppointments.length > 0 ? totalRevenue / completedAppointments.length : 0),
          change: 0, // Would need more complex calculation for previous month
          changeType: 'increase',
          icon: TrendingUp,
          color: 'from-purple-500 to-purple-600'
        }
      ]
      
      console.log('Dados financeiros processados:', data)
      setFinanceData(data)
      
    } catch (error) {
      console.error('Erro ao buscar dados financeiros:', error)
      setFinanceData([])
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="bg-gradient-to-br from-gray-800/50 to-black/50 border border-white/6 rounded-2xl p-6">
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-yellow-400"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-gradient-to-br from-gray-800/50 to-black/50 border border-white/6 rounded-2xl p-6">
      <div className="mb-6">
        <h3 className="text-xl font-semibold text-white">Resumo Financeiro</h3>
        <p className="text-white/60 text-sm">Mês atual</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {financeData.map((item, index) => {
          const Icon = item.icon
          const isPositive = item.changeType === 'increase'
          
          return (
            <div
              key={index}
              className="bg-white/5 border border-white/10 rounded-xl p-4"
            >
              <div className="flex items-center justify-between mb-2">
                <div className={`w-8 h-8 bg-gradient-to-br ${item.color} rounded-lg flex items-center justify-center`}>
                  <Icon className="w-4 h-4 text-white" />
                </div>
                <div className={`flex items-center space-x-1 px-2 py-0.5 rounded-md ${
                  isPositive 
                    ? 'bg-green-500/20 text-green-400' 
                    : 'bg-red-500/20 text-red-400'
                }`}>
                  {isPositive ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
                  <span className="text-xs font-medium">
                    {Math.abs(item.change)}%
                  </span>
                </div>
              </div>
              
              <div>
                <p className="text-white/60 text-xs mb-1">{item.title}</p>
                <p className="text-lg font-bold text-white">{item.value}</p>
              </div>
            </div>
          )
        })}
      </div>

      {/* Profit Margin Visual */}
      <div className="mt-6 pt-4 border-t border-white/6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-white/60 text-sm">Margem de Lucro</span>
          <span className="text-white font-semibold">73.7%</span>
        </div>
        <div className="w-full bg-white/10 rounded-full h-3">
          <div className="h-full bg-gradient-to-r from-green-500 to-green-600 rounded-full" style={{ width: '73.7%' }} />
        </div>
      </div>
    </div>
  )
}
