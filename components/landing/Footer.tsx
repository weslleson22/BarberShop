'use client'

import Link from 'next/link'
import { Scissors, ArrowRight, ShieldCheck, Mail, MessageCircle } from 'lucide-react'

export default function Footer() {
  return (
    <footer className="bg-card border-t border-border text-muted-foreground text-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
          
          {/* Coluna 1: Marca & Propósito */}
          <div className="space-y-4">
            <Link href="/" className="flex items-center space-x-3 group inline-block">
              <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-primary-foreground shadow-sm">
                <Scissors className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xl font-bold tracking-tight text-foreground block">
                  BarberShop<span className="text-primary">.</span>
                </span>
                <span className="text-[10px] text-muted-foreground font-mono tracking-wider">
                  S W Development
                </span>
              </div>
            </Link>

            <p className="text-muted-foreground text-xs leading-relaxed">
              Plataforma de software em nuvem (SaaS) para gestão de barbearias e agendamento online de serviços em tempo real. Pontualidade, controle e tecnologia para o seu negócio.
            </p>
          </div>

          {/* Coluna 2: Navegação & Recursos */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">Navegação</h4>
            <ul className="space-y-2 text-xs">
              <li>
                <a href="#home" className="text-muted-foreground hover:text-primary transition-colors flex items-center space-x-1.5">
                  <ArrowRight className="w-3 h-3 text-primary" />
                  <span>Início</span>
                </a>
              </li>
              <li>
                <a href="#recursos" className="text-muted-foreground hover:text-primary transition-colors flex items-center space-x-1.5">
                  <ArrowRight className="w-3 h-3 text-primary" />
                  <span>Recursos da Plataforma</span>
                </a>
              </li>
              <li>
                <a href="#planos" className="text-muted-foreground hover:text-primary transition-colors flex items-center space-x-1.5">
                  <ArrowRight className="w-3 h-3 text-primary" />
                  <span>Planos e Preços</span>
                </a>
              </li>
              <li>
                <Link href="/register" className="text-muted-foreground hover:text-primary transition-colors flex items-center space-x-1.5">
                  <ArrowRight className="w-3 h-3 text-primary" />
                  <span>Cadastrar Minha Barbearia</span>
                </Link>
              </li>
              <li>
                <Link href="/login" className="text-muted-foreground hover:text-primary transition-colors flex items-center space-x-1.5">
                  <ArrowRight className="w-3 h-3 text-primary" />
                  <span>Acesso à Conta (Login)</span>
                </Link>
              </li>
            </ul>
          </div>

          {/* Coluna 3: Políticas Legais & Compliance */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">Políticas e Termos</h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link href="/termos" className="text-muted-foreground hover:text-primary transition-colors flex items-center space-x-1.5">
                  <ArrowRight className="w-3 h-3 text-primary" />
                  <span>Termos de Uso</span>
                </Link>
              </li>
              <li>
                <Link href="/privacidade" className="text-muted-foreground hover:text-primary transition-colors flex items-center space-x-1.5">
                  <ArrowRight className="w-3 h-3 text-primary" />
                  <span>Política de Privacidade (LGPD)</span>
                </Link>
              </li>
              <li>
                <Link href="/cancelamento" className="text-muted-foreground hover:text-primary transition-colors flex items-center space-x-1.5">
                  <ArrowRight className="w-3 h-3 text-primary" />
                  <span>Cancelamento e Reembolso</span>
                </Link>
              </li>
            </ul>

            <div className="pt-2">
              <div className="p-3 rounded-xl bg-muted/40 border border-border space-y-1.5">
                <div className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Pagamentos com Segurança</span>
                </div>
                <p className="text-[10px] text-muted-foreground leading-tight">
                  Cobranças intermediadas com criptografia de ponta a ponta (PIX e Cartão).
                </p>
              </div>
            </div>
          </div>

          {/* Coluna 4: Canais de Contato & Suporte */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">Atendimento & Suporte</h4>
            <p className="text-xs text-muted-foreground">
              Dúvidas sobre contratação, agendamentos ou suporte técnico? Fale conosco:
            </p>

            <div className="space-y-2.5 pt-1">
              <a
                href="https://wa.me/5598984971547"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center space-x-2.5 text-xs text-foreground hover:text-emerald-600 dark:hover:text-emerald-400 p-2.5 rounded-xl bg-muted/50 border border-border hover:border-emerald-500/30 transition group cursor-pointer"
              >
                <MessageCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                <div>
                  <span className="text-[10px] text-muted-foreground block">WhatsApp Suporte</span>
                  <strong className="font-semibold">(98) 98497-1547</strong>
                </div>
              </a>

              <a
                href="mailto:swdevelopmentsuporte@gmail.com"
                className="flex items-center space-x-2.5 text-xs text-foreground hover:text-primary p-2.5 rounded-xl bg-muted/50 border border-border hover:border-primary/30 transition group cursor-pointer"
              >
                <Mail className="w-4 h-4 text-primary shrink-0" />
                <div className="overflow-hidden">
                  <span className="text-[10px] text-muted-foreground block">E-mail Institucional</span>
                  <strong className="font-semibold text-[11px] truncate block">swdevelopmentsuporte@gmail.com</strong>
                </div>
              </a>
            </div>

            <span className="text-[10px] text-muted-foreground block pt-1">
              Horário de Atendimento: Seg a Sex, das 08h às 18h
            </span>
          </div>

        </div>

        {/* Copyright e Links Diretos */}
        <div className="mt-12 pt-8 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <p>
            &copy; {new Date().getFullYear()} BarberShop Cloud. Todos os direitos reservados.
          </p>
          <div className="flex flex-wrap items-center gap-4 text-xs">
            <Link href="/termos" className="hover:text-primary transition">
              Termos de Uso
            </Link>
            <span>•</span>
            <Link href="/privacidade" className="hover:text-primary transition">
              Política de Privacidade
            </Link>
            <span>•</span>
            <Link href="/cancelamento" className="hover:text-primary transition">
              Política de Cancelamento
            </Link>
          </div>
        </div>

      </div>
    </footer>
  )
}
