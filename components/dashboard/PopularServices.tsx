'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Scissors, TrendingUp } from 'lucide-react'
import { getAuthHeaders } from '@/lib/utils'

interface ServiceData {
  name: string
  count: number
  percentage: number
  color: string
}

export default function PopularServices() {
  const [services, setServices] = useState<ServiceData[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchPopularServices()
  }, [])

  const fetchPopularServices = async () => {
    try {
      console.log('=== BUSCANDO SERVIÇOS MAIS PROCURADOS ===')
      
      // Get current month
      const now = new Date()
      const currentMonth = now.getMonth()
      const currentYear = now.getFullYear()
      
      console.log('Mês atual:', currentMonth + 1, 'Ano:', currentYear)
      
      // Fetch all appointments
      const response = await fetch('/api/appointments', {
        headers: getAuthHeaders(),
        credentials: 'include',
      })
      if (!response.ok) {
        console.error('Erro ao buscar agendamentos:', response.status)
        return
      }

      const allAppointments = await response.json()
      if (!Array.isArray(allAppointments)) {
        return
      }

      // Filter appointments for current month
      const currentMonthAppointments = allAppointments.filter((apt: any) => {
        const aptDate = new Date(apt.startTime)
        return aptDate.getMonth() === currentMonth && aptDate.getFullYear() === currentYear
      })
      
      console.log('Agendamentos do mês:', currentMonthAppointments.length)
      
      // Count services
      const serviceCounts: { [key: string]: number } = {}
      
      currentMonthAppointments.forEach((apt: any) => {
        console.log('=== DEBUG SERVICE DATA ===')
        console.log('Full appointment object:', apt)
        console.log('Service field type:', typeof apt.service)
        console.log('Service field value:', apt.service)
        
        let serviceName = ''
        
        // Handle different service data structures
        if (typeof apt.service === 'string') {
          serviceName = apt.service
          console.log('Service name from string:', serviceName)
        } else if (apt.service && typeof apt.service === 'object') {
          if (apt.service.name) {
            serviceName = apt.service.name
            console.log('Service name from object.name:', serviceName)
          } else {
            console.log('Service object without name property:', apt.service)
            serviceName = 'Serviço sem nome'
          }
        } else {
          console.log('Service field is null/undefined:', apt.service)
          serviceName = 'Serviço não identificado'
        }
        
        console.log('Final service name:', serviceName)
        serviceCounts[serviceName] = (serviceCounts[serviceName] || 0) + 1
      })
      
      console.log('Contagem de serviços:', serviceCounts)
      
      // Convert to array and calculate percentages
      const serviceData: ServiceData[] = Object.entries(serviceCounts)
        .map(([name, count]) => ({
          name,
          count,
          percentage: 0, // Will be calculated
          color: '' // Will be assigned
        }))
        .sort((a, b) => b.count - a.count) // Sort by count (descending)
        .slice(0, 5) // Top 5 services
      
      // Calculate percentages based on total appointments
      const totalAppointments = currentMonthAppointments.length
      console.log('Total appointments for percentage calculation:', totalAppointments)
      
      if (serviceData.length > 0 && totalAppointments > 0) {
        serviceData.forEach(service => {
          const percentage = Math.round((service.count / totalAppointments) * 100)
          service.percentage = percentage
          console.log(`Service: ${service.name}, Count: ${service.count}, Percentage: ${percentage}%`)
        })
      } else {
        console.log('No appointments or services to calculate percentages')
      }
      
      // Assign colors
      const colors = [
        'from-blue-500 to-blue-600',
        'from-purple-500 to-purple-600',
        'from-green-500 to-green-600',
        'from-orange-500 to-orange-600',
        'from-pink-500 to-pink-600'
      ]
      
      serviceData.forEach((service, index) => {
        service.color = colors[index % colors.length]
      })
      
      console.log('Serviços processados:', serviceData)
      setServices(serviceData)
      
    } catch (error) {
      console.error('Erro ao buscar serviços populares:', error)
      setServices([])
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="bg-card border border-border rounded-xl md:rounded-2xl p-4 md:p-6 shadow-sm">
        <div className="flex items-center justify-center h-24 md:h-32">
          <div className="animate-spin rounded-full h-5 w-5 md:h-6 md:w-6 border-b-2 border-primary"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-card border border-border rounded-xl md:rounded-2xl p-4 md:p-6 shadow-sm flex flex-col justify-between h-full">
      <div>
        <div className="flex items-center justify-between mb-4 md:mb-5 pb-3 border-b border-border">
          <div>
            <h3 className="text-lg md:text-xl font-bold text-foreground tracking-tight">Serviços Mais Procurados</h3>
            <p className="text-muted-foreground text-xs md:text-sm font-medium">Classificação com base nos agendamentos deste mês</p>
          </div>
          <div className="flex items-center space-x-1.5 px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-full text-xs font-semibold shrink-0">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Top {services.length}</span>
          </div>
        </div>

        {services.length === 0 ? (
          <div className="text-center py-10 px-4 bg-muted/30 border border-border rounded-xl">
            <Scissors className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
            <p className="text-foreground font-semibold text-sm">Nenhum agendamento este mês</p>
            <p className="text-muted-foreground text-xs mt-1 max-w-xs mx-auto">
              Os serviços mais demandados aparecerão com porcentagem e ranking aqui.
            </p>
          </div>
        ) : (
          <div className="space-y-3.5">
            {services.map((service, index) => (
              <div key={index} className="space-y-1.5 p-2 rounded-lg hover:bg-muted/30 transition-colors">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center space-x-2.5 min-w-0 flex-1">
                    <span className="w-5 text-center text-xs font-bold text-muted-foreground shrink-0">
                      #{index + 1}
                    </span>
                    <div className="w-7 h-7 bg-primary/10 border border-primary/20 rounded-lg flex items-center justify-center flex-shrink-0 text-primary">
                      <Scissors className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-foreground font-semibold text-sm truncate">{service.name}</p>
                      <p className="text-muted-foreground text-xs">{service.count} agendamento{service.count === 1 ? '' : 's'}</p>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <span className="text-foreground font-bold text-sm bg-muted/50 px-2 py-0.5 rounded-md border border-border/60">
                      {service.percentage}%
                    </span>
                  </div>
                </div>
                
                {/* Progress Bar - Modelo Taxa de Conclusão (Resumo Financeiro) */}
                <div className="w-full bg-muted rounded-full h-2 md:h-2.5 overflow-hidden">
                  <div 
                    className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, Math.max(Number(service.percentage) || 0, 0))}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* View All Button */}
      <div className="mt-4 pt-3 border-t border-border">
        <Link
          href="/servicos"
          className="block w-full py-2 text-center text-primary hover:text-primary/80 hover:bg-muted font-semibold text-xs md:text-sm rounded-lg transition-all"
        >
          Ver Catálogo de Serviços &rarr;
        </Link>
      </div>
    </div>
  )
}

