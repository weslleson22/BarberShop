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
