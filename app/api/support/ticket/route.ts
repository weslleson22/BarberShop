import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthUser } from '@/lib/api-auth'
import {
  getNotificationSettingsAsync,
  sendAlertEmail,
  sendTelegramMessage,
  recordAlert,
} from '@/lib/external-notifications'
import {
  createTicketAsync,
  getAllTicketsAsync,
  getTicketsForUserAsync,
  updateTicketStatusAndResponseAsync,
  generateTicketProtocol,
  type TicketStatus,
} from '@/lib/support-tickets'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const CATEGORY_LABELS: Record<string, string> = {
  DUVIDA: 'Dúvida Operacional / Configuração',
  HORARIOS: 'Horários de Atendimento & Barbeiros',
  AGENDAMENTO: 'Problema com Agendamentos',
  FINANCEIRO: 'Financeiro, Gastos ou Assinatura',
  SUGESTAO: 'Sugestão de Nova Funcionalidade',
  OUTRO: 'Outro Assunto',
}

// GET - Listar chamados (filtrado por usuário/barbearia ou todos para DEVELOPER)
export async function GET(request: NextRequest) {
  try {
    const authUser = getAuthUser(request)
    if (!authUser?.id) {
      return NextResponse.json({ error: 'Usuário não autenticado.' }, { status: 401 })
    }

    if (authUser.role === 'DEVELOPER') {
      const allTickets = await getAllTicketsAsync()
      return NextResponse.json({ tickets: allTickets })
    }

    const userTickets = await getTicketsForUserAsync(authUser.id, authUser.barbershopId)
    return NextResponse.json({ tickets: userTickets })
  } catch (error: any) {
    console.error('[SUPPORT_TICKETS_GET_ERR]', error)
    return NextResponse.json(
      { error: 'Erro ao carregar histórico de chamados.' },
      { status: 500 }
    )
  }
}

