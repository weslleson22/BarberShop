import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser, requireRole } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'
import { hashPassword, generateToken } from '@/lib/auth'
import { SessionManager } from '@/lib/session-manager'
import { createAuditLog, extractRequestContext } from '@/lib/audit-log'
import { AuditAction, AuditEntity } from '@prisma/client'
import crypto from 'crypto'

export const dynamic = 'force-dynamic'
export const revalidate = 0

// Função auxiliar para gerar senha temporária legível e segura
function generateSecurePassword(): string {
  const charsUpper = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
  const charsLower = 'abcdefghijkmnopqrstuvwxyz'
  const numbers = '23456789'
  const symbols = '!@#$%&*'

  const getRandom = (str: string) => str.charAt(Math.floor(Math.random() * str.length))

  const parts = [
    getRandom(charsUpper),
    getRandom(charsLower),
    getRandom(charsLower),
    getRandom(numbers),
    getRandom(numbers),
    getRandom(numbers),
    getRandom(symbols),
  ]

  // Embaralha
  return 'Barber' + parts.sort(() => 0.5 - Math.random()).join('') + '!'
}

// GET - Listar credenciais de usuários (Acesso restrito ao DEVELOPER)
export async function GET(request: NextRequest) {
  try {
    const admin = getAuthUser(request)
    if (!requireRole(admin, ['DEVELOPER'])) {
      return NextResponse.json({ error: 'Acesso restrito ao desenvolvedor administrador' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const roleParam = searchParams.get('role')
    const search = searchParams.get('search')
    const shopId = searchParams.get('barbershopId')

    const where: any = {}

    if (roleParam && roleParam !== 'ALL') {
      where.role = roleParam
    }

    if (shopId && shopId !== 'ALL') {
      where.barbershopId = shopId
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search } },
        { barbershop: { name: { contains: search, mode: 'insensitive' } } },
      ]
    }

    const users = await prisma.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        phone: true,
        isActive: true,
        createdAt: true,
        avatar: true,
        barbershopId: true,
        barbershop: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    })

    const enriched = users.map((u) => {
      const activeSession = SessionManager.getActiveSession(u.id)
      return {
        ...u,
        hasActiveSession: Boolean(activeSession),
        lastActive: activeSession?.lastActive || null,
        hashAlgorithm: 'Bcrypt (Salt 10 Rounds - SHA-512 Seguro)',
      }
    })

    return NextResponse.json({ users: enriched })
  } catch (error) {
    console.error('Error listing credentials:', error)
    return NextResponse.json({ error: 'Erro ao consultar credenciais' }, { status: 500 })
  }
}

// POST - Gerenciar / Resetar Senha / Impersonação (Acesso restrito ao DEVELOPER)
export async function POST(request: NextRequest) {
  try {
    const admin = getAuthUser(request)
    if (!requireRole(admin, ['DEVELOPER'])) {
      return NextResponse.json({ error: 'Acesso restrito ao desenvolvedor administrador' }, { status: 403 })
    }

    const body = await request.json()
    const { action, userId, customPassword } = body

    if (!userId) {
      return NextResponse.json({ error: 'ID do usuário é obrigatório' }, { status: 400 })
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        barbershop: { select: { id: true, name: true, slug: true } },
      },
    })

    if (!targetUser) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })
    }

    const ctx = extractRequestContext(request)

    // AÇÃO 1: Redefinir / Gerar Nova Senha Temporária
    if (action === 'reset_password') {
      const newPassword = (customPassword && customPassword.trim())
        ? customPassword.trim()
        : generateSecurePassword()

      const hashedPassword = await hashPassword(newPassword)

      await prisma.user.update({
        where: { id: userId },
        data: {
          password: hashedPassword,
        },
      })

      // Invalida sessões ativas do usuário para exigir reautenticação
      SessionManager.disconnectUser(userId)

      await createAuditLog({
        userId: admin.id,
        barbershopId: targetUser.barbershopId,
        action: AuditAction.PASSWORD_CHANGED,
        entity: AuditEntity.USER,
        entityId: targetUser.id,
        success: true,
        metadata: {
          reason: 'Senha redefinida pelo painel administrativo restrito',
          targetEmail: targetUser.email,
          targetRole: targetUser.role,
          changedBy: admin.email,
        },
        ipAddress: ctx.ipAddress,
        userAgent: ctx.userAgent,
      })

      // Tenta enviar alerta externo de segurança
      try {
        const { notifyAccountStatusChange } = await import('@/lib/external-notifications')
        await notifyAccountStatusChange({
          barbershopName: targetUser.barbershop?.name || 'Geral',
          email: targetUser.email,
          oldStatus: 'Senha anterior',
          newStatus: 'Nova senha gerada pelo suporte',
          reason: `Credencial gerada por ${admin.name} (${admin.email})`,
        })
      } catch (e) {
        console.warn('Failed to send credential notification:', e)
      }

      return NextResponse.json({
        success: true,
        message: 'Nova senha definida com sucesso!',
        temporaryPassword: newPassword,
        user: {
          id: targetUser.id,
          name: targetUser.name,
          email: targetUser.email,
          role: targetUser.role,
        },
      })
    }

    // AÇÃO 2: Gerar Token de Impersonação / Acesso de Suporte
    if (action === 'impersonate') {
      const sessionId = 'impersonate_' + crypto.randomUUID()
      SessionManager.registerSession(targetUser.id, sessionId, {
        userName: targetUser.name,
        userEmail: targetUser.email,
        userRole: targetUser.role,
        barbershopId: targetUser.barbershopId,
        barbershopName: targetUser.barbershop?.name,
        barbershopSlug: targetUser.barbershop?.slug,
      })

      const impersonatedToken = generateToken({
        id: targetUser.id,
        name: targetUser.name,
        email: targetUser.email,
        role: targetUser.role,
        barbershopId: targetUser.barbershopId,
        sessionId,
      })

      await createAuditLog({
        userId: admin.id,
        barbershopId: targetUser.barbershopId,
        action: AuditAction.LOGIN,
        entity: AuditEntity.USER,
        entityId: targetUser.id,
        success: true,
        metadata: {
          reason: 'Acesso de suporte via impersonação administrativa',
          impersonatedBy: admin.email,
          targetUser: targetUser.email,
        },
        ipAddress: ctx.ipAddress,
        userAgent: ctx.userAgent,
      })

      return NextResponse.json({
        success: true,
        token: impersonatedToken,
        user: {
          id: targetUser.id,
          name: targetUser.name,
          email: targetUser.email,
          role: targetUser.role,
          barbershopId: targetUser.barbershopId,
        },
      })
    }

    return NextResponse.json({ error: 'Ação não reconhecida' }, { status: 400 })
  } catch (error) {
    console.error('Error in credentials management:', error)
    return NextResponse.json({ error: 'Erro ao gerenciar credenciais' }, { status: 500 })
  }
}
