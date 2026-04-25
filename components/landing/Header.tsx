'use client'

import { useState } from 'react'
import { useAuth } from '@/lib/auth-context'
import { useRouter } from 'next/navigation'
import { Menu, X, LogIn, ArrowRight } from 'lucide-react'

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const { user } = useAuth()
  const router = useRouter()

  const handleGetStarted = () => {
    if (user) {
      router.push('/dashboard')
    } else {
      router.push('/login')
    }
  }

  const handleLogin = () => {
    router.push('/login')
  }

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-black/20 backdrop-blur-xl border-b border-white/8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-black" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2L2 7v10c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-10-5z"/>
              </svg>
            </div>
            <span className="text-xl font-bold text-white">BarberShop SaaS</span>
          </div>

          {/* Desktop Menu */}
          <nav className="hidden md:flex items-center space-x-8">
            <a href="#home" className="text-white/80 hover:text-white transition-colors">Início</a>
            <a href="#features" className="text-white/80 hover:text-white transition-colors">Recursos</a>
            <a href="#pricing" className="text-white/80 hover:text-white transition-colors">Preços</a>
            <a href="#about" className="text-white/80 hover:text-white transition-colors">Sobre</a>
            <a href="#contact" className="text-white/80 hover:text-white transition-colors">Contato</a>
          </nav>

          {/* Desktop CTA */}
          <div className="hidden md:flex items-center space-x-4">
            <button 
              onClick={handleLogin}
              className="px-4 py-2 text-white/80 hover:text-white border border-white/20 rounded-lg transition-all hover:border-white/40"
            >
              {user ? 'Dashboard' : 'Entrar'}
            </button>
            <button 
              onClick={handleGetStarted}
              className="px-6 py-2 bg-gradient-to-r from-yellow-400 to-yellow-600 text-black font-semibold rounded-lg hover:from-yellow-500 hover:to-yellow-700 transition-all flex items-center space-x-2"
            >
              <span>{user ? 'Ir para Dashboard' : 'Começar Agora'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* Mobile Menu Button */}
          <button 
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="md:hidden p-2 text-white/80 hover:text-white"
          >
            {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden bg-black/90 backdrop-blur-xl border-t border-white/8">
            <div className="px-4 py-6 space-y-4">
              <a href="#home" className="block text-white/80 hover:text-white transition-colors">Início</a>
              <a href="#features" className="block text-white/80 hover:text-white transition-colors">Recursos</a>
              <a href="#pricing" className="block text-white/80 hover:text-white transition-colors">Preços</a>
              <a href="#about" className="block text-white/80 hover:text-white transition-colors">Sobre</a>
              <a href="#contact" className="block text-white/80 hover:text-white transition-colors">Contato</a>
              <div className="pt-4 space-y-3">
                <button 
                  onClick={handleLogin}
                  className="w-full px-4 py-2 text-white/80 hover:text-white border border-white/20 rounded-lg transition-all"
                >
                  {user ? 'Dashboard' : 'Entrar'}
                </button>
                <button 
                  onClick={handleGetStarted}
                  className="w-full px-6 py-2 bg-gradient-to-r from-yellow-400 to-yellow-600 text-black font-semibold rounded-lg hover:from-yellow-500 hover:to-yellow-700 transition-all flex items-center justify-center space-x-2"
                >
                  <span>{user ? 'Ir para Dashboard' : 'Começar Agora'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </header>
  )
}
