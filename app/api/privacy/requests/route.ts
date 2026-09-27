import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser, requireRole } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'
import { createDataSubjectRequest } from '@/lib/privacy/lgpd-service'

export const dynamic = 'force-dynamic'
export const revalidate = 0

// POST - Registrar nova solicitação de direito do titular (LGPD)
export async function POST(request: NextRequest) {
  try {
    const authUser = getAuthUser(request)
    const body = await request.json()
    const { type, applicantEmail, applicantName, details, barbershopId } = body

    if (!type || !applicantEmail || !applicantName) {
      return NextResponse.json(
        { error: 'Tipo de solicitação, nome e e-mail do titular são obrigatórios.' },
        { status: 400 }
      )
    }

    const validTypes = ['ACCESS', 'EXPORT', 'RECTIFICATION', 'ANONYMIZATION', 'DELETION', 'REVOCATION']
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { error: `Tipo inválido. Tipos aceitos: ${validTypes.join(', ')}` },
        { status: 400 }
      )
    }

    const created = await createDataSubjectRequest({
      userId: authUser?.id || null,
      barbershopId: barbershopId || authUser?.barbershopId || null,
      type,
      applicantEmail,
      applicantName,
      details,
    })

    return NextResponse.json({
      success: true,
      message: 'Solicitação registrada com sucesso. Prazo legal de resposta em até 15 dias (Art. 19, II LGPD).',
      request: created,
    })
  } catch (error) {
    console.error('Erro ao criar solicitação de privacidade:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao registrar solicitação' },
      { status: 500 }
    )
  }
}

// GET - Listar solicitações de privacidade (Apenas o próprio usuário ou ADMIN/DEVELOPER da unidade)
export async function GET(request: NextRequest) {
  try {
    const user = getAuthUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    let whereClause: any = {}

    if (user.role === 'DEVELOPER') {
      // DEVELOPER vê todas
      whereClause = {}
    } else if (user.role === 'ADMIN') {
      // ADMIN vê as de sua barbearia
      whereClause = { barbershopId: user.barbershopId }
    } else {
      // CLIENT e BARBER veem apenas suas próprias solicitações
      whereClause = { userId: user.id }
    }

    const requests = await (prisma as any).privacyRequest.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      take: 100,
    })

    return NextResponse.json(requests)
  } catch (error) {
    console.error('Erro ao listar solicitações de privacidade:', error)
    return NextResponse.json(
      { error: 'Erro ao consultar solicitações de privacidade' },
      { status: 500 }
    )
  }
}
