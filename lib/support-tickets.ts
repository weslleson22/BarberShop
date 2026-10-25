import { prisma } from './prisma'

export type TicketStatus = 'OPEN' | 'IN_PROGRESS' | 'ANSWERED' | 'RESOLVED'

export interface SupportTicket {
  id: string
  protocol: string
  userId: string
  userName: string
  userEmail: string
  userPhone: string
  barbershopId?: string
  barbershopName: string
  subject: string
  category: string
  message: string
  status: TicketStatus
  priority?: 'LOW' | 'MEDIUM' | 'HIGH'
  response?: string
  respondedAt?: string
  respondedBy?: string
  createdAt: string
  updatedAt: string
}

const TICKETS_KEY = 'support_tickets'

// In-memory cache fallback
const globalStore = globalThis as unknown as {
  __supportTickets__?: SupportTicket[]
}

if (!globalStore.__supportTickets__) {
  globalStore.__supportTickets__ = []
}

async function ensureSystemSettingsTable(): Promise<void> {
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS system_settings (
        key TEXT PRIMARY KEY,
        value JSONB NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `)
  } catch (err) {
    console.warn('[SUPPORT_TICKETS_DB_WARN] Erro ao verificar tabela system_settings:', err)
  }
}

export function generateTicketProtocol(): string {
  const year = new Date().getFullYear()
  const randomSuffix = Math.floor(100000 + Math.random() * 900000)
  return `BS-${year}-${randomSuffix}`
}

export async function getAllTicketsAsync(): Promise<SupportTicket[]> {
  try {
    await ensureSystemSettingsTable()
    const rows = await prisma.$queryRawUnsafe<Array<{ key: string; value: any }>>(
      `SELECT value FROM system_settings WHERE key = $1 LIMIT 1;`,
      TICKETS_KEY
    )

    if (rows && rows.length > 0 && rows[0]?.value) {
      const dbVal = rows[0].value
      const parsed: SupportTicket[] = typeof dbVal === 'string' ? JSON.parse(dbVal) : dbVal
      if (Array.isArray(parsed)) {
        globalStore.__supportTickets__ = parsed
        return parsed
      }
    }
  } catch (err) {
    console.warn('[SUPPORT_TICKETS_GET_DB_WARN] Falha ao carregar chamados do banco:', err)
  }

  return globalStore.__supportTickets__ || []
}

export async function saveTicketsAsync(tickets: SupportTicket[]): Promise<void> {
  globalStore.__supportTickets__ = tickets
  try {
    await ensureSystemSettingsTable()
    const jsonStr = JSON.stringify(tickets)
    await prisma.$executeRawUnsafe(
      `INSERT INTO system_settings (key, value, updated_at)
       VALUES ($1, $2::jsonb, NOW())
       ON CONFLICT (key) DO UPDATE
       SET value = EXCLUDED.value, updated_at = NOW();`,
      TICKETS_KEY,
      jsonStr
    )
  } catch (err) {
    console.error('[SUPPORT_TICKETS_SAVE_DB_ERR] Falha ao persistir chamados no banco:', err)
  }
}

export async function createTicketAsync(
  data: Omit<SupportTicket, 'id' | 'protocol' | 'createdAt' | 'updatedAt' | 'status'> & {
    protocol?: string
  }
): Promise<SupportTicket> {
  const tickets = await getAllTicketsAsync()
  const now = new Date().toISOString()
  const protocol = data.protocol || generateTicketProtocol()
  const id = `tkt_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`

  const newTicket: SupportTicket = {
    ...data,
    id,
    protocol,
    status: 'OPEN',
    createdAt: now,
    updatedAt: now,
  }

  tickets.unshift(newTicket)
  await saveTicketsAsync(tickets)
  return newTicket
}

export async function updateTicketStatusAndResponseAsync(
  ticketId: string,
  params: {
    status: TicketStatus
    response?: string
    respondedBy?: string
  }
): Promise<SupportTicket | null> {
  const tickets = await getAllTicketsAsync()
  const index = tickets.findIndex((t) => t.id === ticketId || t.protocol === ticketId)
  if (index === -1) return null

  const current = tickets[index]
  const now = new Date().toISOString()

  const updated: SupportTicket = {
    ...current,
    status: params.status,
    response: params.response !== undefined ? params.response : current.response,
    respondedAt: params.response ? now : current.respondedAt,
    respondedBy: params.respondedBy || current.respondedBy || 'Equipe BarberShop',
    updatedAt: now,
  }

  tickets[index] = updated
  await saveTicketsAsync(tickets)
  return updated
}

export async function getTicketsForUserAsync(
  userId: string,
  barbershopId?: string
): Promise<SupportTicket[]> {
  const all = await getAllTicketsAsync()
  return all.filter((t) => {
    if (t.userId === userId) return true
    if (barbershopId && t.barbershopId === barbershopId) return true
    return false
  })
}
