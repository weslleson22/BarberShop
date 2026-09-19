import { NextRequest } from 'next/server'
import { verifyToken, JWTPayload } from './auth'

// Extrai e valida o usuário autenticado a partir do cookie httpOnly 'auth-token'.
// Único ponto de verdade para "quem está fazendo esta requisição" nas rotas de API —
// nunca confiar em barbershopId/userId/role enviados no corpo/query da requisição.
export function getAuthUser(request: NextRequest): JWTPayload | null {
  let token = request.cookies.get('auth-token')?.value

  if (!token) {
    const authHeader = request.headers.get('authorization')
    if (authHeader) {
      const match = authHeader.match(/^Bearer\s+(.+)$/i)
      if (match) {
        token = match[1]
      }
    }
  }

  if (!token) return null

  try {
    return verifyToken(token)
  } catch {
    return null
  }
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
