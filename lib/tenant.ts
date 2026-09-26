import { prisma } from './prisma'

export interface TenantInfo {
  id: string
  name: string
  slug: string | null
  isActive: boolean
  status: string
  phone: string | null
  address: string | null
  logo: string | null
  description: string | null
}

export type TenantResolutionResult =
  | { success: true; tenant: TenantInfo }
  | { success: false; status: 400 | 404 | 500; error: string }

/**
 * Resolução e validação estrita de tenant público por slug ou id.
 * 
 * Regra Arquitetural:
 * - O identificador (slug ou ID) DEVE ser explicitamente fornecido.
 * - NUNCA faz fallback para "primeira barbearia ativa".
 * - Valida se a barbearia existe, se está ativa (isActive = true) e aprovada (status = APPROVED).
 * - Se não fornecido -> HTTP 400.
 * - Se inexistente ou inativa -> HTTP 404.
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
    // Buscar barbearia por id, slug ou nome exato (case-insensitive)
    const shop = await prisma.barbershop.findFirst({
      where: {
        OR: [
          { id: raw },
          { slug: clean } as any,
          { name: { equals: raw, mode: 'insensitive' } },
        ],
      } as any,
      select: {
        id: true,
        name: true,
        slug: true,
        isActive: true,
        status: true,
        phone: true,
        address: true,
        logo: true,
        description: true,
      } as any,
    })

    if (!shop) {
      return {
        success: false,
        status: 404,
        error: 'Barbearia não encontrada.',
      }
    }

    const shopRecord = shop as any
    if (!shopRecord.isActive || (shopRecord.status && shopRecord.status !== 'APPROVED')) {
      return {
        success: false,
        status: 404,
        error: 'Esta barbearia encontra-se temporariamente inativa ou suspensa.',
      }
    }

    if (!shop.slug) {
      const generated = await generateUniqueSlug(shop.name, shop.id)
      await prisma.barbershop.update({
        where: { id: shop.id },
        data: { slug: generated },
      }).catch(() => {})
      ;(shop as any).slug = generated
    }

    return {
      success: true,
      tenant: shop as unknown as TenantInfo,
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
 * Converte qualquer texto para um slug URL-friendly limpo (minúsculo, sem acentos, sem símbolos).
 */
export function slugify(text: string): string {
  return text
    .toString()
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
 * Gera um slug único garantido no banco de dados para a barbearia.
 * Se o slug já existir, adiciona sufixo numérico (-2, -3, etc.).
 */
export async function generateUniqueSlug(name: string, shopId?: string): Promise<string> {
  const base = slugify(name) || 'barbearia'
  let candidate = base

  if (candidate.length < 2) {
    candidate = `barbearia-${shopId ? shopId.slice(-6) : Math.random().toString(36).substring(2, 7)}`
  }

  let counter = 1
  while (counter <= 50) {
    const existing = await prisma.barbershop.findFirst({
      where: {
        slug: candidate,
        ...(shopId ? { id: { not: shopId } } : {}),
      },
      select: { id: true },
    })

    if (!existing || existing.id === shopId) {
      return candidate
    }

    counter++
    candidate = `${base}-${counter}`
  }

  // Fallback seguro com sufixo único garantido
  return `${base}-${shopId ? shopId.slice(-6) : Date.now().toString(36)}`
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
