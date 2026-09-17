'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { X, Calendar, Clock, User, DollarSign, Save, Plus, Search } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { calculateAvailableSlots } from '@/lib/appointment-utils'

interface Client {
  id: string
  name: string
  phone: string
  email?: string
}

interface Service {
  id: string
  name: string
  price: number
  duration: number
}

interface Barber {
  id: string
  name: string
  email: string
}

interface AppointmentModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (appointment: any) => void
  appointment?: any
}

export default function AppointmentModal({ isOpen, onClose, onSave, appointment }: AppointmentModalProps) {
  const { user } = useAuth()
  const [formData, setFormData] = useState({
    clientId: '',
    serviceId: '',
    barberId: '',
    startTime: '',
    endTime: '',
    notes: ''
  })
  const [clients, setClients] = useState<Client[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [barbers, setBarbers] = useState<Barber[]>([])
  const [loading, setLoading] = useState(false)
  const [availableSlots, setAvailableSlots] = useState<string[]>([])
  const [selectedDate, setSelectedDate] = useState('')
  const [clientQuery, setClientQuery] = useState('')
  const [showClientResults, setShowClientResults] = useState(false)
  const clientSearchRef = useRef<HTMLDivElement>(null)

  // Check if user is CLIENT
  const isClient = user?.role === 'CLIENT'
  const selectedClientRecord = clients.find((c) => c.id === formData.clientId)

  const filteredClients = useMemo(() => {
    const query = clientQuery.trim().toLowerCase()
    const source = !query
      ? clients
      : clients.filter((client) => {
          const name = client.name?.toLowerCase() || ''
          const phone = client.phone?.replace(/\D/g, '') || ''
          const email = client.email?.toLowerCase() || ''
          const digits = query.replace(/\D/g, '')
          return (
            name.includes(query) ||
            email.includes(query) ||
            (digits.length >= 2 && phone.includes(digits))
          )
        })

    return source.slice(0, 8)
  }, [clients, clientQuery])

  useEffect(() => {
    if (isOpen) {
      // Only fetch clients if not CLIENT role
      if (!isClient) {
        fetchClients()
      }
      fetchServices()
      fetchBarbers()
      
      if (appointment) {
        const startD = new Date(appointment.startTime)
        const endD = new Date(appointment.endTime)
        const dateStr = !isNaN(startD.getTime())
          ? `${startD.getFullYear()}-${String(startD.getMonth() + 1).padStart(2, '0')}-${String(startD.getDate()).padStart(2, '0')}`
          : ''

        setSelectedDate(dateStr)
        setFormData({
          clientId: appointment.client?.id || '',
          serviceId: appointment.service?.id || '',
          barberId: appointment.barber?.id || '',
          startTime: appointment.startTime || '',
          endTime: appointment.endTime || '',
          notes: appointment.notes || ''
        })
        setClientQuery(appointment.client?.name || '')
        if (dateStr && appointment.barber?.id) {
          fetchAvailableSlots(dateStr, appointment.barber.id, appointment.service?.id)
        }
      } else {
        setFormData({
          clientId: isClient ? user?.id || '' : '',
          serviceId: '',
          barberId: '',
          startTime: '',
          endTime: '',
          notes: ''
        })
        setClientQuery('')
      }
      setShowClientResults(false)
    }
  }, [isOpen, appointment, isClient, user?.id])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (clientSearchRef.current && !clientSearchRef.current.contains(event.target as Node)) {
        setShowClientResults(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const fetchClients = async () => {
    try {
      console.log('Buscando clientes...')
      const response = await fetch('/api/clients/all')
      if (response.ok) {
        const data = await response.json()
        console.log('Clientes recebidos:', data)
        setClients(data)
      } else {
        console.error('Erro na resposta:', response.status, response.statusText)
      }
    } catch (error) {
      console.error('Error fetching clients:', error)
    }
  }

  const fetchServices = async () => {
    try {
      console.log('Buscando serviços...')
      const response = await fetch('/api/services/public')
      if (response.ok) {
        const data = await response.json()
        console.log('Serviços recebidos:', data)
        setServices(data)
      } else {
        console.error('Erro na resposta:', response.status, response.statusText)
      }
    } catch (error) {
      console.error('Error fetching services:', error)
    }
  }

  const fetchBarbers = async () => {
    try {
      console.log('Buscando barbeiros...')
      const response = await fetch('/api/users')
      if (response.ok) {
        const data = await response.json()
        console.log('Usuários recebidos:', data)
        const barbers = data.filter((user: any) => user.role === 'BARBER' || user.role === 'ADMIN')
        console.log('Barbeiros filtrados:', barbers)
        setBarbers(barbers)
      } else {
        console.error('Erro na resposta:', response.status, response.statusText)
      }
    } catch (error) {
      console.error('Error fetching barbers:', error)
    }
  }

  const fetchAvailableSlots = async (date: string, barberId: string, serviceId?: string) => {
    try {
      const selectedService = services.find((s) => s.id === (serviceId ?? formData.serviceId))
      // Sem serviço escolhido ainda, usa a menor granularidade (30min) só
      // pra mostrar a grade de horários; assim que o serviço é selecionado,
      // handleInputChange já busca de novo com a duração real.
      const duration = selectedService?.duration || 30

      const response = await fetch(
        `/api/appointments?date=${date}&barberId=${barberId}`
      )

      if (!response.ok) {
        console.error('Erro ao buscar agendamentos existentes:', response.status)
        setAvailableSlots([])
        return
      }

      const existingAppointmentsRaw = await response.json()
      const barberAppointments = (Array.isArray(existingAppointmentsRaw) ? existingAppointmentsRaw : [])
        .filter((apt: any) => apt.status !== 'CANCELLED' && (!appointment?.id || apt.id !== appointment.id))
        .map((apt: any) => ({
          id: apt.id,
          startTime: new Date(apt.startTime),
          endTime: new Date(apt.endTime),
          service: { duration: apt.service.duration, price: 0, name: '' },
          client: { name: '' },
          barber: { name: '' },
        }))

      const dateObj = new Date(`${date}T00:00:00`)
      const slots = calculateAvailableSlots(dateObj, duration, barberAppointments)

      const now = new Date()
      const availableTimes = slots
        .filter((slot) => {
          const isFuture = slot.startTime > now
          const isCurrentSlot = appointment?.startTime && Math.abs(new Date(appointment.startTime).getTime() - slot.startTime.getTime()) < 60000
          return slot.isAvailable && (isFuture || isCurrentSlot)
        })
        .map((slot) => {
          const h = slot.startTime.getHours().toString().padStart(2, '0')
          const m = slot.startTime.getMinutes().toString().padStart(2, '0')
          return `${h}:${m}`
        })

      setAvailableSlots(availableTimes)
    } catch (error) {
      console.error('Error fetching available slots:', error)
      setAvailableSlots([])
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))

    // Auto-calculate end time based on service duration
    if (name === 'serviceId') {
      const selectedService = services.find(s => s.id === value)
      if (selectedService && formData.startTime) {
        const start = new Date(formData.startTime)
        const end = new Date(start.getTime() + selectedService.duration * 60000)
        setFormData(prev => ({
          ...prev,
          endTime: end.toISOString().slice(0, 16)
        }))
      }

      // Recalcula os horários disponíveis já com a duração do serviço
      // escolhido (a grade muda: um serviço mais longo reduz os últimos
      // horários possíveis do dia).
      if (selectedDate && formData.barberId) {
        fetchAvailableSlots(selectedDate, formData.barberId, value)
      }
    }

    // Fetch available slots when date or barber changes
    if (name === 'startTime') {
      const date = value.split('T')[0]
      setSelectedDate(date)
      if (date && formData.barberId) {
        fetchAvailableSlots(date, formData.barberId)
      }
    }

    if (name === 'barberId') {
      if (selectedDate && value) {
        fetchAvailableSlots(selectedDate, value)
      }
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const selectedService = services.find(s => s.id === formData.serviceId) || appointment?.service
      const selectedClient = clients.find(c => c.id === formData.clientId) || appointment?.client
      const selectedBarber = barbers.find(b => b.id === formData.barberId) || appointment?.barber

      if (!formData.serviceId || (!formData.clientId && !isClient && !appointment?.client?.id) || !formData.barberId || !formData.startTime) {
        alert('Por favor, preencha todos os campos obrigatórios')
        setLoading(false)
        return
      }

      const totalAmount = selectedService ? Number(selectedService.price) : Number(appointment?.totalAmount || 0)

      const appointmentData = {
        clientId: formData.clientId || (isClient ? user?.id : appointment?.client?.id),
        serviceId: formData.serviceId,
        barberId: formData.barberId,
        startTime: new Date(formData.startTime),
        endTime: new Date(formData.endTime),
        totalAmount,
        notes: formData.notes
      }

      console.log('Enviando dados do agendamento:', appointmentData)

      if (appointment?.id) {
        const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null
        const authHeaders: Record<string, string> = {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        }

        const response = await fetch(`/api/appointments/${appointment.id}`, {
          method: 'PUT',
          headers: authHeaders,
          credentials: 'include',
          body: JSON.stringify(appointmentData),
        })

        if (response.ok) {
          const result = await response.json()
          console.log('Agendamento atualizado:', result)
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('notification-refresh'))
            try {
              const channel = new BroadcastChannel('barbershop-notifications')
              channel.postMessage({ type: 'APPOINTMENT_UPDATED' })
              channel.close()
            } catch {}
          }
          onSave(result)
          onClose()
        } else {
          const error = await response.json()
          console.error('Erro ao atualizar:', error)
          alert(error.error || 'Erro ao atualizar agendamento')
        }
      } else {
        // Create new appointment
        const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null
        const authHeaders: Record<string, string> = {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        }

        const response = await fetch('/api/appointments', {
          method: 'POST',
          headers: authHeaders,
          credentials: 'include',
          body: JSON.stringify(appointmentData),
        })

        if (response.ok) {
          const result = await response.json()
          console.log('Agendamento criado:', result)
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('notification-refresh'))
            try {
              const channel = new BroadcastChannel('barbershop-notifications')
              channel.postMessage({ type: 'APPOINTMENT_CREATED' })
              channel.close()
            } catch {}
          }
          onSave(result)
          onClose()
        } else {
          const error = await response.json()
          console.error('Erro ao criar:', error)
          alert(error.error || 'Erro ao criar agendamento')
        }
      }
    } catch (error) {
      console.error('Error saving appointment:', error)
      alert('Erro ao salvar agendamento')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 md:p-6 safe-area-top safe-area-bottom">
      <div className="modal-responsive bg-gradient-to-br from-gray-900 to-black border border-white/10 rounded-xl md:rounded-2xl p-4 md:p-6 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-4 md:mb-6">
          <h2 className="text-xl md:text-2xl font-bold text-white">
            {appointment ? 'Editar Agendamento' : 'Novo Agendamento'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-all"
            aria-label="Fechar modal"
          >
            <X className="w-4 h-4 md:w-5 md:h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 md:space-y-6">
          {/* Client search - ADMIN/BARBER (not logged as CLIENT) */}
          {!isClient && (
            <div ref={clientSearchRef} className="relative">
              <label className="block text-white/80 text-xs md:text-sm font-medium mb-1.5 md:mb-2">
                Cliente *
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 md:w-5 md:h-5 text-white/40" />
                <input
                  type="search"
                  value={clientQuery}
                  onChange={(e) => {
                    const value = e.target.value
                    setClientQuery(value)
                    setShowClientResults(true)

                    const exactMatch = clients.find(
                      (client) => client.name.toLowerCase() === value.trim().toLowerCase()
                    )
                    setFormData((prev) => ({
                      ...prev,
                      clientId: exactMatch?.id || ''
                    }))
                  }}
                  onFocus={() => setShowClientResults(true)}
                  className="w-full pl-9 md:pl-10 pr-4 py-2.5 md:py-3 bg-white/5 border border-white/10 rounded-lg md:rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-yellow-400/50 focus:bg-white/10 transition-all text-sm md:text-base"
                  placeholder="Buscar cliente por nome..."
                  autoComplete="off"
                />
              </div>

              {showClientResults && (
                <div className="absolute z-20 mt-1 w-full max-h-56 overflow-y-auto rounded-lg md:rounded-xl border border-white/10 bg-gray-900 shadow-xl">
                  {filteredClients.length > 0 ? (
                    filteredClients.map((client) => (
                      <button
                        key={client.id}
                        type="button"
                        onClick={() => {
                          setFormData((prev) => ({ ...prev, clientId: client.id }))
                          setClientQuery(client.name)
                          setShowClientResults(false)
                        }}
                        className={`w-full text-left px-3 py-2.5 hover:bg-white/10 transition-all ${
                          formData.clientId === client.id ? 'bg-yellow-400/10' : ''
                        }`}
                      >
                        <p className="text-white text-sm font-medium truncate">{client.name}</p>
                        <p className="text-white/50 text-xs truncate">
                          {client.phone}
                          {client.email ? ` · ${client.email}` : ''}
                        </p>
                      </button>
                    ))
                  ) : (
                    <p className="px-3 py-3 text-white/50 text-sm">
                      {clients.length === 0
                        ? 'Nenhum cliente cadastrado'
                        : 'Nenhum cliente encontrado'}
                    </p>
                  )}
                </div>
              )}

              {selectedClientRecord && (
                <p className="text-white/50 text-xs mt-1.5">
                  Selecionado: {selectedClientRecord.name} — {selectedClientRecord.phone}
                </p>
              )}
            </div>
          )}

          {/* Client Info Display - Only for CLIENT */}
          {isClient && (
            <div>
              <label className="block text-white/80 text-xs md:text-sm font-medium mb-1.5 md:mb-2">
                Cliente
              </label>
              <div className="w-full px-3 md:px-4 py-2.5 md:py-3 bg-white/5 border border-white/10 rounded-lg md:rounded-xl text-white">
                <div className="flex items-center space-x-2 md:space-x-3">
                  <div className="w-7 h-7 md:w-8 md:h-8 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-black font-bold text-xs md:text-sm">
                      {user?.name?.charAt(0).toUpperCase() || 'U'}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-white font-medium text-sm md:text-base truncate">{user?.name || 'Usuário'}</p>
                    <p className="text-white/60 text-xs md:text-sm truncate">{user?.email || 'Email não informado'}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Service Selection */}
          <div>
            <label className="block text-white/80 text-xs md:text-sm font-medium mb-1.5 md:mb-2">
              Serviço *
            </label>
            <select
              name="serviceId"
              value={formData.serviceId}
              onChange={handleInputChange}
              className="w-full px-3 md:px-4 py-2.5 md:py-3 bg-white/5 border border-white/10 rounded-lg md:rounded-xl text-white focus:outline-none focus:border-yellow-400/50 focus:bg-white/10 transition-all text-sm md:text-base"
              required
            >
              <option value="" className="bg-gray-900">Selecione um serviço</option>
              {services.map(service => (
                <option key={service.id} value={service.id} className="bg-gray-900">
                  {service.name} - {new Intl.NumberFormat('pt-BR', {
                    style: 'currency',
                    currency: 'BRL',
                  }).format(service.price)} ({service.duration}min)
                </option>
              ))}
            </select>
          </div>

          {/* Barber Selection */}
          <div>
            <label className="block text-white/80 text-xs md:text-sm font-medium mb-1.5 md:mb-2">
              Barbeiro *
            </label>
            <select
              name="barberId"
              value={formData.barberId}
              onChange={handleInputChange}
              className="w-full px-3 md:px-4 py-2.5 md:py-3 bg-white/5 border border-white/10 rounded-lg md:rounded-xl text-white focus:outline-none focus:border-yellow-400/50 focus:bg-white/10 transition-all text-sm md:text-base"
              required
            >
              <option value="" className="bg-gray-900">Selecione um barbeiro</option>
              {barbers.map(barber => (
                <option key={barber.id} value={barber.id} className="bg-gray-900">
                  {barber.name}
                </option>
              ))}
            </select>
          </div>

          {/* Date Selection */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
            <div>
              <label className="block text-white/80 text-xs md:text-sm font-medium mb-1.5 md:mb-2">
                Data *
              </label>
              <input
                type="date"
                name="date"
                value={selectedDate}
                onChange={(e) => {
                  setSelectedDate(e.target.value)
                  if (e.target.value && formData.barberId) {
                    fetchAvailableSlots(e.target.value, formData.barberId)
                  }
                }}
                min={new Date().toISOString().split('T')[0]} // Prevent past dates
                className="w-full px-3 md:px-4 py-2.5 md:py-3 bg-white/5 border border-white/10 rounded-lg md:rounded-xl text-white focus:outline-none focus:border-yellow-400/50 focus:bg-white/10 transition-all text-sm md:text-base"
                required
              />
            </div>
            <div>
              <label className="block text-white/80 text-xs md:text-sm font-medium mb-1.5 md:mb-2">
                Horário Término *
              </label>
              <input
                type="datetime-local"
                name="endTime"
                value={formData.endTime}
                onChange={handleInputChange}
                min={formData.startTime || new Date().toISOString().slice(0, 16)} // Must be after start time
                className="w-full px-3 md:px-4 py-2.5 md:py-3 bg-white/5 border border-white/10 rounded-lg md:rounded-xl text-white focus:outline-none focus:border-yellow-400/50 focus:bg-white/10 transition-all text-sm md:text-base"
                required
                readOnly // Auto-calculated based on service duration
              />
            </div>
          </div>

          {/* Available Time Slots */}
          {selectedDate && formData.barberId && (
            <div>
              <label className="block text-white/80 text-xs md:text-sm font-medium mb-1.5 md:mb-2">
                Horários Disponíveis *
              </label>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-1.5 md:gap-2 max-h-32 md:max-h-40 overflow-y-auto">
                {availableSlots.length > 0 ? (
                  availableSlots.map((slot) => (
                    <button
                      key={slot}
                      type="button"
                      onClick={() => {
                        const dateTime = `${selectedDate}T${slot}:00`
                        setFormData(prev => ({ ...prev, startTime: dateTime }))
                        
                        // Auto-calculate end time
                        const selectedService = services.find(s => s.id === formData.serviceId)
                        if (selectedService) {
                          const start = new Date(dateTime)
                          const end = new Date(start.getTime() + selectedService.duration * 60000)
                          setFormData(prev => ({ 
                            ...prev, 
                            endTime: end.toISOString().slice(0, 16)
                          }))
                        }
                      }}
                      className={`px-2 md:px-3 py-1.5 md:py-2 text-xs md:text-sm rounded-lg border transition-all ${
                        formData.startTime === `${selectedDate}T${slot}:00`
                          ? 'bg-yellow-400/20 border-yellow-400 text-yellow-400'
                          : 'bg-white/5 border-white/10 text-white/80 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      {slot}
                    </button>
                  ))
                ) : (
                  <div className="col-span-full text-center py-3 md:py-4">
                    <p className="text-white/60 text-xs md:text-sm">Nenhum horário disponível</p>
                  </div>
                )}
              </div>
              <p className="text-white/40 text-xs mt-1.5 md:mt-2">
                Horários de atendimento: 08:00 - 20:00 (intervalos de 30min)
              </p>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block text-white/80 text-xs md:text-sm font-medium mb-1.5 md:mb-2">
              Observações
            </label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleInputChange}
              rows={3}
              className="w-full px-3 md:px-4 py-2.5 md:py-3 bg-white/5 border border-white/10 rounded-lg md:rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-yellow-400/50 focus:bg-white/10 transition-all resize-none text-sm md:text-base"
              placeholder="Observações sobre o agendamento..."
            />
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end space-y-2 sm:space-y-0 sm:space-x-4 pt-4 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="px-4 md:px-6 py-2.5 md:py-3 text-white/80 hover:text-white border border-white/20 rounded-lg md:rounded-xl hover:bg-white/10 transition-all text-sm md:text-base"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 md:px-6 py-2.5 md:py-3 bg-gradient-to-r from-yellow-400 to-yellow-600 text-black font-semibold rounded-lg md:rounded-xl hover:from-yellow-500 hover:to-yellow-700 transition-all flex items-center justify-center space-x-2 disabled:opacity-50 text-sm md:text-base"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-black"></div>
              ) : (
                <Save className="w-4 h-4" />
              )}
              <span>{appointment ? 'Atualizar' : 'Salvar'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