// POST - Abrir Chamado com a Equipe de Suporte e gerar Protocolo
export async function POST(request: NextRequest) {
  try {
    const authUser = getAuthUser(request)
    const body = await request.json()

    const { subject, category = 'DUVIDA', message } = body

    if (!subject || !subject.trim()) {
      return NextResponse.json({ error: 'O assunto do chamado é obrigatório.' }, { status: 400 })
    }

    if (!message || !message.trim()) {
      return NextResponse.json({ error: 'A mensagem detalhada é obrigatória.' }, { status: 400 })
    }

    // Identificação do solicitante
    let userName = authUser?.name || 'Usuário'
    let userEmail = authUser?.email || ''
    let userPhone = ''
    let barbershopId = authUser?.barbershopId || ''
    let barbershopName = 'Estabelecimento não identificado'

    if (authUser?.id) {
      const dbUser = await prisma.user.findUnique({
        where: { id: authUser.id },
        select: {
          name: true,
          email: true,
          phone: true,
          barbershop: {
            select: {
              id: true,
              name: true,
              phone: true,
              slug: true,
            },
          },
        },
      })

      if (dbUser) {
        userName = dbUser.name || userName
        userEmail = dbUser.email || userEmail
        userPhone = dbUser.phone || ''
        if (dbUser.barbershop) {
          barbershopId = dbUser.barbershop.id
          barbershopName = dbUser.barbershop.name
        }
      }
    }

    // Gera o protocolo oficial exclusivo
    const protocol = generateTicketProtocol()

    // Grava o chamado no banco
    const createdTicket = await createTicketAsync({
      protocol,
      userId: authUser?.id || 'anonymous',
      userName,
      userEmail,
      userPhone,
      barbershopId,
      barbershopName,
      subject: subject.trim(),
      category,
      message: message.trim(),
    })

    // Busca configurações de e-mail/SMTP definidas pelo Developer
    const settings = await getNotificationSettingsAsync()
    const targetEmail = (
      settings.smtpUser ||
      settings.alertEmailTo ||
      process.env.SMTP_USER ||
      process.env.ALERT_EMAIL_TO ||
      'swdevelopmentsuporte@gmail.com'
    ).trim()

    const categoryLabel = CATEGORY_LABELS[category] || category
    const nowStr = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })

    const emailSubject = `🎫 [Protocolo #${protocol}] ${subject.trim()} - ${barbershopName}`

    const emailHtml = `
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <title>Novo Chamado de Suporte - Protocolo #${protocol}</title>
      </head>
      <body bgcolor="#030712" style="margin: 0; padding: 0; background-color: #030712; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #ffffff;">
        <table width="100%" border="0" cellspacing="0" cellpadding="0" bgcolor="#030712" style="background-color: #030712; padding: 40px 16px;">
          <tr>
            <td align="center" bgcolor="#030712">
              <table width="100%" border="0" cellspacing="0" cellpadding="0" bgcolor="#0b0f19" style="max-width: 600px; background-color: #0b0f19; border-radius: 16px; border: 1px solid #1f2937; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.6);">
                <!-- Cabeçalho -->
                <tr>
                  <td bgcolor="#111827" style="background-color: #111827; padding: 28px 32px; border-bottom: 1px solid #1f2937;">
                    <div style="display: inline-block; background-color: #1e3a8a; color: #93c5fd; padding: 4px 12px; border-radius: 9999px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px;">
                      Protocolo: #${protocol}
                    </div>
                    <h1 style="margin: 0; font-size: 22px; font-weight: 800; color: #ffffff !important;">
                      🎫 Novo Chamado de Cliente
                    </h1>
                  </td>
                </tr>

                <!-- Dados do Solicitante e Estabelecimento -->
                <tr>
                  <td bgcolor="#0b0f19" style="padding: 24px 32px 16px 32px; background-color: #0b0f19;">
                    <div style="background-color: #111827; border: 1px solid #1f2937; border-radius: 12px; padding: 18px; margin-bottom: 24px;">
                      <table width="100%" border="0" cellspacing="0" cellpadding="0" style="font-size: 13px; color: #e5e7eb;">
                        <tr>
                          <td style="padding-bottom: 8px; width: 140px; color: #9ca3af;"><strong>Protocolo:</strong></td>
                          <td style="padding-bottom: 8px; color: #60a5fa; font-weight: 700; font-family: monospace;">#${protocol}</td>
                        </tr>
                        <tr>
                          <td style="padding-bottom: 8px; color: #9ca3af;"><strong>Estabelecimento:</strong></td>
                          <td style="padding-bottom: 8px; color: #ffffff; font-weight: 600;">${barbershopName}</td>
                        </tr>
                        <tr>
                          <td style="padding-bottom: 8px; color: #9ca3af;"><strong>Solicitante:</strong></td>
                          <td style="padding-bottom: 8px; color: #ffffff; font-weight: 600;">${userName}</td>
                        </tr>
                        <tr>
                          <td style="padding-bottom: 8px; color: #9ca3af;"><strong>E-mail de Contato:</strong></td>
                          <td style="padding-bottom: 8px; color: #3b82f6; font-weight: 600;">${userEmail || 'Não informado'}</td>
                        </tr>
                        ${userPhone ? `
                        <tr>
                          <td style="padding-bottom: 8px; color: #9ca3af;"><strong>WhatsApp / Fone:</strong></td>
                          <td style="padding-bottom: 8px; color: #10b981; font-weight: 600;">${userPhone}</td>
                        </tr>
                        ` : ''}
                        <tr>
                          <td style="padding-bottom: 8px; color: #9ca3af;"><strong>Categoria:</strong></td>
                          <td style="padding-bottom: 8px; color: #f59e0b; font-weight: 600;">${categoryLabel}</td>
                        </tr>
                        <tr>
                          <td style="color: #9ca3af;"><strong>Data e Horário:</strong></td>
                          <td style="color: #9ca3af;">${nowStr}</td>
                        </tr>
                      </table>
                    </div>

                    <!-- Assunto e Mensagem -->
                    <div style="margin-bottom: 24px;">
                      <h2 style="font-size: 16px; font-weight: 700; color: #ffffff; margin: 0 0 10px 0;">
                        Assunto: ${subject.trim()}
                      </h2>
                      <div style="background-color: #111827; border-left: 4px solid #3b82f6; padding: 16px; border-radius: 4px 8px 8px 4px; font-size: 14px; line-height: 1.6; color: #d1d5db; white-space: pre-wrap;">
${message.trim()}
                      </div>
                    </div>

                    <!-- Botão de Ação no Painel do Developer -->
                    <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-top: 24px; margin-bottom: 12px;">
                      <tr>
                        <td align="center">
                          <a href="/developer/suporte" target="_blank" style="background-color: #2563eb; color: #ffffff !important; padding: 12px 28px; border-radius: 8px; font-weight: 700; font-size: 13px; text-decoration: none; display: inline-block;">
                            Responder no Painel Developer
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Rodapé -->
                <tr>
                  <td bgcolor="#070a12" style="padding: 16px 32px; background-color: #070a12; border-top: 1px solid #1f2937; text-align: center;">
                    <p style="margin: 0; font-size: 11px; color: #6b7280;">
                      Protocolo gerado e registrado no BarberShop Cloud Helpdesk.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `

    // Envio do e-mail ao Developer via SMTP
    let emailSent = false
    let emailError: string | undefined

    try {
      const emailResult = await sendAlertEmail(
        emailSubject,
        emailHtml,
        targetEmail,
        undefined,
        undefined,
        { allowSandboxFallback: false }
      )
      emailSent = emailResult.success
      if (!emailResult.success) {
        emailError = emailResult.error
        console.warn('[SUPPORT_TICKET_EMAIL_WARN] Falha no disparo de e-mail ao developer:', emailResult.error)
      }
    } catch (err: any) {
      emailError = err.message
      console.error('[SUPPORT_TICKET_EMAIL_ERR]', err)
    }

    // Envia também confirmação ao solicitante (se possuir e-mail válido)
    if (userEmail && userEmail.includes('@')) {
      try {
        const clientSubject = `[BarberShop Suporte] Chamado Recebido - Protocolo #${protocol}`
        const clientHtml = `
          <!DOCTYPE html>
          <html lang="pt-BR">
          <body bgcolor="#030712" style="margin: 0; padding: 0; background-color: #030712; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #ffffff;">
            <table width="100%" border="0" cellspacing="0" cellpadding="0" style="padding: 30px 16px;">
              <tr>
                <td align="center">
                  <table width="100%" border="0" cellspacing="0" cellpadding="0" bgcolor="#0b0f19" style="max-width: 560px; background-color: #0b0f19; border-radius: 12px; border: 1px solid #1f2937; padding: 24px;">
                    <tr>
                      <td>
                        <h2 style="color: #60a5fa; margin-top: 0;">Recebemos sua solicitação!</h2>
                        <p style="color: #d1d5db; font-size: 14px;">Olá, <strong>${userName}</strong>!</p>
                        <p style="color: #d1d5db; font-size: 14px;">Seu chamado de suporte para o estabelecimento <strong>${barbershopName}</strong> foi registrado com sucesso em nossa central.</p>
                        
                        <div style="background-color: #111827; border: 1px solid #1f2937; border-radius: 8px; padding: 14px; margin: 18px 0;">
                          <div style="font-size: 12px; color: #9ca3af; text-transform: uppercase;">Número de Protocolo:</div>
                          <div style="font-size: 18px; font-weight: 800; color: #60a5fa; font-family: monospace;">#${protocol}</div>
                          <div style="font-size: 13px; color: #e5e7eb; margin-top: 8px;"><strong>Assunto:</strong> ${subject.trim()}</div>
                        </div>

                        <p style="color: #9ca3af; font-size: 13px;">Nossa equipe técnica já está analisando o caso e retornará diretamente neste e-mail ou WhatsApp cadastrado.</p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </body>
          </html>
        `
        await sendAlertEmail(clientSubject, clientHtml, userEmail, undefined, undefined, {
          allowSandboxFallback: false,
        })
      } catch (clientEmailErr) {
        console.warn('[SUPPORT_CLIENT_EMAIL_WARN] Falha ao enviar confirmação ao cliente:', clientEmailErr)
      }
    }

    // Notificação complementar via Telegram
    if (settings.telegramEnabled && settings.telegramBotToken && settings.telegramChatId) {
      try {
        const tgMessage = `🎫 <b>NOVO CHAMADO DE SUPORTE</b>\n\n` +
          `🔢 <b>Protocolo:</b> #${protocol}\n` +
          `🏢 <b>Barbearia:</b> ${barbershopName}\n` +
          `👤 <b>Solicitante:</b> ${userName} (${userEmail || 'sem email'})\n` +
          `${userPhone ? `📱 <b>WhatsApp:</b> ${userPhone}\n` : ''}` +
          `🏷️ <b>Categoria:</b> ${categoryLabel}\n` +
          `📌 <b>Assunto:</b> ${subject.trim()}\n\n` +
          `💬 <b>Mensagem:</b>\n<i>${message.trim()}</i>\n\n` +
          `⏰ <i>${nowStr}</i>`

        await sendTelegramMessage(tgMessage)
      } catch (tgErr) {
        console.warn('[SUPPORT_TICKET_TG_WARN] Falha ao enviar aviso telegram:', tgErr)
      }
    }

    // Registra alerta nos logs do sistema
    recordAlert({
      channel: 'EMAIL',
      eventType: 'STATUS_CHANGE',
      title: `Chamado #${protocol}: ${subject.trim()}`,
      message: `Enviado por ${userName} (${barbershopName}) - Destino: ${targetEmail}`,
      status: emailSent ? 'SUCCESS' : 'FAILED',
      error: emailError,
    })

    return NextResponse.json({
      success: true,
      protocol,
      ticket: createdTicket,
      message: `Chamado registrado com sucesso com o protocolo #${protocol}.`,
      recipient: targetEmail,
      emailSent,
    })
  } catch (error: any) {
    console.error('Support ticket error:', error)
    return NextResponse.json(
      { error: 'Erro ao registrar chamado de suporte. Tente novamente ou use o WhatsApp.' },
      { status: 500 }
    )
  }
}

