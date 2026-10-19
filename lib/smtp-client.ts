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
  to: string
  subject: string
  html: string
}

export interface SmtpSendResult {
  success: boolean
  messageId?: string
  error?: string
}

/**
 * Cliente SMTP nativo em Node.js (Zero dependências externas)
 * Suporta SSL/TLS direto (porta 465) e STARTTLS (porta 587)
 */
export async function sendMailViaSmtp(
  config: SmtpConfig,
  mail: SmtpMailOptions
): Promise<SmtpSendResult> {
  const host = (config.host || 'smtp.gmail.com').trim()
  const port = Number(config.port) || 465
  const user = (config.user || '').trim()
  // Remove espaços que o usuário possa ter copiado da senha de app do Google (ex: "abcd efgh ijkl mnop" -> "abcdefghijklmnop")
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
  const fromName = mail.fromName || 'BarberShop'
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
            sendCommand(`EHLO localhost`)
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

            const base64Body = Buffer.from(mail.html, 'utf-8')
              .toString('base64')
              .replace(/(.{76})/g, '$1\r\n')
            const encodedSubject = `=?UTF-8?B?${Buffer.from(subject).toString('base64')}?=`
            const messageId = `<${Date.now()}.${Math.random().toString(36).substring(2)}@${host}>`

            const messageLines = [
              `From: "${fromName}" <${fromEmail}>`,
              `To: <${toEmail}>`,
              `Subject: ${encodedSubject}`,
              `Date: ${new Date().toUTCString()}`,
              `Message-ID: ${messageId}`,
              `MIME-Version: 1.0`,
              `Content-Type: text/html; charset="UTF-8"`,
              `Content-Transfer-Encoding: base64`,
              '',
              base64Body,
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
