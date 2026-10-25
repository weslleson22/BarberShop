'use client'

import { useState, useEffect } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts'
import NoSSR from './NoSSR'
import { getAuthHeaders } from '@/lib/utils'

interface RevenueData {
  name: string
  value: number
  date: string
}

export default function RevenueChart() {
  const [data, setData] = useState<RevenueData[]>([])
  const [loading, setLoading] = useState(true)
  const [totalRevenue, setTotalRevenue] = useState(0)

  useEffect(() => {
    const fetchRevenueData = async () => {
      try {
        const response = await fetch('/api/dashboard/revenue', {
          headers: getAuthHeaders(),
          credentials: 'include',
        })
        if (response.ok) {
          const revenueData = await response.json()
          setData(revenueData)
          
          // Calculate total revenue
          const total = revenueData.reduce((sum: number, item: RevenueData) => sum + item.value, 0)
          setTotalRevenue(total)
        }
      } catch (error) {
        console.error('Error fetching revenue data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchRevenueData()
  }, [])

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value)
  }

  return (
    <div className="bg-card border border-border rounded-xl md:rounded-2xl p-4 md:p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4 md:mb-6">
        <div>
          <h3 className="text-lg md:text-xl font-bold text-foreground tracking-tight">Faturamento</h3>
          <p className="text-muted-foreground text-xs md:text-sm font-medium">Receita dos últimos 7 dias</p>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-2.5 h-2.5 md:w-3 md:h-3 bg-emerald-500 rounded-full"></div>
          <span className="text-foreground font-semibold text-xs md:text-sm">{formatCurrency(totalRevenue)}</span>
        </div>
      </div>
      
      <div className="h-48 md:h-64">
        {loading ? (
          <div className="flex items-center justify-center h-full text-muted-foreground text-sm font-medium">Carregando dados...</div>
        ) : data.length === 0 ? (
          <div className="flex items-center justify-center h-full text-muted-foreground text-sm font-medium">Sem dados de faturamento</div>
        ) : (
          <NoSSR fallback={<div className="flex items-center justify-center h-full text-muted-foreground text-sm font-medium">Carregando gráfico...</div>}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#d97706" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#d97706" stopOpacity={0.0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-border" />
                <XAxis 
                  dataKey="name" 
                  stroke="currentColor"
                  className="text-muted-foreground"
                  fontSize={10}
                  tick={{ fontSize: 10 }}
                />
                <YAxis 
                  stroke="currentColor"
                  className="text-muted-foreground"
                  fontSize={10}
                  tick={{ fontSize: 10 }}
                  tickFormatter={(value) => `R$ ${(value/1000)}k`}
                />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    borderColor: 'hsl(var(--border))',
                    borderRadius: '8px',
                    color: 'hsl(var(--foreground))',
                    fontSize: '12px'
                  }}
                  formatter={(value: any) => [`R$ ${value.toLocaleString('pt-BR')}`, 'Receita']}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="#d97706"
                  strokeWidth={2}
                  fill="url(#colorRevenue)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </NoSSR>
        )}
      </div>
    </div>
  )
}
