'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight, Clock, User, Calendar, ArrowLeft, Home } from 'lucide-react'
import { BackButton } from '@/components/shared/Navigation'
import Link from 'next/link'

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
        const existingAppointments = await response.json()
        console.log('Agendamentos existentes no Prisma:', existingAppointments)
        
        // Gerar horários disponíveis baseado nos agendamentos existentes
        const allSlots = [
          { startTime: new Date(date + 'T08:00:00'), endTime: new Date(date + 'T08:30:00') },
          { startTime: new Date(date + 'T08:30:00'), endTime: new Date(date + 'T09:00:00') },
          { startTime: new Date(date + 'T09:00:00'), endTime: new Date(date + 'T09:30:00') },
          { startTime: new Date(date + 'T09:30:00'), endTime: new Date(date + 'T10:00:00') },
          { startTime: new Date(date + 'T10:00:00'), endTime: new Date(date + 'T10:30:00') },
          { startTime: new Date(date + 'T10:30:00'), endTime: new Date(date + 'T11:00:00') },
          { startTime: new Date(date + 'T11:00:00'), endTime: new Date(date + 'T11:30:00') },
          { startTime: new Date(date + 'T14:00:00'), endTime: new Date(date + 'T14:30:00') },
          { startTime: new Date(date + 'T14:30:00'), endTime: new Date(date + 'T15:00:00') },
          { startTime: new Date(date + 'T15:00:00'), endTime: new Date(date + 'T15:30:00') },
          { startTime: new Date(date + 'T15:30:00'), endTime: new Date(date + 'T16:00:00') },
          { startTime: new Date(date + 'T16:00:00'), endTime: new Date(date + 'T16:30:00') },
        ]
        
        // Verificar quais horários estão disponíveis
        const availableSlots = allSlots.map(slot => {
          // Verificar se este horário conflita com algum agendamento existente
          const isBooked = existingAppointments.some((apt: any) => {
            const aptStart = new Date(apt.startTime)
            const aptEnd = new Date(aptStart.getTime() + apt.service.duration * 60000)
            const slotStart = slot.startTime
            const slotEnd = slot.endTime
            
            // Verificar sobreposição de horários
            return (slotStart < aptEnd && slotEnd > aptStart)
          })
          
          return {
            ...slot,
            isAvailable: !isBooked
          }
        })
        
        console.log('Horários disponíveis calculados:', availableSlots.filter(s => s.isAvailable).length)
        setAvailableSlots(availableSlots)
      } else {
        console.error('Erro ao buscar agendamentos do Prisma:', response.status)
        // Se falhar, mostrar todos como disponíveis - sem mockados fixos
        const defaultSlots = [
          { startTime: new Date(date + 'T08:00:00'), endTime: new Date(date + 'T08:30:00'), isAvailable: true },
          { startTime: new Date(date + 'T08:30:00'), endTime: new Date(date + 'T09:00:00'), isAvailable: true },
          { startTime: new Date(date + 'T09:00:00'), endTime: new Date(date + 'T09:30:00'), isAvailable: true },
          { startTime: new Date(date + 'T09:30:00'), endTime: new Date(date + 'T10:00:00'), isAvailable: true },
          { startTime: new Date(date + 'T10:00:00'), endTime: new Date(date + 'T10:30:00'), isAvailable: true },
          { startTime: new Date(date + 'T10:30:00'), endTime: new Date(date + 'T11:00:00'), isAvailable: true },
        ]
        setAvailableSlots(defaultSlots)
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
    if (!selectedService || !selectedBarber || !selectedTime || !clientData.name || !clientData.phone) {
      alert('Por favor, preencha todos os campos obrigatórios')
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
        body: JSON.stringify(clientData),
      })

      let client
      if (clientResponse.ok) {
        client = await clientResponse.json()
      } else {
        // Se já existir, buscar por telefone
        const searchResponse = await fetch(`/api/clients/public?phone=${clientData.phone}`)
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
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      {/* Botões de navegação */}
      <div className="absolute top-4 left-4 flex space-x-2">
        <button
          onClick={() => router.back()}
          className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors"
          title="Voltar"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Voltar</span>
        </button>
        <Link
          href="/"
          className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors"
          title="Página Inicial"
        >
          <Home className="w-4 h-4" />
          <span>Home</span>
        </Link>
      </div>
      
      <div className="max-w-4xl mx-auto px-4 pt-16">
        <BackButton href="/">Voltar para página inicial</BackButton>
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-center space-x-4">
            <div className={`flex items-center ${step >= 1 ? 'text-blue-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 1 ? 'bg-blue-600 text-white' : 'bg-gray-300'}`}>
                1
              </div>
              <span className="ml-2">Serviço</span>
            </div>
            <ArrowRight className="w-4 h-4 text-gray-400" />
            <div className={`flex items-center ${step >= 2 ? 'text-blue-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 2 ? 'bg-blue-600 text-white' : 'bg-gray-300'}`}>
                2
              </div>
              <span className="ml-2">Barbeiro</span>
            </div>
            <ArrowRight className="w-4 h-4 text-gray-400" />
            <div className={`flex items-center ${step >= 3 ? 'text-blue-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 3 ? 'bg-blue-600 text-white' : 'bg-gray-300'}`}>
                3
              </div>
              <span className="ml-2">Horário</span>
            </div>
          </div>
        </div>

        {/* Step 1: Select Service */}
        {step === 1 && (
          <div>
            <h2 className="text-2xl font-bold text-center mb-8">Escolha o Serviço</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {services.map((service) => (
                <div
                  key={service.id}
                  onClick={() => handleServiceSelect(service)}
                  className="bg-white rounded-lg shadow-md p-6 cursor-pointer hover:shadow-lg transition-shadow border-2 border-transparent hover:border-blue-500"
                >
                  <h3 className="text-lg font-semibold mb-2">{service.name}</h3>
                  {service.description && (
                    <p className="text-gray-600 mb-4">{service.description}</p>
                  )}
                  <div className="flex justify-between items-center">
                    <span className="text-xl font-bold text-blue-600">
                      {formatCurrency(service.price)}
                    </span>
                    <div className="flex items-center text-gray-500">
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
            <h2 className="text-2xl font-bold text-center mb-8">Escolha o Barbeiro</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {barbers.map((barber) => (
                <div
                  key={barber.id}
                  onClick={() => handleBarberSelect(barber)}
                  className="bg-white rounded-lg shadow-md p-6 cursor-pointer hover:shadow-lg transition-shadow border-2 border-transparent hover:border-blue-500"
                >
                  <div className="flex items-center">
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                      <User className="w-6 h-6 text-blue-600" />
                    </div>
                    <div className="ml-4">
                      <h3 className="text-lg font-semibold">{barber.name}</h3>
                      <p className="text-gray-600">{barber.email}</p>
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
            <h2 className="text-2xl font-bold text-center mb-8">Escolha o Horário</h2>
            
            {/* Selected Service and Barber Summary */}
            <div className="bg-white rounded-lg shadow-md p-4 mb-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Serviço</p>
                  <p className="font-medium">{selectedService?.name}</p>
                  <p className="text-blue-600">{selectedService && formatCurrency(selectedService.price)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Barbeiro</p>
                  <p className="font-medium">{selectedBarber?.name}</p>
                </div>
              </div>
            </div>

            {/* Date Selection */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Data
              </label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => handleDateSelect(e.target.value)}
                min={getMinDate()}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>

            {/* Time Selection */}
            {selectedDate && (
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Horários Disponíveis
                </label>
                {loading ? (
                  <div className="text-center py-4">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-2 text-gray-600">Carregando horários...</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
                    {availableSlots.map((slot, index) => (
                      <button
                        key={index}
                        onClick={() => handleTimeSelect(slot)}
                        disabled={!slot.isAvailable}
                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                          slot.isAvailable
                            ? 'bg-white border border-gray-300 hover:bg-blue-50 hover:border-blue-500 cursor-pointer'
                            : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        } ${selectedTime === slot ? 'bg-blue-600 text-white' : ''}`}
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
              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-lg font-semibold mb-4">Seus Dados</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nome *
                    </label>
                    <input
                      type="text"
                      value={clientData.name}
                      onChange={(e) => setClientData({ ...clientData, name: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Seu nome completo"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Telefone *
                    </label>
                    <input
                      type="tel"
                      value={clientData.phone}
                      onChange={(e) => setClientData({ ...clientData, phone: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="(00) 00000-0000"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      E-mail
                    </label>
                    <input
                      type="email"
                      value={clientData.email}
                      onChange={(e) => setClientData({ ...clientData, email: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="seu@email.com"
                    />
                  </div>
                </div>

                <button
                  onClick={handleBooking}
                  disabled={loading || !clientData.name || !clientData.phone}
                  className="w-full mt-6 bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
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
            className="mt-6 text-gray-600 hover:text-gray-800 font-medium"
          >
            ← Voltar
          </button>
        )}
      </div>
    </div>
  )
}
