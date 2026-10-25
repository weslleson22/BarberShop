import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import { prisma } from '@/lib/prisma'
import { resolvePublicTenant } from '@/lib/tenant'
import BarberTeamScheduler from '@/components/public/BarberTeamScheduler'
import PublicServicesCatalog from '@/components/public/PublicServicesCatalog'
import { 
  Scissors, 
  Clock, 
  MapPin, 
  Phone, 
  Calendar, 
  Star, 
  ArrowRight,
  ShieldCheck,
  CalendarCheck,
  CheckCircle2,
  Building2,
  CalendarDays,
} from 'lucide-react'
import {
  parseBarbershopMetadata,
  normalizeOperatingHours,
  DEFAULT_OPERATING_HOURS,
  DAYS_CONFIG,
  type WeekOperatingHours,
} from '@/lib/operating-hours'

interface Props {
  params: Promise<{ slug: string }>
}

// SEO & OpenGraph Dinâmico Seguro (Sem expor dados sensíveis)
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const result = await resolvePublicTenant(slug)

  if (!result.success) {
    return {
      title: 'Barbearia não encontrada | BarberShop',
      description: 'A barbearia solicitada não existe ou não está ativa no momento.',
      robots: { index: false, follow: false },
    }
  }

  const { tenant } = result
  const { description: tenantBio } = parseBarbershopMetadata(tenant.description)
  const canonicalSlug = result.redirect ? result.targetSlug : (tenant.slug || slug)
  const canonicalUrl = `https://barbershop.com.br/b/${encodeURIComponent(canonicalSlug)}`
  const title = `${tenant.name} | Agendamento Online & Serviços`
  const description = tenantBio
    ? `${tenant.name} - ${tenantBio}`
    : `Agende seu horário na ${tenant.name}. Confira serviços exclusivos, equipe de barbeiros e disponibilidade em tempo real.`

  return {
    title,
    description,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      siteName: 'BarberShop Multi-Tenant',
      images: tenant.logo
        ? [
            {
              url: tenant.logo,
              width: 800,
              height: 600,
              alt: `Logo da ${tenant.name}`,
            },
          ]
        : [],
      locale: 'pt_BR',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: tenant.logo ? [tenant.logo] : [],
    },
    robots: {
      index: tenant.isActive,
      follow: tenant.isActive,
    },
  }
}

