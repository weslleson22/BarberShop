import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser, requireRole } from '@/lib/api-auth'
import {
  getNotificationSettings,
  getNotificationSettingsAsync,
  saveNotificationSettings,
  getRecentAlerts,
  getRecentAlertsAsync,
  sendTelegramMessage,
  sendAlertEmail,
  getTelegramBotInfo,
  notifyNewRegistration,
  sendCompanyWelcomeEmail,
} from '@/lib/external-notifications'

export const dynamic = 'force-dynamic'
export const revalidate = 0

// GET - Consultar configurações de notificação e histórico recente de alertas (do PostgreSQL)
export async function GET(request: NextRequest) {
  try {
    const authenticatedUser = getAuthUser(request)
    const isDev = process.env.NODE_ENV === 'development'
    if (!requireRole(authenticatedUser, ['DEVELOPER', 'ADMIN']) && !isDev) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const settings = await getNotificationSettingsAsync()
    const recentAlerts = await getRecentAlertsAsync()
    let botInfo = null

    if (settings.telegramBotToken) {
      try {
        botInfo = await getTelegramBotInfo(settings.telegramBotToken)
      } catch {
        // Silencioso
      }
    }

    return NextResponse.json({
      settings,
      recentAlerts,
      botInfo,
    })
  } catch (error) {
    console.error('Error getting notification settings:', error)
    return NextResponse.json({ error: 'Erro ao obter configurações de notificação' }, { status: 500 })
  }
}

// PUT - Salvar configurações (Telegram Bot Token, Chat ID, E-mail, Toggles) no PostgreSQL
export async function PUT(request: NextRequest) {
  try {
    const authenticatedUser = getAuthUser(request)
    const isDev = process.env.NODE_ENV === 'development'
    if (!requireRole(authenticatedUser, ['DEVELOPER', 'ADMIN']) && !isDev) {
      return NextResponse.json({ error: 'Acesso restrito ao desenvolvedor ou administrador' }, { status: 403 })
    }

    const body = await request.json()
    const updated = await saveNotificationSettings(body)

    return NextResponse.json({
      success: true,
      message: 'Configurações de notificação salvas com sucesso no banco de dados!',
      settings: updated,
    })
  } catch (error) {
    console.error('Error saving notification settings:', error)
    return NextResponse.json({ error: 'Erro ao salvar configurações' }, { status: 500 })
  }
}

