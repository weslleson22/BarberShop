import fs from 'fs'
import path from 'path'
import os from 'os'

export interface ActiveSession {
  sessionId: string
  userId: string
  lastActive: number
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
// Usa os.tmpdir() para evitar que o Node File Trace (NFT) da Vercel rastreie e empacote
// todo o diretório .next (>500MB), estourando o limite de 250MB de Serverless Function,
// e garante compatibilidade com sistemas de arquivos serverless onde apenas /tmp é gravável.
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

// Initialize on first module load
loadPersistedSessions()

export const SessionManager = {
  /**
   * Registra uma nova sessão ativa para o usuário.
   * Invalida imediatamente qualquer sessão anterior do mesmo usuário.
   */
  registerSession(userId: string, sessionId: string): void {
    activeSessions.set(userId, {
      userId,
      sessionId,
      lastActive: Date.now(),
    })
    persistSessions()
  },

  /**
   * Obtém a sessão ativa de um usuário.
   */
  getActiveSession(userId: string): ActiveSession | undefined {
    return activeSessions.get(userId)
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
      })
      persistSessions()
      return true
    }

    return current.sessionId === sessionId
  },

  /**
   * Invalida a sessão ativa de um usuário (ex: logout explícito).
   */
  invalidateSession(userId: string, sessionId?: string): void {
    const current = activeSessions.get(userId)
    if (current && (!sessionId || current.sessionId === sessionId)) {
      activeSessions.delete(userId)
      persistSessions()
    }
  },

  /**
   * Limpa todas as sessões ativas (utilitário para testes).
   */
  clearAllSessions(): void {
    activeSessions.clear()
    persistSessions()
  },
}
