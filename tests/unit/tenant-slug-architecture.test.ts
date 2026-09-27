import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  slugify,
  isValidSlug,
  generateUniqueSlug,
  suggestAvailableSlug,
  updateBarbershopSlug,
  resolvePublicTenant,
  RESERVED_SLUGS,
} from '@/lib/tenant'
import { generateMetadata, default as TenantPublicPage } from '@/app/b/[slug]/page'
import AgendamentoRedirectPage from '@/app/b/[slug]/agendamento/page'

const mockNotFound = vi.fn().mockImplementation(() => {
  throw new Error('NEXT_NOT_FOUND')
})
const mockRedirect = vi.fn().mockImplementation((url: string) => {
  throw new Error(`NEXT_REDIRECT:${url}`)
})

vi.mock('next/navigation', () => ({
  notFound: () => mockNotFound(),
  redirect: (url: string) => mockRedirect(url),
}))

vi.mock('@/lib/prisma', () => {
  return {
    prisma: {
      barbershop: {
        findFirst: vi.fn(),
        findUnique: vi.fn(),
        findMany: vi.fn(),
        update: vi.fn(),
      },
      barbershopSlugRedirect: {
        findUnique: vi.fn(),
        deleteMany: vi.fn(),
        upsert: vi.fn(),
      },
      service: {
        findMany: vi.fn(),
      },
      user: {
        findMany: vi.fn(),
      },
      $transaction: vi.fn(async (cb) => {
        const { prisma } = await import('@/lib/prisma')
        return cb(prisma)
      }),
    },
  }
})

import { prisma } from '@/lib/prisma'

