'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { X, Calendar, Clock, User, DollarSign, Save, Plus, Search, Crown, Phone, Mail, Users, AlertTriangle, RefreshCw } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { calculateAvailableSlots } from '@/lib/appointment-utils'

function maskPhone(value: string) {
  const cleaned = value.replace(/\D/g, '')
  if (cleaned.length <= 2) return cleaned
  if (cleaned.length <= 7) return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2)}`
  return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7, 11)}`
}

interface Client {
  id: string
  name: string
  phone: string
  email?: string
  isVip?: boolean
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
  const [clientMode, setClientMode] = useState<'registered' | 'unregistered'>('registered')
  const [unregisteredName, setUnregisteredName] = useState('')
  const [unregisteredPhone, setUnregisteredPhone] = useState('')
  const [unregisteredEmail, setUnregisteredEmail] = useState('')
  const [isVip, setIsVip] = useState(false)
  const [clients, setClients] = useState<Client[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [barbers, setBarbers] = useState<Barber[]>([])
  const [loading, setLoading] = useState(false)
  const [availableSlots, setAvailableSlots] = useState<string[]>([])
  const [selectedDate, setSelectedDate] = useState('')
  const [clientQuery, setClientQuery] = useState('')
  const [showClientResults, setShowClientResults] = useState(false)
  const [conflictError, setConflictError] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
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
        setIsVip(Boolean(appointment.isVip || appointment.client?.isVip))
        setClientMode('registered')
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
        setIsVip(false)
        setClientMode('registered')
        setUnregisteredName('')
        setUnregisteredPhone('')
        setUnregisteredEmail('')
      }
      setShowClientResults(false)
      setConflictError(null)
      setFormError(null)
    }
  }, [isOpen, appointment, isClient, user?.id, user?.barbershopId])

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
      const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null
      const authHeaders: Record<string, string> = {
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      }
      const response = await fetch('/api/clients/all', {
        headers: authHeaders,
        credentials: 'include',
      })
      if (response.ok) {
        const data = await response.json()
        console.log('Clientes recebidos:', data)
        setClients(Array.isArray(data) ? data : [])
      } else {
        console.error('Erro na resposta:', response.status, response.statusText)
      }
    } catch (error) {
      console.error('Error fetching clients:', error)
    }
  }

  const fetchServices = async () => {
    try {
      console.log('Buscando serviços da barbearia do usuário...')
      const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null
      const authHeaders: Record<string, string> = {
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      }
      const shopId = user?.barbershopId
      const url = shopId ? `/api/services?active=true` : `/api/services/public`
      const response = await fetch(url, {
        headers: authHeaders,
        credentials: 'include',
      })
      if (response.ok) {
        const data = await response.json()
        console.log('Serviços recebidos:', data)
        setServices(Array.isArray(data) ? data.filter((s: any) => s.isActive !== false) : [])
      } else {
        console.error('Erro na resposta:', response.status, response.statusText)
      }
    } catch (error) {
      console.error('Error fetching services:', error)
    }
  }

  const fetchBarbers = async () => {
    try {
      console.log('Buscando barbeiros da barbearia do usuário...')
      const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null
      const authHeaders: Record<string, string> = {
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      }
      const response = await fetch('/api/users?role=BARBER', {
        headers: authHeaders,
        credentials: 'include',
      })
      if (response.ok) {
        const data = await response.json()
        const barbers = (Array.isArray(data) ? data : []).filter((u: any) => (u.role === 'BARBER' || u.role === 'ADMIN') && u.isActive !== false)
        console.log('Barbeiros filtrados:', barbers)
        setBarbers(barbers)
      } else if (isClient) {
        const shopId = user?.barbershopId
        const pubUrl = shopId ? `/api/users/public?role=BARBER&barbershopId=${encodeURIComponent(shopId)}` : `/api/users/public?role=BARBER`
        const pubRes = await fetch(pubUrl, {
          headers: authHeaders,
          credentials: 'include',
        })
        if (pubRes.ok) {
          const pubData = await pubRes.json()
          setBarbers(Array.isArray(pubData) ? pubData : [])
        }
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
      const duration = selectedService?.duration || 30

      const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null
      const authHeaders: Record<string, string> = {
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      }
      const response = await fetch(
        `/api/appointments?date=${date}&barberId=${barberId}`,
        {
          headers: authHeaders,
          credentials: 'include',
        }
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
      const selectedBarber = barbers.find(b => b.id === formData.barberId) || appointment?.barber

      let effectiveClientId = formData.clientId || (isClient ? user?.id : appointment?.client?.id)

      // Se for criação e o atendente escolheu "Cliente Não Cadastrado", cria o cliente no ato
      if (!isClient && clientMode === 'unregistered' && !appointment?.id) {
        const trimmedName = unregisteredName.trim()
        const phoneDigits = unregisteredPhone.replace(/\D/g, '')

        if (!trimmedName || trimmedName.length < 3) {
          alert('Por favor, informe o nome completo do cliente (mínimo 3 caracteres)')
          setLoading(false)
          return
        }

        if (phoneDigits.length < 10 || phoneDigits.length > 11) {
          alert('Por favor, informe um telefone válido com DDD (formato (00) 00000-0000)')
          setLoading(false)
          return
        }

        const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null
        const authHeaders: Record<string, string> = {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        }

        const clientResponse = await fetch('/api/clients/public', {
          method: 'POST',
          headers: authHeaders,
          credentials: 'include',
          body: JSON.stringify({
            name: trimmedName,
            phone: unregisteredPhone,
            email: unregisteredEmail.trim() || undefined,
            isVip: isVip,
            barbershopId: user?.barbershopId,
          }),
        })

        if (!clientResponse.ok) {
          const clientErr = await clientResponse.json().catch(() => ({}))
          setFormError(clientErr.error || 'Erro ao cadastrar cliente')
          setLoading(false)
          return
        }

        const createdClient = await clientResponse.json()
        effectiveClientId = createdClient.id
      }

      if (!formData.serviceId || (!effectiveClientId && !isClient) || !formData.barberId || !formData.startTime) {
        setFormError('Por favor, preencha todos os campos obrigatórios (Serviço, Barbeiro, Horário).')
        setLoading(false)
        return
      }

      const totalAmount = selectedService ? Number(selectedService.price) : Number(appointment?.totalAmount || 0)

      const appointmentData = {
        clientId: effectiveClientId,
        serviceId: formData.serviceId,
        barberId: formData.barberId,
        startTime: new Date(formData.startTime),
        endTime: new Date(formData.endTime),
        totalAmount,
        notes: formData.notes,
        isVip: isVip,
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
          const error = await response.json().catch(() => ({}))
          console.error('Erro ao atualizar:', error)
          if (response.status === 409 || error.code === 'CONFLICT') {
            setConflictError('Este horário acabou de ser reservado por outro cliente. Por favor, escolha outro horário.')
            setFormData(prev => ({ ...prev, startTime: '', endTime: '' }))
            if (selectedDate && formData.barberId) {
              fetchAvailableSlots(selectedDate, formData.barberId, formData.serviceId)
            }
          } else {
            setFormError(error.error || 'Erro ao atualizar agendamento')
          }
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
          const error = await response.json().catch(() => ({}))
          console.error('Erro ao criar:', error)
          if (response.status === 409 || error.code === 'CONFLICT') {
            setConflictError('Este horário acabou de ser reservado por outro cliente. Por favor, selecione outro horário disponível.')
            setFormData(prev => ({ ...prev, startTime: '', endTime: '' }))
            if (selectedDate && formData.barberId) {
              fetchAvailableSlots(selectedDate, formData.barberId, formData.serviceId)
            }
          } else {
            setFormError(error.error || 'Erro ao criar agendamento')
          }
        }
      }
    } catch (error) {
      console.error('Error saving appointment:', error)
      setFormError('Erro de conexão ao salvar agendamento. Verifique sua rede e tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 md:p-6 safe-area-top safe-area-bottom backdrop-blur-sm animate-fadeIn">
      <div className="modal-responsive bg-card text-card-foreground border border-border rounded-xl md:rounded-2xl p-4 md:p-6 max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-4 md:mb-6 pb-3 border-b border-border">
          <h2 className="text-xl md:text-2xl font-bold text-foreground">
            {appointment ? 'Editar Agendamento' : 'Novo Agendamento'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-all cursor-pointer"
            aria-label="Fechar modal"
          >
            <X className="w-4 h-4 md:w-5 md:h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 md:space-y-6">
          {/* Conflict Alert (HTTP 409) */}
          {conflictError && (
            <div className="p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-start gap-3 text-amber-700 dark:text-amber-300">
              <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
              <div className="flex-1 text-sm">
                <p className="font-semibold text-amber-600 dark:text-amber-300">Conflito de Horário</p>
                <p className="text-xs mt-0.5">{conflictError}</p>
                {selectedDate && formData.barberId && (
                  <button
                    type="button"
                    onClick={() => {
                      fetchAvailableSlots(selectedDate, formData.barberId, formData.serviceId)
                      setConflictError(null)
                    }}
                    className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-700 dark:text-amber-300 transition-colors cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Atualizar horários disponíveis
                  </button>
                )}
              </div>
            </div>
          )}

          {/* General Form Error */}
          {formError && !conflictError && (
            <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-xl flex items-center justify-between text-destructive text-sm">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-destructive shrink-0" />
                <span className="text-xs font-medium">{formError}</span>
              </div>
              <button
                type="button"
                onClick={() => setFormError(null)}
                className="text-destructive hover:opacity-80 text-xs ml-2 cursor-pointer"
              >
                ✕
              </button>
            </div>
          )}

          {/* Client Selection - ADMIN/BARBER/RECEPTIONIST */}
          {!isClient && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="block text-foreground text-xs md:text-sm font-medium">
                  Cliente *
                </label>
                {!appointment && (
                  <div className="flex items-center bg-muted border border-border rounded-lg p-0.5">
                    <button
                      type="button"
                      onClick={() => setClientMode('registered')}
                      className={`px-2.5 py-1 text-xs rounded-md font-medium transition-all cursor-pointer ${
                        clientMode === 'registered'
                          ? 'bg-primary text-primary-foreground shadow-sm font-semibold'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      Cadastrado
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setClientMode('unregistered')
                        setFormData((prev) => ({ ...prev, clientId: '' }))
                      }}
                      className={`px-2.5 py-1 text-xs rounded-md font-medium transition-all cursor-pointer ${
                        clientMode === 'unregistered'
                          ? 'bg-primary text-primary-foreground shadow-sm font-semibold'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      Não Cadastrado
                    </button>
                  </div>
                )}
              </div>

              {clientMode === 'registered' ? (
                <div ref={clientSearchRef} className="relative">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 md:w-5 md:h-5 text-muted-foreground" />
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
                        if (exactMatch) {
                          setIsVip(Boolean(exactMatch.isVip))
                        }
                      }}
                      onFocus={() => setShowClientResults(true)}
                      className="w-full pl-9 md:pl-10 pr-4 py-2 bg-background border border-input rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring transition-all text-xs md:text-sm"
                      placeholder="Buscar cliente por nome..."
                      autoComplete="off"
                    />
                  </div>

                  {showClientResults && (
                    <div className="absolute z-20 mt-1 w-full max-h-56 overflow-y-auto rounded-lg border border-border bg-popover text-popover-foreground shadow-xl">
                      {filteredClients.length > 0 ? (
                        filteredClients.map((client) => (
                          <button
                            key={client.id}
                            type="button"
                            onClick={() => {
                              setFormData((prev) => ({ ...prev, clientId: client.id }))
                              setClientQuery(client.name)
                              setIsVip(Boolean(client.isVip))
                              setShowClientResults(false)
                            }}
                            className={`w-full text-left px-3 py-2.5 hover:bg-accent hover:text-accent-foreground transition-all cursor-pointer ${
                              formData.clientId === client.id ? 'bg-accent/80' : ''
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <p className="text-foreground text-sm font-medium truncate">{client.name}</p>
                              {Boolean(client.isVip) && (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                                  <Crown className="w-2.5 h-2.5" />
                                  VIP
                                </span>
                              )}
                            </div>
                            <p className="text-muted-foreground text-xs truncate">
                              {client.phone}
                              {client.email ? ` · ${client.email}` : ''}
                            </p>
                          </button>
                        ))
                      ) : (
                        <div className="p-3 text-center">
                          <p className="text-muted-foreground text-xs">
                            {clients.length === 0
                              ? 'Nenhum cliente cadastrado'
                              : 'Nenhum cliente encontrado'}
                          </p>
                          <button
                            type="button"
                            onClick={() => {
                              setShowClientResults(false)
                              setClientMode('unregistered')
                              setUnregisteredName(clientQuery)
                            }}
                            className="mt-2 text-xs text-primary hover:underline inline-flex items-center gap-1 cursor-pointer"
                          >
                            <Plus className="w-3 h-3" />
                            Cadastrar como cliente não cadastrado
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {selectedClientRecord && (
                    <div className="mt-2.5 p-3 bg-muted/40 border border-border rounded-lg">
                      <div className="flex items-center justify-between">
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-foreground text-xs md:text-sm font-semibold truncate">
                              {selectedClientRecord.name}
                            </span>
                            {Boolean(selectedClientRecord.isVip) && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                                <Crown className="w-2.5 h-2.5" />
                                VIP
                              </span>
                            )}
                          </div>
                          <p className="text-muted-foreground text-xs mt-0.5">{selectedClientRecord.phone}</p>
                        </div>
                        {/* Toggle VIP para cliente selecionado */}
                        <div className="flex items-center gap-2 pl-2 border-l border-border">
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Crown className="w-3.5 h-3.5 text-amber-500" />
                            VIP:
                          </span>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={isVip}
                              onChange={(e) => setIsVip(e.target.checked)}
                              className="sr-only peer"
                            />
                            <div className="w-9 h-5 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-primary-foreground after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-card after:border-border after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
                          </label>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                /* Cliente Não Cadastrado */
                <div className="space-y-3 p-3.5 bg-muted/30 border border-border rounded-lg">
                  <div>
                    <label className="block text-foreground text-xs font-medium mb-1">
                      Nome Completo *
                    </label>
                    <input
                      type="text"
                      value={unregisteredName}
                      onChange={(e) => setUnregisteredName(e.target.value)}
                      placeholder="Nome do cliente"
                      className="w-full px-3 py-2 bg-background border border-input rounded-lg text-foreground text-xs md:text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-foreground text-xs font-medium mb-1">
                      Telefone com DDD *
                    </label>
                    <input
                      type="tel"
                      value={unregisteredPhone}
                      onChange={(e) => setUnregisteredPhone(maskPhone(e.target.value))}
                      placeholder="(00) 00000-0000"
                      maxLength={15}
                      className="w-full px-3 py-2 bg-background border border-input rounded-lg text-foreground text-xs md:text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-foreground text-xs font-medium mb-1">
                      E-mail (opcional)
                    </label>
                    <input
                      type="email"
                      value={unregisteredEmail}
                      onChange={(e) => setUnregisteredEmail(e.target.value.toLowerCase().replace(/\s/g, ''))}
                      placeholder="cliente@email.com"
                      className="w-full px-3 py-2 bg-background border border-input rounded-lg text-foreground text-xs md:text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                    />
                  </div>

                  {/* Toggle VIP para cliente não cadastrado */}
                  <div className="flex items-center justify-between p-2.5 bg-amber-500/10 border border-amber-500/20 rounded-lg mt-2">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-md bg-amber-500/20 flex items-center justify-center">
                        <Crown className="w-3.5 h-3.5 text-amber-500" />
                      </div>
                      <div>
                        <p className="text-foreground text-xs font-semibold">Cliente VIP</p>
                        <p className="text-muted-foreground text-[10px]">Marcar como cliente VIP prioritário</p>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isVip}
                        onChange={(e) => setIsVip(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-primary-foreground after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-card after:border-border after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
                    </label>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Client Info Display - Only for CLIENT */}
          {isClient && (
            <div>
              <label className="block text-foreground text-xs md:text-sm font-medium mb-1.5 md:mb-2">
                Cliente
              </label>
              <div className="w-full px-3 md:px-4 py-2.5 bg-muted/40 border border-border rounded-lg text-foreground">
                <div className="flex items-center space-x-2 md:space-x-3">
                  <div className="w-7 h-7 md:w-8 md:h-8 bg-primary/10 text-primary font-bold rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-xs md:text-sm">
                      {user?.name?.charAt(0).toUpperCase() || 'U'}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-foreground font-medium text-sm md:text-base truncate">{user?.name || 'Usuário'}</p>
                    <p className="text-muted-foreground text-xs md:text-sm truncate">{user?.email || 'Email não informado'}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Service Selection */}
          <div>
            <label className="block text-foreground text-xs md:text-sm font-medium mb-1.5 md:mb-2">
              Serviço *
            </label>
            <select
              name="serviceId"
              value={formData.serviceId}
              onChange={handleInputChange}
              className="w-full px-3 md:px-4 py-2 bg-background border border-input rounded-lg text-foreground focus:outline-none focus:ring-1 focus:ring-ring transition-all text-xs md:text-sm cursor-pointer"
              required
            >
              <option value="" className="bg-popover text-popover-foreground">Selecione um serviço</option>
              {services.map(service => (
                <option key={service.id} value={service.id} className="bg-popover text-popover-foreground">
                  {service.name} - {new Intl.NumberFormat('pt-BR', {
                    style: 'currency',
                    currency: 'BRL',
                  }).format(service.price)} ({service.duration}min)
                </option>
              ))}
            </select>
          </div>

          {/* Barber/Professional Selection */}
          <div>
            <label className="block text-foreground text-xs md:text-sm font-medium mb-1.5 md:mb-2">
              Profissional *
            </label>
            <select
              name="barberId"
              value={formData.barberId}
              onChange={handleInputChange}
              className="w-full px-3 md:px-4 py-2 bg-background border border-input rounded-lg text-foreground focus:outline-none focus:ring-1 focus:ring-ring transition-all text-xs md:text-sm cursor-pointer"
              required
            >
              <option value="" className="bg-popover text-popover-foreground">Selecione um profissional</option>
              {barbers.map(barber => (
                <option key={barber.id} value={barber.id} className="bg-popover text-popover-foreground">
                  {barber.name}
                </option>
              ))}
            </select>
          </div>

          {/* Date Selection */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
            <div>
              <label className="block text-foreground text-xs md:text-sm font-medium mb-1.5 md:mb-2">
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
                min={new Date().toISOString().split('T')[0]}
                className="w-full px-3 md:px-4 py-2 bg-background border border-input rounded-lg text-foreground focus:outline-none focus:ring-1 focus:ring-ring transition-all text-xs md:text-sm"
                required
              />
            </div>
            <div>
              <label className="block text-foreground text-xs md:text-sm font-medium mb-1.5 md:mb-2">
                Horário Término *
              </label>
              <input
                type="datetime-local"
                name="endTime"
                value={formData.endTime}
                onChange={handleInputChange}
                min={formData.startTime || new Date().toISOString().slice(0, 16)}
                className="w-full px-3 md:px-4 py-2 bg-muted border border-input rounded-lg text-foreground focus:outline-none transition-all text-xs md:text-sm cursor-not-allowed"
                required
                readOnly
              />
            </div>
          </div>

          {/* Available Time Slots */}
          {selectedDate && formData.barberId && (
            <div>
              <label className="block text-foreground text-xs md:text-sm font-medium mb-1.5 md:mb-2">
                Horários Disponíveis *
              </label>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-1.5 max-h-32 md:max-h-40 overflow-y-auto p-1 border border-border rounded-lg bg-muted/20">
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
                      className={`px-2 py-1.5 text-xs rounded-md border transition-all cursor-pointer ${
                        formData.startTime === `${selectedDate}T${slot}:00`
                          ? 'bg-primary text-primary-foreground border-primary font-bold shadow-sm'
                          : 'bg-card border-border text-foreground hover:bg-muted'
                      }`}
                    >
                      {slot}
                    </button>
                  ))
                ) : (
                  <div className="col-span-full text-center py-3">
                    <p className="text-muted-foreground text-xs">Nenhum horário disponível</p>
                  </div>
                )}
              </div>
              <p className="text-muted-foreground text-[11px] mt-1">
                Horários de atendimento: 08:00 - 20:00 (intervalos de 30min)
              </p>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block text-foreground text-xs md:text-sm font-medium mb-1.5 md:mb-2">
              Observações
            </label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleInputChange}
              rows={3}
              className="w-full px-3 py-2 bg-background border border-input rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring transition-all resize-none text-xs md:text-sm"
              placeholder="Observações sobre o agendamento..."
            />
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end space-y-2 sm:space-y-0 sm:space-x-3 pt-4 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-foreground border border-border rounded-lg hover:bg-muted transition-all text-xs md:text-sm cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-lg transition-all flex items-center justify-center space-x-2 disabled:opacity-50 text-xs md:text-sm shadow-sm cursor-pointer"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-foreground"></div>
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
