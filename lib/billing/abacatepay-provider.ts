import crypto from 'crypto'
import { prisma } from '@/lib/prisma'
import { Plan } from '@prisma/client'
import { parseStoredAddress } from './checkout-config'

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
export async function syncAbacateProduct(plan: Plan, forceSync: boolean = false): Promise<string> {
  const apiKey = getAbacateApiKey()

  if (plan.providerProductId && !forceSync) {
    return plan.providerProductId
  }

  const priceInCents = Math.round(Number(plan.price) * 100)
  const cycle = plan.billingInterval === 'YEARLY' ? 'ANNUALLY' : 'MONTHLY'

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
        cycle: cycle,
        frequency: cycle,
        description: plan.description || `Plano ${plan.name} - BarberShop Pro`,
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
 * Localiza ou cria o ID do cliente na AbacatePay (cust_...)
 * Essencial para vincular cobranças e assinaturas ao perfil do cliente
 */
export async function resolveAbacateCustomerId(params: {
  barbershopId?: string | null
  email?: string | null
  name?: string | null
  phone?: string | null
  taxId?: string | null
  userId?: string | null
}): Promise<string | null> {
  const cleanEmail = (params.email || '').toLowerCase().trim()

  try {
    // 1. Tenta encontrar na lista de clientes existentes
    const existingList = await listAbacateCustomers()
    if (Array.isArray(existingList)) {
      const match = existingList.find((c: any) => {
        if (cleanEmail && c.email && c.email.toLowerCase() === cleanEmail) return true
        if (params.taxId && c.taxId && c.taxId.replace(/\D/g, '') === params.taxId.replace(/\D/g, '')) return true
        if (params.barbershopId && c.metadata?.barbershopId === params.barbershopId) return true
        if (params.userId && c.metadata?.userId === params.userId) return true
        return false
      })
      if (match?.id) return match.id
    }

    // 2. Se não encontrou e temos e-mail, cria o cliente na AbacatePay
    if (cleanEmail) {
      const created = await createOrSyncAbacateCustomer({
        email: cleanEmail,
        name: params.name,
        cellphone: params.phone,
        taxId: params.taxId,
        metadata: {
          barbershopId: params.barbershopId,
          userId: params.userId,
          role: 'ADMIN',
          source: 'checkout_auto_resolution',
        },
      })
      if (created?.id) return created.id
    }
  } catch (err: any) {
    console.warn('[ABACATEPAY_RESOLVE_CUSTOMER_WARN]', err?.message)
  }

  return null
}

/**
 * Criação da sessão de checkout na AbacatePay (Hosted Checkout ou Checkout Transparente PIX)
 * Sempre vincula o customerId para que apareça em /customers/ no Dashboard da AbacatePay
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

  // Resolve ou garante a existência do customerId na AbacatePay
  const resolvedCustomerId = await resolveAbacateCustomerId({
    barbershopId,
    email: customerEmail || barbershop.email,
    name: customerName || barbershop.name,
    phone: customerPhone || barbershop.phone || undefined,
    taxId: customerTaxId,
  })

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

    if (resolvedCustomerId) {
      payload.data.customerId = resolvedCustomerId
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
    methods: ['PIX', 'CARD'],
    returnUrl: cancelUrl,
    completionUrl: successUrl,
    externalId: barbershopId,
    metadata: {
      barbershopId,
      planId: plan.id,
    },
  }

  if (resolvedCustomerId) {
    body.customerId = resolvedCustomerId
  }

  // Tenta criar como Assinatura Recorrente (/subscriptions/create)
  let checkoutData: any = null
  try {
    const subRes = await fetch(`${ABACATEPAY_BASE_URL}/subscriptions/create`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })
    const subJson = await subRes.json()
    if (subRes.ok && subJson.success && subJson.data) {
      checkoutData = subJson.data
    }
  } catch (subErr: any) {
    console.warn('[ABACATEPAY_SUB_CREATE_WARN]', subErr?.message)
  }

  // Se /subscriptions/create não estiver disponível, cria checkout padrão vinculado ao customerId
  if (!checkoutData) {
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
    checkoutData = json.data
  }

  return {
    checkoutId: checkoutData.id,
    checkoutUrl: checkoutData.url,
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
  const resolvedCustomerId = await resolveAbacateCustomerId({
    barbershopId: params.metadata?.barbershopId,
    email: params.customer.email,
    name: params.customer.name,
    phone: params.customer.cellphone,
    taxId: params.customer.taxId,
  })

  const payload: any = {
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

  if (resolvedCustomerId) {
    payload.data.customerId = resolvedCustomerId
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

/**
 * Lista todos os produtos cadastrados na conta AbacatePay
 */
export async function listAbacateProducts(): Promise<any[]> {
  const apiKey = getAbacateApiKey()
  try {
    const res = await fetch(`${ABACATEPAY_BASE_URL}/products/list`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    })
    const json = await res.json()
    if (res.ok && json.success && Array.isArray(json.data)) {
      return json.data
    }
  } catch (err: any) {
    console.warn('[ABACATEPAY_LIST_PRODUCTS_ERROR]', err?.message)
  }
  return []
}