export default async function TenantPublicPage({ params }: Props) {
  const { slug } = await params

  // 1. Resolução estrita do Tenant via Slug (NUNCA fallback para primeira ativa)
  const tenantResult = await resolvePublicTenant(slug)
  if (!tenantResult.success) {
    notFound()
  }

  // 2. Comportamento definido para slug alterado: Redirecionamento permanente controlado (HTTP 308)
  if (tenantResult.redirect && tenantResult.targetSlug) {
    redirect(`/b/${encodeURIComponent(tenantResult.targetSlug)}`)
  }

  const tenant = tenantResult.tenant
  const { description: tenantBio, operatingHours: parsedHours, barberWorkDays } = parseBarbershopMetadata(tenant.description)
  const operatingHours: WeekOperatingHours = parsedHours
    ? normalizeOperatingHours(parsedHours)
    : DEFAULT_OPERATING_HOURS

  const todayDayIndex = new Date().getDay()
  const todayConfig = DAYS_CONFIG.find((d) => d.dayIndex === todayDayIndex) || DAYS_CONFIG[0]
  const todayHours = operatingHours[todayConfig.key]

  // 3. Buscar serviços estritamente deste tenant
  const services = await prisma.service.findMany({
    where: {
      barbershopId: tenant.id,
      isActive: true,
    },
    orderBy: {
      name: 'asc',
    },
  })

  // 4. Buscar barbeiros estritamente deste tenant
  const barbers = await prisma.user.findMany({
    where: {
      barbershopId: tenant.id,
      role: 'BARBER',
      isActive: true,
    },
    select: {
      id: true,
      name: true,
      email: true,
      avatar: true,
      bio: true,
      specialties: true,
      phone: true,
    },
    orderBy: {
      name: 'asc',
    },
  })

  // 5. Buscar agendamentos existentes dos próximos 15 dias para cálculo de horários livres
  const now = new Date()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0)
  const fifteenDaysLater = new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000)
  const appointments = prisma.appointment
    ? await prisma.appointment.findMany({
        where: {
          barbershopId: tenant.id,
          status: { notIn: ['CANCELLED', 'NO_SHOW'] },
          startTime: { gte: startOfToday, lte: fifteenDaysLater },
        },
        select: {
          id: true,
          barberId: true,
          startTime: true,
          service: {
            select: {
              duration: true,
            },
          },
        },
        orderBy: {
          startTime: 'asc',
        },
      })
    : []

  // Serialização segura para o Client Component
  const serializedServices = services.map((s) => ({
    id: s.id,
    name: s.name,
    price: Number(s.price),
    duration: s.duration,
    description: s.description,
    isActive: s.isActive,
  }))

  const serializedAppointments = appointments.map((apt) => ({
    id: apt.id,
    barberId: apt.barberId,
    startTime: apt.startTime.toISOString(),
    service: apt.service ? { duration: apt.service.duration } : null,
  }))

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value)
  }

  const activeSlug = tenant.slug || slug
  const bookingUrl = `/agendar?slug=${encodeURIComponent(activeSlug)}`

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Top Banner / Hero */}
      <header className="relative border-b border-border bg-card">
        <div className="max-w-6xl mx-auto px-4 py-8 sm:py-12 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4 text-center md:text-left">
            {tenant.logo ? (
              <img
                src={tenant.logo}
                alt={tenant.name}
                className="w-20 h-20 rounded-2xl object-cover border-2 border-primary/40 shadow-sm"
              />
            ) : (
              <div className="w-20 h-20 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold text-2xl shadow-sm">
                <Scissors className="w-10 h-10" />
              </div>
            )}
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-semibold uppercase tracking-wider mb-2">
                <ShieldCheck className="w-3.5 h-3.5" />
                Unidade Oficial Verificada
              </div>
              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
                {tenant.name}
              </h1>
              {tenantBio && (
                <p className="mt-1 text-sm text-muted-foreground max-w-xl">
                  {tenantBio}
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
            <Link
              href={bookingUrl}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-xl font-bold text-sm bg-primary hover:bg-primary/90 text-primary-foreground transition-all shadow-sm"
            >
              <Calendar className="w-4 h-4" />
              <span>Agendar Agora</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

        {/* Contact & Location Info Bar */}
        {(tenant.address || tenant.phone) && (
          <div className="border-t border-border bg-muted/40">
            <div className="max-w-6xl mx-auto px-4 py-3 flex flex-wrap items-center gap-6 text-xs text-muted-foreground">
              {tenant.address && (
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-primary shrink-0" />
                  <span>{tenant.address}</span>
                </div>
              )}
              {tenant.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-primary shrink-0" />
                  <span>{tenant.phone}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </header>

      {/* Main Content Area */}
      <main className="max-w-6xl mx-auto px-4 py-12 space-y-16">
        {/* Catálogo de Serviços & Fluxo Completo de Agendamento */}
        <PublicServicesCatalog
          services={serializedServices}
          barbers={barbers}
          appointments={serializedAppointments}
          slug={activeSlug}
          tenantName={tenant.name}
          tenantAddress={tenant.address}
          tenantPhone={tenant.phone}
          operatingHours={operatingHours}
          barberWorkDays={barberWorkDays || {}}
        />

        {/* Barbers / Professionals Section */}
        <section>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
            <div>
              <div className="flex items-center gap-2 text-primary text-sm font-semibold tracking-wide uppercase">
                <Star className="w-4 h-4 fill-primary text-primary" />
                Nossos Especialistas
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-foreground mt-1">
                Equipe de Barbeiros
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1 max-w-2xl">
                Consulte em tempo real a agenda completa no estilo Google Calendar: selecione o dia e o horário livre desejado para agendar diretamente com seu profissional favorito.
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold bg-emerald-500/10 px-3 py-1.5 rounded-xl border border-emerald-500/20 inline-flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                {barbers.length} Especialistas Disponíveis
              </span>
            </div>
          </div>

          <BarberTeamScheduler
            barbers={barbers}
            services={serializedServices}
            slug={activeSlug}
            tenantName={tenant.name}
            initialAppointments={serializedAppointments}
            operatingHours={operatingHours}
            barberWorkDays={barberWorkDays || {}}
          />
        </section>

        {/* Horários de Atendimento da Unidade - Padrão Shadcn UI */}
        <section className="p-6 sm:p-8 rounded-3xl bg-card border border-border shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <div className="flex items-center gap-2 text-primary text-xs sm:text-sm font-semibold tracking-wide uppercase">
                <Clock className="w-4 h-4" />
                <span>Horários de Atendimento</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-foreground mt-1">
                Funcionamento da Unidade
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1 max-w-2xl">
                Confira os turnos de atendimento semanais de {tenant.name} e agende com tranquilidade.
              </p>
            </div>

            {/* Status de Hoje */}
            <div className="shrink-0">
              {todayHours.isOpen ? (
                <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-semibold">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
                  </span>
                  <span>Aberto Hoje ({todayConfig.label}): {todayHours.open} às {todayHours.close}</span>
                </div>
              ) : (
                <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-semibold">
                  <span className="h-2.5 w-2.5 rounded-full bg-destructive" />
                  <span>Fechado Hoje ({todayConfig.label})</span>
                </div>
              )}
            </div>
          </div>

          {/* Grade com os 7 Dias da Semana */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
            {DAYS_CONFIG.map((day) => {
              const dayData = operatingHours[day.key]
              const isToday = day.dayIndex === todayDayIndex

              return (
                <div
                  key={day.key}
                  className={`p-4 rounded-2xl border transition-all flex flex-col justify-between ${
                    isToday
                      ? 'bg-primary/5 border-primary shadow-sm ring-1 ring-primary/30'
                      : 'bg-muted/30 border-border hover:bg-muted/60'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-foreground">
                        {day.shortLabel}
                      </span>
                      {isToday && (
                        <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-primary text-primary-foreground">
                          Hoje
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground block line-clamp-1 mb-2">
                      {day.label}
                    </span>
                  </div>

                  <div className="pt-2 border-t border-border/60">
                    {dayData.isOpen ? (
                      <>
                        <span className="text-xs font-bold font-mono text-foreground block">
                          {dayData.open} - {dayData.close}
                        </span>
                        {dayData.hasBreak && dayData.breakStart && (
                          <span className="text-[10px] text-muted-foreground block mt-1">
                            Pausa: {dayData.breakStart}-{dayData.breakEnd}
                          </span>
                        )}
                        <span className="inline-flex items-center gap-1 mt-2 text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold bg-emerald-500/10 px-2 py-0.5 rounded-full">
                          <CheckCircle2 className="w-3 h-3" /> Aberto
                        </span>
                      </>
                    ) : (
                      <>
                        <span className="text-xs font-medium text-muted-foreground block">
                          Fechado
                        </span>
                        <span className="inline-flex items-center gap-1 mt-2 text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                          Sem expediente
                        </span>
                      </>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </section>

        {/* Call to Action Final */}
        <section className="p-8 sm:p-12 rounded-3xl bg-card border border-border text-center flex flex-col items-center justify-center gap-6 shadow-sm">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
            <Calendar className="w-8 h-8" />
          </div>
          <div className="max-w-xl">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground">
              Pronto para renovar seu visual na {tenant.name}?
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Escolha o profissional da sua preferência, confira os horários em tempo real e garanta sua reserva em instantes.
            </p>
          </div>
          <Link
            href={bookingUrl}
            className="inline-flex items-center gap-2 px-8 py-4 rounded-xl font-bold text-base bg-primary hover:bg-primary/90 text-primary-foreground transition-all shadow-sm"
          >
            <span>Iniciar Agendamento Online</span>
            <ArrowRight className="w-5 h-5" />
          </Link>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-8 bg-muted/20 text-center text-xs text-muted-foreground">
        <p>© {new Date().getFullYear()} {tenant.name}. Plataforma BarberShop Multi-Tenant.</p>
      </footer>
    </div>
  )
}
