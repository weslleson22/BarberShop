import fs from 'fs'
import path from 'path'
import os from 'os'
import { prisma } from './prisma'

export interface NotificationSettings {
  telegramEnabled: boolean
  telegramBotToken: string
  telegramChatId: string
  emailEnabled: boolean
  emailProvider: 'smtp' | 'resend'
  alertEmailTo: string
  // Resend
  resendApiKey: string
  emailFrom: string
  // SMTP (Gmail)
  smtpHost: string
  smtpPort: number
  smtpUser: string
  smtpPass: string
  smtpSecure: boolean
  notifyOnNewRegistration: boolean
  notifyOnPasswordError: boolean
  notifyOnStatusChange: boolean
}

export interface SentAlertRecord {
  id: string
  timestamp: string
  channel: 'TELEGRAM' | 'EMAIL' | 'IN_APP' | 'ALL'
  eventType: 'NEW_REGISTRATION' | 'PASSWORD_ERROR' | 'STATUS_CHANGE' | 'TEST'
  title: string
  message: string
  status: 'SUCCESS' | 'FAILED'
  error?: string
}

const SETTINGS_DIR = path.join(os.tmpdir(), 'barbershop-notifications')
const SETTINGS_FILE = path.join(SETTINGS_DIR, 'settings.json')
const ALERTS_FILE = path.join(SETTINGS_DIR, 'recent-alerts.json')

// In-memory cache
const globalNotificationStore = globalThis as unknown as {
  __notificationSettings__?: NotificationSettings
  __recentAlerts__?: SentAlertRecord[]
}

const defaultSettings: NotificationSettings = {
  telegramEnabled: true,
  telegramBotToken: process.env.TELEGRAM_BOT_TOKEN || '',
  telegramChatId: process.env.TELEGRAM_CHAT_ID || '',
  emailEnabled: true,
  emailProvider: (process.env.EMAIL_PROVIDER as 'smtp' | 'resend') || 'smtp',
  alertEmailTo: process.env.ALERT_EMAIL_TO || '',
  resendApiKey: process.env.RESEND_API_KEY || '',
  emailFrom: process.env.EMAIL_FROM || 'BarberShop Alertas <notificacoes@barbershop.com>',
  smtpHost: process.env.SMTP_HOST || 'smtp.gmail.com',
  smtpPort: Number(process.env.SMTP_PORT) || 465,
  smtpUser: process.env.SMTP_USER || '',
  smtpPass: process.env.SMTP_PASS || '',
  smtpSecure: true,
  notifyOnNewRegistration: true,
  notifyOnPasswordError: true,
  notifyOnStatusChange: true,
}

if (!globalNotificationStore.__recentAlerts__) {
  globalNotificationStore.__recentAlerts__ = []
}

const SETTINGS_KEY = 'external_notification_settings'
const ALERTS_KEY = 'external_notification_recent_alerts'

let dbTableEnsured = false

