'use client'

import { useAuth } from '@/lib/auth-context'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowRight, Building2, LogIn } from 'lucide-react'
import { Button } from '@/components/ui/button'

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
    <section className="py-24 bg-background border-t border-border relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="rounded-3xl bg-card border border-border p-8 sm:p-12 lg:p-16 text-center shadow-xl relative overflow-hidden">
          
          {/* Background subtle radial glow */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-48 bg-primary/10 blur-[90px] rounded-full pointer-events-none" />

          {/* Título de Fechamento */}
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-foreground tracking-tight leading-tight max-w-3xl mx-auto mb-6">
            Pronto para simplificar os atendimentos da sua barbearia com{' '}
            <span className="text-primary">
              total controle?
            </span>
          </h2>

          <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed mb-10 text-justify sm:text-center">
            Seus clientes agendam com facilidade em tempo real. Sua barbearia gerencia barbeiros, comissões e faturamento com máxima segurança e organização.
          </p>

          {/* Botões de Ação */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 max-w-md mx-auto">
            <Button
              onClick={handleLogin}
              size="lg"
              className="w-full sm:w-auto h-12 px-8 font-semibold gap-2 shadow-md cursor-pointer"
            >
              <LogIn className="w-5 h-5" />
              <span>
                {user ? (user.role === 'CLIENT' ? 'Meus Agendamentos' : 'Acessar Meu Painel') : 'Acessar Plataforma'}
              </span>
              <ArrowRight className="w-5 h-5" />
            </Button>

            <Button
              asChild
              variant="outline"
              size="lg"
              className="w-full sm:w-auto h-12 px-7 font-medium gap-2 cursor-pointer"
            >
              <Link href="/register">
                <Building2 className="w-4 h-4 text-muted-foreground" />
                <span>Cadastrar Barbearia</span>
              </Link>
            </Button>
          </div>

        </div>
      </div>
    </section>
  )
}
