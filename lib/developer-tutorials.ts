import { prisma } from './prisma'

export interface DeveloperTutorial {
  id: string
  title: string
  category: string
  description: string
  youtubeUrl: string
  embedUrl: string
  duration?: string
  order: number
  createdAt: string
  updatedAt: string
}

const TUTORIALS_KEY = 'developer_tutorials'

// Normaliza qualquer link do YouTube (watch, share youtu.be, shorts ou embed) para o formato embed padrão
export function extractYouTubeEmbedUrl(url: string): string {
  if (!url || typeof url !== 'string') return ''

  const trimmed = url.trim()

  // Se já for um embed válido
  if (trimmed.includes('youtube.com/embed/')) {
    return trimmed
  }

  // Formato: https://youtu.be/VIDEO_ID
  const shortMatch = trimmed.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/)
  if (shortMatch && shortMatch[1]) {
    return `https://www.youtube.com/embed/${shortMatch[1]}`
  }

  // Formato: https://www.youtube.com/watch?v=VIDEO_ID
  const watchMatch = trimmed.match(/[?&]v=([a-zA-Z0-9_-]{11})/)
  if (watchMatch && watchMatch[1]) {
    return `https://www.youtube.com/embed/${watchMatch[1]}`
  }

  // Formato: https://www.youtube.com/shorts/VIDEO_ID
  const shortsMatch = trimmed.match(/youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/)
  if (shortsMatch && shortsMatch[1]) {
    return `https://www.youtube.com/embed/${shortsMatch[1]}`
  }

  return trimmed
}

// Tutoriais padrão de demonstração e treinamento
const DEFAULT_TUTORIALS: DeveloperTutorial[] = [
  {
    id: 'tut_default_1',
    title: 'Como configurar os Horários de Atendimento e Folgas dos Barbeiros',
    category: 'Horários & Escala',
    description: 'Aprenda a definir o expediente da barbearia e configurar quais dias da semana cada barbeiro atende ou tem folga.',
    youtubeUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    embedUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
    duration: '3 min',
    order: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'tut_default_2',
    title: 'Personalizando o Perfil da Barbearia e seu Link Público',
    category: 'Perfil & Link',
    description: 'Veja como cadastrar logotipo, dados de contato e divulgar seu link exclusivo para clientes agendarem pelo celular.',
    youtubeUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    embedUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
    duration: '4 min',
    order: 2,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'tut_default_3',
    title: 'Controle de Gastos e Despesas do Estabelecimento',
    category: 'Financeiro & Gastos',
    description: 'Domine a gestão de custos fixos, saídas de caixa e insumos para acompanhar o lucro real da barbearia.',
    youtubeUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    embedUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
    duration: '5 min',
    order: 3,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'tut_default_4',
    title: 'Cadastro de Serviços, Preços e Duração dos Procedimentos',
    category: 'Serviços',
    description: 'Cadastre seus cortes, barbas e combos configurando a duração exata para o sistema calcular os slots da agenda.',
    youtubeUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    embedUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
    duration: '3 min',
    order: 4,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
]

// In-memory cache fallback
const globalTutorialStore = globalThis as unknown as {
  __developerTutorials__?: DeveloperTutorial[]
}

if (!globalTutorialStore.__developerTutorials__) {
  globalTutorialStore.__developerTutorials__ = DEFAULT_TUTORIALS
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
    console.warn('[DEVELOPER_TUTORIALS_DB_WARN] Erro ao verificar tabela system_settings:', err)
  }
}

export async function getAllTutorialsAsync(): Promise<DeveloperTutorial[]> {
  try {
    await ensureSystemSettingsTable()
    const rows = await prisma.$queryRawUnsafe<Array<{ key: string; value: any }>>(
      `SELECT value FROM system_settings WHERE key = $1 LIMIT 1;`,
      TUTORIALS_KEY
    )

    if (rows && rows.length > 0 && rows[0]?.value) {
      const dbVal = rows[0].value
      const parsed: DeveloperTutorial[] = typeof dbVal === 'string' ? JSON.parse(dbVal) : dbVal
      if (Array.isArray(parsed) && parsed.length > 0) {
        globalTutorialStore.__developerTutorials__ = parsed
        return parsed.sort((a, b) => a.order - b.order)
      }
    } else {
      // Salva os tutoriais iniciais para primeira visualização
      await saveTutorialsAsync(DEFAULT_TUTORIALS)
      return DEFAULT_TUTORIALS
    }
  } catch (err) {
    console.warn('[DEVELOPER_TUTORIALS_GET_DB_WARN] Falha ao consultar tutoriais do banco:', err)
  }

  return globalTutorialStore.__developerTutorials__ || DEFAULT_TUTORIALS
}

export async function saveTutorialsAsync(tutorials: DeveloperTutorial[]): Promise<void> {
  globalTutorialStore.__developerTutorials__ = tutorials
  try {
    await ensureSystemSettingsTable()
    const jsonStr = JSON.stringify(tutorials)
    await prisma.$executeRawUnsafe(
      `INSERT INTO system_settings (key, value, updated_at)
       VALUES ($1, $2::jsonb, NOW())
       ON CONFLICT (key) DO UPDATE
       SET value = EXCLUDED.value, updated_at = NOW();`,
      TUTORIALS_KEY,
      jsonStr
    )
  } catch (err) {
    console.error('[DEVELOPER_TUTORIALS_SAVE_DB_ERR] Falha ao persistir tutoriais no banco:', err)
  }
}

export async function createTutorialAsync(
  data: Omit<DeveloperTutorial, 'id' | 'embedUrl' | 'createdAt' | 'updatedAt'>
): Promise<DeveloperTutorial> {
  const tutorials = await getAllTutorialsAsync()
  const now = new Date().toISOString()
  const id = `tut_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
  const embedUrl = extractYouTubeEmbedUrl(data.youtubeUrl)

  const newTutorial: DeveloperTutorial = {
    ...data,
    id,
    embedUrl,
    order: data.order ?? tutorials.length + 1,
    createdAt: now,
    updatedAt: now,
  }

  tutorials.push(newTutorial)
  await saveTutorialsAsync(tutorials)
  return newTutorial
}

export async function updateTutorialAsync(
  id: string,
  updates: Partial<Omit<DeveloperTutorial, 'id' | 'createdAt' | 'updatedAt'>>
): Promise<DeveloperTutorial | null> {
  const tutorials = await getAllTutorialsAsync()
  const index = tutorials.findIndex((t) => t.id === id)
  if (index === -1) return null

  const current = tutorials[index]
  const now = new Date().toISOString()
  const embedUrl = updates.youtubeUrl
    ? extractYouTubeEmbedUrl(updates.youtubeUrl)
    : current.embedUrl

  const updated: DeveloperTutorial = {
    ...current,
    ...updates,
    embedUrl,
    updatedAt: now,
  }

  tutorials[index] = updated
  await saveTutorialsAsync(tutorials)
  return updated
}

export async function deleteTutorialAsync(id: string): Promise<boolean> {
  const tutorials = await getAllTutorialsAsync()
  const filtered = tutorials.filter((t) => t.id !== id)
  if (filtered.length === tutorials.length) return false

  await saveTutorialsAsync(filtered)
  return true
}