async function ensureSystemSettingsTable(): Promise<void> {
  if (dbTableEnsured) return
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS system_settings (
        key TEXT PRIMARY KEY,
        value JSONB NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `)
    dbTableEnsured = true
  } catch (err) {
    console.warn('[SYSTEM_SETTINGS_INIT_WARN] Falha ao verificar/criar tabela system_settings:', err)
  }
}

function loadPersistedSettings(): NotificationSettings {
  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      const content = fs.readFileSync(SETTINGS_FILE, 'utf-8')
      const parsed = JSON.parse(content)
      const merged = { ...defaultSettings, ...parsed }
      if (!merged.smtpPass && process.env.SMTP_PASS) {
        merged.smtpPass = process.env.SMTP_PASS
      }
      return merged
    }
  } catch {
    // Silencioso
  }
  return defaultSettings
}

/**
 * Consulta síncrona das configurações em cache de memória/arquivo (fallback).
 */
export function getNotificationSettings(): NotificationSettings {
  if (!globalNotificationStore.__notificationSettings__) {
    globalNotificationStore.__notificationSettings__ = loadPersistedSettings()
  }
  return globalNotificationStore.__notificationSettings__
}

/**
 * Consulta assíncrona das configurações diretamente do banco de dados PostgreSQL.
 * Carrega credenciais salvas em produção e sincroniza a memória.
 */
export async function getNotificationSettingsAsync(): Promise<NotificationSettings> {
  try {
    await ensureSystemSettingsTable()
    const rows = await prisma.$queryRawUnsafe<Array<{ key: string; value: any }>>(
      `SELECT value FROM system_settings WHERE key = $1 LIMIT 1;`,
      SETTINGS_KEY
    )

    if (rows && rows.length > 0 && rows[0]?.value) {
      const dbVal = rows[0].value
      const parsed = typeof dbVal === 'string' ? JSON.parse(dbVal) : dbVal
      const merged: NotificationSettings = {
        ...defaultSettings,
        ...parsed,
      }
      globalNotificationStore.__notificationSettings__ = merged
      return merged
    }
  } catch (err) {
    console.warn('[NOTIFICATIONS_GET_DB_WARN] Falha ao consultar configurações do banco:', err)
  }

  return getNotificationSettings()
}

/**
 * Salva as configurações de notificação (chaves de API, Telegram, SMTP, flags)
 * diretamente no Banco de Dados PostgreSQL para persistência duradoura em produção na Vercel.
 */
export async function saveNotificationSettings(
  newSettings: Partial<NotificationSettings>
): Promise<NotificationSettings> {
  const current = getNotificationSettings()
  const updated: NotificationSettings = { ...current, ...newSettings }
  if (newSettings.smtpUser && !newSettings.alertEmailTo) {
    updated.alertEmailTo = newSettings.smtpUser
  }
  globalNotificationStore.__notificationSettings__ = updated

  // 1. Salva no banco de dados PostgreSQL
  try {
    await ensureSystemSettingsTable()
    const jsonStr = JSON.stringify(updated)
    await prisma.$executeRawUnsafe(
      `INSERT INTO system_settings (key, value, updated_at)
       VALUES ($1, $2::jsonb, NOW())
       ON CONFLICT (key) DO UPDATE
       SET value = EXCLUDED.value, updated_at = NOW();`,
      SETTINGS_KEY,
      jsonStr
    )
  } catch (dbErr) {
    console.error('[NOTIFICATIONS_SAVE_DB_ERROR] Erro ao gravar configurações no banco PostgreSQL:', dbErr)
  }

  // 2. Fallback de cache local em disco (/tmp)
  try {
    if (!fs.existsSync(SETTINGS_DIR)) {
      fs.mkdirSync(SETTINGS_DIR, { recursive: true })
    }
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(updated, null, 2), 'utf-8')
  } catch {}

  return updated
}

export async function getRecentAlertsAsync(): Promise<SentAlertRecord[]> {
  try {
    await ensureSystemSettingsTable()
    const rows = await prisma.$queryRawUnsafe<Array<{ value: any }>>(
      `SELECT value FROM system_settings WHERE key = $1 LIMIT 1;`,
      ALERTS_KEY
    )

    if (rows && rows.length > 0 && rows[0]?.value) {
      const dbVal = rows[0].value
      const alerts = typeof dbVal === 'string' ? JSON.parse(dbVal) : dbVal
      if (Array.isArray(alerts)) {
        globalNotificationStore.__recentAlerts__ = alerts
        return alerts
      }
    }
  } catch (err) {
    console.warn('[ALERTS_GET_DB_WARN] Falha ao consultar histórico de alertas no banco:', err)
  }

  return getRecentAlerts()
}

export function recordAlert(alert: Omit<SentAlertRecord, 'id' | 'timestamp'>) {
  const record: SentAlertRecord = {
    id: 'alert_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
    timestamp: new Date().toISOString(),
    ...alert,
  }

  if (!globalNotificationStore.__recentAlerts__) {
    globalNotificationStore.__recentAlerts__ = []
  }
  globalNotificationStore.__recentAlerts__.unshift(record)

  if (globalNotificationStore.__recentAlerts__.length > 50) {
    globalNotificationStore.__recentAlerts__ = globalNotificationStore.__recentAlerts__.slice(0, 50)
  }

  // Grava assincronamente no PostgreSQL
  ensureSystemSettingsTable()
    .then(() => {
      const jsonStr = JSON.stringify(globalNotificationStore.__recentAlerts__)
      return prisma.$executeRawUnsafe(
        `INSERT INTO system_settings (key, value, updated_at)
         VALUES ($1, $2::jsonb, NOW())
         ON CONFLICT (key) DO UPDATE
         SET value = EXCLUDED.value, updated_at = NOW();`,
        ALERTS_KEY,
        jsonStr
      )
    })
    .catch(() => {})

  try {
    if (!fs.existsSync(SETTINGS_DIR)) {
      fs.mkdirSync(SETTINGS_DIR, { recursive: true })
    }
    fs.writeFileSync(ALERTS_FILE, JSON.stringify(globalNotificationStore.__recentAlerts__), 'utf-8')
  } catch {}
}

export function getRecentAlerts(): SentAlertRecord[] {
  if (globalNotificationStore.__recentAlerts__ && globalNotificationStore.__recentAlerts__.length > 0) {
    return globalNotificationStore.__recentAlerts__
  }
  try {
    if (fs.existsSync(ALERTS_FILE)) {
      const content = fs.readFileSync(ALERTS_FILE, 'utf-8')
      globalNotificationStore.__recentAlerts__ = JSON.parse(content)
      return globalNotificationStore.__recentAlerts__ || []
    }
  } catch {}
  return []
}

// ─────────────────────────────────────────────────────────────
// Disparador Telegram Bot & Utilitários
// ─────────────────────────────────────────────────────────────

/**
 * Normaliza e gera candidatos de Chat ID para grupos, canais e usuários.
 * Trata URLs como https://web.telegram.org/k/#-5501250394, IDs sem prefixo -100, etc.
 */
export function normalizeTelegramChatIds(rawChatId: string): string[] {
  let cleaned = (rawChatId || '').trim()

  // Se o usuário colou a URL completa do Telegram Web: https://web.telegram.org/k/#-5501250394
  const webMatch = cleaned.match(/web\.telegram\.org\/(?:k|a|z)\/#(-?\d+)/i)
  if (webMatch) {
    cleaned = webMatch[1]
  }

  // Se for username de canal/grupo público com @ (ex: @meucanal)
  if (cleaned.startsWith('@')) {
    return [cleaned]
  }

  // Remove caracteres que não sejam dígitos ou sinal de menos
  cleaned = cleaned.replace(/[^-\d]/g, '')
  if (!cleaned) return []

  const candidates: string[] = []

  if (cleaned.startsWith('-100')) {
    candidates.push(cleaned)
    const raw = cleaned.replace(/^-100/, '')
    if (raw) candidates.push(`-${raw}`)
  } else if (cleaned.startsWith('-')) {
    const raw = cleaned.replace(/^-/, '')
    // Supergrupos na API oficial do Telegram Bot exigem o prefixo -100
    candidates.push(`-100${raw}`)
    candidates.push(cleaned)
  } else {
    // Número puro (ex: 5501250394)
    if (cleaned.length >= 8) {
      candidates.push(`-100${cleaned}`)
      candidates.push(`-${cleaned}`)
      candidates.push(cleaned)
    } else {
      candidates.push(cleaned)
      candidates.push(`-100${cleaned}`)
    }
  }

  return [...new Set(candidates)]
}

/**
 * Consulta a API do Telegram para obter dados cadastrais do Bot (username, nome, status)
 */
export async function getTelegramBotInfo(customToken?: string): Promise<{
  ok: boolean
  id?: number
  username?: string
  firstName?: string
  error?: string
}> {
  const settings = await getNotificationSettingsAsync()
  const botToken = (customToken || settings.telegramBotToken || process.env.TELEGRAM_BOT_TOKEN || '').trim()
  if (!botToken) {
    return { ok: false, error: 'Token do bot não configurado' }
  }

  try {
    const res = await fetch(`https://api.telegram.org/bot${botToken}/getMe`)
    const data = await res.json()
    if (res.ok && data.ok && data.result) {
      return {
        ok: true,
        id: data.result.id,
        username: data.result.username,
        firstName: data.result.first_name,
      }
    }
    return {
      ok: false,
      error: data.description || 'Falha ao validar token do bot no Telegram',
    }
  } catch (err: any) {
    return {
      ok: false,
      error: err.message || 'Erro de conexão com o Telegram',
    }
  }
}

export async function sendTelegramMessage(
  text: string,
  customToken?: string,
  customChatId?: string
): Promise<{ success: boolean; workingChatId?: string; error?: string }> {
  const settings = await getNotificationSettingsAsync()
  const botToken = (customToken || settings.telegramBotToken || process.env.TELEGRAM_BOT_TOKEN || '').trim()
  const rawChatId = (customChatId || settings.telegramChatId || process.env.TELEGRAM_CHAT_ID || '').trim()

  if (!botToken || !rawChatId) {
    return { success: false, error: 'Telegram Bot Token ou Chat ID não configurados' }
  }

  // 1. Obter informações do bot para diagnósticos precisos
  let botUsername = ''
  try {
    const botInfo = await getTelegramBotInfo(botToken)
    if (!botInfo.ok && botInfo.error?.toLowerCase().includes('unauthorized')) {
      return { success: false, error: 'Token do bot inválido! Verifique o token fornecido pelo @BotFather.' }
    }
    if (botInfo.username) {
      botUsername = botInfo.username
    }
  } catch {
    // Prosseguir para envio
  }

  const candidateChatIds = normalizeTelegramChatIds(rawChatId)
  if (candidateChatIds.length === 0) {
    return { success: false, error: 'Chat ID inválido ou não informado' }
  }

  let lastError = ''
  for (const cid of candidateChatIds) {
    try {
      const url = `https://api.telegram.org/bot${botToken}/sendMessage`
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: cid,
          text,
          parse_mode: 'HTML',
          disable_web_page_preview: true,
        }),
      })

      const data = await res.json()
      if (res.ok && data.ok) {
        // Se o Chat ID bem-sucedido foi diferente do que estava salvo, sincroniza
        if (cid !== settings.telegramChatId) {
          saveNotificationSettings({ telegramChatId: cid })
        }
        return { success: true, workingChatId: cid }
      } else {
        lastError = data.description || 'Falha ao enviar mensagem no Telegram'
        // Se foi erro de "chat not found", tenta o próximo candidato
        if (lastError.toLowerCase().includes('chat not found')) {
          continue
        }
        // Se for erro de permissão ou outro erro definitivo
        break
      }
    } catch (error: any) {
      lastError = error.message || 'Erro de conexão com Telegram'
    }
  }

  // Tratamentos amigáveis com diagnóstico detalhado
  const botDisplay = botUsername ? `@${botUsername}` : 'o seu bot'

  if (lastError.toLowerCase().includes('chat not found')) {
    return {
      success: false,
      error: `Chat não encontrado no Telegram (${candidateChatIds.join(' ou ')}).\n\n` +
             `⚠️ IMPORTANTE: O bot ${botDisplay} PRECISA ser adicionado ao grupo "suporte barbershop" como participante ou administrador antes de poder enviar mensagens!`,
    }
  }

  if (lastError.toLowerCase().includes('not a member') || lastError.toLowerCase().includes('kicked')) {
    return {
      success: false,
      error: `O bot ${botDisplay} não é membro do grupo. Abra o Telegram, acesse o grupo "suporte barbershop", adicione ${botDisplay} e conceda permissão para enviar mensagens.`,
    }
  }

  if (lastError.toLowerCase().includes('have no rights') || lastError.toLowerCase().includes('not enough rights')) {
    return {
      success: false,
      error: `O bot ${botDisplay} está no grupo, mas não possui permissão para postar mensagens. Promova ${botDisplay} a Administrador do grupo.`,
    }
  }

  return { success: false, error: lastError }
}

