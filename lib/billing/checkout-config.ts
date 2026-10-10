import fs from 'fs'
import path from 'path'

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

const CONFIG_FILE_PATH = path.join(process.cwd(), '.checkout-config.json')

/**
 * Obtém as configurações atuais de personalização do checkout
 */
export function getCheckoutConfig(): CheckoutCustomizationConfig {
  try {
    if (fs.existsSync(CONFIG_FILE_PATH)) {
      const data = fs.readFileSync(CONFIG_FILE_PATH, 'utf-8')
      const parsed = JSON.parse(data)
      return { ...DEFAULT_CHECKOUT_CONFIG, ...parsed }
    }
  } catch (error) {
    console.warn('[CHECKOUT_CONFIG_WARN] Erro ao ler arquivo de configuração:', error)
  }
  return DEFAULT_CHECKOUT_CONFIG
}

/**
 * Atualiza e persiste as configurações de personalização do checkout
 */
export function updateCheckoutConfig(
  newConfig: Partial<CheckoutCustomizationConfig>
): CheckoutCustomizationConfig {
  try {
    const current = getCheckoutConfig()
    const updated = { ...current, ...newConfig }
    fs.writeFileSync(CONFIG_FILE_PATH, JSON.stringify(updated, null, 2), 'utf-8')
    return updated
  } catch (error) {
    console.error('[CHECKOUT_CONFIG_ERROR] Erro ao salvar configurações:', error)
    return { ...DEFAULT_CHECKOUT_CONFIG, ...newConfig }
  }
}
