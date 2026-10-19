import fs from 'fs'
import path from 'path'
import os from 'os'

export interface ActiveSession {
  sessionId: string
  userId: string
  lastActive: number
  userName?: string
  userEmail?: string
  userRole?: string
  avatar?: string | null
  barbershopId?: string | null
  barbershopName?: string | null
  barbershopSlug?: string | null
  ipAddress?: string | null
  userAgent?: string | null
  deviceType?: 'Desktop' | 'Mobile' | 'Tablet' | 'Outro'
  currentPath?: string | null
  connectedAt?: number
}

// In-memory global store to survive hot-module reloading in Next.js dev server
const globalSessions = globalThis as unknown as {
  __activeSessions__?: Map<string, ActiveSession>
}

if (!globalSessions.__activeSessions__) {
  globalSessions.__activeSessions__ = new Map<string, ActiveSession>()
}

const activeSessions = globalSessions.__activeSessions__

// Local persistence file path (resilient across server restarts)
const SESSIONS_DIR = path.join(os.tmpdir(), 'barbershop-sessions')
const SESSIONS_FILE = path.join(SESSIONS_DIR, 'active-sessions.json')

function loadPersistedSessions() {
  try {
    if (fs.existsSync(SESSIONS_FILE)) {
      const content = fs.readFileSync(SESSIONS_FILE, 'utf-8')
      const data = JSON.parse(content)
      for (const [userId, session] of Object.entries(data)) {
        if (session && typeof session === 'object' && (session as any).sessionId) {
          activeSessions.set(userId, session as ActiveSession)
        }
      }
    }
  } catch {
    // Ignore parse or read errors
  }
}

function persistSessions() {
  try {
    if (!fs.existsSync(SESSIONS_DIR)) {
      fs.mkdirSync(SESSIONS_DIR, { recursive: true })
    }
    const obj: Record<string, ActiveSession> = {}
    activeSessions.forEach((val, key) => {
      obj[key] = val
    })
    fs.writeFileSync(SESSIONS_FILE, JSON.stringify(obj), 'utf-8')
  } catch {
    // Ignore persistence failures (in-memory remains active)
  }
}

// Helper para detectar tipo de dispositivo do User Agent
export function detectDeviceType(ua?: string | null): 'Desktop' | 'Mobile' | 'Tablet' | 'Outro' {
  if (!ua) return 'Outro'
  const lower = ua.toLowerCase()
  if (lower.includes('ipad') || lower.includes('tablet')) return 'Tablet'
  if (lower.includes('mobi') || lower.includes('android') || lower.includes('iphone')) return 'Mobile'
  if (lower.includes('mozilla') || lower.includes('chrome') || lower.includes('safari') || lower.includes('windows') || lower.includes('macintosh') || lower.includes('linux')) return 'Desktop'
  return 'Outro'
}

// Initialize on first module load
loadPersistedSessions()

export const SessionManager = {
  /**
   * Registra uma nova sessão ativa para o usuário com metadados opcionais.
   * Invalida imediatamente qualquer sessão anterior do mesmo usuário.
   */
  registerSession(
    userId: string,
    sessionId: string,
    metadata?: Partial<Omit<ActiveSession, 'userId' | 'sessionId' | 'lastActive'>>
  ): void {
    const existing = activeSessions.get(userId)
    const now = Date.now()
    activeSessions.set(userId, {
      userId,
      sessionId,
      lastActive: now,
      connectedAt: existing?.connectedAt || now,
      deviceType: metadata?.userAgent ? detectDeviceType(metadata.userAgent) : existing?.deviceType || 'Desktop',
      ...metadata,
    })
    persistSessions()
  },

  /**
   * Atualiza a atividade de uma sessão ativa (heartbeat ou requisição de API).
   */
  touchSession(
    userId: string,
    metadata?: Partial<Omit<ActiveSession, 'userId' | 'sessionId' | 'lastActive'>>
  ): void {
    const session = activeSessions.get(userId)
    if (session) {
      session.lastActive = Date.now()
      if (metadata) {
        if (metadata.userAgent && !session.deviceType) {
          session.deviceType = detectDeviceType(metadata.userAgent)
        }
        Object.assign(session, metadata)
      }
      persistSessions()
    }
  },

  /**
   * Obtém a sessão ativa de um usuário.
   */
  getActiveSession(userId: string): ActiveSession | undefined {
    return activeSessions.get(userId)
  },

  /**
   * Retorna todas as sessões ativas com atividade dentro do limite (default: 15 minutos).
   */
  getAllActiveSessions(thresholdMinutes: number = 15): ActiveSession[] {
    const cutoff = Date.now() - thresholdMinutes * 60 * 1000
    const list: ActiveSession[] = []
    activeSessions.forEach((val) => {
      if (val.lastActive >= cutoff) {
        list.push({ ...val })
      }
    })
    return list.sort((a, b) => b.lastActive - a.lastActive)
  },

  /**
   * Verifica se a sessionId apresentada pelo token ainda é a sessão ativa.
   * Se o token não possuir sessionId (ex.: token legado de teste), é tolerado.
   * Se o token possuir sessionId e esta diferir da sessão ativa registrada, retorna false.
   */
  isSessionActive(userId: string, sessionId?: string): boolean {
    if (!sessionId) {
      return true
    }

    const current = activeSessions.get(userId)
    if (!current) {
      // Primeira chamada após restart/reload do servidor: assume esta sessão como ativa
      activeSessions.set(userId, {
        userId,
        sessionId,
        lastActive: Date.now(),
        connectedAt: Date.now(),
      })
      persistSessions()
      return true
    }

    return current.sessionId === sessionId
  },

  /**
   * Invalida a sessão ativa de um usuário (ex: logout explícito ou desconexão administrativa).
   */
  invalidateSession(userId: string, sessionId?: string): void {
    const current = activeSessions.get(userId)
    if (current && (!sessionId || current.sessionId === sessionId)) {
      activeSessions.delete(userId)
      persistSessions()
    }
  },

  /**
   * Força a desconexão de um usuário pelo ID (independente de sessionId).
   */
  disconnectUser(userId: string): boolean {
    const exists = activeSessions.has(userId)
    if (exists) {
      activeSessions.delete(userId)
      persistSessions()
    }
    return exists
  },

  /**
   * Limpa todas as sessões ativas (utilitário para testes).
   */
  clearAllSessions(): void {
    activeSessions.clear()
    persistSessions()
  },
}
