'use client'

import React, { useState, useMemo } from 'react'
import {
  Scissors,
  Clock,
  User,
  Calendar,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  ShieldCheck,
  AlertCircle,
  X,
  RefreshCw,
  Check,
  Phone,
  Mail,
  MapPin,
  Sparkles,
  Star,
  ChevronLeft,
  ChevronRight,
  CalendarCheck,
  FileText
} from 'lucide-react'
import { WeekOperatingHours, getDayOperatingHours, isBarberWorkingOnDay } from '@/lib/operating-hours'

export interface ServiceItem {
  id: string
  name: string
  price: number | any
  duration: number
  description?: string | null
  isActive?: boolean
}

export interface BarberItem {
  id: string
  name: string
  email?: string
  avatar?: string | null
  bio?: string | null
  specialties?: string[] | null
  phone?: string | null
}

export interface AppointmentSlotRecord {
  id: string
  barberId: string
  startTime: Date | string
  service?: {
    duration?: number
  } | null
}

interface PublicServicesCatalogProps {
  services: ServiceItem[]
  barbers: BarberItem[]
  appointments?: AppointmentSlotRecord[]
  slug: string
  tenantName: string
  tenantAddress?: string | null
  tenantPhone?: string | null
  operatingHours?: WeekOperatingHours | null
  barberWorkDays?: Record<string, string[]>
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

export default function PublicServicesCatalog({
  services,
  barbers,
  appointments = [],
  slug,
  tenantName,
  tenantAddress,
  tenantPhone,
  operatingHours,
  barberWorkDays = {},
}: PublicServicesCatalogProps) {
  // Estado do Wizard de Agendamento
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1) // 1: Especialista, 2: Horário, 3: Confirmar Dados, 4: Concluído

  // Seleções do fluxo
  const [selectedService, setSelectedService] = useState<ServiceItem | null>(null)
  const [selectedBarber, setSelectedBarber] = useState<BarberItem | null>(null) // null significa "Qualquer Especialista"
  const [isAnyBarber, setIsAnyBarber] = useState(false)
  const [selectedDate, setSelectedDate] = useState<string>('')
  const [selectedTime, setSelectedTime] = useState<string>('')

  // Dados do formulário do cliente
  const [clientName, setClientName] = useState('')
  const [clientPhone, setClientPhone] = useState('')
  const [clientEmail, setClientEmail] = useState('')
  const [notes, setNotes] = useState('')

  // Estados de envio
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [completedAppointment, setCompletedAppointment] = useState<any>(null)

  // Gerar os próximos 14 dias no fuso horário local
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

  // Inicializa o dia selecionado com hoje ao abrir o modal
  const activeDate = selectedDate || daysList[0]?.dateStr || ''

