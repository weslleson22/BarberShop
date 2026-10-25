/**
 * BarberShop SaaS - Modelo e Utilitários de Horários de Funcionamento (Operating Hours)
 * 
 * Permite que cada barbearia configure individualmente:
 * - Quais dias da semana está aberta ou fechada para atendimento
 * - Horário de abertura e encerramento de cada dia
 * - Intervalo de almoço / pausa opcional
 */

export interface DayOperatingHours {
  isOpen: boolean
  open: string // formato "HH:mm", ex: "08:00"
  close: string // formato "HH:mm", ex: "19:00"
  hasBreak?: boolean
  breakStart?: string // formato "HH:mm", ex: "12:00"
  breakEnd?: string // formato "HH:mm", ex: "13:00"
}

export type DayOfWeekKey = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday'

export interface WeekOperatingHours {
  monday: DayOperatingHours
  tuesday: DayOperatingHours
  wednesday: DayOperatingHours
  thursday: DayOperatingHours
  friday: DayOperatingHours
  saturday: DayOperatingHours
  sunday: DayOperatingHours
}

export const DAYS_CONFIG: Array<{
  key: DayOfWeekKey
  label: string
  shortLabel: string
  dayIndex: number // 0 = Domingo, 1 = Segunda, ..., 6 = Sábado
}> = [
  { key: 'monday', label: 'Segunda-feira', shortLabel: 'SEG', dayIndex: 1 },
  { key: 'tuesday', label: 'Terça-feira', shortLabel: 'TER', dayIndex: 2 },
  { key: 'wednesday', label: 'Quarta-feira', shortLabel: 'QUA', dayIndex: 3 },
  { key: 'thursday', label: 'Quinta-feira', shortLabel: 'QUI', dayIndex: 4 },
  { key: 'friday', label: 'Sexta-feira', shortLabel: 'SEX', dayIndex: 5 },
  { key: 'saturday', label: 'Sábado', shortLabel: 'SÁB', dayIndex: 6 },
  { key: 'sunday', label: 'Domingo', shortLabel: 'DOM', dayIndex: 0 },
]

export const DEFAULT_OPERATING_HOURS: WeekOperatingHours = {
  monday: { isOpen: true, open: '08:00', close: '19:00', hasBreak: false, breakStart: '12:00', breakEnd: '13:00' },
  tuesday: { isOpen: true, open: '08:00', close: '19:00', hasBreak: false, breakStart: '12:00', breakEnd: '13:00' },
  wednesday: { isOpen: true, open: '08:00', close: '19:00', hasBreak: false, breakStart: '12:00', breakEnd: '13:00' },
  thursday: { isOpen: true, open: '08:00', close: '19:00', hasBreak: false, breakStart: '12:00', breakEnd: '13:00' },
  friday: { isOpen: true, open: '08:00', close: '19:00', hasBreak: false, breakStart: '12:00', breakEnd: '13:00' },
  saturday: { isOpen: true, open: '08:00', close: '17:00', hasBreak: false, breakStart: '12:00', breakEnd: '13:00' },
  sunday: { isOpen: false, open: '08:00', close: '14:00', hasBreak: false, breakStart: '12:00', breakEnd: '13:00' },
}

export interface ExpenseRecord {
  id: string
  title: string
  amount: number
  category: 'FIXED' | 'SUPPLIES' | 'MAINTENANCE' | 'MARKETING' | 'TAXES' | 'OTHER'
  dueDate: string
  status: 'PAID' | 'PENDING'
  paymentDate?: string | null
  notes?: string | null
  createdAt: string
}

export interface InventoryItem {
  id: string
  name: string
  sku?: string | null
  category: 'REVENTA' | 'USO_INTERNO' | 'OUTROS'
  currentStock: number
  minStock: number
  unit: string // 'UN', 'ML', 'CX', 'L', 'FRASCO', 'G', etc.
  costPrice: number // Preço de custo unitário
  salePrice: number // Preço de venda unitário
  expirationDate?: string | null // YYYY-MM-DD
  batch?: string | null // Lote
  notes?: string | null
  createdAt: string
  updatedAt: string
}

