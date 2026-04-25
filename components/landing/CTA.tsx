'use client'

import { useAuth } from '@/lib/auth-context'
import { useRouter } from 'next/navigation'
import { ArrowRight, CheckCircle, MessageCircle, CreditCard, Clock, Headphones } from 'lucide-react'

export default function CTA() {
  const { user } = useAuth()
  const router = useRouter()

  const handleGetStarted = () => {
    if (user) {
      router.push('/dashboard')
    } else {
      router.push('/register')
    }
  }

  const handleWhatsApp = () => {
    // Open WhatsApp with pre-filled message
    const message = encodeURIComponent('Olá! Tenho interesse no sistema BarberShop SaaS para minha barbearia.')
    window.open(`https://wa.me/5511999999999?text=${message}`, '_blank')
  }

  return (
    <section className="py-24 bg-gradient-to-br from-gray-900 via-black to-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-gradient-to-br from-gray-800/50 to-black/50 border border-white/10 rounded-3xl p-12 lg:p-16 overflow-hidden relative">
          {/* Background Elements */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-yellow-400/5 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-400/5 rounded-full blur-3xl"></div>
          
          <div className="relative z-10 grid lg:grid-cols-2 gap-12 items-center">
            {/* Left Content - Image Placeholder */}
            <div className="relative">
              <div className="bg-gradient-to-br from-yellow-400/20 to-yellow-600/20 border border-yellow-400/30 rounded-2xl p-8">
                <div className="aspect-video bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl flex items-center justify-center">
                  <div className="text-center space-y-4">
                    <div className="w-20 h-20 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full mx-auto flex items-center justify-center">
                      <svg className="w-10 h-10 text-black" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2L2 7v10c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-10-5z"/>
                      </svg>
                    </div>
                    <div className="space-y-2">
                      <p className="text-white/60 text-sm">BarberShop SaaS</p>
                      <p className="text-white font-semibold">Transforme sua barbearia hoje</p>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Floating Elements */}
              <div className="absolute -top-4 -right-4 bg-gradient-to-r from-green-400 to-green-600 text-black px-3 py-1 rounded-full text-sm font-medium shadow-lg">
                ✓ Setup em 5 minutos
              </div>
              <div className="absolute top-1/2 -left-4 bg-gradient-to-r from-blue-400 to-blue-600 text-black px-3 py-1 rounded-full text-sm font-medium shadow-lg">
                ✓ Suporte 24/7
              </div>
            </div>

            {/* Right Content */}
            <div className="space-y-8">
              {/* Header */}
              <div className="space-y-4">
                <h2 className="text-4xl lg:text-5xl font-bold text-white leading-tight">
                  Pronto para <span className="bg-gradient-to-r from-yellow-400 to-yellow-600 bg-clip-text text-transparent">transformar</span> sua barbearia?
                </h2>
                <p className="text-xl text-white/80 leading-relaxed">
                  Junte-se a mais de 2.000 barbearias que já estão crescendo com nossa plataforma. Comece grátis hoje mesmo.
                </p>
              </div>

              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row gap-4">
                <button 
                  onClick={handleGetStarted}
                  className="px-8 py-4 bg-gradient-to-r from-yellow-400 to-yellow-600 text-black font-semibold rounded-xl hover:from-yellow-500 hover:to-yellow-700 transition-all flex items-center justify-center space-x-2 shadow-lg shadow-yellow-400/25"
                >
                  <span>{user ? 'Ir para Dashboard' : 'Começar agora gratuitamente'}</span>
                  <ArrowRight className="w-5 h-5" />
                </button>
                <button 
                  onClick={handleWhatsApp}
                  className="px-8 py-4 text-white border border-white/20 rounded-xl hover:bg-white/5 transition-all flex items-center justify-center space-x-2"
                >
                  <MessageCircle className="w-5 h-5" />
                  <span>Falar no WhatsApp</span>
                </button>
              </div>

              {/* Benefits Checklist */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-white mb-4">Por que começar agora?</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-green-500/20 border border-green-500/30 rounded-lg flex items-center justify-center">
                      <CheckCircle className="w-5 h-5 text-green-400" />
                    </div>
                    <div>
                      <p className="text-white font-medium">14 dias grátis</p>
                      <p className="text-white/60 text-sm">Sem compromisso</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-blue-500/20 border border-blue-500/30 rounded-lg flex items-center justify-center">
                      <CreditCard className="w-5 h-5 text-blue-400" />
                    </div>
                    <div>
                      <p className="text-white font-medium">Sem cartão</p>
                      <p className="text-white/60 text-sm">Para começar</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-yellow-500/20 border border-yellow-500/30 rounded-lg flex items-center justify-center">
                      <Clock className="w-5 h-5 text-yellow-400" />
                    </div>
                    <div>
                      <p className="text-white font-medium">Setup rápido</p>
                      <p className="text-white/60 text-sm">5 minutos</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-purple-500/20 border border-purple-500/30 rounded-lg flex items-center justify-center">
                      <Headphones className="w-5 h-5 text-purple-400" />
                    </div>
                    <div>
                      <p className="text-white font-medium">Suporte especializado</p>
                      <p className="text-white/60 text-sm">24/7</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Trust Indicators */}
              <div className="flex items-center space-x-8 pt-4 border-t border-white/10">
                <div className="flex -space-x-2">
                  <div className="w-8 h-8 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full border-2 border-black"></div>
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full border-2 border-black"></div>
                  <div className="w-8 h-8 bg-gradient-to-br from-purple-400 to-purple-600 rounded-full border-2 border-black"></div>
                  <div className="w-8 h-8 bg-gradient-to-br from-green-400 to-green-600 rounded-full border-2 border-black flex items-center justify-center">
                    <span className="text-xs text-white font-bold">+2k</span>
                  </div>
                </div>
                <div className="flex items-center space-x-1">
                  {[...Array(5)].map((_, i) => (
                    <svg key={i} className="w-4 h-4 text-yellow-400 fill-current" viewBox="0 0 24 24">
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                    </svg>
                  ))}
                  <span className="text-white/80 ml-2">4.9/5 (2.000+ avaliações)</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