// ─────────────────────────────────────────────────────────────
// Disparador de E-mail de Alerta
// ─────────────────────────────────────────────────────────────

export interface SendEmailOptions {
  allowSandboxFallback?: boolean
}

export async function sendAlertEmail(
  subject: string,
  html: string,
  customTo?: string,
  customApiKey?: string,
  customFrom?: string,
  options?: SendEmailOptions
): Promise<{ success: boolean; error?: string; provider?: 'smtp' | 'resend'; sandboxForwarded?: boolean; testEmail?: string }> {
  const settings = await getNotificationSettingsAsync()
  // As notificações do sistema chegam no e-mail do usuário SMTP (SMTP_USER)
  const defaultTo = settings.smtpUser || settings.alertEmailTo || process.env.SMTP_USER || process.env.ALERT_EMAIL_TO || ''
  const to = (customTo || defaultTo).trim()

  if (!to) {
    return { success: false, error: 'E-mail de destino não configurado' }
  }

  // 1. Envio via SMTP (Gmail ou servidor configurado)
  const isSmtpConfigured = Boolean(settings.smtpUser && settings.smtpPass)
  const preferSmtp = settings.emailProvider === 'smtp' || isSmtpConfigured

  if (preferSmtp && isSmtpConfigured) {
    try {
      const { sendMailViaSmtp } = await import('./smtp-client')
      const smtpResult = await sendMailViaSmtp(
        {
          host: settings.smtpHost || 'smtp.gmail.com',
          port: Number(settings.smtpPort) || 465,
          user: settings.smtpUser,
          pass: settings.smtpPass,
          secure: settings.smtpSecure !== false,
        },
        {
          from: settings.smtpUser,
          fromName: 'BarberShop',
          to,
          subject,
          html,
        }
      )

      if (smtpResult.success) {
        return { success: true, provider: 'smtp' }
      } else {
        console.error('[SMTP_SEND_FAILED]', smtpResult.error)
        // Se o usuário selecionou SMTP, deve retornar o erro do SMTP diretamente
        if (settings.emailProvider === 'smtp' || !settings.resendApiKey) {
          return { success: false, error: smtpResult.error }
        }
      }
    } catch (smtpErr: any) {
      console.error('[SMTP_EXCEPTION]', smtpErr)
      if (settings.emailProvider === 'smtp' || !settings.resendApiKey) {
        return { success: false, error: smtpErr.message || 'Erro ao enviar e-mail via SMTP' }
      }
    }
  } else if (settings.emailProvider === 'smtp' && !settings.smtpPass) {
    // Se o usuário selecionou SMTP mas não forneceu senha, tenta Resend como fallback caso exista chave
    if (!settings.resendApiKey) {
      return {
        success: false,
        error: 'Senha de App do Gmail SMTP não configurada! Gere a Senha de App de 16 caracteres em myaccount.google.com/apppasswords para enviar diretamente pelo Gmail.',
      }
    }
  }

  // 2. Envio via Resend (Alternativa quando provider for Resend ou fallback)
  const apiKey = (customApiKey || settings.resendApiKey || process.env.RESEND_API_KEY || '').trim()

  if (!apiKey) {
    return { 
      success: false, 
      error: 'Nenhum provedor de e-mail configurado. Configure a Senha de App do Gmail SMTP ou a chave do Resend.' 
    }
  }

  let from = (customFrom || settings.emailFrom || process.env.EMAIL_FROM || '').trim()
  if (!from || /@(gmail|hotmail|yahoo|outlook)\.com/i.test(from)) {
    from = 'BarberShop Alertas <onboarding@resend.dev>'
  }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to,
        subject,
        html,
      }),
    })

    const data = await res.json()
    if (!res.ok) {
      const err = data.message || (typeof data === 'string' ? data : JSON.stringify(data))
      
      const isSandboxRestriction = /to your own email address/i.test(err) || /verify a domain/i.test(err)

      // Se sandbox fallback não for permitido (ex: Redefinição de senha, onde o e-mail deve ir obrigatoriamente para o usuário)
      if (options?.allowSandboxFallback === false) {
        if (isSandboxRestriction) {
          return {
            success: false,
            error: `O serviço Resend está em modo restrito de testes (sandbox) e não permite envio para o e-mail externo (${to}). Para entregar diretamente na caixa de entrada do usuário, configure o Gmail SMTP com Senha de App ou verifique um domínio no Resend.`,
          }
        }
        return { success: false, error: `Resend: ${err}` }
      }

      // Detecção inteligente da restrição de sandbox do Resend (apenas para testes internos se explicitamente permitido)
      const sandboxMatch = err.match(/to your own email address\s*\(([^)]+@[^)]+)\)/i) || err.match(/\(([^)]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})\)/)
      const authorizedTestEmail = sandboxMatch ? sandboxMatch[1].trim() : null

      if (authorizedTestEmail && authorizedTestEmail.toLowerCase() !== to.toLowerCase()) {
        console.warn(`[RESEND_SANDBOX] Domínio não verificado no Resend. Redirecionando e-mail de teste para ${authorizedTestEmail} (Destinatário pretendido: ${to})`)

        const sandboxNotice = `
          <div style="background-color: #451a03; border: 1px solid #b45309; color: #fef3c7; padding: 12px 16px; border-radius: 8px; margin-bottom: 20px; font-size: 13px; line-height: 1.5;">
            <strong>⚠️ [MODO TESTE / SANDBOX RESEND]</strong><br>
            Este e-mail foi originalmente gerado para: <strong>${to}</strong>.<br>
            Como o domínio de envio ainda não foi verificado na sua conta Resend, a mensagem foi entregue na sua conta de desenvolvedor (${authorizedTestEmail}).
          </div>
        `
        const forwardedHtml = html.includes('<body>') 
          ? html.replace('<body>', `<body>${sandboxNotice}`)
          : `${sandboxNotice}${html}`

        const retryRes = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from,
            to: authorizedTestEmail,
            subject: `[TESTE RESEND - ${to}] ${subject}`,
            html: forwardedHtml,
          }),
        })

        const retryData = await retryRes.json()
        if (retryRes.ok) {
          return {
            success: true,
            provider: 'resend',
            sandboxForwarded: true,
            testEmail: authorizedTestEmail,
          }
        }
      }

      return { success: false, error: `Resend: ${err}` }
    }

    return { success: true, provider: 'resend' }
  } catch (err: any) {
    return { success: false, error: err.message || 'Erro ao enviar e-mail via Resend' }
  }
}

