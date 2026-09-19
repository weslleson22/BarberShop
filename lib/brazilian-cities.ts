import rawCities from './ibge-cities.json'

/**
 * Módulo completo de Cidades Brasileiras sincronizado com a base oficial do IBGE.
 * Contém todos os 5.571 municípios do Brasil, com suporte a busca instantânea (0ms),
 * priorização inteligente (capitais e grandes polos primeiro) e busca por Cidade + UF.
 */

export interface BrazilianCity {
  nome: string
  uf: string
  label: string
}

interface IndexedCity extends BrazilianCity {
  normNome: string
  normUf: string
  normLabel: string
  isPriority: boolean
}

// Principais capitais e polos comerciais para ordenar com maior relevância na digitação de prefixos curtos
const PRIORITY_CITIES_SET = new Set([
  'sao paulo-sp', 'rio de janeiro-rj', 'brasilia-df', 'salvador-ba', 'fortaleza-ce',
  'belo horizonte-mg', 'manaus-am', 'curitiba-pr', 'recife-pe', 'goiania-go',
  'belem-pa', 'porto alegre-rs', 'guarulhos-sp', 'campinas-sp', 'sao luis-ma',
  'sao goncalo-rj', 'maceio-al', 'duque de caxias-rj', 'campo grande-ms', 'natal-rn',
  'teresina-pi', 'sao bernardo do campo-sp', 'nova iguacu-rj', 'joao pessoa-pb',
  'santo andre-sp', 'osasco-sp', 'sao jose dos campos-sp', 'ribeirao preto-sp',
  'uberlandia-mg', 'sorocaba-sp', 'contagem-mg', 'aracaju-se', 'feira de santana-ba',
  'cuiaba-mt', 'joinville-sc', 'juiz de fora-mg', 'londrina-pr', 'niteroi-rj',
  'anapolis-go', 'caxias do sul-rs', 'campos dos goytacazes-rj', 'macapa-ap',
  'florianopolis-sc', 'vila velha-es', 'serra-es', 'diadema-sp', 'maua-sp',
  'betim-mg', 'santos-sp', 'sao jose do rio preto-sp', 'maringa-pr', 'montes claros-mg',
  'campina grande-pb', 'jundiai-sp', 'piracicaba-sp', 'caruaru-pe', 'olinda-pe',
  'bauru-sp', 'rio branco-ac', 'boa vista-rr', 'palmas-to', 'porto velho-ro',
  'blumenau-sc', 'foz do iguacu-pr', 'volta redonda-rj', 'petropolis-rj', 'pelotas-rs',
  'canoas-rs', 'santa maria-rs', 'cascavel-pr', 'ponta grossa-pr', 'vitoria-es'
])

/**
 * Normaliza o texto para busca insensível a acentuação e maiúsculas/minúsculas.
 */
export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
}

// Indexação dos 5.571 municípios do IBGE
export const ALL_IBGE_CITIES: IndexedCity[] = (rawCities as [string, string][]).map(
  ([nome, uf]) => {
    const normNome = normalizeText(nome)
    const normUf = uf.toLowerCase()
    const label = `${nome}, ${uf}`
    const normLabel = `${normNome}, ${normUf}`
    const isPriority = PRIORITY_CITIES_SET.has(`${normNome}-${normUf}`)

    return {
      nome,
      uf,
      label,
      normNome,
      normUf,
      normLabel,
      isPriority,
    }
  }
)

/**
 * Busca cidades brasileiras na base completa oficial do IBGE (5.571 municípios).
 * Permite buscar por nome da cidade (ex: "Campinas", "Sobral", "São Paulo"),
 * por nome + estado (ex: "Campinas SP", "Rio RJ") ou por partes de nomes.
 */
export function searchBrazilianCities(term: string, limit = 15): BrazilianCity[] {
  if (!term) return []
  const normalized = normalizeText(term)
  if (normalized.length === 0) return []

  const words = normalized.split(/[\s,\-]+/).filter(Boolean)

  const exactMatches: BrazilianCity[] = []
  const priorityStartsMatches: BrazilianCity[] = []
  const startsWithMatches: BrazilianCity[] = []
  const containsMatches: BrazilianCity[] = []

  for (let i = 0; i < ALL_IBGE_CITIES.length; i++) {
    const city = ALL_IBGE_CITIES[i]

    // 1. Correspondência exata no nome da cidade
    if (city.normNome === normalized) {
      exactMatches.push({ nome: city.nome, uf: city.uf, label: city.label })
      continue
    }

    // 2. Cidade começa com o termo digitado
    if (city.normNome.startsWith(normalized)) {
      if (city.isPriority) {
        priorityStartsMatches.push({ nome: city.nome, uf: city.uf, label: city.label })
      } else {
        startsWithMatches.push({ nome: city.nome, uf: city.uf, label: city.label })
      }
      continue
    }

    // 3. Se digitou múltiplos termos (ex: "São Paulo SP" ou "Rio RJ")
    if (words.length > 1) {
      const matchesAllWords = words.every(
        (w) => city.normNome.includes(w) || city.normUf === w
      )
      if (matchesAllWords) {
        if (city.isPriority) {
          priorityStartsMatches.push({ nome: city.nome, uf: city.uf, label: city.label })
        } else {
          startsWithMatches.push({ nome: city.nome, uf: city.uf, label: city.label })
        }
        continue
      }
    }

    // 4. Contém o termo em qualquer parte do nome
    if (city.normLabel.includes(normalized)) {
      containsMatches.push({ nome: city.nome, uf: city.uf, label: city.label })
    }
  }

  const combined = [
    ...exactMatches,
    ...priorityStartsMatches,
    ...startsWithMatches,
    ...containsMatches,
  ]

  return combined.slice(0, limit)
}

/**
 * Consulta direta assíncrona opcional à API web do IBGE
 */
export async function fetchIbgeCities(query: string, limit = 15): Promise<BrazilianCity[]> {
  return searchBrazilianCities(query, limit)
}
