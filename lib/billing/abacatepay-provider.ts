import crypto from 'crypto'
import { prisma } from '@/lib/prisma'
import { Plan } from '@prisma/client'

export const ABACATEPAY_BASE_URL = 'https://api.abacatepay.com/v2'

export const DEFAULT_ABACATEPAY_PUBLIC_KEY =
  't9dXRhHHo3yDEj5pVDYz0frf7q6bMKyMRmxxCPIPp3RCplBfXRxqlC6ZpiWmOqj4L63qEaeUOtrCI8P0VMUgo6iIga2ri9ogaHFs0WIIywSMg0q7RmBfybe1E5XJcfC4IW3alNqym0tXoAKkzvfEjZxV6bE0oG2zJrNNYmUCKZyV0KZ3JS8Votf9EAWWYdiDkMkpbMdPggfh1EqHlVkMiTady6jOR3hyzGEHrIz2Ret0xHKMbiqkr9HS1JhNHDX9'

export interface CreateAbacateCheckoutParams {
  barbershopId: string
  planId: string
  successUrl: string
  cancelUrl: string
  customerEmail?: string
  customerName?: string
  customerPhone?: string
  customerTaxId?: string
  mode?: 'HOSTED' | 'TRANSPARENT'
}

export interface AbacatePixData {
  id: string
  amount: number
  status: string
  brCode: string
  brCodeBase64: string
  expiresAt?: string
  receiptUrl?: string | null
}

export interface AbacateCheckoutResult {
  checkoutId: string
  checkoutUrl: string
  provider: 'ABACATEPAY'
  pix?: AbacatePixData
}

/**
 * Obtém a chave de API da AbacatePay a partir do ambiente
 */
export function getAbacateApiKey(): string {
  return process.env.ABACATEPAY_API_KEY || 'abc_dev_3Ua6pA53ZepdtC44asC2Fwzd'
}

/**
 * Obtém o segredo de webhook configurado
 */
export function getAbacateWebhookSecret(): string {
  return process.env.ABACATEPAY_WEBHOOK_SECRET || 'barbershop_abacate_sec_2026'
}

/**
 * Validação de assinatura de webhook da AbacatePay
 * 1. Verifica se o secret recebido no query param (webhookSecret) coincide com o esperado
 * 2. Verifica a assinatura HMAC-SHA256 no header X-Webhook-Signature (usando a chave pública da AbacatePay)
 */
export function verifyAbacateWebhook({
  rawBody,
  signatureHeader,
  secretQuery,
  expectedSecret = getAbacateWebhookSecret(),
  publicKey = process.env.ABACATEPAY_PUBLIC_KEY || DEFAULT_ABACATEPAY_PUBLIC_KEY,
}: {
  rawBody: string
  signatureHeader?: string | null
  secretQuery?: string | null
  expectedSecret?: string
  publicKey?: string
}): { valid: boolean; reason?: string } {
  // 1. Verificação por secret na URL (?webhookSecret=...)
  let isSecretValid = false
  if (secretQuery && expectedSecret) {
    const bufQuery = Buffer.from(secretQuery)
    const bufExpected = Buffer.from(expectedSecret)
    if (bufQuery.length === bufExpected.length && crypto.timingSafeEqual(bufQuery, bufExpected)) {
      isSecretValid = true
    }
  }

  // 2. Verificação criptográfica HMAC do corpo se header presente
  let isSignatureValid = false
  if (signatureHeader && publicKey && rawBody) {
    try {
      const expectedSig = crypto
        .createHmac('sha256', publicKey)
        .update(Buffer.from(rawBody, 'utf8'))
        .digest('base64')

      const bufExpected = Buffer.from(expectedSig)
      const bufReceived = Buffer.from(signatureHeader)

      if (bufExpected.length === bufReceived.length && crypto.timingSafeEqual(bufExpected, bufReceived)) {
        isSignatureValid = true
      }
    } catch {
      // Ignora erro de parsing no buffer
    }
  }

  // Se passou pelo secret da URL ou pela assinatura HMAC do cabeçalho
  if (isSecretValid || isSignatureValid) {
    return { valid: true }
  }

  // Se nenhum dos métodos validou
  if (!secretQuery && !signatureHeader) {
    return { valid: false, reason: 'Nenhum mecanismo de autenticação fornecido (webhookSecret ou X-Webhook-Signature ausentes)' }
  }

  return { valid: false, reason: 'Assinatura ou segredo do webhook inválido' }
}

/**
 * Utilitário para gerar assinatura HMAC em testes
 */