/**
 * Envia e-mail formatado para Redefinição de Senha
 * Garante que a mensagem seja enviada diretamente para a caixa postal do usuário solicitante (data.to).
 * Nunca redireciona o link de redefinição para e-mails de desenvolvedor ou modo de teste.
 */
export async function sendPasswordResetEmail(data: {
  to: string
  name: string
  resetLink: string
}): Promise<{ success: boolean; error?: string; provider?: 'smtp' | 'resend'; sandboxForwarded?: boolean; testEmail?: string }> {
  const subject = '🔐 Redefinição de Senha - BarberShop'
  const html = `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <title>Redefinição de Senha</title>
    </head>
    <body bgcolor="#030712" style="margin: 0; padding: 0; background-color: #030712; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #ffffff;">
      <table width="100%" border="0" cellspacing="0" cellpadding="0" bgcolor="#030712" style="background-color: #030712; padding: 40px 16px;">
        <tr>
          <td align="center" bgcolor="#030712">
            <table width="100%" border="0" cellspacing="0" cellpadding="0" bgcolor="#0b0f19" style="max-width: 540px; background-color: #0b0f19; border-radius: 16px; border: 1px solid #1f2937; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.6);">
              <!-- Top Banner / Logo -->
              <tr>
                <td bgcolor="#111827" style="background-color: #111827; padding: 32px 32px 20px 32px; text-align: center; border-bottom: 1px solid #1f2937;">
                  <h1 style="margin: 0; font-size: 24px; font-weight: 800; color: #ffffff !important; letter-spacing: -0.5px;">💈 BarberShop</h1>
                  <p style="margin: 6px 0 0 0; font-size: 13px; color: #ffffff !important; text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">Central de Segurança e Acesso</p>
                </td>
              </tr>

              <!-- Conteúdo -->
              <tr>
                <td bgcolor="#0b0f19" style="padding: 32px; background-color: #0b0f19;">
                  <h2 style="margin: 0 0 16px 0; font-size: 19px; color: #ffffff !important; font-weight: 700;">Olá, ${data.name}!</h2>
                  <p style="margin: 0 0 16px 0; font-size: 15px; line-height: 1.6; color: #ffffff !important;">
                    Recebemos uma solicitação para redefinir a senha da sua conta de acesso ao <strong style="color: #ffffff !important;">BarberShop</strong>.
                  </p>
                  <p style="margin: 0 0 28px 0; font-size: 15px; line-height: 1.6; color: #ffffff !important;">
                    Para criar uma nova senha com segurança, clique no botão abaixo:
                  </p>

                  <!-- Botão de Ação Sólido -->
                  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 28px;">
                    <tr>
                      <td align="center">
                        <a href="${data.resetLink}" target="_blank" style="background-color: #2563eb; color: #ffffff !important; padding: 14px 32px; border-radius: 8px; font-weight: 700; font-size: 14px; text-decoration: none; display: inline-block; border: 1px solid #1d4ed8;">
                          Redefinir Minha Senha
                        </a>
                      </td>
                    </tr>
                  </table>

                  <p style="margin: 0 0 16px 0; font-size: 13px; line-height: 1.5; color: #ffffff !important;">
                    ⏳ <strong style="color: #ffffff !important;">Validade do Link:</strong> Este link é exclusivo e expira em 1 hora por motivos de segurança.
                  </p>

                  <div style="background-color: #111827; border: 1px solid #1f2937; border-radius: 10px; padding: 14px; margin-top: 20px;">
                    <p style="margin: 0; font-size: 12px; color: #ffffff !important; line-height: 1.5;">
                      Se o botão não funcionar, copie e cole o link no seu navegador:<br>
                      <a href="${data.resetLink}" style="color: #ffffff !important; text-decoration: underline; word-break: break-all; font-weight: 600;">${data.resetLink}</a>
                    </p>
                  </div>
                </td>
              </tr>

              <!-- Footer / Alerta de Segurança -->
              <tr>
                <td bgcolor="#070a12" style="padding: 20px 32px; background-color: #070a12; border-top: 1px solid #1f2937; text-align: center;">
                  <p style="margin: 0 0 8px 0; font-size: 12px; color: #ef4444 !important; font-weight: 600;">
                    🔒 Se você não solicitou a redefinição de senha, desconsidere este e-mail. Sua conta continua segura.
                  </p>
                  <p style="margin: 0; font-size: 12px; color: #ffffff !important; font-weight: 500;">
                    BarberShop Cloud • Gestão Inteligente de Barbearias
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

  return sendAlertEmail(subject, html, data.to, undefined, undefined, { allowSandboxFallback: false })
}

// ─────────────────────────────────────────────────────────────
// E-mail de Boas-Vindas para Nova Empresa / Barbearia
// ─────────────────────────────────────────────────────────────

export interface CompanyWelcomeEmailData {
  companyName: string
  adminName: string
  adminEmail: string
  slug?: string | null
  trialDays?: number | null
  trialEndsAt?: string | Date | null
  planName?: string | null
  baseUrl?: string | null
}

/**
 * Envia e-mail caloroso e personalizado de boas-vindas para o proprietário de uma nova empresa.
 * Demonstra entusiasmo com a chegada do novo cliente, orienta os primeiros passos,
 * apresenta os detalhes do plano contratado, canais de suporte e links vitais
 * (link público do slug para os clientes e link de acesso ao painel de login).
 */
export async function sendCompanyWelcomeEmail(data: CompanyWelcomeEmailData): Promise<{
  success: boolean
  error?: string
  provider?: 'smtp' | 'resend'
}> {
  const settings = await getNotificationSettingsAsync()
  const origin = (data.baseUrl || process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').replace(/\/$/, '')
  const publicBookingUrl = data.slug ? `${origin}/b/${data.slug}` : `${origin}/agendar`
  const loginUrl = `${origin}/login`
  const supportEmail = settings.smtpUser || process.env.SMTP_USER || 'swdevelopmentsuporte@gmail.com'
  
  const trialDays = data.trialDays || 7
  let trialDateFormatted = ''
  if (data.trialEndsAt) {
    try {
      trialDateFormatted = new Date(data.trialEndsAt).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })
    } catch {
      trialDateFormatted = ''
    }
  }

  const subject = `🎉 Bem-vindo(a) ao BarberShop, ${data.companyName}! Seu acesso está liberado`

  const html = `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Boas-vindas ao BarberShop</title>
    </head>
    <body bgcolor="#030712" style="margin: 0; padding: 0; background-color: #030712; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #ffffff;">
      <table width="100%" border="0" cellspacing="0" cellpadding="0" bgcolor="#030712" style="background-color: #030712; padding: 40px 16px;">
        <tr>
          <td align="center" bgcolor="#030712">
            <table width="100%" border="0" cellspacing="0" cellpadding="0" bgcolor="#0b0f19" style="max-width: 620px; background-color: #0b0f19; border-radius: 16px; border: 1px solid #1f2937; overflow: hidden; box-shadow: 0 10px 25px rgba(0, 0, 0, 0.6);">
              
              <!-- Header Sólido -->
              <tr>
                <td bgcolor="#111827" style="background-color: #111827; padding: 32px 32px 26px 32px; text-align: center; border-bottom: 1px solid #1f2937;">
                  <span style="background-color: #1f2937; border: 1px solid #374151; color: #ffffff !important; padding: 6px 14px; border-radius: 6px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; display: inline-block; margin-bottom: 14px;">
                    Cadastro Confirmado
                  </span>
                  <h1 style="margin: 0; font-size: 26px; font-weight: 800; color: #ffffff !important; letter-spacing: -0.5px;">
                    💈 BarberShop
                  </h1>
                  <p style="margin: 8px 0 0 0; font-size: 14px; color: #ffffff !important; font-weight: 500;">
                    Plataforma de Gestão e Agendamentos Online
                  </p>
                </td>
              </tr>

              <!-- Conteúdo Principal -->
              <tr>
                <td bgcolor="#0b0f19" style="padding: 36px 32px; background-color: #0b0f19;">
                  
                  <!-- Saudação e Texto de Boas-Vindas 100% Branco Sólido -->
                  <div style="margin-bottom: 26px;">
                    <h2 style="margin: 0 0 14px 0; font-size: 20px; color: #ffffff !important; font-weight: 700;">
                      Olá, ${data.adminName}!
                    </h2>
                    <p style="margin: 0 0 16px 0; font-size: 15px; line-height: 1.6; color: #ffffff !important;">
                      Estamos muito felizes em dar as boas-vindas à <strong style="color: #ffffff !important;">${data.companyName}</strong>! É uma satisfação ter você como nosso cliente e parceiro.
                    </p>
                    <p style="margin: 0; font-size: 15px; line-height: 1.6; color: #ffffff !important;">
                      A partir de agora, seu estabelecimento conta com uma tecnologia moderna e completa para simplificar sua rotina, encantar seus clientes e automatizar seus agendamentos 24 horas por dia.
                    </p>
                  </div>

                  <!-- Cartão do Plano Contratado Sólido -->
                  <div style="background-color: #111827; border: 1px solid #1f2937; border-radius: 12px; padding: 22px; margin-bottom: 28px;">
                    <div style="margin-bottom: 14px;">
                      <strong style="color: #ffffff !important; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px;">Seu Plano e Acesso Liberado</strong>
                    </div>
                    <table width="100%" border="0" cellspacing="0" cellpadding="0" style="font-size: 14px; color: #ffffff !important;">
                      <tr>
                        <td style="padding: 7px 0; color: #ffffff !important;">Plano Ativado:</td>
                        <td align="right" style="padding: 7px 0; font-weight: 700; color: #ffffff !important;">${data.planName || 'Degustação Comercial VIP (Acesso Total)'}</td>
                      </tr>
                      <tr>
                        <td style="padding: 7px 0; color: #ffffff !important;">Período Promocional:</td>
                        <td align="right" style="padding: 7px 0; font-weight: 700; color: #ffffff !important;">${trialDays} dias 100% gratuitos</td>
                      </tr>
                      ${trialDateFormatted ? `
                      <tr>
                        <td style="padding: 7px 0; color: #ffffff !important;">Válido até:</td>
                        <td align="right" style="padding: 7px 0; font-weight: 700; color: #ffffff !important;">${trialDateFormatted}</td>
                      </tr>
                      ` : ''}
                      <tr>
                        <td style="padding: 7px 0; color: #ffffff !important;">Recursos Inclusos:</td>
                        <td align="right" style="padding: 7px 0; font-weight: 700; color: #ffffff !important;">Agendamentos online, equipe, financeiro e relatórios</td>
                      </tr>
                    </table>
                  </div>

                  <!-- Seus Links Principais de Acesso -->
                  <h3 style="margin: 0 0 16px 0; font-size: 17px; color: #ffffff !important; font-weight: 700;">
                    Seus Links Principais de Acesso:
                  </h3>

                  <!-- Link 1: Agendamentos dos Clientes (Slug) -->
                  <div style="background-color: #111827; border: 1px solid #1f2937; border-radius: 12px; padding: 22px; margin-bottom: 18px;">
                    <div style="margin-bottom: 10px;">
                      <span style="font-size: 11px; font-weight: 700; color: #ffffff !important; text-transform: uppercase; letter-spacing: 0.5px;">Link dos seus Clientes</span>
                      <h4 style="margin: 6px 0 0 0; font-size: 16px; color: #ffffff !important; font-weight: 700;">
                        Página Pública de Agendamento Online
                      </h4>
                    </div>
                    <p style="margin: 0 0 16px 0; font-size: 14px; color: #ffffff !important; line-height: 1.6;">
                      Compartilhe este link na Bio do seu Instagram, no status e nas conversas do WhatsApp. Seus clientes vão entrar direto por ele para escolher o profissional, o serviço e marcar horário sem você precisar responder mensagens!
                    </p>
                    <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 14px;">
                      <tr>
                        <td align="center">
                          <a href="${publicBookingUrl}" target="_blank" style="background-color: #059669; color: #ffffff !important; padding: 14px 28px; border-radius: 8px; font-weight: 700; font-size: 14px; text-decoration: none; display: inline-block; border: 1px solid #047857;">
                            Ver Minha Página Pública de Agendamento
                          </a>
                        </td>
                      </tr>
                    </table>
                    <div style="text-align: center; padding-top: 4px;">
                      <span style="font-size: 13px; color: #ffffff !important;">Link Completo: </span>
                      <a href="${publicBookingUrl}" style="color: #ffffff !important; text-decoration: underline; font-size: 13px; word-break: break-all; font-weight: 600;">${publicBookingUrl}</a>
                    </div>
                  </div>

                  <!-- Link 2: Painel Administrativo -->
                  <div style="background-color: #111827; border: 1px solid #1f2937; border-radius: 12px; padding: 22px; margin-bottom: 28px;">
                    <div style="margin-bottom: 10px;">
                      <span style="font-size: 11px; font-weight: 700; color: #ffffff !important; text-transform: uppercase; letter-spacing: 0.5px;">Seu Acesso Administrativo</span>
                      <h4 style="margin: 6px 0 0 0; font-size: 16px; color: #ffffff !important; font-weight: 700;">
                        Painel de Controle da Barbearia
                      </h4>
                    </div>
                    <p style="margin: 0 0 16px 0; font-size: 14px; color: #ffffff !important; line-height: 1.6;">
                      Acesse a plataforma para cadastrar seus serviços, convidar barbeiros da sua equipe e acompanhar os agendamentos e faturamento em tempo real.
                    </p>
                    <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 14px;">
                      <tr>
                        <td align="center">
                          <a href="${loginUrl}" target="_blank" style="background-color: #2563eb; color: #ffffff !important; padding: 14px 28px; border-radius: 8px; font-weight: 700; font-size: 14px; text-decoration: none; display: inline-block; border: 1px solid #1d4ed8;">
                            Entrar no Painel de Controle
                          </a>
                        </td>
                      </tr>
                    </table>
                    <div style="text-align: center; padding-top: 4px;">
                      <span style="font-size: 13px; color: #ffffff !important;">E-mail de Login: </span>
                      <strong style="color: #ffffff !important; font-size: 13px;">${data.adminEmail}</strong>
                    </div>
                  </div>

                  <!-- Primeiros Passos Recomendados -->
                  <div style="background-color: #111827; border-left: 4px solid #2563eb; padding: 20px; border-radius: 0 12px 12px 0; margin-bottom: 28px;">
                    <h4 style="margin: 0 0 12px 0; font-size: 15px; color: #ffffff !important; font-weight: 700;">
                      Passos recomendados para iniciar sua operação:
                    </h4>
                    <ol style="margin: 0; padding-left: 20px; font-size: 14px; color: #ffffff !important; line-height: 1.8;">
                      <li style="color: #ffffff !important; margin-bottom: 8px;">
                        <strong style="color: #ffffff !important;">Cadastre seus Serviços e Preços:</strong>
                        <span style="color: #ffffff !important;"> Defina cortes, barba, sobrancelha e tempo de cada procedimento.</span>
                      </li>
                      <li style="color: #ffffff !important; margin-bottom: 8px;">
                        <strong style="color: #ffffff !important;">Adicione sua Equipe:</strong>
                        <span style="color: #ffffff !important;"> Cadastre seus barbeiros para que cada um tenha seus horários sincronizados.</span>
                      </li>
                      <li style="color: #ffffff !important;">
                        <strong style="color: #ffffff !important;">Divulgue seu Link:</strong>
                        <span style="color: #ffffff !important;"> Coloque o link na bio do seu Instagram e comece a receber agendamentos automáticos hoje mesmo!</span>
                      </li>
                    </ol>
                  </div>

                  <!-- Contato de Suporte Dedicado -->
                  <div style="background-color: #111827; border: 1px solid #1f2937; border-radius: 12px; padding: 20px; text-align: center;">
                    <p style="margin: 0 0 8px 0; font-size: 14px; color: #ffffff !important; font-weight: 700;">
                      Precisa de Ajuda ou Tem Alguma Dúvida?
                    </p>
                    <p style="margin: 0 0 12px 0; font-size: 14px; color: #ffffff !important; line-height: 1.6;">
                      Nossa equipe de suporte está à sua inteira disposição para garantir que a <strong style="color: #ffffff !important;">${data.companyName}</strong> tenha a melhor experiência possível.
                    </p>
                    <p style="margin: 0; font-size: 13px; color: #ffffff !important; font-weight: 600;">
                      E-mail de Suporte: <a href="mailto:${supportEmail}" style="color: #ffffff !important; text-decoration: underline; font-weight: 700;">${supportEmail}</a>
                    </p>
                  </div>

                </td>
              </tr>

              <!-- Footer -->
              <tr>
                <td bgcolor="#070a12" style="padding: 24px 32px; background-color: #070a12; border-top: 1px solid #1f2937; text-align: center;">
                  <p style="margin: 0 0 8px 0; font-size: 14px; color: #ffffff !important; font-weight: 600;">
                    Muito obrigado pela confiança. Desejamos muito sucesso e muitos agendamentos! 🚀
                  </p>
                  <p style="margin: 0; font-size: 13px; color: #ffffff !important; font-weight: 500;">
                    BarberShop Cloud • Gestão Inteligente e Agendamentos Online
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

  return sendAlertEmail(subject, html, data.adminEmail, undefined, undefined, { allowSandboxFallback: false })
}

