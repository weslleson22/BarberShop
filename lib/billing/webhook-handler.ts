import { prisma } from '@/lib/prisma'
import { Prisma, SubscriptionStatus } from '@prisma/client'
import { verifyStripeWebhookSignature } from './stripe-provider'
import { transitionSubscriptionStatus } from './saas-billing'

export interface WebhookHandlerOptions {
  rawBody: string
  signatureHeader: string
  secret?: string
  provider?: 'STRIPE' | 'MERCADOPAGO' | 'ASAAS'
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
 * 1. Validação Criptográfica de Assinatura (HMAC-SHA256)
 * 2. Proteção contra Replay Attacks (Tolerância de Timestamp)
 * 3. Idempotência estrita (deduplicação por eventId)
 * 4. Transição atômica de estados da assinatura SaaS
 * 5. Registro de auditoria em SubscriptionEvent
 */
export async function processBillingWebhook(
  options: WebhookHandlerOptions
): Promise<WebhookHandlerResult> {
  const {
    rawBody,
    signatureHeader,
    secret = process.env.STRIPE_WEBHOOK_SECRET || '',
    provider = 'STRIPE',
    toleranceInSeconds = 300,
    txClient = prisma,
  } = options

  // 1. Validação criptográfica da assinatura do webhook
  const verification = verifyStripeWebhookSignature({
    payload: rawBody,
    signatureHeader,
    secret,
    toleranceInSeconds,
  })

  if (!verification.valid) {
    console.warn(`[BILLING_WEBHOOK_REJECTED] Assinatura inválida: ${verification.reason}`)
    return {
      success: false,
      statusCode: 400,
      error: `Assinatura do webhook inválida: ${verification.reason}`,
    }
  }

  // 2. Parser do payload do provedor
  let event: any
  try {
    event = JSON.parse(rawBody)
  } catch (err: any) {
    return {
      success: false,
      statusCode: 400,
      error: 'Formato JSON inválido no corpo do webhook',
    }
  }

  const eventId: string = event.id
  const eventType: string = event.type
  const eventData: any = event.data?.object

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
    // EVENTO 1: checkout.session.completed (Contratação aprovada)
    // ==============================================================
    if (eventType === 'checkout.session.completed') {
      const barbershopId =
        eventData.client_reference_id ||
        eventData.metadata?.barbershopId
      const planId = eventData.metadata?.planId
      const providerSubscriptionId = eventData.subscription || null
      const providerCustomerId = eventData.customer || null

      if (barbershopId) {
        // Localiza a assinatura atual da barbearia
        const subscription = await tx.subscription.findFirst({
          where: { barbershopId },
          orderBy: { createdAt: 'desc' },
        })

        if (subscription) {
          const updateData: any = {
            provider,
            providerSubscriptionId: providerSubscriptionId || subscription.providerSubscriptionId,
            providerCustomerId: providerCustomerId || subscription.providerCustomerId,
            cancelAtPeriodEnd: false,
            canceledAt: null,
          }

          if (planId && planId !== subscription.planId) {
            updateData.planId = planId
          }

          // Transição TRIALING / EXPIRED -> ACTIVE
          if (subscription.status === 'TRIALING' || subscription.status === 'EXPIRED') {
            updateData.status = 'ACTIVE'
          }

          await tx.subscription.update({
            where: { id: subscription.id },
            data: updateData,
          })

          // Evento de ativação
          await tx.subscriptionEvent.create({
            data: {
              subscriptionId: subscription.id,
              type: 'SUBSCRIPTION_ACTIVATED',
              payload: {
                eventId,
                provider,
                providerSubscriptionId,
                providerCustomerId,
                activatedVia: 'checkout.session.completed',
                previousStatus: subscription.status,
                activatedAt: new Date().toISOString(),
              } as Prisma.InputJsonValue,
            },
          })

          actionTaken = `SUBSCRIPTION_ACTIVATED:${subscription.id}`
        }
      }
    }

    // ==============================================================
    // EVENTO 2: invoice.paid / invoice.payment_succeeded (Fatura paga)
    // ==============================================================
    else if (eventType === 'invoice.paid' || eventType === 'invoice.payment_succeeded') {
      const providerInvoiceId = eventData.id
      const providerSubscriptionId = eventData.subscription
      const providerCustomerId = eventData.customer
      const amountPaid = eventData.amount_paid
        ? new Prisma.Decimal(eventData.amount_paid).dividedBy(100)
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
        // Idempotência na fatura: verifica se providerInvoiceId já existe
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

        // Estende a vigência da assinatura e transiciona para ACTIVE se estava em PAST_DUE / TRIALING / EXPIRED
        const newStatus: SubscriptionStatus = 'ACTIVE'
        await tx.subscription.update({
          where: { id: subscription.id },
          data: {
            status: newStatus,
            currentPeriodStart: periodStart,
            currentPeriodEnd: periodEnd,
            providerCustomerId: providerCustomerId || subscription.providerCustomerId,
            cancelAtPeriodEnd: false,
          },
        })

        // Evento de pagamento com sucesso
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
    // EVENTO 3: invoice.payment_failed (Falha de pagamento)
    // ==============================================================
    else if (eventType === 'invoice.payment_failed') {
      const providerInvoiceId = eventData.id
      const providerSubscriptionId = eventData.subscription
      const attemptCount = eventData.attempt_count ?? 1
      const nextPaymentAttempt = eventData.next_payment_attempt // null se não houver mais tentativas
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
        // Registra fatura com status FAILED
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

        // Se esgotaram todas as tentativas da régua de cobrança (Smart Retries) -> SUSPENDED
        // Caso contrário, entra em PAST_DUE (período de tolerância para novas tentativas)
        const isExhausted = !nextPaymentAttempt || attemptCount >= 3
        const targetStatus: SubscriptionStatus = isExhausted ? 'SUSPENDED' : 'PAST_DUE'

        if (subscription.status !== targetStatus) {
          await tx.subscription.update({
            where: { id: subscription.id },
            data: { status: targetStatus, updatedAt: new Date() },
          })
        }

        // Evento específico de pagamento recusado ou suspensão
        await tx.subscriptionEvent.create({
          data: {
            subscriptionId: subscription.id,
            type: isExhausted ? 'SUBSCRIPTION_SUSPENDED' : 'PAYMENT_FAILED',
            payload: {
              eventId,
              providerInvoiceId,
              attemptCount,
              nextPaymentAttempt: nextPaymentAttempt
                ? new Date(nextPaymentAttempt * 1000).toISOString()
                : null,
              failedAt: new Date().toISOString(),
              targetStatus,
            } as Prisma.InputJsonValue,
          },
        })

        actionTaken = `PAYMENT_FAILED:${targetStatus}`
      }
    }

    // ==============================================================
    // EVENTO 4: customer.subscription.deleted (Cancelamento no gateway)
    // ==============================================================
    else if (eventType === 'customer.subscription.deleted') {
      const providerSubscriptionId = eventData.id

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
    // EVENTO 5: customer.subscription.updated (Atualização de ciclo)
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
