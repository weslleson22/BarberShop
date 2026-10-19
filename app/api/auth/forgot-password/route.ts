import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { generatePasswordResetToken } from '@/lib/auth'
import { sendPasswordResetEmail } from '@/lib/external-notifications'
import { createAuditLog, extractRequestContext } from '@/lib/audit-log'
import { AuditAction, AuditEntity } from '@prisma/client'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const rawEmail = (body.email || '').trim().toLowerCase()

    if (!rawEmail) {
      return NextResponse.json({ error: 'Informe seu e-mail para continuar' }, { status: 400 })
    }

    const ctx = extractRequestContext(request)

    // Busca o usuário na base de dados
    const user = await prisma.user.findUnique({
      where: { email: rawEmail },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        barbershopId: true,
        isActive: true,
      },
    })

    // Mensagem amigável padrão (evita enumeração de e-mails de acordo com OWASP)
    const genericSuccessMessage = 'Se o e-mail estiver cadastrado, você receberá as instruções para redefinir sua senha em instantes. Verifique sua caixa de entrada e spam.'

    if (!user) {
      console.log(`[FORGOT_PASSWORD] E-mail não encontrado no banco: ${rawEmail}`)
      return NextResponse.json({
        success: true,
        message: genericSuccessMessage,
      })
    }

    if (!user.isActive) {
      return NextResponse.json(
        { error: 'Esta conta está inativa ou suspensa. Entre em contato com o suporte.' },
        { status: 403 }
      )
    }

    // Gerar token seguro JWT assinado válido por 1 hora
    const resetToken = generatePasswordResetToken(user.id, user.email)

    // Determinar URL base de redefinição
    const host = request.headers.get('x-forwarded-host') || request.headers.get('host')
    const proto = request.headers.get('x-forwarded-proto') || (host && !host.includes('localhost') ? 'https' : 'http')
    const derivedOrigin = host ? `${proto}://${host}` : null

    const origin =
      request.headers.get('origin') ||
      derivedOrigin ||
      (request.headers.get('referer') ? new URL(request.headers.get('referer')!).origin : null) ||
      process.env.NEXTAUTH_URL ||
      process.env.NEXT_PUBLIC_APP_URL ||
      'http://localhost:3000'

    const resetLink = `${origin}/reset-password?token=${encodeURIComponent(resetToken)}`

    // Envio do e-mail diretamente para a caixa de entrada do usuário
    const emailResult = await sendPasswordResetEmail({
      to: user.email,
      name: user.name,
      resetLink,
    })

    // Registrar no log de auditoria
    await createAuditLog({
      userId: user.id,
      barbershopId: user.barbershopId || null,
      action: AuditAction.UPDATE,
      entity: AuditEntity.USER,
      entityId: user.id,
      success: emailResult.success,
      errorMessage: emailResult.error || undefined,
      metadata: {
        type: 'PASSWORD_RESET_REQUESTED',
        email: user.email,
        emailSent: emailResult.success,
      },
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    })

    if (!emailResult.success) {
      console.error('[FORGOT_PASSWORD] Erro ao disparar e-mail:', emailResult.error)
      return NextResponse.json(
        {
          success: false,
          error: `Falha no envio de e-mail: ${emailResult.error}`,
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: genericSuccessMessage,
    })
  } catch (error: any) {
    console.error('Error in forgot-password API:', error)
    return NextResponse.json(
      { error: error.message || 'Erro ao processar solicitação de redefinição de senha' },
      { status: 500 }
    )
  }
}
