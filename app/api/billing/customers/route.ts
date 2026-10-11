import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthUser, requireRole } from '@/lib/api-auth'
import {
  listAbacateCustomers,
  createOrSyncAbacateCustomer,
  syncBarbershopAdminToAbacate,
  syncAllBarbershopAdminsToAbacate,
  syncCustomerBillingAndSubscriptionToAbacate,
  syncAllCustomersBillingAndSubscriptionsToAbacate,
} from '@/lib/billing/abacatepay-provider'

export const dynamic = 'force-dynamic'
export const revalidate = 0

// GET - Listar clientes da AbacatePay e comparar com os Admins de barbearias do sistema (incluindo assinaturas e cobranças)
export async function GET(request: NextRequest) {
  try {
    const user = getAuthUser(request)
    if (!requireRole(user, ['DEVELOPER'])) {
      return NextResponse.json(
        { error: 'Acesso restrito ao desenvolvedor da plataforma' },
        { status: 403 }
      )
    }

    // 1. Busca todos os clientes cadastrados diretamente na AbacatePay
    const abacateCustomers = await listAbacateCustomers()

    // 2. Busca todos os usuários administradores de barbearias com dados de assinatura e faturas
    const localAdmins = await prisma.user.findMany({
      where: {
        role: 'ADMIN',
        barbershopId: { not: null },
      },
      include: {
        barbershop: {
          select: {
            id: true,
            name: true,
            slug: true,
            email: true,
            phone: true,
            address: true,
            isActive: true,
            status: true,
            createdAt: true,
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
      orderBy: { createdAt: 'desc' },
    })

    // 3. Cruza dados para identificar quem já está sincronizado
    const mappedAdmins = localAdmins.map((admin) => {
      const adminEmail = (admin.email || '').toLowerCase().trim()
      const matchingCustomer = abacateCustomers.find((c: any) => {
        const cEmail = (c.email || '').toLowerCase().trim()
        const metaUserId = c.metadata?.userId
        const metaShopId = c.metadata?.barbershopId

        return (
          cEmail === adminEmail ||
          metaUserId === admin.id ||
          (metaShopId && metaShopId === admin.barbershopId)
        )
      })

      const latestSub = admin.barbershop?.subscriptions?.[0] || null
      const latestInv = admin.barbershop?.invoices?.[0] || null

      const hasAbacateBilling = Boolean(
        matchingCustomer &&
          (latestSub?.providerSubscriptionId?.startsWith('bill_') ||
            latestSub?.providerSubscriptionId?.startsWith('sub_') ||
            latestInv?.providerInvoiceId?.startsWith('bill_'))
      )

      return {
        id: admin.id,
        name: admin.name,
        email: admin.email,
        phone: admin.phone || admin.barbershop?.phone || null,
        address: admin.address || admin.barbershop?.address || null,
        role: admin.role,
        isActive: admin.isActive,
        createdAt: admin.createdAt,
        barbershop: admin.barbershop ? {
          id: admin.barbershop.id,
          name: admin.barbershop.name,
          slug: admin.barbershop.slug,
          email: admin.barbershop.email,
          phone: admin.barbershop.phone,
          address: admin.barbershop.address,
          isActive: admin.barbershop.isActive,
          status: admin.barbershop.status,
          createdAt: admin.barbershop.createdAt,
        } : null,
        subscription: latestSub ? {
          id: latestSub.id,
          planName: latestSub.plan?.name || latestSub.planName || 'Sem plano',
          price: Number(latestSub.price || latestSub.plan?.price || 0),
          status: latestSub.status,
          billingInterval: latestSub.plan?.billingInterval || 'MONTHLY',
          provider: latestSub.provider,
          providerSubscriptionId: latestSub.providerSubscriptionId,
          trialEnd: latestSub.trialEnd,
        } : null,
        invoice: latestInv ? {
          id: latestInv.id,
          amount: Number(latestInv.amount),
          status: latestInv.status,
          dueDate: latestInv.dueDate,
          provider: latestInv.provider,
          providerInvoiceId: latestInv.providerInvoiceId,
          hostedInvoiceUrl: latestInv.providerInvoiceId ? 'https://app.abacatepay.com/billings' : null,
        } : null,
        isSynced: !!matchingCustomer,
        abacateCustomerId: matchingCustomer?.id || null,
        abacateCustomer: matchingCustomer || null,
        hasAbacateBilling,
      }
    })

    const syncedCount = mappedAdmins.filter((a) => a.isSynced).length
    const pendingCount = mappedAdmins.length - syncedCount
    const withBillingCount = mappedAdmins.filter((a) => a.hasAbacateBilling).length

    return NextResponse.json({
      success: true,
      summary: {
        totalAdmins: mappedAdmins.length,
        syncedCount,
        pendingCount,
        withBillingCount,
        abacateCustomersCount: abacateCustomers.length,
      },
      admins: mappedAdmins,
      abacateCustomers,
    })
  } catch (error: any) {
    console.error('[API_BILLING_CUSTOMERS_GET_ERROR]', error)
    return NextResponse.json(
      { error: error?.message || 'Erro ao carregar clientes da AbacatePay' },
      { status: 500 }
    )
  }
}

// POST - Sincronizar clientes, cobranças e assinaturas com a AbacatePay
export async function POST(request: NextRequest) {
  try {
    const user = getAuthUser(request)
    if (!requireRole(user, ['DEVELOPER'])) {
      return NextResponse.json(
        { error: 'Acesso restrito ao desenvolvedor da plataforma' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const {
      action,
      userId,
      syncAll,
      syncSubscriptions,
      email,
      name,
      cellphone,
      taxId,
      zipCode,
      address,
      metadata,
    } = body

    // 1. Sincronizar Assinaturas e Cobranças em Lote para Todos os Clientes
    if (action === 'sync-subscriptions' || syncSubscriptions === true) {
      const syncResult = await syncAllCustomersBillingAndSubscriptionsToAbacate()
      return NextResponse.json({
        success: true,
        message: `Sincronização de cobranças e assinaturas concluída! ${syncResult.synced} de ${syncResult.total} sincronizados com sucesso.`,
        ...syncResult,
      })
    }

    // 2. Sincronizar Assinatura e Cobrança de um Administrador Específico
    if (action === 'sync-subscription-one') {
      if (!userId) {
        return NextResponse.json({ error: 'userId é obrigatório para sincronizar assinatura' }, { status: 400 })
      }
      const syncResult = await syncCustomerBillingAndSubscriptionToAbacate(userId)
      return NextResponse.json({
        success: true,
        message: `Assinatura e cobrança do cliente vinculadas com sucesso na AbacatePay!`,
        result: syncResult,
      })
    }

    // 3. Sincronizar todos os perfis de clientes existentes (Backfill de contas antigas)
    if (action === 'sync-all' || syncAll === true) {
      const syncResult = await syncAllBarbershopAdminsToAbacate()
      return NextResponse.json({
        success: true,
        message: `Sincronização de clientes concluída! ${syncResult.synced} de ${syncResult.total} cadastrados na AbacatePay.`,
        ...syncResult,
      })
    }

    // 4. Sincronizar um administrador de barbearia individual por ID
    if (action === 'sync-one' || (userId && !action)) {
      if (!userId) {
        return NextResponse.json({ error: 'userId é obrigatório para sincronização individual' }, { status: 400 })
      }
      const syncResult = await syncBarbershopAdminToAbacate(userId)
      return NextResponse.json({
        success: true,
        message: `Administrador ${syncResult.user.email} sincronizado com sucesso na AbacatePay!`,
        result: syncResult,
      })
    }

    // 5. Criar cliente manualmente na AbacatePay
    if (action === 'create-manual' || email) {
      if (!email) {
        return NextResponse.json({ error: 'E-mail é obrigatório para criar cliente' }, { status: 400 })
      }

      const customer = await createOrSyncAbacateCustomer({
        email,
        name,
        cellphone,
        taxId,
        zipCode,
        address,
        metadata: {
          ...metadata,
          createdManuallyBy: user?.id,
          source: 'developer_manual_creation',
        },
      })

      return NextResponse.json({
        success: true,
        message: 'Cliente cadastrado com sucesso na AbacatePay!',
        customer,
      })
    }

    return NextResponse.json(
      {
        error:
          'Ação inválida. Utilize action: "sync-all", "sync-one", "sync-subscriptions", "sync-subscription-one" ou "create-manual"',
      },
      { status: 400 }
    )
  } catch (error: any) {
    console.error('[API_BILLING_CUSTOMERS_POST_ERROR]', error)
    return NextResponse.json(
      { error: error?.message || 'Erro ao sincronizar clientes na AbacatePay' },
      { status: 500 }
    )
  }
}
