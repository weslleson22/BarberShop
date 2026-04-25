'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import AppSidebar from '@/components/dashboard/AppSidebar'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { 
  Calendar, 
  Clock, 
  User, 
  Phone, 
  Mail, 
  Scissors,
  CheckCircle,
  ArrowRight
} from 'lucide-react'

const appointmentSchema = z.object({
  clientName: z.string().min(2, 'Nome do cliente é obrigatório'),
  clientPhone: z.string().min(10, 'Telefone inválido'),
  clientEmail: z.string().email('Email inválido').optional().or(z.literal('')),
  serviceId: z.string().min(1, 'Selecione um serviço'),
  date: z.string().min(10, 'Data é obrigatória'),
  time: z.string().min(5, 'Horário é obrigatório'),
  notes: z.string().optional(),
})

type AppointmentForm = z.infer<typeof appointmentSchema>

export default function NewAgendarPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [services, setServices] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [availableTimes, setAvailableTimes] = useState([])

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<AppointmentForm>({
    resolver: zodResolver(appointmentSchema),
    defaultValues: {
      clientName: '',
      clientPhone: '',
      clientEmail: '',
      serviceId: '',
      date: '',
      time: '',
      notes: '',
    },
  })

  const selectedDate = watch('date')
  const selectedService = watch('serviceId')

  const fetchServices = async () => {
    try {
      const response = await fetch('/api/services/public')
      if (response.ok) {
        const data = await response.json()
        setServices(data)
      }
    } catch (error) {
      console.error('Erro ao buscar serviços:', error)
    }
  }

  const fetchAvailableTimes = async (date: string, serviceId: string) => {
    if (!date || !serviceId) return
    
    try {
      const response = await fetch(`/api/appointments/available?date=${date}&serviceId=${serviceId}`)
      if (response.ok) {
        const times = await response.json()
        setAvailableTimes(times)
      }
    } catch (error) {
      console.error('Erro ao buscar horários disponíveis:', error)
    }
  }

  const onSubmit = async (data: AppointmentForm) => {
    setIsSubmitting(true)
    try {
      const response = await fetch('/api/appointments/public', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })

      if (response.ok) {
        router.push('/agendar/sucesso')
      } else {
        const error = await response.json()
        alert(error.error || 'Erro ao criar agendamento')
      }
    } catch (error) {
      console.error('Erro ao criar agendamento:', error)
      alert('Erro ao criar agendamento. Tente novamente.')
    } finally {
      setIsSubmitting(false)
    }
  }

  useState(() => {
    fetchServices()
  })

  // Fetch available times when date or service changes
  useState(() => {
    if (selectedDate && selectedService) {
      fetchAvailableTimes(selectedDate, selectedService)
    }
  })

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-blue-950 to-black">
      {/* Sidebar Fixado atrás do conteúdo */}
      <div className="fixed inset-y-0 left-0 z-30 w-80">
        <AppSidebar />
      </div>
      
      {/* Conteúdo principal à frente do sidebar */}
      <div className="lg:pl-80 relative z-40">
        <div className="p-6">
          <div className="max-w-2xl mx-auto">
            <div className="bg-gradient-to-br from-gray-800/50 to-black/50 border border-white/6 rounded-2xl p-6">
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold text-white">Agendar Horário</h2>
                <p className="text-white/60">
                  {user ? 'Agende um horário para um cliente' : 'Agende seu horário facilmente'}
                </p>
              </div>
              
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                {/* Client Information */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-white border-b border-white/10 pb-2">Informações do Cliente</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label htmlFor="clientName" className="text-sm font-medium text-white/80">
                        Nome Completo *
                      </label>
                      <div className="relative">
                        <User className="absolute left-3 top-3 h-4 w-4 text-white/40" />
                        <input
                          id="clientName"
                          type="text"
                          placeholder="Nome completo"
                          className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/6 rounded-xl text-white placeholder-white/40 focus:ring-2 focus:ring-yellow-400/50 focus:border-yellow-400/50 transition-all"
                          {...register('clientName')}
                          disabled={isSubmitting}
                        />
                      </div>
                      {errors.clientName && (
                        <p className="text-sm text-red-400">{errors.clientName.message}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="clientPhone" className="text-sm font-medium text-white/80">
                        Telefone *
                      </label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-3 h-4 w-4 text-white/40" />
                        <input
                          id="clientPhone"
                          type="tel"
                          placeholder="(11) 99999-9999"
                          className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/6 rounded-xl text-white placeholder-white/40 focus:ring-2 focus:ring-yellow-400/50 focus:border-yellow-400/50 transition-all"
                          {...register('clientPhone')}
                          disabled={isSubmitting}
                        />
                      </div>
                      {errors.clientPhone && (
                        <p className="text-sm text-red-400">{errors.clientPhone.message}</p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="clientEmail" className="text-sm font-medium text-white/80">
                      Email
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-white/40" />
                      <input
                        id="clientEmail"
                        type="email"
                        placeholder="email@exemplo.com"
                        className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/6 rounded-xl text-white placeholder-white/40 focus:ring-2 focus:ring-yellow-400/50 focus:border-yellow-400/50 transition-all"
                        {...register('clientEmail')}
                        disabled={isSubmitting}
                      />
                    </div>
                    {errors.clientEmail && (
                      <p className="text-sm text-red-400">{errors.clientEmail.message}</p>
                    )}
                  </div>
                </div>

                {/* Service Selection */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-white border-b border-white/10 pb-2">Serviço</h3>
                  
                  <div className="space-y-2">
                    <label htmlFor="serviceId" className="text-sm font-medium text-white/80">
                      Selecione o Serviço *
                    </label>
                    <div className="relative">
                      <Scissors className="absolute left-3 top-3 h-4 w-4 text-white/40" />
                      <select
                        id="serviceId"
                        className="w-full pl-10 pr-10 py-3 bg-white/5 border border-white/6 rounded-xl text-white focus:ring-2 focus:ring-yellow-400/50 focus:border-yellow-400/50 transition-all"
                        {...register('serviceId')}
                        disabled={isSubmitting}
                      >
                        <option value="" className="bg-gray-800">Selecione um serviço</option>
                        {services.map((service: any) => (
                          <option key={service.id} value={service.id} className="bg-gray-800">
                            {service.name} - R$ {service.price.toFixed(2)}
                          </option>
                        ))}
                      </select>
                    </div>
                    {errors.serviceId && (
                      <p className="text-sm text-red-400">{errors.serviceId.message}</p>
                    )}
                  </div>
                </div>

                {/* Date and Time */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label htmlFor="date" className="text-sm font-medium text-white/80">
                      Data *
                    </label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-3 h-4 w-4 text-white/40" />
                      <input
                        id="date"
                        type="date"
                        min={new Date().toISOString().split('T')[0]}
                        className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/6 rounded-xl text-white focus:ring-2 focus:ring-yellow-400/50 focus:border-yellow-400/50 transition-all"
                        {...register('date')}
                        disabled={isSubmitting}
                      />
                    </div>
                    {errors.date && (
                      <p className="text-sm text-red-400">{errors.date.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="time" className="text-sm font-medium text-white/80">
                      Horário *
                    </label>
                    <div className="relative">
                      <Clock className="absolute left-3 top-3 h-4 w-4 text-white/40" />
                      <select
                        id="time"
                        className="w-full pl-10 pr-10 py-3 bg-white/5 border border-white/6 rounded-xl text-white focus:ring-2 focus:ring-yellow-400/50 focus:border-yellow-400/50 transition-all"
                        {...register('time')}
                        disabled={isSubmitting || availableTimes.length === 0}
                      >
                        <option value="" className="bg-gray-800">Selecione um horário</option>
                        {availableTimes.map((time: string) => (
                          <option key={time} value={time} className="bg-gray-800">
                            {time}
                          </option>
                        ))}
                      </select>
                    </div>
                    {errors.time && (
                      <p className="text-sm text-red-400">{errors.time.message}</p>
                    )}
                  </div>
                </div>

                {/* Notes */}
                <div className="space-y-2">
                  <label htmlFor="notes" className="text-sm font-medium text-white/80">
                    Observações
                  </label>
                  <textarea
                    id="notes"
                    rows={4}
                    className="w-full px-4 py-3 bg-white/5 border border-white/6 rounded-xl text-white placeholder-white/40 focus:ring-2 focus:ring-yellow-400/50 focus:border-yellow-400/50 transition-all"
                    placeholder="Alguma observação sobre o agendamento?"
                    {...register('notes')}
                    disabled={isSubmitting}
                  />
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  className="w-full bg-gradient-to-r from-yellow-400 to-yellow-600 text-black px-6 py-3 rounded-xl hover:from-yellow-500 hover:to-yellow-700 transition-all font-medium disabled:opacity-50"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-black border-r-transparent border-t-transparent mr-2"></div>
                      Agendando...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Confirmar Agendamento
                    </>
                  )}
                </button>
              </form>

                          </div>
          </div>
        </div>
      </div>
    </div>
  )
}