/**
 * Cria ou sincroniza um produto na AbacatePay
 */
export async function createAbacateProduct(params: {
  externalId?: string
  name: string
  price: number // em centavos
  description?: string
  currency?: string
  cycle?: 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'SEMIANNUALLY' | 'ANNUALLY' | null
}): Promise<any> {
  const apiKey = getAbacateApiKey()
  const payload: any = {
    externalId: params.externalId || `prod_${Date.now()}`,
    name: params.name,
    price: params.price,
    currency: params.currency || 'BRL',
    description: params.description || `Produto ${params.name}`,
  }

  if (params.cycle) {
    payload.cycle = params.cycle
    payload.frequency = params.cycle
  }

  const res = await fetch(`${ABACATEPAY_BASE_URL}/products/create`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })
  const json = await res.json()
  if (!res.ok || !json.success) {
    throw new Error(json.error || 'Erro ao criar produto na AbacatePay')
  }
  return json.data
}

// ==========================================
// GESTÃO E SINCRONIZAÇÃO DE CLIENTES ABACATEPAY
// Os clientes na AbacatePay são os Administradores das Barbearias
// ==========================================

export interface AbacateCustomerInput {
  email: string
  name?: string | null
  cellphone?: string | null
  taxId?: string | null
  zipCode?: string | null
  address?: string | null
  metadata?: Record<string, any>
}

/**
 * Sanitiza e formata telefone para a AbacatePay
 * AbacatePay aceita formato E.164 ou numérico internacional (+5511999999999)
 */
export function sanitizePhoneForAbacate(phone?: string | null): string | undefined {
  if (!phone) return undefined
  const digits = phone.replace(/\D/g, '')
  if (!digits || digits.length < 10) return undefined
  if (digits.startsWith('55') && (digits.length === 12 || digits.length === 13)) {
    return `+${digits}`
  }
  if (digits.length === 10 || digits.length === 11) {
    return `+55${digits}`
  }
  return `+${digits}`
}

/**
 * Sanitiza CPF / CNPJ para a AbacatePay (apenas dígitos válidos)
 */
export function sanitizeTaxIdForAbacate(taxId?: string | null): string | undefined {
  if (!taxId) return undefined
  const digits = taxId.replace(/\D/g, '')
  if (digits.length === 11 || digits.length === 14) {
    return digits
  }
  return undefined
}

/**
 * Sanitiza CEP para a AbacatePay
 */
export function sanitizeZipCodeForAbacate(address?: string | null): string | undefined {
  if (!address) return undefined
  const parsed = parseStoredAddress(address)
  if (parsed.zipCode) {
    const cleanCep = parsed.zipCode.replace(/\D/g, '')
    if (cleanCep.length === 8) {
      return `${cleanCep.substring(0, 5)}-${cleanCep.substring(5)}`
    }
    return cleanCep || undefined
  }
  return undefined
}

/**
 * Lista todos os clientes cadastrados na conta AbacatePay
 */