export interface StockMovement {
  id: string
  productId: string
  productName: string
  type: 'ENTRY' | 'EXIT'
  quantity: number
  unit: string
  costUnit?: number | null
  totalValue?: number | null
  reason: 'PURCHASE' | 'SALE' | 'INTERNAL_USE' | 'LOSS_EXPIRED' | 'ADJUSTMENT' | 'OTHER'
  date: string // YYYY-MM-DD
  notes?: string | null
  createdAt: string
}

/**
 * Converte com segurança os metadados do campo description do banco de dados
 */
export function parseBarbershopMetadata(rawDescription: string | null | undefined): {
  description: string
  operatingHours: WeekOperatingHours | null
  barberWorkDays: Record<string, DayOfWeekKey[]>
  expenses: ExpenseRecord[]
  inventory: InventoryItem[]
  stockMovements: StockMovement[]
} {
  if (!rawDescription || !rawDescription.trim()) {
    return {
      description: '',
      operatingHours: null,
      barberWorkDays: {},
      expenses: [],
      inventory: [],
      stockMovements: [],
    }
  }

  const trimmed = rawDescription.trim()

  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    try {
      const parsed = JSON.parse(trimmed)
      if (parsed && typeof parsed === 'object') {
        const bio = typeof parsed.bio === 'string'
          ? parsed.bio
          : typeof parsed.description === 'string'
          ? parsed.description
          : ''

        let operatingHours: WeekOperatingHours | null = null
        if (parsed.operatingHours && typeof parsed.operatingHours === 'object') {
          operatingHours = normalizeOperatingHours(parsed.operatingHours)
        }

        const barberWorkDays: Record<string, DayOfWeekKey[]> = {}
        if (parsed.barberWorkDays && typeof parsed.barberWorkDays === 'object') {
          for (const [barberId, days] of Object.entries(parsed.barberWorkDays)) {
            if (Array.isArray(days)) {
              barberWorkDays[barberId] = days as DayOfWeekKey[]
            }
          }
        }

        const expenses: ExpenseRecord[] = Array.isArray(parsed.expenses)
          ? parsed.expenses
          : []

        const inventory: InventoryItem[] = Array.isArray(parsed.inventory)
          ? parsed.inventory
          : []

        const stockMovements: StockMovement[] = Array.isArray(parsed.stockMovements)
          ? parsed.stockMovements
          : []

        return {
          description: bio,
          operatingHours,
          barberWorkDays,
          expenses,
          inventory,
          stockMovements,
        }
      }
    } catch {
      // Ignora erro de JSON e trata como texto simples
    }
  }

  return {
    description: trimmed,
    operatingHours: null,
    barberWorkDays: {},
    expenses: [],
    inventory: [],
    stockMovements: [],
  }
}

/**
 * Garante que todos os 7 dias da semana estejam presentes e formatados
 */
export function normalizeOperatingHours(input: Partial<WeekOperatingHours>): WeekOperatingHours {
  const result: WeekOperatingHours = { ...DEFAULT_OPERATING_HOURS }

  for (const day of DAYS_CONFIG) {
    const dayData = (input as any)?.[day.key]
    if (dayData && typeof dayData === 'object') {
      result[day.key] = {
        isOpen: typeof dayData.isOpen === 'boolean' ? dayData.isOpen : true,
        open: typeof dayData.open === 'string' && dayData.open ? dayData.open : '08:00',
        close: typeof dayData.close === 'string' && dayData.close ? dayData.close : '19:00',
        hasBreak: !!dayData.hasBreak,
        breakStart: typeof dayData.breakStart === 'string' ? dayData.breakStart : '12:00',
        breakEnd: typeof dayData.breakEnd === 'string' ? dayData.breakEnd : '13:00',
      }
    }
  }

  return result
}

/**
 * Empacota bio, operatingHours, barberWorkDays, expenses, inventory e stockMovements no campo description para persistência no banco
 */