  // Formatação amigável de data por extenso
  const formatDateFriendly = (dateStr: string) => {
    if (!dateStr) return ''
    const dayItem = daysList.find((d) => d.dateStr === dateStr)
    if (dayItem) {
      return `${dayItem.dayNumber} de ${dayItem.monthFull} (${dayItem.dayOfWeekFull})`
    }
    const parts = dateStr.split('-')
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`
    }
    return dateStr
  }

  // Formatação de Preço
  const formatPrice = (val: number | any) => {
    const num = Number(val) || 0
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(num)
  }

  // Formatação de Telefone
  const handlePhoneChange = (val: string) => {
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
    setClientPhone(formatted)
  }

  // 1. Disparo ao clicar em um serviço no catálogo
  const handleSelectService = (service: ServiceItem) => {
    setSelectedService(service)
    setSelectedBarber(null)
    setIsAnyBarber(false)
    setSelectedDate(daysList[0]?.dateStr || '')
    setSelectedTime('')
    setStep(1) // Passo 1: Selecionar Especialista
    setErrorMessage(null)
    setIsModalOpen(true)
  }

  // 2. Disparo ao selecionar especialista
  const handleSelectBarber = (barber: BarberItem | null, anyBarber: boolean = false) => {
    setSelectedBarber(barber)
    setIsAnyBarber(anyBarber)
    setSelectedTime('')
    setErrorMessage(null)
    setStep(2) // Avança para o Passo 2: Horário
  }

  // 3. Disparo ao selecionar horário
  const handleSelectTime = (time: string, dateStr: string) => {
    setSelectedTime(time)
    setSelectedDate(dateStr)
    setErrorMessage(null)
    setStep(3) // Avança para o Passo 3: Confirmar Dados
  }

  // Calcula horários disponíveis para o barbeiro/data selecionados
  const availableSlots = useMemo(() => {
    if (!activeDate) return []

    const [year, month, day] = activeDate.split('-').map(Number)
    const slotDate = new Date(year, month - 1, day, 12, 0, 0)
    const dayConfig = getDayOperatingHours(operatingHours, slotDate)

    // Se a barbearia estiver fechada neste dia
    if (!dayConfig.isOpen) {
      return []
    }

    // Se um barbeiro específico estiver selecionado e não atender neste dia
    if (selectedBarber && !isBarberWorkingOnDay(selectedBarber.id, barberWorkDays, slotDate)) {
      return []
    }

    const now = new Date()
    const isToday =
      now.getFullYear() === year && now.getMonth() + 1 === month && now.getDate() === day

    const [openH, openM] = dayConfig.open.split(':').map(Number)
    const [closeH, closeM] = dayConfig.close.split(':').map(Number)
    const openTotalMinutes = openH * 60 + openM
    const closeTotalMinutes = closeH * 60 + closeM

    let breakStartMinutes = -1
    let breakEndMinutes = -1
    if (dayConfig.hasBreak && dayConfig.breakStart && dayConfig.breakEnd) {
      const [bsH, bsM] = dayConfig.breakStart.split(':').map(Number)
      const [beH, beM] = dayConfig.breakEnd.split(':').map(Number)
      breakStartMinutes = bsH * 60 + bsM
      breakEndMinutes = beH * 60 + beM
    }

    // Lista de barbeiros a checar (se foi selecionado um específico ou todos)
    const targetBarbers = selectedBarber ? [selectedBarber] : barbers

    const slots: Array<{
      time: string
      available: boolean
      assignedBarber?: BarberItem
    }> = []

    // Grade dinâmica respeitando abertura e fechamento
    for (
      let currentMinutes = openTotalMinutes;
      currentMinutes < closeTotalMinutes;
      currentMinutes += 30
    ) {
      if (
        dayConfig.hasBreak &&
        breakStartMinutes >= 0 &&
        breakEndMinutes > breakStartMinutes &&
        currentMinutes >= breakStartMinutes &&
        currentMinutes < breakEndMinutes
      ) {
        continue
      }

      const hour = Math.floor(currentMinutes / 60)
      const minute = currentMinutes % 60
      const timeStr = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
      const slotStart = new Date(year, month - 1, day, hour, minute, 0, 0)
      const duration = selectedService?.duration || 30
      const slotEnd = new Date(slotStart.getTime() + duration * 60 * 1000)

      // Se for hoje e já passou o horário
      if (isToday && slotStart <= now) {
        continue
      }

      // Verifica se há pelo menos um barbeiro livre neste horário
      let freeBarber: BarberItem | undefined = undefined

      for (const b of targetBarbers) {
        const barberApts = appointments.filter((apt) => {
          if (apt.barberId !== b.id) return false
          const aptDate = new Date(apt.startTime)
          return (
            aptDate.getFullYear() === year &&
            aptDate.getMonth() + 1 === month &&
            aptDate.getDate() === day
          )
        })

        const hasConflict = barberApts.some((apt) => {
          const aptStart = new Date(apt.startTime)
          const aptDur = apt.service?.duration || 30
          const aptEnd = new Date(aptStart.getTime() + aptDur * 60 * 1000)

          return (
            (slotStart >= aptStart && slotStart < aptEnd) ||
            (slotEnd > aptStart && slotEnd <= aptEnd) ||
            (slotStart <= aptStart && slotEnd >= aptEnd)
          )
        })

        if (!hasConflict) {
          freeBarber = b
          break
        }
      }

      if (freeBarber) {
        slots.push({
          time: timeStr,
          available: true,
          assignedBarber: freeBarber,
        })
      }
    }

    return slots
  }, [activeDate, selectedBarber, barbers, appointments, selectedService, operatingHours])

  // 4. Submissão e Conclusão do Agendamento
  const handleConfirmBooking = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)

    if (!selectedService) {
      setErrorMessage('Nenhum serviço selecionado.')
      return
    }

    if (!activeDate || !selectedTime) {
      setErrorMessage('Por favor, selecione uma data e horário.')
      return
    }

    if (!clientName.trim() || !clientPhone.trim()) {
      setErrorMessage('Nome completo e WhatsApp são obrigatórios.')
      return
    }

    const cleanPhone = clientPhone.replace(/\D/g, '')
    if (cleanPhone.length < 10) {
      setErrorMessage('Por favor, digite um número de WhatsApp válido com DDD.')
      return
    }

    // Resolve o barbeiro a ser agendado
    let resolvedBarber = selectedBarber
    if (!resolvedBarber) {
      // Se era "Qualquer Especialista", encontra o primeiro livre no horário escolhido
      const matchingSlot = availableSlots.find((s) => s.time === selectedTime)
      resolvedBarber = matchingSlot?.assignedBarber || barbers[0]
    }

    if (!resolvedBarber) {
      setErrorMessage('Nenhum especialista disponível para o horário selecionado.')
      return
    }

    setLoading(true)

    try {
      // Passo 1: Criar / atualizar cliente na barbearia
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
        throw new Error(clientData.error || 'Erro ao registrar informações do cliente.')
      }

      // Passo 2: Criar agendamento
      const [year, month, day] = activeDate.split('-').map(Number)
      const [hour, minute] = selectedTime.split(':').map(Number)
      const startTimeIso = new Date(year, month - 1, day, hour, minute, 0).toISOString()

      const aptRes = await fetch('/api/appointments/public', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: clientData.id,
          barberId: resolvedBarber.id,
          serviceId: selectedService.id,
          startTime: startTimeIso,
          notes: notes.trim() || undefined,
          slug,
        }),
      })

      const aptData = await aptRes.json()
      if (!aptRes.ok) {
        throw new Error(aptData.error || 'Erro ao finalizar o agendamento.')
      }

      // Salva dados do agendamento concluído e avança para a tela de sucesso
      setCompletedAppointment({
        id: aptData.id,
        service: selectedService,
        barber: resolvedBarber,
        dateStr: activeDate,
        timeStr: selectedTime,
        clientName: clientName.trim(),
        clientPhone: formattedPhoneDisplay(cleanPhone),
        clientEmail: clientEmail.trim(),
      })

      setStep(4) // Passo 4: Concluído!
    } catch (err: any) {
      console.error('Falha no agendamento público:', err)
      setErrorMessage(err.message || 'Ocorreu um erro ao concluir o agendamento. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  const formattedPhoneDisplay = (digits: string) => {
    if (digits.length === 11) {
      return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`
    }
    if (digits.length === 10) {
      return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`
    }
    return digits
  }

  // Gera link do Google Agenda
  const getGoogleCalendarUrl = () => {
    if (!completedAppointment) return '#'
    const { service, barber, dateStr, timeStr } = completedAppointment
    const [year, month, day] = dateStr.split('-').map(Number)
    const [hour, minute] = timeStr.split(':').map(Number)
    const start = new Date(year, month - 1, day, hour, minute)
    const end = new Date(start.getTime() + (service.duration || 30) * 60 * 1000)

    const formatGDate = (d: Date) => d.toISOString().replace(/-|:|\.\d\d\d/g, '')

    const title = encodeURIComponent(`${service.name} - ${tenantName}`)
    const details = encodeURIComponent(
      `Agendamento confirmado!\nServiço: ${service.name}\nEspecialista: ${barber.name}\nValor: ${formatPrice(service.price)}\nUnidade: ${tenantName}`
    )
    const location = encodeURIComponent(tenantAddress || tenantName)
    const dates = `${formatGDate(start)}/${formatGDate(end)}`

    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${dates}&details=${details}&location=${location}`
  }

