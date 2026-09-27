import { prisma } from './prisma'

export interface TenantInfo {
  id: string
  name: string
  slug: string | null
  isActive: boolean
  status: string
  trialEndsAt?: Date | string | null
  createdAt?: Date | string | null
  phone: string | null
  address: string | null
  logo: string | null
  description: string | null
}

export type TenantResolutionResult =
  | { success: true; redirect: false; tenant: TenantInfo }
  | { success: true; redirect: true; targetSlug: string; tenant: TenantInfo }
  | { success: false; status: 400 | 404 | 500; error: string }

export const RESERVED_SLUGS = [
  'admin',
  'api',
  'app',
  'auth',
  'b',
  'billing',
  'clientes',
  'configuracoes',
  'dashboard',
  'developer',
  'dev',
  'login',
  'logout',
  'meus-agendamentos',
  'perfil',
  'public',
  'register',
  'servicos',
  'status',
  'usuarios',
  'webhook',
  'webhooks',
  'agendar',
  'agenda',
]

/**
 * Converte qualquer texto para um slug URL-friendly limpo (minúsculo, sem acentos, sem símbolos).
 */
export function slugify(text: string): string {
  if (!text || typeof text !== 'string') return ''
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/**
 * Validação estrutural rigorosa do slug.
 */
export function isValidSlug(slug: string): boolean {
  if (!slug || typeof slug !== 'string') return false
  const trimmed = slug.trim()
  if (trimmed.length < 2 || trimmed.length > 50) return false
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(trimmed)) return false
  if (RESERVED_SLUGS.includes(trimmed.toLowerCase())) return false
  return true
}

/**
 * Sugere o próximo slug disponível a partir de uma base com sufixo incremental (-2, -3...).
 */
export async function suggestAvailableSlug(baseSlug: string, currentShopId?: string): Promise<string> {
  const base = slugify(baseSlug) || 'barbearia'
  let counter = 2
  while (counter <= 100) {
    const candidate = `${base}-${counter}`
    const inUseShop = await prisma.barbershop.findFirst({
      where: {
        slug: candidate,
        ...(currentShopId ? { id: { not: currentShopId } } : {}),
      },
      select: { id: true },
    })

    if (!inUseShop) {
      const inUseRedirect = (prisma as any).barbershopSlugRedirect
        ? await (prisma as any).barbershopSlugRedirect.findUnique({
            where: { oldSlug: candidate },
            select: { barbershopId: true },
          })
        : null

      if (!inUseRedirect || (currentShopId && inUseRedirect.barbershopId === currentShopId)) {
        return candidate
      }
    }
    counter++
  }
  return `${base}-${Date.now().toString(36)}`
}

/**
 * Gera um slug único garantido no banco de dados para a barbearia.
 * Se o slug já existir, adiciona sufixo numérico incremental (-2, -3, etc.).
 */
export async function generateUniqueSlug(name: string, shopId?: string): Promise<string> {
  let base = slugify(name) || 'barbearia'
  if (RESERVED_SLUGS.includes(base)) {
    base = `${base}-unidade`
  }

  let candidate = base
  if (candidate.length < 2) {
    candidate = `barbearia-${shopId ? shopId.slice(-6) : Math.random().toString(36).substring(2, 7)}`
  }

  let counter = 1
  while (counter <= 50) {
    const existingShop = await prisma.barbershop.findFirst({
      where: {
        slug: candidate,
        ...(shopId ? { id: { not: shopId } } : {}),
      },
      select: { id: true },
    })

    const existingRedirect = !existingShop && (prisma as any).barbershopSlugRedirect
      ? await (prisma as any).barbershopSlugRedirect.findUnique({
          where: { oldSlug: candidate },
          select: { barbershopId: true },
        })
      : null

    const isAvailable =
      !existingShop &&
      (!existingRedirect || (shopId && existingRedirect.barbershopId === shopId))

    if (isAvailable) {
      return candidate
    }

    counter++
    candidate = `${base}-${counter}`
  }

  return `${base}-${shopId ? shopId.slice(-6) : Date.now().toString(36)}`
}

/**
 * Atualiza o slug de uma barbearia com validação de unicidade e criação de redirect controlado.
 */