export function serializeBarbershopMetadata(
  bio: string | null | undefined,
  hours: WeekOperatingHours | null | undefined,
  barberWorkDays?: Record<string, DayOfWeekKey[]> | null,
  expenses?: ExpenseRecord[] | null,
  inventory?: InventoryItem[] | null,
  stockMovements?: StockMovement[] | null
): string | null {
  const cleanBio = bio ? bio.trim() : ''

  const hasHours = !!hours
  const hasBarberDays = barberWorkDays && Object.keys(barberWorkDays).length > 0
  const hasExpenses = Array.isArray(expenses) && expenses.length > 0
  const hasInventory = Array.isArray(inventory) && inventory.length > 0
  const hasMovements = Array.isArray(stockMovements) && stockMovements.length > 0

  if (!hasHours && !hasBarberDays && !hasExpenses && !hasInventory && !hasMovements) {
    return cleanBio || null
  }

  return JSON.stringify({
    bio: cleanBio,
    operatingHours: hours || null,
    barberWorkDays: barberWorkDays || {},
    expenses: expenses || [],
    inventory: inventory || [],
    stockMovements: stockMovements || [],
  })
}

/**
 * Verifica se um profissional específico está escalado para trabalhar em um determinado dia
 */
export function isBarberWorkingOnDay(
  barberId: string,
  barberWorkDays?: Record<string, DayOfWeekKey[]> | null,
  date?: Date | string | null
): boolean {
  if (!barberWorkDays || !barberWorkDays[barberId] || barberWorkDays[barberId].length === 0) {
    return true // Se não tiver dias específicos restritos, atende em todos os dias que a unidade estiver aberta
  }

  const assignedDays = barberWorkDays[barberId]
  let parsedDate: Date
  if (!date) {
    parsedDate = new Date()
  } else if (typeof date === 'string') {
    if (date.includes('-')) {
      const parts = date.split('-').map(Number)
      parsedDate = parts.length >= 3 ? new Date(parts[0], parts[1] - 1, parts[2], 12, 0, 0) : new Date(date)
    } else {
      parsedDate = new Date(date)
    }
  } else {
    parsedDate = date
  }

  const dayIndex = isNaN(parsedDate.getTime()) ? new Date().getDay() : parsedDate.getDay()
  const dayConfig = DAYS_CONFIG.find((d) => d.dayIndex === dayIndex)
  if (!dayConfig) return true

  return assignedDays.includes(dayConfig.key)
}

/**
 * Retorna as regras de funcionamento de um dia específico para uma data (Date ou string YYYY-MM-DD)
 */
export function getDayOperatingHours(
  hours: WeekOperatingHours | null | undefined,
  date?: Date | string | null
): DayOperatingHours {
  const effectiveHours = hours || DEFAULT_OPERATING_HOURS

  if (!date) {
    const todayIndex = new Date().getDay()
    const dayConfig = DAYS_CONFIG.find((d) => d.dayIndex === todayIndex)
    return (dayConfig && effectiveHours[dayConfig.key]) || { isOpen: true, open: '08:00', close: '19:00' }
  }

  let parsedDate: Date
  if (typeof date === 'string') {
    if (date.includes('-')) {
      const parts = date.split('-').map(Number)
      if (parts.length >= 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
        parsedDate = new Date(parts[0], parts[1] - 1, parts[2], 12, 0, 0)
      } else {
        parsedDate = new Date(date)
      }
    } else {
      parsedDate = new Date(date)
    }
  } else if (date instanceof Date) {
    parsedDate = date
  } else {
    parsedDate = new Date()
  }

  const dayIndex = isNaN(parsedDate.getTime()) ? new Date().getDay() : parsedDate.getDay()

  const dayConfig = DAYS_CONFIG.find((d) => d.dayIndex === dayIndex)
  if (!dayConfig) {
    return { isOpen: true, open: '08:00', close: '19:00' }
  }

  return effectiveHours[dayConfig.key] || { isOpen: true, open: '08:00', close: '19:00' }
}
