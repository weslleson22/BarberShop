'use client'

import { useState, useEffect, useMemo } from 'react'
import { useAuth } from '@/lib/auth-context'
import Link from 'next/link'
import { Calendar, Clock, Plus, User as UserIcon, X } from 'lucide-react'
import DropdownHeader from '@/components/shared/DropdownHeader'

interface ClientAppointment {
  id: string
  startTime: string
  status: 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW'
  service: { name: string; price: number }
  barber: { name: string }
}

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pendente',
  CONFIRMED: 'Confirmado',
  COMPLETED: 'Concluído',
  CANCELLED: 'Cancelado',
  NO_SHOW: 'Não compareceu',
}

const STATUS_STYLES: Record<string, string> = {
  PENDING: 'bg-yellow-500/20 text-yellow-400',
  CONFIRMED: 'bg-blue-500/20 text-blue-400',
  COMPLETED: 'bg-green-500/20 text-green-400',
  CANCELLED: 'bg-red-500/20 text-red-400',
  NO_SHOW: 'bg-gray-500/20 text-gray-400',
}

export default function MeusAgendamentosPage() {
  const { user } = useAuth()
  const [appointments, setAppointments] = useState<ClientAppointment[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'proximos' | 'historico'>('proximos')
  const [cancellingId, setCancellingId] = useState<string | null>(null)

  const loadAppointments = () => {
    setLoading(true)
    fetch('/api/appointments')
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setAppointments(Array.isArray(data) ? data : []))
      .catch(() => setAppointments([]))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadAppointments()
  }, [])

  const { upcoming, history } = useMemo(() => {
    const now = new Date()
    // Próximos: só PENDENTE/CONFIRMADO com data futura.
    const upcoming = appointments
      .filter((a) => (a.status === 'PENDING' || a.status === 'CONFIRMED') && new Date(a.startTime) >= now)
      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
    // Histórico: concluído, cancelado, ou qualquer agendamento já passado.
    const history = appointments
      .filter((a) => a.status === 'COMPLETED' || a.status === 'CANCELLED' || new Date(a.startTime) < now)
      .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())
    return { upcoming, history }
  }, [appointments])

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleString('pt-BR', { dateStyle: 'long', timeStyle: 'short' })

  const handleCancel = async (id: string) => {
    if (!confirm('Cancelar este agendamento?')) return
    setCancellingId(id)
    try {
      const res = await fetch(`/api/appointments/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'CANCELLED' }),
      })
      if (res.ok) {
        loadAppointments()
      } else {
        const error = await res.json()
        alert(error.error || 'Erro ao cancelar agendamento')
      }
    } finally {
      setCancellingId(null)
    }
  }

  const list = tab === 'proximos' ? upcoming : history

  return (
    <div className="min-h-screen overflow-x-hidden bg-gradient-to-br from-gray-950 via-blue-950 to-black pt-20">
      <DropdownHeader />

      <div className="w-full px-4 md:px-6 max-w-3xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">Meus Agendamentos</h1>
            <p className="text-white/60 text-sm md:text-base">Seus horários com a barbearia</p>
          </div>
          <Link
            href="/agendar"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-yellow-400 to-yellow-600 text-black font-semibold rounded-xl hover:from-yellow-500 hover:to-yellow-700 transition-all"
          >
            <Plus className="w-4 h-4" />
            Novo Agendamento
          </Link>
        </div>

        <div className="flex gap-2 mb-6 border-b border-white/10">
          <button
            onClick={() => setTab('proximos')}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-all ${
              tab === 'proximos'
                ? 'border-yellow-400 text-yellow-400'
                : 'border-transparent text-white/60 hover:text-white'
            }`}
          >
            Próximos ({upcoming.length})
          </button>
          <button
            onClick={() => setTab('historico')}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-all ${
              tab === 'historico'
                ? 'border-yellow-400 text-yellow-400'
                : 'border-transparent text-white/60 hover:text-white'
            }`}
          >
            Histórico ({history.length})
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-yellow-400" />
          </div>
        ) : list.length === 0 ? (
          <div className="bg-gradient-to-br from-gray-800/50 to-black/50 border border-white/6 rounded-2xl p-8 text-center">
            <p className="text-white/60">
              {tab === 'proximos' ? 'Nenhum agendamento futuro.' : 'Nenhum agendamento no histórico ainda.'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {list.map((a) => (
              <div
                key={a.id}
                className="bg-gradient-to-br from-gray-800/50 to-black/50 border border-white/6 rounded-2xl p-4 md:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
              >
                <div>
                  <p className="text-white font-semibold mb-1">{a.service.name}</p>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-white/60 text-sm">
                    <span className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" />
                      {formatDate(a.startTime)}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <UserIcon className="w-3.5 h-3.5" />
                      {a.barber.name}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${STATUS_STYLES[a.status] || ''}`}>
                    {STATUS_LABELS[a.status] || a.status}
                  </span>
                  {tab === 'proximos' && a.status !== 'CANCELLED' && (
                    <button
                      onClick={() => handleCancel(a.id)}
                      disabled={cancellingId === a.id}
                      className="p-1.5 text-white/60 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all disabled:opacity-50"
                      title="Cancelar agendamento"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