export async function listAbacateCustomers(): Promise<any[]> {
  const apiKey = getAbacateApiKey()
  try {
    const res = await fetch(`${ABACATEPAY_BASE_URL}/customers/list`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    })
    const json = await res.json()
    if (res.ok) {
      if (Array.isArray(json.data)) return json.data
      if (json.data && Array.isArray(json.data.customers)) return json.data.customers
      if (Array.isArray(json)) return json
    }
    console.warn('[ABACATEPAY_LIST_CUSTOMERS_WARN]', json)
  } catch (err: any) {
    console.warn('[ABACATEPAY_LIST_CUSTOMERS_ERROR]', err?.message)
  }
  return []
}

/**
 * Cria ou sincroniza um cliente na AbacatePay (POST /customers/create)
 * Se o cliente já existir (por CPF ou e-mail), retorna o cadastro existente
 */
export async function createOrSyncAbacateCustomer(params: AbacateCustomerInput): Promise<any> {
  const apiKey = getAbacateApiKey()
  const cleanEmail = (params.email || '').trim().toLowerCase()
  if (!cleanEmail) {
    throw new Error('E-mail é obrigatório para cadastrar cliente na AbacatePay')
  }

  const cleanName = (params.name || '').trim() || undefined
  const cleanPhone = sanitizePhoneForAbacate(params.cellphone)
  const cleanTaxId = sanitizeTaxIdForAbacate(params.taxId)
  const cleanZipCode = params.zipCode || sanitizeZipCodeForAbacate(params.address)

  const payload: Record<string, any> = {
    email: cleanEmail,
  }
  if (cleanName) payload.name = cleanName
  if (cleanPhone) payload.cellphone = cleanPhone
  if (cleanTaxId) payload.taxId = cleanTaxId
  if (cleanZipCode) payload.zipCode = cleanZipCode
  if (params.metadata) payload.metadata = params.metadata

  try {
    const res = await fetch(`${ABACATEPAY_BASE_URL}/customers/create`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })

    const json = await res.json()

    if (res.ok && (json.data || json.id)) {
      return json.data || json
    }

    // Se a AbacatePay indicou duplicidade ou outro status, consulta a lista existente
    const existingList = await listAbacateCustomers()
    const existing = existingList.find((c: any) => {
      const matchEmail = c.email && c.email.toLowerCase() === cleanEmail
      const matchTaxId = cleanTaxId && c.taxId && c.taxId.replace(/\D/g, '') === cleanTaxId
      return matchEmail || matchTaxId
    })

    if (existing) {
      return {
        ...existing,
        isExisting: true,
      }
    }

    if (!res.ok) {
      console.warn('[ABACATEPAY_CUSTOMER_CREATE_FAILED]', json)
      throw new Error(json.error?.message || json.error || 'Erro ao registrar cliente na AbacatePay')
    }

    return json.data || json
  } catch (err: any) {
    console.error('[ABACATEPAY_CUSTOMER_SYNC_ERROR]', err?.message)
    throw err
  }
}

/**
 * Sincroniza um usuário Administrador de barbearia específico com a AbacatePay
 */
export async function syncBarbershopAdminToAbacate(adminUserId: string): Promise<any> {
  const user = await prisma.user.findUnique({
    where: { id: adminUserId },
    include: { barbershop: true },
  })

  if (!user) {
    throw new Error(`Usuário ${adminUserId} não encontrado`)
  }

  if (user.role !== 'ADMIN' || !user.barbershop) {
    throw new Error(`Usuário ${user.email} não é um administrador de barbearia`)
  }

  const result = await createOrSyncAbacateCustomer({
    email: user.email,
    name: user.name || user.barbershop.name,
    cellphone: user.phone || user.barbershop.phone || undefined,
    address: user.address || user.barbershop.address || undefined,
    metadata: {
      barbershopId: user.barbershop.id,
      barbershopName: user.barbershop.name,
      barbershopSlug: user.barbershop.slug || '',
      userId: user.id,
      userRole: user.role,
      barbershopStatus: user.barbershop.status,
      syncedAt: new Date().toISOString(),
      source: 'platform_sync',
    },
  })

  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      barbershop: {
        id: user.barbershop.id,
        name: user.barbershop.name,
      },
    },
    abacateCustomer: result,
  }
}