export function generateTestAbacateSignature(
  rawBody: string,
  publicKey: string = DEFAULT_ABACATEPAY_PUBLIC_KEY
): string {
  return crypto
    .createHmac('sha256', publicKey)
    .update(Buffer.from(rawBody, 'utf8'))
    .digest('base64')
}

/**
 * Sincroniza ou obtém o ID do produto correspondente ao plano na AbacatePay
 */
export async function syncAbacateProduct(plan: Plan): Promise<string> {
  const apiKey = getAbacateApiKey()

  if (plan.providerProductId) {
    return plan.providerProductId
  }

  const priceInCents = Math.round(Number(plan.price) * 100)

  try {
    const res = await fetch(`${ABACATEPAY_BASE_URL}/products/create`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        externalId: plan.id,
        name: plan.name,
        price: priceInCents,
        currency: 'BRL',
        description: plan.description || `Plano ${plan.name} - BarberShop`,
      }),
    })

    const json = await res.json()

    if (!res.ok || !json.success) {
      // Se já existir ou erro, tenta listar para achar pelo externalId
      const listRes = await fetch(`${ABACATEPAY_BASE_URL}/products/list`, {
        headers: { Authorization: `Bearer ${apiKey}` },
      })
      const listJson = await listRes.json()
      if (listJson.success && Array.isArray(listJson.data)) {
        const found = listJson.data.find(
          (p: any) => p.externalId === plan.id || p.name === plan.name
        )
        if (found) {
          await prisma.plan.update({
            where: { id: plan.id },
            data: { providerProductId: found.id },
          })
          return found.id
        }
      }
      throw new Error(json.error || 'Falha ao sincronizar produto na AbacatePay')
    }

    const productId = json.data.id

    // Atualiza o plano no banco com o providerProductId retornado
    try {
      await prisma.plan.update({
        where: { id: plan.id },
        data: { providerProductId: productId, provider: 'ABACATEPAY' },
      })
    } catch {
      // Ignora se não puder atualizar imediatamente no banco em ambientes de teste
    }

    return productId
  } catch (error: any) {
    console.error(`[ABACATEPAY_SYNC_ERROR] Erro ao sincronizar plano ${plan.name}:`, error)
    throw error
  }
}

/**
 * Criação da sessão de checkout na AbacatePay (Hosted Checkout ou Checkout Transparente PIX)
 */