export async function updateBarbershopSlug(
  barbershopId: string,
  newSlugRaw: string
): Promise<{ success: boolean; slug: string; oldSlug?: string | null }> {
  const cleanSlug = slugify(newSlugRaw)

  if (!isValidSlug(cleanSlug)) {
    throw new Error(
      RESERVED_SLUGS.includes(cleanSlug)
        ? `O identificador "${cleanSlug}" é um termo reservado da plataforma. Por favor, escolha outro.`
        : 'O slug deve conter entre 2 e 50 caracteres alfanuméricos minúsculos e hífens.'
    )
  }

  // 1. Verificar colisão com outra barbearia ativa
  const existingShop = await prisma.barbershop.findFirst({
    where: {
      slug: cleanSlug,
      id: { not: barbershopId },
    },
    select: { id: true, name: true },
  })

  if (existingShop) {
    const suggestion = await suggestAvailableSlug(cleanSlug, barbershopId)
    throw new Error(
      `O slug "${cleanSlug}" já está em uso por outro estabelecimento. Sugestão disponível: "${suggestion}".`
    )
  }

  // 2. Verificar colisão com redirect de outra barbearia
  const existingRedirect = (prisma as any).barbershopSlugRedirect
    ? await (prisma as any).barbershopSlugRedirect.findUnique({
        where: { oldSlug: cleanSlug },
        select: { barbershopId: true },
      })
    : null

  if (existingRedirect && existingRedirect.barbershopId !== barbershopId) {
    const suggestion = await suggestAvailableSlug(cleanSlug, barbershopId)
    throw new Error(
      `O slug "${cleanSlug}" foi utilizado recentemente por outro estabelecimento. Sugestão disponível: "${suggestion}".`
    )
  }

  // 3. Buscar registro atual
  const currentShop = await prisma.barbershop.findUnique({
    where: { id: barbershopId },
    select: { id: true, slug: true },
  })

  if (!currentShop) {
    throw new Error('Barbearia não encontrada.')
  }

  const oldSlug = currentShop.slug

  if (oldSlug === cleanSlug) {
    return { success: true, slug: cleanSlug, oldSlug }
  }

  // 4. Executar transação: registrar redirect e atualizar slug
  await prisma.$transaction(async (tx) => {
    // Se a barbearia estava usando este novo slug em seu histórico de redirects, remove o redirect cíclico
    if ((tx as any).barbershopSlugRedirect) {
      await (tx as any).barbershopSlugRedirect.deleteMany({
        where: {
          barbershopId,
          oldSlug: cleanSlug,
        },
      })
    }

    // Se existia um slug antigo válido diferente, registrar em BarbershopSlugRedirect
    if (oldSlug && oldSlug.trim() && oldSlug !== cleanSlug && (tx as any).barbershopSlugRedirect) {
      await (tx as any).barbershopSlugRedirect.upsert({
        where: { oldSlug },
        create: {
          barbershopId,
          oldSlug,
        },
        update: {
          barbershopId,
        },
      })
    }

    // Atualizar barbearia com o novo slug oficial
    await tx.barbershop.update({
      where: { id: barbershopId },
      data: { slug: cleanSlug },
    })
  })

  return { success: true, slug: cleanSlug, oldSlug }
}

/**
 * Valida se um tenant está ativo e autorizado para atendimento/agendamento público.
 * 
 * Regra de Negócio:
 * - A barbearia DEVE estar com isActive = true.
 * - Se o status for 'APPROVED' ou 'ACTIVE', o acesso público é irrestrito.
 * - Se o status for 'PENDING', 'AGUARDANDO_APROVACAO', 'TRIAL' ou 'LEAD',
 *   a barbearia possui acesso garantido durante o período de testes (7 dias de trial).
 *   Após a expiração dos 7 dias sem aprovação manual, o acesso é suspenso (404).
 * - Se o status for 'REJECTED', 'SUSPENDED' ou 'CANCELED', o acesso público é bloqueado.
 */
export function isTenantPubliclyAccessible(shop: {
  isActive: boolean
  status?: string | null
  trialEndsAt?: Date | string | null
  createdAt?: Date | string | null
}): boolean {
  if (!shop.isActive) {
    return false
  }

  const status = (shop.status || '').toUpperCase()

  // Se não tiver status informado no banco legado, presume ativo se isActive = true
  if (!status) {
    return true
  }

  // Status liberados em produção
  if (status === 'APPROVED' || status === 'ACTIVE') {
    return true
  }

  // Status explicitamente bloqueados
  if (['REJECTED', 'SUSPENDED', 'CANCELED'].includes(status)) {
    return false
  }

  // Período de testes (Trial de 7 dias) para barbearias em processo de homologação / aguardando aprovação
  if (['PENDING', 'AGUARDANDO_APROVACAO', 'TRIAL', 'LEAD'].includes(status)) {
    const trialEndTime = shop.trialEndsAt
      ? new Date(shop.trialEndsAt).getTime()
      : shop.createdAt
      ? new Date(shop.createdAt).getTime() + 7 * 24 * 60 * 60 * 1000
      : 0

    // Se possui trial e ainda não expirou, permite acesso público normalmente
    if (trialEndTime > 0 && Date.now() < trialEndTime) {
      return true
    }

    // Trial expirado e continua pendente de aprovação manual
    return false
  }

  return false
}

