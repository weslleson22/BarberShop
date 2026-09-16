'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Scissors, TrendingUp } from 'lucide-react'

interface ServiceData {
  name: string
  count: number
  percentage: number
  color: string
}

export default function PopularServices() {
  const router = useRouter()
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
      const response = await fetch('/api/appointments')
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
      <div className="bg-gradient-to-br from-gray-800/50 to-black/50 border border-white/6 rounded-xl md:rounded-2xl p-4 md:p-6">
        <div className="flex items-center justify-center h-24 md:h-32">
          <div className="animate-spin rounded-full h-5 w-5 md:h-6 md:w-6 border-b-2 border-yellow-400"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-gradient-to-br from-gray-800/50 to-black/50 border border-white/6 rounded-xl md:rounded-2xl p-4 md:p-6">
      <div className="flex items-center justify-between mb-4 md:mb-6">
        <div>
          <h3 className="text-lg md:text-xl font-semibold text-white">Serviços Mais Procurados</h3>
          <p className="text-white/60 text-xs md:text-sm">Este mês</p>
        </div>
        <div className="flex items-center space-x-2 text-green-400">
          <TrendingUp className="w-3.5 h-3.5 md:w-4 md:h-4" />
          <span className="text-xs md:text-sm">+{services.length > 0 ? services.length * 5 : 0}%</span>
        </div>
      </div>

      <div className="space-y-3 md:space-y-4">
        {services.map((service, index) => (
          <div key={index} className="space-y-1.5 md:space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 md:space-x-3 min-w-0 flex-1">
                <div className={`w-7 h-7 md:w-8 md:h-8 bg-gradient-to-br ${service.color} rounded-lg flex items-center justify-center flex-shrink-0`}>
                  <Scissors className="w-3.5 h-3.5 md:w-4 md:h-4 text-white" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-white font-medium text-sm md:text-base truncate">{service.name}</p>
                  <p className="text-white/60 text-xs md:text-sm">{service.count} agendamentos</p>
                </div>
              </div>
              <div className="text-right flex-shrink-0 ml-2">
                <p className="text-white font-semibold text-sm md:text-base">{service.percentage}%</p>
              </div>
            </div>
            
            {/* Progress Bar */}
            <div className="w-full bg-white/10 rounded-full h-1.5 md:h-2">
              <div 
                className={`h-full bg-gradient-to-r ${service.color} rounded-full transition-all duration-500`}
                style={{ width: `${service.percentage}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* View All Button */}
      <div className="mt-4 md:mt-6 pt-3 md:pt-4 border-t border-white/6">
        <button
          onClick={() => router.push('/servicos')}
          className="w-full py-2.5 md:py-3 text-yellow-400 hover:text-yellow-300 font-medium text-sm md:text-base transition-colors"
        >
          Ver todos os serviços
        </button>
      </div>
    </div>
  )
}
