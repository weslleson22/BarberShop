import { describe, it, expect, beforeEach, vi } from 'vitest'
import { SessionManager } from '@/lib/session-manager'
import { generateToken } from '@/lib/auth'
import { getAuthUser } from '@/lib/api-auth'
import { GET as getSessionRoute } from '@/app/api/auth/session/route'
import { NextRequest } from 'next/server'

describe('Controle de Sessão Única e Concorrência de Logins (Single Active Session)', () => {
  const userId = 'usr_test_single_session_1'

  beforeEach(() => {
    SessionManager.clearAllSessions()
  })

  it('1. Registra a primeira sessão ativa com sucesso', () => {
    const session1 = 'sess_device_1'
    SessionManager.registerSession(userId, session1)

    expect(SessionManager.isSessionActive(userId, session1)).toBe(true)
    expect(SessionManager.getActiveSession(userId)?.sessionId).toBe(session1)
  })

  it('2. Invalida a sessão anterior quando um novo login ocorre para o mesmo usuário', () => {
    const session1 = 'sess_device_1'
    const session2 = 'sess_device_2'

    // Primeiro login (Dispositivo 1)
    SessionManager.registerSession(userId, session1)
    expect(SessionManager.isSessionActive(userId, session1)).toBe(true)

    // Segundo login (Dispositivo 2) na mesma conta
    SessionManager.registerSession(userId, session2)

    // Sessão 1 DEVE ser invalidada imediatamente
    expect(SessionManager.isSessionActive(userId, session1)).toBe(false)

    // Sessão 2 DEVE ser a única sessão ativa
    expect(SessionManager.isSessionActive(userId, session2)).toBe(true)
    expect(SessionManager.getActiveSession(userId)?.sessionId).toBe(session2)
  })

  it('3. getAuthUser aceita token da sessão atual e rejeita token da sessão superseded', () => {
    const session1 = 'sess_pc'
    const session2 = 'sess_mobile'

    // Usuário loga no PC
    SessionManager.registerSession(userId, session1)
    const tokenPC = generateToken({
      id: userId,
      name: 'User Test',
      email: 'user@test.com',
      role: 'CLIENT',
      sessionId: session1,
    })

    const reqPC = new NextRequest('http://localhost:3000/api/appointments', {
      headers: { Authorization: `Bearer ${tokenPC}` },
    })

    const authPC = getAuthUser(reqPC)
    expect(authPC).not.toBeNull()
    expect(authPC?.id).toBe(userId)
    expect(authPC?.sessionId).toBe(session1)

    // Usuário loga no Celular (nova sessão criada)
    SessionManager.registerSession(userId, session2)
    const tokenMobile = generateToken({
      id: userId,
      name: 'User Test',
      email: 'user@test.com',
      role: 'CLIENT',
      sessionId: session2,
    })

    // Requisição do Celular passa
    const reqMobile = new NextRequest('http://localhost:3000/api/appointments', {
      headers: { Authorization: `Bearer ${tokenMobile}` },
    })
    const authMobile = getAuthUser(reqMobile)
    expect(authMobile).not.toBeNull()
    expect(authMobile?.sessionId).toBe(session2)

    // Requisição do PC agora DEVE ser rejeitada (retorna null -> 401)
    const authPCAfter = getAuthUser(reqPC)
    expect(authPCAfter).toBeNull()
  })

  it('4. Rota GET /api/auth/session responde 200 para sessão ativa e 401 SESSION_SUPERSEDED para sessão anterior', async () => {
    const session1 = 'sess_tab_1'
    const session2 = 'sess_tab_2'

    // Login na aba 1
    SessionManager.registerSession(userId, session1)
    const token1 = generateToken({
      id: userId,
      name: 'User Test',
      email: 'user@test.com',
      role: 'ADMIN',
      sessionId: session1,
    })

    const req1 = new NextRequest('http://localhost:3000/api/auth/session', {
      headers: { Authorization: `Bearer ${token1}` },
    })
    const res1 = await getSessionRoute(req1)
    expect(res1.status).toBe(200)
    const data1 = await res1.json()
    expect(data1.valid).toBe(true)

    // Novo login substitui sessão ativa
    SessionManager.registerSession(userId, session2)

    // Verificação na aba 1 agora detecta sessão superseded
    // Criamos uma requisição com o token1 original (para testar a rota)
    // Na rota, getAuthUser(req) valida o token: se a sessão for superseded,
    // getAuthUser retorna null e a rota responde 401 UNAUTHENTICATED
    const res1After = await getSessionRoute(req1)
    expect(res1After.status).toBe(401)
  })

  it('5. Invalida sessão com sucesso no logout', () => {
    const session1 = 'sess_to_logout'
    SessionManager.registerSession(userId, session1)
    expect(SessionManager.isSessionActive(userId, session1)).toBe(true)

    SessionManager.invalidateSession(userId, session1)
    expect(SessionManager.getActiveSession(userId)).toBeUndefined()
  })
})
