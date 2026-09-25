import { NextRequest } from 'next/server'
import { verifyToken, JWTPayload } from './auth'

// Extrai e valida o usuário autenticado a partir do cookie httpOnly 'auth-token'.
// Único ponto de verdade para "quem está fazendo esta requisição" nas rotas de API —
// nunca confiar em barbershopId/userId/role enviados no corpo/query da requisição.
export function getAuthUser(request: NextRequest): JWTPayload | null {
  // 1. Tentar ler e validar do cookie httpOnly 'auth-token'
  const cookieToken = request.cookies.get('auth-token')?.value
  if (cookieToken) {
    try {
      return verifyToken(cookieToken)
    } catch {
      // Cookie expirado, de deploy anterior ou corrompido:
      // Continua para tentar o header Authorization como fallback
    }
  }

  // 2. Tentar ler e validar do header Authorization: Bearer <token>
  const authHeader = request.headers.get('authorization')
  if (authHeader) {
    const match = authHeader.match(/^Bearer\s+(.+)$/i)
    if (match && match[1]) {
      try {
        return verifyToken(match[1])
      } catch {
        // Token do header inválido
      }
    }
  }

  return null
}

export function requireRole(
  user: JWTPayload | null,
  roles: JWTPayload['role'][]
): user is JWTPayload {
  return !!user && roles.includes(user.role)
}

/**
 * Determina o barbershopId seguro a ser usado na consulta ou mutação.
 * - Usuários comuns (ADMIN, BARBER, RECEPTIONIST, CLIENT) NUNCA podem ver ou alterar outro tenant:
 *   o retorno é estritamente user.barbershopId.
 * - Usuário DEVELOPER tem acesso global ou pode especificar um tenant via overrideId.
 */
export function getSafeTenantId(user: JWTPayload, overrideId?: string | null): string | null {
  if (user.role === 'DEVELOPER') {
    return overrideId || user.barbershopId || null
  }
  return user.barbershopId || null
}

export function isDeveloper(user: JWTPayload | null): boolean {
  return !!user && user.role === 'DEVELOPER'
}

/**
 * Resolução estrita do contexto de tenant:
 * 1. Para usuários autenticados não-DEVELOPER:
 *    - O tenant é SEMPRE user.barbershopId.
 *    - Qualquer tenant enviado pelo frontend via query param ou body é DESCARTADO.
 *    - Se o usuário não possui barbershopId, bloqueia imediatamente.
 * 2. Para DEVELOPER:
 *    - Pode acessar plataforma global (tenantId: null, isGlobal: true)
 *    - Ou operar sobre um tenant específico explicitamente fornecido.
 * 3. Para rotas públicas (usuário não autenticado):
 *    - O tenantId DEVE ser informado explicitamente.
 *    - NUNCA faz fallback para "primeira barbearia ativa".
 */
export function resolveTenantContext(
  user: JWTPayload | null,
  requestedTenantId?: string | null
): { tenantId: string | null; isGlobalDeveloper: boolean; error?: string } {
  if (!user) {
    if (!requestedTenantId || requestedTenantId.trim() === '') {
      return { tenantId: null, isGlobalDeveloper: false, error: 'Barbearia não especificada' }
    }
    return { tenantId: requestedTenantId.trim(), isGlobalDeveloper: false }
  }

  if (user.role === 'DEVELOPER') {
    const target = requestedTenantId && requestedTenantId !== 'all' && requestedTenantId.trim() !== ''
      ? requestedTenantId.trim()
      : null
    return { tenantId: target, isGlobalDeveloper: !target }
  }

  if (!user.barbershopId) {
    return { tenantId: null, isGlobalDeveloper: false, error: 'Usuário não vinculado a uma barbearia' }
  }

  // Ignora qualquer spoofing enviado no request
  return { tenantId: user.barbershopId, isGlobalDeveloper: false }
}
