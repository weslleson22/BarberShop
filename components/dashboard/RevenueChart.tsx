'use client'

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts'
import NoSSR from './NoSSR'

const data = [
  { name: 'Seg', value: 4000 },
  { name: 'Ter', value: 3000 },
  { name: 'Qua', value: 5000 },
  { name: 'Qui', value: 2780 },
  { name: 'Sex', value: 6890 },
  { name: 'Sáb', value: 7390 },
  { name: 'Dom', value: 5490 }
]

export default function RevenueChart() {
  return (
    <div className="bg-gradient-to-br from-gray-800/50 to-black/50 border border-white/6 rounded-2xl p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-xl font-semibold text-white">Faturamento</h3>
          <p className="text-white/60 text-sm">Receita dos últimos 7 dias</p>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 bg-green-500 rounded-full"></div>
          <span className="text-white/60 text-sm">R$ 34.550</span>
        </div>
      </div>
      
      <div className="h-64">
        <NoSSR fallback={<div className="flex items-center justify-center h-full text-white/60">Carregando gráfico...</div>}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <defs>
                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#D4AF37" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#D4AF37" stopOpacity={0.1}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis 
                dataKey="name" 
                stroke="rgba(255,255,255,0.3)"
                fontSize={12}
              />
              <YAxis 
                stroke="rgba(255,255,255,0.3)"
                fontSize={12}
                tickFormatter={(value) => `R$ ${(value/1000)}k`}
              />
              <Tooltip 
                contentStyle={{
                  backgroundColor: 'rgba(13, 19, 36, 0.9)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '8px',
                  color: '#fff'
                }}
                formatter={(value: any) => [`R$ ${value.toLocaleString('pt-BR')}`, 'Receita']}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke="#D4AF37"
                strokeWidth={2}
                fill="url(#colorRevenue)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </NoSSR>
      </div>
    </div>
  )
}
