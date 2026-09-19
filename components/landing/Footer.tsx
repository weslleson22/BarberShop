'use client'

import Link from 'next/link'
import { Calendar, ArrowRight, ShieldCheck, Mail, Sparkles } from 'lucide-react'

export default function Footer() {
  return (
    <footer className="bg-[#060911] border-t border-white/5 text-slate-400 text-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
          
          {/* Coluna 1: Marca & Propósito */}
          <div className="space-y-4">
            <Link href="/" className="flex items-center space-x-3 group inline-block">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 via-blue-500 to-cyan-400 p-0.5 shadow-lg shadow-blue-500/20">
                <div className="w-full h-full bg-[#0B1120] rounded-[10px] flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-blue-400" />
                </div>
              </div>
              <span className="text-xl font-bold tracking-tight text-white block">
                Agenda<span className="text-blue-400">SaaS</span>
              </span>
            </Link>
            <p className="text-slate-400 text-sm leading-relaxed">
              Plataforma de agendamento de serviços online em tempo real. Conectamos clientes e profissionais com pontualidade, transparência e tecnologia.
            </p>
            <div className="flex items-center space-x-2 text-xs text-emerald-400 pt-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Sistema operacional e disponível 24h</span>
            </div>
          </div>

          {/* Coluna 2: Agendamentos */}
          <div className="space-y-3">
            <h4 className="text-sm font-bold text-white uppercase tracking-wider">Agendamento</h4>
            <ul className="space-y-2.5">
              <li>
                <Link href="/agendar" className="text-slate-400 hover:text-blue-400 transition-colors flex items-center space-x-1.5">
                  <ArrowRight className="w-3.5 h-3.5 text-blue-500" />
                  <span>Agendar Horário Online</span>
                </Link>
              </li>
              <li>
                <a href="#como-funciona" className="text-slate-400 hover:text-blue-400 transition-colors flex items-center space-x-1.5">
                  <ArrowRight className="w-3.5 h-3.5 text-blue-500" />
                  <span>Passo a Passo</span>
                </a>
              </li>
              <li>
                <a href="#recursos" className="text-slate-400 hover:text-blue-400 transition-colors flex items-center space-x-1.5">
                  <ArrowRight className="w-3.5 h-3.5 text-blue-500" />
                  <span>Lembretes e Avisos</span>
                </a>
              </li>
              <li>
                <Link href="/meus-agendamentos" className="text-slate-400 hover:text-blue-400 transition-colors flex items-center space-x-1.5">
                  <ArrowRight className="w-3.5 h-3.5 text-blue-500" />
                  <span>Consultar Meus Horários</span>
                </Link>
              </li>
            </ul>
          </div>

          {/* Coluna 3: Acesso à Plataforma */}
          <div className="space-y-3">
            <h4 className="text-sm font-bold text-white uppercase tracking-wider">Acesso</h4>
            <ul className="space-y-2.5">
              <li>
                <Link href="/login" className="text-slate-400 hover:text-blue-400 transition-colors flex items-center space-x-1.5">
                  <ArrowRight className="w-3.5 h-3.5 text-blue-500" />
                  <span>Entrar na Conta</span>
                </Link>
              </li>
              <li>
                <Link href="/register" className="text-slate-400 hover:text-blue-400 transition-colors flex items-center space-x-1.5">
                  <ArrowRight className="w-3.5 h-3.5 text-blue-500" />
                  <span>Criar Nova Conta</span>
                </Link>
              </li>
              <li>
                <a href="#beneficios" className="text-slate-400 hover:text-blue-400 transition-colors flex items-center space-x-1.5">
                  <ArrowRight className="w-3.5 h-3.5 text-blue-500" />
                  <span>Vantagens do Sistema</span>
                </a>
              </li>
            </ul>
          </div>

          {/* Coluna 4: Segurança & Privacidade */}
          <div className="space-y-3">
            <h4 className="text-sm font-bold text-white uppercase tracking-wider">Segurança</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Todos os dados trafegam por canais seguros com criptografia SSL e isolamento completo de informações.
            </p>
            <div className="pt-2 flex items-center space-x-2 text-xs text-blue-300 bg-blue-500/10 border border-blue-500/20 px-3 py-2 rounded-xl">
              <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span>Ambiente Protegido & Criptografado</span>
            </div>
          </div>

        </div>

        {/* Rodapé Final */}
        <div className="mt-12 pt-8 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <p>
            &copy; {new Date().getFullYear()} AgendaSaaS &bull; Plataforma de Agendamento de Serviços Online. Todos os direitos reservados.
          </p>
          <div className="flex items-center space-x-6">
            <span>Privacidade</span>
            <span>Termos de Uso</span>
            <span>Segurança</span>
          </div>
        </div>
      </div>
    </footer>
  )
}
