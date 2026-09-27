'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import {
  Clock,
  ShieldAlert,
  CheckCircle2,
  RefreshCw,
  LogOut,
  MessageCircle,
  HelpCircle,
  Building2,
  ArrowRight,
} from 'lucide-react'

export default function TrialExpiredPage() {
  const { user, logout } = useAuth()
  const router = useRouter()
  const [checking, setChecking] = useState(false)
  const [checkMessage, setCheckMessage] = useState<string | null>(null)

  const handleCheckStatus = async () => {
    setChecking(true)
    setCheckMessage(null)
    try {
      const res = await fetch('/api/barbershop/status', {
        credentials: 'include',
        cache: 'no-store',
      })
      if (res.ok) {
        const data = await res.json()
        if (data.status === 'APPROVED') {
          setCheckMessage('Parabéns! Sua conta foi aprovada. Redirecionando para o Dashboard...')
          setTimeout(() => {
            window.location.href = '/dashboard'
          }, 1500)
          return
        } else {
          setCheckMessage('Sua conta ainda permanece com status "Aguardando Aprovação". Entre em contato com o suporte para agilizar a liberação.')
        }
      } else {
        setCheckMessage('Não foi possível consultar o status no momento. Tente novamente em instantes.')
      }
    } catch {
      setCheckMessage('Erro de conexão com o servidor. Verifique sua rede e tente novamente.')
    } finally {
      setChecking(false)
    }
  }

  const handleLogout = () => {
    logout()
    router.push('/login')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-slate-900 to-black text-white flex flex-col justify-between relative overflow-hidden font-sans selection:bg-amber-500 selection:text-black">
      {/* Luzes de ambientação */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-amber-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 -right-40 w-96 h-96 bg-red-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header simplificado */}
      <header className="relative z-20 w-full px-6 py-4 flex items-center justify-between border-b border-white/5 bg-slate-950/40 backdrop-blur-md">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-amber-500 to-yellow-400 flex items-center justify-center font-bold text-black text-sm">
            BS
          </div>
          <span className="font-bold text-white tracking-tight">BarberShop SaaS</span>
        </div>

        <button
          onClick={handleLogout}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-slate-400 hover:text-white hover:bg-white/5 transition"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Sair da conta</span>
        </button>
      </header>

      {/* Conteúdo Central */}
      <main className="relative z-10 flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <div className="w-full max-w-xl bg-slate-900/80 border border-amber-500/30 rounded-2xl p-6 sm:p-8 backdrop-blur-xl shadow-2xl shadow-amber-500/5 text-center">
          {/* Ícone de Alerta */}
          <div className="w-16 h-16 bg-gradient-to-tr from-amber-500/20 to-red-500/10 border border-amber-500/30 rounded-2xl mx-auto flex items-center justify-center mb-6 shadow-inner">
            <Clock className="w-8 h-8 text-amber-400 animate-pulse" />
          </div>

          {/* Badge de Status */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30 mb-4">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
            <span>Período de Testes Expirado (7 Dias)</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mb-3">
            Conta Aguardando Aprovação Manual
          </h1>

          <p className="text-slate-300 text-sm sm:text-base leading-relaxed mb-6 max-w-lg mx-auto">
            O período de avaliação gratuita de <strong>7 dias</strong> da sua empresa foi concluído.
            O acesso completo à plataforma requer a aprovação manual do desenvolvedor ou administrador.
          </p>

          {/* Card Informativo com dados da conta */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 text-left mb-6 space-y-2.5 text-xs sm:text-sm">
            <div className="flex justify-between items-center py-1 border-b border-slate-800/80">
              <span className="text-slate-400">Usuário:</span>
              <span className="text-white font-medium">{user?.name || 'Administrador'}</span>
            </div>
            <div className="flex justify-between items-center py-1 border-b border-slate-800/80">
              <span className="text-slate-400">E-mail:</span>
              <span className="text-slate-300 font-mono">{user?.email}</span>
            </div>
            <div className="flex justify-between items-center py-1">
              <span className="text-slate-400">Situação:</span>
              <span className="text-amber-400 font-semibold flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                AGUARDANDO_APROVACAO
              </span>
            </div>
          </div>

          {/* Mensagem dinâmica de checagem */}
          {checkMessage && (
            <div className="mb-6 p-3.5 bg-slate-950/80 border border-amber-500/30 rounded-xl text-xs text-amber-300 text-left animate-in fade-in">
              {checkMessage}
            </div>
          )}

          {/* Botões de Ação */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={handleCheckStatus}
              disabled={checking}
              className="flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-black font-semibold rounded-xl text-sm transition-all shadow-lg shadow-amber-500/20 disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${checking ? 'animate-spin' : ''}`} />
              <span>Verificar Aprovação</span>
            </button>

            <a
              href="https://wa.me/5500000000000?text=Olá,%20gostaria%20de%20solicitar%20a%20aprovação%20da%20minha%20empresa%20no%20BarberShop"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 px-5 py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-medium rounded-xl text-sm border border-slate-700 transition-all cursor-pointer"
            >
              <MessageCircle className="w-4 h-4 text-emerald-400" />
              <span>Falar com Administrador</span>
            </a>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-800/80 text-xs text-slate-500">
            Dúvidas? Entre em contato pelo e-mail{' '}
            <span className="text-slate-400 font-mono">suporte@barbershop.com.br</span>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 w-full py-4 px-6 border-t border-white/5 bg-slate-950/20 text-center text-xs text-slate-500">
        BarberShop SaaS &bull; Gestão & Agendamento Inteligente &bull; Todos os direitos reservados.
      </footer>
    </div>
  )
}