// ─────────────────────────────────────────────────────────────
// Eventos de Negócio
// ─────────────────────────────────────────────────────────────

function getWhatsAppLink(phone?: string | null): string {
  if (!phone) return ''
  const digits = phone.replace(/\D/g, '')
  if (digits.length >= 10) {
    const fullNumber = digits.startsWith('55') ? digits : `55${digits}`
    return `https://wa.me/${fullNumber}`
  }
  return ''
}

export interface NewRegistrationNotificationData {
  type?: 'COMPANY' | 'CLIENT' | 'TEAM_MEMBER' | string
  name: string
  email?: string | null
  phone?: string | null
  role?: string | null
  // Dados do Estabelecimento / Barbearia
  barbershopName?: string | null
  barbershopEmail?: string | null
  barbershopPhone?: string | null
  barbershopAddress?: string | null
  barbershopSlug?: string | null
  isTrial?: boolean
  trialDays?: number | null
  trialEndsAt?: string | Date | null
  // Origem e auditoria
  origin?: string | null
  ipAddress?: string | null
  userAgent?: string | null
}

/**
 * 1. Notificação de Novo Cadastro (Empresa/Barbearia, Cliente ou Membro de Equipe)
 */
export async function notifyNewRegistration(data: NewRegistrationNotificationData) {
  const settings = await getNotificationSettingsAsync()
  if (!settings.notifyOnNewRegistration) return

  const nowStr = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })
  const isCompany =
    data.type === 'COMPANY' ||
    (data.role && data.role.toUpperCase().includes('ADMIN') && !!data.barbershopName) ||
    Boolean(data.barbershopAddress || data.barbershopEmail)

  const isClient = data.type === 'CLIENT' || data.role === 'CLIENT'

  let title = ''
  let telegramText = ''
  let emailHtml = ''

  if (isCompany) {
    title = `Novo Cadastro de Empresa: ${data.barbershopName || data.name}`
    const adminWaLink = getWhatsAppLink(data.phone)
    const shopWaLink = getWhatsAppLink(data.barbershopPhone)
    const slugStr = data.barbershopSlug ? `/b/${data.barbershopSlug}` : ''

    telegramText =
      `💈 <b>NOVO CADASTRO DE EMPRESA / BARBEARIA</b>\n\n` +
      `🏢 <b>Estabelecimento:</b> <b>${data.barbershopName || 'Não informado'}</b>\n` +
      (data.barbershopEmail ? `📧 <b>E-mail Comercial:</b> <code>${data.barbershopEmail}</code>\n` : '') +
      (data.barbershopPhone
        ? `📞 <b>Telefone Comercial:</b> <code>${data.barbershopPhone}</code>` +
          (shopWaLink ? ` (<a href="${shopWaLink}">WhatsApp</a>)\n` : '\n')
        : '') +
      (data.barbershopAddress ? `📍 <b>Endereço:</b> ${data.barbershopAddress}\n` : '') +
      (slugStr ? `🔗 <b>Link Público:</b> <code>${slugStr}</code>\n` : '') +
      `\n` +
      `👤 <b>Responsável / Admin:</b> ${data.name}\n` +
      (data.email ? `📧 <b>E-mail de Acesso:</b> <code>${data.email}</code>\n` : '') +
      (data.phone
        ? `📱 <b>WhatsApp do Admin:</b> <code>${data.phone}</code>` +
          (adminWaLink ? ` (<a href="${adminWaLink}">Chamar no WhatsApp</a>)\n` : '\n')
        : '') +
      (data.isTrial ? `🎁 <b>Período Trial:</b> ${data.trialDays || 7} dias de teste liberados\n` : '') +
      (data.origin ? `🌐 <b>Origem:</b> ${data.origin}\n` : '') +
      (data.ipAddress ? `💻 <b>IP:</b> <code>${data.ipAddress}</code>\n` : '') +
      `📅 <b>Data/Hora:</b> ${nowStr}`

    emailHtml = `
      <div style="font-family: sans-serif; background: #0f172a; color: #f8fafc; padding: 24px; border-radius: 12px; border: 1px solid #3b82f6;">
        <h2 style="color: #60a5fa; margin-top: 0;">💈 Novo Cadastro de Empresa / Barbearia</h2>
        <p>Um novo estabelecimento acaba de ser registrado na plataforma:</p>
        <div style="background: #1e293b; padding: 16px; border-radius: 8px; margin-bottom: 16px;">
          <h3 style="color: #f8fafc; margin-top: 0;">Dados da Empresa</h3>
          <ul style="line-height: 1.8;">
            <li><strong>Nome do Estabelecimento:</strong> ${data.barbershopName || 'Não informado'}</li>
            ${data.barbershopEmail ? `<li><strong>E-mail Comercial:</strong> ${data.barbershopEmail}</li>` : ''}
            ${data.barbershopPhone ? `<li><strong>Telefone Comercial:</strong> ${data.barbershopPhone}</li>` : ''}
            ${data.barbershopAddress ? `<li><strong>Endereço:</strong> ${data.barbershopAddress}</li>` : ''}
            ${slugStr ? `<li><strong>Link Público:</strong> ${slugStr}</li>` : ''}
            ${data.isTrial ? `<li><strong>Trial:</strong> ${data.trialDays || 7} dias liberados</li>` : ''}
          </ul>
        </div>
        <div style="background: #1e293b; padding: 16px; border-radius: 8px;">
          <h3 style="color: #f8fafc; margin-top: 0;">Dados do Administrador</h3>
          <ul style="line-height: 1.8;">
            <li><strong>Nome:</strong> ${data.name}</li>
            <li><strong>E-mail de Acesso:</strong> ${data.email || 'Não informado'}</li>
            ${data.phone ? `<li><strong>Telefone / WhatsApp:</strong> ${data.phone} ${adminWaLink ? `(<a href="${adminWaLink}" style="color: #22c55e;">Chamar WhatsApp</a>)` : ''}</li>` : ''}
            ${data.origin ? `<li><strong>Origem:</strong> ${data.origin}</li>` : ''}
            <li><strong>Data/Hora:</strong> ${nowStr}</li>
          </ul>
        </div>
      </div>
    `
  } else if (isClient) {
    title = `Novo Cadastro de Cliente: ${data.name}`
    const clientWaLink = getWhatsAppLink(data.phone)

    telegramText =
      `👤 <b>NOVO CADASTRO DE CLIENTE</b>\n\n` +
      `👤 <b>Nome do Cliente:</b> <b>${data.name}</b>\n` +
      (data.email ? `📧 <b>E-mail:</b> <code>${data.email}</code>\n` : '') +
      (data.phone
        ? `📱 <b>Contato / WhatsApp:</b> <code>${data.phone}</code>` +
          (clientWaLink ? ` (<a href="${clientWaLink}">Chamar no WhatsApp</a>)\n` : '\n')
        : `📱 <b>Contato:</b> <i>Sem telefone cadastrado</i>\n`) +
      (data.barbershopName ? `💈 <b>Empresa / Barbearia:</b> <b>${data.barbershopName}</b>\n` : '') +
      (data.origin ? `🌐 <b>Origem:</b> ${data.origin}\n` : '') +
      (data.ipAddress ? `💻 <b>IP:</b> <code>${data.ipAddress}</code>\n` : '') +
      `📅 <b>Data/Hora:</b> ${nowStr}`

    emailHtml = `
      <div style="font-family: sans-serif; background: #0f172a; color: #f8fafc; padding: 24px; border-radius: 12px; border: 1px solid #10b981;">
        <h2 style="color: #10b981; margin-top: 0;">👤 Novo Cadastro de Cliente</h2>
        <p>Um novo cliente se cadastrou na plataforma:</p>
        <ul style="line-height: 1.8;">
          <li><strong>Nome:</strong> ${data.name}</li>
          ${data.email ? `<li><strong>E-mail:</strong> ${data.email}</li>` : ''}
          ${data.phone ? `<li><strong>Telefone / WhatsApp:</strong> ${data.phone} ${clientWaLink ? `(<a href="${clientWaLink}" style="color: #22c55e;">Chamar WhatsApp</a>)` : ''}</li>` : ''}
          ${data.barbershopName ? `<li><strong>Empresa Vinculada:</strong> ${data.barbershopName}</li>` : ''}
          ${data.origin ? `<li><strong>Origem:</strong> ${data.origin}</li>` : ''}
          <li><strong>Data/Hora:</strong> ${nowStr}</li>
        </ul>
      </div>
    `
  } else {
    title = `Novo Profissional na Equipe: ${data.name} (${data.role || 'Equipe'})`
    const memberWaLink = getWhatsAppLink(data.phone)

    telegramText =
      `✂️ <b>NOVO PROFISSIONAL NA EQUIPE</b>\n\n` +
      `👤 <b>Nome:</b> <b>${data.name}</b>\n` +
      `🏷️ <b>Cargo / Perfil:</b> ${data.role || 'Profissional'}\n` +
      (data.email ? `📧 <b>E-mail:</b> <code>${data.email}</code>\n` : '') +
      (data.phone
        ? `📱 <b>WhatsApp:</b> <code>${data.phone}</code>` +
          (memberWaLink ? ` (<a href="${memberWaLink}">Chamar no WhatsApp</a>)\n` : '\n')
        : '') +
      (data.barbershopName ? `💈 <b>Empresa / Barbearia:</b> <b>${data.barbershopName}</b>\n` : '') +
      (data.origin ? `🌐 <b>Origem:</b> ${data.origin}\n` : '') +
      `📅 <b>Data/Hora:</b> ${nowStr}`

    emailHtml = `
      <div style="font-family: sans-serif; background: #0f172a; color: #f8fafc; padding: 24px; border-radius: 12px; border: 1px solid #8b5cf6;">
        <h2 style="color: #a78bfa; margin-top: 0;">✂️ Novo Profissional na Equipe</h2>
        <ul style="line-height: 1.8;">
          <li><strong>Nome:</strong> ${data.name}</li>
          <li><strong>Cargo:</strong> ${data.role || 'Profissional'}</li>
          ${data.email ? `<li><strong>E-mail:</strong> ${data.email}</li>` : ''}
          ${data.phone ? `<li><strong>WhatsApp:</strong> ${data.phone} ${memberWaLink ? `(<a href="${memberWaLink}" style="color: #22c55e;">Chamar WhatsApp</a>)` : ''}</li>` : ''}
          ${data.barbershopName ? `<li><strong>Empresa:</strong> ${data.barbershopName}</li>` : ''}
          ${data.origin ? `<li><strong>Origem:</strong> ${data.origin}</li>` : ''}
          <li><strong>Data/Hora:</strong> ${nowStr}</li>
        </ul>
      </div>
    `
  }

  let success = false
  let errorMsg = ''

  if (settings.telegramEnabled) {
    const res = await sendTelegramMessage(telegramText)
    if (res.success) success = true
    else errorMsg += `Telegram: ${res.error}; `
  }

  if (settings.emailEnabled) {
    const res = await sendAlertEmail(title, emailHtml)
    if (res.success) success = true
    else errorMsg += `Email: ${res.error}; `
  }

  recordAlert({
    channel: 'ALL',
    eventType: 'NEW_REGISTRATION',
    title,
    message: isCompany
      ? `Nova empresa cadastrada: ${data.barbershopName || data.name} (Admin: ${data.name} - ${data.email}).`
      : `${data.name} (${data.email || 'sem email'}) cadastrado como ${data.role || (isClient ? 'CLIENT' : 'USER')}.`,
    status: success || (!settings.telegramEnabled && !settings.emailEnabled) ? 'SUCCESS' : 'FAILED',
    error: errorMsg || undefined,
  })
}