// POST - Enviar mensagem de teste para Telegram ou Email
export async function POST(request: NextRequest) {
  try {
    const authenticatedUser = getAuthUser(request)
    const isDev = process.env.NODE_ENV === 'development'
    if (!requireRole(authenticatedUser, ['DEVELOPER', 'ADMIN']) && !isDev) {
      return NextResponse.json({ error: 'Acesso restrito ao desenvolvedor ou administrador' }, { status: 403 })
    }

    const user = authenticatedUser || {
      id: 'developer',
      name: 'Desenvolvedor',
      email: 'swdevelopmentsuporte@gmail.com',
      role: 'DEVELOPER' as const,
      barbershopId: null,
    }

    const body = await request.json()
    const { channel, testToken, testChatId, testEmail } = body

    const nowStr = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })
    const actorName = user.name || 'Desenvolvedor'
    const actorEmail = user.email || 'swdevelopmentsuporte@gmail.com'

    if (channel === 'TELEGRAM') {
      const testMsg = `🔔 <b>TESTE DE INTEGRAÇÃO TELEGRAM</b>\n\n` +
        `✅ A comunicação com o bot do BarberShop está funcionando com perfeição!\n` +
        `👤 Disparado por: ${actorName} (${actorEmail})\n` +
        `📅 Horário: ${nowStr}`

      const res = await sendTelegramMessage(testMsg, testToken, testChatId)
      if (!res.success) {
        return NextResponse.json({ success: false, error: res.error }, { status: 400 })
      }
      return NextResponse.json({ success: true, message: 'Mensagem de teste enviada ao Telegram com sucesso!' })
    }

    if (channel === 'EMAIL') {
      const { 
        testEmail, 
        testApiKey, 
        testFrom,
        emailProvider,
        smtpHost,
        smtpPort,
        smtpUser,
        smtpPass,
        smtpSecure
      } = body

      // Atualiza e persiste os dados caso o usuário tenha informado novos valores no formulário
      if (emailProvider || smtpUser || smtpPass !== undefined || smtpHost || testApiKey) {
        await saveNotificationSettings({
          ...(emailProvider ? { emailProvider } : {}),
          ...(smtpHost ? { smtpHost: smtpHost.trim() } : {}),
          ...(smtpPort ? { smtpPort: Number(smtpPort) } : {}),
          ...(smtpUser ? { smtpUser: smtpUser.trim() } : {}),
          ...(smtpPass !== undefined ? { smtpPass: smtpPass.trim() } : {}),
          ...(smtpSecure !== undefined ? { smtpSecure: Boolean(smtpSecure) } : {}),
          ...(testApiKey ? { resendApiKey: testApiKey.trim() } : {}),
          ...(testFrom ? { emailFrom: testFrom.trim() } : {}),
          ...(testEmail ? { alertEmailTo: testEmail.trim() } : {}),
        })
      }

      const settings = await getNotificationSettingsAsync()
      const isSmtp = settings.emailProvider === 'smtp' || Boolean(settings.smtpPass)
      const providerLabel = isSmtp ? 'Gmail SMTP' : 'Resend'
      const destinationEmail = (testEmail || settings.alertEmailTo || actorEmail || '').trim()
      const subject = `🔔 Teste de Notificação (${providerLabel}) - BarberShop`
      const html = `
        <div style="font-family: sans-serif; background: #0f172a; color: #f8fafc; padding: 24px; border-radius: 12px; border: 1px solid #10b981;">
          <h2 style="color: #10b981; margin-top: 0;">✅ Teste de Integração de E-mail (${providerLabel})</h2>
          <p>O sistema de envio de e-mails via <strong>${providerLabel}</strong> está configurado e respondendo com sucesso!</p>
          <p><strong>Destino:</strong> ${destinationEmail}</p>
          <p><strong>Disparado por:</strong> ${actorName} (${actorEmail})</p>
          <p><strong>Horário:</strong> ${nowStr}</p>
        </div>
      `
      const res = await sendAlertEmail(subject, html, destinationEmail, testApiKey, testFrom, { allowSandboxFallback: false })
      if (!res.success) {
        return NextResponse.json({ success: false, error: res.error }, { status: 400 })
      }
      return NextResponse.json({ 
        success: true, 
        message: `E-mail de teste enviado com sucesso via ${res.provider === 'smtp' ? 'Gmail SMTP' : 'Resend'} para ${destinationEmail}!` 
      })
    }

    if (channel === 'TEST_COMPANY') {
      const settings = await getNotificationSettingsAsync()
      const targetWelcomeEmail = (testEmail || settings.alertEmailTo || actorEmail || 'swdevelopmentsuporte@gmail.com').trim()

      await notifyNewRegistration({
        type: 'COMPANY',
        name: actorName || 'Cristiano Santos',
        email: targetWelcomeEmail,
        role: 'ADMIN (Proprietário)',
        phone: '(11) 98765-4321',
        barbershopName: 'Barbearia Exemplo Premium',
        barbershopEmail: 'comercial@barbeariaexemplo.com.br',
        barbershopPhone: '(11) 3322-4455',
        barbershopAddress: 'Av. Paulista, 1000 - São Paulo, SP',
        barbershopSlug: 'barbearia-exemplo',
        isTrial: true,
        trialDays: 7,
        origin: 'Simulação de Cadastro de Empresa',
      })

      // Envia o e-mail personalizado de boas-vindas completo para validação
      await sendCompanyWelcomeEmail({
        companyName: 'Barbearia Exemplo Premium',
        adminName: actorName || 'Cristiano Santos',
        adminEmail: targetWelcomeEmail,
        slug: 'barbearia-exemplo',
        trialDays: 7,
        trialEndsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      })

      return NextResponse.json({ 
        success: true, 
        message: `Notificação e E-mail de Boas-Vindas enviados com sucesso para ${targetWelcomeEmail}!` 
      })
    }

    if (channel === 'TEST_CLIENT') {
      await notifyNewRegistration({
        type: 'CLIENT',
        name: 'Lucas Ferreira (Exemplo)',
        email: 'lucas.ferreira@gmail.com',
        phone: '(11) 99888-7766',
        role: 'CLIENT',
        barbershopName: 'Barbearia Exemplo Premium',
        barbershopSlug: 'barbearia-exemplo',
        origin: 'Página Pública de Agendamento',
      })
      return NextResponse.json({ success: true, message: 'Notificação de Novo Cliente enviada ao Telegram com sucesso!' })
    }

    return NextResponse.json({ error: 'Canal inválido (escolha TELEGRAM, EMAIL, TEST_COMPANY ou TEST_CLIENT)' }, { status: 400 })
  } catch (error: any) {
    console.error('Error testing notification:', error)
    return NextResponse.json({ error: error.message || 'Erro ao realizar teste de notificação' }, { status: 500 })
  }
}