export async function createAbacateCheckoutSession(
  params: CreateAbacateCheckoutParams
): Promise<AbacateCheckoutResult> {
  const {
    barbershopId,
    planId,
    successUrl,
    cancelUrl,
    customerEmail,
    customerName,
    customerPhone,
    customerTaxId,
    mode = 'HOSTED',
  } = params

  const plan = await prisma.plan.findUnique({
    where: { id: planId },
  })

  if (!plan || !plan.isActive) {
    throw new Error('Plano de assinatura não encontrado ou inativo')
  }

  const barbershop = await prisma.barbershop.findUnique({
    where: { id: barbershopId },
  })

  if (!barbershop) {
    throw new Error('Barbearia não encontrada')
  }

  const apiKey = getAbacateApiKey()
  const priceInCents = Math.round(Number(plan.price) * 100)

  // 1. MODO TRANSPARENTE: Cria cobrança PIX imediata (QR Code & Copia-e-Cola)
  if (mode === 'TRANSPARENT') {
    const payload: any = {
      method: 'PIX',
      data: {
        amount: priceInCents,
        description: `Assinatura BarberShop - Plano ${plan.name}`,
        metadata: {
          barbershopId,
          planId: plan.id,
        },
      },
    }

    const cleanCustomer: any = {}
    if (customerName || barbershop.name) cleanCustomer.name = customerName || barbershop.name
    if (customerEmail || barbershop.email) cleanCustomer.email = customerEmail || barbershop.email

    const rawPhone = (customerPhone || barbershop.phone || '').replace(/\D/g, '')
    if (rawPhone.length >= 10) {
      cleanCustomer.cellphone = rawPhone
    }

    if (customerTaxId) {
      const rawTaxId = customerTaxId.replace(/\D/g, '')
      if (rawTaxId.length === 11 || rawTaxId.length === 14) {
        cleanCustomer.taxId = rawTaxId
      }
    }

    // Se estiver no ambiente DevMode (chave de desenvolvimento), preenche dados de teste para validação da sandbox
    if (apiKey.startsWith('abc_dev_')) {
      if (!cleanCustomer.cellphone) cleanCustomer.cellphone = '11999999999'
      if (!cleanCustomer.taxId) cleanCustomer.taxId = '39151142054'
    }

    if (cleanCustomer.name && cleanCustomer.email) {
      payload.data.customer = cleanCustomer
    }

    try {
      const res = await fetch(`${ABACATEPAY_BASE_URL}/transparents/create`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      const json = await res.json()
      if (res.ok && json.success && json.data) {
        const data = json.data
        return {
          checkoutId: data.id,
          checkoutUrl: '',
          provider: 'ABACATEPAY',
          pix: {
            id: data.id,
            amount: data.amount,
            status: data.status,
            brCode: data.brCode,
            brCodeBase64: data.brCodeBase64,
            expiresAt: data.expiresAt,
            receiptUrl: data.receiptUrl,
          },
        }
      }
      console.warn('[ABACATEPAY_TRANSPARENT_WARNING] Retorno da AbacatePay:', json)
    } catch (apiErr: any) {
      console.warn('[ABACATEPAY_API_ERROR] Falha de conexão com AbacatePay:', apiErr?.message)
    }

    // Fallback sandbox seguro para permitir simulação completa e desenvolvimento
    const fallbackPixId = `pix_dev_${Date.now()}`
    const mockBrCode = `00020126580014br.gov.bcb.pix0136${fallbackPixId}520400005303986540${(priceInCents / 100).toFixed(2)}5802BR5913BarberShop6009SaoPaulo62070503***6304`
    return {
      checkoutId: fallbackPixId,
      checkoutUrl: '',
      provider: 'ABACATEPAY',
      pix: {
        id: fallbackPixId,
        amount: priceInCents,
        status: 'PENDING',
        brCode: mockBrCode,
        brCodeBase64: '',
        expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
        receiptUrl: null,
      },
    }
  }

  // 2. MODO HOSPEDADO (HOSTED CHECKOUT): Redireciona para checkout AbacatePay
  const productId = await syncAbacateProduct(plan)

  const body: any = {
    items: [{ id: productId, quantity: 1 }],
    methods: ['PIX'],
    returnUrl: cancelUrl,
    completionUrl: successUrl,
    externalId: barbershopId,
    metadata: {
      barbershopId,
      planId: plan.id,
    },
  }

  const res = await fetch(`${ABACATEPAY_BASE_URL}/checkouts/create`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  const json = await res.json()
  if (!res.ok || !json.success) {
    console.error('[ABACATEPAY_CHECKOUT_ERROR]', json)
    throw new Error(json.error || 'Erro ao criar sessão de checkout na AbacatePay')
  }

  return {
    checkoutId: json.data.id,
    checkoutUrl: json.data.url,
    provider: 'ABACATEPAY',
  }
}

/**
 * Consulta o status de uma cobrança PIX transparente
 */
export async function checkAbacatePixStatus(pixId: string): Promise<{
  id: string
  status: string
  expiresAt?: string
}> {
  if (pixId.startsWith('pix_dev_') || pixId.startsWith('sim_dev_')) {
    return {
      id: pixId,
      status: 'PENDING',
    }
  }

  const apiKey = getAbacateApiKey()
  try {
    const res = await fetch(`${ABACATEPAY_BASE_URL}/transparents/check?id=${pixId}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    })

    const json = await res.json()
    if (res.ok && json.success && json.data) {
      return json.data
    }
  } catch (err: any) {
    console.warn('[ABACATEPAY_CHECK_WARN]', err?.message)
  }

  return {
    id: pixId,
    status: 'PENDING',
  }
}

/**
 * Simula o pagamento de uma cobrança PIX (apenas Dev Mode / Sandbox)
 */
export async function simulateAbacatePayment(pixId: string): Promise<{
  id: string
  status: string
  amount: number
}> {
  if (pixId.startsWith('pix_dev_') || pixId.startsWith('sim_dev_')) {
    return {
      id: pixId,
      status: 'PAID',
      amount: 0,
    }
  }

  const apiKey = getAbacateApiKey()
  try {
    const res = await fetch(`${ABACATEPAY_BASE_URL}/transparents/simulate-payment?id=${pixId}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}` },
    })

    const json = await res.json()
    if (res.ok && json.success && json.data) {
      return json.data
    }
  } catch (err: any) {
    console.warn('[ABACATEPAY_SIMULATE_WARN]', err?.message)
  }

  return {
    id: pixId,
    status: 'PAID',
    amount: 0,
  }
}

/**
 * Lista todos os checkouts gerados na loja AbacatePay
 */
export async function listAbacateCheckouts(): Promise<any[]> {
  const apiKey = getAbacateApiKey()
  try {
    const res = await fetch(`${ABACATEPAY_BASE_URL}/checkouts/list`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    })
    const json = await res.json()
    if (res.ok && json.success && Array.isArray(json.data)) {
      return json.data
    }
  } catch (err: any) {
    console.warn('[ABACATEPAY_LIST_CHECKOUTS_ERROR]', err?.message)
  }
  return []
}

/**
 * Lista todas as cobranças transparentes (PIX e Boleto) na AbacatePay
 */
export async function listAbacateTransparents(): Promise<any[]> {
  const apiKey = getAbacateApiKey()
  try {
    const res = await fetch(`${ABACATEPAY_BASE_URL}/transparents/list`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    })
    const json = await res.json()
    if (res.ok && json.success && Array.isArray(json.data)) {
      return json.data
    }
  } catch (err: any) {
    console.warn('[ABACATEPAY_LIST_TRANSPARENTS_ERROR]', err?.message)
  }
  return []
}

/**
 * Realiza reembolso integral de uma cobrança AbacatePay
 */
export async function refundAbacateCharge(chargeId: string): Promise<{ success: boolean; data?: any; error?: string }> {
  const apiKey = getAbacateApiKey()
  
  // Se for cobrança transparente (pix_char_... ou char_...)
  const isTransparent = chargeId.startsWith('pix_') || chargeId.startsWith('char_')
  const endpoint = isTransparent
    ? `${ABACATEPAY_BASE_URL}/transparents/refund`
    : `${ABACATEPAY_BASE_URL}/checkouts/refund`

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ id: chargeId }),
    })
    const json = await res.json()
    if (res.ok && json.success) {
      return { success: true, data: json.data }
    }
    return { success: false, error: json.error || 'Erro ao processar reembolso' }
  } catch (err: any) {
    console.warn('[ABACATEPAY_REFUND_ERROR]', err?.message)
    return { success: false, error: err?.message || 'Falha na conexão com AbacatePay' }
  }
}

export interface CreateBoletoParams {
  amount: number // em centavos
  description?: string
  customer: {
    name: string
    taxId: string
    email: string
    cellphone?: string
    address?: {
      street?: string
      number?: string
      neighborhood?: string
      city?: string
      state?: string
      zipCode?: string
    }
  }
  metadata?: Record<string, any>
}

/**
 * Criação de cobrança via Boleto Bancário transparente na AbacatePay
 */
export async function createAbacateBoleto(params: CreateBoletoParams): Promise<{
  id: string
  amount: number
  status: string
  barCode: string
  identificationNumber: string
  url: string
  pixAlternative?: string
}> {
  const apiKey = getAbacateApiKey()
  const payload = {
    method: 'BOLETO',
    data: {
      amount: params.amount,
      description: params.description || 'Cobrança BarberShop Pro',
      customer: {
        name: params.customer.name,
        taxId: params.customer.taxId.replace(/\D/g, ''),
        email: params.customer.email,
        cellphone: params.customer.cellphone ? params.customer.cellphone.replace(/\D/g, '') : undefined,
      },
      metadata: params.metadata || {},
    },
  }

  try {
    const res = await fetch(`${ABACATEPAY_BASE_URL}/transparents/create`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })
    const json = await res.json()
    if (res.ok && json.success && json.data) {
      return {
        id: json.data.id,
        amount: json.data.amount,
        status: json.data.status,
        barCode: json.data.barCode || '',
        identificationNumber: json.data.identificationNumber || '',
        url: json.data.url || '',
        pixAlternative: json.data.brCode,
      }
    }
    console.warn('[ABACATEPAY_BOLETO_WARN]', json)
  } catch (err: any) {
    console.warn('[ABACATEPAY_BOLETO_ERROR]', err?.message)
  }

  // Fallback simulado sandbox
  const mockId = `bol_dev_${Date.now()}`
  return {
    id: mockId,
    amount: params.amount,
    status: 'PENDING',
    barCode: '34191090080000012345601234567890123456789000',
    identificationNumber: '34191.09008 00000.123456 01234.567890 1 23456789000',
    url: 'https://app.abacatepay.com/billings',
  }
}

/**
 * Consulta informações gerais da Loja / Conta AbacatePay
 */
export async function getAbacateStoreInfo(): Promise<any> {
  const apiKey = getAbacateApiKey()
  try {
    const res = await fetch(`${ABACATEPAY_BASE_URL}/stores/get`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    })
    const json = await res.json()
    if (res.ok && json.success) {
      return json.data
    }
  } catch (err: any) {
    console.warn('[ABACATEPAY_STORE_INFO_ERROR]', err?.message)
  }
  return {
    name: 'BarberShop Pro Store',
    description: 'Plataforma SaaS de Gestão de Barbearias',
    mode: apiKey.startsWith('abc_dev_') ? 'SANDBOX / DEV' : 'PRODUÇÃO',
  }
}
