import { describe, it, expect } from 'vitest'
import { getSidebarSections, getOrganizationContext } from '@/lib/navigation/sidebar-config'

describe('AppSidebar — Regras Estruturais e RBAC da Navegação Lateral shadcn/ui', () => {
  describe('1. Contexto do Header (getOrganizationContext)', () => {
    it('retorna contexto SaaS Cloud para DEVELOPER', () => {
      const ctx = getOrganizationContext('DEVELOPER')
      expect(ctx.name).toBe('BarberShop Cloud')
      expect(ctx.subtitle).toContain('SaaS')
      expect(ctx.plan).toBe('Developer')
    })

    it('retorna contexto operacional de barbearia para ADMIN', () => {
      const ctx = getOrganizationContext('ADMIN')
      expect(ctx.name).toBe('BarberShop')
      expect(ctx.subtitle).toBe('Administrador')
      expect(ctx.plan).toBe('Plano Profissional')
    })

    it('retorna contexto de profissional para BARBER', () => {
      const ctx = getOrganizationContext('BARBER')
      expect(ctx.name).toBe('BarberShop')
      expect(ctx.subtitle).toBe('Barbeiro')
    })

    it('retorna contexto de atendimento para RECEPTIONIST', () => {
      const ctx = getOrganizationContext('RECEPTIONIST')
      expect(ctx.name).toBe('BarberShop')
      expect(ctx.subtitle).toBe('Recepcionista')
    })

    it('retorna contexto de cliente para CLIENT', () => {
      const ctx = getOrganizationContext('CLIENT')
      expect(ctx.name).toBe('BarberShop')
      expect(ctx.subtitle).toBe('Cliente')
    })
  })

  describe('2. Menu do DEVELOPER (getSidebarSections)', () => {
    const sections = getSidebarSections('DEVELOPER')
    const allTitles = sections.flatMap((s) => s.items.map((i) => i.title))

    it('possui as seções Platform, SaaS & Faturamento e Monitoramento', () => {
      const labels = sections.map((s) => s.label)
      expect(labels).toContain('Platform')
      expect(labels).toContain('SaaS & Faturamento')
      expect(labels).toContain('Monitoramento & Sistema')
    })

    it('contém rotas operacionais do desenvolvedor', () => {
      expect(allTitles).toContain('Dashboard SaaS')
      expect(allTitles).toContain('Barbearias')
      expect(allTitles).toContain('Usuários da Plataforma')
      expect(allTitles).toContain('Configurações Globais')
    })

    it('possui submenu expansível de Barbearias com status', () => {
      const barbershopItem = sections
        .flatMap((s) => s.items)
        .find((i) => i.title === 'Barbearias')

      expect(barbershopItem).toBeDefined()
      expect(barbershopItem?.items).toBeDefined()
      const subTitles = barbershopItem?.items?.map((sub) => sub.title)
      expect(subTitles).toContain('Todas as Unidades')
      expect(subTitles).toContain('Unidades Ativas')
      expect(subTitles).toContain('Suspensas')
    })

    it('marca funcionalidades futuras com badge "Em breve" e disabled', () => {
      const saasSection = sections.find((s) => s.label === 'SaaS & Faturamento')
      expect(saasSection).toBeDefined()
      const assItem = saasSection?.items.find((i) => i.title === 'Assinaturas')
      expect(assItem?.items?.[0].badge).toBe('Em breve')
      expect(assItem?.items?.[0].disabled).toBe(true)
    })
  })

  describe('3. Menu do ADMIN da Barbearia', () => {
    const sections = getSidebarSections('ADMIN')
    const allTitles = sections.flatMap((s) => s.items.map((i) => i.title))

    it('contém todas as rotas de gestão da barbearia', () => {
      expect(allTitles).toContain('Dashboard')
      expect(allTitles).toContain('Agenda de Atendimentos')
      expect(allTitles).toContain('Clientes')
      expect(allTitles).toContain('Serviços & Preços')
      expect(allTitles).toContain('Equipe de Barbeiros')
      expect(allTitles).toContain('Configurações da Conta')
      expect(allTitles).toContain('Perfil do Estabelecimento')
    })

    it('não exibe o painel global do DEVELOPER para ADMIN', () => {
      expect(allTitles).not.toContain('Dashboard SaaS')
    })

    it('marca financeiro e planos planejados com badge "Em breve"', () => {
      const financeSection = sections.find((s) => s.label.includes('Financeiro'))
      expect(financeSection).toBeDefined()
      const pagItem = financeSection?.items.find((i) => i.title.includes('Pagamentos'))
      expect(pagItem?.badge).toBe('Em breve')
      expect(pagItem?.disabled).toBe(true)
    })
  })

  describe('4. Menu do BARBER', () => {
    const sections = getSidebarSections('BARBER')
    const allTitles = sections.flatMap((s) => s.items.map((i) => i.title))

    it('contém Dashboard, Minha Agenda, Clientes e Serviços', () => {
      expect(allTitles).toContain('Dashboard')
      expect(allTitles).toContain('Minha Agenda')
      expect(allTitles).toContain('Clientes')
      expect(allTitles).toContain('Serviços Oferecidos')
      expect(allTitles).toContain('Meu Perfil')
    })

    it('NÃO exibe gestão de equipe nem painel de desenvolvedor', () => {
      expect(allTitles).not.toContain('Equipe de Barbeiros')
      expect(allTitles).not.toContain('Dashboard SaaS')
      expect(allTitles).not.toContain('Barbearias')
    })
  })

  describe('5. Menu da RECEPTIONIST', () => {
    const sections = getSidebarSections('RECEPTIONIST')
    const allTitles = sections.flatMap((s) => s.items.map((i) => i.title))

    it('contém Dashboard, Agenda Geral, Clientes e Catálogo de Serviços', () => {
      expect(allTitles).toContain('Dashboard')
      expect(allTitles).toContain('Agenda Geral')
      expect(allTitles).toContain('Clientes')
      expect(allTitles).toContain('Catálogo de Serviços')
      expect(allTitles).toContain('Meu Perfil')
    })

    it('NÃO exibe equipe de barbeiros nem gestão de planos SaaS', () => {
      expect(allTitles).not.toContain('Equipe de Barbeiros')
      expect(allTitles).not.toContain('Meu Plano')
    })
  })

  describe('6. Menu do CLIENT', () => {
    const sections = getSidebarSections('CLIENT')
    const allTitles = sections.flatMap((s) => s.items.map((i) => i.title))

    it('contém Início, Agendar Horário e Meus Agendamentos', () => {
      expect(allTitles).toContain('Início')
      expect(allTitles).toContain('Agendar Horário')
      expect(allTitles).toContain('Meus Agendamentos')
      expect(allTitles).toContain('Meu Perfil')
    })

    it('NÃO exibe ferramentas administrativas ou de atendimento', () => {
      expect(allTitles).not.toContain('Equipe de Barbeiros')
      expect(allTitles).not.toContain('Serviços & Preços')
      expect(allTitles).not.toContain('Dashboard SaaS')
    })
  })

  describe('7. Validação de Rotas Reais', () => {
    it('todas as rotas funcionais ativas apontam para páginas existentes', () => {
      const validAppRoutes = [
        '/dashboard',
        '/agenda',
        '/clientes',
        '/servicos',
        '/usuarios',
        '/configuracoes',
        '/perfil',
        '/developer',
        '/meus-agendamentos',
        '/agendar',
      ]

      const roles = ['DEVELOPER', 'ADMIN', 'BARBER', 'RECEPTIONIST', 'CLIENT'] as const

      for (const role of roles) {
        const sections = getSidebarSections(role)
        for (const section of sections) {
          for (const item of section.items) {
            if (item.url && item.url !== '#') {
              const baseRoute = item.url.split('?')[0]
              expect(validAppRoutes).toContain(baseRoute)
            }
            if (item.items) {
              for (const sub of item.items) {
                if (sub.url && sub.url !== '#') {
                  const baseRoute = sub.url.split('?')[0]
                  expect(validAppRoutes).toContain(baseRoute)
                }
              }
            }
          }
        }
      }
    })
  })
})
