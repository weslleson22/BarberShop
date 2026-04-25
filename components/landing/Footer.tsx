'use client'

import { Mail, Phone, MapPin, ArrowRight } from 'lucide-react'

export default function Footer() {
  return (
    <footer className="bg-black border-t border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-black" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2L2 7v10c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-10-5z"/>
                </svg>
              </div>
              <span className="text-xl font-bold text-white">BarberShop SaaS</span>
            </div>
            <p className="text-white/60 leading-relaxed">
              Sistema completo de gestão para barbearias modernas. 
              Otimize seu negócio com ferramentas profissionais e inteligentes.
            </p>
            <div className="flex space-x-4">
              <a href="#" className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center hover:bg-white/20 transition-colors">
                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-2.001 0-2.53 1.242-2.53 2.519v2.9h3.435l-.55 3.47h-2.885v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
              </a>
              <a href="#" className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center hover:bg-white/20 transition-colors">
                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 00-2.163-2.723c-.026-.02-.05-.04-.076-.06a4.936 4.936 0 00-4.8 1.285 4.994 4.994 0 00-1.667-3.976 4.996 4.996 0 00-2.821-1.28 4.938 4.938 0 00-4.8 1.275 4.994 4.994 0 00-1.667 3.976A4.997 4.997 0 00.088 13.001a4.936 4.936 0 00-2.163 2.723 10 10 0 01-2.825-.775 10.025 10.025 0 01-3.12 8.875c-1.164 2.825-1.39 6.022-.584 8.925a10.025 10.025 0 003.12 8.875 10 10 0 002.825-.775 4.938 4.938 0 004.8 1.275 4.997 4.997 0 002.821-1.28 4.99 4.99 0 001.667-3.976 4.936 4.936 0 002.163-2.723 10 10 0 012.825.775 10.025 10.025 0 003.12-8.875c.806-2.903.58-6.1-.584-8.925z"/>
                </svg>
              </a>
              <a href="#" className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center hover:bg-white/20 transition-colors">
                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.849.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zM5.838 12a6.162 6.162 0 1112.324 0 6.162 6.162 0 01-12.324 0zM12 16a4 4 0 110-8 0 4 4 0 018 0zm4.965-10.405a1.44 1.44 0 112.881.001 1.44 1.44 0 01-2.881-.001z"/>
                </svg>
              </a>
            </div>
          </div>

          {/* Produto */}
          <div className="space-y-4">
            <h4 className="text-lg font-semibold text-white">Produto</h4>
            <ul className="space-y-3">
              <li>
                <a href="#features" className="text-white/60 hover:text-white transition-colors flex items-center space-x-1">
                  <span>Recursos</span>
                  <ArrowRight className="w-3 h-3" />
                </a>
              </li>
              <li>
                <a href="#pricing" className="text-white/60 hover:text-white transition-colors flex items-center space-x-1">
                  <span>Preços</span>
                  <ArrowRight className="w-3 h-3" />
                </a>
              </li>
              <li>
                <a href="#" className="text-white/60 hover:text-white transition-colors flex items-center space-x-1">
                  <span>Integrações</span>
                  <ArrowRight className="w-3 h-3" />
                </a>
              </li>
              <li>
                <a href="#" className="text-white/60 hover:text-white transition-colors flex items-center space-x-1">
                  <span>API</span>
                  <ArrowRight className="w-3 h-3" />
                </a>
              </li>
            </ul>
          </div>

          {/* Empresa */}
          <div className="space-y-4">
            <h4 className="text-lg font-semibold text-white">Empresa</h4>
            <ul className="space-y-3">
              <li>
                <a href="#about" className="text-white/60 hover:text-white transition-colors flex items-center space-x-1">
                  <span>Sobre</span>
                  <ArrowRight className="w-3 h-3" />
                </a>
              </li>
              <li>
                <a href="#" className="text-white/60 hover:text-white transition-colors flex items-center space-x-1">
                  <span>Blog</span>
                  <ArrowRight className="w-3 h-3" />
                </a>
              </li>
              <li>
                <a href="#contact" className="text-white/60 hover:text-white transition-colors flex items-center space-x-1">
                  <span>Contato</span>
                  <ArrowRight className="w-3 h-3" />
                </a>
              </li>
              <li>
                <a href="#" className="text-white/60 hover:text-white transition-colors flex items-center space-x-1">
                  <span>Carreiras</span>
                  <ArrowRight className="w-3 h-3" />
                </a>
              </li>
            </ul>
          </div>

          {/* Suporte */}
          <div className="space-y-4">
            <h4 className="text-lg font-semibold text-white">Suporte</h4>
            <ul className="space-y-3">
              <li>
                <a href="#" className="text-white/60 hover:text-white transition-colors flex items-center space-x-1">
                  <span>Central de ajuda</span>
                  <ArrowRight className="w-3 h-3" />
                </a>
              </li>
              <li>
                <a href="#" className="text-white/60 hover:text-white transition-colors flex items-center space-x-1">
                  <span>Tutoriais</span>
                  <ArrowRight className="w-3 h-3" />
                </a>
              </li>
              <li>
                <a href="#" className="text-white/60 hover:text-white transition-colors flex items-center space-x-1">
                  <span>Status</span>
                  <ArrowRight className="w-3 h-3" />
                </a>
              </li>
              <li>
                <a href="#" className="text-white/60 hover:text-white transition-colors flex items-center space-x-1">
                  <span>Contato</span>
                  <ArrowRight className="w-3 h-3" />
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Newsletter */}
        <div className="mt-16 pt-8 border-t border-white/10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div>
              <h4 className="text-lg font-semibold text-white mb-4">Fique por dentro</h4>
              <p className="text-white/60 mb-4">
                Receba dicas exclusivas e novidades sobre gestão de barbearias.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="email"
                  placeholder="Seu melhor e-mail"
                  className="flex-1 px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-yellow-400/50 focus:bg-white/15 transition-all"
                />
                <button className="px-6 py-3 bg-gradient-to-r from-yellow-400 to-yellow-600 text-black font-semibold rounded-lg hover:from-yellow-500 hover:to-yellow-700 transition-all">
                  Inscrever
                </button>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-4 sm:space-y-0">
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <Phone className="w-4 h-4 text-white/60" />
                  <span className="text-white/60 text-sm">(98) 9999-9999</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Mail className="w-4 h-4 text-white/60" />
                  <span className="text-white/60 text-sm">contato@barbershop.com</span>
                </div>
                <div className="flex items-center space-x-2">
                  <MapPin className="w-4 h-4 text-white/60" />
                  <span className="text-white/60 text-sm">São Luís, MA</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom */}
        <div className="mt-8 pt-8 border-t border-white/10 flex flex-col sm:flex-row justify-between items-center space-y-4 sm:space-y-0">
          <p className="text-white/60 text-sm">
            © 2026 BarberShop SaaS. Todos os direitos reservados.
          </p>
          <div className="flex space-x-6">
            <a href="#" className="text-white/60 hover:text-white text-sm transition-colors">
              Privacidade
            </a>
            <a href="#" className="text-white/60 hover:text-white text-sm transition-colors">
              Termos
            </a>
            <a href="#" className="text-white/60 hover:text-white text-sm transition-colors">
              Cookies
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}