  return (
    <>
      {/* ============================================================== */}
      {/* SEÇÃO 1: CATÁLOGO DE SERVIÇOS & SERVIÇOS DISPONÍVEIS */}
      {/* ============================================================== */}
      <section className="scroll-mt-10" id="catalogo-servicos">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2 text-primary text-sm font-semibold tracking-wide uppercase">
              <Scissors className="w-4 h-4" />
              Catálogo de Serviços
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground mt-1">
              Serviços Disponíveis
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">
              Escolha o serviço desejado para selecionar o especialista, dia, horário e concluir seu agendamento instantaneamente.
            </p>
          </div>
          <span className="text-xs text-muted-foreground bg-muted/60 px-3 py-1.5 rounded-lg border border-border self-start sm:self-auto shrink-0">
            {services.length} serviços cadastrados
          </span>
        </div>

        {services.length === 0 ? (
          <div className="p-8 rounded-2xl bg-muted/30 border border-border text-center text-muted-foreground">
            Nenhum serviço disponível no momento para esta unidade.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {services.map((service) => (
              <div
                key={service.id}
                onClick={() => handleSelectService(service)}
                className="group relative flex flex-col justify-between p-6 rounded-2xl bg-card border border-border hover:border-primary/50 hover:shadow-lg transition-all cursor-pointer transform hover:-translate-y-1 shadow-sm"
              >
                <div>
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <h3 className="font-bold text-lg text-foreground group-hover:text-primary transition-colors">
                      {service.name}
                    </h3>
                    <span className="text-lg font-black text-primary whitespace-nowrap bg-primary/10 px-2.5 py-1 rounded-lg border border-primary/20">
                      {formatPrice(service.price)}
                    </span>
                  </div>
                  {service.description && (
                    <p className="text-xs text-muted-foreground mb-4 line-clamp-2">
                      {service.description}
                    </p>
                  )}
                </div>

                <div className="pt-4 border-t border-border flex items-center justify-between text-xs">
                  <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                    <Clock className="w-3.5 h-3.5 text-primary" />
                    {service.duration} minutos
                  </span>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleSelectService(service)
                    }}
                    className="inline-flex items-center gap-1.5 font-bold text-xs bg-primary hover:bg-primary/90 text-primary-foreground px-3.5 py-2 rounded-xl transition-all shadow-sm group-hover:scale-105"
                  >
                    <span>Selecionar e Agendar</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ============================================================== */}
      {/* MODAL WIZARD: ESPECIALISTA -> HORÁRIO -> DADOS -> CONCLUÍDO */}
      {/* ============================================================== */}
      {isModalOpen && selectedService && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-md animate-in fade-in overflow-y-auto">
          <div className="bg-card border border-border w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col my-8 max-h-[92vh] text-foreground">
            
            {/* Header do Wizard */}
            <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-muted/40 sticky top-0 z-10">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                  <CalendarCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-foreground text-base">Agendamento Online</h3>
                  <p className="text-xs text-muted-foreground">{tenantName}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Stepper Progress Bar */}
            {step < 4 && (
              <div className="px-6 pt-4 pb-2 bg-muted/20 border-b border-border">
                <div className="flex items-center justify-between text-xs font-semibold mb-2">
                  <span className={step >= 1 ? 'text-primary' : 'text-muted-foreground'}>
                    1. Especialista
                  </span>
                  <span className={step >= 2 ? 'text-primary' : 'text-muted-foreground'}>
                    2. Horário
                  </span>
                  <span className={step >= 3 ? 'text-primary' : 'text-muted-foreground'}>
                    3. Confirmação
                  </span>
                </div>
                <div className="w-full bg-muted h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-primary h-full transition-all duration-300"
                    style={{ width: `${(step / 3) * 100}%` }}
                  />
                </div>

                {/* Resumo do Serviço selecionado no topo do modal */}
                <div className="mt-3 py-2 px-3 rounded-xl bg-primary/5 border border-primary/20 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <Scissors className="w-3.5 h-3.5 text-primary" />
                    <span className="font-bold text-foreground">{selectedService.name}</span>
                    <span className="text-muted-foreground">• {selectedService.duration} min</span>
                  </div>
                  <span className="font-extrabold text-primary">
                    {formatPrice(selectedService.price)}
                  </span>
                </div>
              </div>
            )}

            {/* Corpo do Modal com Scroll */}
            <div className="p-6 overflow-y-auto flex-1 space-y-6">
              {errorMessage && (
                <div className="p-3.5 bg-red-950/50 border border-red-800 rounded-xl text-red-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* ============================================================== */}
              {/* PASSO 1: SELECIONAR O ESPECIALISTA */}
              {/* ============================================================== */}
              {step === 1 && (
                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm sm:text-base font-bold text-foreground">
                      Com qual especialista você deseja ser atendido?
                    </h4>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Selecione seu profissional favorito ou opte pelo primeiro horário disponível.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    {/* Opção Qualquer Especialista */}
                    <div
                      onClick={() => handleSelectBarber(null, true)}
                      className="p-4 rounded-2xl border border-border bg-card hover:bg-muted/60 hover:border-primary/50 transition-all cursor-pointer flex items-center gap-3.5 group shadow-sm"
                    >
                      <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary group-hover:scale-105 transition-transform shrink-0">
                        <Sparkles className="w-6 h-6" />
                      </div>
                      <div>
                        <div className="font-bold text-sm text-foreground group-hover:text-primary transition-colors">
                          Primeiro Disponível
                        </div>
                        <div className="text-[11px] text-muted-foreground mt-0.5">
                          Maior flexibilidade de horários livres
                        </div>
                      </div>
                    </div>

                    {/* Lista de Barbeiros da Barbearia */}
                    {barbers.map((barber) => (
                      <div
                        key={barber.id}
                        onClick={() => handleSelectBarber(barber, false)}
                        className="p-4 rounded-2xl border border-border bg-card hover:bg-muted/60 hover:border-primary/50 transition-all cursor-pointer flex items-center gap-3.5 group shadow-sm"
                      >
                        {barber.avatar ? (
                          <img
                            src={barber.avatar}
                            alt={barber.name}
                            className="w-12 h-12 rounded-2xl object-cover border border-primary/30 group-hover:scale-105 transition-transform shrink-0"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold text-base shrink-0">
                            <User className="w-6 h-6" />
                          </div>
                        )}
                        <div className="overflow-hidden">
                          <div className="font-bold text-sm text-foreground group-hover:text-primary transition-colors truncate">
                            {barber.name}
                          </div>
                          <div className="text-[11px] text-muted-foreground truncate">
                            {barber.bio || 'Barbeiro Profissional'}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ============================================================== */}
              {/* PASSO 2: SELECIONAR HORÁRIO */}
              {/* ============================================================== */}
              {step === 2 && (
                <div className="space-y-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm sm:text-base font-bold text-foreground">
                        Escolha a data e o horário
                      </h4>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Especialista:{' '}
                        <span className="text-primary font-semibold">
                          {selectedBarber ? selectedBarber.name : 'Primeiro Disponível'}
                        </span>
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 cursor-pointer"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                      Trocar profissional
                    </button>
                  </div>

                  {/* Carrossel de Datas dos Próximos 14 Dias */}
                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-2">
                      1. Selecione o Dia:
                    </label>
                    <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-muted">
                      {daysList.map((day) => {
                        const isSelected = activeDate === day.dateStr
                        const dayConfig = getDayOperatingHours(operatingHours, day.dateObj)
                        const isBarberAvailable = selectedBarber ? isBarberWorkingOnDay(selectedBarber.id, barberWorkDays, day.dateObj) : true
                        const isClosedDay = !dayConfig.isOpen || !isBarberAvailable
                        return (
                          <button
                            key={day.dateStr}
                            type="button"
                            onClick={() => {
                              setSelectedDate(day.dateStr)
                              setSelectedTime('')
                            }}
                            className={`flex flex-col items-center justify-center min-w-[70px] py-3 px-2 rounded-2xl border transition-all cursor-pointer shrink-0 ${
                              isSelected
                                ? 'bg-primary text-primary-foreground font-extrabold border-primary shadow-sm'
                                : isClosedDay
                                ? 'bg-muted/20 border-border text-muted-foreground/50 opacity-50 hover:opacity-75'
                                : 'bg-muted/40 border-border text-foreground hover:bg-muted hover:border-primary/50'
                            }`}
                          >
                            <span className="text-[10px] uppercase font-bold tracking-wider">
                              {day.dayOfWeek}
                            </span>
                            <span className="text-lg font-black my-0.5">{day.dayNumber}</span>
                            <span
                              className={`text-[9px] uppercase font-semibold ${
                                isClosedDay ? 'text-rose-500/80' : ''
                              }`}
                            >
                              {isClosedDay ? 'Fechado' : day.monthStr}
                            </span>
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {/* Grade de Horários Livres */}
                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-2">
                      2. Selecione o Horário Disponível:
                    </label>

                    {availableSlots.length === 0 ? (
                      <div className="p-6 rounded-2xl bg-muted/40 border border-border text-center text-xs text-muted-foreground">
                        {(() => {
                          const [y, m, d] = activeDate.split('-').map(Number)
                          const checkDate = new Date(y, m - 1, d, 12, 0, 0)
                          const dayConfig = getDayOperatingHours(operatingHours, checkDate)
                          const isBarberAvailable = selectedBarber ? isBarberWorkingOnDay(selectedBarber.id, barberWorkDays, checkDate) : true
                          if (!dayConfig.isOpen) {
                            return 'Barbearia fechada neste dia da semana. Por favor, selecione outra data acima com atendimento ativo.'
                          }
                          if (!isBarberAvailable) {
                            return `${selectedBarber?.name.split(' ')[0]} não está disponível para atendimentos neste dia da semana. Selecione outra data acima.`
                          }
                          return 'Nenhum horário livre encontrado para este dia com o profissional selecionado. Por favor, selecione outra data acima.'
                        })()}
                      </div>
                    ) : (
                      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2.5 max-h-56 overflow-y-auto pr-1">
                        {availableSlots.map((slot) => {
                          const isSelected = selectedTime === slot.time
                          return (
                            <button
                              key={slot.time}
                              type="button"
                              onClick={() => handleSelectTime(slot.time, activeDate)}
                              className={`py-2.5 px-3 rounded-xl border text-xs font-bold font-mono transition-all flex items-center justify-center gap-1 cursor-pointer ${
                                isSelected
                                  ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                                  : 'bg-muted/40 border-border text-foreground hover:bg-muted hover:border-primary/50'
                              }`}
                            >
                              <Clock className="w-3 h-3 text-primary shrink-0" />
                              <span>{slot.time}</span>
                            </button>
                          )
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ============================================================== */}
              {/* PASSO 3: CONFIRMAR DADOS E INFORMAÇÕES DE AGENDAMENTO */}
              {/* ============================================================== */}
              {step === 3 && (
                <form onSubmit={handleConfirmBooking} className="space-y-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm sm:text-base font-bold text-foreground">
                        Confirmar dados e informações de agendamento
                      </h4>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Confira o resumo do seu atendimento e informe seus dados para conclusão imediata.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setStep(2)}
                      className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 cursor-pointer"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                      Alterar horário
                    </button>
                  </div>

                  {/* Card de Resumo Completo */}
                  <div className="p-4 rounded-2xl bg-muted/40 border border-border space-y-3">
                    <div className="flex items-center justify-between border-b border-border pb-3">
                      <div>
                        <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
                          Serviço
                        </span>
                        <div className="font-bold text-foreground text-sm sm:text-base flex items-center gap-2">
                          <Scissors className="w-4 h-4 text-primary" />
                          {selectedService.name}
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
                          Valor
                        </span>
                        <div className="font-extrabold text-primary text-base">
                          {formatPrice(selectedService.price)}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-1 text-xs">
                      <div>
                        <span className="text-muted-foreground block text-[11px]">Especialista</span>
                        <span className="font-bold text-foreground flex items-center gap-1.5 mt-0.5">
                          <User className="w-3.5 h-3.5 text-primary" />
                          {selectedBarber ? selectedBarber.name : 'Primeiro Disponível'}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block text-[11px]">Data & Horário</span>
                        <span className="font-bold text-foreground flex items-center gap-1.5 mt-0.5">
                          <Calendar className="w-3.5 h-3.5 text-primary" />
                          {formatDateFriendly(activeDate)} às {selectedTime}
                        </span>
                      </div>
                      <div className="col-span-2">
                        <span className="text-muted-foreground block text-[11px]">Localização</span>
                        <span className="font-medium text-foreground flex items-center gap-1.5 mt-0.5">
                          <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
                          {tenantAddress || tenantName}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Formulário de Identificação do Cliente */}
                  <div className="space-y-3.5">
                    <div>
                      <label className="block text-xs font-semibold text-foreground mb-1.5">
                        Seu Nome Completo *
                      </label>
                      <div className="relative">
                        <User className="w-4 h-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          required
                          placeholder="Ex: Carlos Eduardo Silva"
                          value={clientName}
                          onChange={(e) => setClientName(e.target.value)}
                          className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-background border border-input text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary transition"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-foreground mb-1.5">
                        WhatsApp para Confirmação *
                      </label>
                      <div className="relative">
                        <Phone className="w-4 h-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="tel"
                          required
                          placeholder="(11) 98765-4321"
                          value={clientPhone}
                          onChange={(e) => handlePhoneChange(e.target.value)}
                          className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-background border border-input text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary transition font-mono"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-foreground mb-1.5">
                        E-mail (Opcional)
                      </label>
                      <div className="relative">
                        <Mail className="w-4 h-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="email"
                          placeholder="seu.email@exemplo.com"
                          value={clientEmail}
                          onChange={(e) => setClientEmail(e.target.value)}
                          className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-background border border-input text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary transition"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-foreground mb-1.5">
                        Observações / Detalhes (Opcional)
                      </label>
                      <input
                        type="text"
                        placeholder="Ex: Prefiro acabamento navalhado, disfarçado alto..."
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-background border border-input text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary transition"
                      />
                    </div>
                  </div>

                  {/* Botões do Rodapé de Confirmação */}
                  <div className="pt-4 border-t border-border flex items-center justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => setStep(2)}
                      disabled={loading}
                      className="px-4 py-2.5 rounded-xl text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition cursor-pointer"
                    >
                      Voltar
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full sm:w-auto px-7 py-3 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-sm transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      {loading ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin text-primary-foreground" />
                          <span>Concluindo agendamento...</span>
                        </>
                      ) : (
                        <>
                          <Check className="w-4 h-4 text-primary-foreground stroke-[3]" />
                          <span>Concluir Agendamento</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}

              {/* ============================================================== */}
              {/* PASSO 4: AGENDAMENTO CONCLUÍDO COM SUCESSO! */}
              {/* ============================================================== */}
              {step === 4 && completedAppointment && (
                <div className="text-center py-6 space-y-6 animate-in zoom-in-95">
                  <div className="w-16 h-16 rounded-full bg-emerald-500/10 border-2 border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 mx-auto shadow-sm">
                    <CheckCircle2 className="w-9 h-9" />
                  </div>

                  <div>
                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 uppercase tracking-wider">
                      Agendamento Confirmado
                    </span>
                    <h4 className="text-2xl font-black text-foreground mt-2">
                      Tudo pronto para seu atendimento!
                    </h4>
                    <p className="text-xs sm:text-sm text-muted-foreground mt-1 max-w-md mx-auto">
                      Seu horário foi reservado no sistema da {tenantName}. Um lembrete foi enviado para o seu WhatsApp.
                    </p>
                  </div>

                  {/* Resumo do Voucher Concluído */}
                  <div className="p-5 rounded-2xl bg-muted/40 border border-border text-left max-w-md mx-auto space-y-3 shadow-sm">
                    <div className="flex items-center justify-between border-b border-border pb-2.5">
                      <span className="font-bold text-foreground text-sm">
                        {completedAppointment.service.name}
                      </span>
                      <span className="font-extrabold text-primary text-sm">
                        {formatPrice(completedAppointment.service.price)}
                      </span>
                    </div>

                    <div className="text-xs space-y-1.5 text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <User className="w-3.5 h-3.5 text-primary" />
                        <span>Profissional: <strong className="text-foreground">{completedAppointment.barber.name}</strong></span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="w-3.5 h-3.5 text-primary" />
                        <span>Data: <strong className="text-foreground">{formatDateFriendly(completedAppointment.dateStr)} às {completedAppointment.timeStr}</strong></span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="w-3.5 h-3.5 text-primary" />
                        <span>Local: <span className="text-foreground">{tenantAddress || tenantName}</span></span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Phone className="w-3.5 h-3.5 text-primary" />
                        <span>Cliente: <span className="text-foreground">{completedAppointment.clientName} ({completedAppointment.clientPhone})</span></span>
                      </div>
                    </div>
                  </div>

                  {/* Ações pós-agendamento */}
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                    {tenantPhone && (
                      <a
                        href={`https://wa.me/55${tenantPhone.replace(/\D/g, '')}?text=${encodeURIComponent(`Olá! Acabei de realizar meu agendamento na ${tenantName}:\n✂️ Serviço: ${completedAppointment.service.name}\n💈 Profissional: ${completedAppointment.barber.name}\n📅 Data: ${formatDateFriendly(completedAppointment.dateStr)} às ${completedAppointment.timeStr}\n👤 Cliente: ${completedAppointment.clientName}`)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition cursor-pointer"
                      >
                        <Phone className="w-4 h-4" />
                        <span>WhatsApp da Unidade</span>
                      </a>
                    )}

                    <a
                      href={getGoogleCalendarUrl()}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-muted hover:bg-muted/80 border border-border text-foreground text-xs font-semibold transition cursor-pointer"
                    >
                      <CalendarCheck className="w-4 h-4 text-primary" />
                      <span>Adicionar ao Google Agenda</span>
                    </a>

                    <button
                      type="button"
                      onClick={() => {
                        setIsModalOpen(false)
                        setStep(1)
                      }}
                      className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs transition cursor-pointer shadow-sm"
                    >
                      Concluir
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
