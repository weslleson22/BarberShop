'use client'

import { useState, useEffect } from 'react'
import { X, Calendar, Clock, User, DollarSign, Save, Plus } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'

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

  // Check if user is CLIENT
  const isClient = user?.role === 'CLIENT'

  useEffect(() => {
    if (isOpen) {
      // Only fetch clients if not CLIENT role
      if (!isClient) {
        fetchClients()
      }
      fetchServices()
      fetchBarbers()
      
      if (appointment) {
        setFormData({
          clientId: appointment.client?.id || '',
          serviceId: appointment.service?.id || '',
          barberId: appointment.barber?.id || '',
          startTime: appointment.startTime || '',
          endTime: appointment.endTime || '',
          notes: appointment.notes || ''
        })
      } else {
        setFormData({
          clientId: isClient ? user?.id || '' : '',
          serviceId: '',
          barberId: '',
          startTime: '',
          endTime: '',
          notes: ''
        })
      }
    }
  }, [isOpen, appointment, isClient, user?.id])

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

  const fetchAvailableSlots = async (date: string, barberId: string) => {
    try {
      console.log('Buscando horários disponíveis para:', date, barberId)
      
      // Generate time slots from 8:00 to 20:00
      const slots = []
      const workingHours = {
        start: 8, // 8:00 AM
        end: 20   // 8:00 PM
      }
      
      for (let hour = workingHours.start; hour < workingHours.end; hour++) {
        for (let minute = 0; minute < 60; minute += 30) {
          const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
          slots.push(time)
        }
      }
      
      // Filter out booked slots (mock implementation)
      // In production, this would check against actual appointments
      const availableSlots = slots.filter(slot => {
        // Mock: some slots are unavailable
        const mockUnavailable = ['09:00', '10:30', '14:00', '15:30', '16:00']
        return !mockUnavailable.includes(slot)
      })
      
      console.log('Horários disponíveis:', availableSlots)
      setAvailableSlots(availableSlots)
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
      const selectedService = services.find(s => s.id === formData.serviceId)
      const selectedClient = clients.find(c => c.id === formData.clientId)
      const selectedBarber = barbers.find(b => b.id === formData.barberId)

      if (!selectedService || !selectedClient || !selectedBarber) {
        alert('Por favor, preencha todos os campos obrigatórios')
        setLoading(false)
        return
      }

      const appointmentData = {
        clientId: formData.clientId,
        serviceId: formData.serviceId,
        barberId: formData.barberId,
        startTime: new Date(formData.startTime),
        endTime: new Date(formData.endTime),
        totalAmount: selectedService.price,
        notes: formData.notes
      }

      console.log('Enviando dados do agendamento:', appointmentData)

      if (appointment?.id) {
        // Update existing appointment
        const response = await fetch(`/api/appointments/${appointment.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(appointmentData),
        })

        if (response.ok) {
          const result = await response.json()
          console.log('Agendamento atualizado:', result)
          onSave(result)
          onClose()
        } else {
          const error = await response.json()
          console.error('Erro ao atualizar:', error)
          alert(error.error || 'Erro ao atualizar agendamento')
        }
      } else {
        // Create new appointment
        const response = await fetch('/api/appointments', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(appointmentData),
        })

        if (response.ok) {
          const result = await response.json()
          console.log('Agendamento criado:', result)
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
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-gradient-to-br from-gray-900 to-black border border-white/10 rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white">
            {appointment ? 'Editar Agendamento' : 'Novo Agendamento'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Client Selection - Only show for ADMIN/BARBER */}
          {!isClient && (
            <div>
              <label className="block text-white/80 text-sm font-medium mb-2">
                Cliente *
              </label>
              <select
                name="clientId"
                value={formData.clientId}
                onChange={handleInputChange}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-yellow-400/50 focus:bg-white/10 transition-all"
                required
              >
                <option value="" className="bg-gray-900">Selecione um cliente</option>
                {clients.map(client => (
                  <option key={client.id} value={client.id} className="bg-gray-900">
                    {client.name} - {client.phone}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Client Info Display - Only for CLIENT */}
          {isClient && (
            <div>
              <label className="block text-white/80 text-sm font-medium mb-2">
                Cliente
              </label>
              <div className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full flex items-center justify-center">
                    <span className="text-black font-bold text-sm">
                      {user?.name?.charAt(0).toUpperCase() || 'U'}
                    </span>
                  </div>
                  <div>
                    <p className="text-white font-medium">{user?.name || 'Usuário'}</p>
                    <p className="text-white/60 text-sm">{user?.email || 'Email não informado'}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Service Selection */}
          <div>
            <label className="block text-white/80 text-sm font-medium mb-2">
              Serviço *
            </label>
            <select
              name="serviceId"
              value={formData.serviceId}
              onChange={handleInputChange}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-yellow-400/50 focus:bg-white/10 transition-all"
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
            <label className="block text-white/80 text-sm font-medium mb-2">
              Barbeiro *
            </label>
            <select
              name="barberId"
              value={formData.barberId}
              onChange={handleInputChange}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-yellow-400/50 focus:bg-white/10 transition-all"
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
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-white/80 text-sm font-medium mb-2">
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
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-yellow-400/50 focus:bg-white/10 transition-all"
                required
              />
            </div>
            <div>
              <label className="block text-white/80 text-sm font-medium mb-2">
                Horário Término *
              </label>
              <input
                type="datetime-local"
                name="endTime"
                value={formData.endTime}
                onChange={handleInputChange}
                min={formData.startTime || new Date().toISOString().slice(0, 16)} // Must be after start time
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-yellow-400/50 focus:bg-white/10 transition-all"
                required
                readOnly // Auto-calculated based on service duration
              />
            </div>
          </div>

          {/* Available Time Slots */}
          {selectedDate && formData.barberId && (
            <div>
              <label className="block text-white/80 text-sm font-medium mb-2">
                Horários Disponíveis *
              </label>
              <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 max-h-40 overflow-y-auto">
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
                      className={`px-3 py-2 text-sm rounded-lg border transition-all ${
                        formData.startTime === `${selectedDate}T${slot}:00`
                          ? 'bg-yellow-400/20 border-yellow-400 text-yellow-400'
                          : 'bg-white/5 border-white/10 text-white/80 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      {slot}
                    </button>
                  ))
                ) : (
                  <div className="col-span-full text-center py-4">
                    <p className="text-white/60">Nenhum horário disponível</p>
                  </div>
                )}
              </div>
              <p className="text-white/40 text-xs mt-2">
                Horários de atendimento: 08:00 - 20:00 (intervalos de 30min)
              </p>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block text-white/80 text-sm font-medium mb-2">
              Observações
            </label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleInputChange}
              rows={3}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-yellow-400/50 focus:bg-white/10 transition-all resize-none"
              placeholder="Observações sobre o agendamento..."
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end space-x-4 pt-4 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 text-white/80 hover:text-white border border-white/20 rounded-xl hover:bg-white/10 transition-all"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3 bg-gradient-to-r from-yellow-400 to-yellow-600 text-black font-semibold rounded-xl hover:from-yellow-500 hover:to-yellow-700 transition-all flex items-center space-x-2 disabled:opacity-50"
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