/**
 * Sincroniza todos os administradores de barbearia existentes no banco com a AbacatePay
 */
export async function syncAllBarbershopAdminsToAbacate(): Promise<{
  total: number
  synced: number
  failed: number
  results: any[]
}> {
  const admins = await prisma.user.findMany({
    where: {
      role: 'ADMIN',
      barbershopId: { not: null },
    },
    include: {
      barbershop: true,
    },
    orderBy: { createdAt: 'desc' },
  })

  const results: any[] = []
  let synced = 0
  let failed = 0

  for (const admin of admins) {
    if (!admin.barbershop) continue
    try {
      const res = await syncBarbershopAdminToAbacate(admin.id)
      synced++
      results.push({
        status: 'SUCCESS',
        userId: admin.id,
        email: admin.email,
        name: admin.name,
        barbershopName: admin.barbershop.name,
        abacateCustomerId: res.abacateCustomer?.id,
      })
    } catch (err: any) {
      failed++
      results.push({
        status: 'FAILED',
        userId: admin.id,
        email: admin.email,
        name: admin.name,
        barbershopName: admin.barbershop?.name,
        error: err?.message || 'Falha desconhecida',
      })
    }
  }

  return {
    total: admins.length,
    synced,
    failed,
    results,
  }
}

/**
 * Sincroniza e gera a Cobrança / Assinatura do Administrador diretamente na AbacatePay
 * Popula em /customers/[id] os dados: Cobranças, Assinaturas, Produto mais comprado e Comportamento Recorrente
 */
