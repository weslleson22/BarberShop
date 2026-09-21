'use client'

import { useState } from 'react'
import { useAuth } from '@/lib/auth-context'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Menu, X, Calendar, ArrowRight, User, Building2, LogIn } from 'lucide-react'

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const { user } = useAuth()
  const router = useRouter()

  const getUserDestination = () => {
    if (!user) return '/login'
    if (user.role === 'DEVELOPER') return '/developer'
    if (user.role === 'CLIENT') return '/meus-agendamentos'
    return '/dashboard'
  }

  const getUserLabel = () => {
    if (!user) return 'Minha Conta'
    if (user.role === 'CLIENT') return 'Meus Agendamentos'
    if (user.role === 'DEVELOPER') return 'Painel Developer'
    return 'Painel de Gestão'
  }

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-[#090D16]/80 backdrop-blur-xl border-b border-white/5 transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          
          {/* Logo da Plataforma */}
          <Link href="/" className="flex items-center space-x-3 group">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-blue-600 via-blue-500 to-cyan-400 p-0.5 shadow-lg shadow-blue-500/20 group-hover:shadow-blue-500/35 transition-all">
              <div className="w-full h-full bg-[#0B1120] rounded-[10px] flex items-center justify-center">
                <Calendar className="w-5 h-5 text-blue-400 group-hover:scale-110 transition-transform" />
              </div>
            </div>
            <div>
              <span className="text-xl font-bold tracking-tight text-white block leading-none">
                Agenda<span className="text-blue-400">SaaS</span>
              </span>
              <span className="text-[10px] text-slate-400 tracking-wider uppercase font-medium">
                Gestão e Agendamentos
              </span>
            </div>
          </Link>

          {/* Menu Desktop */}
          <nav className="hidden md:flex items-center space-x-8 text-sm font-medium text-slate-300">
            <a href="#home" className="hover:text-blue-400 transition-colors">Início</a>
            <a href="#recursos" className="hover:text-blue-400 transition-colors">Recursos do Sistema</a>
            <a href="#beneficios" className="hover:text-blue-400 transition-colors">Vantagens</a>
          </nav>

          {/* Ações Desktop */}
          <div className="hidden md:flex items-center space-x-3">
            {user ? (
              <Link
                href={getUserDestination()}
                className="px-5 py-2.5 text-sm font-semibold bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white rounded-xl shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transition-all flex items-center space-x-2"
              >
                <User className="w-4 h-4 text-blue-100" />
                <span>{getUserLabel()}</span>
                <ArrowRight className="w-4 h-4 text-blue-100" />
              </Link>
            ) : (
              <>
                <Link
                  href="/register"
                  className="px-4 py-2.5 text-sm font-medium text-slate-300 hover:text-white hover:bg-white/5 border border-transparent hover:border-white/10 rounded-xl transition-all flex items-center space-x-1.5"
                >
                  <Building2 className="w-4 h-4 text-slate-400" />
                  <span>Cadastre sua Empresa</span>
                </Link>

                <Link
                  href="/login"
                  className="px-5 py-2.5 text-sm font-semibold bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white rounded-xl shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transition-all flex items-center space-x-2 group"
                >
                  <LogIn className="w-4 h-4 text-blue-100" />
                  <span>Entrar na Conta</span>
                  <ArrowRight className="w-4 h-4 text-blue-100 group-hover:translate-x-1 transition-transform" />
                </Link>
              </>
            )}
          </div>

          {/* Botão Menu Mobile */}
          <div className="md:hidden flex items-center gap-2">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors"
              aria-label="Abrir menu"
            >
              {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Menu Mobile */}
        {isMenuOpen && (
          <div className="md:hidden bg-[#0B1120]/95 backdrop-blur-2xl border-t border-white/10 py-6 px-4 space-y-4 rounded-b-2xl shadow-2xl animate-in slide-in-from-top-2 duration-200">
            <nav className="flex flex-col space-y-3 text-base font-medium text-slate-300">
              <a
                href="#home"
                onClick={() => setIsMenuOpen(false)}
                className="px-3 py-2 rounded-lg hover:bg-white/5 hover:text-blue-400 transition-colors"
              >
                Início
              </a>
              <a
                href="#recursos"
                onClick={() => setIsMenuOpen(false)}
                className="px-3 py-2 rounded-lg hover:bg-white/5 hover:text-blue-400 transition-colors"
              >
                Recursos do Sistema
              </a>
              <a
                href="#beneficios"
                onClick={() => setIsMenuOpen(false)}
                className="px-3 py-2 rounded-lg hover:bg-white/5 hover:text-blue-400 transition-colors"
              >
                Vantagens
              </a>
            </nav>

            <div className="pt-4 border-t border-white/10 space-y-3">
              {user ? (
                <Link
                  href={getUserDestination()}
                  onClick={() => setIsMenuOpen(false)}
                  className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-500 text-white font-semibold rounded-xl shadow-lg shadow-blue-500/25 flex items-center justify-center space-x-2"
                >
                  <User className="w-4 h-4" />
                  <span>{getUserLabel()}</span>
                </Link>
              ) : (
                <>
                  <Link
                    href="/login"
                    onClick={() => setIsMenuOpen(false)}
                    className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-500 text-white font-semibold rounded-xl shadow-lg shadow-blue-500/25 flex items-center justify-center space-x-2"
                  >
                    <LogIn className="w-4 h-4" />
                    <span>Entrar na Conta</span>
                  </Link>

                  <Link
                    href="/register"
                    onClick={() => setIsMenuOpen(false)}
                    className="w-full py-3 px-4 text-center block text-slate-300 hover:text-white border border-slate-700/80 rounded-xl hover:bg-white/5 transition-all text-sm font-medium"
                  >
                    Cadastrar Empresa
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  )
}
