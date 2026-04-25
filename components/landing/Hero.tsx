'use client'

import { useAuth } from '@/lib/auth-context'
import { useRouter } from 'next/navigation'
import { ArrowRight, CheckCircle, Star, Shield, Zap } from 'lucide-react'
import DashboardPreview from './DashboardPreview'

export default function Hero() {
  const { user } = useAuth()
  const router = useRouter()

  const handleGetStarted = () => {
    if (user) {
      router.push('/dashboard')
    } else {
      router.push('/login')
    }
  }

  const handleDemo = () => {
    router.push('/agendar')
  }

  return (
    <section id="home" className="relative min-h-screen flex items-center bg-gradient-to-br from-gray-950 via-black to-gray-900 overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0 bg-gradient-to-r from-blue-900/20 to-purple-900/20"></div>
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-yellow-400/5 rounded-full blur-3xl"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-400/5 rounded-full blur-3xl"></div>
      
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Content */}
          <div className="space-y-8">
            {/* Badge */}
            <div className="inline-flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-yellow-400/20 to-yellow-600/20 border border-yellow-400/30 rounded-full">
              <Star className="w-4 h-4 text-yellow-400" />
              <span className="text-sm font-medium text-yellow-400">Sistema completo para barbearias</span>
            </div>

            {/* Main Title */}
            <div className="space-y-4">
              <h1 className="text-5xl lg:text-6xl xl:text-7xl font-bold text-white leading-tight">
                Gestão <span className="bg-gradient-to-r from-yellow-400 to-yellow-600 bg-clip-text text-transparent">inteligente</span> para barbearias
              </h1>
              <p className="text-xl text-white/80 leading-relaxed">
                Agendamentos, clientes, equipe, financeiro e relatórios em um só lugar.
              </p>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4">
              <button 
                onClick={handleGetStarted}
                className="px-8 py-4 bg-gradient-to-r from-yellow-400 to-yellow-600 text-black font-semibold rounded-xl hover:from-yellow-500 hover:to-yellow-700 transition-all flex items-center justify-center space-x-2 shadow-lg shadow-yellow-400/25"
              >
                <span>{user ? 'Ir para Dashboard' : 'Começar Gratuitamente'}</span>
                <ArrowRight className="w-5 h-5" />
              </button>
              <button 
                onClick={handleDemo}
                className="px-8 py-4 text-white border border-white/20 rounded-xl hover:bg-white/5 transition-all flex items-center justify-center space-x-2"
              >
                <span>Ver Demonstração</span>
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>

            {/* Features List */}
            <div className="flex flex-wrap gap-6">
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-5 h-5 text-green-400" />
                <span className="text-white/80">Fácil de usar</span>
              </div>
              <div className="flex items-center space-x-2">
                <Shield className="w-5 h-5 text-blue-400" />
                <span className="text-white/80">Seguro</span>
              </div>
              <div className="flex items-center space-x-2">
                <Zap className="w-5 h-5 text-yellow-400" />
                <span className="text-white/80">Acesso em qualquer lugar</span>
              </div>
            </div>

            {/* Social Proof */}
            <div className="flex items-center space-x-8">
              <div>
                <div className="flex -space-x-2">
                  <div className="w-8 h-8 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full border-2 border-black"></div>
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full border-2 border-black"></div>
                  <div className="w-8 h-8 bg-gradient-to-br from-purple-400 to-purple-600 rounded-full border-2 border-black"></div>
                  <div className="w-8 h-8 bg-gradient-to-br from-green-400 to-green-600 rounded-full border-2 border-black flex items-center justify-center">
                    <span className="text-xs text-white font-bold">+2k</span>
                  </div>
                </div>
                <p className="text-sm text-white/60 mt-2">2.000+ barbearias confiam</p>
              </div>
              <div className="flex items-center space-x-1">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 text-yellow-400 fill-current" />
                ))}
                <span className="text-white/80 ml-2">4.9/5</span>
              </div>
            </div>
          </div>

          {/* Right Content - Dashboard Preview */}
          <div className="relative">
            <DashboardPreview />
            
            {/* Floating Elements */}
            <div className="absolute -top-4 -right-4 bg-gradient-to-r from-green-400 to-green-600 text-black px-3 py-1 rounded-full text-sm font-medium shadow-lg">
              ✓ Tempo real
            </div>
            <div className="absolute -bottom-4 -left-4 bg-gradient-to-r from-blue-400 to-blue-600 text-black px-3 py-1 rounded-full text-sm font-medium shadow-lg">
              ✓ Seguro
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