// PUT / PATCH - Developer responde ao chamado e altera status
export async function PUT(request: NextRequest) {
  try {
    const authUser = getAuthUser(request)
    if (!authUser?.id || authUser.role !== 'DEVELOPER') {
      return NextResponse.json(
        { error: 'Acesso restrito ao Administrador da Plataforma (DEVELOPER).' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { ticketId, status, response: responseText, sendEmailToClient = true } = body

    if (!ticketId) {
      return NextResponse.json({ error: 'O identificador do chamado é obrigatório.' }, { status: 400 })
    }

    const updated = await updateTicketStatusAndResponseAsync(ticketId, {
      status: (status as TicketStatus) || 'ANSWERED',
      response: responseText,
      respondedBy: authUser.name || 'Suporte BarberShop',
    })

    if (!updated) {
      return NextResponse.json({ error: 'Chamado não encontrado.' }, { status: 404 })
    }

    // Se houver resposta e flag de envio ativada, dispara e-mail com a resposta oficial ao cliente
    let clientEmailDispatched = false
    if (sendEmailToClient && updated.userEmail && updated.userEmail.includes('@') && responseText) {
      try {
        const responseSubject = `[Suporte BarberShop] Resposta ao Protocolo #${updated.protocol}: ${updated.subject}`
        const statusLabel =
          updated.status === 'RESOLVED'
            ? 'Resolvido / Concluído'
            : updated.status === 'ANSWERED'
            ? 'Respondido'
            : updated.status === 'IN_PROGRESS'
            ? 'Em Andamento'
            : 'Em Aberto'

        const responseHtml = `
          <!DOCTYPE html>
          <html lang="pt-BR">
          <head>
            <meta charset="UTF-8">
            <title>Resposta do Suporte BarberShop - Protocolo #${updated.protocol}</title>
          </head>
          <body bgcolor="#030712" style="margin: 0; padding: 0; background-color: #030712; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #ffffff;">
            <table width="100%" border="0" cellspacing="0" cellpadding="0" bgcolor="#030712" style="background-color: #030712; padding: 40px 16px;">
              <tr>
                <td align="center" bgcolor="#030712">
                  <table width="100%" border="0" cellspacing="0" cellpadding="0" bgcolor="#0b0f19" style="max-width: 600px; background-color: #0b0f19; border-radius: 16px; border: 1px solid #1f2937; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.6);">
                    <!-- Cabeçalho -->
                    <tr>
                      <td bgcolor="#111827" style="background-color: #111827; padding: 28px 32px; border-bottom: 1px solid #1f2937;">
                        <div style="display: inline-block; background-color: #065f46; color: #a7f3d0; padding: 4px 12px; border-radius: 9999px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px;">
                          Protocolo #${updated.protocol}
                        </div>
                        <h1 style="margin: 0; font-size: 20px; font-weight: 800; color: #ffffff !important;">
                          💬 Resposta da Equipe de Suporte
                        </h1>
                      </td>
                    </tr>

                    <!-- Conteúdo -->
                    <tr>
                      <td bgcolor="#0b0f19" style="padding: 24px 32px 16px 32px; background-color: #0b0f19;">
                        <p style="color: #d1d5db; font-size: 14px; margin-top: 0;">
                          Olá, <strong>${updated.userName}</strong> (${updated.barbershopName})!
                        </p>
                        <p style="color: #9ca3af; font-size: 13px;">
                          Nossa equipe técnica analisou sua solicitação referente a <strong>"${updated.subject}"</strong>.
                        </p>

                        <!-- Caixa de Resposta Oficial -->
                        <div style="background-color: #111827; border: 1px solid #059669; border-left: 6px solid #10b981; border-radius: 8px; padding: 18px; margin: 20px 0;">
                          <div style="font-size: 12px; font-weight: 700; color: #34d399; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px;">
                            Parecer Oficial do Suporte (${updated.respondedBy || 'Equipe Técnica'}):
                          </div>
                          <div style="color: #ffffff; font-size: 14px; line-height: 1.6; white-space: pre-wrap;">
${responseText.trim()}
                          </div>
                        </div>

                        <!-- Detalhes do Chamado Original -->
                        <div style="background-color: #070a12; border: 1px solid #1f2937; border-radius: 8px; padding: 14px; margin-bottom: 20px;">
                          <div style="font-size: 11px; font-weight: 600; color: #6b7280; text-transform: uppercase; margin-bottom: 6px;">
                            Sua mensagem original:
                          </div>
                          <div style="font-size: 12px; color: #9ca3af; line-height: 1.5; white-space: pre-wrap;">
${updated.message}
                          </div>
                        </div>

                        <div style="font-size: 12px; color: #6b7280;">
                          Status atualizado para: <strong style="color: #34d399;">${statusLabel}</strong>. Você também pode acompanhar o histórico completo no painel do sistema em <em>Suporte &gt; Meus Protocolos</em>.
                        </div>
                      </td>
                    </tr>

                    <!-- Rodapé -->
                    <tr>
                      <td bgcolor="#070a12" style="padding: 16px 32px; background-color: #070a12; border-top: 1px solid #1f2937; text-align: center;">
                        <p style="margin: 0; font-size: 11px; color: #6b7280;">
                          BarberShop Cloud • Central de Atendimento & Suporte Técnico
                        </p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </body>
          </html>
        `

        await sendAlertEmail(responseSubject, responseHtml, updated.userEmail, undefined, undefined, {
          allowSandboxFallback: false,
        })
        clientEmailDispatched = true
      } catch (emailErr) {
        console.warn('[SUPPORT_RESPONSE_EMAIL_WARN] Falha ao enviar resposta ao cliente:', emailErr)
      }
    }

    return NextResponse.json({
      success: true,
      ticket: updated,
      clientEmailDispatched,
      message: 'Chamado atualizado e resposta registrada com sucesso.',
    })
  } catch (error: any) {
    console.error('[SUPPORT_TICKETS_PUT_ERR]', error)
    return NextResponse.json({ error: 'Erro ao responder chamado de suporte.' }, { status: 500 })
  }
}
