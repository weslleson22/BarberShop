'use client'

import { useAuth } from '@/lib/auth-context'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowRight, CheckCircle2, ShieldCheck, Clock, Lock, Building2, LogIn } from 'lucide-react'

export default function CTA() {
  const { user } = useAuth()
  const router = useRouter()

  const handleLogin = () => {
    if (user) {
      if (user.role === 'DEVELOPER') router.push('/developer')
      else if (user.role === 'CLIENT') router.push('/meus-agendamentos')
      else router.push('/dashboard')
    } else {
      router.push('/login')
    }
  }

  return (
    <section className="py-24 bg-gray-950 border-t border-gray-800 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="rounded-2xl bg-gray-900 border border-gray-800 p-8 sm:p-12 lg:p-16 text-center">
          
          {/* Badge */}
          <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-gray-950 border border-gray-800 text-blue-400 text-xs font-semibold uppercase tracking-wider mb-6">
            <Lock className="w-3.5 h-3.5 text-blue-400" />
            <span>Acesso Seguro e Centralizado</span>
          </div>

          {/* Título de Fechamento */}
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight leading-tight max-w-3xl mx-auto mb-6">
            Pronto para simplificar seus atendimentos com{' '}
            <span className="text-blue-400">
              total controle?
            </span>
          </h2>

          <p className="text-base sm:text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed mb-10">
            Clientes cadastrados acessam horários exclusivos com facilidade. Empresas gerenciam suas unidades, serviços e equipe em tempo real.
          </p>

          {/* Botões de Ação */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 max-w-md mx-auto mb-10">
            <button
              onClick={handleLogin}
              className="w-full sm:w-auto px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl transition-colors flex items-center justify-center space-x-2 group cursor-pointer"
            >
              <LogIn className="w-5 h-5 text-blue-100" />
              <span>
                {user ? (user.role === 'CLIENT' ? 'Meus Agendamentos' : 'Acessar Meu Painel') : 'Acessar Plataforma'}
              </span>
              <ArrowRight className="w-5 h-5 text-blue-100 group-hover:translate-x-1 transition-transform" />
            </button>

            <Link
              href="/register"
              className="w-full sm:w-auto px-7 py-4 text-slate-200 hover:text-white bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/80 hover:border-slate-600 rounded-xl transition-all flex items-center justify-center space-x-2 font-medium"
            >
              <Building2 className="w-4 h-4 text-slate-400" />
              <span>Cadastrar Empresa</span>
            </Link>
          </div>

          {/* Destaques Rápidos */}
          <div className="pt-8 border-t border-white/5 flex flex-wrap items-center justify-center gap-6 text-xs sm:text-sm text-slate-400">
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Agendamento exclusivo para clientes</span>
            </div>
            <div className="flex items-center space-x-2">
              <Clock className="w-4 h-4 text-cyan-400" />
              <span>Disponível 24 horas por dia</span>
            </div>
            <div className="flex items-center space-x-2">
              <ShieldCheck className="w-4 h-4 text-blue-400" />
              <span>Isolamento e segurança multi-tenant</span>
            </div>
          </div>

        </div>
      </div>
    </section>
  )
}
