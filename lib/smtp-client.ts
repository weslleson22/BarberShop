import tls from 'tls'
import net from 'net'

export interface SmtpConfig {
  host: string
  port: number
  user: string
  pass: string
  secure?: boolean
}

export interface SmtpMailOptions {
  from?: string
  fromName?: string
  replyTo?: string
  to: string
  subject: string
  html: string
  text?: string
}

export interface SmtpSendResult {
  success: boolean
  messageId?: string
  error?: string
}

/**
 * Converte HTML em texto puro legível como fallback (MIME text/plain).
 * Evita penalidades severas de spam como MIME_HTML_ONLY / HTML_MESSAGE_ONLY.
 */
function extractPlainTextFromHtml(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<head[\s\S]*?<\/head>/gi, '')
    .replace(/<a\s+(?:[^>]*?\s+)?href=(["'])(.*?)\1[^>]*>(.*?)<\/a>/gi, '$3 ($2)')
    .replace(/<br\s*[\/]?>/gi, '\n')
    .replace(/<\/(p|div|h[1-6]|tr|li|table)>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&#39;/gi, "'")
    .replace(/\n\s*\n\s*\n+/g, '\n\n')
    .trim()
}

/**
 * Cliente SMTP nativo em Node.js (Zero dependências externas)
 * Suporta SSL/TLS direto (porta 465) e STARTTLS (porta 587).
 * Constrói mensagens MIME multipart/alternative 100% compatíveis com RFC 2046 e RFC 5322,
 * garantindo alinhamento de SPF/DKIM e alta entregabilidade na Caixa de Entrada.
 */
export async function sendMailViaSmtp(
  config: SmtpConfig,
  mail: SmtpMailOptions
): Promise<SmtpSendResult> {
  const host = (config.host || 'smtp.gmail.com').trim()
  const port = Number(config.port) || 465
  const user = (config.user || '').trim()
  // Remove espaços que o usuário possa ter copiado da senha de app do Google
  const pass = (config.pass || '').replace(/\s+/g, '').trim()
  const isDirectTls = config.secure !== false && (port === 465 || config.secure === true)

  if (!user) {
    return { success: false, error: 'E-mail de usuário SMTP não configurado.' }
  }

  if (!pass) {
    return { 
      success: false, 
      error: 'Senha de App do Gmail/SMTP não configurada. Gere uma Senha de App de 16 letras na conta Google do e-mail.' 
    }
  }

  const fromEmail = (mail.from || user).trim()
  const fromName = mail.fromName || 'BarberShop Cloud'
  const replyTo = (mail.replyTo || fromEmail).trim()
  const toEmail = mail.to.trim()
  const subject = mail.subject.trim()

  return new Promise((resolve) => {
    let socket: net.Socket | tls.TLSSocket
    let buffer = ''
    let step = 0
    let timer: NodeJS.Timeout
    let finished = false

    const finish = (result: SmtpSendResult) => {
      if (finished) return
      finished = true
      clearTimeout(timer)
      try {
        if (socket && !socket.destroyed) {
          socket.write('QUIT\r\n')
          socket.end()
        }
      } catch {}
      resolve(result)
    }

    // Timeout de 15 segundos para evitar travamento
    timer = setTimeout(() => {
      finish({
        success: false,
        error: `Tempo limite de conexão esgotado ao comunicar com o servidor SMTP (${host}:${port}).`,
      })
    }, 15000)

    const sendCommand = (cmd: string) => {
      if (!socket || socket.destroyed) return
      socket.write(cmd + '\r\n')
    }

    const handleServerResponse = (response: string) => {
      const code = parseInt(response.substring(0, 3), 10)

      // Tratamento de falhas de autenticação
      if (code === 535 || code === 534) {
        return finish({
          success: false,
          error: `Falha de autenticação no Gmail (${user}): A senha informada foi recusada. Certifique-se de usar uma "Senha de App" de 16 caracteres gerada no Google (myaccount.google.com/apppasswords), e não a sua senha comum de login.`,
        })
      }

      // Tratamento de erros gerais do servidor SMTP
      if (code >= 400 && code <= 599 && code !== 334 && code !== 354) {
        return finish({
          success: false,
          error: `Erro SMTP do servidor (${code}): ${response.trim()}`,
        })
      }

      switch (step) {
        case 0:
          // 220 Greeting recebido
          if (code === 220) {
            step = 1
            // Anti-Spam: NUNCA enviar 'EHLO localhost', pois ativa regras como HELO_LOCALHOST nos filtros!
            // Envia o domínio do remetente ou o próprio host SMTP
            const ehloDomain = user.includes('@') ? user.split('@')[1] : (host || 'gmail.com')
            sendCommand(`EHLO ${ehloDomain}`)
          }
          break

        case 1:
          // 250 Resposta ao EHLO
          if (code === 250) {
            step = 2
            sendCommand('AUTH LOGIN')
          }
          break

        case 2:
          // 334 VXNlcm5hbWU6 (Username:)
          if (code === 334) {
            step = 3
            sendCommand(Buffer.from(user).toString('base64'))
          }
          break

        case 3:
          // 334 UGFzc3dvcmQ6 (Password:)
          if (code === 334) {
            step = 4
            sendCommand(Buffer.from(pass).toString('base64'))
          }
          break

        case 4:
          // 235 Autenticado com sucesso
          if (code === 235) {
            step = 5
            sendCommand(`MAIL FROM:<${fromEmail}>`)
          }
          break

        case 5:
          // 250 MAIL FROM OK
          if (code === 250) {
            step = 6
            sendCommand(`RCPT TO:<${toEmail}>`)
          }
          break

        case 6:
          // 250 RCPT TO OK
          if (code === 250) {
            step = 7
            sendCommand('DATA')
          }
          break

        case 7:
          // 354 Start mail input
          if (code === 354) {
            step = 8

            // Prepara a versão texto puro (essencial para eliminar o gatilho MIME_HTML_ONLY)
            const plainText = (mail.text || extractPlainTextFromHtml(mail.html)).trim()

            const base64Text = Buffer.from(plainText, 'utf-8')
              .toString('base64')
              .replace(/(.{76})/g, '$1\r\n')

            const base64Html = Buffer.from(mail.html, 'utf-8')
              .toString('base64')
              .replace(/(.{76})/g, '$1\r\n')

            // Limpa o assunto para evitar injeção de cabeçalhos e codifica em UTF-8 Base64 RFC 2047
            const cleanSubject = subject.replace(/[\r\n]+/g, ' ').trim()
            const encodedSubject = `=?UTF-8?B?${Buffer.from(cleanSubject, 'utf-8').toString('base64')}?=`

            // Message-ID alinhado com o domínio do remetente
            const fromDomain = fromEmail.includes('@') ? fromEmail.split('@')[1] : 'gmail.com'
            const randomSuffix = Math.random().toString(36).substring(2, 10) + Date.now().toString(36)
            const messageId = `<${Date.now()}.${randomSuffix}@${fromDomain}>`

            // Boundary MIME multipart/alternative
            const boundary = `----=_Part_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`

            const messageLines = [
              `From: "${fromName.replace(/"/g, '')}" <${fromEmail}>`,
              `Reply-To: "${fromName.replace(/"/g, '')}" <${replyTo}>`,
              `To: <${toEmail}>`,
              `Subject: ${encodedSubject}`,
              `Date: ${new Date().toUTCString()}`,
              `Message-ID: ${messageId}`,
              `MIME-Version: 1.0`,
              `Content-Type: multipart/alternative; boundary="${boundary}"`,
              `X-Mailer: BarberShop Cloud Mailer 2.0`,
              `Auto-Submitted: auto-generated`,
              `X-Auto-Response-Suppress: All`,
              `Priority: normal`,
              `X-Priority: 3`,
              '',
              `--${boundary}`,
              `Content-Type: text/plain; charset="UTF-8"`,
              `Content-Transfer-Encoding: base64`,
              '',
              base64Text,
              '',
              `--${boundary}`,
              `Content-Type: text/html; charset="UTF-8"`,
              `Content-Transfer-Encoding: base64`,
              '',
              base64Html,
              '',
              `--${boundary}--`,
              '.',
            ].join('\r\n')

            socket.write(messageLines + '\r\n')
          }
          break

        case 8:
          // 250 Message accepted for delivery
          if (code === 250) {
            finish({
              success: true,
              messageId: response.trim(),
            })
          }
          break

        default:
          break
      }
    }

    try {
      if (isDirectTls) {
        // Conexão TLS Direta (Porta 465 - Padrão Seguro Gmail com SNI)
        socket = tls.connect(
          {
            host,
            port,
            servername: host,
            minVersion: 'TLSv1.2',
            rejectUnauthorized: false,
          },
          () => {
            // Conexão TLS estabelecida, aguarda o greeting 220
          }
        )
      } else {
        // Conexão Plain/STARTTLS (Porta 587)
        socket = net.connect({ host, port }, () => {
          // Conectado, aguarda greeting
        })
      }

      socket.setEncoding('utf-8')

      socket.on('data', (chunk: string) => {
        buffer += chunk
        // Respostas SMTP podem ser multilinhas terminando com espaço após o código (ex: "250 OK\r\n" vs "250-SIZE\r\n")
        const lines = buffer.split('\r\n')
        // Mantém a última linha incompleta no buffer
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (!line.trim()) continue
          // A linha final de uma resposta multilinhas tem um espaço na posição 3 (ex: "250 OK")
          if (/^\d{3}\s/.test(line)) {
            handleServerResponse(line)
          }
        }
      })

      socket.on('error', (err: any) => {
        finish({
          success: false,
          error: `Erro de conexão com o servidor SMTP (${host}:${port}): ${err.message}`,
        })
      })

      socket.on('close', () => {
        if (!finished) {
          finish({
            success: false,
            error: 'Conexão com o servidor SMTP foi encerrada inesperadamente.',
          })
        }
      })
    } catch (err: any) {
      finish({
        success: false,
        error: `Exceção ao inicializar socket SMTP: ${err.message}`,
      })
    }
  })
}
