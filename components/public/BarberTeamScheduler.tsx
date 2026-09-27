'use client'

import React, { useState, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Calendar,
  Clock,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  User,
  Users,
  Scissors,
  Sparkles,
  Star,
  ArrowRight,
  CalendarDays,
  X,
  Phone,
  ShieldCheck,
  Check,
  AlertCircle,
  RefreshCw
} from 'lucide-react'

export interface Barber {
  id: string
  name: string
  email?: string
  avatar?: string | null
  bio?: string | null
  specialties?: string[] | null
  phone?: string | null
}

export interface Service {
  id: string
  name: string
  price: number | any
  duration: number
  description?: string | null
  isActive?: boolean
}

export interface AppointmentRecord {
  id: string
  barberId: string
  startTime: Date | string
  service?: {
    duration?: number
  } | null
}

interface BarberTeamSchedulerProps {
  barbers: Barber[]
  services: Service[]
  slug: string
  tenantName: string
  initialAppointments?: AppointmentRecord[]
}

const WEEKDAYS = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB']
const MONTHS = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ']
const FULL_WEEKDAYS = [
  'Domingo',
  'Segunda-feira',
  'Terça-feira',
  'Quarta-feira',
  'Quinta-feira',
  'Sexta-feira',
  'Sábado',
]
const FULL_MONTHS = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
]

