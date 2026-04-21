// Middleware de proteção de APIs por role
import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'

export interface AuthenticatedRequest extends NextRequest {
  user: {
    id: string
    email: string
    role: string
    barbershopId: string
  }
}

export function createRoleGuard(allowedRoles: string[]) {
  return async (request: NextRequest): Promise<{ user: any } | NextResponse> => {
    const token = request.cookies.get('auth-token')?.value
    
    if (!token) {
      return NextResponse.json(
        { error: 'Não autorizado - Token não encontrado' },
        { status: 401 }
      )
    }

    try {
      const decoded = verifyToken(token)
      
      if (!allowedRoles.includes(decoded.role)) {
        console.log(`Acesso negado: Role ${decoded.role} não permitido para esta rota`)
        return NextResponse.json(
          { error: 'Acesso negado - Permissões insuficientes' },
          { status: 403 }
        )
      }

      console.log(`Acesso permitido: Role ${decoded.role} autorizado`)
      return { user: decoded }
      
    } catch (error) {
      console.log('Token inválido:', error instanceof Error ? error.message : String(error))
      return NextResponse.json(
        { error: 'Não autorizado - Token inválido' },
        { status: 401 }
      )
    }
  }
}

// Guards específicos para cada tipo de acesso
export const adminGuard = createRoleGuard(['ADMIN'])
export const adminBarberGuard = createRoleGuard(['ADMIN', 'BARBER'])
export const allRolesGuard = createRoleGuard(['ADMIN', 'BARBER', 'CLIENT'])

// Função helper para usar em APIs
export async function checkRolePermission(
  request: NextRequest, 
  allowedRoles: string[]
): Promise<{ user: any } | NextResponse> {
  const token = request.cookies.get('auth-token')?.value
  
  if (!token) {
    return NextResponse.json(
      { error: 'Não autorizado - Token não encontrado' },
      { status: 401 }
    )
  }

  try {
    const decoded = verifyToken(token)
    
    if (!allowedRoles.includes(decoded.role)) {
      return NextResponse.json(
        { error: 'Acesso negado - Permissões insuficientes' },
        { status: 403 }
      )
    }

    return { user: decoded }
    
  } catch (error) {
    return NextResponse.json(
      { error: 'Não autorizado - Token inválido' },
      { status: 401 }
    )
  }
}
