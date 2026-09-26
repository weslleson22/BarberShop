'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { ArrowRight, Clock, User, Calendar, ArrowLeft, Home, Star, Award, CheckCircle2, Scissors, Sparkles, Shield } from 'lucide-react'
import Link from 'next/link'
import DropdownHeader from '@/components/shared/DropdownHeader'
import { maskPhone, maskName as maskNameShared, maskEmail as maskEmailShared } from '@/lib/utils'
import { calculateAvailableSlots } from '@/lib/appointment-utils'

const NAME_MAX = 50
const EMAIL_MAX = 80

const maskName = (value: string) => maskNameShared(value, NAME_MAX)
const maskEmail = (value: string) => maskEmailShared(value, EMAIL_MAX)

interface Service {
  id: string
  name: string
  description?: string
  price: number
  duration: number
}

interface Barber {
  id: string
  name: string
  email: string
  avatar?: string
  bio?: string | null
  specialties?: string[]
  phone?: string
}

interface TimeSlot {
  startTime: Date
  endTime: Date
  isAvailable: boolean
}

export default function AgendarPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const [step, setStep] = useState(1)
  const [services, setServices] = useState<Service[]>([])
  const [barbers, setBarbers] = useState<Barber[]>([])
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([])
  const [loading, setLoading] = useState(false)
  const [mounted, setMounted] = useState(false)

  // Form data
  const [selectedService, setSelectedService] = useState<Service | null>(null)
  const [selectedBarber, setSelectedBarber] = useState<Barber | null>(null)
  const [selectedDate, setSelectedDate] = useState<string>('')
  const [selectedTime, setSelectedTime] = useState<TimeSlot | null>(null)
  const [clientData, setClientData] = useState({
    name: '',
    phone: '',
    email: '',
  })

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (user) {
      setClientData((prev) => ({
        name: prev.name || user.name || '',
        email: prev.email || user.email || '',
        phone: prev.phone || user.phone || '',
      }))
    }
  }, [user])

  useEffect(() => {
    if (mounted) {
      fetchServices()
      fetchBarbers()
    }
  }, [mounted, user?.barbershopId])

  const getTenantParam = () => {
    const searchParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null
    const slug = searchParams?.get('slug')
    const shopId = user?.barbershopId || searchParams?.get('barbershopId')
    if (slug) return `slug=${encodeURIComponent(slug)}`
    if (shopId) return `barbershopId=${encodeURIComponent(shopId)}`
    return null
  }

  const fetchServices = async () => {
    try {
      console.log('=== BUSCANDO SERVIÇOS DO PRISMA PARA AGENDAMENTO ===')
      const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null
      const authHeaders: Record<string, string> = {
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      }
      const tenantParam = getTenantParam()
      const url = tenantParam ? `/api/services/public?${tenantParam}` : '/api/services/public'

      // Apenas serviços reais do Prisma via API pública filtrada por barbearia
      const response = await fetch(url, {
        headers: authHeaders,
        credentials: 'include',
      })
      if (response.ok) {
        const data = await response.json()
        const activeServices = (Array.isArray(data) ? data : []).filter((s: any) => s.isActive !== false)
        console.log('Serviços recebidos do Prisma:', activeServices)
        console.log('Total de serviços ativos:', activeServices.length)
        setServices(activeServices)
      } else {
        console.error('Erro ao buscar serviços do Prisma:', response.status, response.statusText)
        setServices([])
      }
    } catch (error) {
      console.error('Error ao buscar serviços do Prisma:', error)
      setServices([])
    }
  }

  const fetchBarbers = async () => {
    try {
      console.log('=== BUSCANDO BARBEIROS DO PRISMA PARA AGENDAMENTO ===')
      const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null
      const authHeaders: Record<string, string> = {
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      }
      const tenantParam = getTenantParam()
      const url = tenantParam
        ? `/api/users/public?role=BARBER&${tenantParam}`
        : '/api/users/public?role=BARBER'

      const response = await fetch(url, {
        headers: authHeaders,
        credentials: 'include',
      })
      if (response.ok) {
        const data = await response.json()
        console.log('Barbeiros recebidos do Prisma:', data)
        console.log('Total de barbeiros do Prisma:', data.length)
        setBarbers(Array.isArray(data) ? data : [])
      } else {
        console.error('Erro ao buscar barbeiros do Prisma:', response.status, response.statusText)
        setBarbers([])
      }
    } catch (error) {
      console.error('Error ao buscar barbeiros do Prisma:', error)
      setBarbers([])
    }
  }

  const fetchAvailableSlots = async (date: string) => {
    if (!selectedBarber || !selectedService) return

    setLoading(true)
    try {
      console.log('=== BUSCANDO HORÁRIOS DISPONÍVEIS DO PRISMA ===')
      console.log('Barbeiro:', selectedBarber.name)
      console.log('Data:', date)
      console.log('Serviço:', selectedService.name)
      
      const tenantParam = getTenantParam()
      const aptUrl = `/api/appointments/public?barberId=${selectedBarber.id}&date=${date}${tenantParam ? `&${tenantParam}` : ''}`

      const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null
      const authHeaders: Record<string, string> = {
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      }

      // Buscar agendamentos existentes do Prisma para verificar horários ocupados
      const response = await fetch(aptUrl, {
        headers: authHeaders,
        credentials: 'include',
      })
      if (response.ok) {
        const existingAppointmentsRaw = await response.json()

        // Só interessa os agendamentos deste barbeiro, ainda não cancelados
        const barberAppointments = existingAppointmentsRaw
          .filter((apt: any) => apt.barberId === selectedBarber.id && apt.status !== 'CANCELLED')
          .map((apt: any) => {
            const startTime = new Date(apt.startTime)
            return {
              id: apt.id,
              startTime,
              endTime: new Date(startTime.getTime() + (apt.service?.duration || 30) * 60000),
              service: { duration: apt.service?.duration || 30, price: 0, name: '' },
              client: { name: '' },
              barber: { name: '' },
            }
          })

        // Gera os horários (08:00-20:00) considerando a duração real do
        // serviço selecionado — o último horário possível é aquele cujo
        // término não ultrapassa 20:00.
        const dateObj = new Date(date + 'T00:00:00')
        const slots = calculateAvailableSlots(dateObj, selectedService.duration, barberAppointments)

        const now = new Date()
        const availableSlots = slots.map((slot) => ({
          ...slot,
          isAvailable: slot.isAvailable && slot.startTime > now,
        }))

        setAvailableSlots(availableSlots)
      } else {
        console.error('Erro ao buscar agendamentos do Prisma:', response.status)
        setAvailableSlots([])
      }
    } catch (error) {
      console.error('Error ao buscar horários do Prisma:', error)
      setAvailableSlots([])
    } finally {
      setLoading(false)
    }
  }

  const handleServiceSelect = (service: Service) => {
    setSelectedService(service)
    setStep(2)
  }

  const handleBarberSelect = (barber: Barber) => {
    setSelectedBarber(barber)
    setStep(3)
  }

  const handleDateSelect = (date: string) => {
    setSelectedDate(date)
    fetchAvailableSlots(date)
  }

  const handleTimeSelect = (timeSlot: TimeSlot) => {
    setSelectedTime(timeSlot)
  }

  const handleBooking = async () => {
    if (!selectedService || !selectedBarber || !selectedTime || !clientData.name.trim() || !clientData.phone) {
      alert('Por favor, preencha todos os campos obrigatórios')
      return
    }

    if (clientData.name.trim().length > NAME_MAX) {
      alert(`O nome deve ter no máximo ${NAME_MAX} caracteres`)
      return
    }

    if (clientData.phone.replace(/\D/g, '').length < 10) {
      alert('Informe um telefone válido com DDD')
      return
    }

    if (clientData.email && !/^[a-z0-9._%+\-]+@[a-z0-9.-]+\.[a-z]{2,}$/.test(clientData.email)) {
      alert('Informe um e-mail válido')
      return
    }

    setLoading(true)
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null
      const authHeaders: Record<string, string> = {
        'Content-Type': 'application/json',
      }
      if (token) {
        authHeaders['Authorization'] = `Bearer ${token}`
      }

      const searchParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null
      const slug = searchParams?.get('slug')
      const shopId = user?.barbershopId || searchParams?.get('barbershopId')

      // Criar ou buscar cliente
      const clientResponse = await fetch('/api/clients/public', {
        method: 'POST',
        headers: authHeaders,
        credentials: 'include',
        body: JSON.stringify({ 
          ...clientData, 
          name: clientData.name.trim(),
          userId: user?.id,
          slug,
          barbershopId: shopId,
        }),
      })

      let client
      if (clientResponse.ok) {
        client = await clientResponse.json()
      } else {
        // Se já existir, buscar por telefone com o tenant correspondente
        const tenantParam = getTenantParam()
        const searchUrl = `/api/clients/public?phone=${encodeURIComponent(clientData.phone)}${tenantParam ? `&${tenantParam}` : ''}`
        const searchResponse = await fetch(searchUrl, {
          headers: authHeaders,
          credentials: 'include',
        })
        if (searchResponse.ok) {
          const existingClients = await searchResponse.json()
          client = existingClients[0]
        }
      }

      if (!client) {
        throw new Error('Não foi possível criar/encontrar o cliente')
      }

      // Criar o agendamento usando a API pública com vinculação correta da barbearia
      const appointmentData = {
        clientId: client.id,
        barberId: selectedBarber.id,
        serviceId: selectedService.id,
        startTime: selectedTime.startTime,
        barbershopId: shopId || undefined,
        slug: slug || undefined,
        notes: `Agendamento via site - Cliente: ${clientData.name}`,
      }

      console.log('Enviando dados de agendamento:', appointmentData)

      const appointmentResponse = await fetch('/api/appointments/public', {
        method: 'POST',
        headers: authHeaders,
        credentials: 'include',
        body: JSON.stringify(appointmentData),
      })

      if (appointmentResponse.ok) {
        const appointment = await appointmentResponse.json()
        console.log('Agendamento criado no Prisma:', appointment)
        
        // Notificar sininho em tempo real (mesma aba e outras abas abertas)
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('notification-refresh'))
          try {
            const bc = new BroadcastChannel('barbershop-notifications')
            bc.postMessage({ type: 'APPOINTMENT_CREATED', appointmentId: appointment.id })
            bc.close()
          } catch {}
        }

        alert('Agendamento realizado com sucesso!\n\n' +
              'Serviço: ' + selectedService.name + '\n' +
              'Profissional: ' + selectedBarber.name + '\n' +
              'Data/Hora: ' + selectedTime.startTime.toLocaleString('pt-BR') + '\n' +
              'Cliente: ' + clientData.name + '\n' +
              'Telefone: ' + clientData.phone + '\n' +
              'ID do Agendamento: ' + appointment.id)

        if (user?.role === 'CLIENT') {
          router.push('/meus-agendamentos')
        } else {
          router.push('/dashboard')
        }
      } else {
        const error = await appointmentResponse.json()
        alert(error.error || 'Erro ao realizar agendamento')
      }
    } catch (error) {
      console.error('Error creating appointment:', error)
      alert('Erro ao realizar agendamento. Tente novamente.')
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

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const getMinDate = () => {
    const today = new Date()
    return today.toISOString().split('T')[0]
  }

  if (!mounted || authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-blue-950 to-black py-8 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-400"></div>
      </div>
    )
  }

  // Agendamento exclusivo para clientes cadastrados com login de cliente
  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-blue-950 to-black pt-20 flex flex-col justify-between">
        <DropdownHeader />
        <main className="flex-1 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-gray-900/90 border border-yellow-500/30 rounded-2xl p-6 sm:p-8 backdrop-blur-xl text-center shadow-2xl">
            <div className="w-16 h-16 rounded-2xl bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center mx-auto mb-4 text-yellow-400">
              <User className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold text-white mb-2">Acesso Exclusivo para Clientes</h2>
            <p className="text-sm text-gray-300 mb-6 leading-relaxed">
              O agendamento de horários online é exclusivo para clientes cadastrados com login de cliente. Por favor, faça login com sua conta para continuar.
            </p>
            <div className="space-y-3">
              <Link
                href="/login?redirect=/agendar"
                className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-gradient-to-r from-yellow-400 to-yellow-600 hover:from-yellow-500 hover:to-yellow-700 text-black font-semibold rounded-xl text-sm transition-all shadow-lg shadow-yellow-500/20"
              >
                <span>Entrar com Login de Cliente</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/"
                className="w-full flex items-center justify-center py-2.5 px-4 bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white rounded-xl text-xs font-medium transition"
              >
                Voltar para a Página Inicial
              </Link>
            </div>
          </div>
        </main>
      </div>
    )
  }

  // Usuários com outras roles (ADMIN, DEVELOPER, BARBER)
  if (user.role !== 'CLIENT') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-blue-950 to-black pt-20 flex flex-col justify-between">
        <DropdownHeader />
        <main className="flex-1 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-gray-900/90 border border-blue-500/30 rounded-2xl p-6 sm:p-8 backdrop-blur-xl text-center shadow-2xl">
            <div className="w-16 h-16 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mx-auto mb-4 text-blue-400">
              <Shield className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold text-white mb-2">Área Exclusiva de Clientes</h2>
            <p className="text-sm text-gray-300 mb-6 leading-relaxed">
              Você está conectado como <strong>{user.role}</strong>. O agendamento online através desta tela é destinado exclusivamente a usuários cadastrados como <strong>Cliente</strong>.
              Administradores e profissionais devem gerenciar os horários no painel de controle.
            </p>
            <div className="space-y-3">
              <Link
                href={user.role === 'DEVELOPER' ? '/developer' : '/dashboard'}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-semibold rounded-xl text-sm transition-all shadow-lg shadow-blue-500/20"
              >
                <span>Ir para o Painel de Gestão</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/"
                className="w-full flex items-center justify-center py-2.5 px-4 bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white rounded-xl text-xs font-medium transition"
              >
                Voltar para a Página Inicial
              </Link>
            </div>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-blue-950 to-black pt-20">
      {/* Header Fixo no Topo */}
      <DropdownHeader />
      
      {/* Conteúdo principal */}
      <div className="w-full px-4 md:px-6">
        <div className="max-w-4xl mx-auto">
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-center space-x-4">
            <div className={`flex items-center ${step >= 1 ? 'text-yellow-400' : 'text-white/40'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 1 ? 'bg-gradient-to-r from-yellow-400 to-yellow-600 text-black' : 'bg-white/10'}`}>
                1
              </div>
              <span className="ml-2">Serviço</span>
            </div>
            <ArrowRight className="w-4 h-4 text-white/40" />
            <div className={`flex items-center ${step >= 2 ? 'text-yellow-400' : 'text-white/40'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 2 ? 'bg-gradient-to-r from-yellow-400 to-yellow-600 text-black' : 'bg-white/10'}`}>
                2
              </div>
              <span className="ml-2">Profissional</span>
            </div>
            <ArrowRight className="w-4 h-4 text-white/40" />
            <div className={`flex items-center ${step >= 3 ? 'text-yellow-400' : 'text-white/40'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 3 ? 'bg-gradient-to-r from-yellow-400 to-yellow-600 text-black' : 'bg-white/10'}`}>
                3
              </div>
              <span className="ml-2">Horário</span>
            </div>
          </div>
        </div>

        {/* Step 1: Select Service */}
        {step === 1 && (
          <div>
            <h2 className="text-2xl font-bold text-center mb-8 text-white">Escolha o Serviço</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {services.map((service) => (
                <div
                  key={service.id}
                  onClick={() => handleServiceSelect(service)}
                  className="bg-gradient-to-br from-gray-800/50 to-black/50 border border-white/6 rounded-xl p-6 cursor-pointer hover:bg-white/10 transition-all border-2 border-transparent hover:border-yellow-400/50"
                >
                  <h3 className="text-lg font-semibold mb-2 text-white">{service.name}</h3>
                  {service.description && (
                    <p className="text-white/60 mb-4">{service.description}</p>
                  )}
                  <div className="flex justify-between items-center">
                    <span className="text-xl font-bold text-yellow-400">
                      {formatCurrency(service.price)}
                    </span>
                    <div className="flex items-center text-white/60">
                      <Clock className="w-4 h-4 mr-1" />
                      {service.duration}min
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: Select Professional */}
        {step === 2 && (
          <div>
            <div className="text-center mb-8">
              <span className="text-yellow-400 text-xs font-bold uppercase tracking-widest px-3 py-1 bg-yellow-400/10 border border-yellow-400/20 rounded-full inline-block mb-3">
                Passo 2 de 3
              </span>
              <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">Escolha o Profissional</h2>
              <p className="text-white/60 text-sm md:text-base max-w-lg mx-auto">
                Selecione o profissional especialista para realizar seu atendimento
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
              {barbers.map((barber) => {
                const isSelected = selectedBarber?.id === barber.id
                return (
                  <div
                    key={barber.id}
                    onClick={() => handleBarberSelect(barber)}
                    className={`relative group bg-gradient-to-br from-gray-800/60 to-black/60 border rounded-2xl p-5 md:p-6 cursor-pointer transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 ${
                      isSelected
                        ? 'border-yellow-400 ring-2 ring-yellow-400/40 bg-yellow-400/5'
                        : 'border-white/10 hover:border-yellow-400/50 hover:bg-white/[0.04]'
                    }`}
                  >
                    {/* Header do Card com Foto, Status e Informações */}
                    <div className="flex items-start gap-4">
                      {/* Avatar / Foto */}
                      <div className="relative flex-shrink-0">
                        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden bg-gradient-to-br from-yellow-400 to-yellow-600 p-0.5 shadow-lg shadow-black/50">
                          <div className="w-full h-full bg-gray-900 rounded-[14px] overflow-hidden flex items-center justify-center">
                            {barber.avatar ? (
                              <img
                                src={barber.avatar}
                                alt={barber.name}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              />
                            ) : (
                              <span className="text-yellow-400 font-bold text-2xl">
                                {barber.name.charAt(0).toUpperCase()}
                              </span>
                            )}
                          </div>
                        </div>
                        {/* Status Disponível */}
                        <div className="absolute -bottom-1.5 -right-1.5 bg-emerald-950 border border-emerald-500/40 px-2 py-0.5 rounded-full flex items-center gap-1 shadow-md">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          <span className="text-[10px] font-semibold text-emerald-300">Ativo</span>
                        </div>
                      </div>

                      {/* Nome, Título e Avaliação */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <h3 className="text-lg sm:text-xl font-bold text-white group-hover:text-yellow-400 transition-colors truncate">
                            {barber.name}
                          </h3>
                          {isSelected && (
                            <span className="flex items-center gap-1 text-[11px] font-bold text-yellow-400 bg-yellow-400/10 border border-yellow-400/30 px-2 py-0.5 rounded-full flex-shrink-0">
                              <CheckCircle2 className="w-3 h-3" />
                              Selecionado
                            </span>
                          )}
                        </div>

                        <p className="text-yellow-400/90 text-xs font-medium mb-2 flex items-center gap-1.5">
                          <Award className="w-3.5 h-3.5 flex-shrink-0" />
                          Profissional Especialista
                        </p>

                        <div className="flex items-center gap-2 text-xs text-white/70">
                          <div className="flex items-center text-yellow-400">
                            <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400 mr-1" />
                            <span className="font-bold text-white text-xs">4.9</span>
                          </div>
                          <span className="text-white/30">•</span>
                          <span className="text-white/60 text-xs">Atendimento Premium</span>
                        </div>
                      </div>
                    </div>

                    {/* Descrição / Bio Real do Profissional */}
                    <div className="mt-4 pt-3 border-t border-white/5">
                      <p className="text-white/70 text-xs sm:text-sm leading-relaxed line-clamp-2">
                        {barber.bio || 'Profissional especialista em atendimento personalizado e serviços de alta qualidade.'}
                      </p>
                    </div>

                    {/* Especialidades / Tags Reais do Profissional */}
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {barber.specialties && barber.specialties.length > 0 ? (
                        barber.specialties.map((spec) => (
                          <span
                            key={spec}
                            className="px-2.5 py-1 rounded-lg text-[11px] font-medium bg-yellow-400/10 text-yellow-300 border border-yellow-400/20"
                          >
                            ✦ {spec}
                          </span>
                        ))
                      ) : (
                        <>
                          <span className="px-2.5 py-1 rounded-lg text-[11px] font-medium bg-white/5 text-white/80 border border-white/10">
                            ✂️ Atendimento Especializado
                          </span>
                          <span className="px-2.5 py-1 rounded-lg text-[11px] font-medium bg-white/5 text-white/80 border border-white/10">
                            ⭐ Serviços Personalizados
                          </span>
                        </>
                      )}
                    </div>

                    {/* Botão de Seleção */}
                    <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between">
                      <span className="text-white/40 text-xs">
                        {barber.phone ? `Contato: ${barber.phone}` : 'Atendimento por horário'}
                      </span>
                      <button
                        type="button"
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-yellow-400 text-black shadow-md shadow-yellow-400/20'
                            : 'bg-white/10 text-white group-hover:bg-yellow-400 group-hover:text-black'
                        }`}
                      >
                        {isSelected ? 'Selecionado' : 'Escolher Profissional'}
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Step 3: Select Date and Time */}
        {step === 3 && (
          <div>
            <h2 className="text-2xl font-bold text-center mb-8 text-white">Escolha o Horário</h2>
            
            {/* Selected Service and Barber Summary */}
            <div className="bg-gradient-to-br from-gray-800/50 to-black/50 border border-white/6 rounded-xl p-4 mb-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-white/60">Serviço</p>
                  <p className="font-medium text-white">{selectedService?.name}</p>
                  <p className="text-yellow-400">{selectedService && formatCurrency(selectedService.price)}</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full overflow-hidden bg-gradient-to-br from-yellow-400 to-yellow-600 flex items-center justify-center flex-shrink-0 border border-yellow-400/30">
                    {selectedBarber?.avatar ? (
                      <img src={selectedBarber.avatar} alt={selectedBarber.name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-black font-bold text-xs">{selectedBarber?.name?.charAt(0).toUpperCase()}</span>
                    )}
                  </div>
                  <div>
                    <p className="text-xs text-white/60">Profissional</p>
                    <p className="font-semibold text-white text-sm">{selectedBarber?.name}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Date Selection */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-white/80 mb-2">
                Data
              </label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => handleDateSelect(e.target.value)}
                min={getMinDate()}
                className="w-full px-4 py-3 bg-white/5 border border-white/6 rounded-xl text-white focus:ring-2 focus:ring-yellow-400/50 focus:border-yellow-400/50 transition-all"
              />
            </div>

            {/* Time Selection */}
            {selectedDate && (
              <div className="mb-6">
                <label className="block text-sm font-medium text-white/80 mb-2">
                  Horários Disponíveis
                </label>
                {loading ? (
                  <div className="text-center py-4">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-400 mx-auto"></div>
                    <p className="mt-2 text-white/60">Carregando horários...</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
                    {availableSlots.map((slot, index) => (
                      <button
                        key={index}
                        onClick={() => handleTimeSelect(slot)}
                        disabled={!slot.isAvailable}
                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-all border ${
                          selectedTime === slot
                            ? 'bg-gradient-to-r from-yellow-400 to-yellow-600 text-black border-yellow-400'
                            : slot.isAvailable
                            ? 'bg-white/5 border-white/10 text-white hover:bg-white/10 hover:border-yellow-400/50 cursor-pointer'
                            : 'bg-white/5 border-white/5 text-white/30 cursor-not-allowed'
                        }`}
                      >
                        {formatTime(slot.startTime)}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Client Information */}
            {selectedTime && (
              <div className="bg-gradient-to-br from-gray-800/50 to-black/50 border border-white/6 rounded-xl p-6">
                <h3 className="text-lg font-semibold mb-4 text-white">Seus Dados</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-white/80 mb-1">
                      Nome *
                    </label>
                    <input
                      type="text"
                      value={clientData.name}
                      onChange={(e) => setClientData({ ...clientData, name: maskName(e.target.value) })}
                      maxLength={NAME_MAX}
                      className="w-full px-4 py-3 bg-white/5 border border-white/6 rounded-xl text-white placeholder-white/40 focus:ring-2 focus:ring-yellow-400/50 focus:border-yellow-400/50 transition-all"
                      placeholder="Seu nome completo"
                    />
                    <p className="mt-1 text-xs text-white/40 text-right">
                      {clientData.name.length}/{NAME_MAX}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-white/80 mb-1">
                      Telefone *
                    </label>
                    <input
                      type="tel"
                      inputMode="numeric"
                      value={clientData.phone}
                      onChange={(e) => setClientData({ ...clientData, phone: maskPhone(e.target.value) })}
                      maxLength={15}
                      className="w-full px-4 py-3 bg-white/5 border border-white/6 rounded-xl text-white placeholder-white/40 focus:ring-2 focus:ring-yellow-400/50 focus:border-yellow-400/50 transition-all"
                      placeholder="(00) 00000-0000"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-white/80 mb-1">
                      E-mail
                    </label>
                    <input
                      type="email"
                      value={clientData.email}
                      onChange={(e) => setClientData({ ...clientData, email: maskEmail(e.target.value) })}
                      maxLength={EMAIL_MAX}
                      className="w-full px-4 py-3 bg-white/5 border border-white/6 rounded-xl text-white placeholder-white/40 focus:ring-2 focus:ring-yellow-400/50 focus:border-yellow-400/50 transition-all"
                      placeholder="seu@email.com"
                    />
                  </div>
                </div>

                <button
                  onClick={handleBooking}
                  disabled={loading || !clientData.name.trim() || clientData.phone.replace(/\D/g, '').length < 10}
                  className="w-full mt-6 bg-gradient-to-r from-yellow-400 to-yellow-600 text-black py-3 px-4 rounded-xl font-medium hover:from-yellow-500 hover:to-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {loading ? 'Agendando...' : 'Confirmar Agendamento'}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Back Button */}
        {step > 1 && (
          <button
            onClick={() => setStep(step - 1)}
            className="mt-6 mb-8 text-white/60 hover:text-yellow-400 font-medium transition-colors"
          >
            ← Voltar
          </button>
        )}
        </div>
      </div>
    </div>
  )
}
