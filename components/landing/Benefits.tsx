'use client'

import { Calendar, Bell, Zap } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

export default function Benefits() {
  const steps = [
    {
      step: '01',
      icon: Zap,
      title: '1. Escolha o Serviço',
      description: 'Navegue pelos serviços disponíveis, consulte a duração estimada e confira os valores com transparência.',
      badge: 'Catálogo Claro',
    },
    {
      step: '02',
      icon: Calendar,
      title: '2. Selecione o Horário',
      description: 'Escolha o profissional de sua preferência e encontre horários livres atualizados em tempo real sem conflitos.',
      badge: 'Tempo Real',
    },
    {
      step: '03',
      icon: Bell,
      title: '3. Confirmação & Lembrete',
      description: 'Receba confirmação imediata e lembretes automáticos no celular para nunca perder seu atendimento.',
      badge: 'Avisos Automáticos',
    }
  ]

  return (
    <section id="como-funciona" className="py-24 bg-background border-t border-border relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Cabeçalho da Seção */}
        <div className="text-center mb-16 space-y-4">
          <Badge variant="outline" className="px-3.5 py-1.5 text-xs font-semibold gap-2 border-primary/30 text-primary bg-primary/10">
            <Zap className="w-3.5 h-3.5 text-primary" />
            <span>Processo 100% Descomplicado</span>
          </Badge>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-foreground tracking-tight">
            Como funciona o{' '}
            <span className="text-primary">
              agendamento de serviços?
            </span>
          </h2>
          <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto">
            Sem filas de espera, sem ligações e sem burocracia. O cliente agenda o atendimento em menos de 1 minuto diretamente pelo link da sua barbearia.
          </p>
        </div>

        {/* Grid de Passos */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
          {steps.map((item, index) => (
            <div 
              key={index}
              className="group relative rounded-2xl bg-card border border-border p-8 hover:border-primary/40 hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div>
                {/* Cabeçalho do Card */}
                <div className="flex items-center justify-between mb-6">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                    <item.icon className="w-6 h-6" />
                  </div>
                  <span className="text-3xl font-black text-muted-foreground/20 group-hover:text-primary/30 transition-colors">
                    {item.step}
                  </span>
                </div>

                <div className="mb-2">
                  <Badge variant="secondary" className="text-[11px] font-semibold text-primary mb-2">
                    {item.badge}
                  </Badge>
                  <h3 className="text-xl font-bold text-foreground mb-3 group-hover:text-primary transition-colors">
                    {item.title}
                  </h3>
                </div>

                <p className="text-sm text-muted-foreground leading-relaxed text-justify">
                  {item.description}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Métricas de Performance */}
        <div id="beneficios" className="mt-20 pt-12 border-t border-border grid grid-cols-2 lg:grid-cols-4 gap-6 text-center">
          <div className="p-5 rounded-2xl bg-card border border-border shadow-xs">
            <div className="text-3xl sm:text-4xl font-extrabold text-primary mb-1">
              &lt; 60s
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground">Tempo médio para agendar</p>
          </div>
          <div className="p-5 rounded-2xl bg-card border border-border shadow-xs">
            <div className="text-3xl sm:text-4xl font-extrabold text-primary mb-1">
              24/7
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground">Disponibilidade online contínua</p>
          </div>
          <div className="p-5 rounded-2xl bg-card border border-border shadow-xs">
            <div className="text-3xl sm:text-4xl font-extrabold text-primary mb-1">
              Zero
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground">Conflito ou duplicidade de horários</p>
          </div>
          <div className="p-5 rounded-2xl bg-card border border-border shadow-xs">
            <div className="text-3xl sm:text-4xl font-extrabold text-primary mb-1">
              100%
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground">Seguro e criptografado</p>
          </div>
        </div>

      </div>
    </section>
  )
}
