'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight, Clock, User, Calendar, ArrowLeft, Home } from 'lucide-react'
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
}

interface TimeSlot {
  startTime: Date
  endTime: Date
  isAvailable: boolean
}

export default function AgendarPage() {
  const router = useRouter()
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
    if (mounted) {
      fetchServices()
      fetchBarbers()
    }
  }, [mounted])

  const fetchServices = async () => {
    try {
      console.log('=== BUSCANDO SERVIÇOS DO PRISMA PARA AGENDAMENTO ===')
      
      // Apenas serviços reais do Prisma via API pública
      const response = await fetch('/api/services/public')
      if (response.ok) {
        const data = await response.json()
        console.log('Serviços recebidos do Prisma:', data)
        console.log('Total de serviços do Prisma:', data.length)
        setServices(data)
      } else {
        console.error('Erro ao buscar serviços do Prisma:', response.status, response.statusText)
        // Se falhar, mostrar array vazio - sem dados mockados
        setServices([])
      }
    } catch (error) {
      console.error('Error ao buscar serviços do Prisma:', error)
      // Em caso de erro, mostrar array vazio - sem dados mockados
      setServices([])
    }
  }

  const fetchBarbers = async () => {
    try {
      console.log('=== BUSCANDO BARBEIROS DO PRISMA PARA AGENDAMENTO ===')
      
      // Apenas barbeiros reais do Prisma via API PÚBLICA (sem autenticação)
      const response = await fetch('/api/users/public?role=BARBER')
      if (response.ok) {
        const data = await response.json()
        console.log('Barbeiros recebidos do Prisma:', data)
        console.log('Total de barbeiros do Prisma:', data.length)
        setBarbers(data)
      } else {
        console.error('Erro ao buscar barbeiros do Prisma:', response.status, response.statusText)
        // Se falhar, mostrar array vazio - sem dados mockados
        setBarbers([])
      }
    } catch (error) {
      console.error('Error ao buscar barbeiros do Prisma:', error)
      // Em caso de erro, mostrar array vazio - sem dados mockados
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
      
      // Buscar agendamentos existentes do Prisma para verificar horários ocupados
      const response = await fetch('/api/appointments/public')
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
              endTime: new Date(startTime.getTime() + apt.service.duration * 60000),
              service: { duration: apt.service.duration, price: 0, name: '' },
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
      // Criar cliente primeiro
      const clientResponse = await fetch('/api/clients/public', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ...clientData, name: clientData.name.trim() }),
      })

      let client
      if (clientResponse.ok) {
        client = await clientResponse.json()
      } else {
        // Se já existir, buscar por telefone
        const searchResponse = await fetch(`/api/clients/public?phone=${encodeURIComponent(clientData.phone)}`)
        if (searchResponse.ok) {
          const existingClients = await searchResponse.json()
          client = existingClients[0]
        }
      }

      if (!client) {
        throw new Error('Não foi possível criar/encontrar o cliente')
      }

      // Criar o agendamento usando a API pública
      const appointmentData = {
        clientId: client.id,
        barberId: selectedBarber.id,
        serviceId: selectedService.id,
        startTime: selectedTime.startTime,
        notes: `Agendamento via site - Cliente: ${clientData.name}`,
      }

      console.log('Enviando dados de agendamento:', appointmentData)

      const appointmentResponse = await fetch('/api/appointments/public', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(appointmentData),
      })

      if (appointmentResponse.ok) {
        const appointment = await appointmentResponse.json()
        console.log('Agendamento criado no Prisma:', appointment)
        
        alert('Agendamento realizado com sucesso!\n\n' +
              'Serviço: ' + selectedService.name + '\n' +
              'Barbeiro: ' + selectedBarber.name + '\n' +
              'Data/Hora: ' + selectedTime.startTime.toLocaleString('pt-BR') + '\n' +
              'Cliente: ' + clientData.name + '\n' +
              'Telefone: ' + clientData.phone + '\n' +
              'ID do Agendamento: ' + appointment.id)

        router.push('/')
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

  if (!mounted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-blue-950 to-black py-8">
        <div className="max-w-4xl mx-auto px-4">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-400"></div>
          </div>
        </div>
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
              <span className="ml-2">Barbeiro</span>
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

        {/* Step 2: Select Barber */}
        {step === 2 && (
          <div>
            <h2 className="text-2xl font-bold text-center mb-8 text-white">Escolha o Barbeiro</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {barbers.map((barber) => (
                <div
                  key={barber.id}
                  onClick={() => handleBarberSelect(barber)}
                  className="bg-gradient-to-br from-gray-800/50 to-black/50 border border-white/6 rounded-xl p-6 cursor-pointer hover:bg-white/10 transition-all border-2 border-transparent hover:border-yellow-400/50"
                >
                  <div className="flex items-center">
                    <div className="w-12 h-12 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full flex items-center justify-center">
                      <User className="w-6 h-6 text-black" />
                    </div>
                    <div className="ml-4">
                      <h3 className="text-lg font-semibold text-white">{barber.name}</h3>
                      <p className="text-white/60">{barber.email}</p>
                    </div>
                  </div>
                </div>
              ))}
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
                <div>
                  <p className="text-sm text-white/60">Barbeiro</p>
                  <p className="font-medium text-white">{selectedBarber?.name}</p>
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
