'use client'

import Link from 'next/link'
import { Calendar, ArrowRight, ShieldCheck, Mail, MessageCircle, MapPin, Building2, Phone, CreditCard, Lock } from 'lucide-react'

export default function Footer() {
  return (
    <footer className="bg-gray-950 border-t border-gray-800 text-slate-400 text-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
          
          {/* Coluna 1: Marca & Propósito */}
          <div className="space-y-4">
            <Link href="/" className="flex items-center space-x-3 group inline-block">
              <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white">
                <Calendar className="w-5 h-5 text-white" />
              </div>
              <div>
                <span className="text-xl font-bold tracking-tight text-white block">
                  Agenda<span className="text-blue-400">SaaS</span>
                </span>
                <span className="text-[10px] text-slate-500 font-mono tracking-wider">
                  S W Development
                </span>
              </div>
            </Link>

            <p className="text-slate-400 text-xs leading-relaxed">
              Plataforma de software em nuvem (SaaS) para gestão de barbearias e agendamento online de serviços em tempo real. Pontualidade, controle e tecnologia para o seu negócio.
            </p>

            <div className="space-y-1.5 text-xs text-slate-400 pt-1">
              <div className="flex items-center space-x-2 text-emerald-400">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>Sistema online e operacional 24/7</span>
              </div>
              <div className="flex items-center space-x-1.5 text-slate-400 text-[11px]">
                <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                <span>São Luís - MA, Brasil</span>
              </div>
            </div>
          </div>

          {/* Coluna 2: Navegação & Recursos */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">Navegação</h4>
            <ul className="space-y-2 text-xs">
              <li>
                <a href="#home" className="text-slate-400 hover:text-blue-400 transition-colors flex items-center space-x-1.5">
                  <ArrowRight className="w-3 h-3 text-blue-500" />
                  <span>Início</span>
                </a>
              </li>
              <li>
                <a href="#recursos" className="text-slate-400 hover:text-blue-400 transition-colors flex items-center space-x-1.5">
                  <ArrowRight className="w-3 h-3 text-blue-500" />
                  <span>Recursos da Plataforma</span>
                </a>
              </li>
              <li>
                <a href="#planos" className="text-slate-400 hover:text-blue-400 transition-colors flex items-center space-x-1.5">
                  <ArrowRight className="w-3 h-3 text-blue-500" />
                  <span>Planos e Preços</span>
                </a>
              </li>
              <li>
                <Link href="/register" className="text-slate-400 hover:text-blue-400 transition-colors flex items-center space-x-1.5">
                  <ArrowRight className="w-3 h-3 text-blue-500" />
                  <span>Cadastrar Minha Barbearia</span>
                </Link>
              </li>
              <li>
                <Link href="/login" className="text-slate-400 hover:text-blue-400 transition-colors flex items-center space-x-1.5">
                  <ArrowRight className="w-3 h-3 text-blue-500" />
                  <span>Acesso à Conta (Login)</span>
                </Link>
              </li>
            </ul>
          </div>

          {/* Coluna 3: Políticas Legais & Compliance */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">Políticas e Termos</h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link href="/termos" className="text-slate-400 hover:text-blue-400 transition-colors flex items-center space-x-1.5">
                  <ArrowRight className="w-3 h-3 text-blue-500" />
                  <span>Termos de Uso</span>
                </Link>
              </li>
              <li>
                <Link href="/privacidade" className="text-slate-400 hover:text-blue-400 transition-colors flex items-center space-x-1.5">
                  <ArrowRight className="w-3 h-3 text-blue-500" />
                  <span>Política de Privacidade (LGPD)</span>
                </Link>
              </li>
              <li>
                <Link href="/cancelamento" className="text-slate-400 hover:text-blue-400 transition-colors flex items-center space-x-1.5">
                  <ArrowRight className="w-3 h-3 text-blue-500" />
                  <span>Cancelamento e Reembolso</span>
                </Link>
              </li>
            </ul>

            <div className="pt-2">
              <div className="p-3 rounded-xl bg-slate-900/80 border border-white/5 space-y-1.5">
                <div className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-400">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Pagamentos com Segurança</span>
                </div>
                <p className="text-[10px] text-slate-400 leading-tight">
                  Cobranças intermediadas com criptografia de dados bancários (PIX e Cartão).
                </p>
              </div>
            </div>
          </div>

          {/* Coluna 4: Canais de Contato & Suporte */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">Atendimento & Suporte</h4>
            <p className="text-xs text-slate-400">
              Dúvidas sobre contratação, agendamentos ou suporte técnico? Fale conosco:
            </p>

            <div className="space-y-2.5 pt-1">
              <a
                href="https://wa.me/5598984971547"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center space-x-2.5 text-xs text-slate-300 hover:text-emerald-400 p-2.5 rounded-xl bg-slate-900/60 border border-white/5 hover:border-emerald-500/30 transition group cursor-pointer"
              >
                <MessageCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                <div>
                  <span className="text-[10px] text-slate-500 block">WhatsApp Suporte</span>
                  <strong className="font-semibold">(98) 98497-1547</strong>
                </div>
              </a>

              <a
                href="mailto:swdevelopmentsuporte@gmail.com"
                className="flex items-center space-x-2.5 text-xs text-slate-300 hover:text-blue-400 p-2.5 rounded-xl bg-slate-900/60 border border-white/5 hover:border-blue-500/30 transition group cursor-pointer"
              >
                <Mail className="w-4 h-4 text-blue-400 shrink-0" />
                <div className="overflow-hidden">
                  <span className="text-[10px] text-slate-500 block">E-mail Institucional</span>
                  <strong className="font-semibold text-[11px] truncate block">swdevelopmentsuporte@gmail.com</strong>
                </div>
              </a>
            </div>

            <span className="text-[10px] text-slate-500 block pt-1">
              Horário de Atendimento: Seg a Sex, das 08h às 18h
            </span>
          </div>

        </div>

        {/* Faixa Cadastral Institucional: CNPJ, Razão Social e Nome Fantasia */}
        <div className="mt-12 pt-8 border-t border-white/10 space-y-4">
          <div className="p-4 rounded-2xl bg-slate-900/40 border border-white/5 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-slate-400">
            <div className="space-y-1 text-center md:text-left">
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-x-3 gap-y-1 text-slate-300">
                <span><strong>Razão Social:</strong> S W Systems LTDA</span>
                <span>•</span>
                <span><strong>Nome Fantasia:</strong> S W Development</span>
                <span>•</span>
                <span><strong>CNPJ:</strong> <code className="text-white font-mono bg-white/5 px-2 py-0.5 rounded">39.825.909/0001-14</code></span>
              </div>
              <p className="text-[11px] text-slate-500">
                Endereço: São Luís - MA, Brasil &bull; Plataforma em conformidade com as diretrizes do Banco Central e a Lei Geral de Proteção de Dados (LGPD).
              </p>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-950 border border-white/10 text-[11px] text-slate-300 font-medium">
                <Lock className="w-3.5 h-3.5 text-emerald-400" />
                <span>SSL Seguro 256-bit</span>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-950 border border-emerald-500/30 text-[11px] text-emerald-400 font-semibold">
                <CreditCard className="w-3.5 h-3.5" />
                <span>Pagamento Seguro</span>
              </div>
            </div>
          </div>

          {/* Copyright e Links Diretos */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500 pt-2">
            <p>
              &copy; {new Date().getFullYear()} S W Systems LTDA (S W Development). Todos os direitos reservados.
            </p>
            <div className="flex flex-wrap items-center gap-4 text-xs">
              <Link href="/termos" className="hover:text-blue-400 transition">
                Termos de Uso
              </Link>
              <span>•</span>
              <Link href="/privacidade" className="hover:text-blue-400 transition">
                Política de Privacidade
              </Link>
              <span>•</span>
              <Link href="/cancelamento" className="hover:text-blue-400 transition">
                Política de Cancelamento
              </Link>
            </div>
          </div>
        </div>

      </div>
    </footer>
  )
}
