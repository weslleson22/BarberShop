'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth-context'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { 
  ArrowRight, 
  Star, 
  Building2,
  LogIn,
  BarChart3
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

const FULL_HEADLINE = "A gestão da sua barbearia com controle total, agilidade e excelência."
const PREFIX_HEADLINE = "A gestão da sua barbearia com "

export default function Hero() {
  const { user } = useAuth()
  const router = useRouter()

  // Efeito de Máquina de Escrever (Typewriter) com pausa de 5 segundos ao completar
  const [displayedText, setDisplayedText] = useState("")
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    let timer: NodeJS.Timeout

    if (!isDeleting && displayedText.length < FULL_HEADLINE.length) {
      // Digitando caractere por caractere
      timer = setTimeout(() => {
        setDisplayedText(FULL_HEADLINE.slice(0, displayedText.length + 1))
      }, 50)
    } else if (!isDeleting && displayedText.length === FULL_HEADLINE.length) {
      // Texto completo: aguarda exatamente 5 segundos antes de reiniciar o ciclo
      timer = setTimeout(() => {
        setIsDeleting(true)
      }, 5000)
    } else if (isDeleting && displayedText.length > 0) {
      // Apagando rapidamente
      timer = setTimeout(() => {
        setDisplayedText(FULL_HEADLINE.slice(0, displayedText.length - 1))
      }, 20)
    } else if (isDeleting && displayedText.length === 0) {
      // Reinicia o ciclo de digitação
      timer = setTimeout(() => {
        setIsDeleting(false)
      }, 400)
    }

    return () => clearTimeout(timer)
  }, [displayedText, isDeleting])

  const part1 = displayedText.slice(0, PREFIX_HEADLINE.length)
  const part2 = displayedText.length > PREFIX_HEADLINE.length ? displayedText.slice(PREFIX_HEADLINE.length) : ""

  const handleAccess = () => {
    if (user) {
      if (user.role === 'DEVELOPER') router.push('/developer')
      else if (user.role === 'CLIENT') router.push('/meus-agendamentos')
      else router.push('/dashboard')
    } else {
      router.push('/login')
    }
  }

  return (
    <section id="home" className="relative min-h-screen pt-28 sm:pt-36 pb-20 flex items-center bg-background text-foreground overflow-hidden">
      {/* Background radial glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-primary/10 blur-[130px] rounded-full pointer-events-none -z-10" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div className="grid lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          
          {/* Conteúdo Esquerdo */}
          <div className="lg:col-span-6 xl:col-span-6 space-y-8 text-center lg:text-left">
            
            {/* Título de Alto Impacto com Animação de Digitação */}
            <div className="space-y-4">
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.15] text-foreground min-h-[140px] sm:min-h-[160px] lg:min-h-[190px]">
                <span>{part1}</span>
                {part2 && (
                  <span className="text-primary underline decoration-primary/30 underline-offset-8">
                    {part2}
                  </span>
                )}
                <span className="inline-block w-[3px] h-[0.82em] bg-primary align-middle ml-1.5 animate-pulse" />
              </h1>
              <p className="text-base sm:text-lg text-muted-foreground leading-relaxed max-w-2xl mx-auto lg:mx-0 font-normal text-justify">
                Automatize agendamentos online em tempo real, fidelize clientes, controle comissões da equipe e acompanhe seu faturamento em um painel elegante e intuitivo.
              </p>
            </div>

            {/* Botões de Ação Principais (shadcn Button) */}
            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3.5">
              <Button 
                onClick={handleAccess}
                size="lg"
                className="w-full sm:w-auto h-12 px-7 font-semibold text-base shadow-sm gap-2.5 cursor-pointer"
              >
                <LogIn className="w-4 h-4" />
                <span>
                  {user ? (user.role === 'CLIENT' ? 'Meus Agendamentos' : 'Acessar Meu Painel') : 'Acessar a Plataforma'}
                </span>
                <ArrowRight className="w-4 h-4" />
              </Button>

              <Button 
                asChild
                variant="outline"
                size="lg"
                className="w-full sm:w-auto h-12 px-6 font-semibold text-base gap-2 cursor-pointer"
              >
                <Link href="/register">
                  <Building2 className="w-4 h-4" />
                  <span>Cadastrar Barbearia</span>
                </Link>
              </Button>
            </div>

            {/* Prova Social e Avaliação */}
            <div className="pt-4 border-t border-border flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-6">
              <div className="flex items-center space-x-3">
                <div className="flex -space-x-2">
                  <div className="w-9 h-9 rounded-full bg-primary text-primary-foreground border-2 border-background flex items-center justify-center text-xs font-bold shadow-sm">
                    JD
                  </div>
                  <div className="w-9 h-9 rounded-full bg-blue-600 text-white border-2 border-background flex items-center justify-center text-xs font-bold shadow-sm">
                    MC
                  </div>
                  <div className="w-9 h-9 rounded-full bg-emerald-600 text-white border-2 border-background flex items-center justify-center text-xs font-bold shadow-sm">
                    AL
                  </div>
                  <div className="w-9 h-9 rounded-full bg-muted text-foreground border-2 border-background flex items-center justify-center text-xs font-bold shadow-sm">
                    +10k
                  </div>
                </div>
                <div className="text-left">
                  <p className="text-sm font-semibold text-foreground">Atendimentos Gerenciados</p>
                  <p className="text-xs text-muted-foreground">Pontualidade e satisfação comprovada</p>
                </div>
              </div>

              <div className="flex items-center space-x-1.5 pl-0 sm:pl-4 sm:border-l sm:border-border">
                <div className="flex text-amber-500">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-current" />
                  ))}
                </div>
                <span className="text-sm font-bold text-foreground ml-1">5/5</span>
                <span className="text-xs text-muted-foreground">avaliações</span>
              </div>
            </div>

          </div>

          {/* Lado Direito: Screenshot Real do Painel / Dashboard (shadcn Mockup Window) */}
          <div className="lg:col-span-6 xl:col-span-6 relative">
            <div className="relative mx-auto max-w-lg lg:max-w-none">
              
              {/* Efeito de brilho de fundo atrás da janela */}
              <div className="absolute -inset-1 rounded-3xl bg-gradient-to-r from-primary/30 via-emerald-500/20 to-primary/20 blur-xl opacity-70" />

              {/* Janela de Navegador no Estilo shadcn */}
              <div className="relative rounded-2xl border border-border bg-card shadow-2xl overflow-hidden group">
                
                {/* Barra de Título da Janela (sem barbershop.cloud/dashboard e sem Ao Vivo) */}
                <div className="flex items-center px-4 py-3 bg-muted/60 border-b border-border">
                  <div className="flex items-center space-x-2">
                    <span className="w-3 h-3 rounded-full bg-rose-500/80 inline-block shadow-xs" />
                    <span className="w-3 h-3 rounded-full bg-amber-500/80 inline-block shadow-xs" />
                    <span className="w-3 h-3 rounded-full bg-emerald-500/80 inline-block shadow-xs" />
                  </div>
                </div>

                {/* Imagem Real do Dashboard (da pasta img/) */}
                <div className="relative w-full aspect-[16/10] bg-muted/20 overflow-hidden">
                  <Image
                    src="/api/media/landing/dashboard"
                    alt="Painel de Controle e Métricas - BarberShop Cloud"
                    fill
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 650px"
                    className="object-cover object-top transition-transform duration-700 group-hover:scale-[1.02]"
                    priority
                  />
                </div>

                {/* Barra Inferior com Destaques Reais do Sistema */}
                <div className="p-3.5 bg-card border-t border-border flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span className="font-semibold text-foreground">Faturamento & Agendamentos Consolidados</span>
                  </div>
                  <Badge variant="secondary" className="gap-1 font-semibold text-[11px]">
                    <BarChart3 className="w-3 h-3 text-primary" />
                    <span>Métricas Reais</span>
                  </Badge>
                </div>

              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  )
}