/**
 * 2. Notificação de Erro de Senha / Falha de Autenticação
 */
export async function notifyFailedPasswordAttempt(data: {
  email: string
  ipAddress?: string | null
  userAgent?: string | null
  reason?: string
  clientName?: string | null
  clientPhone?: string | null
  barbershopName?: string | null
  role?: string | null
}) {
  const settings = await getNotificationSettingsAsync()
  if (!settings.notifyOnPasswordError) return

  let name = data.clientName || null
  let phone = data.clientPhone || null
  let role = data.role || null
  let barbershop = data.barbershopName || null

  try {
    const normalizedEmail = data.email.toLowerCase().trim()
    const userRecord = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      include: {
        barbershop: { select: { name: true, phone: true } },
      },
    })

    if (userRecord) {
      if (!name) name = userRecord.name
      if (!phone) phone = userRecord.phone
      if (!role) role = userRecord.role
      if (!barbershop && userRecord.barbershop) barbershop = userRecord.barbershop.name
    }

    // Se ainda não encontrou telefone ou nome, pesquisa na tabela Client
    if (!phone || !name) {
      const clientRecord = await prisma.client.findFirst({
        where: {
          OR: [
            { email: normalizedEmail },
            ...(userRecord ? [{ userId: userRecord.id }] : []),
          ],
        },
        include: {
          barbershop: { select: { name: true, phone: true } },
        },
      })

      if (clientRecord) {
        if (!name) name = clientRecord.name
        if (!phone) phone = clientRecord.phone
        if (!barbershop && clientRecord.barbershop) barbershop = clientRecord.barbershop.name
        if (!role) role = 'CLIENT'
      }
    }
  } catch (lookupErr) {
    console.warn('Erro ao consultar dados do cliente para notificação de erro de senha:', lookupErr)
  }

  const nowStr = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })
  const title = `Alerta de Senha Incorreta: ${name ? `${name} (${data.email})` : data.email}`
  const waLink = getWhatsAppLink(phone)

  let contactLines = ''
  if (name || phone || barbershop) {
    contactLines =
      `👤 <b>Nome:</b> ${name || 'Não informado'}\n` +
      (role ? `🏷️ <b>Perfil:</b> ${role}\n` : '') +
      (phone
        ? `📱 <b>Contato / WhatsApp:</b> <code>${phone}</code>` +
          (waLink ? ` (<a href="${waLink}">Chamar no WhatsApp</a>)\n` : '\n')
        : `📱 <b>Contato:</b> <i>Sem telefone cadastrado</i>\n`) +
      (barbershop ? `💈 <b>Barbearia:</b> ${barbershop}\n` : '')
  } else {
    contactLines = `👤 <b>Cadastro:</b> <i>E-mail não localizado na base de dados</i>\n`
  }

  const telegramText =
    `⚠️ <b>TENTATIVA DE LOGIN COM SENHA INCORRETA</b>\n\n` +
    `🎯 <b>E-mail Alvo:</b> <code>${data.email}</code>\n` +
    contactLines +
    `🌐 <b>IP do Cliente:</b> <code>${data.ipAddress || '127.0.0.1'}</code>\n` +
    (data.userAgent ? `💻 <b>Dispositivo:</b> <i>${data.userAgent.slice(0, 100)}</i>\n` : '') +
    `📅 <b>Data/Hora:</b> ${nowStr}\n\n` +
    `<i>Se houver insistência, verifique possíveis ataques de força bruta no Audit Log.</i>`

  const emailHtml = `
    <div style="font-family: sans-serif; background: #1e1b4b; color: #f8fafc; padding: 24px; border-radius: 12px; border: 1px solid #ef4444;">
      <h2 style="color: #ef4444; margin-top: 0;">⚠️ Tentativa de Login com Senha Incorreta</h2>
      <p>Uma tentativa de acesso falhou devido a credenciais inválidas:</p>
      <ul>
        <li><strong>E-mail Alvo:</strong> ${data.email}</li>
        ${name ? `<li><strong>Nome do Cliente:</strong> ${name}</li>` : ''}
        ${role ? `<li><strong>Perfil:</strong> ${role}</li>` : ''}
        ${phone ? `<li><strong>Contato:</strong> ${phone} ${waLink ? `(<a href="${waLink}" style="color: #22c55e;">Abrir WhatsApp</a>)` : ''}</li>` : ''}
        ${barbershop ? `<li><strong>Barbearia:</strong> ${barbershop}</li>` : ''}
        <li><strong>Endereço IP:</strong> ${data.ipAddress || 'Desconhecido'}</li>
        <li><strong>Dispositivo:</strong> ${data.userAgent || 'Desconhecido'}</li>
        <li><strong>Horário:</strong> ${nowStr}</li>
      </ul>
      <p style="color: #ffffff; font-size: 12px;">Esta notificação foi emitida pelo sistema de segurança e monitoramento do BarberShop.</p>
    </div>
  `

  let success = false
  let errorMsg = ''

  if (settings.telegramEnabled) {
    const res = await sendTelegramMessage(telegramText)
    if (res.success) success = true
    else errorMsg += `Telegram: ${res.error}; `
  }

  if (settings.emailEnabled) {
    const res = await sendAlertEmail(title, emailHtml)
    if (res.success) success = true
    else errorMsg += `Email: ${res.error}; `
  }

  recordAlert({
    channel: 'ALL',
    eventType: 'PASSWORD_ERROR',
    title,
    message: `Falha de autenticação para ${name ? `${name} (${data.email})` : data.email} vindo de IP ${data.ipAddress || '127.0.0.1'}.`,
    status: success || (!settings.telegramEnabled && !settings.emailEnabled) ? 'SUCCESS' : 'FAILED',
    error: errorMsg || undefined,
  })
}