export default function BarberTeamScheduler({
  barbers,
  services,
  slug,
  tenantName,
  initialAppointments = [],
}: BarberTeamSchedulerProps) {
  const router = useRouter()

  // Filtro de especialista selecionado (ou "all")
  const [selectedBarberFilter, setSelectedBarberFilter] = useState<string>('all')

  // Data selecionada para cada barbeiro: Record<barberId, dateString 'YYYY-MM-DD'>
  const [selectedDates, setSelectedDates] = useState<Record<string, string>>({})

  // Horário selecionado para cada barbeiro: Record<barberId, timeSlot 'HH:MM'>
  const [selectedTimes, setSelectedTimes] = useState<Record<string, string>>({})

  // Modal de Agendamento Rápido Direto
  const [quickBookingModal, setQuickBookingModal] = useState<{
    isOpen: boolean
    barber: Barber | null
    dateStr: string
    timeStr: string
    serviceId: string
    clientName: string
    clientPhone: string
    clientEmail: string
    loading: boolean
    error: string | null
    success: boolean
  }>({
    isOpen: false,
    barber: null,
    dateStr: '',
    timeStr: '',
    serviceId: services[0]?.id || '',
    clientName: '',
    clientPhone: '',
    clientEmail: '',
    loading: false,
    error: null,
    success: false,
  })

  // Gerar os próximos 14 dias no fuso horário do usuário
  const daysList = useMemo(() => {
    const list: Array<{
      dateStr: string
      dateObj: Date
      dayOfWeek: string
      dayOfWeekFull: string
      dayNumber: number
      monthStr: string
      monthFull: string
      year: number
      isToday: boolean
    }> = []

    const today = new Date()

    for (let i = 0; i < 14; i++) {
      const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() + i)
      const year = d.getFullYear()
      const month = String(d.getMonth() + 1).padStart(2, '0')
      const day = String(d.getDate()).padStart(2, '0')
      const dateStr = `${year}-${month}-${day}`

      list.push({
        dateStr,
        dateObj: d,
        dayOfWeek: i === 0 ? 'HOJE' : WEEKDAYS[d.getDay()],
        dayOfWeekFull: FULL_WEEKDAYS[d.getDay()],
        dayNumber: d.getDate(),
        monthStr: MONTHS[d.getMonth()],
        monthFull: FULL_MONTHS[d.getMonth()],
        year: d.getFullYear(),
        isToday: i === 0,
      })
    }

    return list
  }, [])

  // Inicializa o dia selecionado com hoje para cada barbeiro caso ainda não esteja definido
  const getSelectedDateForBarber = (barberId: string) => {
    return selectedDates[barberId] || daysList[0]?.dateStr || ''
  }

  // Gera os horários livres das 08:00 às 20:00 para um barbeiro em uma data
  const getAvailableSlotsForBarber = (barberId: string, dateStr: string) => {
    if (!dateStr) return []

    const [year, month, day] = dateStr.split('-').map(Number)
    const now = new Date()
    const isToday =
      now.getFullYear() === year && now.getMonth() + 1 === month && now.getDate() === day

    // Agendamentos deste barbeiro nesta data
    const barberApts = initialAppointments.filter((apt) => {
      if (apt.barberId !== barberId) return false
      const aptDate = new Date(apt.startTime)
      return (
        aptDate.getFullYear() === year &&
        aptDate.getMonth() + 1 === month &&
        aptDate.getDate() === day
      )
    })

    const slots: Array<{
      time: string
      isAvailable: boolean
      reason?: string
    }> = []

    // Grade de horários padrão de 30 em 30 minutos (08:00 às 20:00)
    for (let hour = 8; hour < 20; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const timeStr = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
        const slotStart = new Date(year, month - 1, day, hour, minute, 0, 0)
        const slotEnd = new Date(slotStart.getTime() + 30 * 60 * 1000)

        // Se for hoje e já passou da hora
        if (isToday && slotStart <= now) {
          continue
        }

        // Verifica conflito com agendamentos existentes
        const hasConflict = barberApts.some((apt) => {
          const aptStart = new Date(apt.startTime)
          const duration = apt.service?.duration || 30
          const aptEnd = new Date(aptStart.getTime() + duration * 60 * 1000)

          const overlaps =
            (slotStart >= aptStart && slotStart < aptEnd) ||
            (slotEnd > aptStart && slotEnd <= aptEnd) ||
            (slotStart <= aptStart && slotEnd >= aptEnd)

          return overlaps
        })

        if (!hasConflict) {
          slots.push({
            time: timeStr,
            isAvailable: true,
          })
        }
      }
    }

    return slots
  }

  // Filtrar lista de barbeiros
  const filteredBarbers = useMemo(() => {
    if (selectedBarberFilter === 'all') return barbers
    return barbers.filter((b) => b.id === selectedBarberFilter)
  }, [barbers, selectedBarberFilter])

  // Formatar moeda
  const formatPrice = (val: number | any) => {
    const num = Number(val) || 0
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(num)
  }

  // Abertura do agendamento rápido
  const handleOpenQuickBooking = (barber: Barber, dateStr: string, timeStr: string) => {
    setQuickBookingModal({
      isOpen: true,
      barber,
      dateStr,
      timeStr,
      serviceId: services[0]?.id || '',
      clientName: '',
      clientPhone: '',
      clientEmail: '',
      loading: false,
      error: null,
      success: false,
    })
  }

  // Envio do agendamento rápido
  const handleConfirmQuickBooking = async (e: React.FormEvent) => {
    e.preventDefault()
    const { barber, dateStr, timeStr, serviceId, clientName, clientPhone, clientEmail } =
      quickBookingModal

    if (!barber || !dateStr || !timeStr || !serviceId || !clientName.trim() || !clientPhone.trim()) {
      setQuickBookingModal((prev) => ({
        ...prev,
        error: 'Por favor, preencha todos os campos obrigatórios (Nome, Telefone e Serviço).',
      }))
      return
    }

    const cleanPhone = clientPhone.replace(/\D/g, '')
    if (cleanPhone.length < 10) {
      setQuickBookingModal((prev) => ({
        ...prev,
        error: 'Por favor, informe um telefone válido com DDD.',
      }))
      return
    }

    setQuickBookingModal((prev) => ({ ...prev, loading: true, error: null }))

    try {
      // 1. Criar ou buscar cliente
      const clientRes = await fetch('/api/clients/public', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: clientName.trim(),
          phone: cleanPhone,
          email: clientEmail.trim() || undefined,
          slug,
        }),
      })

      const clientData = await clientRes.json()
      if (!clientRes.ok) {
        throw new Error(clientData.error || 'Erro ao registrar cliente.')
      }

      // 2. Criar agendamento público
      const [year, month, day] = dateStr.split('-').map(Number)
      const [hour, minute] = timeStr.split(':').map(Number)
      const startTimeIso = new Date(year, month - 1, day, hour, minute, 0).toISOString()

      const aptRes = await fetch('/api/appointments/public', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: clientData.id,
          barberId: barber.id,
          serviceId,
          startTime: startTimeIso,
          slug,
        }),
      })

      const aptData = await aptRes.json()
      if (!aptRes.ok) {
        throw new Error(aptData.error || 'Erro ao confirmar o agendamento.')
      }

      setQuickBookingModal((prev) => ({
        ...prev,
        loading: false,
        success: true,
        error: null,
      }))
    } catch (err: any) {
      setQuickBookingModal((prev) => ({
        ...prev,
        loading: false,
        error: err.message || 'Erro ao realizar agendamento.',
      }))
    }
  }

  // Formatação de telefone em tempo real
  const handlePhoneInput = (val: string) => {
    let clean = val.replace(/\D/g, '')
    if (clean.length > 11) clean = clean.slice(0, 11)

    let formatted = clean
    if (clean.length > 10) {
      formatted = `(${clean.slice(0, 2)}) ${clean.slice(2, 7)}-${clean.slice(7)}`
    } else if (clean.length > 6) {
      formatted = `(${clean.slice(0, 2)}) ${clean.slice(2, 6)}-${clean.slice(6)}`
    } else if (clean.length > 2) {
      formatted = `(${clean.slice(0, 2)}) ${clean.slice(2)}`
    }

    setQuickBookingModal((prev) => ({ ...prev, clientPhone: formatted }))
  }

  if (barbers.length === 0) {
    return (
      <div className="p-8 rounded-3xl bg-gray-900/60 border border-gray-800 text-center text-gray-400">
        Nenhum profissional cadastrado ou disponível nesta unidade no momento.
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Seletor Rápido de Barbeiro no Topo (Google Chips Style) */}
      {barbers.length > 1 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          <button
            type="button"
            onClick={() => setSelectedBarberFilter('all')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all shrink-0 flex items-center gap-2 cursor-pointer ${
              selectedBarberFilter === 'all'
                ? 'bg-amber-400 text-black shadow-lg shadow-amber-500/20 font-bold'
                : 'bg-gray-800/80 hover:bg-gray-700/80 text-gray-300 border border-gray-700/60'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Toda a Equipe ({barbers.length})</span>
          </button>

          {barbers.map((b) => (
            <button
              key={b.id}
              type="button"
              onClick={() => setSelectedBarberFilter(b.id)}
              className={`px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-semibold transition-all shrink-0 flex items-center gap-2 cursor-pointer ${
                selectedBarberFilter === b.id
                  ? 'bg-amber-400 text-black shadow-lg shadow-amber-500/20 font-bold'
                  : 'bg-gray-800/80 hover:bg-gray-700/80 text-gray-300 border border-gray-700/60'
              }`}
            >
              {b.avatar ? (
                <img
                  src={b.avatar}
                  alt={b.name}
                  className="w-5 h-5 rounded-full object-cover border border-amber-500/40"
                />
              ) : (
                <div className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 text-[10px] font-bold flex items-center justify-center">
                  {b.name.slice(0, 1).toUpperCase()}
                </div>
              )}
              <span>{b.name}</span>
            </button>
          ))}
        </div>
      )}

      {/* Lista dos Quadros no Modelo Google Calendar para Cada Barbeiro */}
      <div className="space-y-8">
        {filteredBarbers.map((barber) => {
          const selectedDate = getSelectedDateForBarber(barber.id)
          const availableSlots = getAvailableSlotsForBarber(barber.id, selectedDate)
          const selectedTime = selectedTimes[barber.id] || null

          const selectedDayObj = daysList.find((d) => d.dateStr === selectedDate)

          return (
            <div
              key={barber.id}
              className="rounded-3xl bg-gradient-to-b from-gray-900/90 via-gray-900/60 to-black/80 border border-gray-800 hover:border-amber-500/30 transition-all p-5 sm:p-7 shadow-2xl backdrop-blur-xl relative overflow-hidden"
            >
              {/* Efeito Glow Dourado de Fundo */}
              <div className="absolute top-0 right-0 w-72 h-72 bg-amber-500/5 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />

              {/* 1. Header do Especialista */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-gray-800/80">
                <div className="flex items-center gap-4">
                  <div className="relative shrink-0">
                    {barber.avatar ? (
                      <img
                        src={barber.avatar}
                        alt={barber.name}
                        className="w-16 h-16 sm:w-18 sm:h-18 rounded-2xl object-cover border-2 border-amber-500/40 shadow-xl"
                      />
                    ) : (
                      <div className="w-16 h-16 sm:w-18 sm:h-18 rounded-2xl bg-gradient-to-br from-amber-500/20 to-yellow-600/10 border-2 border-amber-500/30 flex items-center justify-center text-amber-400 font-bold text-2xl shadow-xl">
                        {barber.name.slice(0, 2).toUpperCase()}
                      </div>
                    )}
                    {/* Badge verde de status Online / Agenda Aberta */}
                    <span className="absolute -bottom-1 -right-1 flex h-4 w-4">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500 border-2 border-gray-900" />
                    </span>
                  </div>

                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                        {barber.name}
                      </h3>
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-400/10 text-amber-400 border border-amber-400/30 flex items-center gap-1">
                        <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                        4.9 • Especialista
                      </span>
                    </div>

                    <p className="text-xs sm:text-sm text-gray-400 mt-1 line-clamp-1">
                      {barber.bio || 'Atendimento com horário exclusivo, pontualidade e técnicas de ponta.'}
                    </p>

                    {/* Tags de Especialidades */}
                    {Array.isArray(barber.specialties) && barber.specialties.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {barber.specialties.map((spec, i) => (
                          <span
                            key={i}
                            className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-gray-800 text-gray-300 border border-gray-700/60"
                          >
                            ✂️ {spec}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="text-left sm:text-right shrink-0">
                  <span className="text-xs text-emerald-400 font-medium bg-emerald-500/10 px-3 py-1.5 rounded-xl border border-emerald-500/20 inline-flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Agenda em Tempo Real
                  </span>
                </div>
              </div>

              {/* 2. Quadro de Dias no Modelo do Google (Google Calendar Horizontal Strip) */}
              <div className="pt-6">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2 text-xs sm:text-sm font-semibold text-gray-300">
                    <Calendar className="w-4 h-4 text-amber-400" />
                    <span>Selecione o Dia para Atendimento:</span>
                  </div>
                  <span className="text-[11px] text-gray-400">
                    {selectedDayObj?.dayOfWeekFull}, {selectedDayObj?.dayNumber} de{' '}
                    {selectedDayObj?.monthFull}
                  </span>
                </div>

                {/* Carrossel de Dias Estilo Google */}
                <div className="flex items-center gap-2 overflow-x-auto pb-3 pt-1 scrollbar-none">
                  {daysList.map((day) => {
                    const isSelected = day.dateStr === selectedDate
                    return (
                      <button
                        key={day.dateStr}
                        type="button"
                        onClick={() => {
                          setSelectedDates((prev) => ({ ...prev, [barber.id]: day.dateStr }))
                          setSelectedTimes((prev) => ({ ...prev, [barber.id]: '' }))
                        }}
                        className={`flex flex-col items-center justify-center min-w-[70px] sm:min-w-[82px] py-3 px-2 rounded-2xl transition-all cursor-pointer border ${
                          isSelected
                            ? 'bg-gradient-to-b from-amber-400 to-yellow-500 text-black border-yellow-300 shadow-lg shadow-amber-500/30 scale-105 font-bold'
                            : day.isToday
                            ? 'bg-amber-500/10 text-amber-300 border-amber-500/40 hover:bg-amber-500/20'
                            : 'bg-gray-800/60 hover:bg-gray-800 text-gray-300 border-gray-700/60 hover:border-gray-600'
                        }`}
                      >
                        <span
                          className={`text-[10px] sm:text-[11px] tracking-wider uppercase font-semibold ${
                            isSelected ? 'text-black' : day.isToday ? 'text-amber-400' : 'text-gray-400'
                          }`}
                        >
                          {day.dayOfWeek}
                        </span>

                        <span className="text-lg sm:text-xl font-extrabold my-0.5 leading-none">
                          {day.dayNumber}
                        </span>

                        <span
                          className={`text-[10px] uppercase font-medium ${
                            isSelected ? 'text-black/80' : 'text-gray-400'
                          }`}
                        >
                          {day.monthStr}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* 3. Quadro de Horários Livres (Google Free Time Slots Grid) */}
              <div className="pt-5">
                <div className="flex items-center justify-between mb-3.5">
                  <div className="flex items-center gap-2 text-xs sm:text-sm font-semibold text-gray-300">
                    <Clock className="w-4 h-4 text-amber-400" />
                    <span>Horários Livres com {barber.name.split(' ')[0]}:</span>
                  </div>

                  <span className="text-xs font-medium text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20">
                    {availableSlots.length} horário(s) disponível(is)
                  </span>
                </div>

                {availableSlots.length === 0 ? (
                  <div className="p-6 rounded-2xl bg-gray-800/30 border border-gray-800 text-center text-xs sm:text-sm text-gray-400">
                    Nenhum horário livre restante para este dia com este profissional. Por favor,
                    selecione outro dia acima.
                  </div>
                ) : (
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2.5">
                    {availableSlots.map((slot) => {
                      const isChosen = selectedTime === slot.time
                      return (
                        <button
                          key={slot.time}
                          type="button"
                          onClick={() => {
                            setSelectedTimes((prev) => ({ ...prev, [barber.id]: slot.time }))
                          }}
                          className={`py-2.5 px-3 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer border ${
                            isChosen
                              ? 'bg-amber-400 text-black border-amber-300 shadow-md shadow-amber-500/30 scale-105 font-bold'
                              : 'bg-gray-800/80 hover:bg-gray-700/80 text-gray-200 border-gray-700 hover:border-amber-400/50'
                          }`}
                        >
                          {isChosen ? (
                            <Check className="w-3.5 h-3.5 stroke-[3] text-black" />
                          ) : (
                            <Clock className="w-3 h-3 text-amber-400/70" />
                          )}
                          <span>{slot.time}</span>
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* 4. Barra de Ação de Agendamento Imediato no Horário Selecionado */}
              {selectedTime && (
                <div className="mt-6 pt-5 border-t border-gray-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-amber-500/10 border-amber-500/30 rounded-2xl p-4 sm:p-5 animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-400 text-black font-bold flex items-center justify-center shadow-md">
                      <CalendarDays className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-xs text-amber-300 font-semibold uppercase tracking-wider">
                        Horário Selecionado:
                      </div>
                      <div className="text-sm sm:text-base font-bold text-white">
                        {selectedDayObj?.dayOfWeekFull}, {selectedDayObj?.dayNumber} de{' '}
                        {selectedDayObj?.monthFull} às{' '}
                        <span className="text-amber-400 text-base sm:text-lg underline underline-offset-4">
                          {selectedTime}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleOpenQuickBooking(barber, selectedDate, selectedTime)}
                      className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-300 hover:to-yellow-400 text-black font-bold text-xs sm:text-sm shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Sparkles className="w-4 h-4 text-black" />
                      <span>Agendar Agora</span>
                      <ArrowRight className="w-4 h-4 text-black" />
                    </button>

                    <Link
                      href={`/agendar?slug=${encodeURIComponent(slug)}&barberId=${encodeURIComponent(
                        barber.id
                      )}&date=${encodeURIComponent(selectedDate)}&time=${encodeURIComponent(
                        selectedTime
                      )}`}
                      className="px-4 py-2.5 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs sm:text-sm font-medium border border-gray-700 transition flex items-center justify-center"
                    >
                      <span>Ver Serviços</span>
                    </Link>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Modal de Conclusão Rápida de Agendamento */}
      {quickBookingModal.isOpen && quickBookingModal.barber && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-amber-500/30 rounded-3xl w-full max-w-lg p-6 sm:p-8 space-y-6 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200 text-white">
            {/* Header do Modal */}
            <div className="flex items-center justify-between border-b border-gray-800 pb-4">
              <div>
                <span className="text-xs text-amber-400 font-bold uppercase tracking-wider">
                  Agendamento Online
                </span>
                <h3 className="text-xl font-extrabold text-white mt-0.5">
                  Confirmar Horário com {quickBookingModal.barber.name}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setQuickBookingModal((prev) => ({ ...prev, isOpen: false }))}
                className="p-1.5 rounded-xl text-gray-400 hover:text-white hover:bg-gray-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {quickBookingModal.success ? (
              <div className="py-8 text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-500/50 flex items-center justify-center text-emerald-400 mx-auto shadow-lg shadow-emerald-500/20">
                  <CheckCircle2 className="w-10 h-10" />
                </div>
                <h4 className="text-2xl font-bold text-white">Agendamento Realizado!</h4>
                <p className="text-sm text-gray-300 max-w-sm mx-auto">
                  Seu horário com <strong>{quickBookingModal.barber.name}</strong> para o dia{' '}
                  <strong>{quickBookingModal.dateStr}</strong> às{' '}
                  <strong>{quickBookingModal.timeStr}</strong> foi confirmado com sucesso.
                </p>
                <div className="pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setQuickBookingModal((prev) => ({ ...prev, isOpen: false }))
                      window.location.reload()
                    }}
                    className="px-6 py-2.5 rounded-xl bg-amber-400 text-black font-bold text-sm hover:bg-amber-300 transition"
                  >
                    Concluir
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleConfirmQuickBooking} className="space-y-4">
                {/* Resumo da Data e Barbeiro */}
                <div className="p-4 rounded-2xl bg-gray-800/60 border border-gray-700/60 flex items-center justify-between text-xs sm:text-sm">
                  <div className="flex items-center gap-3">
                    <Calendar className="w-5 h-5 text-amber-400" />
                    <div>
                      <div className="text-gray-400 text-xs">Data & Horário</div>
                      <div className="font-bold text-white">
                        {quickBookingModal.dateStr} às {quickBookingModal.timeStr}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-gray-400 text-xs">Especialista</div>
                    <div className="font-bold text-amber-400">
                      {quickBookingModal.barber.name}
                    </div>
                  </div>
                </div>

                {quickBookingModal.error && (
                  <div className="p-3.5 bg-red-950/40 border border-red-800/60 rounded-xl text-red-300 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                    <span>{quickBookingModal.error}</span>
                  </div>
                )}

                {/* Seleção do Serviço */}
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                    Escolha o Serviço Desejado *
                  </label>
                  <select
                    value={quickBookingModal.serviceId}
                    onChange={(e) =>
                      setQuickBookingModal((prev) => ({ ...prev, serviceId: e.target.value }))
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl bg-gray-800 border border-gray-700 text-white text-sm focus:outline-none focus:border-amber-400 transition"
                    required
                  >
                    {services.map((svc) => (
                      <option key={svc.id} value={svc.id}>
                        {svc.name} — {formatPrice(svc.price)} ({svc.duration} min)
                      </option>
                    ))}
                  </select>
                </div>

                {/* Nome do Cliente */}
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                    Seu Nome Completo *
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      placeholder="Ex: Carlos Eduardo Silva"
                      value={quickBookingModal.clientName}
                      onChange={(e) =>
                        setQuickBookingModal((prev) => ({ ...prev, clientName: e.target.value }))
                      }
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-gray-800 border border-gray-700 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-amber-400 transition"
                    />
                  </div>
                </div>

                {/* Telefone / WhatsApp */}
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                    WhatsApp para Confirmação *
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="tel"
                      required
                      placeholder="(11) 98765-4321"
                      value={quickBookingModal.clientPhone}
                      onChange={(e) => handlePhoneInput(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-gray-800 border border-gray-700 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-amber-400 transition font-mono"
                    />
                  </div>
                </div>

                {/* E-mail (Opcional) */}
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                    E-mail (Opcional para comprovante)
                  </label>
                  <input
                    type="email"
                    placeholder="seu.email@exemplo.com"
                    value={quickBookingModal.clientEmail}
                    onChange={(e) =>
                      setQuickBookingModal((prev) => ({ ...prev, clientEmail: e.target.value }))
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl bg-gray-800 border border-gray-700 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-amber-400 transition"
                  />
                </div>

                {/* Botões do Rodapé */}
                <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-800">
                  <button
                    type="button"
                    onClick={() => setQuickBookingModal((prev) => ({ ...prev, isOpen: false }))}
                    disabled={quickBookingModal.loading}
                    className="px-4 py-2 rounded-xl text-xs font-medium text-gray-400 hover:text-white hover:bg-gray-800 transition cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={quickBookingModal.loading}
                    className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-300 hover:to-yellow-400 text-black font-bold text-xs sm:text-sm shadow-lg shadow-amber-500/20 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {quickBookingModal.loading ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin text-black" />
                        <span>Confirmando...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4 text-black stroke-[3]" />
                        <span>Confirmar Horário</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
