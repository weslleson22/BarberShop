import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hashPassword, verifyPasswordResetToken } from '@/lib/auth'
import { SessionManager } from '@/lib/session-manager'
import { createAuditLog, extractRequestContext } from '@/lib/audit-log'
import { AuditAction, AuditEntity } from '@prisma/client'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { token, password } = body

    if (!token) {
      return NextResponse.json({ error: 'Token de redefinição não fornecido' }, { status: 400 })
    }

    if (!password || password.trim().length < 6) {
      return NextResponse.json({ error: 'A nova senha deve ter pelo menos 6 caracteres' }, { status: 400 })
    }

    // 1. Validar e decodificar token assinado
    let payload: { userId: string; email: string }
    try {
      payload = verifyPasswordResetToken(token)
    } catch (err: any) {
      const isExpired = err?.name === 'TokenExpiredError'
      return NextResponse.json(
        {
          error: isExpired
            ? 'Este link de redefinição expirou. Por favor, solicite um novo link na página de login.'
            : 'Link de redefinição inválido ou corrompido.',
        },
        { status: 400 }
      )
    }

    // 2. Localizar usuário no banco
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        email: true,
        name: true,
        barbershopId: true,
        isActive: true,
      },
    })

    if (!user) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })
    }

    if (!user.isActive) {
      return NextResponse.json({ error: 'Conta inativa ou suspensa. Contate o suporte.' }, { status: 403 })
    }

    // 3. Criptografar nova senha com Bcrypt
    const hashedPassword = await hashPassword(password.trim())

    // 4. Atualizar no banco de dados
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
      },
    })

    // 5. Encerrar sessões ativas antigas por segurança
    try {
      SessionManager.disconnectUser(user.id)
    } catch {}

    // 6. Auditoria
    const ctx = extractRequestContext(request)
    await createAuditLog({
      userId: user.id,
      barbershopId: user.barbershopId || null,
      action: AuditAction.UPDATE,
      entity: AuditEntity.USER,
      entityId: user.id,
      success: true,
      metadata: {
        type: 'PASSWORD_RESET_SUCCESS',
        email: user.email,
        source: 'self_service_email_reset',
      },
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    })

    return NextResponse.json({
      success: true,
      message: 'Senha redefinida com sucesso! Você já pode entrar com a nova senha.',
    })
  } catch (error: any) {
    console.error('Error in reset-password API:', error)
    return NextResponse.json(
      { error: error.message || 'Erro ao redefinir senha' },
      { status: 500 }
    )
  }
}
