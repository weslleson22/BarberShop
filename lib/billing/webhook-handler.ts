import { prisma } from '@/lib/prisma'
import { Prisma, SubscriptionStatus } from '@prisma/client'
import { verifyStripeWebhookSignature } from './stripe-provider'
import { verifyAbacateWebhook, getAbacateWebhookSecret } from './abacatepay-provider'
import { transitionSubscriptionStatus, calculatePeriodEnd } from './saas-billing'

export interface WebhookHandlerOptions {
  rawBody: string
  signatureHeader?: string | null
  secret?: string
  provider?: 'STRIPE' | 'ABACATEPAY' | 'MERCADOPAGO' | 'ASAAS'
  secretQuery?: string | null
  toleranceInSeconds?: number
  txClient?: any
}

export interface WebhookHandlerResult {
  success: boolean
  statusCode: number
  eventId?: string
  eventType?: string
  duplicated?: boolean
  action?: string
  error?: string
  message?: string
}

/**
 * Processador central de Webhooks de Billing com:
 * 1. Validação Criptográfica de Assinatura (HMAC-SHA256) e segredo de URL
 * 2. Suporte unificado para AbacatePay v2 e Stripe
 * 3. Idempotência estrita (deduplicação por eventId)
 * 4. Transição atômica de estados da assinatura SaaS e ativação do Tenant
 * 5. Registro de auditoria em SubscriptionEvent e faturas automáticas
 */
