import { NextRequest } from 'next/server'
import { verifyToken, JWTPayload } from './auth'

// Extrai e valida o usuário autenticado a partir do cookie httpOnly 'auth-token'.
// Único ponto de verdade para "quem está fazendo esta requisição" nas rotas de API —
// nunca confiar em barbershopId/userId/role enviados no corpo/query da requisição.
export function getAuthUser(request: NextRequest): JWTPayload | null {
  const token = request.cookies.get('auth-token')?.value
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
