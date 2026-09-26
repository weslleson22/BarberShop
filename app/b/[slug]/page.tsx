import { notFound } from 'next/navigation'
import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { resolvePublicTenant } from '@/lib/tenant'
import { 
  Scissors, 
  Clock, 
  MapPin, 
  Phone, 
  Calendar, 
  Star, 
  CheckCircle2, 
  ArrowRight,
  ShieldCheck,
  Sparkles
} from 'lucide-react'

interface Props {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params
  const result = await resolvePublicTenant(slug)
  if (!result.success) {
    return {
      title: 'Barbearia não encontrada | BarberShop',
    }
  }
  return {
    title: `${result.tenant.name} | Agendamento Online`,
    description: result.tenant.description || `Agende seu horário na ${result.tenant.name}. Serviços profissionais e atendimento de excelência.`,
  }
}

export default async function TenantPublicPage({ params }: Props) {
  const { slug } = await params

  // 1. Resolução estrita do Tenant via Slug (NUNCA fallback para primeira ativa)
  const tenantResult = await resolvePublicTenant(slug)
  if (!tenantResult.success) {
    notFound()
  }

  const tenant = tenantResult.tenant

  // 2. Buscar serviços estritamente deste tenant
  const services = await prisma.service.findMany({
    where: {
      barbershopId: tenant.id,
      isActive: true,
    },
    orderBy: {
      name: 'asc',
    },
  })

  // 3. Buscar barbeiros estritamente deste tenant
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

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-slate-900 to-black text-white">
      {/* Top Banner / Hero */}
      <header className="relative border-b border-amber-500/20 bg-gray-900/60 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-4 py-8 sm:py-12 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4 text-center md:text-left">
            {tenant.logo ? (
              <img
                src={tenant.logo}
                alt={tenant.name}
                className="w-20 h-20 rounded-2xl object-cover border-2 border-amber-500/40 shadow-xl"
              />
            ) : (
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-amber-500 to-yellow-600 flex items-center justify-center text-black font-extrabold text-2xl shadow-xl shadow-amber-500/20">
                <Scissors className="w-10 h-10" />
              </div>
            )}
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold uppercase tracking-wider mb-2">
                <ShieldCheck className="w-3.5 h-3.5" />
                Unidade Oficial Verificada
              </div>
              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
                {tenant.name}
              </h1>
              {tenant.description && (
                <p className="mt-1 text-sm text-gray-300 max-w-xl">
                  {tenant.description}
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
            <Link
              href={`/agendar?slug=${encodeURIComponent(tenant.slug || slug)}`}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-xl font-bold text-sm bg-gradient-to-r from-amber-400 via-yellow-500 to-amber-600 hover:from-amber-500 hover:to-amber-700 text-black shadow-lg shadow-amber-500/25 transition-all transform hover:-translate-y-0.5"
            >
              <Calendar className="w-4 h-4" />
              <span>Agendar Agora</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

        {/* Contact info bar */}
        {(tenant.address || tenant.phone) && (
          <div className="border-t border-gray-800/80 bg-black/40">
            <div className="max-w-6xl mx-auto px-4 py-3 flex flex-wrap items-center gap-6 text-xs text-gray-400">
              {tenant.address && (
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>{tenant.address}</span>
                </div>
              )}
              {tenant.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>{tenant.phone}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </header>

      {/* Main Content Area */}
      <main className="max-w-6xl mx-auto px-4 py-12 space-y-16">
        {/* Services Section */}
        <section>
          <div className="flex items-center justify-between mb-8">
            <div>
              <div className="flex items-center gap-2 text-amber-400 text-sm font-semibold tracking-wide uppercase">
                <Sparkles className="w-4 h-4" />
                Catálogo de Serviços
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-white mt-1">
                Serviços Disponíveis
              </h2>
            </div>
            <span className="text-xs text-gray-400 bg-gray-800/80 px-3 py-1.5 rounded-lg border border-gray-700">
              {services.length} serviços cadastrados
            </span>
          </div>

          {services.length === 0 ? (
            <div className="p-8 rounded-2xl bg-gray-900/60 border border-gray-800 text-center text-gray-400">
              Nenhum serviço disponível no momento para esta unidade.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {services.map((service) => (
                <div
                  key={service.id}
                  className="group relative flex flex-col justify-between p-6 rounded-2xl bg-gray-900/70 border border-gray-800/80 hover:border-amber-500/40 backdrop-blur-md transition-all duration-300 hover:shadow-xl hover:shadow-amber-500/5 hover:-translate-y-1"
                >
                  <div>
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <h3 className="font-bold text-lg text-white group-hover:text-amber-400 transition-colors">
                        {service.name}
                      </h3>
                      <span className="text-lg font-black text-amber-400 whitespace-nowrap">
                        {formatCurrency(Number(service.price))}
                      </span>
                    </div>
                    {service.description && (
                      <p className="text-xs text-gray-400 mb-4 line-clamp-2">
                        {service.description}
                      </p>
                    )}
                  </div>

                  <div className="pt-4 border-t border-gray-800/80 flex items-center justify-between text-xs">
                    <span className="inline-flex items-center gap-1.5 text-gray-300">
                      <Clock className="w-3.5 h-3.5 text-amber-400" />
                      {service.duration} minutos
                    </span>
                    <Link
                      href={`/agendar?slug=${encodeURIComponent(tenant.slug || slug)}`}
                      className="inline-flex items-center gap-1 font-semibold text-amber-400 hover:text-amber-300"
                    >
                      Escolher <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Barbers / Professionals Section */}
        <section>
          <div className="flex items-center justify-between mb-8">
            <div>
              <div className="flex items-center gap-2 text-amber-400 text-sm font-semibold tracking-wide uppercase">
                <Star className="w-4 h-4" />
                Nossos Especialistas
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-white mt-1">
                Equipe de Barbeiros
              </h2>
            </div>
            <span className="text-xs text-gray-400 bg-gray-800/80 px-3 py-1.5 rounded-lg border border-gray-700">
              {barbers.length} profissionais
            </span>
          </div>

          {barbers.length === 0 ? (
            <div className="p-8 rounded-2xl bg-gray-900/60 border border-gray-800 text-center text-gray-400">
              Nenhum barbeiro listado no momento para esta unidade.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {barbers.map((barber) => (
                <div
                  key={barber.id}
                  className="p-6 rounded-2xl bg-gray-900/70 border border-gray-800/80 text-center backdrop-blur-md flex flex-col items-center hover:border-amber-500/30 transition-all"
                >
                  {barber.avatar ? (
                    <img
                      src={barber.avatar}
                      alt={barber.name}
                      className="w-20 h-20 rounded-full object-cover border-2 border-amber-500/30 mb-4 shadow-lg"
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-amber-500/20 to-yellow-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 font-bold text-xl mb-4 shadow-lg">
                      {barber.name.slice(0, 2).toUpperCase()}
                    </div>
                  )}

                  <h3 className="font-bold text-base text-white">{barber.name}</h3>
                  <span className="text-xs text-amber-400/90 font-medium mb-2">Barbeiro Especialista</span>

                  {barber.bio && (
                    <p className="text-xs text-gray-400 line-clamp-2 mb-3">
                      {barber.bio}
                    </p>
                  )}

                  {Array.isArray(barber.specialties) && barber.specialties.length > 0 && (
                    <div className="flex flex-wrap justify-center gap-1 mt-auto pt-2">
                      {barber.specialties.slice(0, 3).map((spec, i) => (
                        <span
                          key={i}
                          className="px-2 py-0.5 rounded-full text-[10px] bg-gray-800 text-gray-300 border border-gray-700"
                        >
                          {spec}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* CTA Section */}
        <section className="p-8 sm:p-12 rounded-3xl bg-gradient-to-r from-amber-900/40 via-yellow-900/20 to-gray-900/80 border border-amber-500/30 text-center flex flex-col items-center justify-center gap-6 shadow-2xl">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-xl">
            <Calendar className="w-8 h-8" />
          </div>
          <div className="max-w-xl">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
              Pronto para renovar seu visual na {tenant.name}?
            </h2>
            <p className="mt-2 text-sm text-gray-300">
              Escolha o profissional da sua preferência, confira os horários em tempo real e garanta sua reserva.
            </p>
          </div>
          <Link
            href={`/agendar?slug=${encodeURIComponent(tenant.slug || slug)}`}
            className="inline-flex items-center gap-2 px-8 py-4 rounded-xl font-bold text-base bg-gradient-to-r from-amber-400 via-yellow-500 to-amber-600 hover:from-amber-500 hover:to-amber-700 text-black shadow-xl shadow-amber-500/30 transition-all transform hover:-translate-y-0.5"
          >
            <span>Iniciar Agendamento Online</span>
            <ArrowRight className="w-5 h-5" />
          </Link>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-900 py-8 bg-black/60 text-center text-xs text-gray-500">
        <p>© {new Date().getFullYear()} {tenant.name}. Plataforma BarberShop Multi-Tenant.</p>
      </footer>
    </div>
  )
}
