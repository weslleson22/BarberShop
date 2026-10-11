'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import DropdownHeader from '@/components/shared/DropdownHeader'
import { useAuth } from '@/lib/auth-context'
import { getAuthHeaders } from '@/lib/utils'
import {
  CreditCard,
  DollarSign,
  TrendingUp,
  Calendar,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Receipt,
  Download,
  Building2,
  Users,
  Scissors
} from 'lucide-react'

interface DashboardStats {
  revenue?: {
    total: number
    thisMonth: number
    change: number
    changeType: 'increase' | 'decrease'
  }
  averageTicket?: {
    value: number
    thisMonth: number
  }
  appointments?: {
    total: number
    completed: number
  }
}

interface AppointmentItem {
  id: string
  startTime: string
  totalAmount: number
  status: string
  client?: { name: string; phone?: string }
  barber?: { name: string }
  service?: { name: string }
}

export default function FinanceiroPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()

  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [appointments, setAppointments] = useState<AppointmentItem[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/login')
    }
  }, [user, authLoading, router])

  const loadFinancialData = async () => {
    setLoading(true)
    try {
      const headers = getAuthHeaders()
      const [statsRes, aptsRes] = await Promise.all([
        fetch('/api/dashboard/stats', { headers, credentials: 'include' }),
        fetch('/api/appointments?limit=50', { headers, credentials: 'include' }),
      ])

      if (statsRes.ok) {
        const statsData = await statsRes.json()
        setStats(statsData)
      }

      if (aptsRes.ok) {
        const aptsData = await aptsRes.json()
        setAppointments(Array.isArray(aptsData) ? aptsData : aptsData.appointments || [])
      }
    } catch (err) {
      console.error('Erro ao carregar financeiro:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (user) {
      loadFinancialData()
    }
  }, [user])

  const formatPrice = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)
  }

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      })
    } catch {
      return '-'
    }
  }

  const filteredAppointments = appointments.filter((apt) => {
    if (statusFilter !== 'ALL' && apt.status !== statusFilter) return false
    if (!searchTerm.trim()) return true
    const q = searchTerm.toLowerCase().trim()
    const client = apt.client?.name?.toLowerCase() || ''
    const barber = apt.barber?.name?.toLowerCase() || ''
    const service = apt.service?.name?.toLowerCase() || ''
    return client.includes(q) || barber.includes(q) || service.includes(q)
  })

  return (
    <div className="min-h-screen bg-gray-950 text-foreground">
      <DropdownHeader />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Cabeçalho */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/40 pb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Caixa & Recebimentos
              </span>
              <span className="text-xs text-muted-foreground">• Gestão Operacional</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
              <CreditCard className="w-7 h-7 text-emerald-400" />
              Pagamentos & Fluxo de Caixa
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Acompanhe entradas financeiras, atendimentos concluídos e movimentação de caixa da sua barbearia.
            </p>
          </div>
        </div>

        {/* Métricas Principais */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-card/70 border border-border/60 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between text-muted-foreground text-xs mb-1">
              <span className="font-medium">Faturamento do Mês</span>
              <DollarSign className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-black text-white">
              {formatPrice(stats?.revenue?.thisMonth || 0)}
            </div>
            <div className="text-[11px] text-emerald-400 mt-1 flex items-center gap-1">
              <TrendingUp className="w-3 h-3" />
              <span>Receita líquida faturada</span>
            </div>
          </div>

          <div className="bg-card/70 border border-border/60 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between text-muted-foreground text-xs mb-1">
              <span className="font-medium">Ticket Médio</span>
              <Receipt className="w-4 h-4 text-blue-400" />
            </div>
            <div className="text-2xl font-black text-white">
              {formatPrice(stats?.averageTicket?.thisMonth || stats?.averageTicket?.value || 0)}
            </div>
            <div className="text-[11px] text-muted-foreground mt-1">Por atendimento realizado</div>
          </div>

          <div className="bg-card/70 border border-border/60 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between text-muted-foreground text-xs mb-1">
              <span className="font-medium">Atendimentos Concluídos</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-black text-emerald-400">
              {stats?.appointments?.completed || 0}
            </div>
            <div className="text-[11px] text-muted-foreground mt-1">
              De {stats?.appointments?.total || 0} agendados
            </div>
          </div>

          <div className="bg-card/70 border border-border/60 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between text-muted-foreground text-xs mb-1">
              <span className="font-medium">Receita Acumulada</span>
              <TrendingUp className="w-4 h-4 text-purple-400" />
            </div>
            <div className="text-2xl font-black text-white">
              {formatPrice(stats?.revenue?.total || 0)}
            </div>
            <div className="text-[11px] text-muted-foreground mt-1">Total histórico da barbearia</div>
          </div>
        </div>

        {/* Lançamentos & Movimentações */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Buscar cliente, barbeiro ou serviço..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-card border border-border rounded-xl pl-9 pr-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-card border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none"
              >
                <option value="ALL">Todos os Atendimentos</option>
                <option value="COMPLETED">Concluídos (Pagos)</option>
                <option value="CONFIRMED">Confirmados</option>
                <option value="PENDING">Pendentes</option>
                <option value="CANCELLED">Cancelados</option>
              </select>
            </div>
          </div>

          <div className="bg-card border border-border/70 rounded-2xl shadow-sm overflow-hidden">
            {loading ? (
              <div className="p-8 space-y-3">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-14 bg-muted/20 rounded-xl animate-pulse" />
                ))}
              </div>
            ) : filteredAppointments.length === 0 ? (
              <div className="text-center py-16 px-4">
                <Receipt className="w-10 h-10 text-muted-foreground/40 mx-auto mb-2" />
                <p className="text-sm font-semibold text-white">Nenhum lançamento encontrado</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Não foram encontrados lançamentos para os filtros selecionados.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-border/60 bg-muted/20 text-muted-foreground font-semibold">
                      <th className="py-3 px-4">Data / Horário</th>
                      <th className="py-3 px-4">Cliente</th>
                      <th className="py-3 px-4">Serviço</th>
                      <th className="py-3 px-4">Profissional</th>
                      <th className="py-3 px-4">Valor</th>
                      <th className="py-3 px-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {filteredAppointments.map((apt) => (
                      <tr key={apt.id} className="hover:bg-muted/10 transition-colors">
                        <td className="py-3 px-4 text-muted-foreground font-medium">
                          {formatDate(apt.startTime)}
                        </td>
                        <td className="py-3 px-4 font-semibold text-white">
                          {apt.client?.name || 'Cliente'}
                        </td>
                        <td className="py-3 px-4 text-muted-foreground">
                          {apt.service?.name || 'Serviço'}
                        </td>
                        <td className="py-3 px-4 text-muted-foreground">
                          {apt.barber?.name || 'Barbeiro'}
                        </td>
                        <td className="py-3 px-4 font-bold text-white">
                          {formatPrice(Number(apt.totalAmount || 0))}
                        </td>
                        <td className="py-3 px-4">
                          {apt.status === 'COMPLETED' ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                              Concluído
                            </span>
                          ) : apt.status === 'CONFIRMED' ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-500/20 text-blue-400 border border-blue-500/30">
                              Confirmado
                            </span>
                          ) : apt.status === 'PENDING' ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                              Pendente
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-500/20 text-red-400 border border-red-500/30">
                              Cancelado
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