/**
 * Resolução e validação estrita de tenant público por slug ou id.
 * 
 * Regras Arquiteturais:
 * - O identificador (slug ou ID) DEVE ser explicitamente fornecido.
 * - NUNCA faz fallback para "primeira barbearia ativa" (findFirst({ isActive: true })).
 * - Suporta Redirect Controlado (HTTP 308) se o slug for antigo e pertencer a um redirect registrado.
 * - Valida se a barbearia existe, se está ativa (isActive = true) e autorizada (status = APPROVED ou em trial ativo).
 * - Se inexistente ou inativa -> HTTP 404 (para não expor dados nem status interno).
 */
export async function resolvePublicTenant(
  identifier?: string | null
): Promise<TenantResolutionResult> {
  if (!identifier || typeof identifier !== 'string' || !identifier.trim()) {
    return {
      success: false,
      status: 400,
      error: 'Barbearia não especificada. É obrigatório informar o slug ou identificador da barbearia.',
    }
  }

  const raw = identifier.trim()
  const clean = raw.toLowerCase()

  try {
    // 1. Busca estrita por ID ou Slug direto da barbearia
    const shop = await prisma.barbershop.findFirst({
      where: {
        OR: [
          { id: raw },
          { slug: clean },
          { name: { equals: raw, mode: 'insensitive' } },
        ],
      },
      select: {
        id: true,
        name: true,
        slug: true,
        isActive: true,
        status: true,
        trialEndsAt: true,
        createdAt: true,
        phone: true,
        address: true,
        logo: true,
        description: true,
      },
    })

    if (shop) {
      // Validar atividade do tenant (incluindo contas em período de testes de 7 dias aguardando aprovação)
      if (!isTenantPubliclyAccessible(shop)) {
        return {
          success: false,
          status: 404,
          error: 'Esta barbearia encontra-se temporariamente inativa ou suspensa.',
        }
      }

      // Auto-cura de slug se barbearia antiga ainda não tiver
      if (!shop.slug) {
        const generated = await generateUniqueSlug(shop.name, shop.id)
        await prisma.barbershop.update({
          where: { id: shop.id },
          data: { slug: generated },
        }).catch(() => {})
        shop.slug = generated
      }

      return {
        success: true,
        redirect: false,
        tenant: shop as TenantInfo,
      }
    }

    // 2. Se não encontrou por slug direto, verificar tabela de Redirects Controlados (slugs antigos alterados)
    const redirectRecord = (prisma as any).barbershopSlugRedirect
      ? await (prisma as any).barbershopSlugRedirect.findUnique({
          where: { oldSlug: clean },
          include: {
            barbershop: {
              select: {
                id: true,
                name: true,
                slug: true,
                isActive: true,
                status: true,
                trialEndsAt: true,
                createdAt: true,
                phone: true,
                address: true,
                logo: true,
                description: true,
              },
            },
          },
        })
      : null

    if (redirectRecord?.barbershop) {
      const destinationShop = redirectRecord.barbershop
      if (!isTenantPubliclyAccessible(destinationShop)) {
        return {
          success: false,
          status: 404,
          error: 'Esta barbearia encontra-se temporariamente inativa ou suspensa.',
        }
      }

      return {
        success: true,
        redirect: true,
        targetSlug: destinationShop.slug || clean,
        tenant: destinationShop as TenantInfo,
      }
    }

    return {
      success: false,
      status: 404,
      error: 'Barbearia não encontrada.',
    }
  } catch (error) {
    console.error('Erro ao resolver tenant público:', error)
    return {
      success: false,
      status: 500,
      error: 'Erro interno ao validar barbearia.',
    }
  }
}

/**
 * Rotina de migração/backfill: localiza todas as barbearias antigas sem slug
 * e gera um slug exclusivo automaticamente para cada uma delas.
 */
export async function backfillMissingSlugs() {
  const shopsWithoutSlug = await prisma.barbershop.findMany({
    where: {
      OR: [
        { slug: null },
        { slug: '' },
      ],
    },
    select: { id: true, name: true },
  })

  const results: Array<{ id: string; name: string; slug: string }> = []

  for (const shop of shopsWithoutSlug) {
    const slug = await generateUniqueSlug(shop.name, shop.id)
    await prisma.barbershop.update({
      where: { id: shop.id },
      data: { slug },
    })
    results.push({ id: shop.id, name: shop.name, slug })
  }

  return {
    updatedCount: results.length,
    shops: results,
  }
}
