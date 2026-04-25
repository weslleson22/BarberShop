'use client'

import { DollarSign, TrendingUp, TrendingDown, ArrowUp, ArrowDown } from 'lucide-react'

interface FinanceItem {
  title: string
  value: string
  change: number
  changeType: 'increase' | 'decrease'
  icon: any
  color: string
}

export default function FinanceSummary() {
  const financeData: FinanceItem[] = [
    {
      title: 'Receitas',
      value: 'R$ 12.450',
      change: 15.3,
      changeType: 'increase',
      icon: DollarSign,
      color: 'from-green-500 to-green-600'
    },
    {
      title: 'Despesas',
      value: 'R$ 3.280',
      change: -5.2,
      changeType: 'decrease',
      icon: TrendingDown,
      color: 'from-red-500 to-red-600'
    },
    {
      title: 'Lucro Líquido',
      value: 'R$ 9.170',
      change: 23.8,
      changeType: 'increase',
      icon: TrendingUp,
      color: 'from-blue-500 to-blue-600'
    },
    {
      title: 'Margem %',
      value: '73.7%',
      change: 8.1,
      changeType: 'increase',
      icon: ArrowUp,
      color: 'from-purple-500 to-purple-600'
    }
  ]

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