export async function processBillingWebhook(
  options: WebhookHandlerOptions
): Promise<WebhookHandlerResult> {
  const {
    rawBody,
    signatureHeader,
    secret,
    secretQuery,
    toleranceInSeconds = 300,
    txClient = prisma,
  } = options

  // Detecta o provedor automaticamente se não informado explicitamente
  let provider = options.provider
  if (!provider) {
    if (signatureHeader && signatureHeader.includes('t=') && signatureHeader.includes('v1=')) {
      provider = 'STRIPE'
    } else if (secretQuery || (signatureHeader && !signatureHeader.includes('t='))) {
      provider = 'ABACATEPAY'
    } else {
      provider = 'STRIPE'
    }
  }

  // 1. Validação de segurança de acordo com o provedor
  if (provider === 'ABACATEPAY') {
    const verification = verifyAbacateWebhook({
      rawBody,
      signatureHeader,
      secretQuery,
      expectedSecret: secret || getAbacateWebhookSecret(),
    })

    if (!verification.valid) {
      console.warn(`[ABACATEPAY_WEBHOOK_REJECTED] Autenticação inválida: ${verification.reason}`)
      return {
        success: false,
        statusCode: 400,
        error: `Assinatura ou segredo do webhook inválido: ${verification.reason}`,
      }
    }
  } else if (provider === 'STRIPE') {
    const stripeSecret = secret || process.env.STRIPE_WEBHOOK_SECRET || ''
    const verification = verifyStripeWebhookSignature({
      payload: rawBody,
      signatureHeader: signatureHeader || '',
      secret: stripeSecret,
      toleranceInSeconds,
    })

    if (!verification.valid) {
      console.warn(`[STRIPE_WEBHOOK_REJECTED] Assinatura inválida: ${verification.reason}`)
      return {
        success: false,
        statusCode: 400,
        error: `Assinatura do webhook inválida: ${verification.reason}`,
      }
    }
  }

  // 2. Parser do payload do provedor
  let event: any
  try {
    event = JSON.parse(rawBody)
  } catch {
    return {
      success: false,
      statusCode: 400,
      error: 'Formato JSON inválido no corpo do webhook',
    }
  }

  // AbacatePay utiliza "id" e "event"; Stripe utiliza "id" e "type"
  const eventId: string = event.id
  const eventType: string = event.event || event.type
  const eventData: any = event.data?.object || event.data

  if (!eventId || !eventType) {
    return {
      success: false,
      statusCode: 400,
      error: 'Payload do evento incompleto (id ou type ausente)',
    }
  }

  // 3. Verificação de IDEMPOTÊNCIA baseada no eventId único do provider
  const alreadyProcessed = await txClient.processedWebhook.findUnique({
    where: { eventId },
  })

  if (alreadyProcessed) {
    console.info(`[BILLING_WEBHOOK_IDEMPOTENT] Evento ${eventId} já processado anteriormente em ${alreadyProcessed.processedAt.toISOString()}`)
    return {
      success: true,
      statusCode: 200,
      eventId,
      eventType,
      duplicated: true,
      message: 'Evento já processado anteriormente com sucesso (Idempotência garantida)',
      action: 'IGNORED_DUPLICATE',
    }
  }

  // 4. Execução atômica dentro de transação do banco de dados
  return await txClient.$transaction(async (tx: any) => {
    // Registra imediatamente o evento na tabela de idempotência para bloquear concorrência
    await tx.processedWebhook.create({
      data: {
        provider,
        eventId,
        eventType,
        payload: event as Prisma.InputJsonValue,
        status: 'PROCESSED',
      },
    })

    let actionTaken = 'UNHANDLED_EVENT'

    // ==============================================================
    // EVENTO 1: checkout.completed / transparent.completed / checkout.session.completed
    // Pagamento confirmado via Checkout Hospedado ou PIX Transparente
    // ==============================================================
    if (
      eventType === 'checkout.completed' ||
      eventType === 'transparent.completed' ||
      eventType === 'checkout.session.completed' ||
      eventType === 'billing.paid' ||
      eventType === 'charge.paid' ||
      eventType === 'payment.success'
    ) {
      let barbershopId =
        eventData.metadata?.barbershopId ||
        eventData.client_reference_id ||
        eventData.externalId ||
        eventData.customer?.metadata?.barbershopId

      // Fallback: se barbershopId não veio no metadata, busca por fatura existente pelo providerInvoiceId
      if (!barbershopId && eventData.id) {
        const existingInv = await tx.invoice.findFirst({
          where: { providerInvoiceId: eventData.id },
          select: { barbershopId: true },
        })
        if (existingInv) {
          barbershopId = existingInv.barbershopId
        }
      }

      const planId = eventData.metadata?.planId
      const providerSubscriptionId = eventData.subscription || eventData.id || null
      const providerCustomerId = eventData.customer || eventData.customerId || null

      const rawAmount = eventData.amount_total ?? eventData.amount ?? 0
      const amountPaid = new Prisma.Decimal(rawAmount).dividedBy(100)

      if (barbershopId) {
        // Localiza a assinatura atual da barbearia
        let subscription = await tx.subscription.findFirst({
          where: { barbershopId },
          orderBy: { createdAt: 'desc' },
          include: { plan: true },
        })

        const targetPlanId = planId || subscription?.planId
        let plan: any = null
        if (targetPlanId) {
          plan = await tx.plan.findUnique({ where: { id: targetPlanId } })
        }

        const now = new Date()
        const periodEnd = plan
          ? calculatePeriodEnd(now, plan.billingInterval, plan.cycleType, plan.durationDays)
          : new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

        if (subscription) {
          const updateData: any = {
            provider,
            providerSubscriptionId: providerSubscriptionId || subscription.providerSubscriptionId,
            providerCustomerId: providerCustomerId || subscription.providerCustomerId,
            cancelAtPeriodEnd: false,
            canceledAt: null,
            status: 'ACTIVE',
            currentPeriodStart: now,
            currentPeriodEnd: periodEnd,
            price: plan ? plan.price : subscription.price,
          }

          if (planId && planId !== subscription.planId) {
            updateData.planId = planId
            if (plan) {
              updateData.planName = plan.name
              updateData.cycleType = plan.cycleType
              updateData.planType = plan.planType
              updateData.durationDays = plan.durationDays
            }
          }

          subscription = await tx.subscription.update({
            where: { id: subscription.id },
            data: updateData,
          })
        } else if (plan) {
          // Cria assinatura caso ainda não exista
          subscription = await tx.subscription.create({
            data: {
              barbershopId,
              planId: plan.id,
              status: 'ACTIVE',
              currentPeriodStart: now,
              currentPeriodEnd: periodEnd,
              price: plan.price,
              durationDays: plan.durationDays,
              planName: plan.name,
              cycleType: plan.cycleType,
              planType: plan.planType,
              provider,
              providerSubscriptionId,
              providerCustomerId,
            },
          })
        } else {
          // Fallback de resiliência: se nenhum plano veio especificado, busca o primeiro plano ativo do catálogo
          const fallbackPlan = await tx.plan.findFirst({
            where: { isActive: true },
            orderBy: { price: 'asc' },
          })
          if (fallbackPlan) {
            subscription = await tx.subscription.create({
              data: {
                barbershopId,
                planId: fallbackPlan.id,
                status: 'ACTIVE',
                currentPeriodStart: now,
                currentPeriodEnd: periodEnd,
                price: fallbackPlan.price,
                durationDays: fallbackPlan.durationDays,
                planName: fallbackPlan.name,
                cycleType: fallbackPlan.cycleType,
                planType: fallbackPlan.planType,
                provider,
                providerSubscriptionId,
                providerCustomerId,
              },
            })
          }
        }

        if (subscription) {
          // Registra ou atualiza fatura com status PAID e link do comprovante
          const providerInvoiceId =
            eventData.receiptUrl ||
            eventData.url ||
            (eventData.id ? `https://app.abacatepay.com/pay/${eventData.id}` : null) ||
            `inv_${Date.now()}`
          let invoice = await tx.invoice.findFirst({
            where: {
              OR: [
                { providerInvoiceId },
                ...(eventData.id ? [{ providerInvoiceId: eventData.id }] : []),
                { subscriptionId: subscription.id, status: 'OPEN' },
              ],
            },
          })

          const finalAmount = amountPaid.isZero() && plan ? plan.price : amountPaid

          if (!invoice) {
            invoice = await tx.invoice.create({
              data: {
                subscriptionId: subscription.id,
                barbershopId,
                amount: finalAmount,
                currency: (eventData.currency || 'BRL').toUpperCase(),
                status: 'PAID',
                dueDate: now,
                paidAt: now,
                provider,
                providerInvoiceId,
              },
            })
          } else {
            invoice = await tx.invoice.update({
              where: { id: invoice.id },
              data: {
                status: 'PAID',
                paidAt: now,
                amount: finalAmount,
              },
            })
          }

          // Atualiza status operacional da Barbearia para APPROVED e estende contrato
          try {
            const shop = await tx.barbershop.findUnique({ where: { id: barbershopId } })
            if (shop) {
              await tx.barbershop.update({
                where: { id: barbershopId },
                data: {
                  isActive: true,
                  status: 'APPROVED',
                  contractExpiresAt: periodEnd,
                },
              })
            }
          } catch {
            // Em testes ou ambientes sem barbershop mockado
          }

          // Evento de auditoria: Assinatura ativada / renovada
          await tx.subscriptionEvent.create({
            data: {
              subscriptionId: subscription.id,
              type: 'SUBSCRIPTION_ACTIVATED',
              payload: {
                eventId,
                provider,
                providerSubscriptionId,
                providerCustomerId,
                activatedVia: eventType,
                invoiceId: invoice.id,
                amount: finalAmount.toString(),
                previousStatus: subscription.status,
                activatedAt: now.toISOString(),
                currentPeriodEnd: periodEnd.toISOString(),
              } as Prisma.InputJsonValue,
            },
          })

          actionTaken = `SUBSCRIPTION_ACTIVATED:${subscription.id}`
        }
      }
    }

    // ==============================================================
    // EVENTO 2: invoice.paid / invoice.payment_succeeded / subscription.renewed
    // Fatura recorrente paga
    // ==============================================================
    else if (
      eventType === 'invoice.paid' ||
      eventType === 'invoice.payment_succeeded' ||
      eventType === 'subscription.renewed'
    ) {
      const providerInvoiceId = eventData.id
      const providerSubscriptionId = eventData.subscription || eventData.subscriptionId
      const providerCustomerId = eventData.customer || eventData.customerId
      const amountPaid = eventData.amount_paid ?? eventData.amount
        ? new Prisma.Decimal(eventData.amount_paid ?? eventData.amount).dividedBy(100)
        : new Prisma.Decimal('0.00')
      const currency = (eventData.currency || 'BRL').toUpperCase()
      const periodStart = eventData.period_start ? new Date(eventData.period_start * 1000) : new Date()
      const periodEnd = eventData.period_end
        ? new Date(eventData.period_end * 1000)
        : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)

      let subscription: any = null
      if (providerSubscriptionId) {
        subscription = await tx.subscription.findFirst({
          where: { providerSubscriptionId },
          include: { barbershop: true },
        })
      }
      if (!subscription && providerCustomerId) {
        subscription = await tx.subscription.findFirst({
          where: { providerCustomerId },
          include: { barbershop: true },
        })
      }

      if (subscription) {
        let invoice = await tx.invoice.findFirst({
          where: { providerInvoiceId },
        })

        if (!invoice) {
          invoice = await tx.invoice.create({
            data: {
              subscriptionId: subscription.id,
              barbershopId: subscription.barbershopId,
              amount: amountPaid,
              currency,
              status: 'PAID',
              dueDate: new Date(),
              paidAt: new Date(),
              provider,
              providerInvoiceId,
            },
          })
        } else {
          invoice = await tx.invoice.update({
            where: { id: invoice.id },
            data: {
              status: 'PAID',
              paidAt: new Date(),
              amount: amountPaid,
            },
          })
        }

        await tx.subscription.update({
          where: { id: subscription.id },
          data: {
            status: 'ACTIVE',
            currentPeriodStart: periodStart,
            currentPeriodEnd: periodEnd,
            providerCustomerId: providerCustomerId || subscription.providerCustomerId,
            cancelAtPeriodEnd: false,
          },
        })

        try {
          const shop = await tx.barbershop.findUnique({ where: { id: subscription.barbershopId } })
          if (shop) {
            await tx.barbershop.update({
              where: { id: subscription.barbershopId },
              data: {
                isActive: true,
                status: 'APPROVED',
                contractExpiresAt: periodEnd,
              },
            })
          }
        } catch {
          // Ignora se barbershop não encontrado ou não mockado
        }

        await tx.subscriptionEvent.create({
          data: {
            subscriptionId: subscription.id,
            type: 'PAYMENT_SUCCEEDED',
            payload: {
              eventId,
              providerInvoiceId,
              amount: amountPaid.toString(),
              currency,
              periodEnd: periodEnd.toISOString(),
              paidAt: new Date().toISOString(),
            } as Prisma.InputJsonValue,
          },
        })

        actionTaken = `INVOICE_PAID:${invoice.id}`
      }
    }

    // ==============================================================
    // EVENTO 3: checkout.refunded / transparent.refunded
    // Reembolso de pagamento
    // ==============================================================
    else if (
      eventType === 'checkout.refunded' ||
      eventType === 'transparent.refunded' ||
      eventType === 'billing.refunded' ||
      eventType === 'charge.refunded'
    ) {
      const providerInvoiceId = eventData.id
      const invoice = await tx.invoice.findFirst({
        where: { providerInvoiceId },
        include: { subscription: true },
      })

      if (invoice) {
        await tx.invoice.update({
          where: { id: invoice.id },
          data: { status: 'VOID' },
        })

        const subId = invoice.subscription?.id || invoice.subscriptionId
        if (subId) {
          await tx.subscription.update({
            where: { id: subId },
            data: { status: 'SUSPENDED' },
          })

          await tx.subscriptionEvent.create({
            data: {
              subscriptionId: subId,
              type: 'SUBSCRIPTION_SUSPENDED',
              payload: {
                eventId,
                providerInvoiceId,
                reason: 'Pagamento reembolsado via AbacatePay',
                refundedAt: new Date().toISOString(),
              } as Prisma.InputJsonValue,
            },
          })
        }

        actionTaken = `PAYMENT_REFUNDED:${invoice.id}`
      }
    }

    // ==============================================================
    // EVENTO 4: invoice.payment_failed (Falha de pagamento)
    // ==============================================================
    else if (
      eventType === 'invoice.payment_failed' ||
      eventType === 'billing.failed' ||
      eventType === 'charge.failed' ||
      eventType === 'payment.failed'
    ) {
      const providerInvoiceId = eventData.id
      const providerSubscriptionId = eventData.subscription
      const attemptCount = eventData.attempt_count ?? 1
      const nextPaymentAttempt = eventData.next_payment_attempt
      const amountDue = eventData.amount_due
        ? new Prisma.Decimal(eventData.amount_due).dividedBy(100)
        : new Prisma.Decimal('0.00')

      let subscription: any = null
      if (providerSubscriptionId) {
        subscription = await tx.subscription.findFirst({
          where: { providerSubscriptionId },
        })
      }

      if (subscription) {
        let invoice = await tx.invoice.findFirst({
          where: { providerInvoiceId },
        })

        if (!invoice) {
          invoice = await tx.invoice.create({
            data: {
              subscriptionId: subscription.id,
              barbershopId: subscription.barbershopId,
              amount: amountDue,
              currency: (eventData.currency || 'BRL').toUpperCase(),
              status: 'FAILED',
              dueDate: new Date(),
              provider,
              providerInvoiceId,
            },
          })
        } else {
          invoice = await tx.invoice.update({
            where: { id: invoice.id },
            data: { status: 'FAILED' },
          })
        }

        const isExhausted = !nextPaymentAttempt || attemptCount >= 3
        const targetStatus: SubscriptionStatus = isExhausted ? 'SUSPENDED' : 'PAST_DUE'

        if (subscription.status !== targetStatus) {
          await tx.subscription.update({
            where: { id: subscription.id },
            data: { status: targetStatus, updatedAt: new Date() },
          })
        }

        await tx.subscriptionEvent.create({
          data: {
            subscriptionId: subscription.id,
            type: isExhausted ? 'SUBSCRIPTION_SUSPENDED' : 'PAYMENT_FAILED',
            payload: {
              eventId,
              providerInvoiceId,
              attemptCount,
              failedAt: new Date().toISOString(),
              targetStatus,
            } as Prisma.InputJsonValue,
          },
        })

        actionTaken = `PAYMENT_FAILED:${targetStatus}`
      }
    }

    // ==============================================================
    // EVENTO 5: customer.subscription.deleted / subscription.cancelled
    // Cancelamento de assinatura
    // ==============================================================
    else if (
      eventType === 'customer.subscription.deleted' ||
      eventType === 'subscription.cancelled'
    ) {
      const providerSubscriptionId = eventData.id || eventData.subscriptionId

      const subscription = await tx.subscription.findFirst({
        where: { providerSubscriptionId },
      })

      if (subscription && subscription.status !== 'CANCELED') {
        try {
          await transitionSubscriptionStatus(
            subscription.id,
            'CANCELED',
            'Cancelamento recebido via webhook do provedor',
            tx
          )
        } catch {
          await tx.subscription.update({
            where: { id: subscription.id },
            data: {
              status: 'CANCELED',
              canceledAt: new Date(),
            },
          })
        }

        actionTaken = `SUBSCRIPTION_CANCELED:${subscription.id}`
      }
    }

    // ==============================================================
    // EVENTO 6: customer.subscription.updated (Atualização de ciclo)
    // ==============================================================
    else if (eventType === 'customer.subscription.updated') {
      const providerSubscriptionId = eventData.id
      const cancelAtPeriodEnd = Boolean(eventData.cancel_at_period_end)
      const currentPeriodEnd = eventData.current_period_end
        ? new Date(eventData.current_period_end * 1000)
        : null

      const subscription = await tx.subscription.findFirst({
        where: { providerSubscriptionId },
      })

      if (subscription) {
        const updateData: any = {
          cancelAtPeriodEnd,
        }
        if (currentPeriodEnd) {
          updateData.currentPeriodEnd = currentPeriodEnd
        }

        await tx.subscription.update({
          where: { id: subscription.id },
          data: updateData,
        })

        actionTaken = `SUBSCRIPTION_UPDATED:${subscription.id}`
      }
    }

    return {
      success: true,
      statusCode: 200,
      eventId,
      eventType,
      duplicated: false,
      action: actionTaken,
      message: 'Webhook processado com sucesso',
    }
  })
}
