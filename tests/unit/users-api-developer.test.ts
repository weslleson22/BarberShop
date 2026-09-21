import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { getAuthUser } from '@/lib/api-auth'
import { generateToken } from '@/lib/auth'

describe('getAuthUser e API /api/users — Resiliência de Autenticação em Deploy', () => {
  const validDevUser = {
    id: 'dev-1',
    name: 'Desenvolvedor Master',
    email: 'dev@barbershop.com',
    role: 'DEVELOPER' as const,
    barbershopId: null,
  }

  const validAdminUser = {
    id: 'admin-1',
    name: 'Admin Barbearia',
    email: 'admin@barbearia.com',
    role: 'ADMIN' as const,
    barbershopId: 'shop-1',
  }

  it('autentica com sucesso quando apenas o cookie auth-token é fornecido', () => {
    const token = generateToken(validDevUser)
    const request = new NextRequest('http://localhost:3000/api/users', {
      headers: {
        cookie: `auth-token=${token}`,
      },
    })

    const user = getAuthUser(request)
    expect(user).not.toBeNull()
    expect(user?.email).toBe('dev@barbershop.com')
    expect(user?.role).toBe('DEVELOPER')
  })

  it('autentica com sucesso quando o cookie é inválido ou expirado, mas o header Authorization é válido', () => {
    // Cenário clássico de deploy: cookie com token antigo/expirado de outro deploy,
    // mas localStorage enviou o token novo e válido no header Authorization: Bearer
    const validToken = generateToken(validDevUser)
    const expiredOrCorruptCookie = 'corrupt-or-expired-token'

    const request = new NextRequest('http://localhost:3000/api/users', {
      headers: {
        cookie: `auth-token=${expiredOrCorruptCookie}`,
        authorization: `Bearer ${validToken}`,
      },
    })

    const user = getAuthUser(request)
    expect(user).not.toBeNull()
    expect(user?.email).toBe('dev@barbershop.com')
    expect(user?.role).toBe('DEVELOPER')
  })

  it('autentica com sucesso quando apenas o header Authorization é fornecido', () => {
    const token = generateToken(validAdminUser)
    const request = new NextRequest('http://localhost:3000/api/users', {
      headers: {
        authorization: `Bearer ${token}`,
      },
    })

    const user = getAuthUser(request)
    expect(user).not.toBeNull()
    expect(user?.email).toBe('admin@barbearia.com')
    expect(user?.role).toBe('ADMIN')
  })

  it('retorna null apenas quando tanto o cookie quanto o header Authorization são inválidos ou ausentes', () => {
    const request = new NextRequest('http://localhost:3000/api/users', {
      headers: {
        cookie: 'auth-token=invalid-cookie',
        authorization: 'Bearer invalid-token',
      },
    })

    const user = getAuthUser(request)
    expect(user).toBeNull()
  })
})
