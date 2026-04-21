'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth-context'
import { useRouter } from 'next/navigation'
import { Calendar, Users, Clock, DollarSign, ArrowRight, CheckCircle } from 'lucide-react'

export default function HomePage() {
  const { user } = useAuth()
  const router = useRouter()
  const [services, setServices] = useState([])

  useEffect(() => {
    fetchServices()
  }, [])

  const fetchServices = async () => {
    try {
      console.log('=== BUSCANDO SERVIÇOS DO PRISMA PARA HOME ===')
      
      // Apenas serviços reais do Prisma via API pública
      const response = await fetch('/api/services/public')
      if (response.ok) {
        const data = await response.json()
        console.log('Serviços recebidos do Prisma para home:', data.length)
        setServices(data) // Show all services
      } else {
        console.error('Erro ao buscar serviços do Prisma:', response.status)
        setServices([]) // Sem dados mockados
      }
    } catch (error) {
      console.error('Error ao buscar serviços do Prisma:', error)
      setServices([]) // Sem dados mockados
    }
  }

  const handleGetStarted = () => {
    if (user) {
      router.push('/dashboard')
    } else {
      router.push('/login')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white">
      {/* Hero Section */}
      <section className="py-20 px-4">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
            Sistema Completo para
            <span className="text-blue-600"> Barbearias</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            Agendamento online, gestão de clientes, controle financeiro e muito mais. 
            Transforme sua barbearia com nossa plataforma moderna e intuitiva.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={handleGetStarted}
              className="bg-blue-600 text-white px-8 py-4 rounded-lg text-lg font-medium hover:bg-blue-700 transition-colors flex items-center justify-center"
            >
              {user ? 'Ir para Dashboard' : 'Fazer Login'}
              <ArrowRight className="ml-2 w-5 h-5" />
            </button>
            {/* Cadastro de barbearia apenas para ADMIN logado */}
            {user?.role === 'ADMIN' && (
              <button
                onClick={() => router.push('/register')}
                className="bg-white text-blue-600 border-2 border-blue-600 px-8 py-4 rounded-lg text-lg font-medium hover:bg-blue-50 transition-colors"
              >
                Cadastrar Barbearia
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 bg-white">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
            Recursos Principais
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Calendar className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Agendamento Online</h3>
              <p className="text-gray-600">
                Sistema de agendamento em 3 passos. Rápido, simples e eficiente.
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Gestão de Clientes</h3>
              <p className="text-gray-600">
                Histórico completo, preferências e observações dos clientes.
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Clock className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Controle de Agenda</h3>
              <p className="text-gray-600">
                Visualização completa por dia, semana ou mês. Sem conflitos.
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <DollarSign className="w-8 h-8 text-purple-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Financeiro</h3>
              <p className="text-gray-600">
                Controle de pagamentos, faturamento e relatórios detalhados.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Services Preview - Horizontal Carousel */}
      {services.length > 0 && (
        <section className="py-20 px-4 bg-gray-50">
          <div className="max-w-7xl mx-auto">
            <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
              Nossos Serviços
            </h2>
            
            {/* Carousel Container */}
            <div className="relative">
              {/* Navigation Arrows */}
              <button
                onClick={() => {
                  const container = document.getElementById('services-carousel')
                  if (container) {
                    container.scrollBy({ left: -320, behavior: 'smooth' })
                  }
                }}
                className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-white rounded-full shadow-lg p-2 hover:bg-gray-100 transition-colors"
                style={{ left: '-20px' }}
              >
                <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              
              <button
                onClick={() => {
                  const container = document.getElementById('services-carousel')
                  if (container) {
                    container.scrollBy({ left: 320, behavior: 'smooth' })
                  }
                }}
                className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-white rounded-full shadow-lg p-2 hover:bg-gray-100 transition-colors"
                style={{ right: '-20px' }}
              >
                <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>

              {/* Services Carousel */}
              <div 
                id="services-carousel"
                className="flex overflow-x-auto space-x-6 pb-4 scrollbar-hide"
                style={{ scrollSnapType: 'x mandatory' }}
              >
                {services.map((service: any, index) => (
                  <div 
                    key={index} 
                    className="flex-none w-80 bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
                    style={{ scrollSnapAlign: 'start' }}
                  >
                    <h3 className="text-xl font-semibold mb-2">{service.name}</h3>
                    {service.description && (
                      <p className="text-gray-600 mb-4">{service.description}</p>
                    )}
                    <div className="flex justify-between items-center mb-4">
                      <span className="text-2xl font-bold text-blue-600">
                        R$ {service.price}
                      </span>
                      <div className="flex items-center text-gray-500">
                        <Clock className="w-4 h-4 mr-1" />
                        {service.duration}min
                      </div>
                    </div>
                    <button
                      onClick={() => router.push('/agendar?service=' + service.id)}
                      className="w-full bg-green-600 text-white px-4 py-3 rounded-lg hover:bg-green-700 transition-colors font-medium"
                    >
                      Agendar Agora
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Benefits Section */}
      <section className="py-20 px-4 bg-white">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
            Por Que Escolher Nosso Sistema?
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="flex items-start space-x-4">
              <CheckCircle className="w-6 h-6 text-green-500 mt-1 flex-shrink-0" />
              <div>
                <h3 className="text-lg font-semibold mb-2">Multi-tenant</h3>
                <p className="text-gray-600">
                  Suporte para múltiplas barbearias na mesma plataforma, com dados totalmente isolados.
                </p>
              </div>
            </div>
            <div className="flex items-start space-x-4">
              <CheckCircle className="w-6 h-6 text-green-500 mt-1 flex-shrink-0" />
              <div>
                <h3 className="text-lg font-semibold mb-2">Mobile-First</h3>
                <p className="text-gray-600">
                  Interface responsiva que funciona perfeitamente em qualquer dispositivo.
                </p>
              </div>
            </div>
            <div className="flex items-start space-x-4">
              <CheckCircle className="w-6 h-6 text-green-500 mt-1 flex-shrink-0" />
              <div>
                <h3 className="text-lg font-semibold mb-2">PWA Ready</h3>
                <p className="text-gray-600">
                  Instale como aplicativo no celular e acesse offline quando necessário.
                </p>
              </div>
            </div>
            <div className="flex items-start space-x-4">
              <CheckCircle className="w-6 h-6 text-green-500 mt-1 flex-shrink-0" />
              <div>
                <h3 className="text-lg font-semibold mb-2">Seguro e Confiável</h3>
                <p className="text-gray-600">
                  Autenticação robusta, controle de acesso e backup automático dos dados.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 bg-blue-600">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Pronto para Transformar Sua Barbearia?
          </h2>
          <p className="text-xl text-blue-100 mb-8">
            Comece hoje mesmo e veja a diferença que um bom sistema de gestão pode fazer.
          </p>
          <button
            onClick={() => router.push('/register')}
            className="bg-white text-blue-600 px-8 py-4 rounded-lg text-lg font-medium hover:bg-gray-100 transition-colors"
          >
            Começar Gratuitamente
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <h3 className="text-xl font-bold mb-4">BarberShop</h3>
              <p className="text-gray-400">
                Sistema completo de gestão para barbearias modernas.
              </p>
            </div>
            <div>
              <h4 className="text-lg font-semibold mb-4">Produto</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="/" className="hover:text-white">Home</a></li>
                <li><a href="/agendar" className="hover:text-white">Agendamento</a></li>
                <li><a href="/dashboard" className="hover:text-white">Dashboard</a></li>
                <li><a href="/servicos" className="hover:text-white">Serviços</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-lg font-semibold mb-4">Suporte</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white">Ajuda</a></li>
                <li><a href="#" className="hover:text-white">Contato</a></li>
                <li><a href="#" className="hover:text-white">FAQ</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-lg font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white">Privacidade</a></li>
                <li><a href="#" className="hover:text-white">Termos</a></li>
                <li><a href="#" className="hover:text-white">Segurança</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; 2026 Barbershop Scheduler. Todos os direitos reservados.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