/**
 * 3. Notificação de Alteração de Status da Conta / Reset de Trial
 */
export async function notifyAccountStatusChange(data: {
  barbershopName: string
  email: string
  oldStatus?: string
  newStatus: string
  reason?: string
}) {
  const settings = await getNotificationSettingsAsync()
  if (!settings.notifyOnStatusChange) return

  const nowStr = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })
  const title = `Status Alterado: ${data.barbershopName} -> ${data.newStatus}`

  const telegramText = `🔄 <b>STATUS DA CONTA ATUALIZADO</b>\n\n` +
    `💈 <b>Barbearia:</b> ${data.barbershopName}\n` +
    `📧 <b>E-mail:</b> <code>${data.email}</code>\n` +
    (data.oldStatus ? `📋 <b>Status Anterior:</b> ${data.oldStatus}\n` : '') +
    `📌 <b>Novo Status:</b> <b>${data.newStatus}</b>\n` +
    (data.reason ? `📝 <b>Motivo:</b> ${data.reason}\n` : '') +
    `📅 <b>Data/Hora:</b> ${nowStr}`

  const emailHtml = `
    <div style="font-family: sans-serif; background: #0f172a; color: #f8fafc; padding: 24px; border-radius: 12px; border: 1px solid #3b82f6;">
      <h2 style="color: #3b82f6; margin-top: 0;">🔄 Alteração de Status da Conta</h2>
      <p>O status de um estabelecimento foi modificado na plataforma:</p>
      <ul>
        <li><strong>Barbearia:</strong> ${data.barbershopName}</li>
        <li><strong>E-mail:</strong> ${data.email}</li>
        ${data.oldStatus ? `<li><strong>Status Anterior:</strong> ${data.oldStatus}</li>` : ''}
        <li><strong>Novo Status:</strong> <strong>${data.newStatus}</strong></li>
        ${data.reason ? `<li><strong>Motivo / Observações:</strong> ${data.reason}</li>` : ''}
        <li><strong>Data/Hora:</strong> ${nowStr}</li>
      </ul>
    </div>
  `

  let success = false
  let errorMsg = ''

  if (settings.telegramEnabled) {
    const res = await sendTelegramMessage(telegramText)
    if (res.success) success = true
    else errorMsg += `Telegram: ${res.error}; `
  }

  if (settings.emailEnabled) {
    const res = await sendAlertEmail(title, emailHtml)
    if (res.success) success = true
    else errorMsg += `Email: ${res.error}; `
  }

  recordAlert({
    channel: 'ALL',
    eventType: 'STATUS_CHANGE',
    title,
    message: `${data.barbershopName}: status alterado para ${data.newStatus}.`,
    status: success || (!settings.telegramEnabled && !settings.emailEnabled) ? 'SUCCESS' : 'FAILED',
    error: errorMsg || undefined,
  })
}
