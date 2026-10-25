'use client'

import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { 
  Calendar, 
  Bell, 
  ShieldCheck, 
  Smartphone, 
  Users, 
  CheckCircle2, 
  ArrowRight,
  Layers,
  CalendarCheck
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

export default function Features() {
  const router = useRouter()

  const features = [
    {
      icon: Calendar,
      title: 'Agenda em Tempo Real',
      description: 'Horários sincronizados instantaneamente, eliminando conflitos e duplicidades na agenda.',
    },
    {
      icon: Bell,
      title: 'Lembretes Inteligentes',
      description: 'Avisos automáticos enviados aos clientes, reduzindo faltas e garantindo pontualidade.',
    },
    {
      icon: Layers,
      title: 'Catálogo de Serviços',
      description: 'Valores claros, duração estimada e detalhes completos de cada serviço cadastrado.',
    },
    {
      icon: Users,
      title: 'Profissionais Dedicados',
      description: 'Escolha simplificada do barbeiro de preferência e do melhor horário de atendimento.',
    },
    {
      icon: Smartphone,
      title: 'Experiência 100% Responsiva',
      description: 'Agendamento rápido e intuitivo em qualquer celular, tablet ou computador.',
    },
    {
      icon: ShieldCheck,
      title: 'Segurança & Privacidade',
      description: 'Criptografia de ponta a ponta com proteção de dados e conformidade total à LGPD.',
    }
  ]

  return (
    <section id="recursos" className="py-24 bg-background border-t border-border relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Cabeçalho da Seção */}
        <div className="text-center mb-16 space-y-4">
          <Badge variant="outline" className="px-3.5 py-1.5 text-xs font-semibold gap-2 border-primary/30 text-primary bg-primary/10">
            <CalendarCheck className="w-3.5 h-3.5 text-primary" />
            <span>Recursos da Plataforma</span>
          </Badge>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-foreground tracking-tight">
            Tudo o que sua barbearia precisa para{' '}
            <span className="text-primary">
              agendar com máxima eficiência.
            </span>
          </h2>
          <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto">
            Uma plataforma completa desenvolvida para tornar o agendamento de serviços ágil, transparente e sem atritos tanto para sua equipe quanto para seus clientes.
          </p>
        </div>

        {/* Vitrine Visual Showcase: Imagem Real da Agenda do Sistema */}
        <div className="mb-20 rounded-2xl border border-border bg-card p-6 sm:p-10 shadow-lg">
          <div className="grid lg:grid-cols-12 gap-10 items-center">
            
            <div className="lg:col-span-6 space-y-6">
              <Badge variant="secondary" className="px-3 py-1 text-xs font-bold uppercase tracking-wider text-primary bg-primary/10">
                Grade & Horários em Tempo Real
              </Badge>
              <h3 className="text-2xl sm:text-3xl font-extrabold text-foreground leading-tight">
                Agendamento simplificado com controle completo por profissional.
              </h3>
              <p className="text-sm sm:text-base text-muted-foreground leading-relaxed text-justify">
                Visualize a grade da sua barbearia em tempo real, acompanhando horários livres e atendimentos com total clareza.
              </p>

              <div className="space-y-3.5 pt-2">
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <CheckCircle2 className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <strong className="text-foreground text-sm block">Seleção clara de serviços</strong>
                    <span className="text-xs text-muted-foreground">Valores, duração estimada e barbeiro sempre visíveis.</span>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 rounded-lg bg-emerald-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  </div>
                  <div>
                    <strong className="text-foreground text-sm block">Grade de horários inteligente</strong>
                    <span className="text-xs text-muted-foreground">Exibição exclusiva de horários livres, sem duplicidade.</span>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 rounded-lg bg-blue-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <CheckCircle2 className="w-4 h-4 text-blue-500" />
                  </div>
                  <div>
                    <strong className="text-foreground text-sm block">Comprovante e lembretes automáticos</strong>
                    <span className="text-xs text-muted-foreground">Avisos imediatos antes do início do atendimento.</span>
                  </div>
                </div>
              </div>

              <div className="pt-3">
                <Button
                  onClick={() => router.push('/login')}
                  className="font-semibold gap-2 shadow-sm cursor-pointer"
                >
                  <Calendar className="w-4 h-4" />
                  <span>Acessar a Plataforma</span>
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Imagem Real da Agenda da Barbearia (da pasta img/page agenda.png) */}
            <div className="lg:col-span-6 relative">
              <div className="relative rounded-2xl border border-border bg-card shadow-2xl overflow-hidden group">
                
                {/* Janela estilo navegador shadcn (sem barbershop.cloud/agenda) */}
                <div className="flex items-center px-4 py-3 bg-muted/60 border-b border-border">
                  <div className="flex items-center space-x-2">
                    <span className="w-3 h-3 rounded-full bg-rose-500/80 inline-block shadow-xs" />
                    <span className="w-3 h-3 rounded-full bg-amber-500/80 inline-block shadow-xs" />
                    <span className="w-3 h-3 rounded-full bg-emerald-500/80 inline-block shadow-xs" />
                  </div>
                </div>

                {/* Frame da Imagem Real */}
                <div className="relative w-full aspect-[16/10] bg-muted/20 overflow-hidden">
                  <Image
                    src="/api/media/landing/agenda"
                    alt="Visão Real da Agenda de Serviços - BarberShop Cloud"
                    fill
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 650px"
                    className="object-cover object-top transition-transform duration-700 group-hover:scale-[1.02]"
                  />
                </div>

                {/* Rodapé do Frame com badge de status */}
                <div className="p-3.5 bg-card border-t border-border flex items-center justify-between text-xs">
                  <div className="flex items-center space-x-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-foreground font-semibold">Agendamentos em Aberto</span>
                  </div>
                  <Badge variant="secondary" className="text-[11px] font-semibold text-primary">
                    100% Sincronizado
                  </Badge>
                </div>

              </div>
            </div>

          </div>
        </div>

        {/* Grid de Cards de Recursos */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <div 
              key={index}
              className="group relative overflow-hidden bg-card border border-border rounded-2xl p-7 hover:border-primary/40 hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div>
                {/* Ícone com padrão shadcn */}
                <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary mb-5 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                  <feature.icon className="w-5 h-5" />
                </div>
                
                <h3 className="text-lg font-bold text-foreground mb-2 group-hover:text-primary transition-colors">
                  {feature.title}
                </h3>
                
                <p className="text-sm text-muted-foreground leading-relaxed text-justify">
                  {feature.description}
                </p>
              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  )
}
