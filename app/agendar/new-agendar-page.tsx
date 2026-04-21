'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold">Agendar Horário</CardTitle>
            <p className="text-gray-600">
              {user ? 'Agende um horário para um cliente' : 'Agende seu horário facilmente'}
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* Client Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold border-b pb-2">Informações do Cliente</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label htmlFor="clientName" className="text-sm font-medium">
                      Nome Completo *
                    </label>
                    <div className="relative">
                      <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        id="clientName"
                        placeholder="Nome completo"
                        className="pl-10"
                        {...register('clientName')}
                        disabled={isSubmitting}
                      />
                    </div>
                    {errors.clientName && (
                      <p className="text-sm text-red-600">{errors.clientName.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="clientPhone" className="text-sm font-medium">
                      Telefone *
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        id="clientPhone"
                        type="tel"
                        placeholder="(11) 99999-9999"
                        className="pl-10"
                        {...register('clientPhone')}
                        disabled={isSubmitting}
                      />
                    </div>
                    {errors.clientPhone && (
                      <p className="text-sm text-red-600">{errors.clientPhone.message}</p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <label htmlFor="clientEmail" className="text-sm font-medium">
                    Email
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="clientEmail"
                      type="email"
                      placeholder="email@exemplo.com"
                      className="pl-10"
                      {...register('clientEmail')}
                      disabled={isSubmitting}
                    />
                  </div>
                  {errors.clientEmail && (
                    <p className="text-sm text-red-600">{errors.clientEmail.message}</p>
                  )}
                </div>
              </div>

              {/* Service Selection */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold border-b pb-2">Serviço</h3>
                
                <div className="space-y-2">
                  <label htmlFor="serviceId" className="text-sm font-medium">
                    Selecione o Serviço *
                  </label>
                  <div className="relative">
                    <Scissors className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <select
                      id="serviceId"
                      className="w-full pl-10 pr-10 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      {...register('serviceId')}
                      disabled={isSubmitting}
                    >
                      <option value="">Selecione um serviço</option>
                      {services.map((service: any) => (
                        <option key={service.id} value={service.id}>
                          {service.name} - R$ {service.price.toFixed(2)}
                        </option>
                      ))}
                    </select>
                  </div>
                  {errors.serviceId && (
                    <p className="text-sm text-red-600">{errors.serviceId.message}</p>
                  )}
                </div>
              </div>

              {/* Date and Time */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label htmlFor="date" className="text-sm font-medium">
                    Data *
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="date"
                      type="date"
                      min={new Date().toISOString().split('T')[0]}
                      className="pl-10"
                      {...register('date')}
                      disabled={isSubmitting}
                    />
                  </div>
                  {errors.date && (
                    <p className="text-sm text-red-600">{errors.date.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <label htmlFor="time" className="text-sm font-medium">
                    Horário *
                  </label>
                  <div className="relative">
                    <Clock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <select
                      id="time"
                      className="w-full pl-10 pr-10 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      {...register('time')}
                      disabled={isSubmitting || availableTimes.length === 0}
                    >
                      <option value="">Selecione um horário</option>
                      {availableTimes.map((time: string) => (
                        <option key={time} value={time}>
                          {time}
                        </option>
                      ))}
                    </select>
                  </div>
                  {errors.time && (
                    <p className="text-sm text-red-600">{errors.time.message}</p>
                  )}
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <label htmlFor="notes" className="text-sm font-medium">
                  Observações
                </label>
                <textarea
                  id="notes"
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Alguma observação sobre o agendamento?"
                  {...register('notes')}
                  disabled={isSubmitting}
                />
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                className="w-full"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white border-r-transparent border-t-transparent mr-2"></div>
                    Agendando...
                  </>
                ) : (
                  <>
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Confirmar Agendamento
                  </>
                )}
              </Button>
            </form>

            {/* Links */}
            <div className="mt-6 text-center">
              {user ? (
                <Button
                  variant="ghost"
                  onClick={() => router.push('/dashboard')}
                  className="flex items-center"
                >
                  <ArrowRight className="mr-2 h-4 w-4" />
                  Voltar para Dashboard
                </Button>
              ) : (
                <p className="text-sm text-gray-600">
                  Já tem uma conta?{' '}
                  <button
                    onClick={() => router.push('/login')}
                    className="text-blue-600 hover:text-blue-800 font-medium"
                  >
                    Faça login
                  </button>
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