describe('Arquitetura Multi-Tenant de Slugs e Roteamento Público (/b/[slug])', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('1. Normalização e Validação Estrutural de Slugs (slugify & isValidSlug)', () => {
    it('normaliza nomes com acentos, maiúsculas e caracteres especiais', () => {
      expect(slugify('Barbearia São Luís')).toBe('barbearia-sao-luis')
      expect(slugify('Barbearia do Zé & Filhos!')).toBe('barbearia-do-ze-filhos')
      expect(slugify('   Barbearia    Central   ')).toBe('barbearia-central')
      expect(slugify('Corte & Barba 100%')).toBe('corte-barba-100')
      expect(slugify('---multi--hifen---')).toBe('multi-hifen')
    })

    it('valida formatos válidos de slug', () => {
      expect(isValidSlug('barbearia-central')).toBe(true)
      expect(isValidSlug('barbearia-sao-luis')).toBe(true)
      expect(isValidSlug('navalha-de-ouro')).toBe(true)
      expect(isValidSlug('b1')).toBe(true)
    })

    it('rejeita slugs inválidos, malformados ou muito curtos/longos', () => {
      expect(isValidSlug('')).toBe(false)
      expect(isValidSlug('a')).toBe(false) // mínimo 2 chars
      expect(isValidSlug('a'.repeat(51))).toBe(false) // máximo 50 chars
      expect(isValidSlug('barbearia_central')).toBe(false) // underscore inválido
      expect(isValidSlug('barbearia central')).toBe(false) // espaço inválido
      expect(isValidSlug('barbearia--central')).toBe(false) // duplo hífen consecutivo
      expect(isValidSlug('-barbearia')).toBe(false) // hífen no início
      expect(isValidSlug('barbearia-')).toBe(false) // hífen no fim
    })

    it('rejeita termos reservados do sistema para evitar colisões com rotas internas', () => {
      expect(RESERVED_SLUGS).toContain('admin')
      expect(RESERVED_SLUGS).toContain('api')
      expect(RESERVED_SLUGS).toContain('dashboard')
      expect(RESERVED_SLUGS).toContain('developer')
      expect(RESERVED_SLUGS).toContain('login')
      expect(RESERVED_SLUGS).toContain('register')
      expect(RESERVED_SLUGS).toContain('agendar')

      expect(isValidSlug('admin')).toBe(false)
      expect(isValidSlug('api')).toBe(false)
      expect(isValidSlug('dashboard')).toBe(false)
      expect(isValidSlug('developer')).toBe(false)
    })
  })

  describe('2. Tratamento Consistente de Colisões (generateUniqueSlug & suggestAvailableSlug)', () => {
    it('gera o slug base se estiver livre', async () => {
      vi.mocked(prisma.barbershop.findFirst).mockResolvedValueOnce(null)
      vi.mocked((prisma as any).barbershopSlugRedirect.findUnique).mockResolvedValueOnce(null)

      const slug = await generateUniqueSlug('Barbearia Central')
      expect(slug).toBe('barbearia-central')
    })

    it('adiciona sufixo numérico (-2) se o slug base já existir', async () => {
      vi.mocked(prisma.barbershop.findFirst)
        .mockResolvedValueOnce({ id: 'shop_existing_1' } as any) // 'barbearia-central' já em uso
        .mockResolvedValueOnce(null) // 'barbearia-central-2' livre

      vi.mocked((prisma as any).barbershopSlugRedirect.findUnique).mockResolvedValueOnce(null)

      const slug = await generateUniqueSlug('Barbearia Central')
      expect(slug).toBe('barbearia-central-2')
    })

    it('adiciona sufixo numérico incremental (-3) se -2 também estiver ocupado', async () => {
      vi.mocked(prisma.barbershop.findFirst)
        .mockResolvedValueOnce({ id: 'shop_existing_1' } as any) // 'barbearia-central' ocupado
        .mockResolvedValueOnce({ id: 'shop_existing_2' } as any) // 'barbearia-central-2' ocupado
        .mockResolvedValueOnce(null) // 'barbearia-central-3' livre

      vi.mocked((prisma as any).barbershopSlugRedirect.findUnique).mockResolvedValueOnce(null)

      const slug = await generateUniqueSlug('Barbearia Central')
      expect(slug).toBe('barbearia-central-3')
    })

    it('sugere o próximo slug disponível em caso de conflito manual', async () => {
      vi.mocked(prisma.barbershop.findFirst)
        .mockResolvedValueOnce({ id: 'shop_other' } as any) // 'barbearia-central-2' ocupado
        .mockResolvedValueOnce(null) // 'barbearia-central-3' livre

      vi.mocked((prisma as any).barbershopSlugRedirect.findUnique).mockResolvedValueOnce(null)

      const suggestion = await suggestAvailableSlug('barbearia-central')
      expect(suggestion).toBe('barbearia-central-3')
    })
  })

  describe('3. Alteração de Slug e Redirect Controlado (updateBarbershopSlug)', () => {
    it('rejeita alteração para termo reservado com mensagem clara', async () => {
      await expect(
        updateBarbershopSlug('shop_1', 'admin')
      ).rejects.toThrow('termo reservado')
    })

    it('rejeita alteração se o slug já pertencer a outra barbearia ativa', async () => {
      vi.mocked(prisma.barbershop.findFirst)
        .mockResolvedValueOnce({ id: 'shop_2', name: 'Outra Barbearia' } as any) // Colisão
        .mockResolvedValueOnce(null) // suggestAvailableSlug
      vi.mocked((prisma as any).barbershopSlugRedirect.findUnique).mockResolvedValueOnce(null)

      await expect(
        updateBarbershopSlug('shop_1', 'barbearia-central')
      ).rejects.toThrow('já está em uso por outro estabelecimento')
    })

    it('salva o slug antigo em BarbershopSlugRedirect ao alterar com sucesso', async () => {
      vi.mocked(prisma.barbershop.findFirst).mockResolvedValueOnce(null) // newSlug disponível
      vi.mocked((prisma as any).barbershopSlugRedirect.findUnique).mockResolvedValueOnce(null) // sem redirect conflitante
      vi.mocked(prisma.barbershop.findUnique).mockResolvedValueOnce({
        id: 'shop_1',
        slug: 'barbearia-antiga',
      } as any)

      const result = await updateBarbershopSlug('shop_1', 'barbearia-nova')

      expect(result.success).toBe(true)
      expect(result.slug).toBe('barbearia-nova')
      expect(result.oldSlug).toBe('barbearia-antiga')

      // Garante que o redirect controlado foi criado/upserted no banco
      expect((prisma as any).barbershopSlugRedirect.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { oldSlug: 'barbearia-antiga' },
          create: expect.objectContaining({
            barbershopId: 'shop_1',
            oldSlug: 'barbearia-antiga',
          }),
        })
      )

      // Garante que o slug oficial foi atualizado na tabela barbershops
      expect(prisma.barbershop.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'shop_1' },
          data: { slug: 'barbearia-nova' },
        })
      )
    })
  })

  describe('4. Resolução de Tenant Público e Proteção Anti-Vazamento (resolvePublicTenant)', () => {
    it('resolve tenant ativo por slug válido', async () => {
      vi.mocked(prisma.barbershop.findFirst).mockResolvedValueOnce({
        id: 'shop_alfa',
        name: 'Barbearia Alfa',
        slug: 'barbearia-alfa',
        isActive: true,
        status: 'APPROVED',
      } as any)

      const res = await resolvePublicTenant('barbearia-alfa')
      expect(res.success).toBe(true)
      if (res.success) {
        expect(res.redirect).toBe(false)
        expect(res.tenant.id).toBe('shop_alfa')
        expect(res.tenant.name).toBe('Barbearia Alfa')
      }
    })

    it('retorna 404 quando o slug não existir', async () => {
      vi.mocked(prisma.barbershop.findFirst).mockResolvedValueOnce(null)
      vi.mocked((prisma as any).barbershopSlugRedirect.findUnique).mockResolvedValueOnce(null)

      const res = await resolvePublicTenant('slug-inexistente')
      expect(res.success).toBe(false)
      if (!res.success) {
        expect(res.status).toBe(404)
        expect(res.error).toBe('Barbearia não encontrada.')
      }
    })

    it('retorna 404 quando a barbearia estiver inativa ou suspensa (sem vazar dados)', async () => {
      vi.mocked(prisma.barbershop.findFirst).mockResolvedValueOnce({
        id: 'shop_inativa',
        name: 'Barbearia Inativa',
        slug: 'barbearia-inativa',
        isActive: false,
        status: 'SUSPENDED',
      } as any)

      const res = await resolvePublicTenant('barbearia-inativa')
      expect(res.success).toBe(false)
      if (!res.success) {
        expect(res.status).toBe(404)
        expect(res.error).toContain('temporariamente inativa ou suspensa')
      }
    })

    it('detecta slug antigo alterado e retorna redirect controlado para o novo slug', async () => {
      // 1. findFirst do slug direto não acha
      vi.mocked(prisma.barbershop.findFirst).mockResolvedValueOnce(null)

      // 2. Busca na tabela de redirect acha o registro apontando para o novo slug
      vi.mocked((prisma as any).barbershopSlugRedirect.findUnique).mockResolvedValueOnce({
        id: 'redir_1',
        oldSlug: 'barbearia-antiga',
        barbershop: {
          id: 'shop_alfa',
          name: 'Barbearia Alfa',
          slug: 'barbearia-nova-oficial',
          isActive: true,
          status: 'APPROVED',
        },
      } as any)

      const res = await resolvePublicTenant('barbearia-antiga')
      expect(res.success).toBe(true)
      if (res.success) {
        expect(res.redirect).toBe(true)
        expect((res as any).targetSlug).toBe('barbearia-nova-oficial')
        expect(res.tenant.id).toBe('shop_alfa')
      }
    })
  })

  describe('5. Roteamento Dinâmico Next.js (/b/[slug] e /b/[slug]/agendamento)', () => {
    it('executa redirect permanente (HTTP 308) quando acessa slug antigo que foi alterado', async () => {
      vi.mocked(prisma.barbershop.findFirst).mockResolvedValueOnce(null)
      vi.mocked((prisma as any).barbershopSlugRedirect.findUnique).mockResolvedValueOnce({
        id: 'redir_1',
        oldSlug: 'barbearia-antiga',
        barbershop: {
          id: 'shop_1',
          name: 'Barbearia Renomeada',
          slug: 'barbearia-nova',
          isActive: true,
          status: 'APPROVED',
        },
      } as any)

      await expect(
        TenantPublicPage({ params: Promise.resolve({ slug: 'barbearia-antiga' }) })
      ).rejects.toThrow('NEXT_REDIRECT:/b/barbearia-nova')

      expect(mockRedirect).toHaveBeenCalledWith('/b/barbearia-nova')
    })

    it('dispara notFound (HTTP 404) para slug inexistente', async () => {
      vi.mocked(prisma.barbershop.findFirst).mockResolvedValueOnce(null)
      vi.mocked((prisma as any).barbershopSlugRedirect.findUnique).mockResolvedValueOnce(null)

      await expect(
        TenantPublicPage({ params: Promise.resolve({ slug: 'nao-existe' }) })
      ).rejects.toThrow('NEXT_NOT_FOUND')

      expect(mockNotFound).toHaveBeenCalled()
    })

    it('/b/[slug]/agendamento: redireciona para a rota oficial com slug alterado', async () => {
      vi.mocked(prisma.barbershop.findFirst).mockResolvedValueOnce(null)
      vi.mocked((prisma as any).barbershopSlugRedirect.findUnique).mockResolvedValueOnce({
        id: 'redir_1',
        oldSlug: 'barbearia-antiga',
        barbershop: {
          id: 'shop_1',
          name: 'Barbearia Renomeada',
          slug: 'barbearia-nova',
          isActive: true,
          status: 'APPROVED',
        },
      } as any)

      await expect(
        AgendamentoRedirectPage({ params: Promise.resolve({ slug: 'barbearia-antiga' }) })
      ).rejects.toThrow('NEXT_REDIRECT:/b/barbearia-nova/agendamento')

      expect(mockRedirect).toHaveBeenCalledWith('/b/barbearia-nova/agendamento')
    })

    it('/b/[slug]/agendamento: vincula slug explicitamente no fluxo de agendamento', async () => {
      vi.mocked(prisma.barbershop.findFirst).mockResolvedValueOnce({
        id: 'shop_1',
        name: 'Barbearia Alfa',
        slug: 'barbearia-alfa',
        isActive: true,
        status: 'APPROVED',
      } as any)

      await expect(
        AgendamentoRedirectPage({ params: Promise.resolve({ slug: 'barbearia-alfa' }) })
      ).rejects.toThrow('NEXT_REDIRECT:/agendar?slug=barbearia-alfa')

      expect(mockRedirect).toHaveBeenCalledWith('/agendar?slug=barbearia-alfa')
    })
  })

  describe('6. Isolamento Estrito Multi-Tenant (Tenant A vs Tenant B)', () => {
    it('garante que a página do Tenant A busca estritamente serviços e barbeiros com barbershopId do Tenant A', async () => {
      vi.mocked(prisma.barbershop.findFirst).mockResolvedValueOnce({
        id: 'tenant_A',
        name: 'Barbearia Alpha',
        slug: 'barbearia-alpha',
        isActive: true,
        status: 'APPROVED',
      } as any)

      vi.mocked(prisma.service.findMany).mockResolvedValueOnce([
        { id: 'srv_1', name: 'Corte Alpha', price: 50, duration: 30, barbershopId: 'tenant_A', isActive: true },
      ] as any)

      vi.mocked(prisma.user.findMany).mockResolvedValueOnce([
        { id: 'barber_1', name: 'Barbeiro Alpha', role: 'BARBER', barbershopId: 'tenant_A', isActive: true },
      ] as any)

      await TenantPublicPage({ params: Promise.resolve({ slug: 'barbearia-alpha' }) })

      // Validação estrita: queries NUNCA executam findFirst({ isActive: true })
      expect(prisma.service.findMany).toHaveBeenCalledWith({
        where: {
          barbershopId: 'tenant_A',
          isActive: true,
        },
        orderBy: {
          name: 'asc',
        },
      })

      expect(prisma.user.findMany).toHaveBeenCalledWith({
        where: {
          barbershopId: 'tenant_A',
          role: 'BARBER',
          isActive: true,
        },
        select: expect.any(Object),
        orderBy: {
          name: 'asc',
        },
      })
    })
  })

  describe('7. SEO, OpenGraph e Metadados Públicos Seguros', () => {
    it('gera metadados com title, description, canonical e OpenGraph formatados sem dados sensíveis', async () => {
      vi.mocked(prisma.barbershop.findFirst).mockResolvedValueOnce({
        id: 'shop_xyz_internal_id',
        name: 'Barbearia Vintage VIP',
        slug: 'barbearia-vintage-vip',
        description: 'Os melhores cortes e barba artesanal da cidade.',
        logo: 'https://cdn.barbershop.com.br/logos/vintage.png',
        isActive: true,
        status: 'APPROVED',
      } as any)

      const meta = await generateMetadata({ params: Promise.resolve({ slug: 'barbearia-vintage-vip' }) })

      expect(meta.title).toBe('Barbearia Vintage VIP | Agendamento Online & Serviços')
      expect(meta.description).toContain('Barbearia Vintage VIP')
      expect(meta.alternates?.canonical).toBe('https://barbershop.com.br/b/barbearia-vintage-vip')

      // OpenGraph
      expect(meta.openGraph).toBeDefined()
      expect(meta.openGraph?.title).toBe('Barbearia Vintage VIP | Agendamento Online & Serviços')
      expect(meta.openGraph?.images).toEqual([
        expect.objectContaining({
          url: 'https://cdn.barbershop.com.br/logos/vintage.png',
          alt: 'Logo da Barbearia Vintage VIP',
        }),
      ])

      // Não expor dados confidenciais
      const serialized = JSON.stringify(meta)
      expect(serialized).not.toContain('shop_xyz_internal_id')
    })

    it('retorna robots index: false para barbearia não encontrada', async () => {
      vi.mocked(prisma.barbershop.findFirst).mockResolvedValueOnce(null)
      vi.mocked((prisma as any).barbershopSlugRedirect.findUnique).mockResolvedValueOnce(null)

      const meta = await generateMetadata({ params: Promise.resolve({ slug: 'nao-existe' }) })

      expect(meta.title).toContain('Barbearia não encontrada')
      expect(meta.robots).toEqual({ index: false, follow: false })
    })
  })
})
