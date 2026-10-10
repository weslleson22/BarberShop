export interface CheckoutCustomizationConfig {
  theme: 'LIGHT' | 'DARK' | 'SYSTEM'
  accentColor: string
  storeName: string
  logoUrl?: string
  showAddress: boolean
  showTaxId: boolean
  showPhone: boolean
  acceptedMethods: ('PIX' | 'CREDIT_CARD' | 'BOLETO')[]
  guaranteeBadgeText: string
  supportEmail?: string
  installmentsMax: number
  bannerMessage?: string
}

export const DEFAULT_CHECKOUT_CONFIG: CheckoutCustomizationConfig = {
  theme: 'DARK',
  accentColor: '#84cc16', // Verde Abacate característico da AbacatePay
  storeName: 'BarberShop Pro',
  logoUrl: '',
  showAddress: true,
  showTaxId: true,
  showPhone: true,
  acceptedMethods: ['PIX', 'CREDIT_CARD', 'BOLETO'],
  guaranteeBadgeText: 'Compra 100% segura',
  supportEmail: 'suporte@barbershop.com.br',
  installmentsMax: 12,
  bannerMessage: 'Acesso instantâneo liberado logo após a confirmação do pagamento.',
}

let inMemoryConfig: CheckoutCustomizationConfig = { ...DEFAULT_CHECKOUT_CONFIG }

/**
 * Obtém as configurações atuais de personalização do checkout
 * Seguro tanto para Client Components quanto Server Components / Lambdas
 */
export function getCheckoutConfig(): CheckoutCustomizationConfig {
  if (typeof window === 'undefined') {
    try {
      const fs = eval('require')('fs')
      const path = eval('require')('path')
      const os = eval('require')('os')
      const filePath = path.join(os.tmpdir(), 'barbershop-checkout-config.json')
      if (fs.existsSync(filePath)) {
        const data = fs.readFileSync(filePath, 'utf-8')
        inMemoryConfig = { ...DEFAULT_CHECKOUT_CONFIG, ...JSON.parse(data) }
      }
    } catch {
      // Retorna inMemoryConfig caso o ambiente não permita I/O
    }
  }
  return inMemoryConfig
}

/**
 * Atualiza e persiste as configurações de personalização do checkout
 */
export function updateCheckoutConfig(
  newConfig: Partial<CheckoutCustomizationConfig>
): CheckoutCustomizationConfig {
  inMemoryConfig = { ...inMemoryConfig, ...newConfig }
  if (typeof window === 'undefined') {
    try {
      const fs = eval('require')('fs')
      const path = eval('require')('path')
      const os = eval('require')('os')
      const filePath = path.join(os.tmpdir(), 'barbershop-checkout-config.json')
      fs.writeFileSync(filePath, JSON.stringify(inMemoryConfig, null, 2), 'utf-8')
    } catch {
      // Ignora falhas em ambientes somente-leitura
    }
  }
  return inMemoryConfig
}

export interface ParsedAddress {
  zipCode: string
  street: string
  number: string
  complement: string
  neighborhood: string
  city: string
  state: string
}

export interface CustomerDefaults {
  name?: string
  email?: string
  taxId?: string
  phone?: string
  address?: Partial<ParsedAddress>
}

/**
 * Utilitário para interpretar e preencher o endereço cadastrado no banco (JSON ou texto)
 */
export function parseStoredAddress(rawAddress?: string | null): ParsedAddress {
  const empty: ParsedAddress = {
    zipCode: '',
    street: '',
    number: '',
    complement: '',
    neighborhood: '',
    city: '',
    state: '',
  }

  if (!rawAddress || typeof rawAddress !== 'string') return empty

  // 1. Tenta interpretar como JSON
  try {
    const parsed = JSON.parse(rawAddress)
    if (typeof parsed === 'object' && parsed !== null) {
      return {
        zipCode: parsed.zipCode || parsed.cep || '',
        street: parsed.street || parsed.logradouro || parsed.rua || '',
        number: parsed.number || parsed.numero || '',
        complement: parsed.complement || parsed.complemento || '',
        neighborhood: parsed.neighborhood || parsed.bairro || '',
        city: parsed.city || parsed.cidade || '',
        state: parsed.state || parsed.uf || parsed.estado || '',
      }
    }
  } catch {
    // Continua para extração de texto
  }

  // 2. Extrai CEP se presente
  const cepMatch = rawAddress.match(/\b\d{5}-?\d{3}\b/)
  const zipCode = cepMatch ? cepMatch[0].replace(/\D/g, '') : ''
  const cleaned = rawAddress.replace(/\b\d{5}-?\d{3}\b/, '').replace(/CEP:?/i, '').trim()

  // 3. Tenta extrair partes separadas por vírgula
  const parts = cleaned.split(/,\s*/).map((p) => p.trim()).filter(Boolean)
  if (parts.length >= 2) {
    const street = parts[0] || ''
    const numberMatch = parts[1]?.match(/\d+/)
    const number = numberMatch ? numberMatch[0] : parts[1] || ''
    const neighborhood = parts[2] || ''
    const cityState = parts[3] || ''
    const [city, state] = cityState.split(/\s*[-/]\s*/)

    return {
      zipCode,
      street,
      number,
      complement: '',
      neighborhood,
      city: city || '',
      state: state || '',
    }
  }

  return {
    ...empty,
    zipCode,
    street: cleaned,
  }
}