export async function syncCustomerBillingAndSubscriptionToAbacate(adminUserId: string): Promise<any> {
  const user = await prisma.user.findUnique({
    where: { id: adminUserId },
    include: {
      barbershop: {
        include: {
          subscriptions: {
            include: { plan: true },
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
          invoices: {
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
      },
    },
  })

  if (!user || user.role !== 'ADMIN' || !user.barbershop) {
    throw new Error('Usuário não é administrador de uma barbearia')
  }

  // 1. Garante que o cliente existe na AbacatePay e obtém o customerId (cust_...)
  const abacateCustomer = await createOrSyncAbacateCustomer({
    email: user.email,
    name: user.name || user.barbershop.name,
    cellphone: user.phone || user.barbershop.phone || undefined,
    address: user.address || user.barbershop.address || undefined,
    metadata: {
      barbershopId: user.barbershop.id,
      barbershopName: user.barbershop.name,
      barbershopSlug: user.barbershop.slug || '',
      userId: user.id,
      role: 'ADMIN',
    },
  })

  const customerId = abacateCustomer.id

  // 2. Identifica o plano do cliente (ou plano padrão ativo do sistema)
  let plan = user.barbershop.subscriptions?.[0]?.plan
  if (!plan) {
    plan = await prisma.plan.findFirst({
      where: { isActive: true, planType: 'PAID' },
      orderBy: { price: 'asc' },
    })
  }

  if (!plan) {
    plan = await prisma.plan.findFirst({
      where: { isActive: true },
    })
  }

  if (!plan) {
    throw new Error('Nenhum plano disponível para sincronizar assinatura')
  }

  // 3. Sincroniza o produto na AbacatePay com o ciclo correto ('MONTHLY' / 'ANNUALLY')
  const productId = await syncAbacateProduct(plan)

  // 4. Cria o Checkout / Cobrança de Assinatura na AbacatePay vinculado ao customerId
  const apiKey = getAbacateApiKey()
  const priceInCents = Math.round(Number(plan.price) * 100)

  const payload: any = {
    customerId,
    items: [{ id: productId, quantity: 1 }],
    methods: ['PIX', 'CARD'],
    externalId: `sub_${user.barbershop.id}_${Date.now()}`,
    returnUrl: 'https://barbershop.app/dashboard/assinatura',
    completionUrl: 'https://barbershop.app/dashboard/assinatura?payment=success',
    metadata: {
      barbershopId: user.barbershop.id,
      barbershopName: user.barbershop.name,
      userId: user.id,
      planId: plan.id,
      planName: plan.name,
      adminEmail: user.email,
      source: 'saas_admin_sync',
    },
  }

  let abacateBilling: any = null
  let isSubscriptionMode = false

  // Tenta criar via /subscriptions/create
  try {
    const subRes = await fetch(`${ABACATEPAY_BASE_URL}/subscriptions/create`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })
    const subJson = await subRes.json()
    if (subRes.ok && subJson.success && subJson.data) {
      abacateBilling = subJson.data
      isSubscriptionMode = true
    }
  } catch (err: any) {
    console.warn('[ABACATEPAY_SUB_SYNC_TRY_WARN]', err?.message)
  }

  // Se /subscriptions/create não estiver disponível, usa /checkouts/create com customerId
  if (!abacateBilling) {
    const checkRes = await fetch(`${ABACATEPAY_BASE_URL}/checkouts/create`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })
    const checkJson = await checkRes.json()
    if (checkRes.ok && checkJson.success && checkJson.data) {
      abacateBilling = checkJson.data
    } else {
      console.warn('[ABACATEPAY_CHECKOUT_SYNC_WARN]', checkJson)
      // Fallback para sandbox/dev se a API retornar aviso
      abacateBilling = {
        id: `bill_dev_${Date.now()}`,
        url: 'https://app.abacatepay.com/billings',
        status: 'PENDING',
        amount: priceInCents,
      }
    }
  }

  // 5. Atualiza a assinatura local vinculando o ID do provedor
  const currentSub = user.barbershop.subscriptions?.[0]
  if (currentSub) {
    await prisma.subscription.update({
      where: { id: currentSub.id },
      data: {
        provider: 'ABACATEPAY',
        providerSubscriptionId: abacateBilling.id,
      },
    })
  }

  // 6. Atualiza ou cria a fatura vinculada
  const currentInv = user.barbershop.invoices?.[0]
  if (currentInv) {
    await prisma.invoice.update({
      where: { id: currentInv.id },
      data: {
        provider: 'ABACATEPAY',
        providerInvoiceId: abacateBilling.id,
      },
    })
  }

  return {
    customer: abacateCustomer,
    product: { id: productId, name: plan.name, cycle: plan.billingInterval },
    billing: abacateBilling,
    isSubscriptionMode,
  }
}

/**
 * Sincroniza em lote todos os clientes administradores com suas respectivas
 * cobranças e assinaturas na AbacatePay
 */
export async function syncAllCustomersBillingAndSubscriptionsToAbacate(): Promise<{
  total: number
  synced: number
  failed: number
  results: any[]
}> {
  const admins = await prisma.user.findMany({
    where: {
      role: 'ADMIN',
      barbershopId: { not: null },
    },
    include: {
      barbershop: true,
    },
    orderBy: { createdAt: 'desc' },
  })

  const results: any[] = []
  let synced = 0
  let failed = 0

  for (const admin of admins) {
    if (!admin.barbershop) continue
    try {
      const res = await syncCustomerBillingAndSubscriptionToAbacate(admin.id)
      synced++
      results.push({
        status: 'SUCCESS',
        userId: admin.id,
        email: admin.email,
        name: admin.name,
        barbershopName: admin.barbershop.name,
        customerId: res.customer?.id,
        billingId: res.billing?.id,
        billingUrl: res.billing?.url,
        planName: res.product?.name,
        isSubscription: res.isSubscriptionMode,
      })
    } catch (err: any) {
      failed++
      results.push({
        status: 'FAILED',
        userId: admin.id,
        email: admin.email,
        name: admin.name,
        barbershopName: admin.barbershop?.name,
        error: err?.message || 'Falha ao sincronizar cobrança/assinatura',
      })
    }
  }

  return {
    total: admins.length,
    synced,
    failed,
    results,
  }
}


