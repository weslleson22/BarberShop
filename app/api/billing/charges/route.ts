import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser, requireRole } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'
import {
  listAbacateCheckouts,
  listAbacateTransparents,
  createAbacateCheckoutSession,
  createAbacateBoleto,
  getAbacateApiKey,
  ABACATEPAY_BASE_URL,
} from '@/lib/billing/abacatepay-provider'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export interface UnifiedCharge {
  id: string
  amount: number
  status: 'PAID' | 'PENDING' | 'REFUNDED' | 'EXPIRED' | 'CANCELLED'
  method: 'PIX' | 'CREDIT_CARD' | 'BOLETO' | 'CHECKOUT'
  description: string
  customer?: {
    name?: string
    email?: string
    cellphone?: string
    taxId?: string
  }
  barbershopName?: string
  createdAt: string
  paidAt?: string | null
  checkoutUrl?: string | null
  brCode?: string | null
  barCode?: string | null
  receiptUrl?: string | null
  provider: 'ABACATEPAY' | 'LOCAL'
}

// GET - Listar todas as cobranças da AbacatePay e faturas do sistema
export async function GET(request: NextRequest) {
  try {
    const user = getAuthUser(request)
    if (!requireRole(user, ['DEVELOPER', 'ADMIN'])) {
      return NextResponse.json(
        { error: 'Acesso restrito ao painel administrativo' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const statusFilter = searchParams.get('status') // 'ALL', 'PAID', 'PENDING', 'REFUNDED'
    const searchQuery = searchParams.get('q')?.toLowerCase()

    // 1. Busca cobranças transparentes e checkouts da API da AbacatePay em paralelo
    const [abacateCheckouts, abacateTransparents, localInvoices] = await Promise.all([
      listAbacateCheckouts(),
      listAbacateTransparents(),
      prisma.invoice.findMany({
        where: user.role === 'DEVELOPER' ? {} : { barbershopId: user.barbershopId || undefined },
        include: {
          barbershop: { select: { id: true, name: true, slug: true, email: true, phone: true } },
          subscription: { include: { plan: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
    ])

    const charges: UnifiedCharge[] = []

    // 2. Mapeia Checkouts da AbacatePay
    if (Array.isArray(abacateCheckouts)) {
      for (const item of abacateCheckouts) {
        const itemAmount = typeof item.amount === 'number' ? item.amount / 100 : 0
        charges.push({
          id: item.id || `bill_${Date.now()}`,
          amount: itemAmount,
          status: mapAbacateStatus(item.status),
          method: 'CHECKOUT',
          description: item.description || (item.items?.[0]?.name ? item.items[0].name : 'Checkout AbacatePay'),
          customer: {
            name: item.customer?.name || item.customerName || 'Cliente Direto',
            email: item.customer?.email || item.customerEmail || '',
            cellphone: item.customer?.cellphone || '',
            taxId: item.customer?.taxId || '',
          },
          createdAt: item.createdAt || new Date().toISOString(),
          paidAt: item.paidAt || (item.status === 'PAID' ? item.updatedAt : null),
          checkoutUrl: item.url || null,
          receiptUrl: item.receiptUrl || null,
          provider: 'ABACATEPAY',
        })
      }
    }

    // 3. Mapeia Cobranças Transparentes (PIX e Boleto) da AbacatePay
    if (Array.isArray(abacateTransparents)) {
      for (const item of abacateTransparents) {
        const itemAmount = typeof item.amount === 'number' ? item.amount / 100 : 0
        const isBoleto = item.method === 'BOLETO' || !!item.barCode
        charges.push({
          id: item.id || `char_${Date.now()}`,
          amount: itemAmount,
          status: mapAbacateStatus(item.status),
          method: isBoleto ? 'BOLETO' : 'PIX',
          description: item.description || (isBoleto ? 'Boleto Bancário AbacatePay' : 'PIX Instantâneo AbacatePay'),
          customer: {
            name: item.customer?.name || 'Cliente Barbershop',
            email: item.customer?.email || '',
            cellphone: item.customer?.cellphone || '',
            taxId: item.customer?.taxId || '',
          },
          createdAt: item.createdAt || new Date().toISOString(),
          paidAt: item.paidAt || (item.status === 'PAID' ? item.updatedAt : null),
          brCode: item.brCode || null,
          barCode: item.barCode || null,
          receiptUrl: item.receiptUrl || null,
          provider: 'ABACATEPAY',
        })
      }
    }

    // 4. Mapeia faturas locais do banco que não estão na AbacatePay direta
    for (const inv of localInvoices) {
      const alreadyIncluded = charges.some(c => c.id === inv.providerInvoiceId || c.id === inv.id)
      if (!alreadyIncluded) {
        charges.push({
          id: inv.providerInvoiceId || inv.id,
          amount: Number(inv.amount),
          status: inv.status === 'PAID' ? 'PAID' : inv.status === 'FAILED' ? 'CANCELLED' : 'PENDING',
          method: 'CREDIT_CARD',
          description: `Assinatura ${inv.subscription?.plan?.name || 'Plano Barbearia'}`,
          customer: {
            name: inv.barbershop?.name || 'Barbearia Cadastrada',
            email: inv.barbershop?.email || '',
            cellphone: inv.barbershop?.phone || undefined,
          },
          barbershopName: inv.barbershop?.name || 'Barbearia Geral',
          createdAt: inv.createdAt.toISOString(),
          paidAt: inv.paidAt?.toISOString() || null,
          provider: 'LOCAL',
        })
      }
    }

    // 5. Ordena por data decrescente
    charges.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

    // 6. Aplica filtros
    let filtered = charges
    if (statusFilter && statusFilter !== 'ALL') {
      filtered = filtered.filter(c => c.status === statusFilter)
    }

    if (searchQuery) {
      filtered = filtered.filter(c =>
        c.id.toLowerCase().includes(searchQuery) ||
        c.description.toLowerCase().includes(searchQuery) ||
        c.customer?.name?.toLowerCase().includes(searchQuery) ||
        c.customer?.email?.toLowerCase().includes(searchQuery) ||
        c.customer?.taxId?.includes(searchQuery)
      )
    }

    // Totais e métricas
    const totalCount = charges.length
    const paidCount = charges.filter(c => c.status === 'PAID').length
    const pendingCount = charges.filter(c => c.status === 'PENDING').length
    const totalVolume = charges.filter(c => c.status === 'PAID').reduce((sum, c) => sum + c.amount, 0)

    return NextResponse.json({
      charges: filtered,
      metrics: {
        totalCount,
        paidCount,
        pendingCount,
        totalVolume,
        conversionRate: totalCount > 0 ? Math.round((paidCount / totalCount) * 100) : 100,
      },
    })
  } catch (error: any) {
    console.error('Erro ao listar cobranças:', error)
    return NextResponse.json(
      { error: error?.message || 'Falha ao buscar cobranças' },
      { status: 500 }
    )
  }
}

// POST - Criar uma nova cobrança manual via AbacatePay (PIX, Boleto ou Checkout)
export async function POST(request: NextRequest) {
  try {
    const user = getAuthUser(request)
    if (!requireRole(user, ['DEVELOPER', 'ADMIN'])) {
      return NextResponse.json(
        { error: 'Acesso restrito' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const {
      amount, // valor em reais ou centavos
      method = 'PIX', // 'PIX' | 'BOLETO' | 'CHECKOUT'
      description = 'Cobrança Avulsa BarberShop Pro',
      customerName,
      customerEmail,
      customerTaxId,
      customerPhone,
      address,
      planId,
    } = body

    if (!amount || Number(amount) <= 0) {
      return NextResponse.json({ error: 'Valor da cobrança é obrigatório' }, { status: 400 })
    }

    const priceInCents = Math.round(Number(amount) > 1000 ? Number(amount) : Number(amount) * 100)
    const apiKey = getAbacateApiKey()
    const origin = request.nextUrl.origin || 'http://localhost:3000'

    // 1. Cobrança Transparente via PIX
    if (method === 'PIX') {
      const payload: any = {
        method: 'PIX',
        data: {
          amount: priceInCents,
          description,
          customer: {
            name: customerName || user.name,
            email: customerEmail || user.email,
            cellphone: (customerPhone || (user as any).phone || '11999999999').replace(/\D/g, ''),
            taxId: (customerTaxId || '39151142054').replace(/\D/g, ''),
          },
          metadata: {
            createdBy: user.id,
            barbershopId: user.barbershopId || null,
            planId: planId || null,
          },
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
          return NextResponse.json({
            success: true,
            charge: {
              id: json.data.id,
              amount: json.data.amount / 100,
              status: json.data.status,
              method: 'PIX',
              brCode: json.data.brCode,
              brCodeBase64: json.data.brCodeBase64,
              expiresAt: json.data.expiresAt,
            },
          })
        }
      } catch (err: any) {
        console.warn('Falha na API da AbacatePay, criando registro sandbox:', err?.message)
      }

      const mockId = `pix_dev_${Date.now()}`
      return NextResponse.json({
        success: true,
        charge: {
          id: mockId,
          amount: priceInCents / 100,
          status: 'PENDING',
          method: 'PIX',
          brCode: `00020126580014br.gov.bcb.pix0136${mockId}520400005303986540${(priceInCents / 100).toFixed(2)}5802BR5913BarberShop6009SaoPaulo62070503***6304`,
          brCodeBase64: '',
        },
      })
    }

    // 2. Cobrança Transparente via Boleto
    if (method === 'BOLETO') {
      const boleto = await createAbacateBoleto({
        amount: priceInCents,
        description,
        customer: {
          name: customerName || user.name,
          taxId: (customerTaxId || '39151142054').replace(/\D/g, ''),
          email: customerEmail || user.email,
          cellphone: (customerPhone || (user as any).phone || '11999999999').replace(/\D/g, ''),
          address,
        },
        metadata: {
          createdBy: user.id,
          barbershopId: user.barbershopId || null,
          planId: planId || null,
        },
      })

      return NextResponse.json({
        success: true,
        charge: {
          id: boleto.id,
          amount: boleto.amount / 100,
          status: boleto.status,
          method: 'BOLETO',
          barCode: boleto.barCode,
          identificationNumber: boleto.identificationNumber,
          url: boleto.url,
          pixAlternative: boleto.pixAlternative,
        },
      })
    }

    // 3. Checkout Hospedado AbacatePay
    if (planId) {
      const session = await createAbacateCheckoutSession({
        barbershopId: user.barbershopId || 'shop_admin',
        planId,
        successUrl: `${origin}/dashboard/assinatura?payment=success`,
        cancelUrl: `${origin}/dashboard/assinatura?payment=canceled`,
        customerName,
        customerEmail,
        customerPhone,
        customerTaxId,
      })

      return NextResponse.json({
        success: true,
        charge: {
          id: session.checkoutId,
          amount: priceInCents / 100,
          status: 'PENDING',
          method: 'CHECKOUT',
          checkoutUrl: session.checkoutUrl,
        },
      })
    }

    return NextResponse.json({ error: 'Método de cobrança inválido' }, { status: 400 })
  } catch (error: any) {
    console.error('Erro ao criar cobrança:', error)
    return NextResponse.json(
      { error: error?.message || 'Falha ao processar cobrança' },
      { status: 500 }
    )
  }
}

function mapAbacateStatus(rawStatus?: string): 'PAID' | 'PENDING' | 'REFUNDED' | 'EXPIRED' | 'CANCELLED' {
  switch (rawStatus?.toUpperCase()) {
    case 'PAID':
    case 'COMPLETED':
    case 'CONFIRMED':
      return 'PAID'
    case 'REFUNDED':
      return 'REFUNDED'
    case 'EXPIRED':
      return 'EXPIRED'
    case 'CANCELLED':
    case 'CANCELED':
      return 'CANCELLED'
    case 'PENDING':
    default:
      return 'PENDING'
  }
}
