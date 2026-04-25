'use client'

import { Calendar, Users, DollarSign, TrendingUp, Clock, BarChart3, Settings, Menu } from 'lucide-react'

export default function DashboardPreview() {
  return (
    <div className="relative mx-auto max-w-6xl">
      {/* Main Dashboard Card */}
      <div className="bg-gradient-to-br from-gray-900/90 to-black/90 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex">
          {/* Sidebar */}
          <div className="w-64 bg-black/50 border-r border-white/10 p-4">
            <div className="space-y-2">
              <div className="flex items-center space-x-3 p-3 rounded-lg bg-gradient-to-r from-yellow-400/20 to-yellow-600/20 border border-yellow-400/30">
                <BarChart3 className="w-5 h-5 text-yellow-400" />
                <span className="text-yellow-400 font-medium">Dashboard</span>
              </div>
              <div className="flex items-center space-x-3 p-3 rounded-lg hover:bg-white/5 transition-colors cursor-pointer">
                <Calendar className="w-5 h-5 text-white/60" />
                <span className="text-white/60">Agenda</span>
              </div>
              <div className="flex items-center space-x-3 p-3 rounded-lg hover:bg-white/5 transition-colors cursor-pointer">
                <Users className="w-5 h-5 text-white/60" />
                <span className="text-white/60">Clientes</span>
              </div>
              <div className="flex items-center space-x-3 p-3 rounded-lg hover:bg-white/5 transition-colors cursor-pointer">
                <Settings className="w-5 h-5 text-white/60" />
                <span className="text-white/60">Serviços</span>
              </div>
              <div className="flex items-center space-x-3 p-3 rounded-lg hover:bg-white/5 transition-colors cursor-pointer">
                <Users className="w-5 h-5 text-white/60" />
                <span className="text-white/60">Equipe</span>
              </div>
              <div className="flex items-center space-x-3 p-3 rounded-lg hover:bg-white/5 transition-colors cursor-pointer">
                <DollarSign className="w-5 h-5 text-white/60" />
                <span className="text-white/60">Financeiro</span>
              </div>
              <div className="flex items-center space-x-3 p-3 rounded-lg hover:bg-white/5 transition-colors cursor-pointer">
                <TrendingUp className="w-5 h-5 text-white/60" />
                <span className="text-white/60">Relatórios</span>
              </div>
              <div className="flex items-center space-x-3 p-3 rounded-lg hover:bg-white/5 transition-colors cursor-pointer">
                <Settings className="w-5 h-5 text-white/60" />
                <span className="text-white/60">Configurações</span>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-2xl font-bold text-white">Dashboard</h3>
                <p className="text-white/60">Bem-vindo de volta, João</p>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full"></div>
              </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-gradient-to-br from-blue-500/20 to-blue-600/20 border border-blue-500/30 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <Calendar className="w-5 h-5 text-blue-400" />
                  <span className="text-xs text-blue-400">Hoje</span>
                </div>
                <p className="text-2xl font-bold text-white">12</p>
                <p className="text-xs text-white/60">Agendamentos</p>
              </div>
              <div className="bg-gradient-to-br from-green-500/20 to-green-600/20 border border-green-500/30 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <DollarSign className="w-5 h-5 text-green-400" />
                  <span className="text-xs text-green-400">Hoje</span>
                </div>
                <p className="text-2xl font-bold text-white">R$ 2.450</p>
                <p className="text-xs text-white/60">Faturamento</p>
              </div>
              <div className="bg-gradient-to-br from-purple-500/20 to-purple-600/20 border border-purple-500/30 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <Users className="w-5 h-5 text-purple-400" />
                  <span className="text-xs text-purple-400">Total</span>
                </div>
                <p className="text-2xl font-bold text-white">186</p>
                <p className="text-xs text-white/60">Clientes</p>
              </div>
            </div>

            {/* Appointments Table */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-4 mb-6">
              <h4 className="text-white font-medium mb-4">Próximos Agendamentos</h4>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-blue-500/20 rounded-full flex items-center justify-center">
                      <Users className="w-4 h-4 text-blue-400" />
                    </div>
                    <div>
                      <p className="text-white text-sm">Carlos Silva</p>
                      <p className="text-white/60 text-xs">Corte + Barba</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-white text-sm">14:30</p>
                    <p className="text-green-400 text-xs">Confirmado</p>
                  </div>
                </div>
                <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-purple-500/20 rounded-full flex items-center justify-center">
                      <Users className="w-4 h-4 text-purple-400" />
                    </div>
                    <div>
                      <p className="text-white text-sm">Maria Santos</p>
                      <p className="text-white/60 text-xs">Progressiva</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-white text-sm">15:45</p>
                    <p className="text-yellow-400 text-xs">Pendente</p>
                  </div>
                </div>
                <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-green-500/20 rounded-full flex items-center justify-center">
                      <Users className="w-4 h-4 text-green-400" />
                    </div>
                    <div>
                      <p className="text-white text-sm">João Oliveira</p>
                      <p className="text-white/60 text-xs">Barba</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-white text-sm">16:00</p>
                    <p className="text-green-400 text-xs">Confirmado</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Revenue Chart */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-4">
              <h4 className="text-white font-medium mb-4">Receita Mensal</h4>
              <div className="flex items-end space-x-2 h-32">
                <div className="w-8 bg-gradient-to-t from-yellow-400/40 to-yellow-400 rounded-t" style={{height: '60%'}}></div>
                <div className="w-8 bg-gradient-to-t from-yellow-400/40 to-yellow-400 rounded-t" style={{height: '80%'}}></div>
                <div className="w-8 bg-gradient-to-t from-yellow-400/40 to-yellow-400 rounded-t" style={{height: '45%'}}></div>
                <div className="w-8 bg-gradient-to-t from-yellow-400/40 to-yellow-400 rounded-t" style={{height: '90%'}}></div>
                <div className="w-8 bg-gradient-to-t from-yellow-400/40 to-yellow-400 rounded-t" style={{height: '70%'}}></div>
                <div className="w-8 bg-gradient-to-t from-yellow-400/40 to-yellow-400 rounded-t" style={{height: '85%'}}></div>
                <div className="w-8 bg-gradient-to-t from-yellow-400/60 to-yellow-500 rounded-t" style={{height: '100%'}}></div>
              </div>
              <div className="flex justify-between mt-2 text-xs text-white/40">
                <span>Seg</span>
                <span>Ter</span>
                <span>Qua</span>
                <span>Qui</span>
                <span>Sex</span>
                <span>Sáb</span>
                <span>Dom</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Glow Effect */}
      <div className="absolute inset-0 bg-gradient-to-r from-yellow-400/10 to-transparent blur-3xl -z-10"></div>
    </div>
  )
}
